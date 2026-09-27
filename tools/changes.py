#!/usr/bin/env python3
"""
changes.py: the change log's helper. CHANGES.txt (at the top of the repo) says what's changed on the site,
newest first, in plain words, so Victor, Mel and any Claude working here can catch up. Its top section,
"not published yet", is where you write what you've just changed (a line each, starting with "- ").

Publishing (tools/publish.bat, tools/publish.sh, the content manager's publish button) runs

    python tools/changes.py take            (or: take --who Mel --also "content push")

which turns those lines into the commit's message (.git/PUBLISH_MSG, for git commit -F) and moves them
down into the log under today's date and the name of whoever's publishing. Nothing waiting: it says so
(exit code 1) and publish asks for a message as it always did.

    python tools/changes.py add "what changed"      adds a line to "not published yet"
    python tools/changes.py show                    prints what's waiting
    python tools/changes.py waiting                 exit code 0 if anything is waiting, 1 if not

A pull request (Mel's way in) works the same: add your lines, then run "take --who Mel" before your last
commit, and commit with the message it wrote (git commit -F .git/PUBLISH_MSG).
"""
import datetime, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
LOG = os.path.join(ROOT, 'CHANGES.txt')
MSG = os.path.join(ROOT, '.git', 'PUBLISH_MSG')
WAITING = '== not published yet =='
DONE = '== published =='
HINT = '(write here what you changed, a line each starting with "- ". publishing moves them into the log below.)'


def read():
    with open(LOG, encoding='utf-8') as f:
        return f.read().replace('\r\n', '\n')


def write(text):
    with open(LOG, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def split(text):
    a, b = text.find(WAITING), text.find(DONE)
    if a < 0 or b < a:
        sys.exit('CHANGES.txt has lost its "' + WAITING + '" or "' + DONE + '" line: put them back and try again.')
    head, waiting, rest = text[:a + len(WAITING)], text[a + len(WAITING):b], text[b:]
    return head, waiting, rest


def entries(waiting):
    out = []
    for line in waiting.split('\n'):
        s = line.rstrip()
        if not s.strip() or s.strip() == HINT:
            continue
        if s.lstrip().startswith('- ') or not out:
            out.append(s.strip())
        else:
            out[-1] += ' ' + s.strip()                  # (a long line wrapped onto the next)
    return [e if e.startswith('- ') else '- ' + e for e in out]


def who_default():
    try:
        return subprocess.run(['git', 'config', 'user.name'], cwd=ROOT, capture_output=True, text=True).stdout.strip() or 'someone'
    except Exception:
        return 'someone'


def take(who, also):
    head, waiting, rest = split(read())
    items = entries(waiting)
    if also.strip() and also.strip() not in ('update', 'content push'):     # (a message typed at publish time goes in too)
        items.append('- ' + also.strip().lstrip('- ').strip())
    if not items:
        print(' (nothing waiting in CHANGES.txt)')
        return 1
    first, more = items[0][2:], '' if len(items) == 1 else ' (+%d more)' % (len(items) - 1)
    if len(first) > 72:
        first = first[:69].rstrip(' ,;:') + '...'
    subject = first + more
    with open(MSG, 'w', encoding='utf-8', newline='\n') as f:
        f.write(subject + '\n\n' + '\n'.join(items) + '\n')
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M') + ' · ' + who
    rest = rest[len(DONE):].lstrip('\n')
    write(head + '\n' + HINT + '\n\n' + DONE + '\n\n' + stamp + '\n' + '\n'.join(items) + '\n\n' + rest)
    print(' the change log says:')
    for i in items:
        print('   ' + i)
    return 0


def add(line):
    head, waiting, rest = split(read())
    items = entries(waiting) + ['- ' + line.strip().lstrip('- ').strip()]
    write(head + '\n' + HINT + '\n' + '\n'.join(items) + '\n\n' + rest)
    return 0


def main(argv):
    if not os.path.exists(LOG):
        print(' (no CHANGES.txt)')
        return 1
    if not argv or argv[0] == 'show':
        items = entries(split(read())[1])
        print('\n'.join(items) if items else ' (nothing waiting)')
        return 0
    if argv[0] == 'waiting':                              # exit 0 if something's waiting to be published, 1 if not
        return 0 if entries(split(read())[1]) else 1
    if argv[0] == 'add' and len(argv) > 1:
        return add(' '.join(argv[1:]))
    if argv[0] == 'take':
        who, also, i = who_default(), '', 1
        while i < len(argv):
            if argv[i] == '--who' and i + 1 < len(argv):
                who, i = argv[i + 1], i + 2
            elif argv[i] == '--also' and i + 1 < len(argv):
                also, i = argv[i + 1], i + 2
            else:
                i += 1
        return take(who, also)
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
