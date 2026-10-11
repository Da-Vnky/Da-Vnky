#!/usr/bin/env python3
"""
content.py: the content manager. Everything on the site that's yours to
change, in your browser:
  - your letters on the homepage (content/sea/): write, edit, delete, preview
  - your own things: easel paintings (content/workshop/), city window scenes
    (content/city/) and records (content/living/): add, caption, delete
  - visitors' post: bottles and art from FormSubmit to keep or throw back,
    bottles to pin / pile / put back, art to hang in the living space's frames
  - notes: the to-do list and notes on the workshop's clipboard
  - assets: every picture and sound slot on the site, to fill, replace or clear

    on Windows: double-click tools\\content.bat
    mac/linux:  sh tools/content.sh   (or VS Code: Terminal > Run Task > "DaV-nky: content manager")
    anywhere:   python tools/content.py

It opens http://localhost:8001/ . Everything stays on your computer until you
press "publish" (or run tools\\publish.bat, or sh tools/publish.sh). Close the black window to stop it.
"""
import datetime, hashlib, http.server, json, os, re, subprocess, sys, threading, unicodedata, urllib.error, urllib.parse, urllib.request, webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SEA = os.path.join(ROOT, 'content', 'sea')
PORT = 8001
LETTER = re.compile(r'^[\w .,()\'&!+-]+\.(txt|html)$', re.I)
PICTURE_TYPES = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg'}
PICTURE_LIMIT = 4 * 1024 * 1024

# the post office: bottles and art from visitors, fetched from FormSubmit into a private inbox
# (.inbox/ is never published: it's in .gitignore). keep one and it goes onto the site.
BOTTLES = os.path.join(ROOT, 'content', 'living', 'bottles')
ART = os.path.join(ROOT, 'content', 'workshop', 'visitors')
INBOX = os.path.join(ROOT, '.inbox')
FOLDERS = {'bottles': BOTTLES, 'art': ART}
SHOWN = re.compile(r'\.(txt|html|png|jpe?g|gif|webp|svg)$', re.I)
# the walls with picture frames. each keeps its own list, content/<wall>/frames.json; a name alone in
# it is from the wall's own folder, a path (content/frames/x.png) works on any wall.
# a frame belongs to a wall by its page and data-wall (<div class="gallery-frame" data-wall="shame" …>)
WALLS = {
    'living':   {'label': 'living space',  'page': 'living.html',   'folder': 'content/workshop/visitors/'},
    'workshop': {'label': 'workshop',      'page': 'workshop.html', 'folder': 'content/workshop/'},
    'shame':    {'label': 'hall of shame', 'page': 'living.html',   'folder': 'content/workshop/visitors/'},
}
ROOMS = tuple(WALLS)

# your own things: folder, the kinds of file it holds
SHELVES = {
    'easel': (os.path.join(ROOT, 'content', 'workshop'), 'png jpg jpeg webp gif svg mp4 webm'),
    'city':  (os.path.join(ROOT, 'content', 'city'), 'png jpg jpeg webp gif svg mp4 webm html'),
    'music': (os.path.join(ROOT, 'content', 'living'), 'mp3 ogg'),
    # pictures for the walls: hidden (never on the easel or anywhere else), only for hanging in frames
    'walls': (os.path.join(ROOT, 'content', 'frames'), 'png jpg jpeg webp gif svg'),
}
# the books on the living space's shelf (the decoys around the one that opens the dungeon): each one's pages.
# (the server doesn't take .pdf files, so a PDF is added as one picture per page: see shelves.html)
BOOKS = 4
for _n in range(1, BOOKS + 1):
    SHELVES['book-%d' % _n] = (os.path.join(ROOT, 'content', 'books', 'book-%d' % _n), 'png jpg jpeg webp gif svg mp4 webm')
# the grimoire: from reset 5 on it sits on the shelf too (sky/books.js), its pages like any book's
SHELVES['book-grimoire'] = (os.path.join(ROOT, 'content', 'books', 'grimoire'), 'png jpg jpeg webp gif svg mp4 webm')


def book_title(which):
    p = os.path.join(SHELVES[which][0], 'title.txt')
    try:
        with open(p, encoding='utf-8') as f:
            return f.read().strip()
    except Exception:
        return ''


def set_book_title(which, text):
    folder = SHELVES[which][0]
    os.makedirs(folder, exist_ok=True)
    text = (text or '').strip()[:80]
    p = os.path.join(folder, 'title.txt')
    if text:
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text + '\n')
    elif os.path.exists(p):
        os.remove(p)
    write_list(folder)
PICS = ('png', 'jpg', 'jpeg', 'webp', 'gif', 'svg')
UPLOAD_LIMIT = 30 * 1024 * 1024


def slug(text):
    text = unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')[:50] or 'letter'


def title_of(name, text):
    if name.lower().endswith('.html'):
        m = re.search(r'<h[12][^>]*>(.*?)</h[12]>', text, re.I | re.S)
        return re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else ''
    for line in text.replace('\r', '').split('\n'):
        if line.strip():
            return re.sub(r'^#+\s*', '', line.strip())
    return ''


def date_of(name):
    m = re.match(r'^(\d{4}-\d{2}-\d{2})', name)
    return m.group(1) if m else ''


def read(name):
    with open(os.path.join(SEA, name), encoding='utf-8', errors='replace') as f:
        return f.read()


def write_list(folder=SEA):
    """<folder>/list.txt, the same as tools/update-lists.sh writes it"""
    if os.path.normcase(os.path.abspath(folder)) == os.path.normcase(os.path.abspath(SHELVES['music'][0])):
        write_albums()                                 # (the record player's folder: its albums.txt first, so list.txt has it)
    names = sorted(n for n in os.listdir(folder)
                   if os.path.isfile(os.path.join(folder, n)) and n != 'list.txt'
                   and not n.lower().startswith('readme') and not n.startswith(('.', '_')))
    with open(os.path.join(folder, 'list.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write("# written by tools/update-lists.sh: every file in this folder.\n# no need to edit it; it's rewritten each commit.\n")
        for n in names:
            f.write(n + '\n')


def safe(name):
    if not name or not LETTER.match(name) or os.path.basename(name) != name:
        raise ValueError('that isn\'t a letter file')
    return name


def letters():
    today = datetime.date.today().isoformat()
    out = []
    for n in os.listdir(SEA):
        if not LETTER.match(n) or n == 'list.txt' or n.lower().startswith('readme'):
            continue
        d = date_of(n)
        out.append({'name': n, 'date': d, 'title': title_of(n, read(n)) or n, 'kind': n.rsplit('.', 1)[1].lower(),
                    'later': bool(d and d > today)})
    out.sort(key=lambda l: (l['date'] or '0000', l['name']), reverse=True)
    return out


def save(data):
    old = data.get('old') or None
    if old:
        safe(old)
    kind = 'html' if data.get('kind') == 'html' else 'txt'
    date = data.get('date') or ''
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
        raise ValueError('pick a date for the letter')
    title = (data.get('title') or '').strip().replace('\n', ' ')
    body = (data.get('body') or '').replace('\r\n', '\n').strip('\n')
    if kind == 'txt':
        if not title:
            raise ValueError('give the letter a title (its first line)')
        sub = (data.get('subtitle') or '').strip().replace('\n', ' ')
        text = title + ('\n' + sub if sub else '') + '\n\n' + body + '\n'
    else:
        text = body + '\n'
        title = title or title_of('x.html', body) or 'letter'
    if old:
        # an existing letter keeps its file name (visitors' browsers know it by name, so a new name would
        # make it wash up in a bottle again); only a new date changes the date at the front
        kind = old.rsplit('.', 1)[1].lower()
        rest = re.sub(r'^\d{4}-\d{2}-\d{2}-?', '', old.rsplit('.', 1)[0])
        base = date + ('-' + rest if rest else '')
    else:
        base = date + '-' + slug(title)
    name, i = base + '.' + kind, 2
    while os.path.exists(os.path.join(SEA, name)) and name != old:
        name, i = base + '-' + str(i) + '.' + kind, i + 1
    with open(os.path.join(SEA, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    if old and old != name and os.path.exists(os.path.join(SEA, old)):
        os.remove(os.path.join(SEA, old))
    write_list()
    return name


# ---------------- the post office ----------------
def inbox_path(*parts):
    os.makedirs(INBOX, exist_ok=True)
    return os.path.join(INBOX, *parts)


def load_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=1)


def key():
    try:
        with open(inbox_path('key.txt'), encoding='utf-8') as f:
            return f.read().strip()
    except Exception:
        return ''


def unique(folder, stem, ext):
    name, i = stem + ext, 2
    while os.path.exists(os.path.join(folder, name)):
        name, i = stem + '-' + str(i) + ext, i + 1
    return name


# ---------------- your post office on Supabase ----------------
def supabase():
    c = load_json(inbox_path('supabase.json'), {}) if os.path.isdir(INBOX) else {}
    return c if c.get('url') and c.get('secret') else None


def sb_request(method, path, body=None, headers=None, conf=None):
    c = conf or supabase()
    h = {'apikey': c['secret'], 'User-Agent': 'DaV-nky content manager'}
    if c['secret'].startswith('eyJ'):                            # an older "service_role" key
        h['Authorization'] = 'Bearer ' + c['secret']
    h.update(headers or {})
    req = urllib.request.Request(c['url'].rstrip('/') + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read(), (r.headers.get('Content-Type') or '')
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:300]
        if e.code in (401, 403):
            raise ValueError('Supabase said no: is that the SECRET key (sb_secret_…)? (' + detail + ')')
        if e.code == 404 or 'post' in detail and 'does not exist' in detail:
            raise ValueError('Supabase can\'t find the post table: run tools/supabase-setup.sql in its SQL Editor first. (' + detail + ')')
        raise ValueError('Supabase: ' + str(e.code) + ' ' + detail)
    except urllib.error.URLError as e:
        raise ValueError('couldn\'t reach Supabase (' + str(e.reason) + '). if the project was paused for a quiet week, open supabase.com and restore it.')


# ---------------- a ping on your phone when post arrives (ntfy.sh + a Supabase trigger) ----------------
def notify_state():
    c = load_json(inbox_path('notify.json'), {}) if os.path.isdir(INBOX) else {}
    topic = c.get('topic') or ''
    sql = ''
    if topic:
        with open(os.path.join(HERE, 'supabase-notify.sql'), encoding='utf-8') as f:
            sql = f.read().replace('{{TOPIC}}', topic)
        sql = ('-- DaV-nky: a notification on your phone when a visitor sends something.\n'
               '-- your own topic is filled in below. run this once in Supabase\'s SQL Editor.\n'
               '-- to switch it off later: drop trigger if exists dav_notify on public.post;\n\n') + sql[sql.find('create extension'):]
    return {'topic': topic, 'sql': sql, 'tested': c.get('tested', 0)}


def notify_setup(fresh=False):
    import secrets
    os.makedirs(INBOX, exist_ok=True)
    c = load_json(inbox_path('notify.json'), {})
    if fresh or not c.get('topic'):                          # long and random: anyone who knew the name could read it
        c['topic'] = 'dav-nky-' + secrets.token_urlsafe(18).replace('_', 'x').replace('-', 'y').lower()
        c['tested'] = 0
    save_json(inbox_path('notify.json'), c)
    return notify_state()


def notify_test():
    c = load_json(inbox_path('notify.json'), {})
    if not c.get('topic'):
        raise ValueError('set up notifications first')
    body = json.dumps({'topic': c['topic'], 'title': 'DaV-nky: a test', 'message': 'if you can read this on your phone, notifications work.', 'tags': ['tada']}).encode('utf-8')
    req = urllib.request.Request('https://ntfy.sh/', data=body, method='POST', headers={'Content-Type': 'application/json', 'User-Agent': 'DaV-nky content manager'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
    except urllib.error.URLError as e:
        raise ValueError('couldn\'t reach ntfy.sh (' + str(getattr(e, 'reason', e)) + ')')
    c['tested'] = int(datetime.datetime.now().timestamp())
    save_json(inbox_path('notify.json'), c)
    return notify_state()


def connect_supabase(url, secret):
    url = (url or '').strip().rstrip('/')
    secret = (secret or '').strip()
    if not re.match(r'^https://[a-z0-9-]+\.supabase\.(co|in)$|^http://(localhost|127\.0\.0\.1):\d+$', url):
        raise ValueError('the project URL looks like https://abcdefgh.supabase.co')
    if secret.startswith('sb_publishable') or not secret:
        raise ValueError('that\'s the publishable key: the content manager needs the SECRET one (sb_secret_…)')
    conf = {'url': url, 'secret': secret}
    sb_request('GET', '/rest/v1/post?select=id&limit=1', conf=conf)          # does it work?
    save_json(inbox_path('supabase.json'), conf)


def fetch_supabase():
    raw, _ = sb_request('GET', '/rest/v1/post?select=*&order=created_at.desc&limit=500')
    rows = json.loads(raw.decode('utf-8'))
    seen = set(load_json(inbox_path('seen.json'), []))
    new = 0
    for row in rows:
        sid = row['id'].replace('-', '')[:16]
        if sid in seen:                                          # handled already: tidy it out of Supabase
            forget_remote({'sb_id': row['id'], 'sb_path': row.get('file_path')})
            continue
        old = load_json(inbox_path(sid + '.json'), None)
        if old and (old.get('picture') or not row.get('file_path')):
            continue
        item = {'id': sid, 'kind': row.get('kind') or 'bottle', 'date': (row.get('created_at') or '')[:10],
                'from': (row.get('from_name') or '').strip(), 'text': (row.get('message') or '').strip(),
                'title': (row.get('title') or '').strip(), 'picture': '', 'sb_id': row['id'], 'sb_path': row.get('file_path') or ''}
        if item['sb_path']:
            try:
                data, ctype = sb_request('GET', '/storage/v1/object/authenticated/post/' + urllib.parse.quote(item['sb_path']))
                ext = os.path.splitext(item['sb_path'])[1].lower() or '.jpg'
                with open(inbox_path(sid + ext), 'wb') as f:
                    f.write(data)
                item['picture'] = sid + ext
            except Exception:
                pass
        item['only_email'] = False
        item['missing'] = bool(item['sb_path'] and not item['picture'])
        save_json(inbox_path(sid + '.json'), item)
        if not old:
            new += 1
    st = load_json(inbox_path('state.json'), {})
    st['last_ok'] = datetime.datetime.now().timestamp()
    save_json(inbox_path('state.json'), st)
    return new


def forget_remote(item):
    """once you've kept or thrown back a piece of post, it's deleted from Supabase (keeps the free space free)"""
    if not item or not item.get('sb_id') or not supabase():
        return
    try:
        if item.get('sb_path'):
            sb_request('DELETE', '/storage/v1/object/post/' + urllib.parse.quote(item['sb_path']))
        sb_request('DELETE', '/rest/v1/post?id=eq.' + urllib.parse.quote(item['sb_id']), headers={'Prefer': 'return=minimal'})
    except Exception:
        pass                                                     # it'll be tidied on the next check


def fetch_post():
    """collect new post: from Supabase if it's connected, otherwise ask FormSubmit"""
    if supabase():
        return fetch_supabase()
    return fetch_formsubmit()


def fetch_formsubmit():
    """ask FormSubmit for everything sent; anything new lands in the inbox"""
    k = key()
    if not k:
        raise ValueError('add your FormSubmit API key first')
    st = load_json(inbox_path('state.json'), {})
    now = datetime.datetime.now().timestamp()
    if st.get('next_ok', 0) > now:
        when = datetime.datetime.fromtimestamp(st['next_ok']).strftime('%A %I:%M %p').lower().replace(' 0', ' ')
        raise ValueError('FormSubmit only lets you check a few times a day. the next check can be ' + when +
                         '. (everything still arrives by email meanwhile)')
    req = urllib.request.Request(os.environ.get('FORMSUBMIT_API', 'https://formsubmit.co/api/get-submissions/') + urllib.parse.quote(k),
                                 headers={'User-Agent': 'DaV-nky content manager', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8', 'replace'))
    if not data.get('success', True) and not data.get('submissions'):
        msg = data.get('message') or 'FormSubmit said no (is the API key right?)'
        m = re.search(r'(\d+)\s*hour', msg)
        if m or 'too much' in msg:                               # its daily limit: remember when to try again
            st['next_ok'] = now + (int(m.group(1)) if m else 24) * 3600 + 120
            save_json(inbox_path('state.json'), st)
            when = datetime.datetime.fromtimestamp(st['next_ok']).strftime('%A %I:%M %p').lower().replace(' 0', ' ')
            raise ValueError('FormSubmit only lets you check a few times a day, and today\'s are used up. the next check can be ' + when + '.')
        raise ValueError(msg)
    st['last_ok'] = now
    st.pop('next_ok', None)
    save_json(inbox_path('state.json'), st)
    save_json(inbox_path('last-response.json'), data)             # a private copy of what FormSubmit sent (for checking)
    seen = set(load_json(inbox_path('seen.json'), []))
    new = 0
    for sub in data.get('submissions') or []:
        form = sub.get('form_data') or {}
        when = (sub.get('submitted_at') or {}).get('date', '') if isinstance(sub.get('submitted_at'), dict) else str(sub.get('submitted_at') or '')
        sid = hashlib.sha1((when + json.dumps(form, sort_keys=True)).encode('utf-8')).hexdigest()[:16]
        if sid in seen:
            continue
        old = load_json(inbox_path(sid + '.json'), None)
        if old and old.get('picture'):
            continue
        kind = 'art' if 'title' in form or 'keep it' in form else 'bottle'
        item = {'id': sid, 'kind': kind, 'date': when[:10], 'from': (form.get('from') or '').strip(),
                'text': (form.get('message') or '').strip(), 'title': (form.get('title') or '').strip(), 'picture': ''}
        if item['from'] == '(no name)':
            item['from'] = ''
        if item['title'] == '(untitled)':
            item['title'] = ''
        item['picture'] = grab_picture(sid, form)
        item['only_email'] = not item['picture'] and (kind == 'art' or item['text'] in ('', '(a drawing or picture)'))
        save_json(inbox_path(sid + '.json'), item)
        if not old:
            new += 1
    return new


def links_in(v):
    """every web address in a form value (a string, or a list / object of them)"""
    if isinstance(v, str):
        return re.findall(r'https?://[^\s"\'<>]+', v)
    if isinstance(v, (list, tuple)):
        return [u for x in v for u in links_in(x)]
    if isinstance(v, dict):
        return [u for x in v.values() for u in links_in(x)]
    return []


def download_picture(url, sid, depth=0):
    """fetch a picture from a link; if the link is a web page (as email attachment links can be), find the picture on it"""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DaV-nky content manager'})
    with urllib.request.urlopen(req, timeout=30) as r:
        ctype = (r.headers.get('Content-Type') or '').split(';')[0].strip().lower()
        final = r.geturl()
        raw = r.read(PICTURE_LIMIT + 1)
    ext = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp'}.get(ctype)
    if not ext and ctype in ('', 'application/octet-stream', 'binary/octet-stream'):
        m = re.search(r'\.(png|jpe?g|gif|webp)(\?|$)', final, re.I)
        ext = '.' + m.group(1).lower().replace('jpeg', 'jpg') if m else None
    if ext:
        if len(raw) > PICTURE_LIMIT:
            raise ValueError('that picture is over 4 MB')
        with open(inbox_path(sid + ext), 'wb') as f:
            f.write(raw)
        return sid + ext
    if 'html' in ctype and depth < 2:                            # a page: its picture, or its download link
        page = raw.decode('utf-8', 'replace')
        found = re.findall(r'<meta[^>]+(?:og:image|twitter:image)[^>]+content=["\']([^"\']+)', page, re.I) + \
            re.findall(r'<a[^>]+href=["\']([^"\']+\.(?:png|jpe?g|gif|webp)(?:\?[^"\']*)?)["\']', page, re.I) + \
            re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', page, re.I) + \
            re.findall(r'<a[^>]+href=["\']([^"\']*download[^"\']*)["\']', page, re.I)
        for f in found:
            nxt = urllib.parse.urljoin(final, f.replace('&amp;', '&'))
            if nxt.startswith('data:') or re.search(r'logo|icon|favicon|sprite', nxt, re.I):
                continue
            try:
                got = download_picture(nxt, sid, depth + 1)
                if got:
                    return got
            except Exception:
                continue
    return ''


def attach_link(sid, url):
    """a picture link pasted from the email: fetch it for that piece of post"""
    sid = re.sub(r'[^a-f0-9]', '', sid or '')
    item = load_json(inbox_path(sid + '.json'), None)
    if not item:
        raise ValueError('that one isn\'t in the inbox any more')
    url = (url or '').strip()
    if not re.match(r'^https?://', url):
        raise ValueError('paste the picture\'s link (it starts with https://)')
    got = download_picture(url, sid)
    if not got:
        raise ValueError('couldn\'t find a picture at that link. try right-clicking the picture itself in the email and "copy image address"')
    item['picture'] = got
    item['only_email'] = False
    save_json(inbox_path(sid + '.json'), item)
    return got


def grab_picture(sid, form):
    """a picture that came along as a link (FormSubmit may send attachments that way): download the first one that is an image"""
    for k, v in form.items():
        if k in ('page', 'form_url', '_next'):
            continue
        for u in links_in(v):
            if re.search(r'pleroma\.nexus/?$|\.html?(\?|$)', u):
                continue
            try:
                got = download_picture(u, sid)
                if got:
                    return got
            except Exception:
                continue
    return ''


def inbox_items():
    if not os.path.isdir(INBOX):
        return []
    items = [load_json(os.path.join(INBOX, n), None) for n in os.listdir(INBOX) if re.match(r'^[a-f0-9]{16}\.json$', n)]
    return sorted([i for i in items if i], key=lambda i: i.get('date', ''), reverse=True)


def done_with(sid):
    forget_remote(load_json(inbox_path(sid + '.json'), None))
    seen = load_json(inbox_path('seen.json'), [])
    if sid not in seen:
        seen.append(sid)
    save_json(inbox_path('seen.json'), seen)
    for n in os.listdir(INBOX):
        if n.startswith(sid + '.'):
            os.remove(os.path.join(INBOX, n))


def keep(sid):
    item = load_json(inbox_path(re.sub(r'[^a-f0-9]', '', sid) + '.json'), None)
    if not item:
        raise ValueError('that one isn\'t in the inbox any more')
    date = item.get('date') or datetime.date.today().isoformat()
    who = item.get('from') or ''
    if item.get('sb_path') and not item.get('picture'):
        raise ValueError('its picture hasn\'t downloaded from Supabase yet: press "check for new post" again')
    if item['kind'] == 'art':
        if not item.get('picture'):
            raise ValueError('the picture only came by email: save the attachment from that email into content/workshop/visitors/')
        stem = date + '-' + slug(item.get('title') or 'untitled') + ('-by-' + slug(who) if who else '')
        name = unique(ART, stem, os.path.splitext(item['picture'])[1])
        os.replace(inbox_path(item['picture']), os.path.join(ART, name))
        folder = ART
    else:
        stem = date + '-' + (('from-' + slug(who)) if who else 'a-bottle')
        if item.get('picture'):
            name = unique(BOTTLES, stem, os.path.splitext(item['picture'])[1])
            os.replace(inbox_path(item['picture']), os.path.join(BOTTLES, name))
        else:
            text = item.get('text') or ''
            if not text or text == '(a drawing or picture)':
                raise ValueError('this bottle was a drawing or picture, which only came by email: save the .jpg from that email into content/living/bottles/')
            name = unique(BOTTLES, stem, '.txt')
            with open(os.path.join(BOTTLES, name), 'w', encoding='utf-8', newline='\n') as f:
                f.write('a message in a bottle\n\n' + text.replace('\r\n', '\n').strip() + ('\n\n~ ' + who if who else '') + '\n')
        folder = BOTTLES
    write_list(folder)
    done_with(item['id'])
    return name


def site_files(which):
    folder = FOLDERS[which]
    if not os.path.isdir(folder):
        return []
    out = [{'name': n, 'url': '/' + os.path.relpath(os.path.join(folder, n), ROOT).replace(os.sep, '/'), 'date': date_of(n)}
           for n in os.listdir(folder) if SHOWN.search(n) and n != 'list.txt' and not n.startswith(('.', '_'))]
    return sorted(out, key=lambda f: (f['date'] or '0000', f['name']), reverse=True)


def board():
    b = load_json(os.path.join(BOTTLES, 'board.json'), None)
    if not isinstance(b, dict):
        b = {}
    b['pinned'] = [n for n in b.get('pinned') or [] if isinstance(n, str)]
    b['pile'] = [n for n in b.get('pile') or [] if isinstance(n, str)]
    return b


def place_bottle(name, where):
    """pin a bottle to the board, put it on the pile, or back in the crate (content/living/bottles/board.json)"""
    if not name or os.path.basename(name) != name or not os.path.exists(os.path.join(BOTTLES, name)):
        raise ValueError('that bottle isn\'t in the bottles folder')
    if where not in ('pinned', 'pile', 'crate'):
        raise ValueError('pin, pile or crate?')
    b = board()
    b['pinned'] = [n for n in b['pinned'] if n != name]
    b['pile'] = [n for n in b['pile'] if n != name]
    if where == 'pinned':
        b['pinned'].insert(0, name)
    elif where == 'pile':
        b['pile'].insert(0, name)
    with open(os.path.join(BOTTLES, 'board.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(b, f, indent=2)
    return where


def delete_site_file(which, name):
    folder = FOLDERS[which]
    if not name or os.path.basename(name) != name or not SHOWN.search(name):
        raise ValueError('that isn\'t one of the files')
    os.remove(os.path.join(folder, name))
    if which == 'art':
        unhang_everywhere('content/workshop/visitors/' + name)
    if which == 'bottles':                                       # take it off the board and the pile too
        bj = os.path.join(BOTTLES, 'board.json')
        board = load_json(bj, None)
        if isinstance(board, dict):
            for k in ('pinned', 'pile'):
                if isinstance(board.get(k), list):
                    board[k] = [n for n in board[k] if n != name]
            with open(bj, 'w', encoding='utf-8', newline='\n') as f:
                json.dump(board, f, indent=2)
    write_list(folder)


# ---------------- the frames on the walls ----------------
def frame_numbers(room='living'):
    """the frame numbers on one wall, read from its page"""
    wall = WALLS.get(room)
    if not wall:
        return []
    home = os.path.splitext(wall['page'])[0]
    try:
        with open(os.path.join(ROOT, wall['page']), encoding='utf-8') as f:
            text = f.read()
    except Exception:
        return []
    out = set()
    for tag in re.findall(r'<div[^>]*\bgallery-frame\b[^>]*>', text):
        n = re.search(r'data-frame="(\d+)"', tag)
        w = re.search(r'data-wall="([a-z0-9-]+)"', tag)
        if n and (w.group(1) if w else home) == room:
            out.add(int(n.group(1)))
    return sorted(out)


def frames_file(room):
    return os.path.join(ROOT, 'content', room, 'frames.json')


def frames(room='living'):
    m = load_json(frames_file(room), {})
    return {str(k): v for k, v in m.items() if isinstance(v, str)} if isinstance(m, dict) else {}


def wall_ref(path, room):
    """how a wall's frames.json names a picture: a name alone if it's in the wall's own folder"""
    folder = WALLS[room]['folder']
    rest = path[len(folder):] if path.startswith(folder) else None
    return rest if rest and '/' not in rest else path


def frame_names(room):
    """a frame with a name of its own (data-frame-name="the record"): shown beside its number in the manager"""
    wall = WALLS.get(room)
    try:
        with open(os.path.join(ROOT, wall['page']), encoding='utf-8') as f:
            text = f.read()
    except Exception:
        return {}
    out = {}
    home = os.path.splitext(wall['page'])[0]
    for tag in re.findall(r'<div[^>]*\bgallery-frame\b[^>]*>', text):
        n = re.search(r'data-frame="(\d+)"', tag)
        w = re.search(r'data-wall="([a-z0-9-]+)"', tag)
        nm = re.search(r'data-frame-name="([^"]{1,40})"', tag)
        if n and nm and (w.group(1) if w else home) == room:
            out[n.group(1)] = nm.group(1)
    return out


def walls_state():
    return [{'id': k, 'label': w['label'], 'numbers': frame_numbers(k), 'names': frame_names(k), 'frames': frames(k)} for k, w in WALLS.items()]


def moved(old_path, new_path):
    """a picture changed folders: every frame it hangs in keeps it"""
    for room in ROOMS:
        old, new = wall_ref(old_path, room), wall_ref(new_path, room)
        for k, v in list(frames(room).items()):
            if v == old:
                hang(new, k, room)


def unhang_everywhere(path):
    for room in ROOMS:
        hang(wall_ref(path, room), None, room)


def hang(what, frame, room='living'):
    """put a picture in a frame of a room ('' takes a frame's picture down); a picture hangs in one frame per room"""
    if room not in ROOMS:
        raise ValueError('which room?')
    m = frames(room)
    for k in list(m):
        if m[k] == what:
            m[k] = ''
    if frame:
        m[str(int(frame))] = what
    if not m and not os.path.exists(frames_file(room)):
        return
    os.makedirs(os.path.dirname(frames_file(room)), exist_ok=True)
    with open(frames_file(room), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dict(sorted(m.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 0)), f, indent=2)


# ---------------- your own things ----------------
def shelf(which):
    folder, kinds = SHELVES[which]
    kinds = kinds.split()
    if not os.path.isdir(folder):
        return []
    files = [n for n in os.listdir(folder) if os.path.isfile(os.path.join(folder, n)) and not n.startswith(('.', '_')) and n != 'list.txt']
    rel = '/' + os.path.relpath(folder, ROOT).replace(os.sep, '/') + '/'
    out = []
    for n in files:
        stem, ext = os.path.splitext(n)
        if ext[1:].lower() not in kinds:
            continue
        item = {'name': n, 'url': rel + urllib.parse.quote(n), 'date': date_of(n), 'kind': ext[1:].lower(), 'path': rel[1:] + n}
        cap = os.path.join(folder, stem + '.txt')
        if which != 'music' and os.path.exists(cap):
            with open(cap, encoding='utf-8', errors='replace') as f:
                item['caption'] = f.read().strip()
        if which == 'music':
            for e in PICS:
                if stem + '.' + e in files:
                    item['sleeve'] = rel + urllib.parse.quote(stem + '.' + e)
                    break
        if which == 'easel':
            item['hang'] = 'content/workshop/' + n            # as the living space names it
            item['hangHere'] = n                              # as the workshop names it (its own folder)
        if which == 'walls':
            item['hang'] = item['hangHere'] = 'content/frames/' + n
        out.append(item)
    if which == 'music' or which.startswith('book-'):                # (a book's pages: in file-name order)
        return sorted(out, key=lambda i: i['name'].lower())
    return sorted(out, key=lambda i: (i['date'] or '0000', i['name']), reverse=True)


def clean_name(name, allowed):
    stem, ext = os.path.splitext(os.path.basename(name or ''))
    ext = ext.lower()
    if ext[1:] not in allowed:
        raise ValueError('that kind of file can\'t go there (' + ', '.join(allowed) + ')')
    stem = re.sub(r'[\\/:*?"<>|]+', '', stem).strip().strip('.') or 'untitled'
    return stem[:80], ext


def shelf_add(which, name, raw, sleeve_for=None):
    folder, kinds = SHELVES[which]
    if len(raw) > UPLOAD_LIMIT:
        raise ValueError('that file is over 30 MB')
    if sleeve_for:                                   # a sleeve: the song's name, the picture's type
        song = os.path.basename(sleeve_for)
        if not os.path.exists(os.path.join(folder, song)):
            raise ValueError('that song isn\'t there')
        stem = os.path.splitext(song)[0]
        ext = os.path.splitext(name or '')[1].lower()
        if ext[1:] not in PICS:
            raise ValueError('a sleeve is a picture (png, jpg, webp, gif)')
        for e in PICS:
            p = os.path.join(folder, stem + '.' + e)
            if os.path.exists(p):
                os.remove(p)
        final = stem + ext
    else:
        stem, ext = clean_name(name, kinds.split())
        if which.startswith('book-'):                # a book's new page goes at the back: numbered, so the order holds
            stem = '%03d-%s' % (len(shelf(which)) + 1, re.sub(r'^\d{3}-', '', stem))
        final = unique(folder, stem, ext)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, final), 'wb') as f:
        f.write(raw)
    write_list(folder)
    return final


def shelf_caption(which, name, text):
    folder = SHELVES[which][0]
    if which == 'music' or os.path.basename(name) != name or not os.path.exists(os.path.join(folder, name)):
        raise ValueError('no caption for that one')
    cap = os.path.join(folder, os.path.splitext(name)[0] + '.txt')
    text = (text or '').strip()
    if text:
        with open(cap, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text + '\n')
    elif os.path.exists(cap):
        os.remove(cap)
    write_list(folder)


def book_move(which, name, by):
    """move a page of a book up or down; every page is renumbered 001-, 002- … (its caption goes with it)"""
    folder = SHELVES[which][0]
    names = [i['name'] for i in shelf(which)]
    if name not in names:
        raise ValueError('that page isn\'t there')
    i = names.index(name)
    j = max(0, min(len(names) - 1, i + (1 if by > 0 else -1)))
    names[i], names[j] = names[j], names[i]
    moves = []
    for k, n in enumerate(names):
        stem, ext = os.path.splitext(n)
        moves.append((stem, ext, '%03d-%s' % (k + 1, re.sub(r'^\d{3}-', '', stem))))
    for stem, ext, new in moves:                      # (by way of temporary names, so none trips over another)
        for e in (ext, '.txt'):
            if os.path.exists(os.path.join(folder, stem + e)):
                os.rename(os.path.join(folder, stem + e), os.path.join(folder, '__mv-' + new + e))
    for stem, ext, new in moves:
        for e in (ext, '.txt'):
            if os.path.exists(os.path.join(folder, '__mv-' + new + e)):
                os.rename(os.path.join(folder, '__mv-' + new + e), os.path.join(folder, new + e))
    write_list(folder)


def shelf_delete(which, name):
    folder = SHELVES[which][0]
    if not name or os.path.basename(name) != name or not os.path.exists(os.path.join(folder, name)):
        raise ValueError('that file isn\'t there')
    stem = os.path.splitext(name)[0]
    os.remove(os.path.join(folder, name))
    for e in ['txt'] + list(PICS):                  # its caption, or its sleeve, go with it
        p = os.path.join(folder, stem + '.' + e)
        if os.path.exists(p) and (e == 'txt' or which == 'music'):
            os.remove(p)
        v = os.path.join(folder, stem + '.vinyl.' + e)            # (a record's own vinyl too)
        if which == 'music' and e != 'txt' and os.path.exists(v):
            os.remove(v)
    if which in ('easel', 'walls'):
        unhang_everywhere(os.path.relpath(os.path.join(folder, name), ROOT).replace(os.sep, '/'))
    write_list(folder)


PLACES = {'easel': SHELVES['easel'][0], 'walls': SHELVES['walls'][0], 'art': os.path.join(ROOT, 'content', 'workshop', 'visitors')}


def shelf_move(name, to, frm=None):
    """move a picture between the easel (content/workshop/), the visitors' portfolio
    (content/workshop/visitors/) and the hidden pool for the walls (content/frames/),
    with its caption; the frames it hangs in keep it"""
    frm = frm or ('easel' if to == 'walls' else 'walls')
    if frm not in PLACES or to not in PLACES or frm == to:
        raise ValueError('move it where?')
    sf, df = PLACES[frm], PLACES[to]
    if not name or os.path.basename(name) != name or not os.path.exists(os.path.join(sf, name)):
        raise ValueError('that picture isn\'t there')
    stem, ext = os.path.splitext(name)
    os.makedirs(df, exist_ok=True)
    final = unique(df, stem, ext)
    os.replace(os.path.join(sf, name), os.path.join(df, final))
    cap = os.path.join(sf, stem + '.txt')
    if os.path.exists(cap):
        os.replace(cap, os.path.join(df, os.path.splitext(final)[0] + '.txt'))
    rel = lambda folder, n: os.path.relpath(os.path.join(folder, n), ROOT).replace(os.sep, '/')
    moved(rel(sf, name), rel(df, final))
    write_list(sf)
    write_list(df)
    return final


# the workshop's clipboard: your to-do list and notes
NOTES = os.path.join(ROOT, 'content', 'workshop', 'notes.json')


def notes():
    d = load_json(NOTES, {})
    if not isinstance(d, dict):
        d = {}
    return {'title': d.get('title') or 'to do',
            'todo': [t for t in d.get('todo', []) if isinstance(t, dict)],
            'notes': [n for n in d.get('notes', []) if isinstance(n, dict)]}


def save_notes(d):
    def text(v, n=500):
        return re.sub(r'\s+$', '', str(v or ''))[:n]
    out = {'title': text(d.get('title'), 60).strip() or 'to do',
           'todo': [{'text': text(t.get('text')), 'done': bool(t.get('done'))} for t in d.get('todo', []) if isinstance(t, dict) and str(t.get('text') or '').strip()],
           'notes': [{'text': text(n.get('text'), 4000), 'date': text(n.get('date'), 10)} for n in d.get('notes', []) if isinstance(n, dict) and str(n.get('text') or '').strip()]}
    os.makedirs(os.path.dirname(NOTES), exist_ok=True)
    with open(NOTES, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')
    write_list(os.path.dirname(NOTES))
    return out


# ---------------- the paper on the dungeon floor: content/dungeon/paper.json ----------------
PAPER = os.path.join(ROOT, 'content', 'dungeon', 'paper.json')


def paper():
    d = load_json(PAPER, {})
    return {'title': str(d.get('title') or ''), 'text': str(d.get('text') or ''), 'sign': str(d.get('sign') or '')} if isinstance(d, dict) else {'title': '', 'text': '', 'sign': ''}


def save_paper(d):
    out = {'title': str(d.get('title') or '').strip()[:80], 'text': re.sub(r'\s+$', '', str(d.get('text') or ''))[:6000], 'sign': str(d.get('sign') or '').strip()[:80]}
    os.makedirs(os.path.dirname(PAPER), exist_ok=True)
    with open(PAPER, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')
    write_list(os.path.dirname(PAPER))
    return out


# ---------------- the asset manager: every slot on the site (tools/slots.json) ----------------
ASSETS = os.path.join(ROOT, 'assets')
SLOTS_FILE = os.path.join(HERE, 'slots.json')
MEDIA = ('svg', 'gif', 'webp', 'png', 'jpg', 'jpeg', 'mp3', 'ogg', 'webm', 'mp4', 'json', 'woff2', 'woff', 'ttf', 'otf')
SLOT = re.compile(r'^assets/((?:resets/reset-[1-8](?:/[a-z0-9-]+)?)|[a-z0-9-]+)/([a-z0-9-]+)$')
RESETS_DIR = os.path.join(ASSETS, 'resets')
SOUNDS_DIR = os.path.join(ASSETS, 'sounds')
NOISE_FILE = os.path.join(SOUNDS_DIR, 'noise.json')
SONGS = SHELVES['music'][0]
NUMBERED = re.compile(r'^(\d{1,3})[-_. ]+(.*)$')


def kinds():
    return load_json(SLOTS_FILE, {}).get('kinds') or {'image': ['svg', 'png', 'webp', 'gif', 'jpg', 'jpeg'], 'sound': ['mp3', 'ogg']}


def slot_where(slot):
    m = SLOT.match(slot or '')
    if not m or m.group(1) == 'resets':
        raise ValueError('which slot?')
    return os.path.join(ASSETS, *m.group(1).split('/')), m.group(2)


# ---------------- the resets: each one's own art, note and swapped pictures (assets/resets/reset-<n>/) ----------------
def write_resets_index():
    """assets/resets/index.txt, the same as tools/update-lists.sh writes it: every file the resets have of their own"""
    os.makedirs(RESETS_DIR, exist_ok=True)
    out = []
    for d in sorted(os.listdir(RESETS_DIR)):
        rd = os.path.join(RESETS_DIR, d)
        if not (os.path.isdir(rd) and re.match(r'^reset-[1-8]$', d)):
            continue
        for n in sorted(os.listdir(rd)):
            pth = os.path.join(rd, n)
            if os.path.isfile(pth):
                if n != 'list.txt' and not n.lower().startswith('readme') and not n.startswith(('.', '_')):
                    out.append(d + '/' + n)
            elif os.path.isdir(pth):
                for m in sorted(os.listdir(pth)):
                    if os.path.isfile(os.path.join(pth, m)) and m != 'list.txt' and not m.lower().startswith('readme') and not m.startswith(('.', '_')):
                        out.append(d + '/' + n + '/' + m)
    with open(os.path.join(RESETS_DIR, 'index.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write("# written by tools/update-lists.sh: every file the resets have of their own.\n")
        for x in out:
            f.write(x + '\n')
    return out


def resets_state():
    """{ '3': [{'path': 'sky/sun.gif', 'size': …, 'time': …}, …], … }"""
    out = {}
    for x in (write_resets_index() if os.path.isdir(RESETS_DIR) else []):
        n, rest = x.split('/', 1)
        full = os.path.join(RESETS_DIR, n, *rest.split('/'))
        out.setdefault(n.replace('reset-', ''), []).append({'path': rest, 'size': os.path.getsize(full), 'time': int(os.path.getmtime(full))})
    return out


def reset_note_path(n):
    n = int(n)
    if not 1 <= n <= 8:
        raise ValueError('which reset?')
    return os.path.join(RESETS_DIR, 'reset-%d' % n, 'note.json')


def reset_note(n):
    d = load_json(reset_note_path(n), {})
    return {'title': str(d.get('title') or ''), 'text': str(d.get('text') or ''), 'sign': str(d.get('sign') or '')} if isinstance(d, dict) else {'title': '', 'text': '', 'sign': ''}


def save_reset_note(n, d):
    pth = reset_note_path(n)
    out = {'title': str(d.get('title') or '').strip()[:80], 'text': re.sub(r'\s+$', '', str(d.get('text') or ''))[:6000], 'sign': str(d.get('sign') or '').strip()[:80]}
    os.makedirs(os.path.dirname(pth), exist_ok=True)
    if not (out['title'] or out['text'] or out['sign']):
        if os.path.exists(pth):
            os.remove(pth)                            # (an empty note: the dungeon's usual one shows instead)
    else:
        with open(pth, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
            f.write('\n')
    write_resets_index()
    return out


def asset_files():
    """every art/sound file in assets/<folder>/, by folder"""
    out = {}
    if not os.path.isdir(ASSETS):
        return out
    for d in sorted(os.listdir(ASSETS)):
        p = os.path.join(ASSETS, d)
        if not os.path.isdir(p) or d in ('templates', 'resets'):
            continue
        out[d] = [{'name': n, 'size': os.path.getsize(os.path.join(p, n)), 'time': int(os.path.getmtime(os.path.join(p, n)))}
                  for n in sorted(os.listdir(p))
                  if os.path.isfile(os.path.join(p, n)) and os.path.splitext(n)[1][1:].lower() in MEDIA and not n.startswith(('.', '_'))]
    return out


def clear_slot(folder, stem):
    """remove every version of one slot (sun.png, sun.svg …), never its twins (sun-glow.png)"""
    gone = []
    if os.path.isdir(folder):
        for n in os.listdir(folder):
            st, ext = os.path.splitext(n)
            if st == stem and ext[1:].lower() in MEDIA:
                os.remove(os.path.join(folder, n))
                gone.append(n)
    return gone


def asset_put(slot, name, raw, kind='image'):
    folder, stem = slot_where(slot)
    ext = os.path.splitext(name or '')[1][1:].lower()
    allowed = kinds().get(kind) or kinds()['image']
    if ext not in allowed:
        raise ValueError('that slot takes ' + ', '.join('.' + e for e in allowed if e != 'jpeg'))
    if ext == 'jpeg':
        ext = 'jpg'                                   # (the site looks for .jpg)
    if len(raw) > UPLOAD_LIMIT:
        raise ValueError('that file is over 30 MB')
    if kind == 'json':
        json.loads(raw.decode('utf-8'))               # (it has to be real JSON)
    os.makedirs(folder, exist_ok=True)
    clear_slot(folder, stem)
    with open(os.path.join(folder, stem + '.' + ext), 'wb') as f:
        f.write(raw)
    write_list(folder)
    if folder.startswith(RESETS_DIR):
        write_resets_index()
    return stem + '.' + ext


def asset_clear(slot):
    folder, stem = slot_where(slot)
    gone = clear_slot(folder, stem)
    if os.path.isdir(folder):
        write_list(folder)
    if folder.startswith(RESETS_DIR):
        write_resets_index()
    return gone


# ---------------- the template pictures (tools/templates.py): made in the background, a scene at a time ----------------
TEMPLATES_DIR = os.path.join(HERE, 'templates')
TEMPLATES_LOG = os.path.join(TEMPLATES_DIR, 'making.log')
templates_job = {'proc': None}


def templates_make():
    p = templates_job['proc']
    if p and p.poll() is None:
        return {'started': True}
    try:
        import playwright  # noqa: F401  (only to see it's there)
    except ImportError:
        raise ValueError('the template pictures need Playwright, once: in a terminal, type  pip install playwright  and then  python -m playwright install chromium  (then try again)')
    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    log = open(TEMPLATES_LOG, 'w', encoding='utf-8')
    templates_job['proc'] = subprocess.Popen([sys.executable, os.path.join(HERE, 'templates.py')], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT,
                                             stdin=subprocess.DEVNULL, env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    return {'started': True}


def templates_state():
    p = templates_job['proc']
    lines = []
    if os.path.exists(TEMPLATES_LOG):
        with open(TEMPLATES_LOG, encoding='utf-8', errors='replace') as f:
            lines = [x.rstrip() for x in f if x.strip()]
    heads = [x for x in lines if not x.startswith(' ')]
    if p and p.poll() is None:
        return {'running': True, 'at': heads[-1] if heads else ''}
    if p and p.returncode:
        return {'running': False, 'error': 'the template pictures stopped: ' + (' / '.join(lines[-3:]) or 'no reason given')}
    return {'running': False}


# ---------------- the drawing table (tools/drawtable.py): a slot's canvas, opened in your art program ----------------
def drawtable():
    import drawtable as dt                            # (tools/drawtable.py, next to this file)
    return dt


def draw_run(*args):
    """tools/drawtable.py on its own (it opens a hidden browser to take the guide: a few seconds, more for skizy's room)"""
    r = subprocess.run([sys.executable, os.path.join(HERE, 'drawtable.py')] + list(args), cwd=ROOT, capture_output=True, text=True,
                       timeout=300, env=dict(os.environ, PYTHONIOENCODING='utf-8'), stdin=subprocess.DEVNULL)
    lines = [x for x in (r.stdout or '').splitlines() if x.strip().startswith('{')]
    if not lines:
        raise ValueError('the drawing table stopped: ' + ((r.stderr or '').strip().splitlines() or ['no reason given'])[-1])
    out = json.loads(lines[-1])
    if out.get('error'):
        raise ValueError(out['error'])
    return out


def draw_open(d, animate=False):
    slot, app = d.get('slot') or '', d.get('app') or ''
    drawtable().where(slot)                           # (a real slot, or it says so)
    args = ['animate' if animate else 'open', slot, app]
    if d.get('fresh'):
        args.append('--fresh')
    if d.get('view'):
        args += ['--view', str(d['view'])]
    return draw_run(*args)


def draw_file(slot, name, in_frames=False):
    """one of the pictures on the table (an export, or a frame), by its plain name only"""
    folder, _, _ = drawtable().where(slot)
    name = os.path.basename(name or '')
    pth = os.path.join(folder, 'frames', name) if in_frames else os.path.join(folder, name)
    if not name or not os.path.isfile(pth) or name.rsplit('.', 1)[-1].lower() not in ('png', 'webp', 'gif', 'jpg', 'jpeg'):
        raise ValueError('no such picture on the drawing table')
    return pth


def draw_use(slot, name):
    """an export from the table into the slot"""
    pth = draw_file(slot, name)
    with open(pth, 'rb') as f:
        raw = f.read()
    saved = asset_put(slot, name, raw)
    drawtable().mark_used(slot, os.path.basename(name))
    return {'name': saved, 'size': len(raw)}


def draw_frames(slot, fps=None):
    """the slot's frames → one animated WebP → into the slot. too big for the site at full size: at half size"""
    dt = drawtable()
    out, half = dt.assemble(slot, fps), False
    if os.path.getsize(out) > UPLOAD_LIMIT:
        full = os.path.getsize(out)
        out, half = dt.assemble(slot, fps, half=True), full
    with open(out, 'rb') as f:
        raw = f.read()
    saved = asset_put(slot, os.path.basename(out), raw)
    dt.mark_used(slot, 'frames')
    return {'name': saved, 'size': len(raw), 'halved': half}


def draw_reveal(slot, in_frames=False):
    """the slot's folder on the drawing table, in File Explorer"""
    folder, _, _ = drawtable().where(slot)
    pth = os.path.join(folder, 'frames') if in_frames else folder
    os.makedirs(pth, exist_ok=True)
    if sys.platform == 'win32':
        os.startfile(pth)
    elif sys.platform == 'darwin':
        subprocess.Popen(['open', pth])
    else:
        subprocess.Popen(['xdg-open', pth])
    return {'folder': os.path.relpath(pth, ROOT).replace(os.sep, '/')}


# slots the site itself uses, found by reading the pages and scripts, so a new piece
# (data-asset="assets/workshop/clock" or <img src="assets/garden/gate.svg">) shows up in
# the asset manager by itself, even before it's described in tools/slots.json
FOUND_IN_HTML = re.compile(r'(?:data-(?:asset|slot)|src|href)\s*=\s*["\']([^"\']+)["\']')
FOUND_IN_JS = re.compile(r'assets/([a-z0-9-]+)/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.[a-z0-9]+)?(?=["\'|\s])')
SLOT_IN = re.compile(r'^assets/([a-z0-9-]+)/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.[a-z0-9]+)?$')


def found_slots():
    found = {}

    def add(folder, stem, where):
        if folder in ('templates', 'resets') or stem in ('list', 'readme', 'noise', 'reset'):
            return
        found.setdefault('assets/' + folder + '/' + stem, set()).add(where)
    for n in sorted(os.listdir(ROOT)):
        if n.endswith('.html') and n != 'template.html':
            with open(os.path.join(ROOT, n), encoding='utf-8', errors='replace') as f:
                text = f.read()
            for m in FOUND_IN_HTML.finditer(text):
                for part in re.split(r'[|\s]+', m.group(1)):
                    x = SLOT_IN.match(part.strip())
                    if x:
                        add(x.group(1), x.group(2), n)
    sky = os.path.join(ROOT, 'sky')
    for n in sorted(os.listdir(sky)) if os.path.isdir(sky) else []:
        if n.endswith('.js'):
            with open(os.path.join(sky, n), encoding='utf-8', errors='replace') as f:
                for m in FOUND_IN_JS.finditer(f.read()):
                    add(m.group(1), m.group(2), 'sky/' + n)
    return [{'slot': k, 'where': sorted(v)} for k, v in sorted(found.items())]


# ---------------- the record player: content/living/, numbered 01-name.mp3, 02-name.mp3 … ----------------
AUDIO_EXT = ('.mp3', '.ogg')


def album_dir(name):
    """a folder in content/living/ that's an album (not the bottles, not hidden)"""
    return bool(name) and os.path.basename(name) == name and name != 'bottles' and not name.startswith(('.', '_', '~')) \
        and os.path.isdir(os.path.join(SONGS, name))


def album_songs(name):
    d = os.path.join(SONGS, name)
    files = sorted((n for n in os.listdir(d) if os.path.isfile(os.path.join(d, n)) and n.lower().endswith(AUDIO_EXT)), key=lambda n: n.lower())
    out = []
    for n in files:
        stem = os.path.splitext(n)[0]
        m = NUMBERED.match(stem)
        out.append({'name': n, 'url': '/content/living/' + urllib.parse.quote(name) + '/' + urllib.parse.quote(n),
                    'number': int(m.group(1)) if m else None, 'title': (m.group(2) if m else stem), 'size': os.path.getsize(os.path.join(d, n))})
    return out


def album_cover(name):
    d = os.path.join(SONGS, name)
    pics = sorted(n for n in os.listdir(d) if os.path.splitext(n)[1][1:].lower() in PICS and os.path.splitext(n)[0].lower() != 'vinyl')
    for n in pics:
        if os.path.splitext(n)[0].lower() == 'cover':
            return n
    return pics[0] if pics else None


def write_albums():
    """content/living/albums.txt, the same as tools/update-lists.sh writes it: every album folder with songs in it"""
    if not os.path.isdir(SONGS):
        return
    names = sorted((n for n in os.listdir(SONGS) if album_dir(n)
                    and any(x.lower().endswith(AUDIO_EXT) for x in os.listdir(os.path.join(SONGS, n)))), key=lambda n: n.lower())
    with open(os.path.join(SONGS, 'albums.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write("# written by tools/update-lists.sh: the record player's albums (folders of songs in content/living/).\n")
        for n in names:
            f.write(n + '\n')


def tracks():
    """every record in the crate, in playing order: songs on their own (singles) and albums (a folder of songs)"""
    if not os.path.isdir(SONGS):
        return []
    try:
        finish_renames(SONGS)                           # (a rename that was cut short last time: finish it, so nothing stays hidden)
    except ValueError:
        pass
    entries = os.listdir(SONGS)
    files = [n for n in entries if os.path.isfile(os.path.join(SONGS, n))]
    songs = [n for n in files if n.lower().endswith(AUDIO_EXT)]
    albums = [n for n in entries if album_dir(n) and (NUMBERED.match(n) or album_songs(n))]
    out = []
    for n in sorted(songs + albums, key=lambda n: n.lower()):
        if n in albums:
            m = NUMBERED.match(n)
            ss = album_songs(n)
            item = {'kind': 'album', 'name': n, 'url': ss[0]['url'] if ss else '', 'number': int(m.group(1)) if m else None,
                    'title': (m.group(2) if m else n), 'size': sum(x['size'] for x in ss), 'songs': ss}
            c = album_cover(n)
            if c:
                item['sleeve'] = '/content/living/' + urllib.parse.quote(n) + '/' + urllib.parse.quote(c)
            v = vinyl_of(n)
            if v:
                item['vinyl'] = '/content/living/' + urllib.parse.quote(n) + '/' + urllib.parse.quote(v.split('/')[-1])
            out.append(item)
            continue
        stem = os.path.splitext(n)[0]
        m = NUMBERED.match(stem)
        item = {'kind': 'single', 'name': n, 'url': '/content/living/' + urllib.parse.quote(n), 'number': int(m.group(1)) if m else None,
                'title': (m.group(2) if m else stem), 'size': os.path.getsize(os.path.join(SONGS, n))}
        for e in PICS:
            if stem + '.' + e in files:
                item['sleeve'] = '/content/living/' + urllib.parse.quote(stem + '.' + e)
                break
        v = vinyl_of(n)
        if v:
            item['vinyl'] = '/content/living/' + urllib.parse.quote(v)
        out.append(item)
    return out


# ---------------- a record's own vinyl (its skin): a picture of the whole record, see-through round it ----------------
# a song on its own: "01-aerie.vinyl.png" beside "01-aerie.mp3"; an album: "vinyl.png" inside its folder.
# without one, the record is the default vinyl (the slot assets/living/record, or the drawn one)
VINYL_PICS = ('png', 'webp', 'gif', 'svg', 'jpg', 'jpeg')


def vinyl_of(name):
    """the file name of a record's own vinyl (for an album: "<album>/vinyl.png"), or None"""
    if album_dir(name):
        d = os.path.join(SONGS, name)
        for e in VINYL_PICS:
            if os.path.isfile(os.path.join(d, 'vinyl.' + e)):
                return name + '/vinyl.' + e
        return None
    stem = os.path.splitext(name)[0]
    for e in VINYL_PICS:
        if os.path.isfile(os.path.join(SONGS, stem + '.vinyl.' + e)):
            return stem + '.vinyl.' + e
    return None


def vinyl_put(song, name, raw):
    ext = os.path.splitext(name or '')[1].lower()
    if ext[1:] not in VINYL_PICS:
        raise ValueError('a vinyl is a picture (png or webp keep the see-through parts; also gif, svg, jpg)')
    if len(raw) > 4 * 1024 * 1024:
        raise ValueError('a vinyl has to be under 4 MB (about 1000 x 1000 is plenty)')
    if album_dir(song):
        d, base = os.path.join(SONGS, song), 'vinyl'
    elif song in [t['name'] for t in tracks()]:
        d, base = SONGS, os.path.splitext(song)[0] + '.vinyl'
    else:
        raise ValueError('that record isn\'t there')
    for e in VINYL_PICS:
        p = os.path.join(d, base + '.' + e)
        if os.path.exists(p):
            os.remove(p)
    with open(os.path.join(d, base + ext), 'wb') as f:
        f.write(raw)
    write_list(d)
    return base + ext


def vinyl_remove(song):
    v = vinyl_of(song) if song and os.path.basename(song) == song else None
    if not v:
        raise ValueError('that record has no vinyl of its own')
    os.remove(os.path.join(SONGS, *v.split('/')))
    write_list(os.path.dirname(os.path.join(SONGS, *v.split('/'))))
    return True


def song_stem(number, title, width=2):
    title = re.sub(r'[\\/:*?"<>|]+', '', title or '').strip().strip('.') or 'untitled'
    return str(number).zfill(width) + '-' + title[:80]


def stem_of(name, folder=None):
    """a record's name without its type (an album's folder name is all name: "06-Vol. 2" stays whole)"""
    return name if os.path.isdir(os.path.join(folder or SONGS, name)) else os.path.splitext(name)[0]


def replace_hard(src, dst):
    """os.replace, but patient: on Windows a file or folder that's open somewhere (a song still playing in the manager,
    a folder window, OneDrive or the antivirus looking at new files) can't be renamed for a moment. try for a few seconds,
    then say so plainly"""
    import time
    for i in range(24):
        try:
            os.replace(src, dst)
            return
        except PermissionError:
            if i == 23:
                raise ValueError('Windows wouldn\'t let me rename ' + os.path.basename(src).lstrip('~').replace('.tmp', '') +
                                 ': something has it open (a song playing here, a folder window on it, or OneDrive syncing). '
                                 'close that and try again. nothing is lost.')
            time.sleep(0.25)


def rename_song(old, new_stem, folder=None):
    """rename a song and everything that goes with it (its sleeve), or an album's folder"""
    folder = folder or SONGS
    if os.path.isdir(os.path.join(folder, old)):
        if old != new_stem:
            replace_hard(os.path.join(folder, old), os.path.join(folder, '~' + new_stem + '.tmp'))
        return new_stem
    old_stem, ext = os.path.splitext(old)
    if old_stem == new_stem:
        return old
    for n in os.listdir(folder):
        st, e = os.path.splitext(n)
        if st == old_stem and os.path.isfile(os.path.join(folder, n)):
            replace_hard(os.path.join(folder, n), os.path.join(folder, '~' + new_stem + e + '.tmp'))
        elif st == old_stem + '.vinyl' and os.path.isfile(os.path.join(folder, n)):     # (its own vinyl goes with it)
            replace_hard(os.path.join(folder, n), os.path.join(folder, '~' + new_stem + '.vinyl' + e + '.tmp'))
    return new_stem + ext


def finish_renames(folder=None):
    """the second half of a rename: "~05-name.tmp" becomes "05-name" (also run on its own, to mend a rename that was cut short)"""
    folder = folder or SONGS
    if not os.path.isdir(folder):
        return
    for n in os.listdir(folder):
        if n.startswith('~') and n.endswith('.tmp'):
            dst = os.path.join(folder, n[1:-4])
            if os.path.exists(dst):                        # (never over something that's there: keep both)
                st, e = os.path.splitext(n[1:-4])
                dst = os.path.join(folder, st + ' (2)' + e)
            replace_hard(os.path.join(folder, n), dst)


def renumber(order, folder=None):
    """number the records (or an album's songs) 01, 02 … in this order (a list of file or folder names)"""
    folder = folder or SONGS
    width = max(2, len(str(len(order))))
    names = []
    try:
        for i, n in enumerate(order):
            st = stem_of(n, folder)
            title = NUMBERED.match(st)
            title = title.group(2) if title else st
            names.append(rename_song(n, song_stem(i + 1, title, width), folder))
    finally:
        finish_renames(folder)                          # (even if one rename failed: nothing's left half-renamed and hidden)
    write_list(folder)
    if folder != SONGS:
        write_list(SONGS)
    return names


def track_add(name, raw):
    stem, ext = clean_name(name, ['mp3', 'ogg'])
    if len(raw) > UPLOAD_LIMIT:
        raise ValueError('that file is over 30 MB')
    m = NUMBERED.match(stem)
    title = m.group(2) if m else stem
    nxt, width = next_number()
    final = song_stem(nxt, title, width) + ext
    if os.path.exists(os.path.join(SONGS, final)):
        raise ValueError(final + ' is already there')
    os.makedirs(SONGS, exist_ok=True)
    with open(os.path.join(SONGS, final), 'wb') as f:
        f.write(raw)
    write_list(SONGS)
    return final


def track_move(name, by):
    order = [t['name'] for t in tracks()]
    if name not in order:
        raise ValueError('that song isn\'t there')
    i = order.index(name)
    j = max(0, min(len(order) - 1, i + (1 if by > 0 else -1)))
    order[i], order[j] = order[j], order[i]
    return renumber(order)


def track_rename(name, title):
    have = {t['name']: t for t in tracks()}
    if name not in have:
        raise ValueError('that song isn\'t there')
    t = have[name]
    num = t['number'] if t['number'] is not None else len(have)
    width = max(2, len(re.match(r'\d*', name).group(0)))
    new = rename_song(name, song_stem(num, title, width))
    finish_renames()
    write_list(SONGS)
    return new


def track_delete(name):
    if album_dir(name):                                # an album: the whole folder, songs, cover and all
        import shutil
        shutil.rmtree(os.path.join(SONGS, name))
    else:
        shelf_delete('music', name)
    return renumber([t['name'] for t in tracks()])


# ---------------- albums: a folder of songs in content/living/, "06-the album's title/01-first song.mp3" … ----------------
def next_number():
    have = tracks()
    if any(t['number'] is None for t in have):          # number the ones that aren't yet, in the order they play now
        renumber([t['name'] for t in have])
        have = tracks()
    nxt = max([t['number'] or 0 for t in have] + [len(have)]) + 1
    width = max(2, len(str(nxt)), max([len(re.match(r'\d*', t['name']).group(0)) for t in have if t['number']] + [0]))
    return nxt, width


def album_new(title):
    title = re.sub(r'[\\/:*?"<>|]+', '', title or '').strip().strip('.') or 'an album'
    nxt, width = next_number()
    name = song_stem(nxt, title, width)
    if os.path.exists(os.path.join(SONGS, name)):
        raise ValueError(name + ' is already there')
    os.makedirs(os.path.join(SONGS, name))
    write_list(SONGS)
    return name


def album_add(album, name, raw):
    """one more song on an album: the next number"""
    if not album_dir(album):
        raise ValueError('that album isn\'t there')
    stem, ext = clean_name(name, ['mp3', 'ogg'])
    if len(raw) > UPLOAD_LIMIT:
        raise ValueError('that file is over 30 MB')
    m = NUMBERED.match(stem)
    title = m.group(2) if m else stem
    d = os.path.join(SONGS, album)
    have = album_songs(album)
    nxt = max([x['number'] or 0 for x in have] + [len(have)]) + 1
    final = song_stem(nxt, title, max(2, len(str(nxt)))) + ext
    if os.path.exists(os.path.join(d, final)):
        raise ValueError(final + ' is already there')
    with open(os.path.join(d, final), 'wb') as f:
        f.write(raw)
    write_list(d)
    write_list(SONGS)
    return final


def album_cover_put(album, name, raw):
    if not album_dir(album):
        raise ValueError('that album isn\'t there')
    ext = os.path.splitext(name or '')[1].lower()
    if ext[1:] not in PICS:
        raise ValueError('a sleeve is a picture (png, jpg, webp, gif)')
    d = os.path.join(SONGS, album)
    for n in os.listdir(d):
        if os.path.splitext(n)[1][1:].lower() in PICS and os.path.splitext(n)[0].lower() != 'vinyl':     # (not its vinyl)
            os.remove(os.path.join(d, n))
    with open(os.path.join(d, 'cover' + ext), 'wb') as f:
        f.write(raw)
    write_list(d)
    return 'cover' + ext


def album_song(album, song):
    if not album_dir(album) or song not in [x['name'] for x in album_songs(album)]:
        raise ValueError('that song isn\'t on that album')
    return os.path.join(SONGS, album)


def album_song_move(album, song, by):
    d = album_song(album, song)
    order = [x['name'] for x in album_songs(album)]
    i = order.index(song)
    j = max(0, min(len(order) - 1, i + (1 if by > 0 else -1)))
    order[i], order[j] = order[j], order[i]
    return renumber(order, d)


def album_song_rename(album, song, title):
    d = album_song(album, song)
    x = [x for x in album_songs(album) if x['name'] == song][0]
    num = x['number'] if x['number'] is not None else len(album_songs(album))
    new = rename_song(song, song_stem(num, title, max(2, len(re.match(r'\d*', song).group(0)))), d)
    finish_renames(d)
    write_list(d)
    return new


def album_song_delete(album, song):
    d = album_song(album, song)
    os.remove(os.path.join(d, song))
    return renumber([x['name'] for x in album_songs(album)], d)


def track_sleeve_link(name, link):
    import sleeve                                     # tools/sleeve.py does the Spotify part
    if name not in [t['name'] for t in tracks()]:
        raise ValueError('that song isn\'t there')
    data, ext, title = sleeve.fetch_cover((link or '').strip())
    if album_dir(name):                                # an album's cover: inside its folder
        return {'sleeve': album_cover_put(name, 'cover' + ext, data), 'title': title, 'bytes': len(data)}
    stem = os.path.splitext(name)[0]
    for e in PICS:
        p = os.path.join(SONGS, stem + '.' + e)
        if os.path.exists(p):
            os.remove(p)
    with open(os.path.join(SONGS, stem + ext), 'wb') as f:
        f.write(data)
    write_list(SONGS)
    return {'sleeve': stem + ext, 'title': title, 'bytes': len(data)}


# ---------------- the noise machine: its own sounds, plus yours (assets/sounds/noise.json) ----------------
def noise_extra():
    d = load_json(NOISE_FILE, [])
    return [x for x in d if isinstance(x, dict) and re.match(r'^[a-z0-9-]+$', x.get('name') or '')] if isinstance(d, list) else []


def save_noise(lst):
    os.makedirs(SOUNDS_DIR, exist_ok=True)
    with open(NOISE_FILE, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(lst, f, indent=2, ensure_ascii=False)
        f.write('\n')
    write_list(SOUNDS_DIR)


def noise_add(label, name, raw):
    label = (label or '').strip()[:40]
    if not label:
        raise ValueError('give it a name first')
    ext = os.path.splitext(name or '')[1][1:].lower()
    if ext not in ('mp3', 'ogg'):
        raise ValueError('a sound is an .mp3 or an .ogg')
    base = slug(label)
    taken = set(x['name'] for x in load_json(SLOTS_FILE, {}).get('noise', [])) | set(x['name'] for x in noise_extra()) | \
        {'rain', 'windowrain', 'wind', 'thunder', 'storm', 'ocean', 'fire', 'white', 'pink', 'brown', 'noise'}
    n, i = base, 2
    while n in taken or any(os.path.splitext(f)[0] == n for f in (os.listdir(SOUNDS_DIR) if os.path.isdir(SOUNDS_DIR) else [])):
        n, i = base + '-' + str(i), i + 1
    asset_put('assets/sounds/' + n, name, raw, 'sound')
    save_noise(noise_extra() + [{'name': n, 'label': label}])
    return n


def noise_remove(name):
    lst = noise_extra()
    if name not in [x['name'] for x in lst]:
        raise ValueError('that\'s not one of yours')
    clear_slot(SOUNDS_DIR, name)
    save_noise([x for x in lst if x['name'] != name])


def noise_label(name, label):
    lst = noise_extra()
    for x in lst:
        if x['name'] == name:
            x['label'] = (label or '').strip()[:40] or x['label']
    save_noise(lst)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *a):
        pass

    def reply(self, obj, code=200):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        try:
            if url.path == '/__letters/list':
                return self.reply({'letters': letters(), 'today': datetime.date.today().isoformat()})
            if url.path == '/__post/state':
                pst = load_json(inbox_path('state.json'), {})
                return self.reply({'hasKey': bool(key() or supabase()), 'source': 'supabase' if supabase() else ('formsubmit' if key() else ''), 'lastCheck': pst.get('last_ok', 0), 'nextOk': pst.get('next_ok', 0), 'inbox': inbox_items(), 'bottles': site_files('bottles'), 'art': site_files('art'), 'board': board(),
                                   'frames': frames(), 'frameNumbers': frame_numbers(), 'walls': walls_state()})
            if url.path == '/__shelf/list':
                which = q.get('which', [''])[0]
                if which not in SHELVES:
                    raise ValueError('which shelf?')
                return self.reply({'items': shelf(which), 'title': book_title(which) if which.startswith('book-') else '', 'frames': frames(), 'frameNumbers': frame_numbers(),
                                   'workshopFrames': frames('workshop'), 'workshopFrameNumbers': frame_numbers('workshop'), 'walls': walls_state()})
            if url.path.startswith('/__post/inbox/'):
                name = os.path.basename(url.path)
                if not re.match(r'^[a-f0-9]{16}\.(png|jpg|gif|webp)$', name) or not os.path.exists(inbox_path(name)):
                    return self.reply({'error': 'no such picture'}, 404)
                with open(inbox_path(name), 'rb') as f:
                    raw = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'image/' + ('jpeg' if name.endswith('jpg') else name.rsplit('.', 1)[1]))
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return
            if url.path == '/__assets/state':
                return self.reply({'files': asset_files(), 'tracks': tracks(), 'noise': noise_extra(), 'found': found_slots(), 'resets': resets_state()})
            if url.path == '/__templates/state':
                return self.reply(templates_state())
            if url.path == '/__draw/state':
                return self.reply({'table': drawtable().table()})
            if url.path == '/__draw/file':
                pth = draw_file(q.get('slot', [''])[0], q.get('name', [''])[0], q.get('frames', [''])[0] == '1')
                with open(pth, 'rb') as f:
                    raw = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'image/' + {'jpg': 'jpeg'}.get(pth.rsplit('.', 1)[-1].lower(), pth.rsplit('.', 1)[-1].lower()))
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return
            if url.path == '/__resets/note':
                return self.reply(reset_note(urllib.parse.parse_qs(url.query).get('n', ['1'])[0]))
            if url.path == '/__notify/state':
                return self.reply(notify_state())
            if url.path == '/__paper':
                return self.reply(paper())
            if url.path == '/__notes':
                return self.reply(dict(notes(), today=datetime.date.today().isoformat()))
            if url.path == '/__letters/read':
                name = safe(q.get('name', [''])[0])
                return self.reply({'name': name, 'text': read(name)})
        except Exception as e:
            return self.reply({'error': str(e)}, 400)
        if url.path.startswith('/.inbox') or url.path.startswith('/.git'):      # private: never served
            return self.reply({'error': 'private'}, 404)
        if url.path == '/':
            self.send_response(302)
            self.send_header('Location', '/tools/letters.html')          # the content manager opens on your letters
            self.end_headers()
            return
        return super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if self.headers.get('Origin') not in (None, 'http://localhost:%d' % PORT, 'http://127.0.0.1:%d' % PORT):
            return self.reply({'error': 'not from the content manager'}, 403)
        length = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(length) if length else b''
        try:
            if url.path == '/__letters/save':
                return self.reply({'name': save(json.loads(raw or b'{}'))})
            if url.path == '/__letters/delete':
                name = safe(json.loads(raw or b'{}').get('name'))
                os.remove(os.path.join(SEA, name))
                write_list()
                return self.reply({'deleted': name})
            if url.path == '/__letters/picture':
                ext = PICTURE_TYPES.get(self.headers.get('Content-Type', '').split(';')[0].strip())
                if not ext:
                    raise ValueError('pictures can be png, jpg, gif, webp or svg')
                if len(raw) > PICTURE_LIMIT:
                    raise ValueError('that picture is over 4 MB; save it smaller first')
                stem = slug(urllib.parse.unquote(self.headers.get('X-Name', 'picture')).rsplit('.', 1)[0])
                name = datetime.date.today().isoformat() + '-' + stem + ext
                i = 2
                while os.path.exists(os.path.join(SEA, name)):
                    name, i = datetime.date.today().isoformat() + '-' + stem + '-' + str(i) + ext, i + 1
                with open(os.path.join(SEA, name), 'wb') as f:
                    f.write(raw)
                write_list()
                return self.reply({'path': 'content/sea/' + name})
            if url.path == '/__post/key':
                k = (json.loads(raw or b'{}').get('key') or '').strip()
                if not re.match(r'^[\w-]{6,}$', k):
                    raise ValueError('that doesn\'t look like an API key')
                with open(inbox_path('key.txt'), 'w', encoding='utf-8') as f:
                    f.write(k)
                return self.reply({'ok': True})
            if url.path == '/__post/supabase':
                d = json.loads(raw or b'{}')
                connect_supabase(d.get('url'), d.get('secret'))
                return self.reply({'ok': True})
            if url.path == '/__notify/setup':
                return self.reply(notify_setup(bool(json.loads(raw or b'{}').get('fresh'))))
            if url.path == '/__notify/test':
                return self.reply(notify_test())
            if url.path == '/__post/fetch':
                return self.reply({'new': fetch_post()})
            if url.path == '/__post/link':
                d = json.loads(raw or b'{}')
                return self.reply({'picture': attach_link(d.get('id'), d.get('url'))})
            if url.path == '/__post/keep':
                return self.reply({'name': keep(json.loads(raw or b'{}').get('id') or '')})
            if url.path == '/__post/toss':
                done_with(re.sub(r'[^a-f0-9]', '', json.loads(raw or b'{}').get('id') or '') or 'x')
                return self.reply({'ok': True})
            if url.path == '/__post/place':
                d = json.loads(raw or b'{}')
                return self.reply({'where': place_bottle(d.get('name'), d.get('where'))})
            if url.path == '/__post/hang':
                d = json.loads(raw or b'{}')
                room = d.get('room') or 'living'
                if room not in WALLS:
                    raise ValueError('which wall?')
                what = wall_ref((d.get('path') or '').strip(), room) if d.get('path') else (d.get('what') or '').strip()
                if not what or '..' in what or what.startswith('/'):
                    raise ValueError('which picture?')
                hang(what, d.get('frame') or None, room)
                return self.reply({'frames': frames(room)})
            if url.path == '/__shelf/add':
                which = self.headers.get('X-Which', '')
                if which not in SHELVES:
                    raise ValueError('which shelf?')
                name = urllib.parse.unquote(self.headers.get('X-Name', ''))
                sleeve = urllib.parse.unquote(self.headers.get('X-Sleeve-For', '')) or None
                return self.reply({'name': shelf_add(which, name, raw, sleeve)})
            if url.path == '/__book/move':
                d = json.loads(raw or b'{}')
                if not str(d.get('which', '')).startswith('book-') or d.get('which') not in SHELVES:
                    raise ValueError('which book?')
                book_move(d['which'], d.get('name'), int(d.get('by') or 1))
                return self.reply({'ok': True})
            if url.path == '/__book/title':
                d = json.loads(raw or b'{}')
                if not str(d.get('which', '')).startswith('book-') or d.get('which') not in SHELVES:
                    raise ValueError('which book?')
                set_book_title(d['which'], d.get('text'))
                return self.reply({'ok': True})
            if url.path == '/__shelf/caption':
                d = json.loads(raw or b'{}')
                if d.get('which') not in SHELVES:
                    raise ValueError('which shelf?')
                shelf_caption(d['which'], d.get('name'), d.get('text'))
                return self.reply({'ok': True})
            if url.path == '/__shelf/delete':
                d = json.loads(raw or b'{}')
                if d.get('which') not in SHELVES:
                    raise ValueError('which shelf?')
                shelf_delete(d['which'], d.get('name'))
                return self.reply({'ok': True})
            if url.path == '/__shelf/move':
                d = json.loads(raw or b'{}')
                return self.reply({'name': shelf_move(d.get('name'), d.get('to'), d.get('from'))})
            if url.path == '/__post/delete':
                d = json.loads(raw or b'{}')
                if d.get('which') not in FOLDERS:
                    raise ValueError('which folder?')
                delete_site_file(d['which'], d.get('name'))
                return self.reply({'ok': True})
            if url.path == '/__assets/put':
                slot = urllib.parse.unquote(self.headers.get('X-Slot', ''))
                name = urllib.parse.unquote(self.headers.get('X-Name', ''))
                return self.reply({'name': asset_put(slot, name, raw, self.headers.get('X-Kind') or 'image')})
            if url.path == '/__assets/clear':
                return self.reply({'removed': asset_clear(json.loads(raw or b'{}').get('slot'))})
            if url.path == '/__draw/open':
                return self.reply(draw_open(json.loads(raw or b'{}')))
            if url.path == '/__draw/animate':
                return self.reply(draw_open(json.loads(raw or b'{}'), animate=True))
            if url.path == '/__draw/app':
                d = json.loads(raw or b'{}')
                return self.reply({'path': drawtable().remember_app(d.get('app'), d.get('path'))})
            if url.path == '/__draw/use':
                d = json.loads(raw or b'{}')
                return self.reply(draw_use(d.get('slot'), d.get('name')))
            if url.path == '/__draw/frames':
                d = json.loads(raw or b'{}')
                return self.reply(draw_frames(d.get('slot'), d.get('fps')))
            if url.path == '/__draw/reveal':
                d = json.loads(raw or b'{}')
                return self.reply(draw_reveal(d.get('slot'), bool(d.get('frames'))))
            if url.path == '/__templates/make':
                return self.reply(templates_make())
            if url.path == '/__records/add':
                return self.reply({'name': track_add(urllib.parse.unquote(self.headers.get('X-Name', '')), raw)})
            if url.path == '/__records/album-new':
                return self.reply({'name': album_new(json.loads(raw or b'{}').get('title'))})
            if url.path == '/__records/album-add':
                return self.reply({'name': album_add(urllib.parse.unquote(self.headers.get('X-Album', '')), urllib.parse.unquote(self.headers.get('X-Name', '')), raw)})
            if url.path == '/__records/album-song':
                d = json.loads(raw or b'{}')
                a, s_, what = d.get('album'), d.get('song'), d.get('do')
                if what == 'move':
                    return self.reply({'names': album_song_move(a, s_, int(d.get('by') or 1))})
                if what == 'rename':
                    return self.reply({'name': album_song_rename(a, s_, d.get('title'))})
                if what == 'delete':
                    return self.reply({'names': album_song_delete(a, s_)})
                raise ValueError('do what?')
            if url.path == '/__records/sleeve':
                song = urllib.parse.unquote(self.headers.get('X-Song', ''))
                if album_dir(song):
                    if len(raw) > 1024 * 1024:
                        raise ValueError('a sleeve has to be under 1 MB (the "from Spotify" button shrinks them for you)')
                    return self.reply({'name': album_cover_put(song, urllib.parse.unquote(self.headers.get('X-Name', '')), raw)})
                if song not in [t['name'] for t in tracks()]:
                    raise ValueError('that song isn\'t there')
                if len(raw) > 1024 * 1024:
                    raise ValueError('a sleeve has to be under 1 MB (the "from Spotify" button shrinks them for you)')
                return self.reply({'name': shelf_add('music', urllib.parse.unquote(self.headers.get('X-Name', '')), raw, song)})
            if url.path == '/__records/move':
                d = json.loads(raw or b'{}')
                return self.reply({'names': track_move(d.get('name'), int(d.get('by') or 1))})
            if url.path == '/__records/rename':
                d = json.loads(raw or b'{}')
                return self.reply({'name': track_rename(d.get('name'), d.get('title'))})
            if url.path == '/__records/delete':
                return self.reply({'names': track_delete(json.loads(raw or b'{}').get('name'))})
            if url.path == '/__records/vinyl':
                return self.reply({'name': vinyl_put(urllib.parse.unquote(self.headers.get('X-Song', '')),
                                                     urllib.parse.unquote(self.headers.get('X-Name', '')), raw)})
            if url.path == '/__records/vinyl-remove':
                return self.reply({'ok': vinyl_remove(json.loads(raw or b'{}').get('name'))})
            if url.path == '/__records/sleeve-link':
                d = json.loads(raw or b'{}')
                return self.reply(track_sleeve_link(d.get('name'), d.get('link')))
            if url.path == '/__noise/add':
                return self.reply({'name': noise_add(urllib.parse.unquote(self.headers.get('X-Label', '')), urllib.parse.unquote(self.headers.get('X-Name', '')), raw)})
            if url.path == '/__noise/remove':
                noise_remove(json.loads(raw or b'{}').get('name'))
                return self.reply({'ok': True})
            if url.path == '/__noise/label':
                d = json.loads(raw or b'{}')
                noise_label(d.get('name'), d.get('label'))
                return self.reply({'ok': True})
            if url.path == '/__resets/note/save':
                d = json.loads(raw or b'{}')
                return self.reply(save_reset_note(d.get('n'), d))
            if url.path == '/__paper/save':
                return self.reply(save_paper(json.loads(raw or b'{}')))
            if url.path == '/__notes/save':
                return self.reply(save_notes(json.loads(raw or b'{}')))
            if url.path == '/__letters/publish':
                bat = os.path.join(HERE, 'publish.bat')
                if os.name == 'nt' and os.path.exists(bat):
                    subprocess.Popen(['cmd', '/c', bat, 'content push'], cwd=ROOT, env=dict(os.environ, PUBLISH_MSG='content push'),
                                     creationflags=getattr(subprocess, 'CREATE_NEW_CONSOLE', 0))
                    return self.reply({'ok': True})
                sh = os.path.join(HERE, 'publish.sh')             # mac / linux: tools/publish.sh, its words in this terminal
                if os.name != 'nt' and os.path.exists(sh):
                    subprocess.Popen(['sh', sh, 'content push'], cwd=ROOT, env=dict(os.environ, PUBLISH_MSG='content push'), stdin=subprocess.DEVNULL)
                    return self.reply({'ok': True})
                return self.reply({'error': 'run tools/publish.bat (or tools/publish.sh, or git add, commit and push) to publish'}, 400)
        except Exception as e:
            return self.reply({'error': str(e)}, 400)
        return self.reply({'error': 'unknown'}, 404)


def main():
    if not os.path.isdir(SEA):
        print("Can't find the letters folder:", SEA)
        return
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    except OSError:
        print('\n  The content manager seems to be open already: http://localhost:%d/\n' % PORT)
        webbrowser.open('http://localhost:%d/tools/letters.html' % PORT)
        return
    url = 'http://localhost:%d/tools/letters.html' % PORT
    print('\n  DaV-nky content manager: %s\n  (close this window to stop it)\n' % url)
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
