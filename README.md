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
- **One-sided signage:** labels face their intended approach direction; from behind, they are not mirrored or readable backward.
- **Mustache Mike:** front-facing customer service clerk, two distinct dark dot eyes, mustache, store uniform and apron.
- **Tall shelves:** shelf structures are approximately 13.5 world units high—about four times the original shelf height.
- **Four shelf heights:** lowest racks and second band earn **1¢**, stepladder-height racks earn **2¢**, and the highest, telescopic-ladder-height racks earn **3¢**. Jumping reaches the second band. A nearby ladder (L) reaches the third band. Buy the telescopic ladder extension to reach the fourth band. An upgraded moving cart can also provide high access.
- **Backroom inventory:** the delivery stock is now near the **rear wall (x=1.5, z=96)**, straight down the long store from Mike's counter, making early manual trips lengthy. Running shoes, carrying upgrades, conveyors and robots become valuable.
- **Manual payroll:** take your stocking earnings back to the **PAY WINDOW** near the front until automatic payroll is unlocked.
- **Two shopkeeper categories:** **Equipment & Automation** and **Economy Contracts**. The new **$50 Canned Goods Supercontract** multiplies all canned-goods rewards by **3×**. Water partnerships, high-shelf bonuses, and automation-profit bonuses are also available.
- **Custom conveyor sections:** install the next connected segment using B, starting from the **rear receiving area** toward the entrance. Robots use connected segments as nearby stock collection points.
- **Robots and carts:** mustached robots restock individual empty cells and continue running on floors the player is not currently visiting; the self-driving cart slowly works along aisles.
- **Save migration:** the game automatically migrates existing fifteen-floor v3 saves into four-tier v4 saves. Previous saves remain under their original browser storage keys as backups.

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk |
| Mouse / arrow keys | Look around (aim up for tall racks) |
| Shift | Sprint |
| E or mouse click | Pick up inventory, stock, collect wages, interact |
| Space | Jump after buying shoes |
| L | Set a step ladder in the aisle |
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

## Prototype limitations

This is still a procedural browser game rather than a fully modeled commercial simulator. There is no physics-based conveyor transport network with arbitrary corners or junctions, full-length manual endurance test, native notarized macOS app, or published Steam build. A passing CI test is useful evidence, not a 100% guarantee across every browser, Mac model, or playthrough. Progress remains local to your browser.
