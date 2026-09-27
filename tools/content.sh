#!/bin/sh
# content.sh: the content manager on mac / linux (the same as content.bat on windows).
#     sh tools/content.sh
# then your browser opens http://localhost:8001/ . ctrl+c (or close the terminal) to stop it.
# needs python 3 (python3 on the command line).
cd "$(dirname "$0")/.." || exit 1
if command -v python3 >/dev/null 2>&1; then exec python3 tools/content.py
elif command -v python >/dev/null 2>&1; then exec python tools/content.py
else echo "couldn't find python 3: install it (e.g. sudo pacman -S python, or sudo apt install python3)"; exit 1; fi
