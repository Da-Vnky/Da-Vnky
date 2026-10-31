#!/usr/bin/env python3
"""
sync-a.py: bring edits made in the copy (DaVnky-A, next to DaV-nky on the Desktop) into the real folder,
and the real folder's newer files back into the copy. it knows which side changed what.

    python tools/sync-a.py            what's changed, and where (the same as "status")
    python tools/sync-a.py diff       the changed lines of the copy's text files
    python tools/sync-a.py apply      the copy's changes into DaV-nky (asks first; --yes doesn't ask)
    python tools/sync-a.py refresh    DaV-nky's newer files into the copy (asks first; --yes doesn't ask)

how it knows (16 Oct): DaVnky-A/.sync-base.json remembers every file as it was when the two last agreed.
  changed in the copy only   -> "apply" brings it here (DaV-nky's old one is kept in _your-versions/ first)
  changed in DaV-nky only    -> "refresh" takes it to the copy; "apply" never touches it (the first version of this
                                tool would have put the copy's older file back over it: the waves, 16 Oct)
  changed on both sides      -> a clash: listed, left alone on both sides, for you (or Claude) to merge by hand
never synced: anything git ignores (.inbox, _your-versions, tools/drawing …), the lists publishing writes,
and CHANGES.txt itself (the copy's new lines are added here with changes.py instead). nothing is committed:
publishing is yours.

SAFETY POLICY: an AI assistant never runs "apply" unless the artist asks for it in the chat (AGENTS.md).
"""
import argparse, datetime, difflib, hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = os.path.normpath(os.path.join(HERE, '..'))
COPY = os.path.normpath(os.path.join(MAIN, '..', 'DaVnky-A'))
SKIP_DIRS = {'.git', '_your-versions', '.inbox', '__pycache__', '.vscode', '.idea', 'node_modules', '_to_delete'}
GENERATED = re.compile(r'(^|/)list\.txt$|^(catalog|files|manifest)\.txt$|^assets/resets/index\.txt$|^content/living/albums\.txt$|^baked/')
BASE_NAME = '.sync-base.json'
OWN = {'GEMINI.md', 'AGENTS.md'}       # each folder keeps its own helper notes (the copy's are for Gemini working there)


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def walk(root):
    out = {}
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in files:
            if f in ('.DS_Store', 'Thumbs.db', 'desktop.ini', BASE_NAME) or f.endswith(('.pyc', '.swp', '.tmp')):
                continue
            rel = os.path.relpath(os.path.join(d, f), root).replace('\\', '/')
            out[rel] = os.path.join(d, f)
    return out


def ignored(paths):
    # what git ignores in DaV-nky (the same rules for the copy, which has no .git of its own).
    # the names go to git as utf-8, each ended by a zero (-z), not as windows' own text: a song called in arabic letters
    # (31 Oct) couldn't be written that way, the list never finished, and git waited for the rest of it forever.
    try:
        r = subprocess.run(['git', '-C', MAIN, 'check-ignore', '-z', '--stdin'], input='\0'.join(paths).encode('utf-8'),
                           capture_output=True, timeout=300)
        return set(x.decode('utf-8', 'replace') for x in r.stdout.split(b'\0') if x)
    except Exception:
        return set()


def survey(copy):
    m, a = walk(MAIN), walk(copy)
    names = sorted(set(m) | set(a))
    skip = ignored(names)
    names = [n for n in names if n not in skip and not GENERATED.search(n) and n != 'CHANGES.txt' and n not in OWN]
    hm = {n: sha(m[n]) for n in names if n in m}
    ha = {n: sha(a[n]) for n in names if n in a}
    return names, hm, ha


def load_base(copy):
    try:
        with open(os.path.join(copy, BASE_NAME), encoding='utf-8') as f:
            return json.load(f).get('files', {})
    except Exception:
        return None


def save_base(copy, files):
    with open(os.path.join(copy, BASE_NAME), 'w', encoding='utf-8') as f:
        json.dump({'saved': datetime.datetime.now().isoformat(timespec='seconds'), 'files': files}, f, indent=0, sort_keys=True)


def sort_out(names, hm, ha, base):
    to_main, to_copy, clash = [], [], []
    for n in names:
        m, a, b = hm.get(n), ha.get(n), base.get(n)
        if m == a:
            continue
        if m == b:
            to_main.append(n)            # only the copy changed it (or made it, or deleted it)
        elif a == b:
            to_copy.append(n)            # only DaV-nky changed it
        else:
            clash.append(n)
    return to_main, to_copy, clash


def what(n, src, dst):
    return ('new ' if n not in dst else 'deleted ' if n not in src else '') + n


def pending_lines(path):
    # the "- " lines under "not published yet" in a CHANGES.txt
    try:
        text = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    except Exception:
        return []
    part = text.split('== not published yet ==', 1)[-1].split('== published ==', 1)[0]
    return [l[2:].strip() for l in part.split('\n') if l.startswith('- ')]


def new_change_lines(copy):
    here = open(os.path.join(MAIN, 'CHANGES.txt'), encoding='utf-8').read()
    return [l for l in pending_lines(os.path.join(copy, 'CHANGES.txt')) if l not in here]


def show(to_main, to_copy, clash, hm, ha, copy):
    print('\n  DaVnky-A -> DaV-nky  (python tools/sync-a.py apply)')
    for n in to_main:
        print('    + ' + what(n, ha, hm))
    lines = new_change_lines(copy)
    for l in lines:
        print('    + CHANGES.txt line: ' + l)
    if not to_main and not lines:
        print('    (nothing: the copy has no changes of its own)')
    print('\n  DaV-nky -> DaVnky-A  (python tools/sync-a.py refresh)')
    for n in to_copy:
        print('    + ' + what(n, hm, ha))
    if not to_copy:
        print('    (nothing: the copy has everything newer)')
    if clash:
        print('\n  changed on BOTH sides (left alone; merge these by hand):')
        for n in clash:
            print('    ! ' + n)
    print()


def ask(yes, question):
    if yes:
        return True
    if not sys.stdin.isatty():
        sys.exit('  add --yes to do it without asking.')
    return input('  ' + question + ' (y/N): ').strip().lower() == 'y'


def copy_over(names, src_root, dst_root, src_h, keep=None):
    for n in names:
        dst = os.path.join(dst_root, n)
        if keep and os.path.exists(dst):
            k = os.path.join(keep, n)
            os.makedirs(os.path.dirname(k), exist_ok=True)
            shutil.copy2(dst, k)
        if n in src_h:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(os.path.join(src_root, n), dst)
            print('    copied   ' + n)
        elif os.path.exists(dst):
            os.remove(dst)
            print('    removed  ' + n)


def main():
    ap = argparse.ArgumentParser(description='DaVnky-A <-> DaV-nky')
    ap.add_argument('action', nargs='?', default='status', choices=['status', 'diff', 'apply', 'refresh'])
    ap.add_argument('--source', default=COPY, help='the copy (default: DaVnky-A next to DaV-nky)')
    ap.add_argument('--yes', '-y', action='store_true', help="don't ask")
    args = ap.parse_args()
    copy = os.path.abspath(args.source)
    if not os.path.isdir(copy):
        sys.exit("  can't find the copy: " + copy)

    names, hm, ha = survey(copy)
    base = load_base(copy)
    if base is None:
        # the first run: the copy as it is now is taken to be untouched, so anything that differs is DaV-nky's newer work
        base = dict(ha)
        save_base(copy, base)
        print('  (first run: the copy as it is now is the starting point)')
    # where the two agree now, that's the new starting point (so a change on one side later is seen as that side's)
    agreed = False
    for n in names:
        if hm.get(n) == ha.get(n) and base.get(n) != hm.get(n):
            if n in hm: base[n] = hm[n]
            else: base.pop(n, None)
            agreed = True
    if agreed:
        save_base(copy, base)
    to_main, to_copy, clash = sort_out(names, hm, ha, base)

    if args.action == 'status':
        return show(to_main, to_copy, clash, hm, ha, copy)

    if args.action == 'diff':
        for n in to_main + clash:
            try:
                old = open(os.path.join(MAIN, n), encoding='utf-8').read().splitlines() if n in hm else []
                new = open(os.path.join(copy, n), encoding='utf-8').read().splitlines() if n in ha else []
            except UnicodeDecodeError:
                print('\n--- %s (a picture or sound: changed)' % n)
                continue
            for l in difflib.unified_diff(old, new, 'DaV-nky/' + n, 'DaVnky-A/' + n, lineterm=''):
                print(l)
        return

    if args.action == 'apply':
        lines = new_change_lines(copy)
        if not to_main and not lines:
            return print('  nothing to bring over.')
        show(to_main, [], clash, hm, ha, copy)
        if not ask(args.yes, 'bring these into DaV-nky?'):
            return print('  nothing changed.')
        keep = os.path.join(MAIN, '_your-versions', 'backup-before-a-' + datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S'))
        copy_over(to_main, copy, MAIN, ha, keep)
        for l in lines:
            subprocess.run([sys.executable, os.path.join(HERE, 'changes.py'), 'add', l], cwd=MAIN)
        for n in to_main:
            if n in ha: base[n] = ha[n]
            else: base.pop(n, None)
        save_base(copy, base)
        print('\n  done. DaV-nky\'s old versions are in ' + keep)
        print('  check it in the content manager (or the preview), then publish when you\'re happy.')
        return

    if args.action == 'refresh':
        if not to_copy:
            return print('  the copy is up to date.')
        show([], to_copy, clash, hm, ha, copy)
        if not ask(args.yes, 'copy these into DaVnky-A?'):
            return print('  nothing changed.')
        copy_over(to_copy, MAIN, copy, hm)
        shutil.copy2(os.path.join(MAIN, 'CHANGES.txt'), os.path.join(copy, 'CHANGES.txt'))
        for n in to_copy:
            if n in hm: base[n] = hm[n]
            else: base.pop(n, None)
        save_base(copy, base)
        print('\n  done.')


if __name__ == '__main__':
    main()
