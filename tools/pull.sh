#!/bin/sh
# pull.sh — gets the latest version of the site from Forgejo into this folder: whatever skizy (or anyone else
# with access) has pushed since you last published or pulled. tools\pull.bat runs it; so does publish.bat,
# before it publishes.
#
# it never throws away your work:
#   - anything you've changed here and haven't published yet stays as it is
#   - if the SAME file was changed both here and on Forgejo, it keeps a copy of yours in _your-versions/<when>/,
#     puts the file back as it was at your last publish, and pulls: then both versions are in the folder, for
#     Claude to put together. (publish.bat's pull, --quiet, just stops instead; so does a pull while you have a
#     publish that didn't get pushed)
#   - the lists (every list.txt, catalog.txt, files.txt, manifest.txt, assets/resets/index.txt,
#     content/living/albums.txt) are written
#     by tools/update-lists.sh, never by hand, so they can't clash: they're simply written again afterwards
#
# usage: sh tools/pull.sh            (from the top of the site, or anywhere: it finds its way there)
#        sh tools/pull.sh --quiet    (fewer words: for publish.bat)

[ -f tools/update-lists.sh ] || cd "$(dirname "$0")/.." || exit 1
QUIET=
[ "$1" = "--quiet" ] && QUIET=1
say() { [ -n "$QUIET" ] || echo "$@"; }

# the lists: made by update-lists.sh, so on a clash just keep either and write them again after
GENERATED='(^|/)list\.txt$|^catalog\.txt$|^files\.txt$|^manifest\.txt$|^assets/resets/index\.txt$|^content/living/albums\.txt$'
git config merge.regen.driver true
git config merge.regen.name "the site's lists: written again by update-lists.sh after a pull"
# (.gitattributes marks the lists "merge=regen"; this tells git what that means, on this computer)

# half-finished pull or publish from before? (it shouldn't happen, but don't make it worse)
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then
    echo "  An earlier pull or publish didn't finish. Nothing's been changed now."
    echo "  Ask for help (say: \"git status shows a merge or rebase in progress\")."
    exit 1
fi

say "  asking Forgejo what's new..."
if ! git fetch --quiet; then
    echo "  Couldn't reach Forgejo. Are you online? Nothing's been changed."
    exit 1
fi
if ! git rev-parse --verify --quiet '@{u}' >/dev/null; then
    echo "  This folder isn't linked to a branch on Forgejo, so there's nothing to pull from. Ask for help."
    exit 1
fi

INCOMING=$(git rev-list --count 'HEAD..@{u}')
if [ "$INCOMING" = "0" ]; then
    say "  You already have the latest version. Nothing new on Forgejo."
    exit 0
fi

# what's new over there, and what you've changed here but not published (or published nowhere yet)
THEIRS=$(git diff --name-only 'HEAD...@{u}' 2>/dev/null | grep -Ev "$GENERATED")
MINE=$( (git diff --name-only 'HEAD'; git diff --name-only '@{u}...HEAD'; git ls-files --others --exclude-standard) 2>/dev/null | grep -Ev "$GENERATED" | sort -u)
BOTH=$(printf '%s\n' "$MINE" | grep -Fx "$(printf '%s\n' "$THEIRS")" 2>/dev/null | grep -v '^$')
AHEAD=$(git rev-list --count '@{u}..HEAD')
ASIDE=
if [ -n "$BOTH" ]; then
    echo
    echo "  These files were changed both here and on Forgejo:"
    printf '%s\n' "$BOTH" | sed 's/^/      /'
    echo
    if [ -n "$QUIET" ] || [ "$AHEAD" != "0" ]; then
        echo "  So nothing's been pulled (your files are just as they were)."
        [ -n "$QUIET" ] && echo "  Run tools\\pull.bat first: it keeps a copy of yours and gets theirs. Then ask Claude to put them together."
        [ -n "$QUIET" ] || echo "  Ask Claude to put both versions together (say which files it listed)."
        exit 1
    fi
    # keep a copy of yours, put the file back as it was at your last publish, and pull: then both are here
    ASIDE="_your-versions/$(date +%Y-%m-%d_%H%M%S)"
    printf '%s\n' "$BOTH" | while read -r f; do
        if [ -f "$f" ]; then
            mkdir -p "$ASIDE/$(dirname "$f")" && cp -p "$f" "$ASIDE/$f" || { echo "  Couldn't copy $f aside, so nothing's been pulled."; exit 1; }
        else
            mkdir -p "$ASIDE/$(dirname "$f")" && echo "you had deleted this file" > "$ASIDE/$f.DELETED.txt"
        fi
    done || exit 1
    printf '%s\n' "$BOTH" | while read -r f; do
        if git cat-file -e "HEAD:$f" 2>/dev/null; then git checkout --quiet HEAD -- "$f"; else rm -f "$f"; fi
    done
fi

# the lists here are about to be written again anyway: put them back as they were, so they don't get in the way
# (and new ones that were never published: they're made again in a moment)
git diff --name-only HEAD 2>/dev/null | grep -E "$GENERATED" | while read -r f; do git checkout --quiet HEAD -- "$f"; done
git ls-files --others --exclude-standard | grep -E "$GENERATED" | while read -r f; do rm -f "$f"; done
lists() { tr -d '\r' < tools/update-lists.sh | sh; }

# what's coming, for the summary (before it arrives)
LOG=$(git log --format='      %ad  %an: %s' --date=format:'%b %d %H:%M' 'HEAD..@{u}')

if [ "$AHEAD" = "0" ]; then
    git merge --ff-only --quiet '@{u}' || { lists; echo "  The pull didn't go through. Copy what it says above and ask for help."; [ -n "$ASIDE" ] && echo "  (your versions of the files listed above are safe in $ASIDE)"; exit 1; }
else
    # (you have a publish that didn't get pushed: yours go on top of what's new)
    if ! git rebase --autostash --quiet '@{u}'; then
        git rebase --abort 2>/dev/null
        lists
        echo "  The pull didn't go through, so nothing's been changed. Copy what it says above and ask for help."
        exit 1
    fi
fi

# the lists, for everything that's here now
lists

[ -n "$QUIET" ] && echo "  got $INCOMING new change(s) from Forgejo."
say
say "  Pulled $INCOMING new change(s) from Forgejo:"
[ -n "$QUIET" ] || printf '%s\n' "$LOG"
say
say "  Files that changed:"
[ -n "$QUIET" ] || printf '%s\n' "$THEIRS" | sed 's/^/      /'
if [ -n "$ASIDE" ]; then
    echo
    echo "  Your own versions of the files that were changed on both sides are kept in:"
    echo "      $ASIDE"
    echo "  (the files themselves now have the new version from Forgejo). Ask Claude to put your changes back in."
fi
if printf '%s\n' "$THEIRS" | grep -q '^tools/content\.py$'; then
    echo
    echo "  (the content manager itself changed: close its window and start tools\\content.bat again)"
fi
exit 0
