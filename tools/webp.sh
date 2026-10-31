#!/usr/bin/env bash
# an animation's frames -> one animated WebP, at any size (tools/webp.py): tools/webp.sh <folder of frames>
cd "$(dirname "$0")/.." || exit 1
# which python: the first one that really runs. on windows, "python3" and "python" can be the microsoft store's
# stand-ins, which only say "python was not found", so each is tried, not just looked for. (py first: on windows
# that's the real one, with the extras the tools need; mac and linux have no py, so they get python3.)
PY=""
for c in py python3 python; do
    if "$c" -c "import sys" >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "couldn't find python 3: install it from https://www.python.org/downloads/"; exit 1; }
exec "$PY" tools/webp.py "$@"
