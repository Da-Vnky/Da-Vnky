#!/usr/bin/env bash
# an animation's frames -> one animated WebP, at any size (tools/webp.py): tools/webp.sh <folder of frames>
cd "$(dirname "$0")/.." || exit 1
exec python3 tools/webp.py "$@"
