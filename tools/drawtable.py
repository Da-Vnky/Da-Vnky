#!/usr/bin/env python3
"""
drawtable.py — the drawing table: a picture for one slot, started for you in your own art program.

The asset manager's "draw it in" buttons (Clip Studio, Photoshop, Rebelle) run this through the content manager.
For the slot you picked it makes a layered file at twice the size the slot is shown at (sharp on big and
high-resolution screens), and opens it in that program:

    guide             the scene as it is now, where the slot sits, faded and locked: hide it before you export
    your picture now  what's in the slot already, if you've put something in (so you can carry on from it)
    draw here         an empty, see-through layer, on top

It goes in tools/drawing/<folder>--<name>/ (that folder stays on your computer: never published), with a note
saying what to do. Export your finished picture into that same folder as a PNG or WebP (the guide hidden), and
the slot's card in the asset manager shows it with a "use this" button. Your working file stays there too, so
pressing the button again opens it as you left it (a fresh canvas only if you ask for one).

    python tools/drawtable.py make assets/living/bee-body          make it (or find the one that's there), say where
    python tools/drawtable.py make assets/living/bee-body --fresh  a fresh one, even if there's one there already
    python tools/drawtable.py open assets/living/bee-body csp      make it if need be, and open it in Clip Studio
                                                                   (csp, ps or rebelle)
    python tools/drawtable.py wrap assets/sea/wave-1 wave-1.png csp   a repeating picture moved by half a tile, to mend its join
    python tools/drawtable.py animate assets/living/bee-body animator
                                                                   an animation: Victor's Rebelle Animator (or csp)

Animating (the asset manager's "animate in" buttons): the frames go in the slot's frames/ folder on the table.
  csp        opens the same layered canvas in Clip Studio (you set up the timeline: 12 fps, 60 frames is the usual);
             export the frames there (File > Export animation > Image sequence, PNG)
  animator   Victor's own Rebelle Animator (his, not part of the site: it lives on his computer, by default in
             Documents\Rebelle Animation\Rebelle Animator). this writes a starting project for the slot (the canvas
             size, 12 fps, renders going to the slot's frames/ folder) in the slot's animator/ folder and opens it with
             "Rebelle Animator.bat" --open: the animator takes its own copy into its library once, and opens that copy
             every time after. this never touches the animator's library itself
then the slot's card turns the frames into one moving picture (an animated WebP) for the slot, with FFmpeg if
there is one (the animator's own, or any on the computer) or Pillow.

The file is a .psd: Clip Studio, Photoshop and Rebelle all open those with their layers. Working out the size and
taking the guide needs Playwright (the same as the template pictures: pip install playwright, then
python -m playwright install chromium). Without it, or for a slot that isn't on any page (a sound, a hidden pose),
you get the plain double-size canvas from the size the slot's description gives, with no guide.
No other Python packages needed.
"""

import base64, glob, json, os, re, struct, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TABLE = os.path.join(HERE, 'drawing')                   # (gitignored: your working files never go on the site)
APPS_FILE = os.path.join(TABLE, 'apps.json')           # where your art programs are, once found or told
SLOT = re.compile(r'^assets/((?:resets/reset-[1-8](?:/[a-z0-9-]+)?)|[a-z0-9-]+)/([a-z0-9-]+)$')
PICTURES = ('png', 'webp', 'gif', 'jpg', 'jpeg', 'svg')
EXPORTS = ('png', 'webp', 'gif', 'jpg', 'jpeg')
WORKING = ('clip', 'reb', 'psd', 'psb', 'kra', 'tif', 'tiff')   # (what the programs save their own working files as)
SCALE = 2                                               # twice the size it's shown at on a 1920 x 1080 screen
BIGGEST = 8000                                          # (no side bigger than this: the programs and the file stay happy)
GUIDE_OPACITY = 128                                     # the guide layer at half strength (of 255)

# ---------------- your art programs: where they usually live ----------------
APPS = {
    'csp': {'name': 'Clip Studio Paint', 'exe': 'CLIPStudioPaint.exe',
            'win': [r'C:\Program Files\CELSYS\*\CLIP STUDIO PAINT\CLIPStudioPaint.exe',
                    r'C:\Program Files (x86)\CELSYS\*\CLIP STUDIO PAINT\CLIPStudioPaint.exe'],
            'mac': ['/Applications/CLIP STUDIO *.*/CLIP STUDIO PAINT.app', '/Applications/Clip Studio Paint*.app',
                    '/Applications/CLIP STUDIO PAINT.app']},
    'ps': {'name': 'Photoshop', 'exe': 'Photoshop.exe',
           'win': [r'C:\Program Files\Adobe\Adobe Photoshop*\Photoshop.exe'],
           'mac': ['/Applications/Adobe Photoshop*/Adobe Photoshop*.app']},
    'rebelle': {'name': 'Rebelle', 'exe': 'Rebelle 8.exe',
                'win': [r'C:\Program Files\Escape Motions\Rebelle*\Rebelle*.exe',
                        r'C:\Program Files (x86)\Escape Motions\Rebelle*\Rebelle*.exe',
                        r'C:\Program Files (x86)\Steam\steamapps\common\Rebelle*\Rebelle*.exe',
                        r'C:\Program Files\Steam\steamapps\common\Rebelle*\Rebelle*.exe',
                        r'D:\SteamLibrary\steamapps\common\Rebelle*\Rebelle*.exe'],
                'mac': ['/Applications/Rebelle*.app']},
}


# Victor's Rebelle Animator (his own program, not the site's: see its REBELLE_ANIMATOR_INTEGRATION notes)
ANIMATOR_BAT = 'Rebelle Animator.bat'
# Rebelle only takes the animator's live link if it was started like this (harmless otherwise)
LINK = ['-websocket-server-enable', '-websocket-port', '{port}', '-websocket-allowed-ip-addresses', '::ffff:127.0.0.1,127.0.0.1']
NEW_CONSOLE, DETACHED, NEW_GROUP = 0x00000010, 0x00000008, 0x00000200
# Rebelle doesn't open a .psd it's handed when it starts (11 Oct, Victor: the wrong size), so once it's up the table tells
# it, over that same live link, to make a new canvas of the right size (Rebelle's Motion IO "NEW_ARTWORK" event: what the
# animator does). if Rebelle wants it worded differently, this is the one place to change
REBELLE_NEW = {'event_type': 'NEW_ARTWORK', 'width': '{w}', 'height': '{h}'}
REBELLE_WAIT = 90                                       # (seconds to wait for Rebelle to start listening)
FPS = 12                                                # (Victor's usual: 12 frames a second)


def documents_dir():
    """the real Documents folder (it can be moved, e.g. into OneDrive)"""
    if sys.platform == 'win32':
        try:
            import ctypes
            from ctypes import wintypes
            buf = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
            if ctypes.windll.shell32.SHGetFolderPathW(None, 5, None, 0, buf) == 0 and buf.value:
                return buf.value
        except Exception:
            pass
    return os.path.join(os.path.expanduser('~'), 'Documents')


def animator_workspace():
    return os.environ.get('RBA_WORKSPACE') or os.path.join(documents_dir(), 'Rebelle Animation')


def animator_settings():
    """the animator's settings (config.json, then its own animator_settings.json over it): where Rebelle, Motion IO
    and FFmpeg are, and its library. only read, never written"""
    d = {}
    for n in ('config.json', 'animator_settings.json'):
        try:
            with open(os.path.join(animator_workspace(), n), encoding='utf-8-sig') as f:
                d.update({k: v for k, v in json.load(f).items() if v not in (None, '')})
        except (OSError, ValueError, AttributeError):
            pass
    return d


def find_animator():
    """the animator's "Rebelle Animator.bat": where you told it, else where it usually is"""
    mine = saved_apps().get('animator')
    for p in ([mine] if mine else []) + [os.path.join(animator_workspace(), 'Rebelle Animator')]:
        if p and os.path.isdir(p):
            p = os.path.join(p, ANIMATOR_BAT)
        if p and os.path.isfile(p):
            return p
    return None


def saved_apps():
    try:
        with open(APPS_FILE, encoding='utf-8') as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def remember_app(app, path):
    """you told it where a program is (the asset manager asks, if it can't find one): kept for next time"""
    if app not in APPS and app != 'animator':
        raise ValueError('which program?')
    path = (path or '').strip().strip('"')
    if not path or not os.path.exists(path):
        raise ValueError("there's nothing at " + (path or 'that address') + ': copy its address from File Explorer (right-click it, "Copy as path")')
    if app == 'animator':
        if os.path.isdir(path):
            path = os.path.join(path, ANIMATOR_BAT)
        if not (os.path.isfile(path) and os.path.basename(path).lower() == ANIMATOR_BAT.lower()):
            raise ValueError('that needs to be the Rebelle Animator folder (the one with "Rebelle Animator.bat" in it)')
    elif sys.platform == 'win32' and not path.lower().endswith('.exe'):
        raise ValueError('that needs to be the program itself: the file whose name ends in .exe')
    d = saved_apps()
    d[app] = path
    os.makedirs(TABLE, exist_ok=True)
    with open(APPS_FILE, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2)
    return path


def find_app(app):
    """where the program is: the one you told it, else the usual places (the newest version if there are several)"""
    if app not in APPS:
        raise ValueError('which program?')
    mine = saved_apps().get(app)
    if mine and os.path.exists(mine):
        return mine
    if app == 'rebelle':                                # (the animator knows where Rebelle 8 Pro is)
        r = animator_settings().get('rebelle')
        if r and os.path.isfile(r):
            return r
    a = APPS[app]
    if sys.platform == 'win32':
        try:                                            # (programs that put themselves in Windows' list of app paths)
            import winreg
            for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                try:
                    with winreg.OpenKey(hive, r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\\' + a['exe']) as k:
                        p = winreg.QueryValue(k, None)
                        if p and os.path.exists(p.strip('"')):
                            return p.strip('"')
                except OSError:
                    pass
        except ImportError:
            pass
        places = a['win']
    elif sys.platform == 'darwin':
        places = a['mac']
    else:
        places = []
    found = []
    for pat in places:
        found += [p for p in glob.glob(pat) if 'uninst' not in os.path.basename(p).lower()]
    return sorted(found)[-1] if found else None


def open_in(app, path, size=None):
    """open the file in the program. returns {opened: True} or {need: app} (it couldn't find the program)"""
    exe = find_app(app)
    if not exe:
        return {'opened': False, 'need': app, 'name': APPS[app]['name']}
    args, told = [exe, path], None
    if app == 'rebelle':                                # (with the live link on, so the animator can talk to it too)
        port = str(animator_settings().get('websocketPort') or 8265)
        args = [exe] + [x.replace('{port}', port) for x in LINK] + [path]
        if size and listening(int(port)):               # (it's open already: a new canvas there could lose what's on it)
            told = 'open'
        elif size:                                      # (a helper waits for it to start, then asks for the canvas)
            told = 'sized'
            flags = DETACHED | NEW_GROUP if sys.platform == 'win32' else 0
            subprocess.Popen([sys.executable, os.path.abspath(__file__), 'rebelle-canvas', str(size[0]), str(size[1]), port],
                             creationflags=flags, close_fds=True, cwd=ROOT, stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if sys.platform == 'darwin':
        subprocess.Popen(['open', '-a', exe, path])
    else:
        flags = DETACHED | NEW_GROUP if sys.platform == 'win32' else 0   # (on its own: closing the content manager won't close it)
        subprocess.Popen(args, creationflags=flags, close_fds=True, cwd=os.path.dirname(path))
    out = {'opened': True, 'name': APPS[app]['name'], 'program': exe}
    if told:
        out['rebelle'] = told
    return out


def listening(port):
    import socket
    try:
        socket.create_connection(('127.0.0.1', port), timeout=.5).close()
        return True
    except OSError:
        return False


def ws_send(port, text):
    """one text message to a WebSocket on this computer (Rebelle's live link), with only the standard library"""
    import socket
    k = base64.b64encode(os.urandom(16)).decode()
    s = socket.create_connection(('127.0.0.1', port), timeout=5)
    try:
        s.sendall(('GET / HTTP/1.1\r\nHost: 127.0.0.1:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                   'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (port, k)).encode())
        head = b''
        while b'\r\n\r\n' not in head:
            got = s.recv(1024)
            if not got:
                raise OSError('no answer')
            head += got
        if b' 101 ' not in head.split(b'\r\n', 1)[0]:
            raise OSError('it said no: ' + head.split(b'\r\n', 1)[0].decode('latin-1'))
        data, mask = text.encode('utf-8'), os.urandom(4)
        n = len(data)
        frame = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack('>H', n) if n < 65536
                                  else bytes([0x80 | 127]) + struct.pack('>Q', n))
        s.sendall(frame + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
        s.settimeout(1.5)
        try:                                        # (anything it says back, for the log)
            back = s.recv(4096)
        except OSError:
            back = b''
        s.sendall(bytes([0x88, 0x80]) + os.urandom(4))      # (goodbye)
        return back
    finally:
        s.close()


def rebelle_canvas(w, h, port):
    """(the helper open_in starts) wait for Rebelle to listen, then ask it for a new canvas w x h. notes in rebelle.log"""
    log = os.path.join(TABLE, 'rebelle.log')
    os.makedirs(TABLE, exist_ok=True)
    def say(t):
        with open(log, 'a', encoding='utf-8') as f:
            f.write(time.strftime('%d %b %H:%M:%S ') + t + '\n')
    end = time.time() + REBELLE_WAIT
    while not listening(port):
        if time.time() > end:
            say('Rebelle never opened its live link on port %d (was it already open without it?)' % port); return
        time.sleep(1.5)
    time.sleep(4)                                       # (listening comes before it's ready for a canvas)
    msg = json.dumps({k: (int(v.format(w=w, h=h)) if isinstance(v, str) and v.startswith('{') else v) for k, v in REBELLE_NEW.items()})
    try:
        back = ws_send(port, msg)
        say('asked for a %d x %d canvas: %s%s' % (w, h, msg, ('  (it said: ' + back[2:].decode('utf-8', 'replace')[:300] + ')') if back else ''))
    except Exception as e:
        say('couldn\'t ask Rebelle for the canvas: %s' % e)


# ---------------- the slot: its folder on the drawing table, its description, its files ----------------
def where(slot):
    m = SLOT.match(slot or '')
    if not m or m.group(1) == 'resets':
        raise ValueError('which slot?')
    folder = os.path.join(TABLE, m.group(1).replace('/', '-') + '--' + m.group(2))
    return folder, m.group(2), os.path.join(ROOT, 'assets', *m.group(1).split('/'))


def described(slot):
    """the slot as tools/slots.json describes it, and the scene (with its map) it's in"""
    with open(os.path.join(HERE, 'slots.json'), encoding='utf-8') as f:
        cat = json.load(f)
    for sc in cat.get('scenes') or []:
        for g in sc.get('groups') or []:
            for s in g.get('slots') or []:
                if s.get('slot') == slot:
                    return s, sc, cat
    return {}, None, cat


def stated_size(s):
    """'1600 x 900: the whole room…' → (1600, 900); '40:52, feet at the bottom' → None (a shape, not a size)"""
    m = re.search(r'(\d{2,5})\s*[x×]\s*(\d{2,5})', s.get('size') or '')
    return (int(m.group(1)), int(m.group(2))) if m else None


def stated_shape(s):
    m = re.search(r'(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)', s.get('size') or '')
    return float(m.group(1)) / float(m.group(2)) if m and float(m.group(2)) else None


def current_file(slot):
    """the picture in the slot now (yours), if there is one"""
    folder, stem, assets = where(slot)
    if not os.path.isdir(assets):
        return None
    for ext in PICTURES:
        p = os.path.join(assets, stem + '.' + ext)
        if os.path.exists(p):
            return p
    return None


def working_file(folder, stem, app=None):
    """what's on the table already: the program's own file if you saved one (Clip Studio's .clip, Rebelle's .reb), else the newest"""
    if not os.path.isdir(folder):
        return None
    have = [os.path.join(folder, n) for n in os.listdir(folder)
            if n.rsplit('.', 1)[-1].lower() in WORKING and not n.startswith(('.', '_'))]
    own = {'csp': '.clip', 'rebelle': '.reb'}.get(app)
    if own:                                             # (Clip Studio's .clip, Rebelle's .reb: that program's own, first)
        mine = [p for p in have if p.lower().endswith(own)]
        if mine:
            return max(mine, key=os.path.getmtime)
    if app:                                             # (not another program's own file: Photoshop can't open a .clip)
        have = [p for p in have if not p.lower().endswith(('.clip', '.reb'))]
    return max(have, key=os.path.getmtime) if have else None


def used(folder):
    try:
        with open(os.path.join(folder, '.used.json'), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def mark_used(slot, name):
    """remember which export went into the slot (its time), so the card can say so"""
    folder, _, _ = where(slot)
    d = used(folder)
    p = os.path.join(folder, name) if name != 'frames' else os.path.join(folder, 'frames')
    d[name] = int(os.path.getmtime(p)) if os.path.exists(p) else 0
    with open(os.path.join(folder, '.used.json'), 'w', encoding='utf-8') as f:
        json.dump(d, f)


def exports(slot):
    """the pictures you've exported onto the table for this slot, newest first"""
    folder, stem, _ = where(slot)
    if not os.path.isdir(folder):
        return []
    out, u = [], used(folder)
    for n in os.listdir(folder):
        p = os.path.join(folder, n)
        if os.path.isfile(p) and n.rsplit('.', 1)[-1].lower() in EXPORTS and not n.startswith(('.', '_')) and n != stem + '-animation.webp':
            t = int(os.path.getmtime(p))
            out.append({'name': n, 'time': t, 'size': os.path.getsize(p), 'used': u.get(n) == t})
    return sorted(out, key=lambda e: -e['time'])


def natural(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', name)]


def frames(slot):
    """the frames in the slot's frames/ folder (the animator's own list of them if it rendered them), in order"""
    folder, _, _ = where(slot)
    fd = os.path.join(folder, 'frames')
    if not os.path.isdir(fd):
        return None
    man, fps = None, None
    try:
        with open(os.path.join(fd, '.rebelle_animator_render.json'), encoding='utf-8') as f:
            man = json.load(f)
    except (OSError, ValueError):
        pass
    if man and man.get('files'):
        names = [n for n in man['files'] if os.path.isfile(os.path.join(fd, n))]
        fps = man.get('fps')
    else:
        names = sorted((n for n in os.listdir(fd) if n.lower().endswith('.png') and not n.startswith(('.', '_'))), key=natural)
    if not names:
        return {'count': 0}
    t = max(int(os.path.getmtime(os.path.join(fd, n))) for n in names)
    return {'count': len(names), 'fps': fps or FPS, 'files': names, 'time': t, 'by': 'Rebelle Animator' if man else '',
            'used': used(folder).get('frames') == t}


def frame_paths(slot):
    folder, _, _ = where(slot)
    fr = frames(slot) or {}
    return [os.path.join(folder, 'frames', n) for n in fr.get('files') or []], fr


def table():
    """every slot with something on the drawing table: { slot: { working, exports } }"""
    out = {}
    if not os.path.isdir(TABLE):
        return out
    for d in sorted(os.listdir(TABLE)):
        if '--' not in d or not os.path.isdir(os.path.join(TABLE, d)):
            continue
        group, stem = d.rsplit('--', 1)
        m = re.match(r'^resets-(reset-[1-8])(?:-([a-z0-9-]+))?$', group)
        slot = 'assets/resets/' + m.group(1) + ('/' + m.group(2) if m.group(2) else '') + '/' + stem if m else 'assets/' + group + '/' + stem
        if not SLOT.match(slot):
            continue
        w = working_file(os.path.join(TABLE, d), stem)
        out[slot] = {'working': os.path.basename(w) if w else '', 'exports': exports(slot), 'frames': frames(slot)}
    return out


# ---------------- the .psd itself (Photoshop's layered format, which all three programs read) ----------------
def pascal(name):
    b = name.encode('ascii', 'replace')[:255]
    b = bytes([len(b)]) + b
    return b + b'\0' * (-len(b) % 4)


def unicode_name(name):
    u = name.encode('utf-16-be')
    body = struct.pack('>I', len(name)) + u + b'\0\0'
    body += b'\0' * (-len(body) % 2)
    return b'8BIMluni' + struct.pack('>I', len(body)) + body


def locked():
    return b'8BIMlspf' + struct.pack('>I', 4) + struct.pack('>I', 0x80000000)


PLAIN = {}


def packbits_row(row):
    """one row of a picture, squeezed the way .psd files do it (runs of the same byte say so once)"""
    n = len(row)
    if n and row.count(row[0]) == n:                    # (a plain row, all one colour: the usual for empty space)
        key = (row[0], n)
        if key not in PLAIN:
            full, rest = divmod(n, 128)
            b = bytes([129, row[0]]) * full
            PLAIN[key] = b + (bytes([257 - rest, row[0]]) if rest >= 2 else bytes([0, row[0]]) if rest == 1 else b'')
        return PLAIN[key]
    out, i = bytearray(), 0
    lit = bytearray()

    def flush():
        while lit:
            chunk = lit[:128]
            out.append(len(chunk) - 1)
            out.extend(chunk)
            del lit[:128]
    for m in re.finditer(rb'(.)\1{2,}', row, re.S):
        lit.extend(row[i:m.start()])
        flush()
        run, b = m.end() - m.start(), row[m.start()]
        while run > 0:
            k = min(run, 128)
            if k < 3:
                lit.extend(bytes([b]) * k)
                flush()
            else:
                out.append(257 - k)
                out.append(b)
            run -= k
        i = m.end()
    lit.extend(row[i:n])
    flush()
    return bytes(out)


def plane_rle(rows):
    """a whole channel, row by row: the row lengths, then the rows (compression 1)"""
    packed = [packbits_row(r) for r in rows]
    return struct.pack('>H', 1) + b''.join(struct.pack('>H', len(p)) for p in packed) + b''.join(packed)


def write_psd(path, w, h, layers, composite=None):
    """layers: bottom first, each { name, rgba: bytes (w*h*4) or None (empty), opacity, locked, hidden }.
    a layer's pixels come either as chans: [(channel id, squeezed bytes), …] (made by the page) or rgba bytes.
    composite: the flattened picture, squeezed (made by the page), or None for plain white (thumbnails only: the
    programs use the layers)"""
    recs, data = b'', b''
    for L in layers:
        if L.get('chans'):                                               # (squeezed in the page already)
            chans, rect = L['chans'], (0, 0, h, w)
        elif L.get('rgba'):
            rgba = L['rgba']
            chans = []
            for cid, off in ((-1, 3), (0, 0), (1, 1), (2, 2)):          # (transparency first, then red, green, blue)
                plane = rgba[off::4]
                chans.append((cid, plane_rle([plane[y * w:(y + 1) * w] for y in range(h)])))
            rect = (0, 0, h, w)
        else:
            chans = [(cid, struct.pack('>H', 0)) for cid in (-1, 0, 1, 2)]  # (an empty layer: no pixels at all)
            rect = (0, 0, 0, 0)
        flags = (0x02 if L.get('hidden') else 0)                         # (bit 1 set = hidden)
        extra = struct.pack('>I', 0) + struct.pack('>I', 0) + pascal(L['name']) + unicode_name(L['name'])
        if L.get('locked'):
            extra += locked()
        recs += struct.pack('>4i', *rect) + struct.pack('>H', len(chans))
        recs += b''.join(struct.pack('>hI', cid, len(c)) for cid, c in chans)
        recs += b'8BIMnorm' + struct.pack('>BBBB', L.get('opacity', 255), 0, flags, 0)
        recs += struct.pack('>I', len(extra)) + extra
        data += b''.join(c for _, c in chans)
    info = struct.pack('>h', len(layers)) + recs + data
    info += b'\0' * (-len(info) % 4)
    layer_section = struct.pack('>I', len(info)) + info + struct.pack('>I', 0)
    with open(path, 'wb') as f:
        f.write(b'8BPS' + struct.pack('>H', 1) + b'\0' * 6 + struct.pack('>HIIHH', 3, h, w, 8, 3))
        f.write(struct.pack('>I', 0))                                    # (no colour table)
        f.write(struct.pack('>I', 0))                                    # (no image resources)
        f.write(struct.pack('>I', len(layer_section)) + layer_section)
        if composite:                                                    # (squeezed in the page already)
            f.write(composite)
        else:
            row = packbits_row(b'\xff' * w)
            f.write(struct.pack('>H', 1) + struct.pack('>H', len(row)) * (3 * h) + row * (3 * h))


# ---------------- the guide and your picture, from the scene itself (a hidden browser, like the templates) ----------------
FIND = '''
([slot, shape]) => {
  const list = DavMap.boxes(window, n => n === slot ? n : null);
  if (!list.length) return null;
  const el = list[0].el;
  // the canvas: the slot's own box, or (a "whole room" picture) the nearest box round it of the size it says
  let pick = el, r = el.getBoundingClientRect();
  if (shape) {
    for (let a = el; a && a.nodeType === 1; a = a.parentElement || (a.ownerSVGElement || null)) {
      const b = a.getBoundingClientRect();
      if (b.width > 2 && b.height > 2 && Math.abs(b.width / b.height - shape) / shape < 0.03 && b.width >= r.width - 1) { pick = a; r = b; break; }
      if (a.tagName === 'BODY') break;
    }
  }
  // the other slots that overlap it (for the measurements layer: where everything else sits on this canvas)
  // (not the sky's things, the characters, the bag, the arrows or the buttons: they move, or sit over every page; several of one
  // slot, like the crows on the wire, become one box round them all)
  const SKIP = /^assets\/(sky|characters|items|ui|sounds|resets)\//, seen = {};
  DavMap.boxes(window).forEach(b => {
    if (b.slot === slot || b.el === el || SKIP.test(b.slot) || /arrow/.test(b.slot)) return;
    const br = b.el.getBoundingClientRect();
    const ix = Math.min(br.right, r.right) - Math.max(br.left, r.left), iy = Math.min(br.bottom, r.bottom) - Math.max(br.top, r.top);
    if (ix < 4 || iy < 4 || br.width * br.height >= r.width * r.height * .95) return;   // (not on it, or the whole canvas again)
    if (br.width * br.height < r.width * r.height * .0004) return;                      // (a speck)
    const o = seen[b.slot];
    if (o) { const x2 = Math.max(o.x + o.w, br.right), y2 = Math.max(o.y + o.h, br.bottom);
      o.x = Math.min(o.x, br.left); o.y = Math.min(o.y, br.top); o.w = x2 - o.x; o.h = y2 - o.y; o.n++; return; }
    seen[b.slot] = { slot: b.slot, x: br.left, y: br.top, w: br.width, h: br.height, n: 1 };
  });
  const others = Object.values(seen).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 24);
  return { x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, others };
}
'''

# the measurements layer (11 Oct, Victor: "add measurements like this for the assets"): rulers along the top and left in
# this canvas's own pixels, its size, the other slots that overlap it (outlined, with where they are on this canvas), and
# the lines slots.json gives it by hand ("marks": where the ground starts, the path's edges, the door…), each with its
# numbers in this canvas's pixels. drawn in the page, a see-through picture the size of the canvas
MEASURE = r"""
([W, H, others, marks, title]) => {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const s = Math.max(1, Math.min(W, H) / 520), fs = Math.round(12 * s), R = v => Math.round(v);
  const ink = '#1d6f8a', red = '#c0392b', paper = 'rgba(255,250,238,.9)';
  x.font = fs + 'px Georgia, serif'; x.textBaseline = 'middle';
  // a label on a scrap of paper; one that would cover another steps down (then up) till it's clear
  const placed = [], clash = (a) => placed.some(b => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h);
  const tag = (t, px, py, col, right, fixed) => {
    const w = x.measureText(t).width + 8 * s, h = fs + 6 * s;
    const lx = Math.max(2, Math.min(W - w - 2, right ? px - w : px)), ly0 = Math.max(2, Math.min(H - h - 2, py - h / 2));
    let ly = ly0;
    if (!fixed) for (let k = 1; k < 40 && clash({ x: lx, y: ly, w, h }); k++) {
      const d = Math.ceil(k / 2) * (h + 2 * s) * (k % 2 ? 1 : -1);
      ly = Math.max(2, Math.min(H - h - 2, ly0 + d));
    }
    placed.push({ x: lx, y: ly, w, h });
    x.fillStyle = paper; x.fillRect(lx, ly, w, h); x.fillStyle = col; x.fillText(t, lx + 4 * s, ly + h / 2);
  };
  // the rulers: a tick every half step, a number every step (steps that give about a dozen across)
  const STEPS = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  const sx = STEPS.find(v => W / v <= 16) || 2000, sy = STEPS.find(v => H / v <= 12) || 2000;
  x.strokeStyle = 'rgba(29,111,138,.85)'; x.lineWidth = Math.max(1, s);
  for (let v = 0; v <= W; v += sx / 2) { const big = v % sx === 0; x.beginPath(); x.moveTo(R(v) + .5, 0); x.lineTo(R(v) + .5, (big ? 16 : 8) * s); x.stroke(); if (big && v > 0 && v < W) tag(String(v), v + 3 * s, 24 * s, ink, false, true); }
  for (let v = 0; v <= H; v += sy / 2) { const big = v % sy === 0; x.beginPath(); x.moveTo(0, R(v) + .5); x.lineTo((big ? 16 : 8) * s, R(v) + .5); x.stroke(); if (big && v > 0 && v < H) tag(String(v), 20 * s, v, ink, false, true); }
  tag(title + ' \u00b7 this canvas: ' + W + ' \u00d7 ' + H + ' px', W - 6 * s, H - 14 * s, ink, true, true);
  // the other slots on it
  x.setLineDash([8 * s, 6 * s]); x.lineWidth = Math.max(1.5, 1.5 * s); x.strokeStyle = 'rgba(29,111,138,.85)';
  others.forEach(o => x.strokeRect(o.x, o.y, o.w, o.h));
  const later = () => others.forEach(o => { x.setLineDash([]);
    tag(o.slot + (o.n > 1 ? ' (\u00d7' + o.n + ')' : '') + ' \u00b7 x ' + R(o.x) + '\u2013' + R(o.x + o.w) + ', y ' + R(o.y) + '\u2013' + R(o.y + o.h), o.x + 4 * s, o.y + fs, ink); });
  // the marks
  x.setLineDash([]); x.strokeStyle = red; x.fillStyle = red; x.lineWidth = Math.max(2, 2 * s);
  let nv = 0;
  marks.forEach(m => {
    const L = m.label || '';
    if (m.box) { const [bx, by, bw, bh] = m.box; x.strokeRect(bx, by, bw, bh);
      tag(L + ' \u00b7 x ' + R(bx) + '\u2013' + R(bx + bw) + ', y ' + R(by) + '\u2013' + R(by + bh), bx + 4 * s, by - fs * .9, red); }
    else if (m.line) { const [x1, y1, x2, y2] = m.line; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
      tag(L + ' \u00b7 (' + R(x1) + ', ' + R(y1) + ') to (' + R(x2) + ', ' + R(y2) + ')', (x1 + x2) / 2 + 6 * s, (y1 + y2) / 2, red); }
    else if (m.x != null && m.y != null) { x.beginPath(); x.arc(m.x, m.y, 5 * s, 0, 7); x.fill();
      tag(L + ' \u00b7 (' + R(m.x) + ', ' + R(m.y) + ')', m.x + 9 * s, m.y, red); }
    else if (m.y != null) { x.beginPath(); x.moveTo(0, m.y); x.lineTo(W, m.y); x.stroke(); tag(L + ' \u00b7 y ' + R(m.y), 44 * s, m.y - fs, red); }
    else if (m.x != null) { x.beginPath(); x.moveTo(m.x, 0); x.lineTo(m.x, H); x.stroke(); tag(L + ' \u00b7 x ' + R(m.x), m.x + 5 * s, 50 * s + (nv++ % 4) * (fs + 10 * s), red); }
  });
  later();   // (the other slots' labels last, so they're the ones that step aside for the marks')
  return c.toDataURL('image/png');
}
"""
MEASURES_NAME = 'measurements (hide me before you export)'


def marks_for(s, W, H):
    """slots.json's "marks" for the slot (or "marksFrom" another slot's), in the units of "marksIn" (else its stated
    size, else this canvas), turned into this canvas's pixels"""
    if s.get('marksFrom'):
        o, _, _ = described(s['marksFrom'])
        s = dict(o, marksIn=o.get('marksIn') or s.get('marksIn'))
    m = re.search(r'(\d{2,5})\s*[x\u00d7]\s*(\d{2,5})', s.get('marksIn') or '')
    bw, bh = (int(m.group(1)), int(m.group(2))) if m else (stated_size(s) or (W, H))
    kx, ky = W / bw, H / bh
    out = []
    for mk in s.get('marks') or []:
        n = {'label': mk.get('label', '')}
        if 'box' in mk:
            b = mk['box']; n['box'] = [b[0] * kx, b[1] * ky, b[2] * kx, b[3] * ky]
        elif 'line' in mk:
            l = mk['line']; n['line'] = [l[0] * kx, l[1] * ky, l[2] * kx, l[3] * ky]
        else:
            if 'x' in mk: n['x'] = mk['x'] * kx
            if 'y' in mk: n['y'] = mk['y'] * ky
        out.append(n)
    return out


MEASURE_WHY = []                                        # (why the last measurements layer couldn't be drawn, if it couldn't)


def measures(page, slot, s, W, H, others=None):
    """the measurements layer's picture (a data: URL), drawn in the page"""
    try:
        return page.evaluate(MEASURE, [W, H, others or [], marks_for(s, W, H), slot.replace('assets/', '')])
    except Exception as e:
        MEASURE_WHY[:] = [str(e).splitlines()[0] if str(e) else type(e).__name__]
        return None


# the page builds the layers' pixels and hands them back (as base64), so no picture library is needed here
BUILD = '''
async ([shot, art, W, H, place, artFit, measure]) => {
  const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('couldn\\'t read ' + src)); i.src = src; });
  const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  // a row squeezed the .psd way (PackBits): runs of 3 or more of the same byte said once, the rest as they are
  const row = (d, start, n, buf, pos) => {
    const p0 = pos; let i = 0, lit = 0;
    const flush = to => { while (lit < to) { const k = Math.min(128, to - lit); buf[pos++] = k - 1; for (let j = 0; j < k; j++) buf[pos++] = d[start + (lit + j) * 4]; lit += k; } };
    while (i < n) {
      const v = d[start + i * 4]; let r = 1;
      while (i + r < n && r < 128 && d[start + (i + r) * 4] === v) r++;
      if (r >= 3) { flush(i); buf[pos++] = 257 - r; buf[pos++] = v; i += r; lit = i; } else i += r;
    }
    flush(n);
    return pos - p0;
  };
  // channels (offsets in rgba): each one [compression 1][a length per row][the rows]; or (flat) one compression for all
  const squeeze = (c, offs, together) => {
    const d = c.getContext('2d').getImageData(0, 0, W, H).data, worst = H * (W + Math.ceil(W / 128) + 2);
    const parts = offs.map(off => { const buf = new Uint8Array(worst), lens = new Uint16Array(H); let pos = 0;
      for (let y = 0; y < H; y++) { lens[y] = row(d, y * W * 4 + off, W, buf, pos); pos += lens[y]; } return { lens, data: buf.subarray(0, pos) }; });
    const head = n => { const b = new Uint8Array(2 + 2 * n); b[1] = 1; return b; };
    const join = list => { let n = 0; list.forEach(x => n += x.length); const o = new Uint8Array(n); let p = 0; list.forEach(x => { o.set(x, p); p += x.length; }); return o; };
    const lens = ls => { const b = new Uint8Array(2 * ls.length); ls.forEach((v, i) => { b[2 * i] = v >> 8; b[2 * i + 1] = v & 255; }); return b; };
    if (together) { const h = new Uint8Array(2); h[1] = 1; return b64(join([h].concat(parts.map(x => lens(x.lens))).concat(parts.map(x => x.data)))); }
    return parts.map(x => { const h = new Uint8Array(2); h[1] = 1; return b64(join([h, lens(x.lens), x.data])); });
  };
  const out = {};
  let g = null, a = null;
  if (shot) {
    const im = await load(shot.startsWith('data:') ? shot : 'data:image/png;base64,' + shot);
    g = canvas(); const x = g.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, place[0] * W, place[1] * H, place[2] * W, place[3] * H);
    out.guide = squeeze(g, [3, 0, 1, 2]);
    out.guidePng = g.toDataURL('image/png').split(',')[1];
  }
  if (art) {
    const im = await load(art);
    a = canvas(); const x = a.getContext('2d');
    x.imageSmoothingQuality = 'high';
    const iw = im.naturalWidth || W, ih = im.naturalHeight || H;
    if (artFit === 'fill' || Math.abs(iw / ih - W / H) < 0.02 * W / H) x.drawImage(im, 0, 0, W, H);
    else { const s = Math.min(W / iw, H / ih); x.drawImage(im, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); }
    out.art = squeeze(a, [3, 0, 1, 2]);
  }
  if (measure) {
    const im = await load(measure);
    const m = canvas(); m.getContext('2d').drawImage(im, 0, 0, W, H);
    out.measure = squeeze(m, [3, 0, 1, 2]);
    out.measurePng = measure.split(',')[1];
  }
  // the flattened picture (only for thumbnails): white, the guide at half strength, then your picture
  const f = canvas(), fx = f.getContext('2d');
  fx.fillStyle = '#fff'; fx.fillRect(0, 0, W, H);
  if (g) { fx.globalAlpha = 0.5; fx.drawImage(g, 0, 0); fx.globalAlpha = 1; }
  if (a) fx.drawImage(a, 0, 0);
  out.flat = squeeze(f, [0, 1, 2], true);
  return out;
}
'''

HIDE_UI = ('.place-tabs, .signpost, .hotbar, .inv-note, .ui-button, .cp, .mc-say, .lives, .bee-talk, .bottle-hint, .tap-hint, '
           '.dm-layer { visibility: hidden !important; } * { animation-play-state: paused !important; }')


def look(slot, s, sc, view_name, then):
    """open the slot's scene (the view it's showing in), find it, take the guide, and call then(found) while the
    browser's still open (it builds the layers' pixels there). → what then() returns, or None if it isn't on any page"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    if not sc or not sc.get('map'):
        return None
    sys.path.insert(0, HERE)
    from smoke import serve
    from templates import NOON, page_url
    want = stated_size(s)
    shape = (want[0] / want[1]) if want else stated_shape(s)
    views = list(sc['map'].get('views') or [])
    order = [None] + views
    if view_name:
        order = [v for v in views if v.get('name') == view_name] + order
    server, base = serve()
    server.handle_error = lambda *a: None
    found = None
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for view in order:
                ctx = browser.new_context(viewport={'width': 1920, 'height': 1080}, device_scale_factor=SCALE, timezone_id='UTC')
                ctx.add_init_script(NOON)
                ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
                page = ctx.new_page()
                try:
                    page.goto(page_url(base, sc['map']['page']), wait_until='load', timeout=30000)
                    try:
                        page.wait_for_load_state('networkidle', timeout=12000)
                    except Exception:
                        pass
                    time.sleep(2)
                    if view:
                        page.evaluate('() => { %s }' % view['do'])
                        if view.get('until'):
                            try:
                                page.wait_for_function('() => (%s)' % view['until'], timeout=15000, polling=200)
                            except Exception:
                                pass
                        time.sleep((view.get('wait') or 1200) / 1000 + .5)
                    page.add_script_tag(path=os.path.join(HERE, 'map.js'))
                    page.add_style_tag(content=HIDE_UI)
                    box = page.evaluate(FIND, [slot, shape])
                    if box:
                        # the part of it that's on the screen, photographed at twice the size
                        x0, y0 = max(0, box['x']), max(0, box['y'])
                        x1, y1 = min(box['vw'], box['x'] + box['w']), min(box['vh'], box['y'] + box['h'])
                        shot = page.screenshot(clip={'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0}) if x1 - x0 > 2 and y1 - y0 > 2 else None
                        place = [(x0 - box['x']) / box['w'], (y0 - box['y']) / box['h'], (x1 - x0) / box['w'], (y1 - y0) / box['h']]
                        found = {'box': box, 'shot': shot, 'place': place, 'page': page, 'ctx': ctx, 'view': view and view['name']}
                        break
                except Exception:
                    pass
                ctx.close()
            out = None
            if found:
                def build(W, H, art, fit):
                    b = found['box']
                    others = [{'slot': o['slot'].replace('assets/', ''), 'x': (o['x'] - b['x']) / b['w'] * W,
                              'y': (o['y'] - b['y']) / b['h'] * H, 'w': o['w'] / b['w'] * W,
                              'h': o['h'] / b['h'] * H, 'n': o.get('n', 1)} for o in (b.get('others') or [])]
                    return found['page'].evaluate(
                        BUILD, [base64.b64encode(found['shot']).decode('ascii') if found['shot'] else None,
                                (base + art) if art else None, W, H, found['place'], fit,
                                measures(found['page'], slot, s, W, H, others)])
                found['build'] = build
                out = then(found)
                found['ctx'].close()
            browser.close()
            return out
    finally:
        server.shutdown()
    return None


def data_url(path):
    ext = path.rsplit('.', 1)[-1].lower()
    kind = {'svg': 'svg+xml', 'jpg': 'jpeg'}.get(ext, ext)
    with open(path, 'rb') as f:
        return 'data:image/%s;base64,%s' % (kind, base64.b64encode(f.read()).decode('ascii'))


def guide_file(s):
    """a slot that's one piece of another (the bee's faces, on its body): slots.json's "guide" names the slot(s) it's laid
    on ("a|b": the first there is). → that picture of yours, if it's in"""
    for g in (s.get('guide') or '').split('|'):
        p = g.strip() and current_file(g.strip())
        if p:
            return p
    return None


def from_guide(gpath, art, slot='', s=None):
    """the canvas from the picture it's laid on: exactly its size (so what you draw lines up by itself), that picture as
    the guide, and yours (if any) as it is now. no scene to open: a blank page does the squeezing"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        g = data_url(gpath)
        W, H = page.evaluate('src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); '
                             'i.onerror = () => no(new Error("couldn\'t read the guide picture")); i.src = src; })', g)
        k = min(1, BIGGEST / max(W, H))
        W, H = max(8, round(W * k)), max(8, round(H * k))
        px = page.evaluate(BUILD, [g, data_url(art) if art else None, W, H, [0, 0, 1, 1], 'fill', measures(page, slot, s or {}, W, H)])
        browser.close()
    return W, H, px


# ---------------- pictures that repeat (the waves: side to side; the rope: top to bottom) ----------------
# slots.json "tile": "x" (repeats sideways), "y" (downwards) or "xy" (both). their canvas is one tile, and its guide marks
# the edges that join (what goes off one comes back on the other), over "tileGuide" (a picture, e.g. a wave's lines) if
# there is one. "wrap it" (wrap() below) shifts a picture by half a tile, so the join's in the middle, to paint over
TILE_GUIDE = r"""
async ([W, H, axis, under]) => {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  if (under) await new Promise(ok => { const i = new Image(); i.onload = () => { x.drawImage(i, 0, 0, W, H); ok(); }; i.onerror = ok; i.src = under; });
  const s = Math.max(1, Math.min(W, H) / 400), band = (n) => Math.max(6 * s, n * .06);
  const ink = '#b4442a', font = Math.round(Math.max(11, 15 * s)) + 'px Georgia, serif';
  x.font = font; x.lineWidth = Math.max(2, 2 * s); x.setLineDash([10 * s, 7 * s]);
  const label = (t, px, py, rot) => { x.save(); x.translate(px, py); x.rotate(rot || 0); x.fillStyle = 'rgba(255,248,232,.85)';
    const w = x.measureText(t).width; x.fillRect(-4 * s, -14 * s, w + 8 * s, 19 * s); x.fillStyle = ink; x.fillText(t, 0, 0); x.restore(); };
  if (axis.includes('x')) {
    const b = band(W);
    x.fillStyle = 'rgba(180,68,42,.12)'; x.fillRect(0, 0, b, H); x.fillRect(W - b, 0, b, H);
    x.strokeStyle = ink; x.beginPath(); x.moveTo(x.lineWidth / 2, 0); x.lineTo(x.lineWidth / 2, H); x.moveTo(W - x.lineWidth / 2, 0); x.lineTo(W - x.lineWidth / 2, H); x.stroke();
    const ly = Math.max(24 * s, H * .26);                     // (below a guide picture's own title)
    label('← joins the right edge', b + 6 * s, ly); label('joins the left edge →', W - b - 6 * s - x.measureText('joins the left edge →').width, ly);
    label('what goes off one side comes back on the other: keep heights and lines level across', b + 6 * s, H - 12 * s);
  }
  if (axis.includes('y')) {
    const b = band(H);
    x.fillStyle = 'rgba(180,68,42,.12)'; x.fillRect(0, 0, W, b); x.fillRect(0, H - b, W, b);
    x.strokeStyle = ink; x.beginPath(); x.moveTo(0, x.lineWidth / 2); x.lineTo(W, x.lineWidth / 2); x.moveTo(0, H - x.lineWidth / 2); x.lineTo(W, H - x.lineWidth / 2); x.stroke();
    if (W >= 160 * s) { label('↑ joins the bottom edge', 8 * s, b + 18 * s); label('joins the top edge ↓', 8 * s, H - b - 8 * s); }
    else { label('joins the bottom →', 6 * s + 14 * s, b + 6 * s, Math.PI / 2); }
  }
  return c.toDataURL('image/png');
}
"""
# the picture moved by half a tile, wrapping round (Photoshop's Filter > Other > Offset), and a guide where the join is now
WRAP = r"""
async ([src, axis]) => {
  const i = await new Promise((ok, no) => { const m = new Image(); m.onload = () => ok(m); m.onerror = () => no(new Error("couldn't read that picture")); m.src = src; });
  const W = i.naturalWidth, H = i.naturalHeight, dx = axis.includes('x') ? Math.round(W / 2) : 0, dy = axis.includes('y') ? Math.round(H / 2) : 0;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  for (const ox of [0, -W]) for (const oy of [0, -H]) x.drawImage(i, dx + ox, dy + oy);
  const g = document.createElement('canvas'); g.width = W; g.height = H; const y = g.getContext('2d');
  const s = Math.max(1, Math.min(W, H) / 400), ink = '#b4442a';
  y.fillStyle = 'rgba(180,68,42,.14)'; y.strokeStyle = ink; y.lineWidth = Math.max(2, 2 * s); y.setLineDash([10 * s, 7 * s]);
  y.font = Math.round(Math.max(11, 15 * s)) + 'px Georgia, serif';
  const label = (t, px, py) => { y.fillStyle = 'rgba(255,248,232,.85)'; const w = y.measureText(t).width; y.fillRect(px - 4 * s, py - 14 * s, w + 8 * s, 19 * s); y.fillStyle = ink; y.fillText(t, px, py); };
  if (dx) { const b = W * .05; y.fillRect(dx - b, 0, 2 * b, H); y.beginPath(); y.moveTo(dx, 0); y.lineTo(dx, H); y.stroke(); label('the join is here now: paint over it till it disappears', dx + b + 6 * s, 24 * s); }
  if (dy) { const b = H * .05; y.fillStyle = 'rgba(180,68,42,.14)'; y.fillRect(0, dy - b, W, 2 * b); y.beginPath(); y.moveTo(0, dy); y.lineTo(W, dy); y.stroke(); if (W >= 160 * s) label('the join is here now: paint over it', 8 * s, dy - b - 8 * s); }
  return { W, H, art: c.toDataURL('image/png'), guide: g.toDataURL('image/png') };
}
"""


def tile_axis(s):
    a = (s.get('tile') or '').lower()
    return a if a in ('x', 'y', 'xy') else ''


def blank_page(then):
    """a hidden browser's empty page, for squeezing pictures into a .psd with no scene to open"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            return then(browser.new_page())
        finally:
            browser.close()


def tile_canvas(s, art, slot=''):
    """one tile: the size slots.json gives (its "canvas", else its size doubled), the joining edges marked over its
    tileGuide picture, and yours as it is now"""
    W, H = canvas_size(s, None) or (None, None)
    if not W:
        raise ValueError('a repeating slot needs a size in tools/slots.json')
    under = os.path.join(ROOT, *s['tileGuide'].split('/')) if s.get('tileGuide') else None
    under = data_url(under) if under and os.path.isfile(under) else None

    def build(page):
        guide = page.evaluate(TILE_GUIDE, [W, H, tile_axis(s), under])
        return page.evaluate(BUILD, [guide, data_url(art) if art else None, W, H, [0, 0, 1, 1], 'fill', measures(page, slot, s, W, H)])
    return W, H, blank_page(build)


NOTE_TILE = """
this one REPEATS ({how}): the canvas is one tile, and the guide marks the edges that join. whatever goes off one of
those edges has to come back on the other, at the same height, so the copies line up with no seam. (the guide over
the waves also shows each wave's waterline and crest line.)

to check and mend the join: export as usual, and the slot's card shows it laid out {times}, and says whether the join
shows. "wrap it" then makes {name}-wrapped.psd: your picture moved by half a tile, so the join is in the middle where you
can see it and paint over it (like Photoshop's Filter > Other > Offset, which Clip Studio doesn't have). export that one;
it doesn't need moving back (a tile shifted by half still repeats the same).
"""


def wrap(slot, name, app=None):
    """an export (or the slot's picture now: name 'current') moved by half a tile → <stem>-wrapped.psd, opened in app"""
    folder, stem, _ = where(slot)
    s, _, _ = described(slot)
    axis = tile_axis(s)
    if not axis:
        raise ValueError(slot + " doesn't repeat (tools/slots.json gives it no 'tile')")
    if name in (None, '', 'current'):
        src = current_file(slot)
        if not src:
            raise ValueError('there is no picture in ' + slot + ' yet')
    else:
        src = os.path.join(folder, os.path.basename(name))
        if not os.path.isfile(src) or src.rsplit('.', 1)[-1].lower() not in EXPORTS:
            raise ValueError('no such picture on the drawing table')

    def build(page):
        r = page.evaluate(WRAP, [data_url(src), axis])
        r['px'] = page.evaluate(BUILD, [r['guide'], r['art'], r['W'], r['H'], [0, 0, 1, 1], 'fill'])
        return r
    r = blank_page(build)
    W, H, px = r['W'], r['H'], r['px']
    chans = lambda k: list(zip((-1, 0, 1, 2), (base64.b64decode(x) for x in px[k])))
    layers = [{'name': 'the join (hide me before you export)', 'chans': chans('guide'), 'opacity': 200, 'locked': True},
              {'name': 'your picture, moved by half', 'chans': chans('art')},
              {'name': 'paint over the join here', 'rgba': None}]
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, stem + '-wrapped.psd')
    write_psd(path, W, H, layers, base64.b64decode(px['flat']))
    out = {'file': path, 'folder': folder, 'w': W, 'h': H, 'made': True, 'wrapped': True}
    if app:
        out.update(open_in(app, path))
    return out


def canvas_size(s, box):
    """twice the size it's shown at (or the size it says, doubled; or slots.json's "canvas", as it is), the right shape,
    never over BIGGEST a side"""
    own = re.search(r'(\d{2,5})\s*[x×]\s*(\d{2,5})', s.get('canvas') or '')
    want = stated_size(s)
    if own:
        w, h = int(own.group(1)), int(own.group(2))
    elif want:
        w, h = want[0] * SCALE, want[1] * SCALE
    elif box:
        w, h = round(box['w'] * SCALE), round(box['h'] * SCALE)
    else:
        return None
    k = min(1, BIGGEST / max(w, h))
    return max(8, round(w * k)), max(8, round(h * k))


NOTE = '''what to do (the drawing table: tools/drawtable.py)

{name}.psd is the slot {slot}, at twice the size it's shown at: {w} x {h}.
  guide              the scene as it is, where this slot sits (faded and locked). hide it before you export.
  your picture now   what was in the slot when this was made (if there was anything)
  draw here          an empty layer
  measurements       on top: rulers in this canvas's pixels, the other slots on it (blue dashes, with where they
                     are), and the lines that matter for this picture (red: where the ground starts, the door…).
                     locked. hide it before you export
layers/guide.png and layers/measurements.png are the same two as pictures of their own, for a program that can't
read a .psd's layers (Rebelle: File > Import each one, as a layer of its own, and hide them before you export).

when it's done: hide the guide, and export a PNG (or WebP) into this same folder, with a see-through background
if the slot wants one. the slot's card in the asset manager will show it, with a "use this" button.
your working file stays here, so the asset manager's button opens it again as you left it.

an animation: its frames go in the frames folder here, as numbered PNGs (see-through).
  Clip Studio: set up the timeline (12 fps, 60 frames is the usual), then File > Export animation > Image sequence,
               PNG, into the frames folder. (or export an animated GIF or APNG into this folder, like a still)
  Rebelle Animator: its renders go straight into the frames folder (the project's set up that way).
the slot's card then plays them, with a "use as animation" button that makes them one animated WebP for the slot.
'''


def make(slot, fresh=False, view=None, app=None):
    """make the starting file (unless there's one already). → { file, folder, w, h, guide, made, view }"""
    folder, stem, _ = where(slot)
    s, sc, _ = described(slot)
    have = None if fresh else working_file(folder, stem, app)
    if have and untouched_old(have, folder):            # (made before the measurements, and never saved over: no work to lose)
        have = None
    if have:
        return {'file': have, 'folder': folder, 'made': False}
    mine = current_file(slot)
    art = os.path.relpath(mine, ROOT).replace(os.sep, '/') if mine else None
    result = {}

    def built(found):                                   # (the scene's open: the canvas's size, and its pixels)
        W, H = canvas_size(s, found['box'])
        result.update(W=W, H=H, px=found['build'](W, H, art, 'fill'), view=found.get('view'))
    under = guide_file(s)
    if tile_axis(s):
        try:
            result['W'], result['H'], result['px'] = tile_canvas(s, mine, slot)
            result['tile'] = tile_axis(s)
        except Exception as e:
            result['why'] = str(e).splitlines()[0]
    elif under:
        try:
            result['W'], result['H'], result['px'] = from_guide(under, mine, slot, s)
            result['on'] = os.path.relpath(under, ROOT).replace(os.sep, '/')
        except Exception as e:
            result['why'] = str(e).splitlines()[0]
    if not result.get('px') and sc and sc.get('map'):
        try:
            look(slot, s, sc, view, built)
        except Exception as e:
            result['why'] = str(e).splitlines()[0]
    if result.get('px'):
        W, H, px = result['W'], result['H'], result['px']
        chans = lambda k: list(zip((-1, 0, 1, 2), (base64.b64decode(x) for x in px[k])))
        layers = []
        if px.get('guide'):
            layers.append({'name': 'repeat guide: the edges join (hide me before you export)' if result.get('tile') else 'guide (hide me before you export)',
                           'chans': chans('guide'), 'opacity': GUIDE_OPACITY, 'locked': True})
        if px.get('art'):
            layers.append({'name': 'your picture now', 'chans': chans('art')})
        layers.append({'name': 'draw here', 'rgba': None})
        if px.get('measure'):
            layers.append({'name': MEASURES_NAME, 'chans': chans('measure'), 'opacity': 235, 'locked': True})
        composite = base64.b64decode(px['flat']) if px.get('flat') else None
        guide = bool(px.get('guide'))
        pngs = {'guide': px.get('guidePng'), 'measurements': px.get('measurePng')}
    else:
        size = canvas_size(s, None)
        if not size:
            raise ValueError("couldn't tell how big " + slot + " should be: it isn't on any page right now, and its description "
                             "in tools/slots.json doesn't give a size like 800 x 600")
        W, H = size
        layers = [{'name': 'draw here', 'rgba': None}]
        composite, guide, pngs = None, False, {}
        try:                                            # (the measurements still, on a blank page, if there's a browser)
            px = blank_page(lambda page: page.evaluate(BUILD, [None, None, W, H, [0, 0, 1, 1], 'fill', measures(page, slot, s, W, H)]))
            if px and px.get('measure'):
                layers.append({'name': MEASURES_NAME, 'chans': list(zip((-1, 0, 1, 2), (base64.b64decode(x) for x in px['measure']))),
                               'opacity': 235, 'locked': True})
                pngs = {'measurements': px.get('measurePng')}
        except Exception as e:
            MEASURE_WHY[:] = MEASURE_WHY or [str(e).splitlines()[0] if str(e) else type(e).__name__]
    os.makedirs(folder, exist_ok=True)               # (only now: a slot it can't size leaves nothing behind)
    path = os.path.join(folder, stem + '.psd')
    write_psd(path, W, H, layers, composite)
    # the guide and the measurements as pictures of their own too (layers/), for a program that can't read the .psd's
    # layers (Rebelle): File > Import them, each as a layer of its own
    for k, b in pngs.items():
        if b:
            os.makedirs(os.path.join(folder, 'layers'), exist_ok=True)
            with open(os.path.join(folder, 'layers', k + '.png'), 'wb') as f:
                f.write(base64.b64decode(b))
    with open(os.path.join(folder, '.made.json'), 'w', encoding='utf-8') as f:
        json.dump({'psd': int(os.path.getmtime(path)), 'measured': any(L['name'] == MEASURES_NAME for L in layers)}, f)
    with open(os.path.join(folder, 'what to do.txt'), 'w', encoding='utf-8') as f:
        f.write(NOTE.format(name=stem, slot=slot, w=W, h=H))
        if result.get('tile'):
            a = result['tile']
            f.write(NOTE_TILE.format(name=stem, how={'x': 'side to side', 'y': 'top to bottom', 'xy': 'both ways'}[a],
                                     times={'x': 'three times side by side', 'y': 'three times one above another', 'xy': 'three by three'}[a]))
    measured = any(L['name'] == MEASURES_NAME for L in layers)
    return {'file': path, 'folder': folder, 'w': W, 'h': H, 'guide': guide, 'made': True, 'view': result.get('view'), 'on': result.get('on'),
            'tile': result.get('tile'), 'measured': measured,
            'measureWhy': None if measured else (MEASURE_WHY[0] if MEASURE_WHY else result.get('why') or 'no browser to draw it in')}


def untouched_old(have, folder):
    """the .psd the table made, never saved over, and without the measurements layer (made before 11 Oct): safe to make again"""
    if not have.lower().endswith('.psd'):
        return False
    try:
        with open(have, 'rb') as f:
            if MEASURES_NAME.encode('ascii')[:24] in f.read():
                return False
        try:
            with open(os.path.join(folder, '.made.json'), encoding='utf-8') as f:
                return int(os.path.getmtime(have)) == json.load(f).get('psd')
        except (OSError, ValueError):               # (older still: it was written a moment before its "what to do.txt")
            return abs(os.path.getmtime(have) - os.path.getmtime(os.path.join(folder, 'what to do.txt'))) < 10
    except OSError:
        return False


def psd_size(path):
    """(width, height) of a .psd (from its header)"""
    try:
        with open(path, 'rb') as f:
            head = f.read(26)
        if head[:4] == b'8BPS':
            h, w = struct.unpack('>II', head[14:22])
            return w, h
    except OSError:
        pass
    return None


def animate(slot, app, fresh=False, view=None):
    """set up an animation of the slot: in Clip Studio (the canvas: you make the timeline), or in the Rebelle Animator"""
    if app not in ('csp', 'animator'):
        raise ValueError('animate in which? (csp or animator)')
    folder, stem, _ = where(slot)
    if app == 'animator' and not find_animator():
        return {'opened': False, 'need': 'animator', 'name': 'Rebelle Animator'}
    info = make(slot, fresh=fresh, view=view, app='csp' if app == 'csp' else None)
    os.makedirs(os.path.join(folder, 'frames'), exist_ok=True)          # (the frames come back here)
    if app == 'csp':
        info.update(open_in('csp', info['file']))
        return info
    size = (info.get('w'), info.get('h')) if info.get('w') else psd_size(os.path.join(folder, stem + '.psd'))
    if not size:
        raise ValueError("couldn't tell the canvas's size")
    proj = os.path.join(folder, 'animator')
    pj = os.path.join(proj, 'project.json')
    if not os.path.exists(pj):
        os.makedirs(proj, exist_ok=True)
        with open(pj, 'w', encoding='utf-8') as f:
            json.dump({'format': 'rebelle-animator', 'version': 1, 'name': 'DaV-nky ' + slot.replace('assets/', '').replace('/', ' '),
                       'created': time.time(), 'modified': time.time(),
                       'width': min(8000, size[0]), 'height': min(8000, size[1]), 'fps': FPS,
                       'output_dir': os.path.abspath(os.path.join(folder, 'frames')),
                       'drawings': [{'id': os.urandom(4).hex(), 'hold': 2, 'strokes': []}]}, f, indent=1)
    if sys.platform != 'win32':
        raise ValueError('the Rebelle Animator only runs on Windows')
    subprocess.Popen([find_animator(), '--open', os.path.abspath(proj)], creationflags=NEW_CONSOLE, close_fds=True,
                     cwd=os.path.dirname(find_animator()))
    info.update(opened=True, name='Rebelle Animator', animator=True, w=size[0], h=size[1])
    return info


def ffmpeg():
    import shutil
    mine = animator_settings().get('ffmpeg')
    return mine if mine and os.path.isfile(mine) else shutil.which('ffmpeg')


def assemble(slot, fps=None, half=False):
    """the frames → one animated WebP (see-through kept), in the slot's folder. → its path"""
    folder, stem, _ = where(slot)
    paths, fr = frame_paths(slot)
    if not paths:
        raise ValueError('there are no frames in ' + os.path.join(folder, 'frames') + ' yet')
    fps = max(1, min(60, float(fps or fr.get('fps') or FPS)))
    out = os.path.join(folder, stem + '-animation.webp')
    ff = ffmpeg()
    if ff:
        import shutil, tempfile
        tmp = tempfile.mkdtemp(prefix='dav-frames-')
        try:
            for i, pth in enumerate(paths):                 # (numbered plainly, in order, for FFmpeg)
                shutil.copyfile(pth, os.path.join(tmp, '%05d.png' % (i + 1)))
            for enc in ('libwebp_anim', 'libwebp'):
                cmd = [ff, '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(tmp, '%05d.png')]
                if half:
                    cmd += ['-vf', 'scale=trunc(iw/2):trunc(ih/2):flags=lanczos']
                cmd += ['-c:v', enc, '-lossless', '0', '-q:v', '85', '-compression_level', '4', '-loop', '0', '-pix_fmt', 'yuva420p', out]
                r = subprocess.run(cmd, capture_output=True, text=True, creationflags=0x08000000 if sys.platform == 'win32' else 0)
                if r.returncode == 0 and os.path.exists(out):
                    return out
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    try:
        from PIL import Image
    except ImportError:
        raise ValueError('turning frames into one moving picture needs FFmpeg (the Rebelle Animator can use it too) or Pillow: '
                         'in a terminal, type  py -m pip install pillow  and try again')
    first = Image.open(paths[0]).convert('RGBA')
    size = (first.width // 2, first.height // 2) if half else first.size
    def frame(pth):
        im = Image.open(pth).convert('RGBA')
        return im.resize(size, Image.LANCZOS) if im.size != size else im
    rest = [frame(pth) for pth in paths[1:]]
    frame_ms = round(1000 / fps)
    (first.resize(size, Image.LANCZOS) if first.size != size else first).save(
        out, save_all=True, append_images=rest, duration=frame_ms, loop=0, quality=85, method=4)
    return out


def main():
    a = sys.argv[1:]
    if a[:1] == ['rebelle-canvas'] and len(a) == 4:      # (open_in's helper)
        rebelle_canvas(int(a[1]), int(a[2]), int(a[3]))
        return
    if len(a) < 2 or a[0] not in ('make', 'open', 'animate', 'wrap'):
        sys.exit(__doc__)
    if a[0] == 'wrap':                                  # wrap <slot> <export name | current> [app]
        try:
            out = wrap(a[1], a[2] if len(a) > 2 else 'current', a[3] if len(a) > 3 else None)
            for k in ('file', 'folder'):
                out[k] = os.path.relpath(out[k], ROOT).replace(os.sep, '/')
        except Exception as e:
            out = {'error': str(e)}
        print(json.dumps(out), flush=True)
        sys.exit(1 if 'error' in out else 0)
    slot, fresh = a[1], '--fresh' in a
    view = a[a.index('--view') + 1] if '--view' in a and a.index('--view') + 1 < len(a) else None
    app = a[2] if a[0] in ('open', 'animate') and len(a) > 2 and not a[2].startswith('--') else None
    try:
        if a[0] == 'animate':
            out = animate(slot, app, fresh=fresh, view=view)
        else:
            out = make(slot, fresh=fresh, view=view, app=app)
            if app:
                size = (out['w'], out['h']) if out.get('w') else psd_size(out['file'])
                out.update(open_in(app, out['file'], size))
        for k in ('file', 'folder'):
            if out.get(k):
                out[k] = os.path.relpath(out[k], ROOT).replace(os.sep, '/')
    except Exception as e:
        out = {'error': str(e)}
    print(json.dumps(out), flush=True)
    sys.exit(1 if 'error' in out else 0)


if __name__ == '__main__':
    main()
