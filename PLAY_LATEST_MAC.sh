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
PORT="${PORT:-8000}"
echo ""
echo "MUSTACHE MART - UPDATED BUILD ${VERSION}"
echo "Correct folder: $PWD"
echo 'Detailed fire exit, saved skills, and one-click developer funds' 
echo 'Use the SAME browser and SAME port that holds your saved progress.' 
echo 'Default 8000 restores the earlier browser save location. If yours is on 8011, launch with PORT=8011 bash PLAY_LATEST_MAC.sh.'
echo "Open http://127.0.0.1:${PORT}/#dev"
echo "Control+C to close the server."
echo ""
PORT="$PORT" node server.cjs
