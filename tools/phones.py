# the phone check: opens every place on a phone-sized screen, held upright and sideways, and looks at everything you
# can tap there. it tells you if one is off the edge of the screen, or covered by something else (the traveller, the
# place tabs, a constellation, another piece of furniture), and by what. run it after moving things about, or after
# adding a room, so the site stays usable on a phone.
#
#     python tools/phones.py                    every place, upright and sideways, in reset 1
#     python tools/phones.py --reset 4          the same, in reset 4
#     python tools/phones.py --only kitchen     just the places with "kitchen" in their name
#     python tools/phones.py --sizes all        also a small phone (360 x 740) and a big one (412 x 915)
#
# it needs Playwright, like the smoke test (see tools/smoke.py). nothing shows on screen, and it never changes a file.
# a few things it finds are fine: the living room's letter pile, empty, is see-through (it says "covered by div.room"),
# and the window, seen past its constellations. Mel's room is hers: it isn't checked.

import argparse, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import smoke

SIZES = {
    'upright': (390, 844),
    'sideways': (844, 390),
    'small upright': (360, 740),
    'small sideways': (740, 360),
    'big upright': (412, 915),
}

# what's on screen that can be tapped, and whether a tap there reaches it
LOOK = r'''
() => {
  const W = innerWidth, H = innerHeight, out = [];
  const name = el => (el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + (el.dataset && el.dataset.asset ? ' [' + el.dataset.asset.split('/').pop() + ']' : '')).slice(0, 80);
  const shown = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.visibility === 'hidden' || +c.opacity < .05 || c.display === 'none') return false; } return true; };
  const owner = el => { let o = el; while (o.parentElement && o.parentElement !== document.body && !(o instanceof HTMLElement && typeof o.className === 'string' && o.className.trim())) o = o.parentElement; return o; };
  for (const el of document.querySelectorAll('body *')) {
    const c = getComputedStyle(el);
    if (c.pointerEvents === 'none' || !(c.cursor === 'pointer' || el.matches('a[href], button, [role=button]'))) continue;
    if (el.parentElement && el.parentElement.closest('a[href], button, [role=button]')) continue;        // (part of a bigger one)
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer' && !el.matches('a, button')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || !shown(el)) continue;
    const l = Math.max(r.left, 0), t = Math.max(r.top, 0), rr = Math.min(r.right, W), b = Math.min(r.bottom, H);
    const seen = Math.max(0, rr - l) * Math.max(0, b - t), all = r.width * r.height;
    if (seen === 0) continue;                                             // (wholly off screen: another room, a closed drawer)
    const at = Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
    if (seen < all * .7) { out.push(name(el) + ' at ' + at + ': ' + Math.round(100 - 100 * seen / all) + '% off the screen'); continue; }
    let hit = 0; const over = {};
    for (const fx of [.2, .5, .8]) for (const fy of [.2, .5, .8]) {
      const tops = document.elementsFromPoint(l + (rr - l) * fx, t + (b - t) * fy);
      if (!tops[0]) continue;
      if (el === tops[0] || el.contains(tops[0])) { hit++; continue; }
      if (!tops.some(x => x === el || el.contains(x))) continue;          // (a see-through gap in its own shape)
      const o = name(owner(tops[0])); over[o] = (over[o] || 0) + 1;
    }
    const covered = Object.values(over).reduce((a, n) => a + n, 0);
    if (covered >= 4 && hit <= 4) out.push(name(el) + ' at ' + at + ': covered (' + hit + ' of 9 taps reach it) by ' + Object.keys(over).join(', '));
  }
  return out;
}
'''


def main():
    ap = argparse.ArgumentParser(description='look for things you can\'t tap on a phone, in every place')
    ap.add_argument('--reset', type=int, default=1)
    ap.add_argument('--only', help='just the places whose name has this in it')
    ap.add_argument('--sizes', default='upright,sideways', help='upright, sideways, small upright, small sideways, big upright, or all')
    args = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit('this needs Playwright:  pip install playwright   then   python -m playwright install chromium')
    sizes = list(SIZES) if args.sizes == 'all' else [s.strip() for s in args.sizes.split(',')]
    stops = [s for s in smoke.STOPS if 'mel' not in s[0] and (not args.only or args.only.lower() in s[0])]
    server, base = smoke.serve()
    found = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for size in sizes:
            w, h = SIZES[size]
            print('\n%s (%d x %d)' % (size, w, h))
            ctx = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(base + 'index.html?reset=%d' % args.reset, wait_until='load')
            for name, url in stops:
                page.goto('about:blank')
                page.goto(base + url, wait_until='load')
                time.sleep(3.5)
                trouble = page.evaluate(LOOK)
                print(('  ok %s' % name) if not trouble else ('  x  %s' % name))
                for t in trouble:
                    print('       ' + t)
                found += len(trouble)
            ctx.close()
        browser.close()
    server.shutdown()
    print('\n%s' % ('nothing hidden.' if not found else '%d thing%s to look at.' % (found, '' if found == 1 else 's')))


if __name__ == '__main__':
    main()
