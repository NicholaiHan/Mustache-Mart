# Mustache Mart — Quality Assurance and Polish Pass
**October 29, 2026 · Modular browser edition**

## Delivered fixes
- **Camera controls** ignore pointer-lock recenter jumps and clamp sudden mouse deltas, fixing unexpected views pointed at the ceiling during interaction. Screenshot tests now reset the camera to an eye-level viewing direction.
- **Collision** is now a pure `src/collision.mjs` module, with player radius, axis sliding, swept substeps, and static blockers for walls, steel shelving, counters, receiving terminals, pallets and columns.
- **Dynamic collisions** stop players walking through active conveyor segments, autonomous working robots and the mobile lift cart. If a moving bot overlaps the player, movement out of the overlap remains possible.
- **Robot routes** use the rear crosswalk rather than cutting diagonally through shelving and pallet stacks, and older saved bots inside the former pickup desk are relocated safely.
- **Automated lift cart** now stocks the top fourth shelf band for the correct 3¢ base payout; previously it stopped at tier 3 of 4.
- **Mustache Mike** is now a unique fixed concierge service robot, with a ceramic body, metal arms, lit dot eyes, a mustache, a name badge and subtle head movement. The small wheeled stockers remain visually different.
- **Shop interaction** has new concierge branding, cleaner card layout, tab styling and approachable purchase controls.
- **Pay window** has improved trim, service glass, terminal equipment, paperwork, printer, queue barrier and an on-screen transaction receipt.
- **Receiving inventory** has a workstation, pallet jack, barcode scanner, cartons, branded receiving boards and a visible live carrying counter.
- **Materials and textures** now include deterministic offline surface texture maps for ceramic floor tiles, painted plaster walls, labeled product stock and warehouse boxes. Scene geometry includes ceiling pipework and wall/ground details.
- **Doors** use actual frame jambs rather than fake solid plates. Floor 1 has one red fire exit revealing bricks, and the main entrance opens only after 100% stocked, when the player chooses E.
- **One-sided signs** remain readable from the intended direction only. Existing upgrades, fifteen floors and browser saves remain supported.

## Automated accelerated simulation
**30 complete rule-engine simulations**, each processing **all 144,000 products across all 15 floors**. Combined total: **4,320,000 stock placements**. Each run exercises:
- initial manual stocking and wages
- carrying, speed, ladder, extended ladder, robot, automatic payroll and $50 canned-goods economy purchases
- live robot stocking before full acceleration
- complete every shelf cell using production `place()` payout logic
- completion gate and end-of-game save/restore
- all fifteen floors filled to 100%

The 30 runs simulate the entire building in accelerated engine time; they are **not** thirty real-time, visually observed human playthroughs. Browser smoke tests separately exercise normal pickup, pay, purchases, elevator, door interactions and the bankruptcy ending.

## Collision regression
- 16 direct inside/outside checks around store fixtures and reachable workstations.
- 9,000 seeded random movement steps with swept player movement; no end position was inside a solid.
- 2,600 robot path steps checked against player collision geometry; no rack or pallet clipping observed.
- Additional tests for conveyor and robot dynamic collision, and top-rack stocking by the cart.

## Technical limits and next review
This remains a **procedural stylized indie 3D prototype**, not a photorealistic high-budget production. A full AAA-quality art pass would involve authored 3D assets, hand-painted PBR materials, professional light baking, audio and targeted hardware performance optimization. Automated tests cannot guarantee every visual angle, performance profile, or possible physical collision is perfect. Hands-on Mac QA remains advisable.

## Run locally on a Mac
Use the full newest ZIP: https://github.com/NicholaiHan/Mustache-Mart/archive/refs/heads/main.zip

```bash
cd ~/Desktop/Mustache-Mart-main
node server.cjs
```

Open http://127.0.0.1:8000 in Chrome or Safari. Your browser save format remains unchanged.

## First-floor checkout and thirty-session audit (October 29, 2026)

The cashier checkout module creates four animated POS belts solely on Floor 1, each with card terminal, scanner, cash register and tiny white mustache. Mike is now behind his counter, the pay counter is physically aligned with its signage, and the red brick-blocked fire exit has been relocated to the back-left wall. Explicit `/#dev` mode starts with a $500 test balance.

30 accelerated first-floor runs in `tests/first-floor-30.test.cjs` cover all 9,600 products each (**288,000 first-floor placements**) plus payroll, purchase, robot placement, automation, ladder height, conveyors, physical checkout collisions, equipment resale and persistence. They are not rendered 30-times-through browser playthroughs. The browser smoke test separately exercises actual WebGL interactions and visual screenshots. First-floor completion properly leaves the main entrance locked until all fifteen floors are complete.


## October 30 — Physical logistics update (build 2026.10.30.1)

**No generated conveyor inventory.** The previous `advanceBelts()` manufactured stock when a conveyor section existed. It now cannot do so: an independently purchased and player-installed item claw must be within reach of a connected belt and an inventory source (the receiving dock or a pallet-jack drop-off pile). Each successful pickup consumes one stock unit from a pile or moves one unit from the warehouse and adds exactly one to the belt. Source exhaustion and 16-item belt capacity stop intake. Old version-4 saves migrate with previously generated conveyor stock cleared, preserving shelves, upgrades, money, robots and ladders.

**Player vehicles.** The warehouse pallet jack is now drivable and has six meaningful carrying capacities: 48, 60, 120, 240, 480 and 960 products (fractions of a 960-item aisle). Loading requires being at receiving; unloading creates a persistent, visibly stacked aisle stockpile. The upgraded motorized platform ladder is a guarded lift the player rides and drives while raised, not an autonomous shelf-stocking machine.

**Physical routing.** Press Z at a belt outlet to rotate clockwise among forward/right/back/left. Right/left turn outlets move actual existing packages into a neighboring connected aisle belt if it has space. Without a connected neighbor, packages remain on the original belt; no goods are created by changing direction. This is a grid-constrained aisle junction system, not unrestricted freeform conveyor placement.

**Tests.** Mac and Linux source/regression test suites include thirty accelerated complete Floor-1 simulations processing 288,000 shelf placements combined, plus thirty accelerated complete 15-floor simulations. New regressions check no-free-stock belts, installed claws sourcing from pallet piles, stock-preserving right turns, all six pallet capacities, save/load of piles/claws/routes and the motorized platform's absence of auto-stocking. Browser walkthroughs run separately and may have longer GPU-related runtimes; check the current GitHub Actions run for final results.
