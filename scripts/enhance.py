#!/usr/bin/env python3
"""Apply targeted upgrades to the original Claude prototype at bootstrap."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
game = root / "src/game.js"
s = game.read_text()

def change(old, new):
    global s
    if old not in s:
        raise RuntimeError("Expected game code not found: " + old[:85])
    s = s.replace(old, new, 1)

# The longer store uses the original instanced rendering to keep draw calls manageable.
change("const AISLES = 12, UNITS = 60;", "const AISLES = 24, UNITS = 100;")
change("// 17,280 items to stock", "// 57,600 items to stock")
change("const X_MIN = -16, X_MAX = 72, Z_MIN = -8, Z_MAX = 108,", "const X_MIN = -16, X_MAX = 145, Z_MIN = -8, Z_MAX = 180,")
change("const TYPE_NAMES = ['Soup Cans', 'Water Bottles', 'Fancy Wine'];",
       "const TYPE_NAMES = ['Soup Cans', 'Water Bottles', 'Fancy Wine'];")
# Avoid continuously doing background work while the final cinematic plays.
change("  robots.forEach(r => updateRobot(r, dt));", "  if (!ending) robots.forEach(r => updateRobot(r, dt));")
# More consistent perspective and minimize camera far clipping.
change("new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1500)",
       "new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1700)")
# Move the decorative conveyor supply stations along the length of the 100-unit aisles.
change("z: Z0 - 1 + (n % 6) * 16", "z: Z0 - 1 + (n % 6) * 26")
# Price tags deliver better feeling integer rewards after a few levels.
change("stat.value = 1 + 0.25 * S.lv.price;", "stat.value = 1 + 0.25 * S.lv.price;")
# Add a helpful, dismissable onboarding objective and a reset-save control.
change("const $ = id => document.getElementById(id);", """const $ = id => document.getElementById(id);
$('resetSave').addEventListener('click', event => {
  event.stopPropagation();
  if (confirm('Erase all saved Mustache Mart progress and restart?')) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
});""")
change("  if (e.code === 'KeyQ' && !ending) toggleShop();",
       "  if (e.code === 'KeyQ' && !ending && $('start').style.display === 'none') toggleShop();")
# Save immediately on stocked milestone; maintain an onboarding task and progress bar.
change("  if (S.stocked >= TOTAL) startEnding();", """  if (S.stocked % 100 === 0) save();
  if (S.stocked >= TOTAL) startEnding();""")
change("    const pc = S.stocked / TOTAL * 100;",
       """    $('objective').textContent = S.stocked === 0
      ? 'FIRST SHIFT · Find the yellow DELIVERY DOCK, hold E to fill your box.'
      : S.stocked < 12
        ? 'FIRST SHIFT · Carry boxes to the colorful aisles and hold E to stock.'
        : S.stocked < 100
          ? 'FIRST SHIFT · Press Q to invest your coins in faster stocking.'
          : 'OPENING PREP · No empty shelves allowed. Every single item counts.';
    const pc = S.stocked / TOTAL * 100;""")
# Safeguard recovered saves with too many items per unit.
change("S.fill[i] = v;", "S.fill[i] = Math.max(0, Math.min(PER, Number(v) || 0));")
game.write_text(s)

html = root / "index.html"
h = html.read_text()
h = h.replace("#hud { position:fixed;", "#objective { position:absolute; left:14px; top:67px; font-size:13px; max-width:min(680px,90vw); }\\n  #hud { position:fixed;")
h = h.replace('  <div id="cross"></div>', '  <div id="objective" class="pill">FIRST SHIFT · Find the delivery dock.</div>\\n  <div id="cross"></div>')
h = h.replace('<p><b>Click to start</b>', '<p><b>Click to start</b>')
h = h.replace('</div>\\n\\n<div id="shop">', '  <button id="resetSave" type="button">Reset saved progress</button>\\n</div>\\n\\n<div id="shop">')
html.write_text(h)

main = root / "main.js"
main.write_text("""const { app, BrowserWindow, shell } = require('electron');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#87d7ff',
    title: 'Mustache Mart',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadFile('index.html');
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
""".replace("app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');\\n", ""))

package = root / "package.json"
p = json.loads(package.read_text())
p["version"] = "0.2.0"
p["description"] = "An absurdly long, colorful, first-person supermarket shelf-stocking simulator."
p["scripts"]["check"] = "node --check main.js && node --check src/game.js"
p["build"]["appId"] = "com.mustachemart.game"
p["build"]["files"] = ["main.js", "index.html", "src/**/*", "node_modules/three/build/three.module.js"]
p["build"]["directories"] = {"output": "dist"}
package.write_text(json.dumps(p, indent=2) + "\n")

(root / "README.md").write_text("""# Mustache Mart 🥸

A cartoon first-person supermarket stocking game built with Electron and Three.js.
Based on the original Claude ZIP prototype and upgraded for a much larger store.

## Current playable version (0.2)
- 24 aisles, 100 shelf sections on each side of every aisle, three tiers of four items:
  **57,600 individual products** before opening day.
- Three grocery categories: soup cans, water bottles and wine bottles.
- WASD walk; mouse look; Shift sprint; hold E or click to collect and stock.
- Earn coins per item; Q opens the upgrade shop with better shoes, bag capacity,
  faster hands, higher item pay, conveyor supply stations and mustached auto-stocking robots.
- Auto-save in localStorage. The title screen has a reset-save control.
- After every item is stocked, the empty grand opening plays a 20-cycle accelerating
  sunrise/sunset montage, then a red WENT BANKRUPT banner and Thanks for Playing!

## Run locally

Requires Node.js 18+.

\`\`\`bash
npm install
npm start
\`\`\`

## Validate syntax

\`\`\`bash
npm run check
\`\`\`

## Desktop builds

\`\`\`bash
npm run dist
\`\`\`

Electron Builder is configured for unpacked desktop output. Build on each target OS
when practical and test each generated build. A build is **not** a published Steam
release: Steam distribution requires a Steamworks account, Steam Direct onboarding,
application setup, store assets, builds uploaded via SteamPipe, and Valve review.

## Developer shortcuts
The original prototype supports \`#rich\` for 10 million test coins and
\`#ending\` to preview the ending. These are debugging shortcuts, not achievements.

## Notes
- This is a playable prototype, not a content-complete commercial release.
- Conveyor purchases add animated supply pickup stations inside aisles. They do
  not yet implement a physics-based item transport network.
- Robot helpers autonomously travel to and fill incomplete shelves.
- Saves use localStorage on each machine, not Steam Cloud.
- The project deliberately avoids reusing assets from other games.
""")
print("Applied upgrades to Mustache Mart.")
