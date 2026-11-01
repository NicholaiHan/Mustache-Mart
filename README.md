# Mustache Mart — Fifteen Floors of Regret

A first-person supermarket stocking and automation prototype with **15 huge floors, 144,000 products, industrial-style metal racks, and a more realistic, muted supermarket interior**. Built in Three.js. Mac users can play it safely through a local browser rather than the previously blocked Electron runtime.

## Guaranteed latest-version setup (copy/paste for Mac)

**Do not use an old downloaded `mustache-mart.zip`, old Electron app, or previously extracted folder.** The obsolete small ZIP has been removed from GitHub. The complete game is always in the live `main` branch archive.

1. Copy the **whole** block below into Terminal. It downloads the current complete game, checks the ZIP, keeps the former folder under a dated backup name, and runs the game on **port 8000** by default to reconnect to older browser saves. Stop any older server on 8000 with Control+C first:

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

2. Open **http://127.0.0.1:8000/#dev** in the SAME browser used previously. The title screen and the upper-right HUD must show **UPDATED BUILD · 2026.10.31.6** and the introduction must list the new cash registers, Mike, ladders and fire exit.
3. **Development mode** (the `#dev` suffix) gives **at least $500** for testing. The title screen also has a **Refill developer cash to $500** button, and a save-status panel showing how many stocked products and skill ranks were actually loaded on that browser address. Stop the server with **Control+C**.
4. **Recovery:** Your skills and stocked shelves are saved by browser + exact host + port. The launcher now defaults to **8000**, where older saves are most likely. If you instead played on **8011**, run `PORT=8011 bash PLAY_LATEST_MAC.sh` and open `http://127.0.0.1:8011/#dev` in your original browser. Do not click Reset. Use **Download save backup** on the origin holding progress, then **Import save backup** on the origin you want to play from. The original save remains intact.

If the Terminal version line or the title-screen badge is absent, you launched a different/older copy. Do not proceed until **UPDATED BUILD · 2026.10.31.6** is shown.

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

## Build 2026.10.31.2: conveyor visualization and structural art

- **Original top-left HUD icons** replace all five phone/OS emoji labels: store, cash, payroll, carrying and robots are custom scalable vector artwork.
- At **rear receiving** (near the inventory pickup), use **[** and **]** to select an aisle, then press **B** to connect its **first** conveyor segment. Its status panel shows the selected aisle, connected branches and stock out of three items per built section. Once the first branch exists, extend it from its **frontmost tip** with B. Sections move in one direction, **toward the entrance**, and production pauses when their endpoint is full.
- A visible overhead feeder connects receiving to the aisle chutes, with an industrial pickup claw, movement on connected source branches, arrows, frame fasteners, caution guards and belt gearboxes.
- Shelves include thousands of small **instanced hex-head bolts**, back braces and aisle end guards. Register stations add tactile keypads, scanner windows, receipt paper, tiny flat white mustaches and stainless steel mounting hardware.
- Saves and the original 15-floor stocking rules remain unchanged.

## October 30, 2026 — Player-controlled logistics

- Motorized ladder platform: buy the **Motorized Platform Ladder** at Mike's. Approach the platform and press **F** to ride; **Space** raises it, **Ctrl** lowers it, **WASD** drives along the aisle (sideways aisle changes occur at the back crosswalk). Press **F** again to exit. It never stocks shelves for you.
- Pallet jack: stand near it and press **F** to drive. At the back inventory counter press **U** to load. Drive to an aisle and press **U** to unload real inventory onto a visible pallet stack. Upgrade its carrying capacity at Mike's: **48 / 60 / 120 / 240 / 480 / 960** items, each upgrade substantially more expensive.
- Conveyor: **B** builds connected sections; **Z** at the front outlet rotates its direction clockwise. Right or left outputs can pass existing goods to an adjacent connected belt. Sections cannot produce products by themselves.
- Item claw: buy an **Automated Item Claw** separately at Mike's. Stand near the front endpoint of the belt and press **K** to install the claw. Each placed claw picks one physical unit from the nearest main receiving counter or pallet drop-off within reach and places it on the belt, stopping when the belt buffer is full. Robots and players take from those real stocks.
- Normal mode remains on http://127.0.0.1:8000/ ; development funds are on http://127.0.0.1:8000/#dev . Previous save progress is retained (version-4 format).

## October 30, 2026 — Rendering and Mike's interaction improvements (build 2026.10.31.2)

- **No long overhead black bar:** removed the 98-metre receiving gantry and secondary floating beam. Only grounded, local metal rollers and the separately installed item claws are visible. This is a visual change, not a change to pallet or claw inventory rules.
- **Cleaner UI:** the former black help/prompt/routing panels are now compact pale service displays so they no longer cover the store.
- **More realistic store fittings:** additional colored aisle signs, price area styling, basket rack, checkout queue bollards, anti-scuff trims, exhaust grilles, and industrial overhead fixtures.
- **Mike is an E interaction:** stand at his desk and press **E** to open the shop; clicking the game screen next to him will not open it. **Close Shop** restores mouse look in the same click. If a browser blocks relocking after **Escape**, click the game once; a small on-screen label tells you when recapture is needed. Q is no longer a shop shortcut.
- **Mike's eyes:** flat built-in digital LED matrix instead of raised orb-style eyes.

## Build 2026.10.31.2 — Payroll mounted on front wall

The entire wages window—not just its sign—is attached to the physical interior front wall at **z=-12.45**. Counter back and facade embed into the wall by design so no visible gap remains. Glass, trim, card reader, documents, receipt printer, and queue guide have moved as one station. The accessible **E** payroll collection position is now **(x=10, z=-8.38)**. Previous saves and balances are unchanged. A regression checks facade/back-of-counter overlap against the real wall and accessible customer space.

## October 30, 2026 — Three-item conveyor segments (build 2026.10.31.2)

**Each physical conveyor segment now holds exactly 0–3 real products.** The crane may take from nearby warehouse stock (within reach) or inventory piles delivered by your pallet jack; it stops when its receiving segment has three products. Each transport step moves **only one package into the next built conveyor**, and never into a missing or full segment. If a connection is absent/full, the cartons stay put until a player or robot removes one or you build more belt. Clockwise-rotated Z junctions obey the same capacity rule.

The 3D conveyor shows precisely as many visible cartons as that physical segment contains—no fake permanently animated products. Player and robot pickup removes the matching physical item. The crane prompt reports **LOADING**, **PAUSED (FULL)** or **IDLE (NO INVENTORY)**. Progress saves preserve per-segment inventory. Any genuine old overflow is converted into a nearby inventory pickup pile, not deleted. Stale automatically generated products on legacy saves without a placed claw are cleared.

The core logistic regression includes **30 randomized congestion simulations** with the invariant: remaining source goods + all belt cartons + player pickup = initial goods, plus the pre-existing complete first-floor tests and headless browser rendering checks.

## October 31, 2026 — Skill Tree & Maintenance (build 2026.10.31.2)

**Mike → Skill tree:** 12 new prerequisite-gated skill upgrades grouped into Handling, Automation, Maintenance and Retail. Existing upgrades remain, so there are now 30 upgrade types overall. Buying skills increases carrying, travel speed, robotic picking/stocking, conveyor and claw speed, revenue or maintenance effectiveness. The full skill menu shows each prerequisite and locks unavailable ranks.

**Robot breakdowns:** every individual stocker needs manual repair after **30–50** pieces at base reliability. Unlock the Reliability Tree (after Technician Training): rank 1 **50–100**, rank 2 **200–300**, rank 3 **500–1000**, rank 4 **never breaks**. Broken robots stop working, display a red alarm lamp, and show a repair prompt when you approach. Press **E** up to four times to repair (Technician Training reduces to one). An upgrade to permanent reliability also immediately repairs any currently broken workers.

**Mike → Equipment & automation → Your robots:** choose **Aisle 1–10** for each individual worker from a dropdown. The robot stays there until all four height bands on both sides are stocked, then automatically advances to the next incomplete aisle. The selected assignment and repair state persist in your existing local save.

**Claw resale:** stand beside a placed claw and press **X**, or sell it in Mike's equipment management list, for half its original purchase cost. Existing products already on the conveyor remain available.

**Visual updates:** the elevator now has inset brushed-steel double doors, trim, call panel and a floor display; the FIRE EXIT is on the **left**, swings inward and opens onto detailed staggered brickwork with mortar. Removed the floor-level posts beside cash registers and the solid colored flags obscuring aisle names.

**Verification:** 8 successive upgrade stages were each checked with 30 deterministic gameplay simulations (240 stage checks total); the repository also runs an independent CI test suite of the same eight stages. These are logic/geometry checks, not 240 manually driven 3D playthroughs.

## Build 2026.10.31.2 — Connected skills, equipment purchasing and save recovery

- **Skill tree**: Twelve skill nodes arranged in four navigable branches with visible prerequisite connections. Foundation prerequisites link to the original Equipment or Economy tab. Locked, ready, insufficient-funds and completed states use distinct styling. Purchase rules, levels and money are unchanged.
- **Equipment & automation**: Modernized product cards with upgrade progress, prices, readiness and purchase feedback. Robot and claw management remain accessible. **Economy contracts keep their existing simple layout.**
- **Transfer your progress between local ports**: The introduction has Download save backup and Import save backup. To recover an old save on port 8000, start this same updated folder with `PORT=8000 bash PLAY_LATEST_MAC.sh` (stop any existing server on 8000 first), open `http://127.0.0.1:8000/#dev` in your original browser and choose **Download save backup**. Then restart normally with `bash PLAY_LATEST_MAC.sh`, open `http://127.0.0.1:8011/#dev`, and use **Import save backup**. This replaces only the destination port's save after confirmation. The original port's save and downloaded backup are retained.
- The `#dev` suffix gives at least $500 for testing. No in-game money or progress is reset by the visual upgrade.


## Build 2026.10.31.6 — Fire exit detail and save safety

- **FIRE EXIT**: Rebuilt the inward-swinging back-left red steel door with structural framing, painted recessed panels, push-to-open panic bar, raised metal hardware, smoke seal, kick plate, illuminated emergency lamp and deeper brick alcove. The masonry's brick faces now sit in front of the opaque mortar backing, fixing a layering issue that hid brick detail. The brick obstruction still blocks any escape and the entrance completion rules are unchanged.
- **Save origin**: The launcher defaults to **port 8000** instead of 8011, matching the original local save URL. Existing saves on 8011 are not deleted; use the explicit PORT override to view them. The opening screen displays your loaded stocked items and upgrade ranks, so an empty save on the wrong address is immediately apparent.
- **Developer mode**: The title screen has an **Enable $500 Developer Mode** button even when the URL lacks #dev; inside developer mode the button becomes **Refill developer cash to $500**, which tops up the balance without modifying skill levels, shelf progress or other save fields.


## Build 2026.10.31.6 — Clear aisle signage, multiple mobile ladders and hold-to-repair

- **Visible aisle names:** Removed decorative colored flags, opaque raised plates and colored bottom strips that could cover suspended aisle text. Aisle identification now uses a single neutral sign oriented toward approaching players; shelf-end labels remain.
- **Up to 10 motorized platform ladders:** Buy additional individually operated platforms at Mustache Mike (prices scale for successive purchases). Each is a separate physical object in the supermarket, with its own floor, aisle, position and lift height. Walk near any platform and press **F** to mount; use **WASD** to drive, **Space** to raise, **Ctrl** to lower, and **F** again to dismount. Robots do not drive or stock from these platforms. Existing older single-platform saves migrate into the multi-platform structure without resetting shelf and skill progress.
- **Six-second manual robot repairs:** Broken robots need you to **hold E continuously for 6 seconds** while standing close. An on-screen percentage shows progress. Releasing E, walking away, or losing game focus resets incomplete repair progress. Technician Training increases the repair interaction radius by 0.35 m per rank, but does not reduce the six-second requirement. Reliability upgrades and the automatic breakdown ranges are unchanged.
- **Testing:** Three dedicated 30-simulation regression groups cover the clean aisle sign layout, purchasing/operating/restoring multiple independent platforms, and uninterrupted/canceled repair timing. The other existing simulation tests remain in CI. Gameplay and visual browser checks run separately on macOS and Linux.


## Build 2026.10.31.6 — Conveyor polish, no aisle-top flags, detailed walls

- **Seamless conveyors:** The visual belt now spans 2.68 meters across physical bay centers spaced 2.65 meters apart. This removes visible gaps between neighboring straight belt sections without changing inventory, conveyors, claw logic or pricing. Added slim continuous steel guides, subtle rubber tread grooves, inlaid direction marks, realistic end rollers, and discreet motors at the ends of runs. A pivot cover identifies rotated outlets; the loading belt still holds at most three real products per section.
- **No elevated aisle-top flags:** Removed the high decorative flags above each aisle entirely, while keeping the main neutral front aisle signs and shelf labels visible.
- **Industrial wall detailing:** Added muted structural wall rails, ceiling-height conduits with clamps, recessed utility covers, ventilator grilles, protected service lighting, and decorative upper-front wall panels. Details are kept above walkways and away from the single back-left fire exit and main front door openings. Retains the industrial palette and minimizes standalone art assets.
- **Regression checks:** Three separate groups of 30 accelerated automated simulations validate conveyor stock conservation and outlet turning, removal of elevated aisle flags, and wall/door clearance. The tests do not constitute 30 manually played 3D games; separate macOS/Linux browser smoke tests check rendered gameplay.


## Build 2026.10.31.6 — Mustache Mike, Employee of the Month

- A **gold-framed "EMPLOYEE OF THE MONTH" painting** is hung on the interior front wall to the right of the elevator on **every floor (1–15)**.
- The brass/gold frame has a deep inset mat, beveled edging, large legible award title, nameplate reading **"Mustache Mike"**, and floor-specific award badge.
- Every floor renders a **distinct offline illustrated working portrait** of Mike that matches his 3D robot face with its digital white eyes and signature white mustache. All 15 paintings depict different work scenes such as packing, inspecting shelves, scanning inventory, repairing a robot, checking checklists, and preparing for the grand opening. They are original in-game graphics generated from Canvas code, **not externally hosted photographic images**.
- Only the current floor's portrait is created when the floor loads, without changing local save data, item placement, upgrade levels, economy or collision rules. There are no new user download dependencies.
- Automated regression coverage includes 30 saved-progress/floor-load simulations plus real headless-browser checks that count one framed portrait per floor and 15 distinct scenes.
