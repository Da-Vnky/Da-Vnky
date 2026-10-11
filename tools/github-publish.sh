#!/bin/sh
# github-publish.sh: brings Claude's changes from GitHub (its cloud sessions, claude.ai/code) into this folder and
# publishes them to Forgejo, the live site. tools\github-publish.bat runs it.
# (Oct 2026: only while the cloud-session credit lasts. Your usual tools\publish.bat is untouched and still the way
#  to publish your own changes; when you stop using GitHub, delete the four github-* tools and nothing else changes.)
#
# it
#   1. gets anything new from Forgejo first (tools/pull.sh: skizy's changes), like publish.bat
#   2. gets what's on GitHub's main branch: the changes you've approved there (merged pull requests), and puts it
#      together with this folder. It stops (and changes nothing) if a file Claude changed is one you've changed here
#      and not published, or if Claude's and skizy's changes clash in the same lines: then ask Claude to put them together
#   3. publishes, like publish.bat: rewrites the lists, takes the lines waiting in CHANGES.txt as the message, commits
#      and pushes to Forgejo
#   4. sends the result back to GitHub too (skizy's changes and the lists included), so the next cloud session starts
#      from exactly what's live
# Claude's work that's on GitHub but not approved yet (a pull request still open) isn't brought in: it says so.
#
# usage: sh tools/github-publish.sh

[ -f tools/update-lists.sh ] || cd "$(dirname "$0")/.." || exit 1
GENERATED='(^|/)list\.txt$|^catalog\.txt$|^files\.txt$|^manifest\.txt$|^assets/resets/index\.txt$|^content/living/albums\.txt$'
lists() { tr -d '\r' < tools/update-lists.sh | sh; }

if ! git remote get-url github >/dev/null 2>&1; then
    echo "  This folder isn't linked to GitHub yet: run tools\\github-upload.bat first."
    exit 1
fi
PAGE=$(git remote get-url github | sed 's#\.git$##')

# --- 1. Forgejo (skizy's changes)
echo
echo " 1. getting anything new from Forgejo (skizy's changes)..."
if ! tr -d '\r' < tools/pull.sh | sh -s -- --quiet; then
    echo
    echo " So nothing's been published. Your folder is just as it was."
    exit 1
fi

# --- 2. GitHub (Claude's changes)
echo
echo " 2. getting Claude's changes from GitHub..."
if ! git fetch --quiet --prune github; then
    echo
    echo " Couldn't reach GitHub ($PAGE). Are you online? (if a sign-in window opened, sign in.)"
    echo " Nothing's been published."
    exit 1
fi
if ! git rev-parse --verify --quiet refs/remotes/github/main >/dev/null; then
    echo " The GitHub copy is empty: run tools\\github-upload.bat first. Nothing's been published."
    exit 1
fi

# Claude's work still waiting for your approval (branches with changes main doesn't have)
WAITING=""
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/github/); do
    case "$b" in github/main|github/HEAD|github) continue ;; esac
    if [ "$(git rev-list --count "github/main..$b" 2>/dev/null)" != "0" ]; then
        WAITING="$WAITING
      ${b#github/}  ($(git log -1 --format='%ad' --date=format:'%b %d %H:%M' "$b"))"
    fi
done

INCOMING=$(git rev-list --count 'HEAD..github/main')
NEWWORK=$(git rev-list --no-merges --count 'HEAD..github/main')
if [ "$INCOMING" = "0" ]; then
    echo "    nothing new on GitHub's main branch."
else
    # what Claude changed, and what you've changed here but not published
    THEIRS=$(git diff --name-only 'HEAD...github/main' 2>/dev/null | grep -Ev "$GENERATED")
    MINE=$( (git diff --name-only HEAD; git ls-files --others --exclude-standard) 2>/dev/null | grep -Ev "$GENERATED" | sort -u)
    BOTH=$(printf '%s\n' "$MINE" | grep -Fx "$(printf '%s\n' "$THEIRS")" 2>/dev/null | grep -v '^$')
    if [ -n "$BOTH" ]; then
        echo
        echo " These files were changed by Claude on GitHub AND by you here (not published yet):"
        printf '%s\n' "$BOTH" | sed 's/^/      /'
        echo
        echo " So nothing's been brought in or published (your files are just as they were)."
        echo " Either publish yours first (tools\\publish.bat) and run this again, or ask Claude to put them together."
        exit 1
    fi
    # the lists here are written again anyway: put them back as they were, so they don't get in the way
    git diff --name-only HEAD 2>/dev/null | grep -E "$GENERATED" | while read -r f; do git checkout --quiet HEAD -- "$f"; done
    git ls-files --others --exclude-standard | grep -E "$GENERATED" | while read -r f; do rm -f "$f"; done
    LOG=$(git log --no-merges --format='      %ad  %s' --date=format:'%b %d %H:%M' 'HEAD..github/main' | head -20)

    if git merge-base --is-ancestor HEAD github/main; then
        git merge --ff-only --quiet --autostash github/main >.git/GITHUB_MERGE 2>&1 || {
            cat .git/GITHUB_MERGE; lists
            echo; echo " Bringing them in didn't work, so nothing's been published. Copy what it says above and ask for help."; exit 1; }
        rm -f .git/GITHUB_MERGE
    else
        # (skizy's or your own published changes since: both go together, in a merge)
        if ! git merge --no-ff --quiet --autostash --no-edit -m "Claude's changes from GitHub" github/main >.git/GITHUB_MERGE 2>&1; then
            CLASH=$(git diff --name-only --diff-filter=U 2>/dev/null)
            [ -f .git/MERGE_HEAD ] && git merge --abort >/dev/null 2>&1    # (puts everything back, your unpublished changes too)
            lists
            echo
            if [ -n "$CLASH" ]; then
                echo " Claude's changes on GitHub and the ones here (skizy's, or yours) clash in these files:"
                printf '%s\n' "$CLASH" | sed 's/^/      /'
                echo " So nothing's been brought in or published. Ask Claude to put them together."
            else
                cat .git/GITHUB_MERGE
                echo " Bringing them in didn't work, so nothing's been published. Copy what it says above and ask for help."
            fi
            exit 1
        fi
        rm -f .git/GITHUB_MERGE
    fi
    echo "    brought in $NEWWORK change(s) from GitHub:"
    printf '%s\n' "$LOG"
    if printf '%s\n' "$THEIRS" | grep -q '^tools/content\.py$'; then
        echo "    (the content manager itself changed: close its window and start tools\\content.bat again)"
    fi
fi

# --- 3. publish to Forgejo, as publish.bat does
echo
echo " 3. updating the file lists..."
lists
AHEAD=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)
LOCAL=$(git status --porcelain 2>/dev/null)
if [ "$AHEAD" = "0" ] && [ -z "$LOCAL" ]; then
    echo
    echo " Nothing new to publish: the live site already has everything."
elif [ "$AHEAD" = "0" ]; then
    # (nothing came from GitHub: your own changes here are publish.bat's to publish, with their own message)
    echo
    echo " Nothing new from GitHub to publish. Your own changes here are still waiting: publish them with tools\\publish.bat."
else
    echo
    echo " what's being published (anything of your own here that wasn't published yet goes too, as with publish.bat):"
    git status --short
    echo
    # the message: the lines waiting in CHANGES.txt (Claude adds them as it works), which move down into its log
    PY=""
    for c in py python python3; do
        if "$c" -c "import sys" >/dev/null 2>&1; then PY="$c"; break; fi
    done
    USEFILE=""
    if [ -n "$PY" ]; then
        if "$PY" tools/changes.py waiting >/dev/null 2>&1; then
            "$PY" tools/changes.py take && USEFILE=1
        elif [ -n "$LOCAL" ]; then
            "$PY" tools/changes.py take --also "Claude's changes from GitHub" && USEFILE=1
        fi
    fi
    git add -A
    if [ -n "$(git status --porcelain)" ]; then
        if [ -n "$USEFILE" ]; then git commit --quiet -F .git/PUBLISH_MSG --no-verify
        else git commit --quiet -m "Claude's changes from GitHub" --no-verify; fi
    fi
    echo
    echo " 4. publishing to Forgejo..."
    if ! git push --quiet; then
        echo
        echo " The push to Forgejo didn't go through. Copy what it says above and ask for help."
        echo " (Claude's changes are in your folder now; publish.bat will publish them once it's sorted.)"
        exit 1
    fi
    echo "    done: the live site updates in a minute or two."
fi

# --- 4. GitHub gets the same, so the next cloud session starts from what's live
if [ "$(git rev-parse HEAD)" != "$(git rev-parse github/main)" ]; then
    echo
    echo " 5. sending the same to GitHub, so Claude's next session starts from what's live..."
    if git push --quiet github HEAD:refs/heads/main; then
        echo "    done."
    else
        echo
        echo " That didn't go through (most likely Claude put something new on GitHub in the meantime)."
        echo " The live site's fine. Run this again to bring that in too."
    fi
fi

if [ -n "$WAITING" ]; then
    echo
    echo " Waiting on GitHub for your approval (not brought in): Claude's work on"
    printf '%s\n' "$WAITING" | grep -v '^$'
    echo " To bring one in: open $PAGE/pulls, open its pull request, \"Merge pull request\", then run this again."
    echo " (if you've already merged it, ignore this: you can delete the branch on GitHub)"
fi
exit 0
