# Mustache Mart 🥸

First-person, cartoony shelf-stocking game. The store is absurdly big, the grand opening is coming, and nobody is going to show up.

## Run it
```bash
npm install
npm start
```
(Electron + Three.js. Needs Node 18+.)

## Controls
WASD move · Shift sprint · Mouse look · Hold **E** or left-click to grab stock / stock shelves · **Q** shop · **F** fullscreen

## Gameplay
- Grab stock at the **Delivery Dock** (left of the entrance), walk down an aisle, hold E to stock shelves (cans, water bottles, wine).
- Every item earns coins. Spend them in the shop: sneakers, bag size, fast hands, price tags, **conveyor belts** (supply points inside the aisles) and **mustache robots** that stock on their own.
- 17,280 items to stock. When the last one is in, the grand opening happens.

## Tuning
Constants at the top of `src/game.js` (`AISLES`, `UNITS`, upgrade cost curves, ending timing).

## Testing shortcuts
- `#rich` in the URL hash gives 10M coins (when running in a browser)
- `#ending` jumps straight to the ending
Open `index.html` through any static server (e.g. `npx serve`) to test in a browser.
Progress autosaves to localStorage.

## Push to GitHub
```bash
git init && git add . && git commit -m "Mustache Mart: first playable"
git branch -M main
git remote add origin https://github.com/<you>/mustache-mart.git
git push -u origin main
```

## Steam
1. Pay the Steam Direct fee and create the app in Steamworks.
2. `npm run dist` builds unpacked desktop builds into `dist/` (Win/Mac/Linux; build each OS on that OS).
3. Upload `dist/<platform>-unpacked` with SteamPipe (`steamcmd`) per Valve's docs.
4. Optional: add achievements/cloud saves with the `steamworks.js` package.
