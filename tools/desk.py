#!/usr/bin/env python3
"""
desk.py: brings what you did at the desk (desk.html, on the live site) into your folder.

The desk keeps its changes on Supabase (the "desk" table and the "desk" storage: tools/supabase-desk.sql), and the
site shows them straight away. This copies them into content/ here, so the repo has everything:

    python tools/desk.py file      every change on the desk that isn't in your folder yet: written here (a deleted
                                   one deleted here), marked as filed, and a line for each in CHANGES.txt.
                                   then the changes filed by an earlier publish are tidied off the desk (they're live
                                   from the repo by now). publish.bat / publish.sh run this before the lists.
    python tools/desk.py show      what's on the desk, without changing anything

It uses the content manager's Supabase connection (the secret key in .inbox/supabase.json: visitors -> connect).
None yet, or no desk in Supabase: it says so and does nothing.
A file you'd changed here too is never just lost: your copy goes to _your-versions/<date_time>-desk/ first.
"""
import datetime, json, os, re, shutil, subprocess, sys, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
CONTENT = os.path.join(ROOT, 'content')
CONF = os.path.join(ROOT, '.inbox', 'supabase.json')


def conf():
    try:
        with open(CONF, encoding='utf-8') as f:
            c = json.load(f)
        return c if c.get('url') and c.get('secret') else None
    except Exception:
        return None


def call(c, method, path, body=None, headers=None):
    h = {'apikey': c['secret'], 'User-Agent': 'DaV-nky desk'}
    if c['secret'].startswith('eyJ'):                            # an older "service_role" key
        h['Authorization'] = 'Bearer ' + c['secret']
    if body is not None and not isinstance(body, bytes):
        body = json.dumps(body).encode('utf-8')
        h['Content-Type'] = 'application/json'
    h.update(headers or {})
    req = urllib.request.Request(c['url'].rstrip('/') + path, data=body, method=method, headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def q(v):
    return urllib.parse.quote(str(v), safe='')


def obj_url(obj):
    return '/storage/v1/object/public/desk/' + '/'.join(urllib.parse.quote(p) for p in obj.split('/'))


def target(path):
    """the file in your folder a desk row is about (only ever inside content/)"""
    p = os.path.normpath(os.path.join(ROOT, *path.split('/')))
    if not path.startswith('content/') or '..' in path.split('/') or os.path.commonpath([p, CONTENT]) != CONTENT:
        raise ValueError('not a content file: ' + path)
    return p


def rows_now(c):
    try:
        return json.loads(call(c, 'GET', '/rest/v1/desk?select=*&order=at.asc').decode('utf-8') or '[]')
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')
        if e.code == 404 or 'desk' in detail and ('does not exist' in detail or 'Could not find' in detail):
            return None
        raise


def what(path, gone, had):
    """a line for CHANGES.txt, in plain words"""
    name = path.rsplit('/', 1)[1]
    places = [('content/sea/', 'a letter on the sea'), ('content/living/bottles/board.json', 'the bottles on the board and the pile'),
              ('content/living/bottles/', 'a bottle in the living space'), ('content/workshop/visitors/', 'a visitor\'s painting'),
              ('content/workshop/frames.json', 'what hangs in the workshop\'s frames'), ('content/living/frames.json', 'what hangs in the living space\'s frames'),
              ('content/shame/frames.json', 'what hangs in the hall of shame'), ('content/frames/', 'a picture for the walls'),
              ('content/workshop/', 'a painting on the easel')]
    thing = next((label for pre, label in places if path.startswith(pre)), path)
    if path.startswith('content/sea/') and not re.search(r'\.(txt|html)$', name, re.I):
        thing = 'a picture for a letter'
    if name.endswith('.txt') and path.startswith(('content/workshop/', 'content/frames/')) and not path.startswith('content/workshop/visitors/'):
        thing = 'a caption'
    if path.endswith('.json'):
        return 'From the desk: ' + thing + ' (' + path + ').'
    return 'From the desk: ' + thing + (' deleted' if gone else ' changed' if had else ' added') + ' (' + name + ').'


def backup(path, stamp):
    src = target(path)
    dst = os.path.join(ROOT, '_your-versions', stamp + '-desk', *path.split('/'))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return os.path.relpath(dst, ROOT)


def add_change(line):
    try:
        subprocess.run([sys.executable, os.path.join(HERE, 'changes.py'), 'add', line], cwd=ROOT, check=False)
    except Exception:
        pass


def file_all(c):
    rows = rows_now(c)
    if rows is None:
        print('   (the desk isn\'t set up in Supabase yet: tools/supabase-desk.sql. nothing to bring in.)')
        return 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    # 1. what an earlier publish filed is in the repo (and live) by now: off the desk with it
    tidied = 0
    for r in [r for r in rows if r.get('filed_at')]:
        try:
            gone = json.loads(call(c, 'DELETE', '/rest/v1/desk?path=eq.' + q(r['path']) + '&at=eq.' + q(r['at']) + '&filed_at=not.is.null',
                                   headers={'Prefer': 'return=representation'}).decode('utf-8') or '[]')
            if gone and r.get('obj'):
                call(c, 'DELETE', '/storage/v1/object/desk', body={'prefixes': [r['obj']]})
            tidied += len(gone)
        except Exception as e:
            print('   (couldn\'t tidy ' + r['path'] + ' off the desk: ' + str(e) + '. it\'ll be tried again next time.)')
    # 2. everything new: into your folder
    filed, kept = [], []
    for r in [r for r in rows if not r.get('filed_at')]:
        path = r['path']
        try:
            dest = target(path)
            had = os.path.exists(dest)
            if r.get('gone') or not r.get('obj'):
                if had:
                    kept.append(backup(path, stamp))
                    os.remove(dest)
            else:
                data = call(c, 'GET', obj_url(r['obj']))
                if had:
                    with open(dest, 'rb') as f:
                        mine = f.read()
                    if mine.replace(b'\r\n', b'\n') == data.replace(b'\r\n', b'\n'):
                        data = None                              # (the same already)
                    else:
                        kept.append(backup(path, stamp))
                if data is not None:
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    with open(dest, 'wb') as f:
                        f.write(data)
            # filed (only if it hasn't changed again at the desk meanwhile)
            call(c, 'PATCH', '/rest/v1/desk?path=eq.' + q(path) + '&at=eq.' + q(r['at']), body={'filed_at': now},
                 headers={'Prefer': 'return=minimal'})
            filed.append(path)
            add_change(what(path, r.get('gone') or not r.get('obj'), had))
        except Exception as e:
            print('   x  ' + path + ': ' + str(e) + ' (left on the desk; it\'ll be tried again next time)')
    if filed:
        print('   brought in from the desk:')
        for p in filed:
            print('     ' + p)
    else:
        print('   nothing new on the desk.')
    if kept:
        print('   your own copies of files the desk changed are kept in _your-versions/:')
        for k in kept:
            print('     ' + k)
    if tidied:
        print('   (%d older one%s tidied off the desk)' % (tidied, '' if tidied == 1 else 's'))
    return 0


def show(c):
    rows = rows_now(c)
    if rows is None:
        print('the desk isn\'t set up in Supabase yet (tools/supabase-desk.sql).')
        return 0
    waiting = [r for r in rows if not r.get('filed_at')]
    print('%d change%s on the desk not in your folder yet%s' % (len(waiting), '' if len(waiting) == 1 else 's', ':' if waiting else '.'))
    for r in waiting:
        print('   ' + ('deleted  ' if r.get('gone') else 'new/changed  ') + r['path'] + '   (' + (r.get('at') or '')[:16].replace('T', ' ') + ')')
    filed = [r for r in rows if r.get('filed_at')]
    if filed:
        print('%d filed already (tidied off the desk at the next publish).' % len(filed))
    return 0


def main(argv):
    try:
        sys.stdout.reconfigure(errors='replace')                # (a name a Windows window can't print never stops it)
    except Exception:
        pass
    what_to_do = argv[0] if argv else 'show'
    if what_to_do not in ('file', 'show'):
        print(__doc__)
        return 2
    c = conf()
    if not c:
        print('   (the content manager isn\'t connected to Supabase, so there\'s no desk to bring in.)')
        return 0
    try:
        return file_all(c) if what_to_do == 'file' else show(c)
    except urllib.error.URLError as e:
        print('   (couldn\'t reach Supabase: ' + str(getattr(e, 'reason', e)) + '. the desk\'s changes wait for the next publish.)')
        return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
