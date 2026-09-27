#!/bin/sh
# merge-prs.sh — merges pull requests (Mel's) from Forgejo into the site, here on this computer, and publishes
# the result. For when Forgejo's own merge button won't: it says "changes conflicting with the target branch"
# because both sides rewrote the lists (catalog.txt, files.txt, manifest.txt, list.txt …). Those are made by
# tools/update-lists.sh, never by hand, so here they're simply written again, and nothing is lost.
# tools\merge-prs.bat runs it (it asks which pull requests).
#
# usage: sh tools/merge-prs.sh 7 8 9 10        (the pull requests' numbers, oldest first)
#
# it stops, changing nothing, if: you have changes here that aren't published yet (publish first), Forgejo
# can't be reached, or a pull request clashes with your work in a real file (not a list): then ask Claude.
# afterwards Forgejo shows the pull requests as merged (if its "autodetect manual merge" setting is on;
# otherwise close them there: their changes are in).

[ -f tools/update-lists.sh ] || cd "$(dirname "$0")/.." || exit 1
GENERATED='(^|/)list\.txt$|^catalog\.txt$|^files\.txt$|^manifest\.txt$|^assets/resets/index\.txt$|^content/living/albums\.txt$'
git config merge.regen.driver true
git config merge.regen.name "the site's lists: written again by update-lists.sh"

if [ $# -eq 0 ]; then
    echo "  Which pull requests? e.g.  sh tools/merge-prs.sh 7 8 9 10"
    exit 1
fi
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then
    echo "  An earlier pull, publish or merge didn't finish. Nothing's been changed now."
    echo "  Ask for help (say: \"git status shows a merge or rebase in progress\")."
    exit 1
fi
# (your own unpublished changes: publish them first, so they can't get mixed up in this)
DIRTY=$(git status --porcelain --untracked-files=no | sed 's/^...//' | grep -Ev "$GENERATED")
if [ -n "$DIRTY" ]; then
    echo "  You have changes here that aren't published yet:"
    printf '%s\n' "$DIRTY" | sed 's/^/      /'
    echo "  Publish them first (tools\\publish.bat), then run this again. Nothing's been changed."
    exit 1
fi
git checkout --quiet -- . 2>/dev/null        # (only lists could differ here: they're written again at the end)

echo "  getting the latest from Forgejo..."
tr -d '\r' < tools/pull.sh | sh -s -- --quiet || exit 1

MERGED=""
for n in "$@"; do
    case "$n" in *[!0-9]*|'') echo "  \"$n\" isn't a pull request number. Stopping here."; break ;; esac
    echo
    echo "  pull request #$n:"
    if ! git fetch --quiet origin "+refs/pull/$n/head:refs/heads/pr-$n"; then
        echo "    Couldn't get it from Forgejo (is #$n the right number?). Stopping here."
        break
    fi
    if [ -z "$(git rev-list --count HEAD..pr-$n | grep -v '^0$')" ]; then
        echo "    already in: nothing to do."
        git branch -D --quiet "pr-$n"
        continue
    fi
    if git merge --no-ff --no-edit -m "merge pull request #$n (Mel)" "pr-$n" >/dev/null 2>&1; then
        echo "    merged."
    else
        # a clash: fine if it's only the lists (they're written again below); anything else, stop and undo this one
        CLASH=$(git diff --name-only --diff-filter=U)
        REAL=$(printf '%s\n' "$CLASH" | grep -Ev "$GENERATED" | grep -v '^$')
        if [ -n "$REAL" ]; then
            git merge --abort
            echo "    It clashes with your work in:"
            printf '%s\n' "$REAL" | sed 's/^/        /'
            echo "    So #$n isn't merged (and nothing from it's been kept). Ask Claude to put these together."
            git branch -D --quiet "pr-$n"
            break
        fi
        printf '%s\n' "$CLASH" | while read -r f; do [ -n "$f" ] && git checkout --quiet --ours -- "$f" && git add -- "$f"; done
        git commit --quiet --no-edit --no-verify
        echo "    merged (the lists both sides changed are written again at the end)."
    fi
    git branch -D --quiet "pr-$n"
    MERGED="$MERGED #$n"
done

if [ -z "$MERGED" ]; then
    echo
    echo "  Nothing was merged, so nothing's been published."
    exit 1
fi
echo
echo "  writing the lists again..."
tr -d '\r' < tools/update-lists.sh | sh
git add -A -- catalog.txt files.txt manifest.txt assets/resets/index.txt content/living/albums.txt ':(glob)**/list.txt' 2>/dev/null
if ! git diff --cached --quiet; then git commit --quiet --no-verify -m "the lists, written again after merging$MERGED"; fi
echo "  publishing..."
if ! git push --quiet; then
    echo "  Couldn't push to Forgejo. The merge is done here; run tools\\publish.bat to try again."
    exit 1
fi
echo
echo "  Done: merged and published$MERGED."
echo "  Tell Claude, so it can check nothing broke."
