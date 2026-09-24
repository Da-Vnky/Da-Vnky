#!/usr/bin/env python3
"""
content.py: the content manager. Everything on the site that's yours to
change, in your browser:
  - your letters on the homepage (content/sea/): write, edit, delete, preview
  - your own things: easel paintings (content/workshop/), city window scenes
    (content/city/) and records (content/living/): add, caption, delete
  - visitors' post: bottles and art from FormSubmit to keep or throw back,
    bottles to pin / pile / put back, art to hang in the living space's frames

    on Windows: double-click tools\\content.bat
    anywhere:   python tools/content.py

It opens http://localhost:8001/ . Everything stays on your computer until you
press "publish" (or run tools\\publish.bat). Close the black window to stop it.
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
FRAMES_JSON = os.path.join(ROOT, 'content', 'living', 'frames.json')

# your own things: folder, the kinds of file it holds
SHELVES = {
    'easel': (os.path.join(ROOT, 'content', 'workshop'), 'png jpg jpeg webp gif svg mp4 webm'),
    'city':  (os.path.join(ROOT, 'content', 'city'), 'png jpg jpeg webp gif svg mp4 webm html'),
    'music': (os.path.join(ROOT, 'content', 'living'), 'mp3 ogg'),
}
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
        hang(name, None)
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


# ---------------- the frames in the living space ----------------
def frame_numbers():
    try:
        with open(os.path.join(ROOT, 'living.html'), encoding='utf-8') as f:
            return sorted({int(n) for n in re.findall(r'data-frame="(\d+)"', f.read())})
    except Exception:
        return []


def frames():
    m = load_json(FRAMES_JSON, {})
    return {str(k): v for k, v in m.items() if isinstance(v, str)} if isinstance(m, dict) else {}


def hang(what, frame):
    """put a picture in a frame ('' takes a frame's picture down); a picture hangs in one frame at a time"""
    m = frames()
    for k in list(m):
        if m[k] == what:
            m[k] = ''
    if frame:
        m[str(int(frame))] = what
    with open(FRAMES_JSON, 'w', encoding='utf-8', newline='\n') as f:
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
        item = {'name': n, 'url': rel + urllib.parse.quote(n), 'date': date_of(n), 'kind': ext[1:].lower()}
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
            item['hang'] = 'content/workshop/' + n
        out.append(item)
    if which == 'music':
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
        final = unique(folder, stem, ext)
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
    if which == 'easel':
        hang('content/workshop/' + name, None)
    write_list(folder)


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
                                   'frames': frames(), 'frameNumbers': frame_numbers()})
            if url.path == '/__shelf/list':
                which = q.get('which', [''])[0]
                if which not in SHELVES:
                    raise ValueError('which shelf?')
                return self.reply({'items': shelf(which), 'frames': frames(), 'frameNumbers': frame_numbers()})
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
                what = (d.get('what') or '').strip()
                if not what or '..' in what or what.startswith('/'):
                    raise ValueError('which picture?')
                hang(what, d.get('frame') or None)
                return self.reply({'frames': frames()})
            if url.path == '/__shelf/add':
                which = self.headers.get('X-Which', '')
                if which not in SHELVES:
                    raise ValueError('which shelf?')
                name = urllib.parse.unquote(self.headers.get('X-Name', ''))
                sleeve = urllib.parse.unquote(self.headers.get('X-Sleeve-For', '')) or None
                return self.reply({'name': shelf_add(which, name, raw, sleeve)})
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
            if url.path == '/__post/delete':
                d = json.loads(raw or b'{}')
                if d.get('which') not in FOLDERS:
                    raise ValueError('which folder?')
                delete_site_file(d['which'], d.get('name'))
                return self.reply({'ok': True})
            if url.path == '/__letters/publish':
                bat = os.path.join(HERE, 'publish.bat')
                if os.name == 'nt' and os.path.exists(bat):
                    subprocess.Popen(['cmd', '/c', bat], cwd=ROOT, creationflags=getattr(subprocess, 'CREATE_NEW_CONSOLE', 0))
                    return self.reply({'ok': True})
                return self.reply({'error': 'run tools/publish.bat (or git add, commit and push) to publish'}, 400)
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
