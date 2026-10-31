#!/usr/bin/env python3
r"""
scenes.py — a whole scene of the site in Blender, layer by layer, and its post-processing back to the site.

The asset manager's buttons at the top of a scene's tab ("the sea", "the living space"…) run this through the content
manager:

  open this scene in Blender   python tools/scenes.py open <scene> [--view <name>] [--fresh]
      Opens the scene's page the way the asset manager's map does (1920 x 1080, midday, nothing kept, the buttons hidden),
      finds every slot showing on it (this scene's, and other tabs' like the traveller and the sun), and the page's own
      pieces that aren't slots (a letter, words), puts them all in the order the page paints them (CSS's stacking
      contexts), and photographs each one on its own, see-through round it (the page's own filter on it off: the depth
      of field is Blender's now), cut down to what it paints (shadows that spill past its box included). A slot that
      holds others (the living space's wall is the whole room) and lays a ::before / ::after over them is two layers: its
      own, and "(over)" where that goes. What's left (the backgrounds behind it all) is the backdrop.
      tools/blender/scene_set.py then builds a Blender set of them: a camera with a real lens, each layer a flat picture
      at its own distance (the furthest back furthest away), sized so the camera sees it exactly where it is on the page
      (slide one nearer or further and it keeps its place: its "keeps its place" modifier), one collection each.
      Kept in tools/drawing/_scenes/<scene>/ (never published): <scene>.blend, layers/, layers.json, the-whole-page.png
      (the page as it was, to check against). Pressing the button again opens your .blend as you left it ("a fresh copy"
      makes it again from the page as it is now; the old one is kept beside it, renamed).

  post-processing → site       python tools/scenes.py post <scene>
      tools/blender/scene_post.py, run in Blender on your saved .blend, reads what you did (the camera's depth of field,
      the World's fog, the "post" collection, the compositor, layers moved or lit) and leaves in <scene>/post/:
      post-<scene>.json (what the site does live: sky/postfx.js), post-<scene>-1.webp … (light, mist, glow), and pictures
      baked for the slots' cards (onto the drawing table, <name>-blender-post.png, "use this"). The content manager
      then puts the json and the pictures into the scene's own folder (assets/sea/post-sea.json …: content.py scene_put).

Needs Playwright (as the template pictures and the drawing table do) and Blender (found as the drawing table finds it).
"""

import base64, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import drawtable as dt                                 # (where Blender is, the drawing table's folders and pictures)

SCENES = os.path.join(dt.TABLE, '_scenes')             # (tools/drawing/: gitignored, nothing in it is published)
SCENE_SET = os.path.join(HERE, 'blender', 'scene_set.py')
SCENE_POST = os.path.join(HERE, 'blender', 'scene_post.py')
NO_POST = ('skizy-room',)                              # (skizy's room is hers: the site's post-processing isn't loaded there)
W, H, SCALE = 1920, 1080, 2

# in the page: every slot of the scene that's showing, in the order the page paints them (back to front)
GATHER = r'''
([slots, ui]) => {
  const want = new Set(slots), byName = {}, els = [];
  // the site's buttons and notes (hidden for the photographs, as the drawing table hides them): kept hidden on every layer
  document.querySelectorAll(ui).forEach(e => e.classList.add('dav-ui'));
  document.querySelectorAll('[data-asset], [data-slot], [data-art]').forEach(el => {
    const names = DavMap.names(el);
    const slot = names.find(n => want.has(n)) || names[0];    // (other scenes' slots too: the traveller, the sky…)
    if (!slot) return;
    const r = el.getBoundingClientRect();
    const vis = Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left)) * Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top));
    if (vis < 9) return;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.display === 'none' || +c.opacity < 0.04) return;
    }
    if (getComputedStyle(el).visibility === 'hidden') return;
    (byName[slot] = byName[slot] || []).push(el);
    els.push(el);
  });
  // the painting order (CSS's stacking contexts, near enough): -1 if a is painted before b
  const cs = e => getComputedStyle(e);
  const isCtx = e => {
    if (e === document.documentElement) return true;
    const c = cs(e), pos = c.position;
    if ((pos === 'absolute' || pos === 'relative') && c.zIndex !== 'auto') return true;
    if (pos === 'fixed' || pos === 'sticky') return true;
    if (+c.opacity < 1 || c.transform !== 'none' || c.translate !== 'none' || c.rotate !== 'none' || c.scale !== 'none') return true;
    if (c.filter !== 'none' || (c.backdropFilter || 'none') !== 'none' || c.mixBlendMode !== 'normal' || c.isolation === 'isolate') return true;
    if (c.clipPath !== 'none' || (c.maskImage || 'none') !== 'none' || (c.webkitMaskImage || 'none') !== 'none') return true;
    if (/transform|opacity|filter|translate|scale|rotate/.test(c.willChange) || /paint|strict|content/.test(c.contain)) return true;
    const p = e.parentElement && cs(e.parentElement).display;
    return !!(p && /flex|grid/.test(p) && c.zIndex !== 'auto');
  };
  const chain = e => { const a = []; for (; e; e = e.parentElement) a.unshift(e); return a; };
  const positioned = e => cs(e).position !== 'static';
  const level = p => {
    if (!p) return [1, 0];
    const z = cs(p).zIndex, zi = z === 'auto' ? 0 : +z;
    return zi < 0 ? [0, zi] : zi === 0 ? [2, 0] : [3, zi];
  };
  const dom = (a, b) => a === b ? 0 : (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  // a slot that holds others (the living space's wall is the whole room; the dungeon's) paints its own background under
  // what's inside it, but a ::before / ::after with a z-index can be laid over it (the room's wallpaper texture over the
  // window, the dungeon's darkness over its furniture): then that's a layer of its own, "(over)", in its place in the stack.
  // (whether a pseudo paints anything: a colour that isn't see-through, or a picture. the bathroom's dusk shade, z-index 4
  // over everything, is see-through at midday)
  const seen = col => { const m = /rgba?\(([^)]*)\)/.exec(col); if (!m) return false; const v = m[1].split(/[,\s\/]+/).filter(Boolean); return v.length < 4 || +v[3] > 0.01; };
  const paints = c => seen(c.backgroundColor) || /url\(/.test(c.backgroundImage) ||
    (c.backgroundImage.match(/rgba?\([^)]*\)/g) || []).some(seen) || (c.boxShadow !== 'none' && seen(c.boxShadow));
  const overs = x => {                                   // -> [{ which: 'before'|'after', lv }] the pseudos over its contents
    const out = [];
    ['before', 'after'].forEach(w => {
      const c = getComputedStyle(x, '::' + w);
      if (c.content === 'none' || c.display === 'none' || c.position === 'static' || !paints(c)) return;
      const z = c.zIndex === 'auto' ? 0 : +c.zIndex;
      if (z > 0) out.push({ which: w, lv: [3, z] });
    });
    return out;
  };
  const above = (lv, x, y) => {                          // is a pseudo of x at level lv painted over y (inside x)?
    let c = y; while (c.parentElement !== x) c = c.parentElement;
    const lc = positioned(c) ? level(c) : [1, 0];
    return lv[0] > lc[0] || (lv[0] === lc[0] && lv[1] > lc[1]);
  };
  const before = (x, y) => {
    if (x === y) return 0;
    if (x.contains(y)) return -1;
    if (y.contains(x)) return 1;
    const A = chain(x), B = chain(y);
    let c = 0;
    for (let guard = 0; guard < 60; guard++) {
      const part = C => { for (let k = c + 1; k < C.length; k++) if (isCtx(C[k]) || positioned(C[k])) return C[k]; return null; };
      const pa = part(A), pb = part(B);
      if (pa && pa === pb) { if (isCtx(pa)) { c = A.indexOf(pa); continue; } return dom(x, y); }
      if (!pa && !pb) return dom(x, y);
      const la = level(pa), lb = level(pb);
      if (la[0] !== lb[0]) return la[0] - lb[0];
      if (la[1] !== lb[1]) return la[1] - lb[1];
      return dom(pa || x, pb || y);
    }
    return dom(x, y);
  };
  // the layers: a slot's pieces, and for a slot that holds others and lays something over them, its "(over)" part
  const all = Object.values(byName).flat();
  const entries = [];
  Object.keys(byName).forEach(slot => {
    const list = byName[slot].slice().sort(before);
    const holds = list.length === 1 && all.some(e => e !== list[0] && list[0].contains(e));
    const ov = holds ? overs(list[0]) : [];
    entries.push({ slot, els: list, first: list[0], holds, hide: ov.map(o => o.which) });
    if (ov.length) entries.push({ slot, els: list, first: list[0], over: ov, show: ov.map(o => o.which), hide: ['before', 'after'].filter(w => !ov.some(o => o.which === w)) });
  });
  const lvOf = e => e.over.reduce((m, o) => (o.lv[1] > m[1] ? o.lv : m), [0, -1e9]);
  const cmp = (a, b) => {
    const x = a.first, y = b.first;
    if (x === y) return (a.over ? 1 : 0) - (b.over ? 1 : 0);
    if (x.contains(y)) return a.over ? (above(lvOf(a), x, y) ? 1 : -1) : -1;
    if (y.contains(x)) return b.over ? (above(lvOf(b), y, x) ? -1 : 1) : 1;
    return before(x, y);
  };
  // the page's own things that aren't any slot (a letter, the words on a page, a drawn bit with no slot) sit in the stack
  // too: each whole piece of the page that holds no slot is put in its place, and pieces next to each other in the order
  // become one layer, "the page itself". (what's left, the backgrounds of what holds the slots, is the backdrop)
  const holdsLayer = e => all.some(x => e !== x && e.contains(x));
  const isLayer = new Set(all);
  const skip = /^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT|TITLE|HEAD)$/;
  const walk = el => {
    for (const c of el.children) {
      if (isLayer.has(c) || skip.test(c.tagName) || c.classList.contains('dav-ui')) continue;
      if (holdsLayer(c)) { walk(c); continue; }
      const st = getComputedStyle(c), r = c.getBoundingClientRect();
      if (st.display === 'none' || r.width * r.height < 1) continue;
      let gone = false;
      for (let a = c; a && a.nodeType === 1; a = a.parentElement) { const q = getComputedStyle(a); if (q.display === 'none' || +q.opacity < 0.04) { gone = true; break; } }
      if (!gone) entries.push({ slot: '', page: true, els: [c], first: c });
    }
  };
  walk(document.body);
  entries.sort(cmp);
  for (let k = entries.length - 1; k > 0; k--) {         // (the page's pieces next to each other: one layer)
    if (entries[k].page && entries[k - 1].page) { entries[k - 1].els = entries[k - 1].els.concat(entries[k].els); entries.splice(k, 1); }
  }
  window.__davLayers = entries;
  // where the slot's own picture is drawn inside its box (an <img>'s object-fit and object-position), so a Blender scene
  // rendered as that picture can be laid exactly over it
  const drawn = el => {
    const im = el.tagName === 'IMG' ? el : el.querySelector(':scope > img');
    if (!im || !im.naturalWidth) return null;
    const r = im.getBoundingClientRect(), c = getComputedStyle(im), nw = im.naturalWidth, nh = im.naturalHeight;
    let w = r.width, h = r.height;
    const fit = c.objectFit;
    if (fit === 'contain' || fit === 'scale-down') { const k = Math.min(r.width / nw, r.height / nh, fit === 'scale-down' ? 1 : 1e9); w = nw * k; h = nh * k; }
    else if (fit === 'cover') { const k = Math.max(r.width / nw, r.height / nh); w = nw * k; h = nh * k; }
    else if (fit === 'none') { w = nw; h = nh; }
    const pos = (c.objectPosition || '50% 50%').split(' ');
    const at = (v, free) => /%$/.test(v) ? free * parseFloat(v) / 100 : /px$/.test(v) ? parseFloat(v) : free / 2;
    return { x: r.left + at(pos[0], r.width - w), y: r.top + at(pos[1] || '50%', r.height - h), w, h, nw, nh };
  };
  // each layer's place: the box round all its pieces, as it is, and as much of it as is on the screen
  return entries.map((o, i) => {
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    o.els.forEach(e => { const q = e.getBoundingClientRect(); l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
    o.els.forEach(e => e.classList.add('dav-layer'));
    return { slot: o.slot, over: !!o.over, page: !!o.page, holds: !!o.holds, drawn: o.over || o.page ? null : drawn(o.first), mine: want.has(o.slot), pieces: o.els.length, box: { x: l, y: t, w: r - l, h: b - t },
             seen: { x: Math.max(0, l), y: Math.max(0, t), w: Math.min(innerWidth, r) - Math.max(0, l), h: Math.min(innerHeight, b) - Math.max(0, t) } };
  });
}
'''

# showing one layer on its own (see-through round it), or everything but the scene's layers (the backdrop)
SOLO_CSS = '''
html.dav-solo-on, html.dav-solo-on body { background: transparent !important; }
html.dav-solo-on * { visibility: hidden !important; }
html.dav-solo-on .dav-solo, html.dav-solo-on .dav-solo * { visibility: visible !important; }
html.dav-solo-on .dav-solo .dav-layer:not(.dav-solo), html.dav-solo-on .dav-solo .dav-layer:not(.dav-solo) * { visibility: hidden !important; }
html.dav-solo-on .dav-solo { filter: none !important; }
html.dav-solo-on .dav-solo.dav-over { background: none !important; border-color: transparent !important; box-shadow: none !important; }
html.dav-solo-on .dav-solo.dav-over * { visibility: hidden !important; }
.dav-no-before::before, .dav-no-after::after { visibility: hidden !important; }
html.dav-rest-on .dav-layer, html.dav-rest-on .dav-layer * { visibility: hidden !important; }
html.dav-solo-on .dav-ui, html.dav-solo-on .dav-ui * { visibility: hidden !important; }
'''
SOLO = '''(i) => {
  const H = document.documentElement;
  H.classList.remove('dav-rest-on');
  H.classList.toggle('dav-solo-on', i !== null && i !== 'rest');
  document.querySelectorAll('.dav-solo, .dav-over, .dav-no-before, .dav-no-after').forEach(e => e.classList.remove('dav-solo', 'dav-over', 'dav-no-before', 'dav-no-after'));
  if (i === 'rest') { H.classList.add('dav-rest-on'); return; }
  if (i === null) return;
  const L = window.__davLayers[i];
  L.els.forEach(e => {
    e.classList.add('dav-solo');
    if (L.over) e.classList.add('dav-over');
    (L.hide || []).forEach(w => e.classList.add('dav-no-' + w));
  });
}'''
# nothing moves while it's photographed: every frame loop stops, and every CSS animation is held
FREEZE = '''() => { window.requestAnimationFrame = () => 0; document.getAnimations().forEach(a => { try { a.pause(); } catch (e) {} }); }'''


def read_json(path, default=None):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def note(text):
    """how far it's got (the asset manager shows the last one while it works)"""
    print(text, file=sys.stderr, flush=True)


def scene_of(scene_id):
    with open(os.path.join(HERE, 'slots.json'), encoding='utf-8') as f:
        cat = json.load(f)
    for sc in cat.get('scenes') or []:
        if sc.get('id') == scene_id:
            return sc
    raise ValueError('no scene called ' + scene_id)


def folder_of(scene_id):
    if not re.match(r'^[a-z0-9-]+$', scene_id or ''):
        raise ValueError('which scene?')
    return os.path.join(SCENES, scene_id)


def short(slot):
    return slot.replace('assets/', '').replace('/', '-')


def trimmed(png, path):
    """a layer's picture (the whole screen, see-through round it), cut down to what's painted on it: its shadows and
    whatever spills past its box included (the living space's window paints the wall's colour as a shadow 300 screens
    wide). -> where it is, in the page's pixels, or None if nothing of it showed"""
    try:
        from PIL import Image
    except ImportError:                                # (no Pillow: the whole screen, see-through round it)
        with open(path, 'wb') as f:
            f.write(png)
        return {'x': 0, 'y': 0, 'w': W, 'h': H}
    import io
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    bb = im.getchannel('A').point(lambda a: 255 if a > 2 else 0).getbbox()
    if not bb:
        return None
    im.crop(bb).save(path, optimize=False, compress_level=6)
    return {'x': bb[0] / SCALE, 'y': bb[1] / SCALE, 'w': (bb[2] - bb[0]) / SCALE, 'h': (bb[3] - bb[1]) / SCALE}


def gather(sc, view_name, out):
    """photograph the scene, layer by layer, into out/layers/. -> the layers, back to front"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise ValueError(dt.NO_PLAYWRIGHT)
    from smoke import serve
    from templates import NOON, page_url
    slots = [s['slot'] for g in sc.get('groups') or [] for s in g.get('slots') or [] if (s.get('kind') or 'image') == 'image']
    view = next((v for v in (sc['map'].get('views') or []) if v.get('name') == view_name), None) if view_name else None
    server, base = serve()
    server.handle_error = lambda *a: None
    layers = []
    shots = os.path.join(out, 'layers')
    os.makedirs(shots, exist_ok=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            ctx = browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=SCALE, timezone_id='UTC')
            ctx.add_init_script(NOON)
            ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
            page = ctx.new_page()
            note('opening ' + sc['map']['page'] + (' (' + view['name'] + ')' if view else '') + ' in a hidden browser')
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
            page.add_style_tag(content=dt.HIDE_UI + SOLO_CSS)
            page.evaluate(FREEZE)
            time.sleep(.3)
            layers = page.evaluate(GATHER, [slots, dt.HIDE_UI.split('{')[0].strip()])
            if not layers:
                raise ValueError('none of this scene\'s slots are showing on its page' + (' in that view' if view else ''))
            page.screenshot(path=os.path.join(out, 'the-whole-page.png'))      # (to check the layers against)
            for i, L in enumerate(layers):
                note('photographing the layers: ' + str(i + 1) + ' of ' + str(len(layers)) + ' (' + (L['slot'].replace('assets/', '') or 'the page itself') + ')')
                page.evaluate(SOLO, i)
                if L.get('page'):
                    L['name'] = 'the page itself (%d)' % (i + 1)
                L['file'] = 'layers/%02d-%s%s.png' % (i + 1, short(L['slot']) or 'the-page-itself', '-over' if L.get('over') else '')
                L['at'] = trimmed(page.screenshot(omit_background=True), os.path.join(out, L['file']))
            page.evaluate(SOLO, 'rest')
            rest_at = trimmed(page.screenshot(omit_background=True), os.path.join(out, 'layers', '00-the-rest-of-the-page.png'))
            ctx.close()
            browser.close()
    finally:
        server.shutdown()
    rest = {'slot': '', 'name': 'the rest of the page', 'file': 'layers/00-the-rest-of-the-page.png', 'backdrop': True, 'at': rest_at}
    return [rest] + [L for L in layers if L.get('at')]


def open_scene(scene_id, view=None, fresh=False):
    sc = scene_of(scene_id)
    if not sc.get('map'):
        raise ValueError(sc.get('name', scene_id) + " isn't on a page of its own (no map), so there's no scene to open")
    out = folder_of(scene_id)
    blend = os.path.join(out, scene_id + '.blend')
    exe = dt.find_app('blender')
    if not exe:
        return {'opened': False, 'need': 'blender', 'name': dt.APPS['blender']['name']}
    if os.path.exists(blend) and not fresh:
        r = dt.open_in('blender', blend)
        r.update(file=blend, made=False)
        return r
    os.makedirs(out, exist_ok=True)
    if os.path.exists(blend):                          # (a fresh copy: the old one kept, out of the way)
        os.replace(blend, os.path.join(out, '_' + scene_id + time.strftime('-%Y%m%d-%H%M%S') + '.blend'))
    layers = gather(sc, view, out)
    # a slot with a Blender scene of its own on the drawing table comes in as that (if it has something 3D in it), unless
    # it's been set to stay flat ("flat.json": the asset manager's ticks)
    flat = set(read_json(os.path.join(out, 'flat.json'), []))
    for L in layers:
        if L.get('mine') and not L.get('over') and L.get('slot') and L['slot'] not in flat:
            try:
                tf, ts, _ = dt.where(L['slot'])
            except Exception:
                continue
            b = os.path.join(tf, ts + '.blend')
            if os.path.exists(b):
                L['blend'] = b
    info = {'scene': scene_id, 'name': sc.get('name'), 'page': sc['map']['page'], 'view': view, 'w': W, 'h': H, 'scale': SCALE,
            'made': time.strftime('%Y-%m-%d %H:%M'), 'layers': layers}
    with open(os.path.join(out, 'layers.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, indent=1)
    note('building the Blender scene (' + str(len(layers) - 1) + ' layers)')
    args = [dt.blender_run(exe), '-b', '--python', SCENE_SET, '--', '--layers', os.path.join(out, 'layers.json'), '--out', blend]
    try:
        r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=dt.BLENDER_WAIT, stdin=subprocess.DEVNULL,
                           encoding='utf-8', errors='replace')
    except subprocess.TimeoutExpired:
        raise ValueError('Blender took more than ' + str(dt.BLENDER_WAIT) + ' seconds to make the scene, so it was stopped')
    if not os.path.exists(blend) or '{"made"' not in (r.stdout or ''):
        raise ValueError("Blender couldn't make the scene: " + blender_why(r))
    three = []
    for x in (r.stdout or '').splitlines():
        if x.strip().startswith('{"made"'):
            three = json.loads(x).get('three') or []
    info['three'] = three
    with open(os.path.join(out, 'layers.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, indent=1)
    res = dt.open_in('blender', blend)
    res.update(file=blend, made=True, three=three, layers=sum(1 for L in layers[1:] if L.get('mine')),
               others=sum(1 for L in layers[1:] if not L.get('mine') and not L.get('page')),
               pieces=sum(1 for L in layers[1:] if L.get('page')),
               cut=[L['slot'] for L in layers[1:] if L.get('mine') and not L.get('over') and
                    (L['box']['w'] - L['seen']['w'] > 2 or L['box']['h'] - L['seen']['h'] > 2)])
    return res


def real_in_use(slot):
    """the slot's picture on the site is a 3D render from post-processing (its card's "use this" on <name>-blender-3d.png),
    which has the depth of field and fog in it already"""
    try:
        tf, _, _ = dt.where(slot)
    except Exception:
        return False
    used = read_json(os.path.join(tf, '.used.json'), {}) or {}
    last = max(used.items(), key=lambda kv: kv[1])[0] if used else ''
    return last.endswith('-blender-3d.png')


def blender_why(r):
    """the last thing Blender said that sounds like the reason (a Python error's last line first)"""
    for text in (r.stderr or '', r.stdout or ''):
        lines = [x.strip() for x in text.splitlines() if x.strip() and 'EGL' not in x]
        errs = [x for x in lines if re.match(r'^\w*(Error|Exception)\b', x)]
        if errs:
            return errs[-1]
    lines = [x.strip() for x in ((r.stderr or '') + '\n' + (r.stdout or '')).splitlines() if x.strip() and 'EGL' not in x]
    return lines[-1] if lines else 'no reason given'


def home_folder(sc):
    """the assets folder a scene's post-processing lives in on the site (its pictures' own folder: assets/sea/…)"""
    import collections
    n = collections.Counter(s['slot'].split('/')[1] for g in sc.get('groups') or [] for s in g.get('slots') or []
                            if s['slot'].startswith('assets/') and s['slot'].split('/')[1] not in ('resets', 'sounds', 'fonts', 'ui'))
    return n.most_common(1)[0][0] if n else 'sky'


def post_scene(scene_id):
    """the scene's .blend, as last saved -> what the site does live (post-<scene>.json: each layer's blur and haze, bokeh),
    the light / mist / glow pictures, and baked pictures for the slots' cards. -> what's made (the content manager puts
    the site's part in place: content.py scene_put)"""
    sc = scene_of(scene_id)
    if scene_id in NO_POST:
        raise ValueError(sc.get('name', scene_id) + " is skizy's: the site's post-processing isn't loaded in her room")
    out = folder_of(scene_id)
    blend = os.path.join(out, scene_id + '.blend')
    info_path = os.path.join(out, 'layers.json')
    if not os.path.exists(blend) or not os.path.exists(info_path):
        raise ValueError('open the scene in Blender first (the button beside this one)')
    exe = dt.find_app('blender')
    if not exe:
        return {'need': 'blender', 'name': dt.APPS['blender']['name']}
    info = json.load(open(info_path, encoding='utf-8'))
    work = os.path.join(out, 'post-making')
    if os.path.isdir(work):
        import shutil
        shutil.rmtree(work)
    note('rendering in Blender: each layer\'s focus and fog, the light and mist, and what needs baking')
    args = [dt.blender_run(exe), '-b', blend, '--python', SCENE_POST, '--', '--info', info_path, '--out', work]
    try:
        r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=dt.BLENDER_WAIT * 4, stdin=subprocess.DEVNULL,
                           encoding='utf-8', errors='replace')
    except subprocess.TimeoutExpired:
        raise ValueError('Blender took more than ' + str(dt.BLENDER_WAIT * 4) + ' seconds, so it was stopped')
    made = os.path.join(work, 'post-blender.json')
    if not os.path.exists(made) or '{"posted"' not in (r.stdout or ''):
        raise ValueError("Blender couldn't do the post-processing: " + blender_why(r))
    got = json.load(open(made, encoding='utf-8'))
    folder = home_folder(sc)
    stem = 'post-' + scene_id
    note('getting it ready for the site')
    # the light, mist and glow: at the page's own size (1920 x 1080: they're soft), WebP when Pillow's here
    overlays = []
    for i, o in enumerate(got['overlays']):
        src = os.path.join(work, o['file'])
        name = '%s-%d' % (stem, i + 1)
        dst = os.path.join(work, name + '.png')
        try:
            from PIL import Image
            im = Image.open(src).convert('RGBA').resize((W, H), Image.LANCZOS)
            dst = os.path.join(work, name + '.webp')
            im.save(dst, 'WEBP', quality=88, alpha_quality=90, method=6)
        except ImportError:
            os.replace(src, dst)
        overlays.append({'slot': 'assets/' + folder + '/' + name, 'file': os.path.basename(dst), 'name': o['name'],
                         'blend': o.get('blend', 'normal')})
    # what the site does with them (post-<scene>.json)
    holds = {L['slot'] for L in info['layers'] if L.get('holds')}
    site = {'scene': scene_id, 'page': sc['map']['page'], 'made': time.strftime('%Y-%m-%d %H:%M'), 'w': W, 'h': H,
            'fog': got['fog']['colour'] if got['fog']['density'] > 0 else None,
            'slots': {}, 'overlays': [{'slot': o['slot'], 'name': o['name'], 'blend': o['blend']} for o in overlays],
            'bokeh': got['bokeh'],
            'mine': sorted({L['slot'] for L in info['layers'] if L.get('mine') and L.get('slot')})}
    # the page's own hand-made blur (the rock's): off while Blender's depth of field is on, unless the asset manager's tick
    # says otherwise (settings.json "ownBlur": true / false)
    own = read_json(os.path.join(out, 'settings.json'), {}).get('ownBlur')
    site['ownBlur'] = (not got['dof']['on']) if own is None else bool(own)
    skipped = []
    for slot, e in got['slots'].items():
        own = e.get('self') or {}
        if slot in holds:                              # (blurring the room would blur everything in it)
            if own.get('blur') or own.get('haze'):
                skipped.append(slot)
            continue
        if own.get('hidden'):
            site['slots'][slot] = {'hidden': True}
        elif own.get('blur', 0) > 0.05 or own.get('haze', 0) > 0.002:
            site['slots'][slot] = {k: own[k] for k in ('blur', 'haze') if own.get(k)}
    for slot in list(site['slots']) + [b['slot'] for b in got['baked'] if b.get('real')]:
        if real_in_use(slot):                          # (its picture is a 3D render with the focus and fog in it already)
            site['slots'][slot] = {'baked': True}
    # the toy camera (25 Oct): the camera's lens, focus and settings, and how far away each picture is (not one that holds
    # the rest of the room: sliding it would slide everything in it)
    if got.get('camera'):
        site['camera'] = got['camera']
        site['depths'] = {k: v for k, v in got.get('depths', {}).items() if k not in holds}
    with open(os.path.join(work, stem + '.json'), 'w', encoding='utf-8') as f:
        json.dump(site, f, indent=1)
    # the baked pictures: onto each slot's drawing table, where its card shows them with "use this"
    baked = []
    for b in got['baked']:
        tfolder, tstem, _ = dt.where(b['slot'])
        os.makedirs(tfolder, exist_ok=True)
        name = tstem + ('-blender-3d.png' if b.get('real') else '-blender-post.png')
        import shutil
        shutil.copyfile(os.path.join(work, b['file']), os.path.join(tfolder, name))
        baked.append({'slot': b['slot'], 'name': name, 'why': b['why'], 'cut': b.get('cut'), 'time': int(time.time()),
                      'real': bool(b.get('real'))})
    keep = os.path.join(out, 'post')
    if os.path.isdir(keep):
        import shutil
        shutil.rmtree(keep)
    os.replace(work, keep)
    live = len(site['slots'])
    summary = []
    if got['dof']['on']:
        summary.append('depth of field (F/%g, focus %.1f away): %d layers blurred' % (got['dof']['fstop'], got['dof']['focus'],
                                                                                     sum(1 for x in site['slots'].values() if x.get('blur'))))
    if site['fog']:
        summary.append('fog: %d layers hazed' % sum(1 for x in site['slots'].values() if x.get('haze')))
    if overlays:
        summary.append('%d light/mist/glow picture%s' % (len(overlays), '' if len(overlays) == 1 else 's'))
    if site['bokeh']:
        summary.append('%d bokeh light%s' % (len(site['bokeh']), '' if len(site['bokeh']) == 1 else 's'))
    if baked:
        summary.append('%d picture%s baked for the cards' % (len(baked), '' if len(baked) == 1 else 's'))
    toy = (site.get('camera') or {}).get('toy') or {}
    if toy.get('on'):
        bits = [w for w, k in (('slides', 'move'), ('sways', 'handheld'), ('vignette', 'vignette'), ('grain', 'grain'),
                               ('warmth', 'warmth'), ('punch', 'punch'), ('rack focus', 'rack')) if toy.get(k)]
        bits.append('sharp: ' + (toy.get('keep') or 'the traveller, ship, dock and city'))
        summary.append('toy camera: ' + (', '.join(bits) or 'on, everything at 0') + ' (%d layers)' % len(site.get('depths', {})))
    elif site.get('camera'):
        summary.append("toy camera: off (the camera's \"toy camera\" property)")
    if skipped:
        summary.append('not blurred live (they hold the rest of the room): ' + ', '.join(x.replace('assets/', '') for x in skipped))
    post_info = {'made': site['made'], 'summary': '; '.join(summary) or 'nothing to do: no depth of field, fog, post collection or changes',
                 'folder': folder, 'json': {'slot': 'assets/' + folder + '/' + stem, 'file': stem + '.json'},
                 'overlays': overlays, 'slots': baked, 'live': live, 'onSite': False}
    with open(os.path.join(keep, 'post.json'), 'w', encoding='utf-8') as f:
        json.dump(post_info, f, indent=1)
    return {'posted': True, 'summary': post_info['summary'], 'baked': len(baked), 'overlays': len(overlays), 'live': live,
            'empty': not (live or overlays or site['bokeh'])}


def main():
    a = sys.argv[1:]
    if len(a) < 2 or a[0] not in ('open', 'post'):
        sys.exit(__doc__)
    view = a[a.index('--view') + 1] if '--view' in a and a.index('--view') + 1 < len(a) else None
    try:
        if a[0] == 'open':
            out = open_scene(a[1], view, '--fresh' in a)
        else:
            out = post_scene(a[1])
        for k in ('file', 'folder'):
            if out.get(k):
                out[k] = os.path.relpath(out[k], ROOT).replace(os.sep, '/')
    except Exception as e:
        out = {'error': str(e)}
    print(json.dumps(out), flush=True)
    sys.exit(1 if 'error' in out else 0)


if __name__ == '__main__':
    main()
