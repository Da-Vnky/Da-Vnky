#!/usr/bin/env python3
"""
webp.py — an animation's frames → one animated WebP, at any size.

Clip Studio won't export an animated WebP bigger than about 2000 pixels across. It will export the frames
themselves at the canvas's full size (File > Export animation > Image sequence, PNG), and this turns those
into one animated WebP at that size (3200 x 1800, or bigger: up to 16383 a side, WebP's own limit).

The easy way: drag the folder of frames onto tools\\webp.bat (or double-click it and pick the folder). It asks how
fast and how good, and saves <the folder's name>.webp next to the folder. You can also drag several frames at once,
or one animated GIF / PNG / WebP (to make it again bigger or better).

    python tools/webp.py <folder of frames>                     asks how fast, how good and how big
    python tools/webp.py <folder> --fps 12 --quality 90 --yes   no questions
    python tools/webp.py <folder> --lossless --size 1600x900    every pixel kept exactly / made smaller
    python tools/webp.py <folder> --out somewhere/name.webp

The frames go in the order of their names (frame 2 before frame 10). See-through stays see-through.
It uses FFmpeg if there is one (the Rebelle Animator's, or one on the computer: fast, and easy on memory),
else Pillow (py -m pip install pillow; holds every frame in memory at once, so very long ones need a lot of it).
"""

import argparse, os, re, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = ('png', 'webp', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp')
MOVING = ('gif', 'apng', 'png', 'webp')
FPS, QUALITY = 12, 90
BIGGEST = 16383                     # (WebP can't be bigger than this either way)
SITE_LIMIT = 30 * 1024 * 1024       # (the site takes files up to 30 MB)
NO_WINDOW = 0x08000000 if sys.platform == 'win32' else 0


def natural(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', name)]


def frames_in(paths):
    """what was dragged in -> the frames, in order (or one moving picture to make again)"""
    if len(paths) == 1 and os.path.isdir(paths[0]):
        d = paths[0]
        found = [os.path.join(d, n) for n in os.listdir(d)
                 if n.rsplit('.', 1)[-1].lower() in FRAMES and not n.startswith(('.', '_')) and os.path.isfile(os.path.join(d, n))]
        if not found:
            raise ValueError('there are no pictures in ' + d)
        return sorted(found, key=lambda p: natural(os.path.basename(p)))
    for p in paths:
        if not os.path.isfile(p):
            raise ValueError("can't find " + p)
    return sorted(paths, key=lambda p: natural(os.path.basename(p)))


def pil():
    try:
        from PIL import Image
        return Image
    except ImportError:
        return None


def moving(path):
    """one animated GIF / PNG / WebP -> (its frames as pictures, each frame's time in ms), or None if it's a still"""
    Image = pil()
    if not Image or path.rsplit('.', 1)[-1].lower() not in MOVING:
        return None
    im = Image.open(path)
    if getattr(im, 'n_frames', 1) < 2:
        return None
    out, times = [], []
    for i in range(im.n_frames):
        im.seek(i)
        out.append(im.convert('RGBA'))
        times.append(im.info.get('duration') or round(1000 / FPS))
    return out, times


def ffmpeg():
    """the Rebelle Animator's FFmpeg (as the drawing table finds it), or one on the computer"""
    try:
        sys.path.insert(0, HERE)
        import drawtable
        f = drawtable.ffmpeg()
        if f:
            return f
    except Exception:
        pass
    return shutil.which('ffmpeg')


def size_of(path):
    Image = pil()
    if Image:
        with Image.open(path) as im:
            return im.size
    # (no Pillow: read a PNG's own header)
    with open(path, 'rb') as f:
        head = f.read(24)
    if head[:8] == b'\x89PNG\r\n\x1a\n':
        return int.from_bytes(head[16:20], 'big'), int.from_bytes(head[20:24], 'big')
    return None


def see_through(paths):
    """does any frame have see-through bits? (a few frames looked at: the first, the middle, the last)"""
    Image = pil()
    if not Image:
        return True
    for p in {paths[0], paths[len(paths) // 2], paths[-1]}:
        with Image.open(p) as im:
            if im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info:
                if im.convert('RGBA').getchannel('A').getextrema()[0] < 255:
                    return True
    return False


def make_ff(ff, paths, out, fps, quality, lossless, size, alpha):
    tmp = tempfile.mkdtemp(prefix='dav-webp-')
    try:
        for i, p in enumerate(paths):                      # (numbered plainly, in order, for FFmpeg; linked, not copied, when it can)
            ext = p.rsplit('.', 1)[-1].lower()
            dst = os.path.join(tmp, '%05d.%s' % (i + 1, ext))
            try:
                os.link(p, dst)
            except OSError:
                shutil.copyfile(p, dst)
        ext = paths[0].rsplit('.', 1)[-1].lower()
        for enc in ('libwebp_anim', 'libwebp'):
            cmd = [ff, '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(tmp, '%05d.' + ext)]
            if size:
                cmd += ['-vf', 'scale=%d:%d:flags=lanczos' % size]
            cmd += ['-c:v', enc, '-preset', 'drawing', '-compression_level', '4', '-loop', '0']
            if lossless:
                cmd += ['-lossless', '1']
            else:
                cmd += ['-lossless', '0', '-q:v', str(quality), '-pix_fmt', 'yuva420p' if alpha else 'yuv420p']
            cmd.append(out)
            r = subprocess.run(cmd, capture_output=True, text=True, creationflags=NO_WINDOW)
            if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 0:
                return True
            why = (r.stderr or '').strip().splitlines()[-1:] or ['']
        print('  (FFmpeg stopped: ' + why[0][:200] + '; trying Pillow instead)')
        return False
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def make_pil(frames, out, times, quality, lossless, size):
    """frames: paths, or pictures already open (a moving picture made again)"""
    Image = pil()
    if not Image:
        raise ValueError('this needs FFmpeg or Pillow. the easy one: in a terminal, type  py -m pip install pillow  and try again')
    first = None
    pics = []
    for i, f in enumerate(frames):
        im = f if not isinstance(f, str) else Image.open(f).convert('RGBA')
        want = size or (first.size if first else im.size)
        if im.size != want:
            im = im.resize(want, Image.LANCZOS)
        if first is None:
            first = im
        else:
            pics.append(im)
        if isinstance(f, str) and (i + 1) % 10 == 0:
            print('  read %d of %d frames…' % (i + 1, len(frames)), flush=True)
    opts = dict(save_all=True, append_images=pics, duration=times, loop=0, method=4)
    opts.update(lossless=True, quality=100) if lossless else opts.update(quality=quality)
    first.save(out, 'WEBP', **opts)
    return True


def ask(q, default):
    try:
        a = input('  ' + q + ' [' + str(default) + ']: ').strip()
    except EOFError:
        a = ''
    return a or str(default)


def pick_folder():
    """double-clicked with nothing dragged on: a folder picker (or paste the folder's address)"""
    try:
        import tkinter, tkinter.filedialog
        root = tkinter.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        d = tkinter.filedialog.askdirectory(title='the folder with the animation\'s frames in it')
        root.destroy()
        if d:
            return d
    except Exception:
        pass
    d = input('  the folder with the frames in it (in File Explorer: right-click it, "Copy as path", paste it here):\n  ').strip().strip('"')
    return d


def parse_size(s, w, h):
    s = (s or '').strip().lower()
    if not s or s in ('as drawn', 'same', 'full'):
        return None
    m = re.match(r'^(\d+)\s*[x×*, ]\s*(\d+)$', s)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.match(r'^(\d+(?:\.\d+)?)\s*%$', s)                # (or a share: 50%)
    if m:
        k = float(m.group(1)) / 100
        return max(1, round(w * k)), max(1, round(h * k))
    raise ValueError('a size like 1600x900, or 50%')


def main():
    ap = argparse.ArgumentParser(description='an animation\'s frames -> one animated WebP, at any size')
    ap.add_argument('paths', nargs='*', help='a folder of frames, some frames, or one animated GIF/PNG/WebP')
    ap.add_argument('--fps', type=float)
    ap.add_argument('--quality', type=int, help='1 to 100 (90 by default)')
    ap.add_argument('--lossless', action='store_true', help='every pixel kept exactly (bigger)')
    ap.add_argument('--size', help='e.g. 1600x900 or 50%% (as drawn by default)')
    ap.add_argument('--out', help='where to save it (next to the frames by default)')
    ap.add_argument('--yes', action='store_true', help='no questions: the defaults for anything not given')
    ap.add_argument('--open', action='store_true', help='show it in its folder when done (what the .bat asks for)')
    a = ap.parse_args()
    asking = not a.yes and sys.stdin and sys.stdin.isatty()

    print('\n  animated WebP, at any size\n')
    paths = [p.strip().strip('"') for p in a.paths] or [pick_folder()]
    if not paths or not paths[0]:
        sys.exit('  nothing picked.')
    anim = moving(paths[0]) if len(paths) == 1 and os.path.isfile(paths[0]) else None
    if anim:
        frames, (w, h) = anim[0], anim[0][0].size
        print('  %s: %d frames, %d x %d' % (os.path.basename(paths[0]), len(frames), w, h))
    else:
        frames = frames_in(paths)
        sz = size_of(frames[0])
        if not sz:
            raise ValueError("couldn't tell how big the frames are (install Pillow: py -m pip install pillow)")
        w, h = sz
        where = paths[0] if os.path.isdir(paths[0]) else os.path.dirname(frames[0])
        print('  %d frames in %s, %d x %d (%s … %s)' % (len(frames), where, w, h, os.path.basename(frames[0]), os.path.basename(frames[-1])))
        if len(frames) < 2:
            print('  (only one frame: it\'ll be a still WebP)')

    fps = a.fps or (None if anim else float(ask('frames a second', FPS)) if asking else FPS)
    if a.lossless:
        quality, lossless = 100, True
    elif a.quality:
        quality, lossless = max(1, min(100, a.quality)), False
    elif asking:
        q = ask('how good: 1 to 100 (smaller file … better picture), or "lossless" (every pixel exactly)', QUALITY).lower()
        lossless = q.startswith('loss')
        quality = 100 if lossless else max(1, min(100, int(q)))
    else:
        quality, lossless = QUALITY, False
    size = parse_size(a.size if a.size or not asking else ask('size: as drawn, or e.g. 1600x900 or 50%', 'as drawn'), w, h)
    if size and (size[0] > BIGGEST or size[1] > BIGGEST) or (not size and (w > BIGGEST or h > BIGGEST)):
        raise ValueError('a WebP can be at most %d pixels a side' % BIGGEST)
    out = a.out or (os.path.splitext(paths[0])[0] + '-big.webp' if anim else
                    (paths[0].rstrip('\\/') if os.path.isdir(paths[0]) else os.path.dirname(frames[0])) + '.webp')
    if os.path.abspath(out) in (os.path.abspath(p) for p in paths):
        out = os.path.splitext(out)[0] + '-new.webp'

    W, H = size or (w, h)
    print('\n  making %s: %d x %d, %s, %s…' % (os.path.basename(out), W, H,
          ('%g frames a second' % fps) if fps else 'its own timing', 'lossless' if lossless else 'quality %d' % quality), flush=True)
    t0 = time.time()
    done = False
    ff = None if anim else ffmpeg()
    if ff:
        done = make_ff(ff, frames, out, fps, quality, lossless, size, see_through(frames))
    if not done:
        times = anim[1] if anim else round(1000 / fps)
        make_pil(frames, out, times, quality, lossless, size)
    mb = os.path.getsize(out) / 1024 / 1024
    print('\n  done (%.0f s, with %s): %s' % (time.time() - t0, 'FFmpeg' if done else 'Pillow', out))
    print('  %.1f MB' % mb + ('  (over the site\'s 30 MB for one file: try a lower quality, or a smaller size)' if mb * 1024 * 1024 > SITE_LIMIT else ''))
    if a.open and sys.platform == 'win32':
        subprocess.Popen(['explorer', '/select,', os.path.normpath(out)])


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n  stopped.')
    except Exception as e:
        print('\n  stopped: ' + str(e))
        sys.exit(1)
