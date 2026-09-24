#!/usr/bin/env python3
"""
sleeve.py: fetch a song's album cover from Spotify and make it that record's
sleeve on the record player (content/living/<song name>.jpg, under 1 MB).

    on Windows: double-click tools\\sleeve.bat
    anywhere:   python tools/sleeve.py

In Spotify: on the song (or its album), Share -> Copy Song Link, then paste it
here. No login needed. It shows your songs, guesses which one the link is for,
and saves the cover beside it with the same name. Paste as many links as you
like; press Enter on an empty line to finish. Then publish (tools\\publish.bat).

You can also paste a link to any picture, or the path of one on your computer.
It keeps the biggest cover Spotify has (1400 x 1400): as a lossless PNG when
that fits under 1 MB (needs Pillow: pip install pillow), otherwise Spotify's
own JPEG, untouched.
"""
import json, os, re, sys, io, unicodedata
import urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SONGS = os.path.normpath(os.path.join(HERE, '..', 'content', 'living'))
LIMIT = 1024 * 1024 - 1                     # under 1 MB

# how to save the covers (Spotify's covers are JPEGs to begin with):
#   'best' = the full 1400 x 1400 cover: Spotify's own JPEG, untouched (no extra
#            compression at all), or a PNG when a full-size PNG fits under 1 MB
#   'png'  = always a PNG (lossless from here on), made smaller if it has to be
#            to fit under 1 MB (photo-like covers end up around 650-900 px)
FORMAT = 'best'
PICS = ('.jpg', '.jpeg', '.png', '.webp', '.gif')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
try:
    from PIL import Image
except Exception:
    Image = None


def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
        return (data, r.geturl()) if binary else (data.decode('utf-8', 'replace'), r.geturl())


# ---------------- which Spotify thing is this link? ----------------
def spotify_id(link):
    link = link.strip().strip('"\'<>')
    m = re.match(r'spotify:(track|album):([A-Za-z0-9]+)', link)
    if m:
        return m.group(1), m.group(2)
    if re.match(r'https?://(spotify\.link|spoti\.fi)/', link):          # short share links
        _, link = get(link)
    m = re.search(r'open\.spotify\.com/(?:intl-[a-z-]+/)?(?:embed/)?(track|album)/([A-Za-z0-9]+)', link)
    return (m.group(1), m.group(2)) if m else (None, None)


def meta(html, prop):
    m = re.search(r'<meta[^>]+(?:property|name)=["\']' + re.escape(prop) + r'["\'][^>]+content=["\']([^"\']*)', html) or \
        re.search(r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']' + re.escape(prop) + r'["\']', html)
    return unescape(m.group(1)) if m else ''


def unescape(s):
    import html
    return html.unescape(s)


def cover_url(kind, sid):
    """the album cover's address and the song's name, from Spotify's public pages"""
    page = 'https://open.spotify.com/%s/%s' % (kind, sid)
    title, art = '', ''
    try:                                                               # 1. the oEmbed preview
        j = json.loads(get('https://open.spotify.com/oembed?url=' + urllib.parse.quote(page, safe=''))[0])
        title, art = j.get('title') or '', j.get('thumbnail_url') or ''
    except Exception:
        pass
    if not art:                                                        # 2. the page's own preview picture
        try:
            html, _ = get(page)
            art = meta(html, 'og:image')
            title = title or meta(html, 'og:title')
            if not art:
                m = re.search(r'https://[a-z0-9.-]+/image/ab67616d0000[0-9a-f]{4}[0-9a-f]+', html)
                art = m.group(0) if m else ''
        except Exception:
            pass
    if not art:                                                        # 3. the embed player
        try:
            html, _ = get('https://open.spotify.com/embed/%s/%s' % (kind, sid))
            m = re.search(r'https://[a-z0-9.-]+/image/ab67616d0000[0-9a-f]{4}[0-9a-f]+', html)
            art = m.group(0) if m else ''
        except Exception:
            pass
    return art, title


def sizes(art):
    """the same cover in Spotify's sizes, biggest first: 1400, 640, then as given"""
    m = re.search(r'/image/ab67616d0000([0-9a-f]{4})([0-9a-f]+)', art)
    if not m:
        return [art]
    return ['https://i.scdn.co/image/ab67616d0000' + q + m.group(2) for q in ('82c1', 'b273')] + [art]


# ---------------- making it fit ----------------
def best(data):
    """the best copy under 1 MB -> (bytes, '.png' or '.jpg'), or None.
    a PNG at full size if it fits (no further loss); otherwise Spotify's own JPEG,
    untouched; only if that's over 1 MB too is it gently re-saved or shrunk."""
    if Image is not None:
        try:
            im = Image.open(io.BytesIO(data))
            im.load()
            out = io.BytesIO()
            im.convert('RGB').save(out, 'PNG', optimize=True)
            if out.tell() <= LIMIT:
                return out.getvalue(), '.png'
        except Exception:
            pass
    if FORMAT == 'png' and Image is not None:
        im = Image.open(io.BytesIO(data)).convert('RGB')
        side = max(im.size)
        for target in (side, 1200, 1100, 1000, 900, 800, 700, 640, 560, 480):
            if target > side:
                continue
            pic = im if target == side else im.resize((round(im.width * target / side), round(im.height * target / side)), Image.LANCZOS)
            out = io.BytesIO()
            pic.save(out, 'PNG', optimize=True)
            if out.tell() <= LIMIT:
                return out.getvalue(), '.png'
    if len(data) <= LIMIT and data[:2] == b'\xff\xd8':
        return data, '.jpg'
    if Image is None:
        return None
    im = Image.open(io.BytesIO(data)).convert('RGB')
    side = max(im.size)
    for target, q in ((side, 95), (side, 92), (min(side, 1200), 93), (min(side, 1000), 92), (800, 90)):
        pic = im if target == side else im.resize((round(im.width * target / side), round(im.height * target / side)), Image.LANCZOS)
        out = io.BytesIO()
        pic.save(out, 'JPEG', quality=q, optimize=True, subsampling=0)
        if out.tell() <= LIMIT:
            return out.getvalue(), '.jpg'
    return None


def dims(data):
    try:
        if Image is not None:
            return '%d x %d' % Image.open(io.BytesIO(data)).size
    except Exception:
        pass
    return ''


def fetch_cover(link):
    """-> (picture bytes, '.png' or '.jpg', a name to show) or raises"""
    if os.path.isfile(link.strip('"')):                                # a picture on this computer
        path = link.strip('"')
        with open(path, 'rb') as f:
            raw = f.read()
        got = best(raw)
        if not got and len(raw) <= LIMIT:
            got = (raw, os.path.splitext(path)[1].lower() if os.path.splitext(path)[1].lower() in PICS else '.jpg')
        if not got:
            raise ValueError('that picture is over 1 MB (install Pillow to shrink it: pip install pillow)')
        return got[0], got[1], os.path.splitext(os.path.basename(path))[0]
    kind, sid = spotify_id(link)
    if kind:
        art, title = cover_url(kind, sid)
        if not art:
            raise ValueError("couldn't find the cover on Spotify's page (is it a song or album link?)")
        for url in sizes(art):                                         # biggest first: 1400, then 640
            try:
                data, _ = get(url, binary=True)
            except Exception:
                continue
            got = best(data)
            if got:
                return got[0], got[1], title
        raise ValueError('the cover was too big and Pillow isn\'t installed (pip install pillow)')
    if re.match(r'https?://', link):                                   # a link straight to a picture
        data, _ = get(link.strip(), binary=True)
        got = best(data)
        if not got:
            raise ValueError('that picture is over 1 MB (install Pillow to shrink it: pip install pillow)')
        return got[0], got[1], ''
    raise ValueError("that doesn't look like a Spotify link, a picture link, or a file")


# ---------------- which song is it for? ----------------
def plain(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\.[a-z0-9]+$', '', s)
    s = re.sub(r'^\d{4}-\d{2}-\d{2}[-_ ]*', '', s)
    s = re.sub(r'^\d+[-_. ]+', '', s)
    return set(w for w in re.split(r'[^a-z0-9]+', s) if w and w not in ('the', 'a', 'of', 'feat', 'ft', 'remastered', 'remaster'))


def songs():
    files = sorted(f for f in os.listdir(SONGS) if f.lower().endswith(('.mp3', '.ogg')))
    out = []
    for f in files:
        base = os.path.splitext(f)[0]
        has = [base + e for e in PICS if os.path.exists(os.path.join(SONGS, base + e))]
        out.append((f, base, has))
    return out


def guess(title, lst):
    t = plain(title)
    best, score = None, 0
    for i, (f, base, has) in enumerate(lst):
        w = plain(f)
        s = len(t & w) / max(1, len(w | t)) if t and w else 0
        if s > score:
            best, score = i, s
    return best if score >= 0.34 else None


def main():
    print('\n  DaV-nky sleeve maker: album covers for the record player\n')
    if not os.path.isdir(SONGS):
        print('  Can\'t find the songs folder:', SONGS)
        return
    if Image is None:
        print('  (tip: "pip install pillow" lets it save lossless PNGs when they fit under 1 MB; without it you get Spotify\'s original JPEG)\n')
    while True:
        lst = songs()
        if not lst:
            print('  No .mp3 or .ogg songs in content/living/ yet.')
            return
        print('  your songs:')
        for i, (f, base, has) in enumerate(lst, 1):
            print('   %2d. %-44s %s' % (i, f, '(has a sleeve)' if has else '(no sleeve yet)'))
        try:
            link = input('\n  Paste a Spotify song link (Share > Copy Song Link), or just Enter to finish:\n  > ').strip()
        except EOFError:
            return
        if not link:
            print('\n  All done. Run tools\\publish.bat to put them on the site.\n')
            return
        try:
            print('  fetching...')
            data, ext, title = fetch_cover(link)
        except Exception as e:
            print('  Sorry:', e, '\n')
            continue
        g = guess(title, lst)
        d = dims(data)
        print('  found the cover%s: %s%s, %d KB' % (' for "' + title + '"' if title else '', (d + ' ') if d else '', 'PNG' if ext == '.png' else 'JPEG (Spotify\'s original)', len(data) // 1024))
        prompt = '  Which song is it for? number' + (' (Enter = %d, %s)' % (g + 1, lst[g][0]) if g is not None else '') + ': '
        ans = input(prompt).strip()
        if not ans and g is not None:
            n = g
        elif ans.isdigit() and 1 <= int(ans) <= len(lst):
            n = int(ans) - 1
        else:
            print('  Skipped.\n')
            continue
        f, base, has = lst[n]
        if has and input('  %s already has a sleeve. Replace it? (y/N): ' % f).strip().lower() != 'y':
            print('  Kept the old one.\n')
            continue
        for old in has:                                        # one sleeve per song
            os.remove(os.path.join(SONGS, old))
        path = os.path.join(SONGS, base + ext)
        with open(path, 'wb') as out:
            out.write(data)
        print('  Saved content/living/%s%s\n' % (base, ext))


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print()
