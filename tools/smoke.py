# the smoke test: opens every page of the site in a hidden browser, the way a visitor would, and
# tells you if anything went wrong on the way (a script error, a file that wouldn't load). run it
# before publishing, or after a big change, instead of clicking round every room by hand.
#
#     python tools/smoke.py                  every page, in reset 1
#     python tools/smoke.py --resets 1-8     every page, in every reset (a few minutes)
#     python tools/smoke.py --resets 3,4     just those resets
#     python tools/smoke.py --shots shots    also saves a picture of every page into the folder "shots"
#     python tools/smoke.py --shots shots --still
#                                            the same, but holds everything still first (the clock, chance, every
#                                            animation), so two runs of the same code give the same pictures: for
#                                            checking a tidy-up changed nothing you can see
#
# it needs Playwright, once:   pip install playwright   then   python -m playwright install chromium
# nothing shows on screen: the browser is hidden. it serves the site itself (like tools/preview), on
# its own port, and only looks at the site's own files: fonts, the weather and Mel's live site (on the
# CRT in her room) come from elsewhere and don't count.
# it only ever reads the site; it never changes a file.

import argparse, http.server, os, socket, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# every place a visitor can be, and where it is
STOPS = [
    ('the sea', 'index.html'),
    ('the workshop', 'workshop.html'),
    ('the rooftop', 'city.html'),
    ('the living space', 'living.html'),
    ('the bathroom', 'living.html#bathroom'),
    ('the hallway', 'living.html#hallway'),
    ('the kitchen', 'living.html#kitchen'),
    ('the porch', 'living.html#porch'),
    ('the front of the house', 'living.html#front'),
    ('the attic', 'living.html#attic'),
    ('the dungeon', 'living.html#dungeon'),
    ('the template', 'template.html'),
    ("mel's room", 'schizophyllu.me.room/index.html?from=dav-nky'),
    ("mel's room, through the window", 'schizophyllu.me.room/index.html?peek'),
]

# things that are fine and expected (see CLAUDE.md, "Testing"): a line of trouble is skipped if it has one of these in it
EXPECTED = [
    'content/books/grimoire/list.txt',     # 404s on your own computer until the first publish writes it
]

SETTLE = 3.0      # seconds to let each page get going (the loading screen, the sky, the first sounds)

# --still: the same moment every time (noon, 26 Sep 2026), the same "random" numbers, and no animations
STILL_AT = 1790409600000
STILL_SCRIPT = '''
(() => {
  let seed = 20260926;                                 // chance, but the same chance every time
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const RealDate = Date, T = %d;
  class StillDate extends RealDate {                   // the clock stopped at one moment
    constructor(...a) { a.length ? super(...a) : super(T); }
    static now() { return T; }
  }
  window.Date = StillDate;
  performance.now = () => 0;
  const raf = window.requestAnimationFrame.bind(window);    // every frame is the first frame: nothing drifts
  window.requestAnimationFrame = cb => raf(() => cb(0));
  const hold = () => {
    const s = document.createElement('style');
    // (pages shown inside pages, like Mel's live site on her CRT, come from elsewhere and change: hidden)
    s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; } iframe { visibility: hidden !important; }';
    (document.head || document.documentElement).appendChild(s);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', hold) : hold();
})();
''' % STILL_AT


class Quiet(http.server.SimpleHTTPRequestHandler):
    # the same as tools/serve.py (never keep old copies), but without printing every request
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *a):
        pass


class Server(http.server.ThreadingHTTPServer):
    # leaving a page cuts off its big sounds half-downloaded: the browser hanging up is fine, not worth a traceback
    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], (ConnectionResetError, BrokenPipeError)):
            super().handle_error(request, client_address)


def serve():
    with socket.socket() as s:                              # a free port
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    server = Server(('127.0.0.1', port), Quiet)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d/' % port


def resets(text):
    out = []
    for part in text.split(','):
        if '-' in part:
            a, b = part.split('-')
            out += range(int(a), int(b) + 1)
        elif part.strip():
            out.append(int(part))
    return out


def visit(page, base, url, trouble):
    # what went wrong while this page was open: script errors, and the site's own files that failed
    def ours(u):
        return u.startswith(base)

    def note(kind, text):
        if not any(x in text for x in EXPECTED):
            trouble.append('%s: %s' % (kind, text.strip().splitlines()[0][:300]))

    handlers = [
        ('pageerror', lambda e: note('script error', str(e))),
        ('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and note('console error', m.text)),
        # (a sound or video "aborted" is the browser loading it bit by bit, not a failure: a missing file is a 404, below)
        ('requestfailed', lambda r: ours(r.url) and 'ERR_ABORTED' not in (r.failure or '') and note("couldn't load", r.url[len(base):] + ' (' + (r.failure or '?') + ')')),
        ('response', lambda r: ours(r.url) and r.status >= 400 and note('missing (%d)' % r.status, r.url[len(base):])),
    ]
    for ev, fn in handlers:
        page.on(ev, fn)
    try:
        # a blank page first: from living.html, going to living.html#attic is only a change of the #, the page
        # isn't opened again, and the test would look at the living room seven times (it did, till 5 Oct)
        page.goto('about:blank')
        page.goto(base + url, wait_until='load', timeout=30000)
        try:                                            # till the pictures and sounds have come in (the big ones take a moment)
            page.wait_for_load_state('networkidle', timeout=20000)
        except Exception:
            pass
        time.sleep(SETTLE)
    except Exception as e:
        trouble.append("the page didn't open: %s" % str(e).splitlines()[0])
    for ev, fn in handlers:
        page.remove_listener(ev, fn)


def check_pages():
    """each page's list of code and styles (the <script src="sky/…"> and <link href="sky/…"> lines), checked against
    each other: nothing twice, and each part's styles (sky/css/<name>.css) linked wherever its code is, and only there"""
    import re
    out = []
    css_dir = os.path.join(ROOT, 'sky', 'css')
    has_css = set(os.path.splitext(n)[0] for n in os.listdir(css_dir)) if os.path.isdir(css_dir) else set()
    for page in sorted(n for n in os.listdir(ROOT) if n.endswith('.html')):
        with open(os.path.join(ROOT, page), encoding='utf-8') as f:
            html = re.sub(r'<!--.*?-->', '', f.read(), flags=re.S)          # (not the ones only mentioned in comments)
        js = re.findall(r'<script[^>]*\ssrc="sky/([\w-]+)\.js[?"]', html)
        css = re.findall(r'<link[^>]*href="sky/css/([\w-]+)\.css[?"]', html)
        for kind, l in (('code', js), ('styles', css)):
            for n in sorted(set(x for x in l if l.count(x) > 1)):
                out.append('%s: sky/%s%s.%s is there twice' % (page, 'css/' if kind == 'styles' else '', n, 'css' if kind == 'styles' else 'js'))
        for n in js:
            if n in has_css and n not in css:
                out.append('%s: loads sky/%s.js, but not its styles (sky/css/%s.css)' % (page, n, n))
        for n in css:
            if n not in js and os.path.exists(os.path.join(ROOT, 'sky', n + '.js')):
                out.append('%s: has the styles sky/css/%s.css, but not sky/%s.js' % (page, n, n))
    return out


def main():
    ap = argparse.ArgumentParser(description='open every page in a hidden browser and report anything that goes wrong')
    ap.add_argument('--resets', default='1', help='which resets: 1, 1-8, 3,4 … (default: 1)')
    ap.add_argument('--shots', help='also save a picture of every page into this folder')
    ap.add_argument('--only', help='just the stops whose name has this in it (e.g. "mel")')
    ap.add_argument('--still', action='store_true', help='hold the clock, chance and animations still, so pictures can be compared')
    args = ap.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit('this needs Playwright:  pip install playwright   then   python -m playwright install chromium')

    lint = check_pages()
    print('the pages\' lists of code and styles:', 'ok' if not lint else '')
    for t in lint:
        print('  x  ' + t)
    stops = [s for s in STOPS if not args.only or args.only.lower() in s[0]]
    server, base = serve()
    problems = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for n in resets(args.resets):
            print('\nreset %d' % n)
            # a brand-new visitor for each reset: nothing kept from the one before
            ctx = browser.new_context(viewport={'width': 1600, 'height': 900})
            if args.still:
                ctx.add_init_script(STILL_SCRIPT)
                # and nothing from outside the site (fonts, the weather, Mel's live site): the internet isn't the same twice
                ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
            page = ctx.new_page()
            page.goto(base + 'index.html?reset=%d' % n, wait_until='load')
            # (Mel's room would otherwise play its climbing-in scene first; see CLAUDE.md, "Testing")
            page.evaluate("localStorage.setItem('room_knocked', '1')")
            for name, url in stops:
                trouble = []
                visit(page, base, url, trouble)
                if args.shots:
                    if args.still:                              # drawings that move by themselves (SVG animations): back to the start, held
                        page.evaluate("document.querySelectorAll('svg').forEach(s => { try { s.pauseAnimations(); s.setCurrentTime(0); } catch (e) {} })")
                    os.makedirs(args.shots, exist_ok=True)
                    safe = ''.join(c if c.isalnum() else '-' for c in name).strip('-')
                    page.screenshot(path=os.path.join(args.shots, 'reset%d-%s.png' % (n, safe)))
                if trouble:
                    problems += len(trouble)
                    print('  x  %s' % name)
                    for t in dict.fromkeys(trouble):         # (each only once)
                        print('       %s' % t)
                else:
                    print('  ok %s' % name)
            ctx.close()
        browser.close()
    server.shutdown()
    problems += len(lint)
    print('\n%s' % ('all good.' if not problems else '%d thing%s went wrong.' % (problems, '' if problems == 1 else 's')))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
