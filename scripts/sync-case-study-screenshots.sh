#!/usr/bin/env bash
# Copy PNGs from Cursor browser screenshot temp into the repo case-study folder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DST="$ROOT/docs/case-study/screenshots"
TEMP="${CURSOR_SCREENSHOTS:-$HOME/.cursor/screenshots}"
ALT="/var/folders/h0/j0gr4xnd591b2xqhp5q2hr6w0000gn/T/cursor/screenshots"

mkdir -p "$DST"
for dir in "$TEMP" "$ALT"; do
  [[ -d "$dir" ]] || continue
  find "$dir" -name '*.png' \( -path "*case-study/screenshots/*" -o -name '20*.png' \) -print0 2>/dev/null \
    | while IFS= read -r -d '' f; do cp -f "$f" "$DST/"; done
done
echo "Synced to $DST:"
ls -la "$DST"/*.png 2>/dev/null || echo "(no PNGs yet)"
