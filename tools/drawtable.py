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

    python tools/drawtable.py make assets/living/bee            make it (or find the one that's there), say where
    python tools/drawtable.py make assets/living/bee --fresh    a fresh one, even if there's one there already
    python tools/drawtable.py open assets/living/bee csp        make it if need be, and open it in Clip Studio
                                                                (csp, ps or rebelle)
    python tools/drawtable.py animate assets/living/bee animator
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
WORKING = ('clip', 'psd', 'psb', 'kra', 'tif', 'tiff')   # (what the programs save their own working files as)
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


def open_in(app, path):
    """open the file in the program. returns {opened: True} or {need: app} (it couldn't find the program)"""
    exe = find_app(app)
    if not exe:
        return {'opened': False, 'need': app, 'name': APPS[app]['name']}
    args = [exe, path]
    if app == 'rebelle':                                # (with the live link on, so the animator can talk to it too)
        port = str(animator_settings().get('websocketPort') or 8265)
        args = [exe] + [x.replace('{port}', port) for x in LINK] + [path]
    if sys.platform == 'darwin':
        subprocess.Popen(['open', '-a', exe, path])
    else:
        flags = DETACHED | NEW_GROUP if sys.platform == 'win32' else 0   # (on its own: closing the content manager won't close it)
        subprocess.Popen(args, creationflags=flags, close_fds=True, cwd=os.path.dirname(path))
    return {'opened': True, 'name': APPS[app]['name'], 'program': exe}


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
    """what's on the table already: the program's own file if you saved one (Clip Studio saves .clip), else the .psd"""
    if not os.path.isdir(folder):
        return None
    have = [os.path.join(folder, n) for n in os.listdir(folder)
            if n.rsplit('.', 1)[-1].lower() in WORKING and not n.startswith(('.', '_'))]
    if app == 'csp':
        clip = [p for p in have if p.lower().endswith('.clip')]
        if clip:
            return max(clip, key=os.path.getmtime)
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
  return { x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
}
'''

# the page builds the layers' pixels and hands them back (as base64), so no picture library is needed here
BUILD = '''
async ([shot, art, W, H, place, artFit]) => {
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
    const im = await load('data:image/png;base64,' + shot);
    g = canvas(); const x = g.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, place[0] * W, place[1] * H, place[2] * W, place[3] * H);
    out.guide = squeeze(g, [3, 0, 1, 2]);
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
  // the flattened picture (only for thumbnails): white, the guide at half strength, then your picture
  const f = canvas(), fx = f.getContext('2d');
  fx.fillStyle = '#fff'; fx.fillRect(0, 0, W, H);
  if (g) { fx.globalAlpha = 0.5; fx.drawImage(g, 0, 0); fx.globalAlpha = 1; }
  if (a) fx.drawImage(a, 0, 0);
  out.flat = squeeze(f, [0, 1, 2], true);
  return out;
}
'''

HIDE_UI = ('.place-tabs, .signpost, .hotbar, .ui-button, .cp, .mc-say, .lives, .bee-talk, .bottle-hint, .tap-hint, '
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
                found['build'] = lambda W, H, art, fit: found['page'].evaluate(
                    BUILD, [base64.b64encode(found['shot']).decode('ascii') if found['shot'] else None,
                            (base + art) if art else None, W, H, found['place'], fit])
                out = then(found)
                found['ctx'].close()
            browser.close()
            return out
    finally:
        server.shutdown()
    return None


def canvas_size(s, box):
    """twice the size it's shown at (or the size it says, doubled), the right shape, never over BIGGEST a side"""
    want = stated_size(s)
    if want:
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
  draw here          an empty layer, on top

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
    if have:
        return {'file': have, 'folder': folder, 'made': False}
    mine = current_file(slot)
    art = os.path.relpath(mine, ROOT).replace(os.sep, '/') if mine else None
    result = {}

    def built(found):                                   # (the scene's open: the canvas's size, and its pixels)
        W, H = canvas_size(s, found['box'])
        result.update(W=W, H=H, px=found['build'](W, H, art, 'fill'), view=found.get('view'))
    if sc and sc.get('map'):
        try:
            look(slot, s, sc, view, built)
        except Exception as e:
            result['why'] = str(e).splitlines()[0]
    if result.get('px'):
        W, H, px = result['W'], result['H'], result['px']
        chans = lambda k: list(zip((-1, 0, 1, 2), (base64.b64decode(x) for x in px[k])))
        layers = []
        if px.get('guide'):
            layers.append({'name': 'guide (hide me before you export)', 'chans': chans('guide'), 'opacity': GUIDE_OPACITY, 'locked': True})
        if px.get('art'):
            layers.append({'name': 'your picture now', 'chans': chans('art')})
        layers.append({'name': 'draw here', 'rgba': None})
        composite = base64.b64decode(px['flat']) if px.get('flat') else None
        guide = bool(px.get('guide'))
    else:
        size = canvas_size(s, None)
        if not size:
            raise ValueError("couldn't tell how big " + slot + " should be: it isn't on any page right now, and its description "
                             "in tools/slots.json doesn't give a size like 800 x 600")
        W, H = size
        layers = [{'name': 'draw here', 'rgba': None}]
        composite, guide = None, False
    os.makedirs(folder, exist_ok=True)               # (only now: a slot it can't size leaves nothing behind)
    path = os.path.join(folder, stem + '.psd')
    write_psd(path, W, H, layers, composite)
    with open(os.path.join(folder, 'what to do.txt'), 'w', encoding='utf-8') as f:
        f.write(NOTE.format(name=stem, slot=slot, w=W, h=H))
    return {'file': path, 'folder': folder, 'w': W, 'h': H, 'guide': guide, 'made': True, 'view': result.get('view')}


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
    if len(a) < 2 or a[0] not in ('make', 'open', 'animate'):
        sys.exit(__doc__)
    slot, fresh = a[1], '--fresh' in a
    view = a[a.index('--view') + 1] if '--view' in a and a.index('--view') + 1 < len(a) else None
    app = a[2] if a[0] in ('open', 'animate') and len(a) > 2 and not a[2].startswith('--') else None
    try:
        if a[0] == 'animate':
            out = animate(slot, app, fresh=fresh, view=view)
        else:
            out = make(slot, fresh=fresh, view=view, app=app)
            if app:
                out.update(open_in(app, out['file']))
        for k in ('file', 'folder'):
            if out.get(k):
                out[k] = os.path.relpath(out[k], ROOT).replace(os.sep, '/')
    except Exception as e:
        out = {'error': str(e)}
    print(json.dumps(out), flush=True)
    sys.exit(1 if 'error' in out else 0)


if __name__ == '__main__':
    main()
