#!/usr/bin/env python3
"""
letters.py: the letters manager. Write, edit and delete the letters on your
homepage (the files in content/sea/) in your browser, with a live preview on
the site's own paper.

    on Windows: double-click tools\\letters.bat
    anywhere:   python tools/letters.py

It opens http://localhost:8001/tools/letters.html . Everything stays on your
computer: it only reads and writes content/sea/. When you're happy, press
"publish" (or run tools\\publish.bat) to put the changes on the live site.
Close the black window to stop it.
"""
import datetime, hashlib, http.server, json, os, re, subprocess, sys, threading, unicodedata, urllib.parse, urllib.request, webbrowser

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


def fetch_post():
    """ask FormSubmit for everything sent; anything new lands in the inbox"""
    k = key()
    if not k:
        raise ValueError('add your FormSubmit API key first')
    req = urllib.request.Request(os.environ.get('FORMSUBMIT_API', 'https://formsubmit.co/api/get-submissions/') + urllib.parse.quote(k),
                                 headers={'User-Agent': 'DaV-nky letters manager', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8', 'replace'))
    if not data.get('success', True) and not data.get('submissions'):
        raise ValueError(data.get('message') or 'FormSubmit said no (is the API key right?)')
    seen = set(load_json(inbox_path('seen.json'), []))
    new = 0
    for sub in data.get('submissions') or []:
        form = sub.get('form_data') or {}
        when = (sub.get('submitted_at') or {}).get('date', '') if isinstance(sub.get('submitted_at'), dict) else str(sub.get('submitted_at') or '')
        sid = hashlib.sha1((when + json.dumps(form, sort_keys=True)).encode('utf-8')).hexdigest()[:16]
        if sid in seen or os.path.exists(inbox_path(sid + '.json')):
            continue
        kind = 'art' if 'title' in form or 'keep it' in form else 'bottle'
        item = {'id': sid, 'kind': kind, 'date': when[:10], 'from': (form.get('from') or '').strip(),
                'text': (form.get('message') or '').strip(), 'title': (form.get('title') or '').strip(), 'picture': ''}
        if item['from'] == '(no name)':
            item['from'] = ''
        if item['title'] == '(untitled)':
            item['title'] = ''
        for v in form.values():                                  # a picture that came along as a link, if FormSubmit sends one
            if isinstance(v, str) and re.match(r'^https?://\S+\.(png|jpe?g|gif|webp)(\?\S*)?$', v.strip(), re.I):
                try:
                    ext = '.' + re.search(r'\.(png|jpe?g|gif|webp)', v, re.I).group(1).lower().replace('jpeg', 'jpg')
                    with urllib.request.urlopen(urllib.request.Request(v.strip(), headers={'User-Agent': 'DaV-nky letters manager'}), timeout=30) as pr:
                        raw = pr.read()
                    with open(inbox_path(sid + ext), 'wb') as f:
                        f.write(raw)
                    item['picture'] = sid + ext
                except Exception:
                    pass
                break
        item['only_email'] = not item['picture'] and (kind == 'art' or item['text'] in ('', '(a drawing or picture)'))
        save_json(inbox_path(sid + '.json'), item)
        new += 1
    return new


def inbox_items():
    if not os.path.isdir(INBOX):
        return []
    items = [load_json(os.path.join(INBOX, n), None) for n in os.listdir(INBOX) if n.endswith('.json') and n != 'seen.json']
    return sorted([i for i in items if i], key=lambda i: i.get('date', ''), reverse=True)


def done_with(sid):
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
                return self.reply({'hasKey': bool(key()), 'inbox': inbox_items(), 'bottles': site_files('bottles'), 'art': site_files('art'), 'board': board()})
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
            self.send_header('Location', '/tools/letters.html')
            self.end_headers()
            return
        return super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if self.headers.get('Origin') not in (None, 'http://localhost:%d' % PORT, 'http://127.0.0.1:%d' % PORT):
            return self.reply({'error': 'not from the letters manager'}, 403)
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
            if url.path == '/__post/fetch':
                return self.reply({'new': fetch_post()})
            if url.path == '/__post/keep':
                return self.reply({'name': keep(json.loads(raw or b'{}').get('id') or '')})
            if url.path == '/__post/toss':
                done_with(re.sub(r'[^a-f0-9]', '', json.loads(raw or b'{}').get('id') or '') or 'x')
                return self.reply({'ok': True})
            if url.path == '/__post/place':
                d = json.loads(raw or b'{}')
                return self.reply({'where': place_bottle(d.get('name'), d.get('where'))})
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
        print('\n  The letters manager seems to be open already: http://localhost:%d/\n' % PORT)
        webbrowser.open('http://localhost:%d/tools/letters.html' % PORT)
        return
    url = 'http://localhost:%d/tools/letters.html' % PORT
    print('\n  DaV-nky letters manager: %s\n  (close this window to stop it)\n' % url)
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
