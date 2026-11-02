# Mustache Mart — Fifteen Floors of Regret

A first-person supermarket stocking and automation prototype with **15 huge floors, 144,000 products, industrial-style metal racks, and a more realistic, muted supermarket interior**. Built in Three.js. Mac users can play it safely through a local browser rather than the previously blocked Electron runtime.

## Latest: Build 2026.11.01.9 — Stockroom access and interactive crab raid testing
- Removed the eight leftover collision-only stock pallets at the back of the store; only visible warehouse furniture remains solid.
- Created two real boxed inventory pallets beside Warehouse Pickup using the original wooden pallet, cardboard, tape, label and barcode models. Collect products from them by hand (**E**), load a nearby pallet jack (**U**), or let stocker robots and item claws acquire cartons automatically. Bots approach the front of the pallets instead of walking inside them.
- Placed separate matching decorative carton stacks **behind** the warehouse pickup desk. These are visual props, not hidden inventory sources.
- Opt-in **#dev** mode now starts/refills at **$1,000,000** without overwriting any larger saved wallet or previously earned shelf/skill progress.
- Dev crab controls now include **Test crab smack (20m)**. Clicking it demonstrates one real immediate attack **on the current unfinished floor only**. The camera moves near the swing. Stocked shelves spill into collectable crates and nearby robots may be destroyed; existing empty shelves do not magically create products. The permanent King of the Crab upgrade blocks all real damage as before.
- Four new batches of 30 deterministic tests cover warehouse collision, player/jack/bot/claw stock sourcing, decorative location and dev raid logic. The normal save format remains unchanged.

## Latest: Build 2026.11.01.10 — Portal alignment, personal upgrades and cleaner walls
- **Supply Portal rebuilt as one assembly.** The LED line and its nine dots now sit in front of the back wall on the same plane as the lettering. A full-width cassette meets both columns and attaches directly to the overhead beam.
- **Three personal upgrades** in Mustache Mike's connected skill tree: **Double Jump** (purchase Spring-Loaded Shoes first, press Space again in midair), **Midair Control** (four ranks, +12% aerial steering per rank), and **Sprint Training** (five ranks, +12 percentage points of Shift-sprint speed per rank; requires Warehouse Footwork Lv 2). These are player-only upgrades; they do not grant robots additional shelf access or affect vehicles.
- **Wall decoration corrected:** right-side signage is flush with its wall; nearby decorative rails stop before the emergency exit. The existing Floor 1 fire exit stays on the left wall.
- **Pillars integrated with shelves:** external supports have been pushed against the perimeter wall and tied into outer shelf backing, with collision positions updated. A former support overlapping the fire-exit doorway has been omitted.
- Existing browser saves remain version 4; new skill ranks default to zero for old saves. Four batches of 30 automated scenarios cover sign alignment, jump progression, aerial/sprint scaling, and structural collision clearance.

## Latest: Build 2026.11.01.11 — Physical robot platforms and reliable saves
- Robots can **never stock the top shelf from a free-floating lift or tall manual ladder**. Buying Motorized Robot Ladder alone is not enough: place a Motorized Platform Ladder in the same aisle beside the target shelf bay, raise its deck near the top with Space, and dismount with F. A robot must move onto that physically present raised platform to stock the top shelf. A lowered, occupied, misplaced, or absent platform does not count.
- **Double Jump now costs $300**, requires Spring-Loaded Shoes, and works by pressing Space a second time while airborne.
- Removed the **Sprint Training** skill tree upgrade. Regular Shift sprint and Warehouse Footwork remain.
- Employee of the Month's gold frame now uses continuous connected rectangular borders with joined corners on all 15 floors.
- Saves now write **two verified local-browser copies** and store a timestamp. On startup the most recent valid main, mirrored or recovery copy is selected. Stale browser tabs cannot overwrite newer progress; a warning appears instead.
- A **Save progress now** button and live save confirmation are on the title screen. Every exported backup contains its stocked-item count and unique timestamp in the filename, so an old file will be much harder to confuse with the newest export. The previous version-4 save format remains compatible.
- **Important limitation:** saves are still local to each Chrome profile + exact host and port. An older save on `localhost:8011` cannot automatically be retrieved from `127.0.0.1:8000`. Use the same address and browser as before, or download/import a backup from the older origin. Do not click Reset to look for missing progress.

## Latest: Build 2026.11.01.12 — Connected Supply Portal, cleaner warehouse, detailed robot wrecks
- **Supply Portal joined into a single structure:** a substantial horizontal steel beam spans **both columns underneath the sign**, overlapping the sign cassette and attaching to the posts with dark collars and gold mounting plates. The LED line and dots remain aligned with the sign on the near face.
- **Rear warehouse organized farther right:** the *two actual, collectible* crate pallets now stand in a spacious row at logical X **21.5** and **26.5**, both Z **96.4**. Decorative boxes are lined up neatly against the right-side back wall at X **33**, **36.4**, **39.8** and Z **98.75**. The stockroom divider and roller shutter have also moved right. The original Supply Portal and pickup counter stay available, the center walkway is clearer, and collision, hand pickup, robot, claw, and pallet-jack source logic all use the shared moved crate positions. No inventory counts or browser save formats change.
- **Crab-destroyed robot spring refined:** the exposed metal spring is shorter and narrower, with eleven finely modeled coils, upper/lower mounting collars, bright rims, retaining pins, and a slender guide inside. Its permanent scrapping rules, salvage value, and saved robot state remain unchanged.
- **Regression coverage:** added three batches of thirty deterministic simulation checks for the beam connection, crate/collision/pickup organization, and robot-wreck visuals and economy. Keep using the same browser and local URL for existing saves.

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

2. Open **http://127.0.0.1:8000/#dev** in the SAME browser used previously. The title screen and the upper-right HUD must show **UPDATED BUILD · 2026.11.01.12** and the introduction must list the new cash registers, Mike, ladders and fire exit.
3. **Development mode** (the `#dev` suffix) gives **at least $1,000,000** for testing. The title screen also has a **Refill developer cash to $1,000,000** button, and a save-status panel showing how many stocked products and skill ranks were actually loaded on that browser address. Stop the server with **Control+C**.
4. **Recovery:** Your skills and stocked shelves are saved by browser + exact host + port. The launcher now defaults to **8000**, where older saves are most likely. If you instead played on **8011**, run `PORT=8011 bash PLAY_LATEST_MAC.sh` and open `http://127.0.0.1:8011/#dev` in your original browser. Do not click Reset. Use **Download save backup** on the origin holding progress, then **Import save backup** on the origin you want to play from. The original save remains intact.

If the Terminal version line or the title-screen badge is absent, you launched a different/older copy. Do not proceed until **UPDATED BUILD · 2026.11.01.12** is shown.

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
- **Instantly deployed robots and separate robot upgrades:** buy a **Mustache Stocker Bot** at Mike's and it spawns immediately in the first aisle without an assigned robot; if every aisle is staffed, it goes to the closest least-crowded aisle. Use Mike’s management panel to move each robot between floors and aisles the translucent ghost. Bots prefer nearby empty spaces and fetch inventory from the nearest available stocked conveyor endpoint or warehouse receiving. **Robot Espresso** upgrades robot movement/stocking speed; **Motorized Robot Ladder** allows mobile high-shelf lifting. Without it, robots can only climb the player's installed ladders (not deploy their own). Robot selling and repositioning are available in Mike's store.
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
- **Explicit development mode gives at least $1,000,000 in your account** at startup: open `http://127.0.0.1:8000/#dev` (or the older `#rich` alias). This means **100,000,000 cents**, applies only when you deliberately use a development URL, and never reduces an already higher saved balance. It does not affect normal mode.
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
- The `#dev` suffix gives at least $1,000,000 for testing. No in-game money or progress is reset by the visual upgrade.


## Build 2026.11.01.4 — Fire exit detail and save safety

- **FIRE EXIT**: Rebuilt the inward-swinging back-left red steel door with structural framing, painted recessed panels, push-to-open panic bar, raised metal hardware, smoke seal, kick plate, illuminated emergency lamp and deeper brick alcove. The masonry's brick faces now sit in front of the opaque mortar backing, fixing a layering issue that hid brick detail. The brick obstruction still blocks any escape and the entrance completion rules are unchanged.
- **Save origin**: The launcher defaults to **port 8000** instead of 8011, matching the original local save URL. Existing saves on 8011 are not deleted; use the explicit PORT override to view them. The opening screen displays your loaded stocked items and upgrade ranks, so an empty save on the wrong address is immediately apparent.
- **Developer mode**: The title screen has an **Enable $1,000,000 Developer Mode** button even when the URL lacks #dev; inside developer mode the button becomes **Refill developer cash to $1,000,000**, which tops up the balance without modifying skill levels, shelf progress or other save fields.


## Build 2026.11.01.4 — Clear aisle signage, multiple mobile ladders and hold-to-repair

- **Visible aisle names:** Removed decorative colored flags, opaque raised plates and colored bottom strips that could cover suspended aisle text. Aisle identification now uses a single neutral sign oriented toward approaching players; shelf-end labels remain.
- **Up to 10 motorized platform ladders:** Buy additional individually operated platforms at Mustache Mike (prices scale for successive purchases). Each is a separate physical object in the supermarket, with its own floor, aisle, position and lift height. Walk near any platform and press **F** to mount; use **WASD** to drive, **Space** to raise, **Ctrl** to lower, and **F** again to dismount. Robots do not drive or stock from these platforms. Existing older single-platform saves migrate into the multi-platform structure without resetting shelf and skill progress.
- **Six-second manual robot repairs:** Broken robots need you to **hold E continuously for 6 seconds** while standing close. An on-screen percentage shows progress. Releasing E, walking away, or losing game focus resets incomplete repair progress. Technician Training increases the repair interaction radius by 0.35 m per rank, but does not reduce the six-second requirement. Reliability upgrades and the automatic breakdown ranges are unchanged.
- **Testing:** Three dedicated 30-simulation regression groups cover the clean aisle sign layout, purchasing/operating/restoring multiple independent platforms, and uninterrupted/canceled repair timing. The other existing simulation tests remain in CI. Gameplay and visual browser checks run separately on macOS and Linux.


## Build 2026.11.01.4 — Conveyor polish, no aisle-top flags, detailed walls

- **Seamless conveyors:** The visual belt now spans 2.68 meters across physical bay centers spaced 2.65 meters apart. This removes visible gaps between neighboring straight belt sections without changing inventory, conveyors, claw logic or pricing. Added slim continuous steel guides, subtle rubber tread grooves, inlaid direction marks, realistic end rollers, and discreet motors at the ends of runs. A pivot cover identifies rotated outlets; the loading belt still holds at most three real products per section.
- **No elevated aisle-top flags:** Removed the high decorative flags above each aisle entirely, while keeping the main neutral front aisle signs and shelf labels visible.
- **Industrial wall detailing:** Added muted structural wall rails, ceiling-height conduits with clamps, recessed utility covers, ventilator grilles, protected service lighting, and decorative upper-front wall panels. Details are kept above walkways and away from the single back-left fire exit and main front door openings. Retains the industrial palette and minimizes standalone art assets.
- **Regression checks:** Three separate groups of 30 accelerated automated simulations validate conveyor stock conservation and outlet turning, removal of elevated aisle flags, and wall/door clearance. The tests do not constitute 30 manually played 3D games; separate macOS/Linux browser smoke tests check rendered gameplay.


## Build 2026.11.01.4 — Mustache Mike, Employee of the Month

- A **gold-framed "EMPLOYEE OF THE MONTH" painting** is hung on the interior front wall to the right of the elevator on **every floor (1–15)**.
- The brass/gold frame has a deep inset mat, beveled edging, large legible award title, nameplate reading **"Mustache Mike"**, and floor-specific award badge.
- Every floor renders a **distinct offline illustrated working portrait** of Mike that matches his 3D robot face with its digital white eyes and signature white mustache. All 15 paintings depict different work scenes such as packing, inspecting shelves, scanning inventory, repairing a robot, checking checklists, and preparing for the grand opening. They are original in-game graphics generated from Canvas code, **not externally hosted photographic images**.
- Only the current floor's portrait is created when the floor loads, without changing local save data, item placement, upgrade levels, economy or collision rules. There are no new user download dependencies.
- Automated regression coverage includes 30 saved-progress/floor-load simulations plus real headless-browser checks that count one framed portrait per floor and 15 distinct scenes.


## Build 2026.11.01.4 — Giant Robot Crab raid boss

- **Unlock at seven fully stocked floors:** An enormous animated steel robot crab appears on any incomplete floor. It patrols aisles with giant jointed legs, glowing eyes, and swing-capable hydraulic pincers. This unlock is permanent in your saved game, even if raided floor progress later falls.
- **Independent 20-minute clocks:** During active play, each unfinished floor has its own 20-minute timer. When it expires, the crab swings **once** in a randomly chosen aisle, sweeping 3 adjacent shelf bays. Floors already completely stocked are immune. The clock runs across other floors while you work elsewhere; it pauses when the game is paused or closed, and resumes from your saved time. The HUD displays the next swing countdown for your floor.
- **Dropped shelf stock:** Anything knocked from the affected cells becomes a collectible **loose floor spill**. Stocked counts decrease until recovered and replaced. No items are invented or deleted by the impact; salvaged drops remain in your save as tagged piles.
- **Robot carnage:** Any player-owned stocker caught near the claw strike becomes an **irreparable wreck**. The former robot is visually replaced by a broken body with a spectacular coiled metal spring, a detached cracked robot head, and screws/bolts scattered around it. Neither six-second manual repairs nor maximum reliability upgrades can resurrect it.
- **Mandatory scrap and replacement:** Crab-destroyed robots cannot be reassigned, repaired, or replaced while still owned. Visit Mustache Mike or stand by the wreck and press X to **sell for exactly 25%** (rounded down to cents); normal intact-robot resale remains 50%. After scrapping, the robot ownership slot frees up and you can purchase and deploy an entirely new robot.
- **Simulation verification:** Three 30-seed deterministic regression stages verify unlocking/timers on all 15 floors, shelf/drop count conservation and save persistence, and permanent destruction/forced scrap/replacement. Browser tests additionally check the displayed crab model, actual wreck geometry, and 25% credit.


## Build 2026.11.01.4 — Free-placement conveyors, grand Supply Portal and gold awards

- **Build conveyors anywhere on unobstructed floor space:** Stand in an open aisle, crosswalk, or service area and press **B** to place a **paid floor conveyor section** ahead of your character. When away from an existing belt, press **Z** to cycle the planned starting direction in 90° steps: **north → east → south → west**. Build adjacent sections to connect turns; each physical section holds up to three actual items and supplies downstream sections according to its direction. Walk beside an existing free conveyor and press **Z** to rotate that piece independently. Press **K** beside a new free conveyor to connect a purchased Automated Item Claw; give the claw inventory near the dock or a stocked pallet pile. Press **E** to collect physical conveyor goods, or **X** to sell the nearby belt at 50% of purchase cost, with its remaining cargo dropped into a collectible pile. Player and robot pickup both work on free belts. The original rear-to-front aisle belt network continues working and older saves remain supported.
- **Receiving area rebuilt as the Supply Portal:** An elevated industrial arch, glowing marquee, iconic mustache emblem, illuminated dock number, scanning electronics, brass-finished chute rails, mechanical dispatch counter, supply LEDs and floor wayfinding surround the existing delivery collection point. All improvements are decorative or elevated above walkable service space; E pickup remains in the original location.
- **No persistent Crab Alert:** Removed the HUD warning and countdown, while leaving the giant robot crab event, its after-seven-floor unlock, and its hidden timers unchanged. The event may still display a short impact notification when a strike occurs.
- **Mike's frames are vivid GOLD:** Upgraded every Employee of the Month painting from dark brass to bright gilded gold, with luminous highlights, amber depth, and decorative gold corner ornaments. All 15 floor-specific working portraits remain intact.
- **Testing:** Three groups of 30 accelerated rule/state scenarios verify free belt corner routing and stock conservation, unchanged save/receiving functionality, hidden crab alert and gold frame rendering code. Browser smoke tests separately check arbitrary conveyor placement and rotation.


## Build 2026.11.01.4 — Daylight-blue windows, instant robot dispatch and $5,000 developer wallet

- **Light-blue windows:** Replaced the smoky entrance and payroll glass with pale blue, sky-reflective glazing. Added framed high-wall daylight-blue clerestory windows to multiple perimeter walls, plus subtle decorative daylight pools, so each floor looks brighter without blocking doors or shelves. These are attractive simulated daylight windows against the existing outer building shell, not open holes in its structural walls.
- **Robots auto-deploy on purchase:** Buy a Mustache Stocker Bot in Mike's shop and it immediately appears on your current unfinished floor, starting in **Aisle 1** if empty and then filling the other unstaffed aisles in order. When every aisle has a robot, the next new unit is assigned to a least-crowded aisle, using proximity to Mike as the tiebreaker. If your current floor is fully stocked, auto-deployment targets the next unfinished floor. There is no more manual-click deployment step for purchases.
- **Mike's robot management:** Go to **Mike → Equipment & automation → Your robots**. Each owned robot now has its own **Floor 01–15** and **Aisle 1–10** selectors, and a **Move to chosen floor / aisle** button. Reassignment is immediate and preserves existing carried stock, purchased robot levels, breakdown history, and other progress. Crab-destroyed stockers remain unmovable and still require 25% resale before replacement.
- **Developer cash increased:** Visiting the existing game's **#dev** or **#rich** address now tops up to **at least $5,000 (500,000 cents)**, not $500. The title-screen enable/refill button also uses $5,000. Existing game saves, stocked shelves, purchased skills and any balance above $5,000 are retained.
- **Verification:** Added 30 accelerated twelve-robot distribution and save/reassignment scenarios, retained the other full-store regression tests, and added browser checks for Mike's active robot dispatch controls and the updated developer balance.


## Build 2026.11.01.4 — Two hidden coin-flip events

- **Secret offer #1: $3,000 cash milestone.** The first time you hold **$3,000 (300,000 cents)** in your actual cash balance, an optional pop-up offers a one-time fair 50/50 coin flip. Choose **heads** or **tails**, risking a fixed $3,000. If it lands on your choice, **$3,000 is added** (a $3,000 balance becomes **$6,000**). Otherwise **$3,000 is subtracted** (a $3,000 balance becomes **$0**). This is a fixed stake, not an all-in if you have more than $3,000. If you defer or spend below $3,000, the offer stays available but cannot be played until you again have at least $3,000. Developer test funds also count toward reaching the threshold.
- **Secret offer #2: completion of Floor 3.** When **all 9,600 products on Floor 3** are completely stocked, a separate one-time offer appears. Its stake is **whatever cash is in your bank when you accept**, not the amount when the event unlocked. Win: double that entire balance. Lose: lose that entire balance. Pending/uncollected payroll wages are not part of the wager. A $0 balance disables play until you earn cash again.
- **Surprise UX:** A special animated gold coin dialogue appears on the first eligible gameplay moment, asks for heads/tails, transparently displays the potential loss, and offers **Not now**. Any deferred, unplayed offer can be reopened using the small **Secret Offer** HUD button. Each offer is independent and can only resolve **once per save**. The existing store, Mike, equipment purchases, payroll, robots, and entire stocked progress are otherwise unchanged.
- **Fairness/save integrity:** The displayed coin is cosmetic; the result is generated independently with a 50/50 random bit and **saved immediately before animation**. The saved result, stake, winning/losing outcome and used status remain present after reload. 90 deterministic stage simulations cover threshold/eligibility, wins and losses, insufficient funds, third-floor completion, deferral, and reload/replay prevention, alongside the original gameplay test suite.


## Build 2026.11.01.4 — Realistic receiving, strict YES/NO gamble, modern elevator and equipment mobility

- **Grounded Supply Portal:** Both portal legs extend all the way to the tiles, with industrial floor plinths. The redundant **“DOCK 01 / SUPPLY ACTIVE”** sign is removed.
- **Realistic boxed inventory behind receiving wall:** Rotated the former 4.3m-wide receiving warehouse rack/wall **90°**, converting it into a narrow perpendicular divider at x 10.6, z 96.35. Wooden-style metal pallets and stacks of labeled, taped corrugated cartons are arranged **behind** the divider at x 12.5–15.3. Collision boxes follow their actual footprints. The original pickup position is still accessible and works with E.
- **Coin flip strictly YES or NO:** Each hidden $3,000 or fully stocked Floor 3 offer now shows only **YES · FLIP THE COIN** or **NO · DECLINE FOREVER**. YES flips a fair coin immediately; heads wins, tails loses. **NO permanently declines that offer**, and no waiting/postponing is possible. Escape does not bypass the decision. A close/return button appears only **after** a result is saved. Previous unresolved 'Not now' decisions in older saves remain eligible; results already settled cannot be replayed. The irreversible choice is explained in the popup.
- **Rebuilt elevator floor directory:** The former emoji-based “Fifteen Floors of Retail” menu is replaced with an original line-drawn SVG elevator icon, clean industrial color palette, building completion summary, responsive 15-floor selection cards, current-floor highlight and per-floor stocking meters.
- **Smooth conveyor product motion:** Internal item transfers emit optional non-mutating render events; Three.js draws temporary tracked cartons visibly traveling between source and destination sections, including 90° corners, with arrival models hidden during animation. No more instant relocation when a carton jumps to another segment. Inventory capacity, routing and actual item balances are unchanged.
- **Real robot shelf restrictions:** Basic robots can reach only low shelves. To serve the next-highest rack without an auto-ladder, an **extended tall ladder must actually be placed** at the bay. The **topmost shelf requires the purchased Motorized Robot Ladder**; simply owning or placing a tall manual ladder never gives automatic top-level stocking access. Robot ladder animations remain active.
- **Motorized player platform can roam:** Owned machine/platform ladders retain a separate precise X world coordinate, move sideways and forward/back with WASD, turn through open crosswalks, and navigate between aisles. Movement still respects shelf and service counter collisions, other platforms and store boundaries. Older saves with aisle-based positions automatically migrate and save the new coordinates.
- **Regression coverage:** New 30-case simulation groups check each changed area, and the full suite retains older floor completion, save, inventory and hazard checks. macOS and Linux browser tests verify real menu and in-game behavior separately.


## Build 2026.11.01.4 — Recessed windows, dev crab control, required powered robot lifts and industrial detail

- **Blue windows are structural, not overlays:** Replaced the separately floating blue rectangles and simulated floor light decals with **actual rectangular openings cut out of each side/front wall**. The 12 clerestory panes per floor are nested inside those wall assemblies, with pale blue glazing, inset seals, mullions and recessed screw-fastened frames all within the original plaster thickness. Front entrance and left fire-exit openings remain unchanged. No freestanding window entities protrude into the aisle.
- **Robots must use a motorized lift for the TOP shelf:** The highest stocking tier (tier 4 / index 3) requires the **Motorized Robot Ladder** upgrade; standing tall ladders are only sufficient for the tier below. Both the target planner and the final act of robot stocking enforce this rule. Upgraded robots render a telescoping motorized lifting mast and physically rise to the top stocking tier. Already purchased skills and saved stocking progress are preserved.
- **Developer-only crab control on demand:** With `#dev` or `#rich`, a fixed DEV / CRAB OVERRIDE panel has **Spawn crab**, **Remove crab** and **Normal behavior** buttons. Keyboard shortcuts also work with mouse/pointer lock: **Shift+J** spawn, **Shift+K** remove, **Shift+N** restore natural behavior. Forced spawn works even before the seven-floor milestone. Removal hides the model and pauses the raid timers without erasing past damage or genuine floor completion; Normal resumes the established seven-floor rule. Overrides save in the existing version-4 format and are **ignored outside developer mode**.
- **More realistic industrial detail:** Shared hardware meshes add recessed corner screws to window frames, bolted hanger saddles and mechanical pipe collars, hatch seams and machined bolts on HVAC ducts, fan housings and tabs on vents, and joint fittings on structural steel columns. The many tiny rivets/fasteners are drawn with **instancing** for smoother performance across this very large environment.
- **Testing:** 120 additional deterministic simulations run four groups of 30, covering true aperture source geometry, dev-only boss overrides, irreversible top-shelf ladder gating and actual robot lift stocking, plus detail/save regressions. Browser checks inspect the live 3D world for structural window integration and real developer crab controls.


## Build 2026.11.01.4 — Progress recovery, wider aisles, clearer crab, and clean windows

- **Recover older progress safely.** Mustache Mart uses local browser storage per exact origin: `127.0.0.1:8000`, `localhost:8000`, `127.0.0.1:8011` and `localhost:8011` are **four different saved-game locations**. The title screen now has a **Find your previous progress** panel with clickable links to each location, automatic in-browser recovery snapshots, a **Find saved backups on this address** action, and confirmation-based restoration. A backup is taken before save import, manual restore, and reset. Rolling backups are archived periodically without changing inventory or upgrades. If your progress is on an older origin, open that address with the *same browser*, download its save through **Download save backup**, then return to the updated game and import it. The source code cannot directly access your Mac's browser data: no lost purchases or items are fabricated. Do not clear website data or click Reset while looking for your original save.
- **30% wider store and aisles:** The game now renders the entire 113m-wide logical store at **146.9m**, with aisle centers **13m apart** visually rather than 10m. The transformation is reversible: old in-game coordinates, save schema, historical shelf stocking, player gear, robots, claws, checkout counters and inventory all retain their original logical positions. The camera and mouse-based placement are transformed consistently, and live conveyor-item transfer uses correct local 3D coordinates under this wider view.
- **Crab fits in the aisles:** The giant crab's body/leg span has been adjusted relative to the widened world, and it visibly prowls the aisle with smooth forward/backward patrol and subtle walking motion. It remains dangerous and retains its 20-minute raid schedule unless overridden in developer mode.
- **No overlapping window decorations:** Upper side-wall rails have moved from y=12.1 to y=8.35; long vertical conduit sections, vent/fan housings, front-wall metal panels, trim, and structural ribs near windows are cut down or moved beneath the recessed clerestory panes. Every window opening is left unobstructed; the new fittings remain detailed and physically integrated with the walls.
- **Tests:** 120 deterministic scenarios across four groups check old save content round-trips, widened geometry, crab clearance, and vertical spacing between windows and detailing. Browser regression tests inspect the wider rendered geometry, retained aisle coordinates, visible crab scale, old-save recovery panel and the actual 3D fittings.


## Build 2026.11.01.5 — Smaller robot crab

- Scaled the **entire** giant crab mesh (shell, walking legs, hydraulic pincers, eye lenses and armor) to about **two-thirds of its prior height and depth**, with a comparable reduction in apparent width. Current world-model dimensions: `scale(.44, .68, .68)` rather than `scale(.65, 1, 1)`. The crab remains visible in the widened aisles but takes up much less screen space.
- Patrol route, animation, the one-swing-per-20-minute attack cycle, fallen stock, destroyed robots, developer spawn/remove options, and all saved progress are untouched. The shrink is cosmetic only.
- Regression tests run 30 deterministic raid/save checks and rendered-browser tests verify the three model scale dimensions.


## Build 2026.11.01.8 — Wider aisles and highly detailed robotic crab

- **Even wider supermarket aisles:** The 15-floor showroom is visually **60% wider than the original map**, increasing its X-axis width from 146.9 m in the previous build to **180.8 m**, with aisle-center spacing of **16 m instead of 13 m**. Logical aisle coordinates, stocking cell IDs, conveyor routes, robot assignments, equipment and old browser saves remain unchanged. World rendering, player movement, picking, and camera positions continue to use reversible width transformations.
- **Crab stays compact:** The full crab model is kept approximately the same on-screen physical width after widening through a slightly smaller local horizontal scale (`0.36` instead of `0.44`, while retaining `0.68` height/depth). It moves through the extra aisle space without becoming huge again.
- **Industrial crab detail pass:** Added five overlapping armor plates, beveled joints and side access hatches, heat exhaust and cooling louvers, aqua front optic sensors in alloy bezels, retractable mandibles, eight visible hydraulic/piston leg systems with knee gears and bolts, reinforcing shin guards and stabilizer feet, rotary pincer joints, serrated alloy teeth, warning/hazard stripes, fluid lines and four animated amber warning lights. Armor rivets use a single instanced mesh for performance.
- **Existing game behavior unchanged:** 20-minute raid clocks, 7-floor unlock, claw destruction, robot scrapping, saved progression and developer spawn/remove commands still operate. Warning beacons blink more rapidly when a claw strike occurs. This is a cosmetic/model and visual-width upgrade, not a save wipe.
- **Testing:** 30 simulated legacy-save geometry cases and 30 simulated crab-raid cases were added, with live browser checks of part counts, crab scale, and actual 180.8 m rendered width.


## Build 2026.11.01.8 — Consistent proportions, living crab, warehouse cleanup and $100,000 developer mode

- **Keep huge aisles, fix proportions:** Retain the 16-meter visual aisle spacing (60% expansion over original) while drawing small equipment models, racks, shipping boxes, signs, and robots at their natural proportions instead of stretching each sideways. A separate render-only `src/visual-proportions.js` module corrects individual geometry and instanced shelf units, but never modifies the original logical coordinates or saved game data.
- **Blue windows on every floor:** The front metal façade's false gray window panels are removed. Every floor uses the same recessed blue clerestory system: four windows on the front and four per side, for 12 blue wall windows on each of 15 floors. Ground-floor door openings remain functional.
- **Organic, realistic crab, no robotic body:** `src/natural-crab.js` replaces the long industrial-robot model with a domed mottled carapace, chitin ridges and spines, natural abdominal shell, eye stalks and glossy pupils, six mouthparts, eight articulated leg assemblies with cuticle bands and tapering claws, and muscular pincers with natural teeth. All robotic gearboxes, hydraulic pistons, warning beacons, armored steel plates and exhausts are gone. Its existing size stays compact. Attacks still take place once every 20 active minutes on unfinished floors.
- **Crab can walk freely:** The crab now approaches the front crosswalk, moves sideways between aisles, then walks down the next aisle in smoothly saved motion. Conveyors and other store equipment do not restrict crab travel. No instant teleportation is needed when its target aisle changes. Existing per-floor raid scheduling and 25% robot-wreck scrapping remain unaffected.
- **Remove two unwanted squares:** The pair of shopping-basket blocks at the front of the store that obscured the gold-framed Employee of the Month portrait has been removed.
- **Matching stock crates behind receiving:** Real collectible pallet piles and decorative stock use the exact same `src/carton-model.js` helper: corrugated shipping cartons, adhesive tape, printed barcode labels, wooden pallets and pallet feet. Extra decorative stacks previously sitting out in the rear aisles are removed and grouped neatly behind the warehouse receiving divider.
- **Cleaner Supply Portal:** Removed secondary collection, scanning, dispatch and goods-inbound signs around the portal. Retained the single main **THE SUPPLY PORTAL** identity and the **WAREHOUSE PICKUP** sign so controls remain easy to identify.
- **Modern elevator controls:** Rebuilt the modal to resemble the actual brushed stainless elevator, with illuminated 15-floor pushbuttons, destination display, current floor indicator, individual stocking completion and accessible clear labels. Floor UI logic is isolated in `src/elevator-ui.js` rather than buried inside main gameplay.
- **Developer cash is now $100,000:** Open `#dev`/`#rich` or use the developer refill button. Existing cash greater than $100,000 is retained. Developer mode continues to be an opt-in test setting, not a wipe of user progress.
- **Code organized safely:** Four focused scene modules now handle the natural crab, box visuals, physical proportion compensation and elevator UI. The local loopback server explicitly allowlists these modules while preserving the existing network security policy. No game save format migration or progress reset is performed.
- **Testing:** Six sets of 30 new simulation scenarios check these upgrades and a seventh set verifies offline module delivery; the existing game/stock conservation and original save tests remain in the regression suite. Browser smoke tests inspect the rendered game where possible.


## Build 2026.11.01.8 — King of the Crab, natural boss detail, upper-shelf safety and clear ceilings

- **Robot top shelves need the actual robotic ladder.** The fourth/top tier is strictly inaccessible to stocker bots unless **Motorized Robot Ladder** is purchased. A normal tall ladder is not a substitute. Height and target handling is corrected for saved robots previously elevated; 30 additional regression scenarios cover stale robot heights, placed tall ladders and active stocking attempts.
- **King of the Crab** is a one-time **$25,000** Mustache Mike skill-tree upgrade, available only once seven complete floors are stocked. Buying it permanently tames the crab across all 15 floors, prevents all further swipes/stock spills/robot damage and freezes every raid clock. Previously damaged robots remain damaged until sold, and old stock spills remain. The owned crab appears even on complete floors. Walk within 6.5 logical meters and press **G** to mount its natural leather saddle; **WASD** steers over conveyors without collision, **mouse** controls camera look and **G** dismounts. Mounting is blocked while using other vehicles. Steering coordinates and purchase ownership persist in the existing version-4 save, without losing progress. 60 new deterministic scenarios test ride controls and permanent raid immunity.
- **More realistic, more menacing animal:** The crab is about **44% broader** than the prior release (visual horizontal model scale 0.52 vs 0.36), with defensive chitin spines, scarred shell patterning, toothy natural pincers, sharp mandible tusks, heavy brow plates, gill slits and segmented under-shell detail. No robotic body or mechanical hardware is restored.
- **Clear roof equipment:** Fluorescent fixtures, longitudinal vents and sprinkler pipes are assigned independent X-coordinate lanes. Vent centerlines are now at 2, 50 and 98; light lanes at 8, 20, 32, 44, 56, 68, 80 and 92; sprinklers at 14, 62 and 86 (logical world meters). Their separation prevents overhead hardware obscuring light panels, with 30 new automatic non-overlap scenarios.
- **Test suites:** Adds 120 deterministic scenarios across the four features, retains 15-floor progress/load regression tests, and adds browser checks for organic spine detail and the purchased saddle's mount/dismount mechanics.
