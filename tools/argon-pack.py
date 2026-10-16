#!/usr/bin/env python3
"""
argon-pack.py: a zip of the site's code for Argon (the browser-based helper), 16 Oct.

    python tools/argon-pack.py                the code, the notes and the small text files (a few MB)
    python tools/argon-pack.py --with-skizy   + skizy's room's code (only when the job touches her room)
    (or double-click tools\\argon-pack.bat)

it makes _your-versions/argon/DaV-nky-for-argon-<date>.zip (never published) and opens the folder, so you can drop
the zip into Argon's workspace. what's in it, and why, is in tools/FOR-ARGON.md.

never in it: .inbox/ (the private keys), .git, _your-versions, the drawing table's working files, the templates,
the debug page (a cheat page), baked/ (made again on every publish), and pictures and sounds (Argon can't see
them anyway; the folders' list.txt files say what's there).
"""
import datetime, os, re, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
NEVER = re.compile(r'^(\.inbox/|\.git/|_your-versions/|_to_delete/|baked/|tools/drawing/|tools/templates/|tools/__pycache__/|'
                   r'tools/debug\.html$|.*__pycache__/|HANDOFF-local\.md$|GEMINI\.md$)')
CODE = re.compile(r'\.(html|js|mjs|css|py|bat|sh|sql|md|json|txt|svg|yml|yaml|xml)$', re.I)
SMALL = 600 * 1024                       # a text file bigger than this (the bee's brain, …) stays out
SKIZY = 'schizophyllu.me.room/'


def files():
    try:
        out = subprocess.run(['git', '-C', ROOT, 'ls-files', '-co', '--exclude-standard'], capture_output=True, text=True).stdout
        names = [l.strip() for l in out.splitlines() if l.strip()]
    except Exception:
        names = []
    if not names:                                     # (no git: walk the folder)
        for d, dirs, fs in os.walk(ROOT):
            dirs[:] = [x for x in dirs if x not in ('.git', '.inbox', '_your-versions', 'node_modules')]
            names += [os.path.relpath(os.path.join(d, f), ROOT).replace('\\', '/') for f in fs]
    for x in ('.gitattributes', '.gitignore'):
        if x not in names and os.path.exists(os.path.join(ROOT, x)):
            names.append(x)
    return sorted(set(names))


def main():
    skizy = '--with-skizy' in sys.argv
    stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M')
    out_dir = os.path.join(ROOT, '_your-versions', 'argon')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, 'DaV-nky-for-argon-%s%s.zip' % (stamp, '-with-skizy' if skizy else ''))
    n = size = 0
    left = []
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for rel in files():
            full = os.path.join(ROOT, rel)
            if NEVER.match(rel) or not os.path.isfile(full) or not CODE.search(rel):
                continue
            if rel.startswith(SKIZY) and not skizy:
                continue
            if rel.startswith(('assets/', 'content/')) and not (rel.endswith(('list.txt', 'albums.txt', 'index.txt', '.json', '.txt', '.html', '.svg'))):
                continue
            s = os.path.getsize(full)
            if s > SMALL:
                left.append(rel)
                continue
            z.write(full, 'DaV-nky/' + rel)
            n += 1; size += s
    print('\n  %d files (%.1f MB before squeezing) in\n  %s' % (n, size / 1048576, out))
    if left:
        print('  left out as too big: ' + ', '.join(left))
    print('\n  give Argon this zip and tools/FOR-ARGON.md (it\'s in the zip too).')
    if sys.platform == 'win32' and '--no-open' not in sys.argv:
        subprocess.Popen(['explorer', '/select,', out])


if __name__ == '__main__':
    main()
