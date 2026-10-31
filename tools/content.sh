#!/bin/sh
# content.sh: the content manager on mac / linux (the same as content.bat on windows).
#     sh tools/content.sh
# then your browser opens http://localhost:8001/ . ctrl+c (or close the terminal) to stop it.
# needs python 3.
cd "$(dirname "$0")/.." || exit 1
# which python: the first one that really runs. on windows, "python3" and "python" can be the microsoft store's
# stand-ins, which only say "python was not found", so each is tried, not just looked for. (py first: on windows
# that's the real one, with the extras the tools need; mac and linux have no py, so they get python3.)
PY=""
for c in py python3 python; do
    if "$c" -c "import sys" >/dev/null 2>&1; then PY="$c"; break; fi
done
if [ -n "$PY" ]; then exec "$PY" tools/content.py
else echo "couldn't find python 3: install it (e.g. sudo pacman -S python, or sudo apt install python3)"; exit 1; fi
