# Mustache Mart 🥸

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

## Play in your browser (no Electron needed)

Requires Node.js (Node 22 LTS or newer recommended). This is a local developer
preview and does not publish your game to the internet.

```bash
npm install --ignore-scripts
npm run web
```

Open http://localhost:8000 in Chrome or Safari. Keep Terminal open while playing;
press Ctrl+C to stop the preview.

## Play as a desktop app

Only use this option if macOS allows the downloaded runtime to run normally.

```bash
npm install
npm start
```

If macOS displays **Malware Blocked and Moved to Trash**, do not override XProtect,
disable Gatekeeper, or restore the blocked executable. Update macOS first and
only use a current, trusted Electron release, or use the browser preview instead.
A local Electron development build is not code-signed or notarized for public
distribution; a future Steam/macOS build needs security review and proper signing.

## Validate syntax

```bash
npm run check
```

## Desktop builds

```bash
npm run dist
```

Electron Builder is configured for unpacked desktop output. Build on each target OS
when practical and test each generated build. A build is **not** a published Steam
release: Steam distribution requires a Steamworks account, Steam Direct onboarding,
application setup, store assets, builds uploaded via SteamPipe, and Valve review.

## Developer shortcuts
The original prototype supports `#rich` for 10 million test coins and
`#ending` to preview the ending. These are debugging shortcuts, not achievements.

## Notes
- This is a playable prototype, not a content-complete commercial release.
- Conveyor purchases add animated supply pickup stations inside aisles. They do
  not yet implement a physics-based item transport network.
- Robot helpers autonomously travel to and fill incomplete shelves.
- Saves use localStorage on each machine, not Steam Cloud.
- The project deliberately avoids reusing assets from other games.

