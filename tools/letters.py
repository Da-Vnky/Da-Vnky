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
import datetime, http.server, json, os, re, subprocess, sys, threading, unicodedata, urllib.parse, webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SEA = os.path.join(ROOT, 'content', 'sea')
PORT = 8001
LETTER = re.compile(r'^[\w .,()\'&!+-]+\.(txt|html)$', re.I)
PICTURE_TYPES = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg'}
PICTURE_LIMIT = 4 * 1024 * 1024


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


def write_list():
    """content/sea/list.txt, the same as tools/update-lists.sh writes it"""
    names = sorted(n for n in os.listdir(SEA)
                   if os.path.isfile(os.path.join(SEA, n)) and n != 'list.txt'
                   and not n.lower().startswith('readme') and not n.startswith(('.', '_')))
    with open(os.path.join(SEA, 'list.txt'), 'w', encoding='utf-8', newline='\n') as f:
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
            if url.path == '/__letters/read':
                name = safe(q.get('name', [''])[0])
                return self.reply({'name': name, 'text': read(name)})
        except Exception as e:
            return self.reply({'error': str(e)}, 400)
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
