# Mustache Mart 🥸
## Fifteen Floors of Regret

A deliberately overlong, pastel-colored, first-person supermarket stocking game, now with connected conveyor segments and autonomous mustached robots. This is a playable prototype, not a published Steam title.

### Play on your Mac (no Electron, no npm install)

1. Download the entire latest repository from:
   https://github.com/NicholaiHan/Mustache-Mart/archive/refs/heads/main.zip
2. Extract it, then move the Mustache-Mart-main folder to your Desktop. Do not run the old mustache-mart.zip file inside the repository.
3. Open Terminal and run:

       cd ~/Desktop/Mustache-Mart-main
       node server.cjs

4. Visit http://127.0.0.1:8000 in Chrome or Safari. Keep Terminal open to play; Control+C stops the local server.

Node.js must already be installed (you have it if you played the prior browser build). Do not restore the Electron app that macOS previously identified as malware, and do not override Apple's security systems.

### Progression

- Fifteen accessible elevator floors, each with ten aisles, totaling 108,000 products.
- Start carrying **one can at a time**. Stocking a bottom shelf earns 1¢, middle 2¢, and top 3¢. High shelves require purchased jumping shoes or a ladder/cart.
- Take your wages to the PAY WINDOW near the delivery dock to get spendable money.
- Find Mustache Mike at his pink counter for carrying capacity, speed, jumping shoes, ladder, mobile stocking cart, cart motors, mustached robots, robot speed boosts, and automatic payroll.
- Build a connected conveyor yourself by standing at the next unbuilt belt segment inside an aisle and pressing B, starting at the aisle entrance. Robots can collect supplies from connected belts.
- Bots seek missing shelf products, restock using the dock or belts, and work on other floors while you're away. The mobile ladder cart slowly moves down aisles and fills shelves.
- Progress saves to this browser automatically. The previous prototype's save remains separate; this version starts a new game.

### Controls

| Key | Action |
| --- | --- |
| WASD | Walk |
| Mouse or arrow keys | Look |
| Shift | Sprint |
| Hold E / click | Pick up, stock, interact |
| Space | Jump (after buying spring-loaded shoes) |
| L | Deploy your step ladder |
| B | Place next connected conveyor segment |
| Q | Open shop (near Mustache Mike) |
| R | Select floor (near elevator) |
| Esc | Pause, exit menu or release mouse |
| Control+C in Terminal | Stop server |

Look upward to stock the 3¢ top shelf, straight ahead for the middle, and downward for the bottom.

### Test results

Automated GitHub Actions jobs run on macOS 15 and Ubuntu, checking static source, local-only file serving, core economy rules, and actual Chromium gameplay. Browser tests cover pickup and stocking, wages, buying an upgrade, connected conveyor placement, visiting floor 15 and the bankruptcy ending.

Local check without installing npm packages:

    node --test tests/*.test.cjs

Developer testing: append #rich to the browser address to get bonus coins; #ending-test previews the ending quickly.

### End of the game

After all shelves are filled, nobody comes to the grand opening. Twenty sunrise/sunset cycles accelerate until WENT BANKRUPT appears, followed by Thanks for Playing!

### Limitations

Floors currently share a procedural layout with changing palettes; this is not fifteen uniquely modeled departments. Conveyors provide connected supply pickup points, not a physics-based transport network with turns and junctions. Robot routing is scripted and simple. There is no finished native Mac/Steam release or Apple-notarized executable. Fully finishing all 108,000 products and testing every possible Mac hardware configuration remain outstanding. Automated tests do not provide a 100% safety guarantee.
