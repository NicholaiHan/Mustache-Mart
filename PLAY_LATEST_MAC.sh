#!/bin/bash
# Launch the full updated build from this folder, never from a stale Desktop app.
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
 echo "Node.js is required. Install Node 20+ before launching."
 exit 1
fi
if [ ! -f build.json ] || [ ! -f src/checkout.js ] || [ ! -f src/ladder.mjs ] || [ ! -f src/game.js ]; then
 echo "INCOMPLETE OR OLD FOLDER: Download the full Mustache-Mart main branch ZIP."
 exit 1
fi
VERSION=$(node -p "require('./build.json').version")
PORT="${PORT:-8011}"
echo ""
echo "MUSTACHE MART - UPDATED BUILD ${VERSION}"
echo "Correct folder: $PWD"
echo 'Checkouts, service robot Mike, ladders, conveyors, fire exit, and $500 dev funds'
echo "Open http://127.0.0.1:${PORT}/#dev"
echo "Control+C to close the server."
echo ""
PORT="$PORT" node server.cjs
