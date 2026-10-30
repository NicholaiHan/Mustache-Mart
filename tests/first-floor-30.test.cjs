'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const dir=path.resolve(__dirname,'..','src');
let r,c,l;
test.before(async()=>{
 [r,c,l]=await Promise.all(['rules.mjs','collision.mjs','ladder.mjs'].map(f=>import(pathToFileURL(path.join(dir,f)).href)));
});
test('30 accelerated first-floor sessions: interaction systems, upgrades, payouts, ladders, conveyors, robots, resale, all shelves and saves',()=>{
 const reports=[];
 for(let session=0;session<30;session++){
  const s=r.newState();
  // Every session begins with precisely the requested $500 development cash.
  s.money=50000;
  assert.equal(r.floorStocked(s,0),0);
  assert.equal(r.canOpenStore(s),false);
  // Manual receiving -> low-band shelf -> physical payroll.
  const manual=r.cellId(0,session%r.AISLES,0,session%r.BAYS,0);
  assert.equal(r.place(s,manual,false),1);
  assert.equal(s.pending,1);
  assert.equal(r.payOut(s),1);
  assert.equal(s.pending,0);
  assert.equal(s.money,50001);
  // Exercise every shop group, automation and economy contract.
  for(const id of [
   'capacity','speed','jump','ladder','ladderPlus','ladderUnit',
   'cart','cartSpeed','robot','robotSpeed','robotLift','robot',
   'autoPay','soupTriple','waterDouble','shelfBonus','robotBonus'
  ]){
   assert.equal(r.purchase(s,id),true,'session '+session+': shop upgrade '+id);
  }
  assert.equal(s.robots.length,2);
  assert.ok(s.robots.every(bot=>!bot.placed));
  const targetA=session%r.AISLES,targetB=(session+3)%r.AISLES;
  assert.equal(r.assignRobot(s,s.robots[0].id,0,targetA,25),true);
  assert.equal(r.assignRobot(s,s.robots[1].id,0,targetB,15),true);
  // Actually climb a placed ladder to reach the top payout band.
  const rung=r.deployLadder(s,0,targetA,22);
  const spare=r.deployLadder(s,0,targetB,15);
  assert.ok(rung&&spare);
  let height=0;
  for(let i=0;i<80;i++)height=l.ladderHeight(height,1,.07,true);
  assert.ok(height>8.2);
  assert.equal(l.canStockFromHeight(3,height),true);
  assert.equal(r.robotCanReach(s,s.robots[0],r.cellId(0,targetA,0,22,3)),true);
  for(let i=0;i<80;i++)height=l.ladderHeight(height,-1,.07,true);
  assert.equal(height,0);
  // Conveyor stock physically travels toward the player and automated pickup.
  for(const aisle of [targetA,targetB]){
   assert.equal(r.buildBelt(s,0,aisle,0),true);
   assert.equal(r.buildBelt(s,0,aisle,1),true);
  }
  assert.equal(r.advanceBelts(s,7),0,'an unpowered conveyor must stay empty');
  s.money+=1000000; // buy and regression-test new high-end logistics hardware
  assert.equal(r.purchase(s,'itemClaw'),true);
  assert.equal(r.purchase(s,'itemClaw'),true);
  s.stockPiles.push({floor:0,aisle:targetA,x:r.aisleX(targetA)+2.5,z:r.bayZ(r.BAYS-2),count:100});
  s.stockPiles.push({floor:0,aisle:targetB,x:r.aisleX(targetB)+2.5,z:r.bayZ(r.BAYS-2),count:100});
  assert.ok(r.deployClaw(s,0,targetA,r.BAYS-2));
  assert.ok(r.deployClaw(s,0,targetB,r.BAYS-2));
  r.advanceBelts(s,7);
  assert.ok(s.beltStock[0][targetA]>0,'placed claw must deliver pallet-sourced inventory');
  assert.ok(s.beltStock[0][targetB]>0,'other aisle conveyor must deliver');
  const beforePickup=s.beltStock[0][targetA];
  assert.equal(r.takeBelt(s,0,targetA),true);
  assert.equal(s.beltStock[0][targetA],beforePickup-1);
  // Automated workers and self-driving mobile ladder must actually stock products.
  const beforeAutomatic=s.stocked;
  for(let i=0;i<650;i++){
   r.advanceBelts(s,.1);
   for(const bot of s.robots)r.botStep(s,bot,.1);
   r.cartStep(s,.1);
  }
  assert.ok(s.stocked>beforeAutomatic,'robots must stock from actual dock or delivered sources in session '+session);
  assert.equal(r.cartStep(s,1),-1,'player platform cannot auto-stock');
  // Equipment sales repay exactly half the PURCHASE price (not latest upgrade price).
  const sold=s.robots[0],moneyBeforeRobot=s.money;
  assert.equal(r.sellRobot(s,sold.id),Math.floor(sold.paid/2));
  assert.equal(s.money,moneyBeforeRobot+Math.floor(sold.paid/2));
  const moneyBeforeLadder=s.money;
  assert.equal(r.sellLadder(s,rung.id),Math.floor(rung.paid/2));
  assert.equal(s.money,moneyBeforeLadder+Math.floor(rung.paid/2));
  const lastCost=s.beltReceipts[0][targetA].at(-1);
  assert.equal(r.sellBelt(s,0,targetA,0),0,'may not disconnect the middle of a conveyor');
  assert.equal(r.sellBelt(s,0,targetA,1),Math.floor(lastCost/2));
  // Accelerated complete FIRST-floor run using the production earnings function.
  // Vary the order of cells on every run to catch index/order-specific errors.
  const shift=(session*193)%r.CELLS_PER_FLOOR;
  for(let i=0;i<r.CELLS_PER_FLOOR;i++){
   const cell=(i+shift)%r.CELLS_PER_FLOOR;
   while(s.fill[cell]<r.SLOTS){
    assert.ok(r.place(s,cell,true)>0,'failed to fill cell '+cell+' in run '+session);
   }
  }
  assert.equal(r.floorStocked(s,0),r.itemsPerFloor);
  assert.equal(s.stocked,r.itemsPerFloor);
  assert.equal(r.remaining(s),r.TOTAL_ITEMS-r.itemsPerFloor);
  assert.equal(r.canOpenStore(s),false,'entire building must be completed before entrance unlocks');
  for(let floor=1;floor<r.FLOORS;floor++)assert.equal(r.floorStocked(s,floor),0);
  const restored=r.loadState(r.serialize(s));
  assert.equal(r.floorStocked(restored,0),r.itemsPerFloor);
  assert.equal(restored.money,s.money);
  assert.equal(restored.robots.length,1);
  assert.equal(restored.claws.length,2);
  assert.ok(restored.stockPiles.length>=2,'pallet piles and reclaimed stock from a sold belt must survive');
  assert.ok(restored.stockPiles.every(p=>p.count>0));
  assert.equal(restored.ladders.length,1);
  assert.equal(restored.belts[0][targetA],1);
  assert.equal(restored.belts[0][targetB],2);
  assert.equal(r.canOpenStore(restored),false);
  // Walkability of service stations, new checkout, back-left exit, and upper aisles.
  for(const [x,z] of [[33,-3],[10,-1.3],[1.5,-5.7],[-6.5,85],[8,35]]){
   assert.equal(c.isBlocked(x,z,0),false,'inaccessible interaction at '+x+','+z);
  }
  for(const x of [32,57,70,83])
   assert.equal(c.isBlocked(x,2,0),true,'checkout counter clipping at x='+x);
  assert.equal(c.isBlocked(57,2,1),false,'checkout lanes must exist on Floor 1 only');
  reports.push({run:session+1,products:s.stocked,automation:s.stocked-beforeAutomatic,remaining:r.remaining(s),money:s.money});
 }
 assert.equal(reports.length,30);
 assert.equal(reports.reduce((sum,v)=>sum+v.products,0),288000);
 console.log('PASS: 30/30 complete Floor 1 simulations; 288,000 stocked products, all four checkout colliders, ladders, automated deliveries, robot purchases, all upgrades, wage collection, resale, and saved games.');
});
