#!/bin/sh
# github-upload.sh: puts a copy of the site on GitHub, so Claude's cloud sessions (claude.ai/code) can work on it.
# (Oct 2026: only while the cloud-session credit lasts. Forgejo stays the real home; when you stop using GitHub,
#  delete the four github-* tools and nothing else changes.)
# tools\github-upload.bat runs it (it asks for the address the first time).
#
# it
#   1. gets anything new from Forgejo first (tools/pull.sh: skizy's changes), so GitHub gets the latest
#   2. remembers the GitHub address (git calls it the "github" remote; Forgejo stays "origin")
#   3. sends everything you've published to GitHub. Changes you haven't published yet stay here: they don't
#      go (publish first if you want the cloud sessions to have them). Nor does anything .gitignore keeps out
#      (.inbox, your originals, the templates)
# it never overwrites anything on GitHub: if GitHub has work that isn't here yet (Claude's), it stops and says
# to run tools\github-publish.bat instead, which brings it here, publishes it, and keeps GitHub up to date too.
#
# usage: sh tools/github-upload.sh [https://github.com/you/repository]

[ -f tools/update-lists.sh ] || cd "$(dirname "$0")/.." || exit 1
ADDR="${1:-$GITHUB_ADDR}"

# --- the address: https://github.com/<you>/<repository> (or github.com/..., or <you>/<repository>, with or without .git)
if [ -n "$ADDR" ]; then
    A=$(printf '%s' "$ADDR" | tr -d ' \r\n"' | sed -e 's#^git@github\.com:#github.com/#' -e 's#^[A-Za-z]*://##' \
        -e 's#^www\.##' -e 's#/*$##' -e 's#\.git$##')
    case "$A" in github.com/*) ;; *) A="github.com/$A" ;; esac
    if ! printf '%s\n' "$A" | grep -Eq '^github\.com/[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'; then
        echo "  \"$ADDR\" doesn't look like a GitHub repository's address."
        echo "  It should look like https://github.com/your-name/DaV-nky (copy it from the repository's page)."
        exit 1
    fi
    URL="https://$A.git"
    if git remote get-url github >/dev/null 2>&1; then
        [ "$(git remote get-url github)" = "$URL" ] || { git remote set-url github "$URL"; echo "  (the GitHub address is now $URL)"; }
    else
        git remote add github "$URL" || { echo "  Couldn't remember the address. Ask for help."; exit 1; }
        ADDED=1
    fi
elif ! git remote get-url github >/dev/null 2>&1; then
    echo "  Which GitHub repository? Run it again with its address, e.g."
    echo "      sh tools/github-upload.sh https://github.com/your-name/DaV-nky"
    exit 1
fi
URL=$(git remote get-url github)
PAGE=$(printf '%s' "$URL" | sed 's#\.git$##')

# --- 1. the latest from Forgejo
echo
echo "  1. getting anything new from Forgejo first (skizy's changes)..."
if ! tr -d '\r' < tools/pull.sh | sh -s -- --quiet; then
    echo
    echo "  So nothing's gone to GitHub. Your folder is just as it was."
    exit 1
fi

# --- 2. what GitHub has already
echo
echo "  2. looking at the GitHub repository ($PAGE)..."
echo "     (if a GitHub sign-in window opens, sign in: it only asks once)"
if ! git fetch --quiet --prune github; then
    echo
    echo "  Couldn't reach it. Check that the address is right, that the repository exists,"
    echo "  and that you signed in as its owner. Nothing's been sent."
    [ -n "$ADDED" ] && git remote remove github     # (so next time it asks for the address again)
    exit 1
fi
if git rev-parse --verify --quiet refs/remotes/github/main >/dev/null; then
    if [ -z "$(git merge-base HEAD github/main 2>/dev/null)" ]; then
        echo
        echo "  That GitHub repository already has something in it that isn't the site"
        echo "  (usually a README or licence GitHub added when it was made). Nothing's been sent."
        echo "  Make a new repository with nothing in it (no README, no .gitignore, no licence) and use its address,"
        echo "  or ask for help."
        exit 1
    fi
    if ! git merge-base --is-ancestor github/main HEAD; then
        echo
        echo "  GitHub has work that isn't in your folder yet (from Claude's cloud sessions). Nothing's been sent,"
        echo "  so none of it is lost. Run tools\\github-publish.bat instead: it brings that work here, publishes it,"
        echo "  and keeps GitHub up to date as well."
        exit 1
    fi
    if [ "$(git rev-parse HEAD)" = "$(git rev-parse github/main)" ]; then
        GITHUB_SAME=1
    fi
fi

# (changes that aren't published yet: they stay here)
NOTYET=$( (git diff --name-only HEAD; git ls-files --others --exclude-standard) 2>/dev/null \
    | grep -Ev '(^|/)list\.txt$|^catalog\.txt$|^files\.txt$|^manifest\.txt$|^assets/resets/index\.txt$|^content/living/albums\.txt$' | sort -u)

if [ -n "$GITHUB_SAME" ]; then
    echo
    echo "  GitHub already has everything you've published. Nothing to send."
else
    # --- 3. send it
    echo
    echo "  3. sending the site to GitHub (the first time takes a few minutes)..."
    if ! git push github HEAD:refs/heads/main; then
        echo
        echo "  It didn't go through. Copy what it says above and ask for help."
        exit 1
    fi
    git fetch --quiet github 2>/dev/null
    echo
    echo "  Done. The site is on GitHub: $PAGE"
fi
if [ -n "$NOTYET" ]; then
    echo
    echo "  (These changes of yours aren't published yet, so they stayed here and GitHub doesn't have them:"
    printf '%s\n' "$NOTYET" | head -12 | sed 's/^/      /'
    [ "$(printf '%s\n' "$NOTYET" | wc -l)" -gt 12 ] && echo "      ...and more"
    echo "   publish them first, then run this again, if you want Claude's cloud sessions to have them.)"
fi
echo
echo "  Next: start a session at claude.ai/code and pick this repository. When Claude's done, approve its"
echo "  changes on GitHub (merge the pull request), then run tools\\github-publish.bat to put them on the live site."
exit 0
