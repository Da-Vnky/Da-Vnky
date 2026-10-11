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


def saved_apps():
    try:
        with open(APPS_FILE, encoding='utf-8') as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def remember_app(app, path):
    """you told it where a program is (the asset manager asks, if it can't find one): kept for next time"""
    if app not in APPS:
        raise ValueError('which program?')
    path = (path or '').strip().strip('"')
    if not path or not os.path.exists(path):
        raise ValueError("there's nothing at " + (path or 'that address') + ': copy the address of the program itself (the .exe)')
    if sys.platform == 'win32' and not path.lower().endswith('.exe'):
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
    if sys.platform == 'darwin':
        subprocess.Popen(['open', '-a', exe, path])
    else:
        flags = 0x00000008 | 0x00000200 if sys.platform == 'win32' else 0   # (on its own: closing the content manager won't close it)
        subprocess.Popen([exe, path], creationflags=flags, close_fds=True, cwd=os.path.dirname(path))
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


def exports(slot):
    """the pictures you've exported onto the table for this slot, newest first"""
    folder, stem, _ = where(slot)
    if not os.path.isdir(folder):
        return []
    out = []
    for n in os.listdir(folder):
        p = os.path.join(folder, n)
        if os.path.isfile(p) and n.rsplit('.', 1)[-1].lower() in EXPORTS and not n.startswith(('.', '_')):
            out.append({'name': n, 'time': int(os.path.getmtime(p)), 'size': os.path.getsize(p)})
    return sorted(out, key=lambda e: -e['time'])


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
        out[slot] = {'working': os.path.basename(w) if w else '', 'exports': exports(slot)}
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


def packbits_row(row):
    """one row of a picture, squeezed the way .psd files do it (runs of the same byte say so once)"""
    out, i, n = bytearray(), 0, len(row)
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
    composite: the flattened picture as rgb bytes (w*h*3), or None for plain white (thumbnails only; the programs
    use the layers)"""
    recs, data = b'', b''
    for L in layers:
        if L.get('rgba'):
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
        if composite:
            planes = [composite[o::3] for o in range(3)]
        else:
            planes = [b'\xff' * (w * h)] * 3
        rows = [p[y * w:(y + 1) * w] for p in planes for y in range(h)]
        packed = [packbits_row(r) for r in rows]
        f.write(struct.pack('>H', 1) + b''.join(struct.pack('>H', len(p)) for p in packed) + b''.join(packed))


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
  const b64 = c => { const d = c.getContext('2d').getImageData(0, 0, W, H).data; let s = '';
    for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); return btoa(s); };
  const out = {};
  let g = null, a = null;
  if (shot) {
    const im = await load('data:image/png;base64,' + shot);
    g = canvas(); const x = g.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, place[0] * W, place[1] * H, place[2] * W, place[3] * H);
    out.guide = b64(g);
  }
  if (art) {
    const im = await load(art);
    a = canvas(); const x = a.getContext('2d');
    x.imageSmoothingQuality = 'high';
    const iw = im.naturalWidth || W, ih = im.naturalHeight || H;
    if (artFit === 'fill' || Math.abs(iw / ih - W / H) < 0.02 * W / H) x.drawImage(im, 0, 0, W, H);
    else { const s = Math.min(W / iw, H / ih); x.drawImage(im, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); }
    out.art = b64(a);
  }
  // the flattened picture (only for thumbnails): white, the guide at half strength, then your picture
  const f = canvas(), fx = f.getContext('2d');
  fx.fillStyle = '#fff'; fx.fillRect(0, 0, W, H);
  if (g) { fx.globalAlpha = 0.5; fx.drawImage(g, 0, 0); fx.globalAlpha = 1; }
  if (a) fx.drawImage(a, 0, 0);
  out.flat = b64(f);
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
'''


def make(slot, fresh=False, view=None, app=None):
    """make the starting file (unless there's one already). → { file, folder, w, h, guide, made, view }"""
    folder, stem, _ = where(slot)
    s, sc, _ = described(slot)
    have = None if fresh else working_file(folder, stem, app)
    if have:
        return {'file': have, 'folder': folder, 'made': False}
    os.makedirs(folder, exist_ok=True)
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
        dec = lambda k: base64.b64decode(px[k]) if px.get(k) else None
        layers = []
        if px.get('guide'):
            layers.append({'name': 'guide (hide me before you export)', 'rgba': dec('guide'), 'opacity': GUIDE_OPACITY, 'locked': True})
        if px.get('art'):
            layers.append({'name': 'your picture now', 'rgba': dec('art')})
        layers.append({'name': 'draw here', 'rgba': None})
        flat = dec('flat')
        composite = bytes(b for i, b in enumerate(flat) if i % 4 != 3) if flat else None
        guide = bool(px.get('guide'))
    else:
        size = canvas_size(s, None)
        if not size:
            raise ValueError("couldn't tell how big " + slot + " should be: it isn't on any page right now, and its description "
                             "in tools/slots.json doesn't give a size like 800 x 600")
        W, H = size
        layers = [{'name': 'draw here', 'rgba': None}]
        composite, guide = None, False
    path = os.path.join(folder, stem + '.psd')
    write_psd(path, W, H, layers, composite)
    with open(os.path.join(folder, 'what to do.txt'), 'w', encoding='utf-8') as f:
        f.write(NOTE.format(name=stem, slot=slot, w=W, h=H))
    return {'file': path, 'folder': folder, 'w': W, 'h': H, 'guide': guide, 'made': True, 'view': result.get('view')}


def main():
    a = sys.argv[1:]
    if len(a) < 2 or a[0] not in ('make', 'open'):
        sys.exit(__doc__)
    slot, fresh = a[1], '--fresh' in a
    view = a[a.index('--view') + 1] if '--view' in a and a.index('--view') + 1 < len(a) else None
    app = a[2] if a[0] == 'open' and len(a) > 2 and not a[2].startswith('--') else None
    try:
        out = make(slot, fresh=fresh, view=view, app=app)
        out['file'] = os.path.relpath(out['file'], ROOT).replace(os.sep, '/')
        out['folder'] = os.path.relpath(out['folder'], ROOT).replace(os.sep, '/')
        if app:
            out.update(open_in(app, os.path.join(ROOT, out['file'])))
    except Exception as e:
        out = {'error': str(e)}
    print(json.dumps(out), flush=True)
    sys.exit(1 if 'error' in out else 0)


if __name__ == '__main__':
    main()
