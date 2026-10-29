# Mustache Mart — Fifteen Floors of Regret

A first-person supermarket stocking and automation prototype with **15 huge floors, 144,000 products, industrial-style metal racks, and a more realistic, muted supermarket interior**. Built in Three.js. Mac users can play it safely through a local browser rather than the previously blocked Electron runtime.

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
