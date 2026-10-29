# Mustache Mart 🥸

A ridiculous, long-form cartoon first-person supermarket stocking simulator.
Source is based on the original Claude prototype. This is an experimental **playable
prototype**, **not** a signed or published Steam product.

## Mac: safest way to try the current game (no Electron, no npm install)

1. Download **the entire latest repository** from
   https://github.com/NicholaiHan/Mustache-Mart/archive/refs/heads/main.zip
   and unzip it. Do **not** open the old `mustache-mart.zip` sitting inside.
2. Open Terminal. Type `cd ` (including the space), drag the **extracted folder**
   onto the Terminal window, then press Return.
3. Enter **`node server.cjs`**. Node.js is already installed if `node -v` prints a version.
4. Open **http://127.0.0.1:8000** in Safari or Chrome (on the same Mac).
5. Click the game screen to capture the mouse; press Escape to release it.
   Use Control+C in Terminal to stop the local server.

**No npm install, Electron installer, Apple security bypass, or login is required.**
The browser uses the committed `vendor/three.module.js`. The server binds only to
`127.0.0.1` and explicitly allows only the game's three local files. No
external game services, CDN or analytics are used. The code can be inspected.

If macOS shows **“Malware Blocked and Moved to Trash”** for Electron, do **not**
restore the app, use `xattr -d`, disable Gatekeeper or XProtect, or select an
override option. The browser path avoids Electron entirely. Security or
functionality can never be guaranteed 100%; only run software you trust.

## Features

- Cartoon-style 3D first-person world, 24 aisles × 2 sides × 100 shelf units
  × 3 tiers × 4 items = **57,600 products**.
- Stock soup cans, bottled water and wine. Earn coins per item.
- WASD walking, Shift sprinting, mouse look, E or click to grab supplies/stock.
- Q upgrade shop: better shoes, bag capacity, faster hands, improved earnings,
  supply conveyor stations and mustached self-stocking robots.
- Browser-local save progress; Reset button on title screen.
- When every shelf is filled, an empty grand opening leads to 20 progressively
  faster sunrise/sunset cycles, then **WENT BANKRUPT / Thanks for Playing!**

Conveyor upgrades currently create supply stations, not a full physics-based
transport network. This prototype is not feature-complete.

## Offline checks

No package install is required to run the static/server tests:

```sh
node --check server.cjs
node --check src/game.js
node --test tests/smoke.test.cjs
```

To preview the full ending without stocking every shelf, visit
`http://127.0.0.1:8000/#ending`. The automated test-only short preview is
`#ending-test`. The `#rich` developer shortcut awards testing coins.

GitHub Actions runs static/server tests on macOS and Linux, plus headless
Chromium game-start and ending smoke tests. See **Actions** for actual results.
Passing CI verifies those scenarios, **not** every graphics card or Mac OS
version. A human playthrough on the target Mac is still necessary.

## Desktop development and Steam

The Electron wrapper remains in source for later desktop packaging, but **do
not use `npm start`** on a Mac that previously blocked Electron as malware.
A Steam-ready Mac release still needs an audited runtime, code signing and
Apple notarization, Steamworks onboarding, release assets, performance testing,
controller/accessibility work, and an end-to-end playtest. Linux and Windows
desktop distribution also require dedicated release verification.

The game runs entirely on your own machine; progress is saved by the browser
in localStorage and does not sync to Steam Cloud.
