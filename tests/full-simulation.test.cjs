'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const dir=path.resolve(__dirname,'..','src');
let rules,collision;
test.before(async()=>{
 rules=await import(pathToFileURL(path.join(dir,'rules.mjs')).href);
 collision=await import(pathToFileURL(path.join(dir,'collision.mjs')).href);
});
test('solid stations, high-bay racks, wall boundaries and pallets never permit walking through',()=>{
 const c=collision;
 for(const [label,x,z] of [
  ['Mike counter',1.5,-9],['Mike robot',1.5,-7.05],
  ['Payroll counter',10,-3.2],['Receiving desk',1.5,96],
  ['Warehouse shelving',7.7,96.4],['Stock pallet',30,95],
  ['Structural pillar',101,26],['Shelf rack 1',4.6,31],
  ['Shelf rack 2',11.4,31],['Exterior wall',-10,22],['Outside entrance',46.5,-14]
 ])assert.equal(c.isBlocked(x,z),true,label);
 for(const [label,x,z] of [
  ['Mike reachable from the customer aisle',1.5,-4.1],
  ['Payroll reachable from the aisle',10,-1.3],
  ['Receiving accessible in front',1.5,93.1],
  ['Main aisle',8,35],['Aisle crosswalk',8,9],
  ['Fire-exit interaction',98.6,40.5],['Grand opening interaction',46.5,-8.3]
 ])assert.equal(c.isBlocked(x,z),false,label);
});
test('swept movement cannot tunnel through long shelves or counters',()=>{
 const c=collision;
 const rack=c.moveWithCollisions(8,20,8,0);
 assert.equal(c.isBlocked(rack.x,rack.z),false);
 assert.ok(rack.x<10.4,'player cannot enter the shelf rack');
 const front=c.moveWithCollisions(10,-.9,0,-8);
 assert.ok(front.z>-1.7,'payroll counter must prevent crossing');
 const rear=c.moveWithCollisions(1.5,91,0,14);
 assert.ok(rear.z<94.3,'receiving counter must prevent crossing');
 const slide=c.moveWithCollisions(8,25,4,4);
 assert.ok(slide.z>25,'player should slide along the rack');
 assert.equal(c.isBlocked(slide.x,slide.z),false);
});
test('randomized collision sweeps maintain valid world positions',()=>{
 const c=collision;let x=8,z=10,seed=123456;
 for(let i=0;i<9000;i++){
  seed=(1664525*seed+1013904223)>>>0;
  const dx=(seed%2000-1000)/430;
  seed=(1664525*seed+1013904223)>>>0;
  const dz=(seed%2000-1000)/430;
  const next=c.moveWithCollisions(x,z,dx,dz);
  assert.equal(c.isBlocked(next.x,next.z),false,'walking never ends inside a solid');
  x=next.x;z=next.z;
 }
});
test('30 accelerated complete full-building runs preserve 144,000 items, wages, saves and ending gate',()=>{
 const r=rules;
 const reports=[];
 for(let run=0;run<30;run++){
   const s=r.newState();
   assert.equal(r.canOpenStore(s),false);
   // Simulate realistic onboarding milestones and the paid robot economy first.
   let id=r.cellId(0,0,0,0,0);
   r.place(s,id,false);
   assert.equal(s.pending,1);
   r.payOut(s);
   s.money+=13000;
   for(const upgrade of ['capacity','speed','ladder','ladderPlus','robot','autoPay','soupTriple']){
     assert.ok(r.purchase(s,upgrade),'cannot purchase '+upgrade+' in run '+run);
   }
   const worker=s.robots[0];
   assert.equal(worker.placed,false);
   assert.equal(r.assignRobot(s,worker.id,0,0,18),true);
   for(let t=0;t<500;t++)r.botStep(s,worker,.1);
   assert.ok(s.stocked>1,'working robot must have stocked after a simulated shift');
   const orderShift=(run*479)%r.TOTAL_CELLS;
   // Accelerated time progression: fast-forward every remaining shelf, including
   // all 15 floors, using the exact production place()/economy logic.
   for(let i=0;i<r.TOTAL_CELLS;i++){
     const cell=(i+orderShift)%r.TOTAL_CELLS;
     while(s.fill[cell]<r.SLOTS)assert.ok(r.place(s,cell,true)>0);
   }
   assert.equal(s.stocked,r.TOTAL_ITEMS);
   assert.equal(r.remaining(s),0);
   assert.equal(r.canOpenStore(s),true);
   assert.equal(s.pending,0);
   const saved=r.loadState(r.serialize(s));
   assert.equal(saved.stocked,r.TOTAL_ITEMS);
   assert.equal(saved.money,s.money);
   assert.equal(r.canOpenStore(saved),true);
   for(let floor=0;floor<r.FLOORS;floor++)assert.equal(r.floorStocked(saved,floor),r.itemsPerFloor);
   assert.ok(saved.money>1000);
   reports.push({run:run+1,items:s.stocked,floors:r.FLOORS,payout:s.money});
 }
 assert.equal(reports.length,30);
 console.log('30 accelerated full-building simulations passed: '+reports.reduce((v,a)=>v+a.items,0).toLocaleString()+' items processed; all 15 floors, wages, saves and finale verified per run');
});

test('working robots follow open rear crosswalk instead of phasing through shelf steel',()=>{
 const r=rules,c=collision,st=r.newState();
 st.money=500;assert.equal(r.purchase(st,'robot'),true);
 const bot=st.robots[0];
 assert.equal(r.assignRobot(st,bot.id,0,0,18),true);
 for(let i=0;i<2600;i++){
   r.botStep(st,bot,.1);
   assert.equal(c.isBlocked(bot.x,bot.z),false,'robot cannot traverse a solid shelf or pallet');
 }
 assert.ok(st.stocked>=16,'robot still stocks multiple products without clipping');
});
test('built conveyors and moving robots have physical player collision',()=>{
 const r=rules,c=collision,st=r.newState();st.money=500;
 assert.equal(r.buildBelt(st,0,0,0),true);
 assert.equal(c.blockedEquipment(st,r.aisleX(0)+1.4,r.bayZ(r.BAYS-1)),true);
 assert.equal(c.blockedEquipment(st,8,40),false);
 assert.equal(r.purchase(st,'robot'),true);
 const bot=st.robots[0];
 assert.equal(c.blockedEquipment(st,bot.x,bot.z),false,'unplaced robots are ghost inventory');
 assert.equal(r.assignRobot(st,bot.id,0,0,18),true);
 assert.equal(c.blockedEquipment(st,bot.x,bot.z),true,'deployed robots are solid');
 const escape=c.moveWithCollisions(bot.x,bot.z,2.5,0,0,(x,z)=>c.blockedEquipment(st,x,z));
 assert.equal(c.isBlocked(escape.x,escape.z),false);
 assert.ok(Math.hypot(escape.x-bot.x,escape.z-bot.z)>.3,'player must be able to step away from overlapping robot');
});

test('the self-driving lift can stock the 3-cent top tier, not just low and middle racks',()=>{
 const r=rules,st=r.newState();
 st.levels.cart=1;st.cart.acc=.99;st.cart.z=13;st.cart.aisle=0;st.cart.floor=0;
 const id=r.cartStep(st,.1);
 assert.equal(r.decode(id).tier,3);
 assert.equal(st.fill[id],1);
 assert.equal(st.money,3);
});

test('existing v4 saves relocate receiving-dock bots out of solid pickup counter',()=>{
 const r=rules,st=r.newState();st.levels.robot=1;
 st.robots=[{id:0,floor:0,x:r.DOCK.x,z:r.DOCK.z,phase:'supply',target:0,carry:0,acc:0}];
 const restored=r.loadState(r.serialize(st));
 assert.equal(restored.robots.length,1);
 assert.equal(restored.robots[0].z,r.REAR_CROSSWALK);
 assert.equal(collision.isBlocked(restored.robots[0].x,restored.robots[0].z),false);
});
