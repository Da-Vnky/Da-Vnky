# templates.py: the template pictures, for your art program. One for each scene (and for each state a scene can be
# put in, like the kitchen with the fridge open): the scene as a visitor sees it (reset 1, midday, on a 1920 x 1080
# screen) with every slot outlined and named, and its size there in pixels. And the same outlines on their own, on a
# see-through picture, to lay over your own painting as a guide.
#
#     python tools/templates.py              every scene
#     python tools/templates.py kitchen      just the scenes whose name has this in it (the asset manager's tabs:
#                                            sea, workshop, city, living, kitchen, porch …)
#
# They go in tools/templates/ (<scene>.png and <scene>-outlines.png; a state adds its name: kitchen-the-fridge-open.png).
# That folder stays on your computer: it's never published. The asset manager's "make the template pictures" button
# runs this, and each scene's map has the links to download them. Which page each scene is, and its states: the
# "map" of each scene in tools/slots.json. Where the slots are: tools/map.js (the same as the asset manager's map).
#
# Needs Playwright, once:   pip install playwright   then   python -m playwright install chromium
# It only reads the site; the only files it writes are the pictures.

import json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'templates')
sys.path.insert(0, HERE)
from smoke import serve                                     # (the same little web server the smoke test uses)

W, H = 1920, 1080
# the same moment every time: midday (UTC, on a browser set to UTC), so the sky's bright and the rooms are lit
NOON = '''
(() => {
  const RealDate = Date, T = Date.UTC(2026, 8, 26, 12, 0, 0);
  const t0 = RealDate.now();
  class Noon extends RealDate {
    constructor(...a) { a.length ? super(...a) : super(T + (RealDate.now() - t0)); }
    static now() { return T + (RealDate.now() - t0); }
  }
  window.Date = Noon;
  try { localStorage.setItem('room_knocked', '1'); } catch (e) {}
})();
'''


def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', (t or '').lower()).strip('-')


def page_url(base, page):
    m = re.match(r'^([^?#]*)(\?[^#]*)?(#.*)?$', page)
    return base + m.group(1) + ((m.group(2) + '&') if m.group(2) else '?') + 'map' + (m.group(3) or '')


def yours():
    """every slot that has a file of Victor's in it now (assets/<folder>/<stem>)"""
    out = []
    a = os.path.join(ROOT, 'assets')
    for d in os.listdir(a) if os.path.isdir(a) else []:
        p = os.path.join(a, d)
        if os.path.isdir(p) and d not in ('templates', 'resets'):
            out += ['assets/%s/%s' % (d, os.path.splitext(n)[0]) for n in os.listdir(p) if not n.startswith(('.', '_')) and n != 'list.txt']
    return out


DRAW = '''
([slots, mine, outlines]) => {
  const want = new Set(slots), have = new Set(mine);
  document.querySelectorAll('.dm-layer').forEach(e => e.remove());
  const layer = document.createElement('div');
  layer.className = 'dm-layer';
  document.documentElement.classList.add('dm-template');
  document.body.appendChild(layer);
  const list = DavMap.boxes(window, n => want.has(n) ? n : null);
  DavMap.draw(layer, list, 1, {
    kind: b => have.has(b.slot) ? 'mine' : 'stand',
    label: b => b.slot.split('/').pop() + '<i>' + DavMap.dims(b) + '</i>'
  });
  if (outlines) document.documentElement.classList.add('dm-outlines');
  return list.map(b => b.slot);
}
'''


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit('this needs Playwright:  pip install playwright   then   python -m playwright install chromium')
    only = (sys.argv[1] if len(sys.argv) > 1 else '').lower()
    with open(os.path.join(HERE, 'slots.json'), encoding='utf-8') as f:
        cat = json.load(f)
    scenes = [s for s in cat['scenes'] if s.get('map') and (not only or only in s['id'] or only in s['name'].lower())]
    if not scenes:
        sys.exit('no scene called that (the names are the asset manager’s tabs: sea, workshop, kitchen …)')
    os.makedirs(OUT, exist_ok=True)
    mine = yours()
    server, base = serve()
    server.handle_error = lambda *a: None                   # (a page closed while a picture was still coming: not a problem)
    made = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for sc in scenes:
            slots = [x['slot'] for g in sc['groups'] for x in g['slots']]
            for view in [None] + list(sc['map'].get('views') or []):
                name = sc['id'] + ('-' + slug(view['name']) if view else '')
                print('%s%s' % (sc['name'], (': ' + view['name']) if view else ''), flush=True)
                # a brand-new visitor each time (reset 1), on a 1920 x 1080 screen, at midday
                ctx = browser.new_context(viewport={'width': W, 'height': H}, timezone_id='UTC')
                ctx.add_init_script(NOON)
                # nothing from outside the site (fonts, the weather, skizy's live site on her CRT)
                ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
                page = ctx.new_page()
                try:
                    page.goto(page_url(base, sc['map']['page']), wait_until='load', timeout=30000)
                    try:
                        page.wait_for_load_state('networkidle', timeout=15000)
                    except Exception:
                        pass
                    time.sleep(2.5)
                    if view:
                        page.evaluate('() => { %s }' % view['do'])
                        if view.get('until'):                   # (till the state's there, e.g. skizy's roof: at most 15 s)
                            try:
                                page.wait_for_function('() => (%s)' % view['until'], timeout=15000, polling=200)
                            except Exception:
                                print('   (it never quite got there)', flush=True)
                        time.sleep((view.get('wait') or 1200) / 1000 + .5)
                    page.add_script_tag(path=os.path.join(HERE, 'map.js'))
                    page.add_style_tag(path=os.path.join(HERE, 'map.css'))
                    found = page.evaluate(DRAW, [slots, mine, False])
                    page.screenshot(path=os.path.join(OUT, name + '.png'))
                    page.evaluate(DRAW, [slots, mine, True])
                    page.screenshot(path=os.path.join(OUT, name + '-outlines.png'), omit_background=True)
                    print('   %d slots on it' % len(set(found)), flush=True)
                    made += 1
                except Exception as e:
                    print('   couldn’t: %s' % str(e).splitlines()[0], flush=True)
                ctx.close()
        browser.close()
    server.shutdown()
    print('made %d template picture%s in tools/templates/' % (made, '' if made == 1 else 's'), flush=True)


if __name__ == '__main__':
    main()
