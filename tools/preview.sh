#!/bin/sh
# preview the site on your own computer before you push it (mac / linux / git bash):
#     sh tools/preview.sh
# then open http://localhost:8000 . press ctrl+c to stop.
cd "$(dirname "$0")/.." || exit 1
echo "previewing at http://localhost:8000  (ctrl+c to stop)"
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then exec python -m http.server 8000
elif command -v npx >/dev/null 2>&1; then exec npx --yes http-server -p 8000 -c-1 .
else echo "couldn't find python or node; install python from https://www.python.org/downloads/"; fi
