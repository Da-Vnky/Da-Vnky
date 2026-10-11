#!/usr/bin/env python3
"""
handwriting.py — your own handwriting, as the font the letters are written in.

It works like the drawing table (tools/drawtable.py), and the asset manager runs it for you: the slot
assets/fonts/handwriting (with the letters, in the sea's scene) has the same "draw it in" buttons as a picture.

1. the sheet. a layered .psd, opened in Clip Studio, Photoshop or Rebelle:

       paper        plain white, locked (it can stay showing when you export, or not: either's fine)
       guide        a box for every letter, with its writing lines (locked; hide it before you export, if you
                    remember: it's drawn in colours too pale to be mistaken for writing, so it's fine if you don't)
       write here   an empty layer: write in it, in a dark colour

   in each box: the baseline (the solid line the letters sit on), the x-height (dashed: how tall an "x" is), the
   capital height (dotted, above it) and the tail line (dotted, below: where the tails of g, j, p, q and y reach).
   small letters get three boxes each (three tries, so the same letter twice in a row never looks stamped),
   capitals two, numbers and marks one. then the accents (the font puts them on é, ñ, ç … itself) and a few pairs
   people often join (th, ll, oo …: leave them empty if you don't join them). any box can stay empty.

2. the font. export the sheet as a PNG into the same folder (tools/drawing/fonts--handwriting/), and the slot's card
   shows it with a "make the font" button. that traces every box into a letter and puts the font in the slot
   (assets/fonts/handwriting.woff2). the letters use it as soon as it's there (sky/hand.js), and publishing puts
   it on the site. draw some boxes again, export again, make it again: as often as you like.

    python tools/handwriting.py template            the sheet (or the one that's there already), say where
    python tools/handwriting.py template --fresh    a fresh sheet, even if there's one there already
    python tools/handwriting.py build               the newest PNG in that folder -> the font (kept on the table)
    python tools/handwriting.py build sheet.png --use   that one, and put it in the slot (as the asset manager does)

How the font behaves: each letter you wrote three times takes its three versions in turn (1, 2, 3, 1 …, counting
every letter and space in the line), so neighbours never match and the same word comes out a little different each
time it's written. capitals take turns between their two. the spaces take turns between three slightly different
widths. a pair you drew (th …) is used wherever those two letters meet. accented letters are built from your accents
and your letters (é from your e and your accent: in all three versions). curly quotes, dashes and "…" are made from
what you drew if you left them out. a character you didn't draw at all comes out in the site's usual lettering.

Needs (once): pip install pillow numpy fonttools brotli potracer  (the asset manager's button does it for you).
The sheet itself needs only Pillow.
"""

import json, math, os, re, statistics, struct, sys, time, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SLOT = 'assets/fonts/handwriting'
FOLDER = os.path.join(HERE, 'drawing', 'fonts--handwriting')      # (gitignored, like the rest of the drawing table)
STEM = 'handwriting'
SHEET_JSON = '.sheet.json'                                          # where every box is, written with the sheet
NEEDS = 'pillow numpy fonttools brotli potracer'
FAMILY = 'DaV hand'                                                 # (the font's own name: the site's, nobody's)

# ---------------- the boxes: where the lines are, in the font's own units (1000 to the em) ----------------
UPM = 1000
TOP, BOTTOM = 1000, -400            # what a box holds, top to bottom (the baseline is 0)
CAP, XH, DESC = 700, 480, -260      # the capital line, the x-height, the tail line
BOX_W, BOX_H = 300, 360             # a box on the sheet, in pixels
UPP = (TOP - BOTTOM) / BOX_H        # font units to a pixel of the sheet (about 3.9)
GAP, ROW_GAP = 26, 14               # between one letter's boxes and the next letter's; between rows
MARGIN, HEAD, TITLE = 110, 92, 250  # the sheet's edge; a section's heading; the title at the top
LSB = RSB = 46                      # the room each side of a letter (font units)

LOWER = 'abcdefghijklmnopqrstuvwxyz'
UPPER = LOWER.upper()
MARKS = [(c, '') for c in '0123456789'] + [
    ('.', ''), (',', ''), (';', ''), (':', ''), ('!', ''), ('?', ''), ('\u00a1', 'upside down'), ('\u00bf', 'upside down'),
    ("'", 'straight'), ('"', 'straight'), ('\u2018', 'opening'), ('\u2019', 'closing, and the apostrophe'),
    ('\u201c', 'opening'), ('\u201d', 'closing'), ('(', ''), (')', ''), ('-', 'hyphen'), ('\u2014', 'long dash'),
    ('&', ''), ('/', ''), ('@', ''), ('#', ''), ('*', ''), ('+', ''), ('=', ''), ('%', ''), ('$', ''), ('~', ''),
    ('\u2665', 'a heart'), ('\u2605', 'a star')]
# the accents: drawn where they'd sit over a small letter (above the x-height line); the cedilla hangs under the baseline
ACCENTS = [('\u00b4', 'acute: \u00e9 \u00e1', '\u0301'), ('`', 'grave: \u00e8 \u00e0', '\u0300'),
           ('\u02c6', 'circumflex: \u00ea \u00f4', '\u0302'), ('\u00a8', 'two dots: \u00eb \u00fc', '\u0308'),
           ('\u02dc', 'tilde: \u00f1 \u00e3', '\u0303'), ('\u00b8', 'cedilla: \u00e7 (under the baseline)', '\u0327')]
PAIRS = ['th', 'll', 'oo', 'ee', 'tt', 'ss', 'ff', 'st', 'ck']

SECTIONS = [
    ('lower', 'small letters', 'three tries at each: the font takes them in turn, so no two in a row look stamped',
     [(c, '') for c in LOWER], 3, 4),
    ('upper', 'capitals', 'two tries at each', [(c, '') for c in UPPER], 2, 6),
    ('marks', 'numbers and marks', 'one of each. the curly quotes and the long dash are made from the straight ones if you leave them out',
     MARKS, 1, 12),
    ('accents', 'accents', 'drawn where they sit over a small letter (just above the x-height line): the font puts them on '
     '\u00e9 \u00f1 \u00e7 \u00fc \u2026 itself, over your own letters', [(a, h) for a, h, _ in ACCENTS], 1, 12),
    ('pairs', 'pairs you join', 'only if you join these when you write (leave the rest empty): used wherever the two letters meet',
     [(p, '') for p in PAIRS], 1, 12),
]


def layout():
    """every box on the sheet: [{ ch, v, sect, hint, x, y, w, h }], and the sheet's size"""
    boxes, y, width = [], MARGIN + TITLE, 0
    for key, title, hint, items, vers, per_row in SECTIONS:
        y += HEAD
        for r in range(0, len(items), per_row):
            x = MARGIN
            for ch, h in items[r:r + per_row]:
                for v in range(vers):
                    boxes.append({'ch': ch, 'v': v, 'sect': key, 'hint': h, 'x': x, 'y': y, 'w': BOX_W, 'h': BOX_H})
                    x += BOX_W
                x += GAP
            width = max(width, x - GAP)
            y += BOX_H + ROW_GAP
    return boxes, width + MARGIN, y - ROW_GAP + MARGIN


def line_y(u):
    """a line in a box (font units) -> pixels down from the box's top"""
    return (TOP - u) / UPP


# ---------------- the sheet ----------------
def pil():
    try:
        from PIL import Image, ImageDraw, ImageFont
        return Image, ImageDraw, ImageFont
    except ImportError:
        raise NeedTools('the handwriting sheet needs Pillow, once: in a terminal, type  py -m pip install ' + NEEDS +
                        '  (or press "install the font tools" on the slot\'s card)')


class NeedTools(Exception):
    need = 'fonttools'                                # (the asset manager offers to install them)


FONT_FILES = {   # for the labels on the sheet: the first of these the computer has that has the character
    'serif': [r'C:\Windows\Fonts\georgia.ttf', '/System/Library/Fonts/Supplemental/Georgia.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'],
    'italic': [r'C:\Windows\Fonts\georgiai.ttf', '/System/Library/Fonts/Supplemental/Georgia Italic.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf',
               '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'],
    'symbol': [r'C:\Windows\Fonts\seguisym.ttf', r'C:\Windows\Fonts\segoeui.ttf', '/System/Library/Fonts/Apple Symbols.ttf',
               '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
}
_fonts, _cmaps = {}, {}


def has_char(path, ch):
    if path not in _cmaps:
        try:
            from fontTools.ttLib import TTFont
            _cmaps[path] = set(TTFont(path, lazy=True).getBestCmap() or {})
        except Exception:
            _cmaps[path] = None                       # (no fontTools yet, or not a font it reads: assume it has it)
    return _cmaps[path] is None or ord(ch) in _cmaps[path]


def label_font(size, style='serif', ch=None):
    _, _, ImageFont = pil()
    for kind in ([style] + (['symbol'] if ch else [])):
        for p in FONT_FILES[kind]:
            if os.path.exists(p) and (not ch or all(has_char(p, c) for c in ch if not c.isspace())):
                key = (p, size)
                if key not in _fonts:
                    _fonts[key] = ImageFont.truetype(p, size)
                return _fonts[key]
    try:
        return ImageFont.load_default(size)
    except TypeError:
        return ImageFont.load_default()


# the guide's colours: pale enough that the font maker never takes them for writing, even if the guide's still showing
BOX_LINE = (176, 196, 214, 255)
BASE_LINE = (128, 172, 214, 235)
X_LINE = (150, 188, 222, 225)
CAP_LINE = (178, 204, 228, 220)
TAIL_LINE = (190, 210, 230, 210)
LABEL = (226, 150, 138, 215)
HINT = (196, 168, 150, 210)
HEADING = (150, 120, 100, 230)
BAND = (214, 230, 244, 70)


def dashed(d, x0, x1, y, col, width, on, off):
    x = x0
    while x < x1:
        d.line([(x, y), (min(x + on, x1), y)], fill=col, width=width)
        x += on + off


def guide_picture():
    """the guide layer (see-through, everything else drawn on it), and the sheet's size and boxes"""
    Image, ImageDraw, _ = pil()
    boxes, W, H = layout()
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # the title, and what to do in short
    d.text((MARGIN, MARGIN), 'your handwriting \u2192 the font your letters are written in', font=label_font(64, 'italic'), fill=HEADING)
    d.text((MARGIN, MARGIN + 92), 'write one letter in each box, in the "write here" layer, in a dark colour. sit them on the solid line; '
           'small letters reach the dashed line, capitals the dotted one above it, tails the dotted one below.',
           font=label_font(30, 'italic'), fill=HINT)
    d.text((MARGIN, MARGIN + 136), 'any box can stay empty. when you\u2019re done: hide this guide, export a PNG into this folder, '
           'and press "make the font" on the slot\u2019s card in the asset manager.', font=label_font(30, 'italic'), fill=HINT)
    seen = set()
    for b in boxes:
        x, y, w, h = b['x'], b['y'], b['w'], b['h']
        if b['sect'] not in seen:                     # (the section's heading, over its first box)
            seen.add(b['sect'])
            sect = [s for s in SECTIONS if s[0] == b['sect']][0]
            d.text((x, y - HEAD + 14), sect[1], font=label_font(46, 'italic'), fill=HEADING)
            tw = d.textlength(sect[1], font=label_font(46, 'italic'))
            d.text((x + tw + 26, y - HEAD + 30), sect[2], font=label_font(26, 'italic'), fill=HINT)
        d.rectangle([x + 2, y + line_y(XH), x + w - 3, y + line_y(0)], fill=BAND)     # (the small letters' band, faintly)
        d.rectangle([x, y, x + w - 1, y + h - 1], outline=BOX_LINE, width=2)
        d.line([(x + 2, y + line_y(0)), (x + w - 3, y + line_y(0))], fill=BASE_LINE, width=3)
        dashed(d, x + 2, x + w - 3, y + line_y(XH), X_LINE, 2, 14, 9)
        dashed(d, x + 2, x + w - 3, y + line_y(CAP), CAP_LINE, 2, 3, 7)
        dashed(d, x + 2, x + w - 3, y + line_y(DESC), TAIL_LINE, 2, 3, 7)
        if b['x'] == MARGIN:                          # (the lines named, in the margin, once a row)
            f = label_font(19, 'italic')
            for u, t in ((CAP, 'capitals'), (XH, 'small'), (0, 'baseline'), (DESC, 'tails')):
                d.text((x - 12 - d.textlength(t, font=f), y + line_y(u) - 12), t, font=f, fill=HINT)
        ch = b['ch']
        f = label_font(40, 'serif', ch)
        d.text((x + 10, y + 6), ch, font=f, fill=LABEL)
        if b['hint'] and b['v'] == 0:
            f2 = label_font(17, 'italic', b['hint'])
            hx = x + 14 + d.textlength(ch, font=f)
            words, line, ly = b['hint'].split(' '), '', y + 10
            for wd in words:                          # (wrapped to the box)
                t = (line + ' ' + wd).strip()
                if d.textlength(t, font=f2) > x + w - 12 - hx and line:
                    d.text((hx, ly), line, font=f2, fill=HINT); ly += 19; line = wd
                else:
                    line = t
            d.text((hx, ly), line, font=f2, fill=HINT)
        same = [o for o in boxes if o['ch'] == ch and o['sect'] == b['sect']]
        if len(same) > 1:
            f3 = label_font(20, 'italic')
            t = str(b['v'] + 1)
            d.text((x + w - 12 - d.textlength(t, font=f3), y + 8), t, font=f3, fill=HINT)
    return im, W, H, boxes


NOTE = '''what to do (your handwriting, as the letters' font: tools/handwriting.py)

{name}.psd is the sheet to write on: {w} x {h}.
  paper        white, locked (showing or hidden when you export: either's fine)
  guide        a box for every letter, with its writing lines. locked. hide it before you export (it's pale
               enough that it's fine if you forget)
  write here   write in this one, in a dark colour (any brush you like: it keeps its shape)

in each box: sit the letter on the solid line (the baseline). small letters reach the dashed line, capitals the
dotted line above it, and tails (g j p q y) the dotted line below. small letters have three boxes each (three
tries), capitals two, the rest one. any box can stay empty: a letter you never draw comes out in the site's usual
lettering. stay inside the box (anything over its edge is cut off).

the accents are drawn where they'd sit over a small letter, just above the dashed line (the cedilla hangs under
the solid one). the font puts them on your own letters itself: é ñ ç ü …
the pairs (th, ll …) only if you join them when you write: leave the others empty.

when it's done (or partly done: you can do it again whenever you like): hide the guide, and export a PNG into
this same folder, at the size it is. the slot's card in the asset manager (assets/fonts/handwriting, with the
letters in the sea's scene) shows it, with "make the font". press it: the font goes in the slot, and the letters
are written in it straight away. publish when you're happy with it.
your working file stays here, so the asset manager's button opens it again as you left it.

layers/guide.png is the guide as a picture of its own, for a program that can't read a .psd's layers (Rebelle:
File > Import it as a layer), and layers/sheet.png is the whole sheet, to print if you'd rather see it on paper.
after "make the font", handwriting.otf here is the same font to install on your computer, if you'd like to type
in your own handwriting elsewhere too.
'''


def rle_planes(im, mode):
    """a picture's channels, squeezed the way a .psd keeps them (drawtable's packbits)"""
    sys.path.insert(0, HERE)
    import drawtable as dt
    w, h = im.size
    if mode == 'RGB':
        chans = im.convert('RGB').split()
        rows = []
        for c in chans:
            b = c.tobytes()
            rows += [b[y * w:(y + 1) * w] for y in range(h)]
        packed = [dt.packbits_row(r) for r in rows]
        return struct.pack('>H', 1) + b''.join(struct.pack('>H', len(p)) for p in packed) + b''.join(packed)
    raise ValueError(mode)


def working_file():
    if not os.path.isdir(FOLDER):
        return None
    have = [os.path.join(FOLDER, n) for n in os.listdir(FOLDER)
            if n.rsplit('.', 1)[-1].lower() in ('clip', 'reb', 'psd', 'psb', 'kra', 'tif', 'tiff') and not n.startswith(('.', '_'))]
    return max(have, key=os.path.getmtime) if have else None


def template(fresh=False, app=None):
    """the sheet (unless there's one already) -> { file, folder, w, h, made }"""
    sys.path.insert(0, HERE)
    import drawtable as dt
    have = None if fresh else dt.working_file(FOLDER, STEM, app)
    if have:
        return {'file': have, 'folder': FOLDER, 'made': False, 'guide': True, 'measured': True}
    Image, _, _ = pil()
    guide, W, H, boxes = guide_picture()
    paper = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    flat = paper.copy()
    flat.alpha_composite(guide)
    layers = [{'name': 'paper', 'rgba': paper.tobytes(), 'locked': True},
              {'name': 'guide (hide me before you export)', 'rgba': guide.tobytes(), 'locked': True},
              {'name': 'write here', 'rgba': None}]
    os.makedirs(os.path.join(FOLDER, 'layers'), exist_ok=True)
    path = os.path.join(FOLDER, STEM + '.psd')
    if os.path.exists(path) and fresh:                # (the old one kept, never thrown away)
        os.replace(path, os.path.join(FOLDER, '_' + STEM + '-' + time.strftime('%Y%m%d-%H%M%S') + '.psd'))
    dt.write_psd(path, W, H, layers, rle_planes(flat, 'RGB'))
    guide.save(os.path.join(FOLDER, 'layers', 'guide.png'))
    flat.convert('RGB').save(os.path.join(FOLDER, 'layers', 'sheet.png'))
    with open(os.path.join(FOLDER, SHEET_JSON), 'w', encoding='utf-8') as f:
        json.dump({'w': W, 'h': H, 'upp': UPP, 'top': TOP, 'boxes': [{k: b[k] for k in ('ch', 'v', 'sect', 'x', 'y', 'w', 'h')} for b in boxes]}, f)
    with open(os.path.join(FOLDER, '.made.json'), 'w', encoding='utf-8') as f:
        json.dump({'psd': int(os.path.getmtime(path)), 'measured': True, 'guide': True}, f)
    with open(os.path.join(FOLDER, 'what to do.txt'), 'w', encoding='utf-8') as f:
        f.write(NOTE.format(name=STEM, w=W, h=H))
    return {'file': path, 'folder': FOLDER, 'w': W, 'h': H, 'made': True, 'guide': True, 'measured': True, 'handwriting': True}


# ---------------- the font ----------------
def tools():
    try:
        import numpy, potrace, brotli                 # noqa: F401  (brotli: for squeezing it into a .woff2)
        from fontTools.fontBuilder import FontBuilder  # noqa: F401
        from PIL import Image                          # noqa: F401
    except ImportError as e:
        raise NeedTools('making the font needs a few Python pieces, once (' + str(e).replace('No module named ', '') + ' is missing): '
                        'press "install the font tools" on the slot\'s card, or in a terminal type  py -m pip install ' + NEEDS)


def exports():
    if not os.path.isdir(FOLDER):
        return []
    out = [os.path.join(FOLDER, n) for n in os.listdir(FOLDER)
           if n.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')) and not n.startswith(('.', '_'))]
    return sorted(out, key=os.path.getmtime, reverse=True)


def sheet_boxes():
    try:
        with open(os.path.join(FOLDER, SHEET_JSON), encoding='utf-8') as f:
            s = json.load(f)
        return s['boxes'], s['w'], s['h'], s.get('upp', UPP), s.get('top', TOP)
    except (OSError, ValueError, KeyError):
        boxes, W, H = layout()
        return boxes, W, H, UPP, TOP


INK = 0.5          # how dark (and solid) a pixel has to be to count as writing: 0 nothing, 1 black
SPECK = 40         # anything smaller than this (in the traced picture's pixels, at twice the size) is dust
UP = 2             # each box is traced at twice its size, for smoother outlines


def inkness(rgba):
    """0..1 for every pixel: how much it's writing (dark and solid). works the same whether the export kept a
    see-through background or the white paper, and leaves the guide's pale lines out"""
    import numpy as np
    a = rgba[..., 3].astype(np.float32) / 255
    lum = (0.299 * rgba[..., 0] + 0.587 * rgba[..., 1] + 0.114 * rgba[..., 2]).astype(np.float32) / 255
    return a * (1 - lum)


def trace_box(ink, b, upp, top, sx, sy, guide=None):
    """one box of the sheet -> its outline in font units ([contour, …], each [(op, points…), …]) and any notes"""
    import numpy as np
    import potrace
    from PIL import Image
    inset = 4
    x0, y0 = int(round(b['x'] * sx)) + inset, int(round(b['y'] * sy)) + inset
    x1, y1 = int(round((b['x'] + b['w']) * sx)) - inset, int(round((b['y'] + b['h']) * sy)) - inset
    crop = ink[y0:y1, x0:x1]
    notes = []
    if crop.size == 0 or crop.max() < INK:
        if crop.size:                                 # (something drawn too pale to count: not the guide's own lines)
            faint = crop > 0.15
            if guide is not None:
                faint &= ~guide[y0:y1, x0:x1]
            if faint.sum() > 150:
                notes.append('pale')
        return [], notes
    # (bigger, smoothly, then cut at INK: rounder edges than the pixels themselves)
    im = Image.fromarray((crop * 255).astype(np.uint8), 'L').resize((crop.shape[1] * UP, crop.shape[0] * UP), Image.BILINEAR)
    mask = np.asarray(im) >= int(INK * 255)
    if mask.sum() < SPECK:
        return [], notes
    edge = 3 * UP
    if mask[:edge].any() or mask[-edge:].any() or mask[:, :edge].any() or mask[:, -edge:].any():
        notes.append('edge')
    try:
        plist = potrace.Bitmap(~mask).trace(turdsize=SPECK, alphamax=1.0, opticurve=True, opttolerance=0.2)
    except (ValueError, ZeroDivisionError):           # (the tracer's joining-up of curves trips on a rare shape: without it)
        plist = potrace.Bitmap(~mask).trace(turdsize=SPECK, alphamax=1.0, opticurve=False)
    # pixels of the traced picture -> font units: across from the box's left, up from its baseline
    kx = upp / sx / UP
    ky = upp / sy / UP
    base = (top - 0) / upp * sy - inset             # the baseline, in the crop's pixels (before UP)

    def u(p):
        return (p.x * kx, (base * UP - p.y) * ky)
    contours = []
    for curve in plist:
        c = [('move', u(curve.start_point))]
        for seg in curve:
            if seg.is_corner:
                c.append(('line', u(seg.c)))
                c.append(('line', u(seg.end_point)))
            else:
                c.append(('curve', u(seg.c1), u(seg.c2), u(seg.end_point)))
        contours.append(c)
    return orient(contours), notes


def flat_points(c, n=6):
    """a contour as a polygon (curves cut into n straight bits): for which-is-inside-which"""
    pts, cur = [], None
    for seg in c:
        if seg[0] in ('move', 'line'):
            cur = seg[1]
            pts.append(cur)
        else:
            p0, (p1, p2, p3) = cur, seg[1:]
            for i in range(1, n + 1):
                t = i / n
                mt = 1 - t
                pts.append((mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0],
                            mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1]))
            cur = p3
    return pts


def area(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2


def inside(pt, poly):
    x, y, hit = pt[0], pt[1], False
    for i in range(len(poly)):
        (ax, ay), (bx, by) = poly[i], poly[i - 1]
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            hit = not hit
    return hit


def reverse(c):
    """the same contour, the other way round"""
    start = c[0][1]
    pts, segs, cur = [], [], start
    for seg in c[1:]:
        segs.append((cur, seg))
        cur = seg[-1]
    out = [('move', cur)]
    for p0, seg in reversed(segs):
        if seg[0] == 'line':
            out.append(('line', p0))
        else:
            out.append(('curve', seg[2], seg[1], p0))
    return out


def orient(contours):
    """outer outlines anticlockwise, holes clockwise (what a font's outlines expect), worked out from which is inside which"""
    polys = [flat_points(c) for c in contours]
    out = []
    for i, c in enumerate(contours):
        depth = sum(1 for j, p in enumerate(polys) if j != i and abs(area(p)) > abs(area(polys[i])) and inside(polys[i][0], p))
        want_ccw = depth % 2 == 0
        a = area(polys[i])
        out.append(c if (a > 0) == want_ccw else reverse(c))
    return out


def moved(contours, dx=0, dy=0, sx=1, sy=1, cx=0):
    """contours shifted (and stretched across about cx)"""
    f = lambda p: ((p[0] - cx) * sx + cx + dx, p[1] * sy + dy)
    return [[(seg[0],) + tuple(f(p) for p in seg[1:]) for seg in c] for c in contours]


def bounds(contours):
    pts = [p for c in contours for p in flat_points(c, 8)]
    if not pts:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


OVERHANG = 0.6     # how much of a letter's reach past its middle (an f's tail, a T's bar) is left hanging over its neighbours


class Glyph:
    def __init__(self, contours, width=None, letter=False):
        self.contours = contours
        bb = bounds(contours)
        if width is None:                             # (a drawn letter: its own ink, with room each side)
            left, right = bb[0], bb[2]
            if letter:                                # (spaced by its middle, between the baseline and the x-height, so a
                core = [p[0] for c in contours for p in flat_points(c, 8) if 0 <= p[1] <= XH]   # long tail or a
                if len(core) > 8 and max(core) - min(core) > 0.3 * (bb[2] - bb[0]):           # slant tucks in)
                    left = bb[0] + OVERHANG * (min(core) - bb[0])
                    right = bb[2] - OVERHANG * (bb[2] - max(core))
            self.contours = moved(contours, dx=LSB - left)
            self.width = round(right - left + LSB + RSB)
        else:
            self.width = round(width)
        self.bb = bounds(self.contours)


def without_dot(g):
    """i (or j) with its dot taken off: whatever sits wholly above the x-height, apart from the stem"""
    keep = [c for c in g.contours if bounds([c])[1] < XH * 0.8]
    return Glyph(keep, g.width) if keep and len(keep) < len(g.contours) else None


def with_accent(base, acc, upper, below):
    """a letter with an accent put on it: centred over (or under) the letter's ink, raised for a capital"""
    bb, ab = base.bb, acc.bb
    dx = (bb[0] + bb[2]) / 2 - (ab[0] + ab[2]) / 2
    if below:
        dy = min(0, bb[1] - 10 - ab[3]) if ab[3] > bb[1] + 40 else 0
    else:
        dy = (CAP - XH) if upper else 0
        gap = (ab[1] + dy) - bb[3]
        if gap < 40:                                  # (not touching the letter: lifted clear of it)
            dy += 40 - gap
    return Glyph(base.contours + moved(acc.contours, dx=dx, dy=dy), base.width)


def gname(key):
    """a character (or a pair) -> its glyph's name in the font"""
    if len(key) == 1:
        return 'uni%04X' % ord(key)
    return 'lig_' + '_'.join('%04X' % ord(c) for c in key)


def build(png=None, use=False):
    """the sheet you exported -> the font. -> a report: { file, size, drawn, made, missing, notes }"""
    tools()
    import numpy as np
    from PIL import Image
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.t2CharStringPen import T2CharStringPen
    from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
    if not png:
        have = exports()
        if not have:
            raise ValueError('there\'s no sheet exported into ' + os.path.relpath(FOLDER, ROOT).replace(os.sep, '/') + ' yet: export it as a PNG there')
        png = have[0]
    elif not os.path.isabs(png) and not os.path.exists(png):
        png = os.path.join(FOLDER, os.path.basename(png))
    boxes, W, H, upp, top = sheet_boxes()
    im = Image.open(png)
    im.load()
    iw, ih = im.size
    if abs(iw / ih - W / H) > 0.01:
        raise ValueError(os.path.basename(png) + ' is ' + str(iw) + ' x ' + str(ih) + ': not the sheet\'s shape (' + str(W) + ' x ' + str(H) +
                         '). export the whole canvas, as it is')
    sx, sy = iw / W, ih / H
    ink = inkness(np.asarray(im.convert('RGBA')))
    try:                                               # (where the guide's lines are: so they're never taken for pale writing)
        from PIL import ImageFilter
        g = guide_picture()[0].getchannel('A').resize((iw, ih)).filter(ImageFilter.MaxFilter(5))
        guide = np.asarray(g) > 0
    except Exception:
        guide = None
    t0 = time.time()
    # every box traced: drawn[key] = [Glyph, …] in the order you drew them (an empty box simply isn't there)
    drawn, notes = {}, {'edge': [], 'pale': []}
    for b in boxes:
        contours, n = trace_box(ink, b, upp, top, sx, sy, guide)
        for k in n:
            notes[k].append(b['ch'])
        if contours:
            drawn.setdefault(b['ch'], []).append(Glyph(contours, letter=b['sect'] in ('lower', 'upper', 'pairs') or b['ch'].isdigit()))
    # what's made from what you drew
    made = []

    def make(key, versions):
        if versions and key not in drawn:
            drawn[key] = versions
            made.append(key)
    for a, b in (('\u2019', "'"), ('\u2018', "'"), ("'", '\u2019'), ('\u201d', '"'), ('\u201c', '"'), ('"', '\u201d')):
        make(a, drawn.get(b))
    if '-' in drawn:
        h = drawn['-'][0]
        cx = (h.bb[0] + h.bb[2]) / 2
        make('\u2013', [Glyph(moved(h.contours, sx=1.5, cx=cx))])
        make('\u2014', [Glyph(moved(h.contours, sx=2.4, cx=cx))])
    if '\u2014' in drawn:
        make('\u2013', [Glyph(moved(drawn['\u2014'][0].contours, sx=0.62))])
        make('-', [Glyph(moved(drawn['\u2014'][0].contours, sx=0.4))])
    if '.' in drawn:
        d = drawn['.'][0]
        step = d.width * 0.86
        make('\u2026', [Glyph(d.contours + moved(d.contours, dx=step) + moved(d.contours, dx=2 * step), d.width + 2 * step)])
    for src, dst in (('i', '\u0131'), ('j', '\u0237')):
        if src in drawn:
            v = [g for g in (without_dot(g) for g in drawn[src]) if g]
            if len(v) == len(drawn[src]):
                make(dst, v)
    marks = {comb: acc for acc, _, comb in ACCENTS}
    for cp in list(range(0xC0, 0x180)):
        ch = chr(cp)
        dec = unicodedata.decomposition(ch).split()
        if len(dec) != 2 or dec[0].startswith('<'):
            continue
        base, comb = chr(int(dec[0], 16)), chr(int(dec[1], 16))
        acc = marks.get(comb)
        if not acc or acc not in drawn:
            continue
        if base in 'ij' and comb != '\u0327':
            base = {'i': '\u0131', 'j': '\u0237'}[base]
        if base not in drawn:
            continue
        a = drawn[acc][0]
        make(ch, [with_accent(g, a, base.isupper(), comb == '\u0327') for g in drawn[base]])
    # the spaces: three widths, taken in turn with everything else
    lowers = [g.width for c in 'nouaehs' for g in drawn.get(c, [])]
    sp = max(200, min(420, round(0.6 * statistics.median(lowers)))) if lowers else 280
    # every character: three turns. a letter drawn three times takes its three in turn; drawn twice, its two
    # (1 2 1 …); once, the same each time. (the copies are what carries the count on through the line)
    chars = sorted(k for k in drawn if len(k) == 1)
    pairs = [k for k in PAIRS if k in drawn and all(c in drawn for c in k)]
    order, glyphs, cmap = ['.notdef'], {}, {}
    glyphs['.notdef'] = Glyph([], 500)
    for turn in range(3):
        sfx = '' if turn == 0 else '.s%d' % turn
        glyphs['space' + sfx] = Glyph([], round(sp * (1, 0.88, 1.14)[turn]))
        order.append('space' + sfx)
        for k in chars + pairs:
            v = drawn[k]
            glyphs[gname(k) + sfx] = v[turn % len(v)]
            order.append(gname(k) + sfx)
    cmap[0x20] = 'space'
    cmap[0xA0] = 'space'
    for k in chars:
        if ord(k) not in (0x20,):
            cmap[ord(k)] = gname(k)
    # the outlines
    fb = FontBuilder(UPM, isTTF=False)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    cs, metrics = {}, {}
    for name in order:
        g = glyphs[name]
        pen = T2CharStringPen(g.width, None)
        for c in g.contours:
            for seg in c:
                if seg[0] == 'move':
                    pen.moveTo(rnd(seg[1]))
                elif seg[0] == 'line':
                    pen.lineTo(rnd(seg[1]))
                else:
                    pen.curveTo(rnd(seg[1]), rnd(seg[2]), rnd(seg[3]))
            pen.closePath()
        cs[name] = pen.getCharString()
        metrics[name] = (g.width, round(g.bb[0]) if g.bb else 0)
    ymax = max([g.bb[3] for g in glyphs.values() if g.bb] + [900])
    ymin = min([g.bb[1] for g in glyphs.values() if g.bb] + [-300])
    ps = re.sub(r'[^A-Za-z0-9]', '', FAMILY) + '-Regular'
    fb.setupCFF(ps, {'FullName': FAMILY}, cs, {})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=880, descent=-320)
    fb.setupNameTable({'familyName': FAMILY, 'styleName': 'Regular', 'psName': ps, 'version': 'Version 1.' + time.strftime('%Y%m%d'),
                       'uniqueFontIdentifier': FAMILY + ' ' + time.strftime('%Y-%m-%d %H:%M')})
    fb.setupOS2(sTypoAscender=880, sTypoDescender=-320, sTypoLineGap=0, usWinAscent=round(max(ymax, 880)), usWinDescent=round(max(-ymin, 320)),
                sxHeight=XH, sCapHeight=CAP, fsSelection=0x40 | 0x80, achVendID='NONE', usWeightClass=400, version=4)
    fb.setupPost()
    # the pairs, then the turns (the pairs first: they're made from the letters as they come)
    fea = []
    if pairs:
        fea.append('feature liga {\n' + ''.join('    sub %s by %s;\n' % (' '.join(gname(c) for c in k), gname(k)) for k in pairs) + '} liga;')
    base = ['space'] + [gname(k) for k in chars + pairs]
    fea.append('@t0 = [%s];' % ' '.join(base))
    fea.append('@t1 = [%s];' % ' '.join(n + '.s1' for n in base))
    fea.append('@t2 = [%s];' % ' '.join(n + '.s2' for n in base))
    fea.append('lookup turn1 { sub @t0 by @t1; } turn1;')
    fea.append('lookup turn2 { sub @t0 by @t2; } turn2;')
    fea.append('feature calt {\n    sub @t0 @t0\' lookup turn1;\n    sub @t1 @t0\' lookup turn2;\n} calt;')
    addOpenTypeFeaturesFromString(fb.font, '\n'.join(fea))
    os.makedirs(FOLDER, exist_ok=True)
    otf = os.path.join(FOLDER, STEM + '.otf')
    fb.save(otf)                                       # (to install on your computer, if you like)
    fb.font.flavor = 'woff2'
    woff = os.path.join(FOLDER, '_' + STEM + '.woff2')
    fb.font.save(woff)
    letters = [k for k in chars if k not in made]
    expected = [c for c in LOWER + UPPER + '0123456789']
    report = {'file': woff, 'otf': otf, 'from': os.path.basename(png), 'size': os.path.getsize(woff),
              'drawn': len(letters), 'pairs': pairs, 'made': [m for m in made if len(m) == 1],
              'missing': [c for c in expected if c not in drawn],
              'versions': {c: len(drawn[c]) for c in LOWER + UPPER if c in drawn},
              'edge': sorted(set(notes['edge'])), 'pale': sorted(set(notes['pale'])), 'seconds': round(time.time() - t0, 1)}
    if use:
        report['used'] = put_in_slot(woff)
    return report


def rnd(p):
    return (round(p[0], 1), round(p[1], 1))


def put_in_slot(woff):
    """the font into assets/fonts/ (the same way the asset manager puts anything in a slot)"""
    sys.path.insert(0, HERE)
    import content
    with open(woff, 'rb') as f:
        raw = f.read()
    return content.asset_put(SLOT, STEM + '.woff2', raw, 'font')


def say(r):
    lines = ['the font: ' + os.path.relpath(r['file'], ROOT).replace(os.sep, '/') + ' (' + str(round(r['size'] / 1024)) + ' KB, from ' + r['from'] +
             ', ' + str(r['seconds']) + ' s)']
    lines.append('  ' + str(r['drawn']) + ' characters drawn' + (', and the pairs ' + ' '.join(r['pairs']) if r['pairs'] else ''))
    acc = [m for m in r['made'] if unicodedata.decomposition(m) and not unicodedata.decomposition(m).startswith('<') and m not in '\u0131\u0237']
    other = [m for m in r['made'] if m not in acc]
    if other or acc:
        lines.append('  made from them: ' + ' '.join(other) + (' and ' + str(len(acc)) + ' accented letters (' + ' '.join(acc[:12]) + (' \u2026' if len(acc) > 12 else '') + ')' if acc else ''))
    if r['missing']:
        lines.append('  not drawn (they come out in the usual lettering): ' + ' '.join(r['missing']))
    if r['edge']:
        lines.append('  over the edge of their box (cut off there): ' + ' '.join(r['edge']))
    if r['pale']:
        lines.append('  too pale to read (draw them in a darker colour): ' + ' '.join(r['pale']))
    if r.get('used'):
        lines.append('  put in the slot: assets/fonts/' + r['used'] + '. publish when you\'re ready')
    return '\n'.join(lines)


def main():
    a = sys.argv[1:]
    if not a or a[0] not in ('template', 'build'):
        sys.exit(__doc__)
    as_json = '--json' in a
    try:
        if a[0] == 'template':
            out = template('--fresh' in a)
            for k in ('file', 'folder'):
                out[k] = os.path.relpath(out[k], ROOT).replace(os.sep, '/')
            text = ('made ' if out['made'] else 'already there (--fresh for a new one): ') + out['file'] + \
                   (' (' + str(out['w']) + ' x ' + str(out['h']) + ')' if out.get('w') else '') + '\nsee "what to do.txt" next to it.'
        else:
            rest = [x for x in a[1:] if not x.startswith('--')]
            out = build(rest[0] if rest else None, use='--use' in a)
            text = say(out)
            for k in ('file', 'otf'):
                out[k] = os.path.relpath(out[k], ROOT).replace(os.sep, '/')
    except NeedTools as e:
        out, text = {'error': str(e), 'need': 'fonttools'}, str(e)
    except Exception as e:
        out, text = {'error': str(e) or type(e).__name__}, 'stopped: ' + (str(e) or type(e).__name__)
    if as_json:
        print(json.dumps(out), flush=True)
    else:
        print(text)
    sys.exit(1 if 'error' in out else 0)


if __name__ == '__main__':
    main()
