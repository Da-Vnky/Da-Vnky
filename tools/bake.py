#!/usr/bin/env python3
"""
bake.py: lighter copies of the site's big pictures, for visitors (16 Oct).

    python tools/bake.py            bake what's new or changed (publishing runs this for you)
    python tools/bake.py --dry      say what it would do, change nothing
    python tools/bake.py --again    bake everything again from scratch
    (or double-click tools\\bake.bat)

your pictures stay exactly as they are, where they are (assets/, content/): they're the originals, and the
content manager, the drawing table and the preview on your computer keep using them. this makes a copy of each
big one in baked/, the same path (baked/assets/sea/wave-3.webp …):

  - as WebP (a GIF that moves becomes a WebP that moves, the same frames and timing)
  - no bigger than it's ever shown: at most MAX_SIDE across (a picture that repeats, like the waves: TILE_SIDE
    tall), so a visitor's browser has less to download and less to unpack before it can draw it
  - kept only if it's really lighter (at most KEEP of the original's size, or made smaller)

baked/baked.json lists each one, with the size and checksum of the original it was made from (the same numbers
catalog.txt has). the site (sky/sky.js "baked pictures") uses a baked copy only while catalog.txt still says the
original is that same file: so a picture you change and publish without baking simply shows as itself.
on localhost the originals are always shown, unless the address has ?baked.

never baked: svg; visitors' bottles (the words are inside the file); the sun's eye (sky/eye.js reads its GIF frames
itself); cursors; the loading screen's picture; the templates; anything named in SKIP.
needs Pillow (pip install pillow). no Pillow: it says so and the site goes on using the originals.
"""
import argparse, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUT = 'baked'
MANIFEST = OUT + '/baked.json'
MAX_SIDE = 2560          # the longest side of a still picture
MAX_ANIM = 1280          # … of a moving one (every frame is unpacked: these add up fast)
TILE_SIDE = 720          # how tall a picture that repeats sideways (the waves) is kept (the sea is 30% of the screen)
QUALITY = 88             # WebP quality (90+ you'd struggle to tell from the original; 88 is still very close)
KEEP = 0.85              # a baked copy is kept only if it's at most this share of the original's size (or made smaller)
PICS = re.compile(r'\.(png|jpe?g|gif|webp)$', re.I)
SKIP = [
    r'^assets/templates/',                      # templates for the artist, never loaded by the site
    r'^assets/ui/(cursor|loading|click)',       # cursors (browsers want png/svg there) and the loading screen
    r'^assets/fonts/',
    r'(^|/)sky/sun-(eyeball|eyelids|pupil)',    # sky/eye.js reads these GIFs frame by frame
    r'^assets/hell/eye',                        # (the eye below can be the same GIF)
    r'^content/living/bottles/',                # visitors' bottles: their words are tucked inside the file
    r'^content/post/',
    r'^assets/skizy-room/',                     # skizy's room finds its pictures itself (room.js), not through sky.js
]
SKIP_RE = [re.compile(s) for s in SKIP]


# ---------------- the checksum catalog.txt uses (POSIX cksum: tools/update-lists.sh) ----------------
def _table():
    t = []
    for i in range(256):
        c = i << 24
        for _ in range(8):
            c = ((c << 1) ^ 0x04C11DB7) if c & 0x80000000 else (c << 1)
        t.append(c & 0xFFFFFFFF)
    return t
_T = _table()


def _cksum_py(data):
    c, t = 0, _T
    for b in data:
        c = ((c << 8) & 0xFFFFFFFF) ^ t[(c >> 24) ^ b]
    n = len(data)
    while n:
        c = ((c << 8) & 0xFFFFFFFF) ^ t[(c >> 24) ^ (n & 0xFF)]
        n >>= 8
    return (~c) & 0xFFFFFFFF


_CK = None
def _cksum_tool():
    # the real cksum is much faster than python's: on linux/mac it's there; on windows, Git Bash has one
    global _CK
    if _CK is None:
        _CK = shutil.which('cksum') or ''
        for g in (r'C:\Program Files\Git\usr\bin\cksum.exe', r'C:\Program Files (x86)\Git\usr\bin\cksum.exe',
                  os.path.expandvars(r'%LocalAppData%\Programs\Git\usr\bin\cksum.exe')):
            if not _CK and os.path.isfile(g):
                _CK = g
    return _CK


def size_sum(path):
    """'size:checksum', as catalog.txt says it (pictures are measured byte for byte)."""
    tool = _cksum_tool()
    if tool:
        try:
            with open(path, 'rb') as f:
                r = subprocess.run([tool], stdin=f, capture_output=True, text=True, timeout=120,
                                   creationflags=0x08000000 if sys.platform == 'win32' else 0)
            s, n = r.stdout.split()[:2]
            return '%s:%s' % (n, s)
        except Exception:
            pass
    with open(path, 'rb') as f:
        data = f.read()
    return '%d:%d' % (len(data), _cksum_py(data))


# ---------------- which pictures ----------------
def tiles():
    # slots that repeat (tools/slots.json "tile": "x" | "y" | "xy"): their baked copy must still join up at the edges
    out = {}
    try:
        with open(os.path.join(HERE, 'slots.json'), encoding='utf-8') as f:
            d = json.load(f)
        def walk(o):
            if isinstance(o, dict):
                if isinstance(o.get('slot'), str) and o.get('tile'):
                    out[o['slot']] = o['tile']
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(d)
    except Exception:
        pass
    return out


def originals():
    found = []
    for top in ('assets', 'content'):
        for d, dirs, files in os.walk(os.path.join(ROOT, top)):
            dirs[:] = [x for x in dirs if not x.startswith(('.', '_'))]
            for f in files:
                if f.startswith(('.', '_')) or not PICS.search(f):
                    continue
                rel = os.path.relpath(os.path.join(d, f), ROOT).replace('\\', '/')
                if not any(r.search(rel) for r in SKIP_RE):
                    found.append(rel)
    return sorted(found)


def baked_name(rel, taken):
    to = OUT + '/' + re.sub(r'\.\w+$', '', rel) + '.webp'
    if to in taken:                                  # (wave.png and wave.gif both there: keep their names apart)
        to = OUT + '/' + rel + '.webp'
    return to


# ---------------- baking one ----------------
def fit(w, h, tile):
    if tile in ('x', 'xy') and h > TILE_SIDE:
        k = TILE_SIDE / h
    elif tile == 'y' and w > TILE_SIDE:
        k = TILE_SIDE / w
    else:
        k = min(1.0, MAX_SIDE / max(w, h))
    return k


def shrink(im, k, tile, Image):
    if k >= 1:
        return im
    w, h = im.size
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    if not tile:
        return im.resize((nw, nh), Image.LANCZOS)
    # a repeating picture: laid three times side by side (or one over another), shrunk, the middle one kept,
    # so its edges are shrunk knowing what comes next to them, and still join
    rx, ry = ('x' in tile), ('y' in tile)
    big = Image.new(im.mode, (w * (3 if rx else 1), h * (3 if ry else 1)))
    for i in range(3 if rx else 1):
        for j in range(3 if ry else 1):
            big.paste(im, (i * w, j * h))
    big = big.resize((nw * (3 if rx else 1), nh * (3 if ry else 1)), Image.LANCZOS)
    return big.crop((nw if rx else 0, nh if ry else 0, (nw if rx else 0) + nw, (nh if ry else 0) + nh))


def bake_one(src, dst, tile, Image, ImageSequence):
    """writes dst; returns (w, h, new w, new h, frames), or None if it isn't worth it."""
    im = Image.open(src)
    ext = src.rsplit('.', 1)[-1].lower()
    frames = getattr(im, 'n_frames', 1)
    w, h = im.size
    if frames > 1:
        k = min(1.0, MAX_ANIM / max(w, h))
        if ext == 'webp' and k >= 1:
            return None                              # already a moving WebP, already small enough
        seq, durs = [], []
        for fr in ImageSequence.Iterator(im):
            durs.append(fr.info.get('duration', im.info.get('duration', 100)) or 100)
            seq.append(shrink(fr.convert('RGBA'), k, tile, Image))
        loop = im.info.get('loop', 0)
        tries = []
        for opts in ({'quality': QUALITY, 'method': 4}, {'lossless': True, 'quality': 80, 'method': 4}):
            tmp = dst + ('.l' if opts.get('lossless') else '.q') + '.tmp'
            seq[0].save(tmp, 'WEBP', save_all=True, append_images=seq[1:], duration=durs, loop=loop,
                        allow_mixed=False, **opts)
            tries.append((os.path.getsize(tmp), tmp))
        tries.sort()
        os.replace(tries[0][1], dst)
        for _, t in tries[1:]:
            os.remove(t)
        nw, nh = seq[0].size
    else:
        k = fit(w, h, tile)
        if ext == 'webp' and k >= 1:
            return None                              # a WebP already, not too big: baking again would only lose detail
        im.load()
        has_alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if has_alpha else 'RGB')
        im = shrink(im, k, tile, Image)
        im.save(dst, 'WEBP', quality=QUALITY, alpha_quality=90, method=6)
        if ext in ('png', 'gif') and im.size[0] * im.size[1] <= 4000000:
            # flat, drawn pictures can come out lighter without losing anything at all
            tmp = dst + '.l.tmp'
            im.save(tmp, 'WEBP', lossless=True, quality=80, method=4)
            if os.path.getsize(tmp) < os.path.getsize(dst):
                os.replace(tmp, dst)
            else:
                os.remove(tmp)
        nw, nh = im.size
    was, now = os.path.getsize(src), os.path.getsize(dst)
    smaller = nw * nh < w * h
    if now >= was or (now > was * KEEP and not smaller):
        os.remove(dst)
        return None
    return w, h, nw, nh, frames


# ---------------- all of them ----------------
def main():
    ap = argparse.ArgumentParser(description='lighter copies of the big pictures, in baked/')
    ap.add_argument('--dry', action='store_true', help='say what it would do, change nothing')
    ap.add_argument('--again', action='store_true', help='bake everything again')
    ap.add_argument('--quiet', action='store_true', help='only the summary')
    args = ap.parse_args()
    try:
        from PIL import Image, ImageSequence
        Image.MAX_IMAGE_PIXELS = None
    except ImportError:
        print('   (bake: Pillow isn\'t installed, so no lighter copies this time: python -m pip install pillow)')
        return 0

    mpath = os.path.join(ROOT, MANIFEST)
    try:
        with open(mpath, encoding='utf-8') as f:
            old = json.load(f).get('files', {})
    except Exception:
        old = {}
    tile_of = tiles()
    files, taken, made, kept, skipped = {}, set(), 0, 0, 0
    before = after = 0
    for rel in originals():
        src = os.path.join(ROOT, rel)
        of = size_sum(src)
        prev = old.get(rel)
        if prev and not args.again and prev.get('of') == of and os.path.isfile(os.path.join(ROOT, prev['to'])):
            files[rel] = prev                        # baked before, from this same picture
            taken.add(prev['to'])
            kept += 1
            before += prev.get('was', 0); after += prev.get('now', 0)
            continue
        if prev and prev.get('none') == of and not args.again:
            files[rel] = prev                        # tried before: not worth it
            skipped += 1
            continue
        to = baked_name(rel, taken)
        tile = tile_of.get(re.sub(r'\.\w+$', '', rel))
        if args.dry:
            print('   would bake  ' + rel)
            continue
        os.makedirs(os.path.dirname(os.path.join(ROOT, to)), exist_ok=True)
        try:
            got = bake_one(src, os.path.join(ROOT, to), tile, Image, ImageSequence)
        except Exception as e:
            print('   (couldn\'t bake %s: %s)' % (rel, e))
            got = None
        if not got:
            files[rel] = {'none': of}                # remembered, so it isn't tried again till it changes
            skipped += 1
            continue
        w, h, nw, nh, fr = got
        was, now = os.path.getsize(src), os.path.getsize(os.path.join(ROOT, to))
        files[rel] = {'to': to, 'of': of, 'was': was, 'now': now, 'from': [w, h], 'size': [nw, nh]}
        if fr > 1:
            files[rel]['frames'] = fr
        taken.add(to)
        made += 1
        before += was; after += now
        if not args.quiet:
            print('   baked  %-60s %6.2f MB -> %5.2f MB%s' % (rel, was / 1048576, now / 1048576,
                  '  (%dx%d -> %dx%d)' % (w, h, nw, nh) if (nw, nh) != (w, h) else ''))
    if args.dry:
        return 0
    # baked copies whose picture is gone, or no longer worth it: gone too
    wanted = set(v['to'] for v in files.values() if 'to' in v)
    gone = 0
    for d, dirs, fs in os.walk(os.path.join(ROOT, OUT)):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), ROOT).replace('\\', '/')
            if rel != MANIFEST and rel not in wanted:
                os.remove(os.path.join(d, f))
                gone += 1
    for d, dirs, fs in sorted(os.walk(os.path.join(ROOT, OUT)), reverse=True):
        if d != os.path.join(ROOT, OUT) and not os.listdir(d):
            os.rmdir(d)
    os.makedirs(os.path.join(ROOT, OUT), exist_ok=True)
    body = {'note': 'written by tools/bake.py: lighter copies of the big pictures. never edit by hand.',
            'files': dict(sorted(files.items()))}
    text = json.dumps(body, indent=1, ensure_ascii=False) + '\n'
    try:
        with open(mpath, encoding='utf-8') as f:
            same = f.read() == text
    except Exception:
        same = False
    if not same:
        with open(mpath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
    n = sum(1 for v in files.values() if 'to' in v)
    print('   bake: %d lighter copies (%d new, %d as before), %d not worth it%s. %.1f MB of pictures -> %.1f MB'
          % (n, made, kept, skipped, (', %d old ones removed' % gone) if gone else '', before / 1048576, after / 1048576))
    return 0


if __name__ == '__main__':
    sys.exit(main())
