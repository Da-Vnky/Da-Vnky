#!/bin/sh
# preview the site on your own computer before you push it (mac / linux / git bash):
#     sh tools/preview.sh
# then open http://localhost:8000 . press ctrl+c to stop.
cd "$(dirname "$0")/.." || exit 1
echo "previewing at http://localhost:8000  (ctrl+c to stop)"
# which python: the first one that really runs. on windows, "python3" and "python" can be the microsoft store's
# stand-ins, which only say "python was not found", so each is tried, not just looked for. (py first: on windows
# that's the real one, with the extras the tools need; mac and linux have no py, so they get python3.)
PY=""
for c in py python3 python; do
    if "$c" -c "import sys" >/dev/null 2>&1; then PY="$c"; break; fi
done
if [ -n "$PY" ]; then exec "$PY" tools/serve.py 8000
elif command -v npx >/dev/null 2>&1; then exec npx --yes http-server -p 8000 -c-1 .
else echo "couldn't find python or node; install python from https://www.python.org/downloads/"; fi
