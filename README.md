# Mustache Mart — Fifteen Floors of Regret

A first-person supermarket stocking and automation prototype with **15 huge floors, 144,000 products, industrial-style metal racks, and a more realistic, muted supermarket interior**. Built in Three.js. Mac users can play it safely through a local browser rather than the previously blocked Electron runtime.

## Guaranteed latest-version setup (copy/paste for Mac)

**Do not use an old downloaded `mustache-mart.zip`, old Electron app, or previously extracted folder.** The obsolete small ZIP has been removed from GitHub. The complete game is always in the live `main` branch archive.

1. Copy the **whole** block below into Terminal. It downloads the current complete game, checks the ZIP, keeps the former folder under a dated backup name, and runs the new copy on **port 8011** so any old server on 8000 cannot interfere:

```bash
cd "$HOME/Desktop" || exit
curl --fail --location --retry 3 "https://github.com/NicholaiHan/Mustache-Mart/archive/refs/heads/main.zip" --output Mustache-Mart-CURRENT.zip
unzip -tq Mustache-Mart-CURRENT.zip >/dev/null || exit
if [ -d Mustache-Mart-main ]; then
  mv Mustache-Mart-main "Mustache-Mart-previous-$(date +%Y%m%d-%H%M%S)"
fi
unzip -oq Mustache-Mart-CURRENT.zip
cd Mustache-Mart-main || exit
bash PLAY_LATEST_MAC.sh
```

2. Open **http://127.0.0.1:8011/#dev** in Chrome or Safari. The title screen and the upper-right HUD must show **UPDATED BUILD · 2026.10.30.3** and the introduction must list the new cash registers, Mike, ladders and fire exit.
3. **Development mode** (the `#dev` suffix) gives **at least $500** for testing. Stop the server with **Control+C**.
4. Port **8011 is deliberately different from 8000**: existing browser saves at port 8000 are still retained, but do not appear automatically at 8011 (browser storage is origin-specific). For continuing the same saved progress after verifying the build, stop the older port-8000 server, then in the downloaded folder run `node server.cjs` and open `http://127.0.0.1:8000/#dev`.

If the Terminal version line or the title-screen badge is absent, you launched a different/older copy. Do not proceed until **UPDATED BUILD · 2026.10.30.3** is shown.

## Play on your MacBook

1. Download the **full latest repository ZIP**: https://github.com/NicholaiHan/Mustache-Mart/archive/refs/heads/main.zip
2. Extract the ZIP. Move the **Mustache-Mart-main** folder to your Desktop. Keep the old downloaded ZIP as a backup or rename the older extracted folder.
3. Open Terminal and enter these commands one line at a time:

       cd ~/Desktop/Mustache-Mart-main
       node server.cjs

4. Open **http://127.0.0.1:8000** in Safari or Chrome. Leave Terminal open.
5. Stop the local server with **Control+C** in Terminal.

You do not need npm install, Electron, a Steam account, or any changes to macOS security settings. Do not restore an Electron app that macOS blocked.

## New gameplay

- **Realistic store styling:** stainless and steel rack structures, muted stock colors, neutral tile floors, ceiling ducts, long fluorescent lights, rear pallets, and visible warehouse receiving areas.
- **Industrial equipment polish:** rounded off-white mustached robots with dark visors, individual rubber wheels, orange utility details, and a redesigned powered stocking cart with mechanical lift and safety rails. Conveyor sections have rollers, metal guards and structural feet. Inspired by smooth industrial utility equipment while keeping the supermarket setting.
- **One-sided signage:** labels face their intended approach direction; from behind, they are not mirrored or readable backward.
- **Mustache Mike:** a unique, full robotic concierge with bright white eyes and a white mustache. Unlike small stocker robots, he has a premium service chassis and mechanical arms.
- **Tall shelves:** shelf structures are approximately 13.5 world units high—about four times the original shelf height.
- **Four shelf heights:** two low bands earn **1¢**, the third earns **2¢**, and the top band **3¢**. Press **L** to place a portable ladder in an aisle, **C** to grip the ladder, and hold **W/S** to physically climb/descend. A telescopic extension makes the fourth band reachable. The self-driving ladder cart can also stock the top band.
- **Backroom inventory:** the delivery stock is now near the **rear wall (x=1.5, z=96)**, straight down the long store from Mike's counter, making early manual trips lengthy. Running shoes, carrying upgrades, conveyors and robots become valuable.
- **Manual payroll:** take your stocking earnings back to the **PAY WINDOW** near the front until automatic payroll is unlocked.
- **Two shopkeeper categories:** **Equipment & Automation** and **Economy Contracts**. The new **$50 Canned Goods Supercontract** multiplies all canned-goods rewards by **3×**. Water partnerships, high-shelf bonuses, and automation-profit bonuses are also available.
- **Working conveyors:** build sequential rear-to-front sections with **B**. Products are transported over time and accumulate at the connected end; both the player (E to collect) and robots can remove delivered stock. Robots compare available belt endpoints with the warehouse dock and choose the closest available supply.
- **Separately purchasable robots and robot upgrades:** buy each **Mustache Stocker Bot** at Mike's. After purchase, walk toward an aisle or aim the unlocked cursor at an aisle floor and **left-click** to deploy the translucent ghost. Bots prefer nearby empty spaces and fetch inventory from the nearest available stocked conveyor endpoint or warehouse receiving. **Robot Espresso** upgrades robot movement/stocking speed; **Motorized Robot Ladder** allows mobile high-shelf lifting. Without it, robots can only climb the player's installed ladders (not deploy their own). Robot selling and repositioning are available in Mike's store.
- **Equipment resale:** stand beside a placed ladder, worker robot, or the exposed last conveyor section and press **X** to sell it for **half of its original purchase price**. Mike's robot management cards also offer individual robot sales and relocation. Belt segments must be removed from the delivery end backward to keep the pipeline connected.
- **Save migration:** the game automatically migrates existing fifteen-floor v3 saves into four-tier v4 saves. Previous saves remain under their original browser storage keys as backups.

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk |
| Mouse / arrow keys | Look around (aim up for tall racks) |
| Shift | Sprint |
| E or mouse click | Pick up inventory (warehouse or conveyor), stock, collect wages, interact |
| Space | Jump after buying shoes |
| L | Place an owned portable ladder in the aisle |\n| C | Grip/release a ladder; W climbs and S descends while attached |\n| X | Sell a nearby robot, deployed ladder, or the last belt segment at 50% refund |\n| Left click while placing a robot | Deploy the translucent robot preview at the selected aisle spot |
| B | Add the next connected belt segment, starting from the back |
| Q | Open Mike's store when standing nearby |
| R | Choose an elevator floor when nearby |
| Escape | Close Mike's shop, the elevator menu, or the pause dialogue |
| Control+C in Terminal | Stop the game server |

## Verification

Automated CI tests on macOS 15 and Linux check the game's core economy, 1¢ / 2¢ / 3¢ tier rewards, $50 canned-goods contract, legacy-save conversion, bot automation, local-only server file restrictions, and actual headless Chromium gameplay (pickup, pay window, shopkeeper purchases, Escape, backroom conveyor, 15th floor and ending).

To test source/economy locally (no npm install necessary):

    node --check src/game.js
    node --check src/rules.mjs
    node --test tests/*.test.cjs

Developer testing: add **#rich** to the URL for testing coins, or **#ending-test** to preview the ending quickly.


## Modular game architecture

The original monolithic game source has been separated into focused modules while keeping `src/game.js` as the entrypoint:

| File | Responsibility |
| --- | --- |
| `src/game.js` | Input, movement, menus, gameplay orchestration and final cinematic |
| `src/rendering.js` | GPU geometry helpers, one-sided signs and graphics resource cleanup |
| `src/environment.js` | Textured walls, ceiling, store architecture, stock shelves, Mike's counter, payroll and receiving |
| `src/characters.js` | Robotic shopkeeper Mike and autonomous mustached workers |
| `src/equipment.js` | Conveyor sections, carts, ladder equipment and industrial materials |
| `src/doors.js` | Animated fire exit, brick obstruction and final entrance sliding doors |
| `src/rules.mjs` | Core economy, inventory counts, robot stocking, upgrades and save migration |
| `server.cjs` | Local-only Mac browser asset server with explicit allowlist |

### New doors and winning condition

- **Fire exit on Floor 1:** One red door, labeled FIRE EXIT. Approach it on the right side of the store around aisle 10, then press E to swing it open or closed. Behind it is a brick wall.
- **Main entrance on Floor 1:** The front doors stay locked until **all 144,000 products** have been placed. Press E before 100% to see the message that the building must be stocked first.
- **Manually trigger the finale:** When you reach 100%, visit the front entrance and press E to slide open the doors. That action, not merely filling the last shelf, starts the 20-day grand-opening cinematic.
- The walls have physical openings for both doors rather than coincident wall polygons, with layered plaster textures, steel trims and detailed customer-service/receiving stations.

These are real in-game interactions, not just decorative door mockups.

## Prototype limitations

This is still a procedural browser game rather than a fully modeled commercial simulator. There is no physics-based conveyor transport network with arbitrary corners or junctions, full-length manual endurance test, native notarized macOS app, or published Steam build. A passing CI test is useful evidence, not a 100% guarantee across every browser, Mac model, or playthrough. Progress remains local to your browser.


## First-floor visual & functional improvement (October 29, 2026)

- **Four real-looking cashier lanes, Floor 1 only:** animated checkout conveyors, solid grounded belt frames, scanner and monitor, card-payment terminal, receipt hardware, hanging lane number, bagging area and a **tiny white mustache on each register casing**. Interact with E by the terminal; customer payments are reserved for the grand opening (there are no simulated shoppers prior to opening).
- **Mustache Mike now stands behind his customer-service desk** rather than in front. The desk has a visible fascia, countertop, glass-free customer approach, fixed overhead shop signage, and point-of-sale display.
- **Payroll window is one cohesive physical assembly:** glass frame, fixed signage/header, nearby back panel, solid counter, printer and staff-service signage. No disconnected floating backdrop.
- **The sole red FIRE EXIT remains interactive with E on the Floor 1 back-left wall, around x=-9.5, z=85.** Opening it reveals brickwork, not a route outdoors.
- **Ladders are physically climbable:** stand near a placed ladder, press **E or C** to grab it, hold W/S to climb or descend (extension unlocks the 3¢ upper band), and press C to release. L still deploys an owned ladder, X sells a deployed ladder for half its purchase cost.
- **Actual inventory conveyors** continue to transport and accumulate stock; pick delivered items up with E or let robots choose a nearby supplied belt.
- **Explicit development mode gives at least $500 in your account** at startup: open `http://127.0.0.1:8000/#dev` (or the older `#rich` alias). This means **50,000 cents**, applies only when you deliberately use a development URL, and never reduces an already higher saved balance. It does not affect normal mode.
- **Four cashier lane colliders are on Floor 1 only**; they do not obstruct higher levels.

### Verification

`tests/first-floor-30.test.cjs` runs **30 different accelerated first-floor game sessions**, each completely filling **9,600 products** on Floor 1 (total **288,000 stocked products**) through production inventory/earnings rules and verifying paid stock, developer opening funds, each shop category, robot purchase/deployment, belt transport/pickup, ladder ascent, 50% resale, automatic workers and cart, save/load, all four checkout colliders, and that finishing Floor 1 alone does **not** unlock the 15-floor entrance.

These are deterministic **accelerated gameplay/rules simulations**, not thirty human-controlled rendered sessions. Separately, Playwright browser smoke tests actually render the first floor and interact with the checkout register, paycheck terminal, Mike, ladders, conveyor belts and red fire exit in Chromium.

## Build 2026.10.30.3: conveyor visualization and structural art

- **Original top-left HUD icons** replace all five phone/OS emoji labels: store, cash, payroll, carrying and robots are custom scalable vector artwork.
- At **rear receiving** (near the inventory pickup), use **[** and **]** to select an aisle, then press **B** to connect its **first** conveyor segment. Its status panel shows the selected aisle, connected branches and delivered items out of 16. Once the first branch exists, extend it from its **frontmost tip** with B. Sections move in one direction, **toward the entrance**, and production pauses when their endpoint is full.
- A visible overhead feeder connects receiving to the aisle chutes, with an industrial pickup claw, movement on connected source branches, arrows, frame fasteners, caution guards and belt gearboxes.
- Shelves include thousands of small **instanced hex-head bolts**, back braces and aisle end guards. Register stations add tactile keypads, scanner windows, receipt paper, tiny flat white mustaches and stainless steel mounting hardware.
- Saves and the original 15-floor stocking rules remain unchanged.

## October 30, 2026 — Player-controlled logistics

- Motorized ladder platform: buy the **Motorized Platform Ladder** at Mike's. Approach the platform and press **F** to ride; **Space** raises it, **Ctrl** lowers it, **WASD** drives along the aisle (sideways aisle changes occur at the back crosswalk). Press **F** again to exit. It never stocks shelves for you.
- Pallet jack: stand near it and press **F** to drive. At the back inventory counter press **U** to load. Drive to an aisle and press **U** to unload real inventory onto a visible pallet stack. Upgrade its carrying capacity at Mike's: **48 / 60 / 120 / 240 / 480 / 960** items, each upgrade substantially more expensive.
- Conveyor: **B** builds connected sections; **Z** at the front outlet rotates its direction clockwise. Right or left outputs can pass existing goods to an adjacent connected belt. Sections cannot produce products by themselves.
- Item claw: buy an **Automated Item Claw** separately at Mike's. Stand near the front endpoint of the belt and press **K** to install the claw. Each placed claw picks one physical unit from the nearest main receiving counter or pallet drop-off within reach and places it on the belt, stopping when the belt buffer is full. Robots and players take from those real stocks.
- Normal mode remains on http://127.0.0.1:8000/ ; development funds are on http://127.0.0.1:8000/#dev . Previous save progress is retained (version-4 format).

## October 30, 2026 — Rendering and Mike's interaction improvements (build 2026.10.30.3)

- **No long overhead black bar:** removed the 98-metre receiving gantry and secondary floating beam. Only grounded, local metal rollers and the separately installed item claws are visible. This is a visual change, not a change to pallet or claw inventory rules.
- **Cleaner UI:** the former black help/prompt/routing panels are now compact pale service displays so they no longer cover the store.
- **More realistic store fittings:** additional colored aisle signs, price area styling, basket rack, checkout queue bollards, anti-scuff trims, exhaust grilles, and industrial overhead fixtures.
- **Mike is an E interaction:** stand at his desk and press **E** to open the shop; clicking the game screen next to him will not open it. **Close Shop** restores mouse look in the same click. If a browser blocks relocking after **Escape**, click the game once; a small on-screen label tells you when recapture is needed. Q is no longer a shop shortcut.
- **Mike's eyes:** flat built-in digital LED matrix instead of raised orb-style eyes.

## Build 2026.10.30.3 — Payroll mounted on front wall

The entire wages window—not just its sign—is attached to the physical interior front wall at **z=-12.45**. Counter back and facade embed into the wall by design so no visible gap remains. Glass, trim, card reader, documents, receipt printer, and queue guide have moved as one station. The accessible **E** payroll collection position is now **(x=10, z=-8.38)**. Previous saves and balances are unchanged. A regression checks facade/back-of-counter overlap against the real wall and accessible customer space.
