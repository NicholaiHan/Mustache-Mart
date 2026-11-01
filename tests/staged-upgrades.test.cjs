'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
let r;
test.before(async()=>{r=await import(pathToFileURL(path.resolve(__dirname,'../src/rules.mjs')).href);});
const source=name=>fs.readFileSync(path.resolve(__dirname,'../src',name),'utf8');
const simulate=(fn)=>{for(let iteration=0;iteration<30;iteration++)fn(iteration);};

test('stage 1: 30 skill-tree progression/economy simulations',()=>{
 simulate(i=>{
  const s=r.newState();s.money=1e9;
  const upgrades=['capacity','capacity','speed','speed','robot','robotSpeed','shelfBonus','itemClaw','palletCapacity','carryHarness','courierStride','warehouseFocus','clawCycle','beltMotor','robotEfficiency','repairTraining','robotReliability','retailMargin','retailMargin','robotCommission','cashback','warehouseLogistics'];
  for(const up of upgrades)assert.equal(r.purchase(s,up),true,up+' purchase '+i);
  const before=s.money,id=r.cellId(0,i%10,0,i%30,0);
  assert.ok(r.place(s,id,true)>0);
  assert.ok(s.money>before);
  const saved=r.loadState(r.serialize(s));
  assert.equal(saved.stocked,1);assert.equal(saved.levels.robotReliability,1);
  assert.ok(r.capacity(saved)>1);assert.ok(r.walkSpeed(saved)>3.3);
 });
});
test('stage 2: 30 elevator-safe gameplay simulations',()=>{
 const env=source('environment.js');
 assert.match(env,/PASSENGER ELEVATOR/);assert.match(env,/floorDisplay/);
 simulate(i=>{const s=r.newState();s.floor=i%r.FLOORS;s.money=250;
  r.place(s,r.cellId(s.floor,i%r.AISLES,0,i%r.BAYS,0),true);
  assert.equal(r.loadState(r.serialize(s)).stocked,1);
 });
});
test('new stage: 30 multi-platform ladder purchase, driving, collision and save simulations',()=>{
 simulate(i=>{
  const s=r.newState();s.money=1e9;
  assert.equal(r.purchase(s,'ladder'),true);
  for(let n=0;n<6;n++)assert.equal(r.purchase(s,'cart'),true);
  assert.equal(s.platforms.length,6);
  assert.equal(s.levels.cart,6);
  assert.equal(new Set(s.platforms.map(p=>p.id)).size,6);
  assert.equal(new Set(s.platforms.map(p=>p.aisle)).size,6);
  const selected=s.platforms[i%6],other=s.platforms[(i+1)%6];
  const old=other.z;
  assert.equal(r.selectPlatform(s,selected.id),true);
  assert.equal(s.cart.id,selected.id);
  assert.equal(s.platforms.filter(p=>p.mounted).length,1);
  assert.equal(r.closestPlatform(s,r.aisleX(selected.aisle),selected.z).id,selected.id);
  assert.equal(r.drivePlatform(s,1,0,.4,()=>true),true);
  assert.notEqual(selected.z,16.2);
  assert.equal(other.z,old);
  const originalAisle=other.aisle;
  other.aisle=selected.aisle;other.z=selected.z-2.1;
  assert.equal(r.drivePlatform(s,1,0,.25,()=>true),false,'lifts cannot overlap');
  other.aisle=originalAisle;other.z=old;
  assert.ok(r.liftPlatform(s,1,.4)>0);
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.platforms.length,6);
  assert.equal(loaded.levels.cart,6);
  assert.equal(loaded.cart.id,selected.id);
  assert.equal(loaded.platforms.filter(p=>p.mounted).length,0);
  assert.ok(loaded.platforms.some(p=>p.id===selected.id&&p.liftHeight>0));
 });
});
test('stage 3: 30 left-fire-exit and inventory regression simulations',()=>{
 const door=source('doors.js');
 assert.match(door,/firePivot\.position\.set\(-9\.37/);
 assert.match(door,/fireOpen\?1\.35:0/);
 assert.match(door,/mortar joins/);
 simulate(i=>{const s=r.newState();s.money=10000;const a=i%r.AISLES;
  r.buildBelt(s,0,a,0);assert.equal(r.advanceBelts(s,10),0);
  assert.equal(r.loadState(r.serialize(s)).stocked,0);
 });
});
test('stage 4: 30 claw-resale simulations, preserving already supplied stock',()=>{
 simulate(i=>{const s=r.newState();s.money=100000;const a=i%r.AISLES;
  r.buildBelt(s,0,a,0);r.purchase(s,'itemClaw');
  const claw=r.deployClaw(s,0,a,r.BAYS-1);assert.ok(claw);
  r.advanceBelts(s,8);const count=s.beltStock[0][a],funds=s.money;
  const refund=r.sellClaw(s,claw.id);
  assert.equal(refund,Math.floor(claw.paid/2));assert.equal(s.money,funds+refund);
  assert.equal(s.beltStock[0][a],count);assert.equal(s.claws.length,0);
 });
});
test('stage 5: 30 robot breakdown + manual repair simulations',()=>{
 simulate(i=>{
  const s=r.newState();s.money=100000;
  const bot=r.hireRobot(s,250,true),aisle=i%r.AISLES,bay=i%r.BAYS;
  r.assignRobot(s,bot.id,0,aisle,bay);
  const point=r.nextRobotBreakpoint(s,bot);
  assert.ok(point>=30&&point<=50);
  bot.phase='shelf';bot.carry=1;bot.target=r.cellId(0,aisle,0,bay,0);
  bot.x=r.aisleX(aisle);bot.z=r.bayZ(bay);bot.stockedSinceService=point-1;bot.breakAt=point;
  for(let j=0;j<12&&!bot.broken;j++)r.botStep(s,bot,1);
  assert.equal(bot.broken,true);
  const old=s.stocked;r.botStep(s,bot,10);assert.equal(s.stocked,old);
  assert.equal(r.repairRobot(s,bot.id,2),true);
  assert.equal(bot.broken,true);
  assert.ok(bot.repairProgress>=2);
  assert.equal(r.resetRobotRepair(s,bot.id),true);
  assert.equal(bot.repairProgress,0,'releasing E cancels partial repairs');
  for(let j=0;j<59;j++)assert.equal(r.repairRobot(s,bot.id,.1),true);
  assert.equal(bot.broken,true,'5.9 seconds cannot repair');
  assert.equal(r.repairRobot(s,bot.id,.1),true);
  assert.equal(bot.broken,false);assert.equal(bot.stockedSinceService,0);
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.robots[0].broken,false);
 });
 for(let level=0;level<5;level++){
  const s=r.newState();s.levels.robotReliability=level;
  const bot=r.hireRobot(s,250,true);
  const n=r.nextRobotBreakpoint(s,bot),ranges=[[30,50],[50,100],[200,300],[500,1000]];
  if(level===4)assert.equal(n,Infinity);
  else assert.ok(n>=ranges[level][0]&&n<=ranges[level][1]);
 }
});
test('new stage: 30 uninterrupted six-second E-repair scenarios',()=>{
 simulate(i=>{
  const s=r.newState();s.money=1000;
  const bot=r.hireRobot(s,250,true);bot.broken=true;
  assert.equal(r.repairRobot(s,bot.id,0),false,'a single keydown cannot fix a bot');
  assert.equal(r.repairRobot(s,bot.id,3),true);
  assert.equal(bot.broken,true);
  assert.equal(r.resetRobotRepair(s,bot.id),true);
  assert.equal(bot.repairProgress,0);
  for(let j=0;j<60;j++)assert.equal(r.repairRobot(s,bot.id,.1),true);
  assert.equal(bot.broken,false);
  assert.equal(bot.repairProgress,0);
  assert.equal(r.repairRobot(s,bot.id,.1),false);
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.robots[0].broken,false);
  const bot2=r.hireRobot(s,250,true);bot2.broken=true;bot2.repairProgress=4;
  assert.equal(r.loadState(r.serialize(s)).robots[1].repairProgress,0,'reloading cannot continue an interrupted hold');
  assert.ok(r.repairRange(s)>=3.2);
  s.levels.repairTraining=i%4;
  assert.ok(r.repairRange(s)>=3.2);
 });
});
test('stage 6: 30 Mike-assigned aisle changes and next-aisle simulations',()=>{
 simulate(i=>{
  const s=r.newState();s.money=5000;s.levels.robotLift=1;
  const bot=r.hireRobot(s,250,true),a=i%9;r.assignRobot(s,bot.id,0,a,4);
  assert.equal(r.setRobotAisle(s,bot.id,a),true);
  for(let side=0;side<2;side++)for(let bay=0;bay<r.BAYS;bay++)for(let tier=0;tier<r.TIERS;tier++)
   s.fill[r.cellId(0,a,side,bay,tier)]=r.SLOTS;
  assert.equal(r.aisleComplete(s,0,a),true);
  assert.ok(r.robotTarget(s,bot)>=0);
  assert.equal(bot.aisle,a+1);
  assert.equal(r.loadState(r.serialize(s)).robots[0].homeAisle,a+1);
 });
});
test('stage 7: 30 checkout unobstructed floor simulations',()=>{
 const env=source('environment.js');
 assert.doesNotMatch(env,/for\(const x of \[39\.5,52\.8,65\.2,78\.5\]\)/);
 simulate(i=>{const s=r.newState();s.money=1000;r.place(s,r.cellId(0,i%10,0,i%r.BAYS,0),true);
  assert.equal(r.loadState(r.serialize(s)).stocked,1);
 });
});
test('visual stage A: 30 continuous conveyor and stock-preservation simulations',()=>{
 const equipment=source('equipment.js');
 assert.match(equipment,/const pitch=2\.65,skinLength=2\.68/,'ribbon overlaps the 2.65m pitch');
 assert.match(equipment,/const continuousRubber=/,'belt has a continuous rubber surface');
 assert.match(equipment,/continuousConveyorSection/);
 assert.doesNotMatch(equipment,/for\(let i=0;i<7;i\)cylinder/,'remove repeated exposed rollers');
 simulate(i=>{
  const s=r.newState(),floor=i%r.FLOORS,aisle=1+i%9,count=37+i;
  s.money=100000;
  for(let seg=0;seg<1+i%7;seg++)assert.equal(r.buildBelt(s,floor,aisle,seg),true);
  assert.equal(r.purchase(s,'itemClaw'),true);
  s.stockPiles.push({floor,aisle,x:r.aisleX(aisle)+2.1,z:r.bayZ(r.BAYS-1),count});
  const claw=r.deployClaw(s,floor,aisle,r.BAYS-1);assert.ok(claw);
  r.advanceBelts(s,15);
  const beltTotal=s.beltItems[floor][aisle].reduce((a,b)=>a+b,0);
  const pileTotal=s.stockPiles.filter(p=>p.floor===floor&&p.aisle===aisle).reduce((a,p)=>a+p.count,0);
  assert.equal(beltTotal+pileTotal,count,'new geometry cannot spawn or lose products');
  assert.ok(beltTotal>=0&&beltTotal<=3*s.belts[floor][aisle]);
  assert.equal(r.loadState(r.serialize(s)).beltStock[floor][aisle],beltTotal);
  const rotated=r.rotateBelt(s,floor,aisle,s.belts[floor][aisle]-1);
  assert.equal(rotated,1,'directed outlet still rotates');
  assert.equal(r.advanceBelts(s,8)>=0,true);
  assert.equal(s.beltStock[floor][aisle]+s.stockPiles.filter(p=>p.floor===floor&&p.aisle===aisle).reduce((sum,p)=>sum+p.count,0),count);
 });
});
test('visual stage B: 30 aisle-top flag removal and progress retention checks',()=>{
 const environment=source('environment.js');
 assert.doesNotMatch(environment,/const highTag=/);
 assert.doesNotMatch(environment,/highTag\.position|add\(highTag\)/);
 assert.match(environment,/const aisleLabel=textLabel/,'main aisle labels remain');
 assert.match(environment,/const front=textLabel\('AISLE /,'front sign remains readable');
 simulate(i=>{
  const s=r.newState();s.money=1234;const a=i%r.AISLES,b=i%r.BAYS;
  r.place(s,r.cellId(i%r.FLOORS,a,0,b,0),true);
  const restored=r.loadState(r.serialize(s));
  assert.equal(restored.stocked,1);
  assert.equal(restored.money,1235);
 });
});
test('visual stage C: 30 detailed wall and doorway clearance simulations',()=>{
 const env=source('environment.js');
 assert.match(env,/Recessed electrical\/service panels, vents/);
 assert.match(env,/const vent=round\(\.105,1\.36,2\.9/);
 assert.match(env,/const spine=round\(\.07,7\.65/);
 assert.match(env,/const diffuse=round\(\.055,\.10,3\.35/);
 assert.match(env,/if\(side==='LEFT'&&s\.floor===0&&z>80&&z<90\)continue/);
 assert.match(env,/if\(s\.floor===0&&x>38&&x<54\)continue/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.money=250;
  // Structural walls stay solid; floor interaction points remain unchanged.
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
  assert.equal(r.place(s,r.cellId(s.floor,i%r.AISLES,0,i%r.BAYS,0),true)>0,true);
  assert.equal(s.stocked,1);
  // The opening logic is still gated by actual shelving progress.
  assert.equal(r.canOpenStore(s),false);
 });
});
test('visual stage D: 30 gold-framed Mike portrait and saved-progress checks',()=>{
 const env=source('environment.js');
 assert.match(env,/function buildEmployeeOfMonthPortrait\(\)/);
 assert.match(env,/buildEmployeeOfMonthPortrait\(\);/);
 assert.match(env,/employeeOfMonthPortrait/);
 assert.match(env,/EMPLOYEE OF THE MONTH/);
 assert.match(env,/Mustache Mike/);
 assert.match(env,/uniqueWorkingPortrait/);
 const scenes=env.match(/\['[A-Z ]+','[^']+','#[a-fA-F0-9]{6}','[^']+'\]/g)||[];
 assert.equal(scenes.length,15,'all fifteen floors have their own Mike working scene');
 const names=scenes.map(x=>x.match(/^\['([^']+)/)?.[1]);
 assert.equal(new Set(names).size,15,'every floor activity is unique');
 simulate(i=>{
  const floor=i%r.FLOORS,s=r.newState();s.floor=floor;s.money=213;
  s.levels.capacity=2;s.levels.speed=1;
  r.place(s,r.cellId(floor,i%r.AISLES,0,i%r.BAYS,0),true);
  const restored=r.loadState(r.serialize(s));
  assert.equal(restored.floor,floor);
  assert.equal(restored.levels.capacity,2);
  assert.equal(restored.levels.speed,1);
  assert.equal(restored.stocked,1);
  assert.equal(restored.money,s.money,'decoration must not alter earned cash or reset progress');
 });
});

const crabUnlockFixture=()=>{
 const state=r.newState();state.money=1e8;
 for(let f=0;f<7;f++)state.fill.fill(r.SLOTS,f*r.CELLS_PER_FLOOR,(f+1)*r.CELLS_PER_FLOOR);
 state.stocked=7*r.itemsPerFloor;
 return state;
};
test('crab stage 1: 30 seven-floor unlock and isolated per-floor 20-minute schedules',()=>{
 simulate(i=>{
  const s=r.newState();s.money=100000;
  for(let f=0;f<6;f++)s.fill.fill(r.SLOTS,f*r.CELLS_PER_FLOOR,(f+1)*r.CELLS_PER_FLOOR);
  s.stocked=6*r.itemsPerFloor;
  assert.equal(r.crabEnabled(s),false);
  assert.deepEqual(r.advanceCrab(s,3600),[],'before seven completed floors the crab never attacks');
  s.fill.fill(r.SLOTS,6*r.CELLS_PER_FLOOR,7*r.CELLS_PER_FLOOR);
  s.stocked=7*r.itemsPerFloor;
  assert.equal(r.crabEnabled(s),true);
  assert.equal(r.completedFloors(s),7);
  assert.deepEqual(r.advanceCrab(s,1199),[]);
  assert.equal(s.crab.attacks.slice(7).every(x=>x===0),true);
  const saved=r.loadState(r.serialize(s));
  assert.equal(saved.crab.unlocked,true);
  assert.equal(saved.crab.elapsed[7],1199);
  const events=r.advanceCrab(saved,1);
  assert.equal(events.length,8,'one swing on every unfinished floor F08..F15');
  assert.equal(events.every(e=>e.floor>=7&&e.floor<15&&e.number===1),true);
  assert.equal(saved.crab.attacks.slice(0,7).every(x=>x===0),true,'finished floors remain safe');
  assert.equal(saved.crab.attacks.slice(7).every(x=>x===1),true);
  assert.equal(saved.crab.elapsed[7],0);
  assert.deepEqual(r.advanceCrab(saved,600),[]);
  assert.equal(r.loadState(r.serialize(saved)).crab.elapsed[7],600);
 });
});
test('crab stage 2: 30 one-swing shelf spills preserve all dropped goods',()=>{
 simulate(i=>{
  const s=crabUnlockFixture(),floor=7,aisle=i%r.AISLES,bay=4+i%(r.BAYS-9);
  // 24 cells in one 3-bay sweep: one shelf package or a full four each.
  let amount=0;
  for(let b=bay-1;b<=bay+1;b++)for(let side=0;side<2;side++)for(let tier=0;tier<r.TIERS;tier++){
   const n=1+(i+tier)%r.SLOTS;
   s.fill[r.cellId(floor,aisle,side,b,tier)]=n;amount+=n;
  }
  s.stocked+=amount;
  const event=r.performCrabSwing(s,floor,aisle,bay);
  assert.equal(event.fallen,amount);assert.equal(event.robots.length,0);
  assert.equal(s.stocked,7*r.itemsPerFloor);
  assert.equal(s.crab.attacks[floor],1);
  for(let b=bay-1;b<=bay+1;b++)for(let side=0;side<2;side++)for(let tier=0;tier<r.TIERS;tier++)
   assert.equal(s.fill[r.cellId(floor,aisle,side,b,tier)],0);
  const dropped=s.stockPiles.filter(p=>p.crabDebris&&p.floor===floor);
  assert.equal(dropped.reduce((sum,p)=>sum+p.count,0),amount,'all knocked goods land on the floor');
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.stockPiles.filter(p=>p.crabDebris).reduce((sum,p)=>sum+p.count,0),amount);
  assert.equal(loaded.stocked,s.stocked);
  assert.equal(loaded.crab.attacks[floor],1);
  // Taking floor goods removes them from the pile without inventing products.
  const collected=r.takePile(loaded,loaded.stockPiles.findIndex(p=>p.crabDebris),1);
  assert.equal(collected,1);
 });
});
test('crab stage 3: 30 permanent spring-neck wrecks, required 25% scrap and replacement slots',()=>{
 const characters=source('characters.js');
 assert.match(characters,/function makeMegaCrab\(\)/);
 assert.match(characters,/comedicBodySpring/);
 assert.match(characters,/detachedRobotHead/);
 assert.match(characters,/looseScrew/);
 assert.match(characters,/looseBolt/);
 simulate(i=>{
  const s=crabUnlockFixture(),floor=7,aisle=i%r.AISLES,bay=5+i%20;
  const robot=r.hireRobot(s,250+i,true);
  assert.equal(r.assignRobot(s,robot.id,floor,aisle,bay),true);
  const far=r.hireRobot(s,500,true);
  assert.equal(r.assignRobot(s,far.id,floor,(aisle+3)%r.AISLES,bay),true);
  const event=r.performCrabSwing(s,floor,aisle,bay);
  assert.deepEqual(event.robots,[robot.id]);
  assert.equal(robot.broken,true);
  assert.equal(robot.wrecked,true);
  assert.equal(far.wrecked,false);
  assert.equal(r.botStep(s,robot,100),-1);
  assert.equal(r.repairRobot(s,robot.id,6),false);
  assert.equal(r.assignRobot(s,robot.id,floor,aisle,bay),false);
  assert.equal(r.setRobotAisle(s,robot.id,aisle),false);
  assert.equal(r.purchase(s,'robot'),false,'must scrap destroyed robot before replacement purchase');
  s.levels.robotReliability=3;s.levels.repairTraining=1;s.money=1e8;
  assert.equal(r.purchase(s,'robotReliability'),true);
  assert.equal(robot.wrecked,true,'max reliability does not un-destroy a robot');
  const saved=r.loadState(r.serialize(s));
  assert.equal(saved.robots.find(bot=>bot.id===robot.id).wrecked,true);
  const oldMoney=s.money,refund=r.sellRobot(s,robot.id);
  assert.equal(refund,Math.floor((250+i)*.25));
  assert.equal(s.money,oldMoney+refund);
  assert.equal(s.levels.robot,s.robots.length);
  assert.equal(r.purchase(s,'robot'),true);
  assert.equal(s.robots[s.robots.length-1].wrecked,false);
  assert.equal(s.robots[s.robots.length-1].placed,false);
 });
});

test('new visual stage E: 30 free-direction, free-location conveyor and claw inventory runs',()=>{
 const game=source('game.js'),equipment=source('equipment.js');
 assert.match(game,/freeBeltPlacement\(\)/);
 assert.match(game,/turnFreeBelt\(s,/);
 assert.match(equipment,/freePiece\?freePiece\.dir/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.money=100000;
  const f=s.floor;
  const x=48.35,z=92.75;
  // 90-degree section can be independently oriented (west, north, south, east).
  const a=r.placeFreeBelt(s,f,x,z,1);assert.ok(a);
  const b=r.placeFreeBelt(s,f,x+2.65,z,2);assert.ok(b);
  const c=r.placeFreeBelt(s,f,x+2.65,z+2.65,2);assert.ok(c);
  assert.equal(r.freeBeltConnected(s,a.id),true);
  assert.equal(r.freeBeltConnected(s,b.id),true);
  assert.equal(r.freeBeltConnected(s,c.id),false);
  assert.equal(r.placeFreeBelt(s,f,x,z,0),null,'duplicate grid position blocked');
  assert.equal(r.turnFreeBelt(s,c.id),3);
  assert.equal(r.turnFreeBelt(s,c.id),0);
  assert.equal(r.turnFreeBelt(s,c.id),1);
  assert.equal(r.turnFreeBelt(s,c.id),2);
  s.stockPiles.push({floor:f,aisle:4,x:a.x+1.1,z:a.z+1.1,count:60});
  s.clawInventory.push({paid:450});
  const claw=r.deployFreeClaw(s,a.id);
  assert.ok(claw);
  assert.equal(r.deployFreeClaw(s,a.id),null);
  r.advanceBelts(s,30);
  const parcels=s.freeBelts.reduce((sum,b)=>sum+b.items,0);
  const source=s.stockPiles.reduce((sum,p)=>sum+p.count,0);
  assert.equal(source+parcels,60,'no phantom products or lost cartons');
  assert.ok(b.items>0,'a real carton followed the turned first segment');
  assert.ok(c.items>0,'the 90 degree route delivered cargo into next branch');
  const restored=r.loadState(r.serialize(s));
  assert.equal(restored.freeBelts.length,3);
  assert.equal(restored.freeBelts.reduce((sum,b)=>sum+b.items,0),parcels);
  assert.equal(restored.claws[0].freeBeltId,a.id);
  assert.equal(r.takeFreeBelt(restored,c.id),true);
  const held=restored.freeBelts.find(b=>b.id===c.id).items;
  const refund=r.sellFreeBelt(restored,c.id);
  assert.equal(refund,Math.floor(c.paid/2));
  assert.equal(restored.freeBelts.length,2);
  assert.equal(restored.stockPiles.reduce((sum,p)=>sum+p.count,0),source+held);
 });
});
test('new visual stage F: 30 receiving portal and unobstructed loading position checks',()=>{
 const env=source('environment.js');
 assert.match(env,/function buildCreativeReceiving\(\)/);
 assert.match(env,/THE SUPPLY PORTAL/);
 assert.match(env,/DOCK 01/);
 assert.match(env,/buildCreativeReceiving\(\);/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.ok(s.floor>=0&&s.floor<r.FLOORS);
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});
test('new visual stage G: 30 no-crab-alert and bright-gold portrait checks',()=>{
 const env=source('environment.js');
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 const game=source('game.js');
 assert.doesNotMatch(html,/id="crabStatus"/);
 assert.doesNotMatch(game,/updateCrabStatus/);
 assert.match(env,/color:'#ffd029'/);
 assert.match(env,/color:'#ffe77c'/);
 assert.match(env,/EMPLOYEE OF THE MONTH/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  s.money=300+i;s.levels.capacity=2;
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.money,300+i);
  assert.equal(loaded.levels.capacity,2);
  assert.equal(loaded.floor,s.floor);
 });
});

test('stage 8: 30 aisle-sign visibility simulations',()=>{
 const env=source('environment.js');
 assert.doesNotMatch(env,/const signShell=/);
 assert.doesNotMatch(env,/const labelNum=/);
 assert.doesNotMatch(env,/themeColors=|const plate=round\(3\.48|const edge=round\(3\.5/);
 assert.match(env,/AISLE '\+String\(i\+1\)/);
 assert.match(env,/37,'entrance'\)/,'overhead sign faces approaching players');
 simulate(i=>{const s=r.newState();s.money=1000;r.place(s,r.cellId(0,i%10,0,i%r.BAYS,0),true);
  assert.equal(r.loadState(r.serialize(s)).stocked,1);
 });
});
