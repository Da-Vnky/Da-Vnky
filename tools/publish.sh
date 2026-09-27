#!/bin/sh
# publish.sh: put your changes on the live site, on mac / linux (the same as publish.bat on windows).
#     sh tools/publish.sh                      asks what you changed
#     sh tools/publish.sh "what you changed"   doesn't ask
# it
#   1. gets anything new from Forgejo first (tools/pull.sh: somebody else's pushes), and stops if a file was
#      changed both here and there (run sh tools/pull.sh on its own then: it keeps a copy of yours)
#   2. rewrites every list (tools/update-lists.sh), so new files appear and deleted ones go
#   3. commits everything and pushes. the message: the lines waiting in CHANGES.txt ("not published yet"), which
#      then move down into its log (tools/changes.py); if there aren't any, it asks what you changed
# the content manager's "publish" button runs this too (with PUBLISH_MSG set).
cd "$(dirname "$0")/.." || exit 1
echo
echo " 1. getting anything new from Forgejo..."
if ! sh tools/pull.sh --quiet; then
    echo
    echo " So nothing's been published. Your changes are still here, just as they were."
    exit 1
fi
echo
echo " 2. updating the file lists..."
sh tools/update-lists.sh
echo
git status --short
echo
# 3. the message: what's waiting in CHANGES.txt (tools/changes.py), or else what you type
MSG="$1"
[ -n "$PUBLISH_MSG" ] && MSG="$PUBLISH_MSG"
PY=""
command -v python3 >/dev/null 2>&1 && PY=python3
[ -z "$PY" ] && command -v python >/dev/null 2>&1 && PY=python
HAVE=""
[ -n "$PY" ] && "$PY" tools/changes.py waiting >/dev/null 2>&1 && HAVE=1
if [ -z "$HAVE" ] && [ -z "$MSG" ] && [ -t 0 ]; then
    printf ' 3. what did you change? (a few words, then Enter): '
    read -r MSG
fi
[ -n "$MSG" ] || MSG="update"
USEFILE=""
[ -n "$PY" ] && "$PY" tools/changes.py take --also "$MSG" && USEFILE=1
git add -A
if [ -n "$USEFILE" ]; then git commit -F .git/PUBLISH_MSG --no-verify; else git commit -m "$MSG" --no-verify; fi
if ! git push; then
    echo
    echo " The push didn't go through. Read what it says above (often: pull first, or log in again)."
    exit 1
fi
echo
echo " Done. The live site updates in a minute or two."
