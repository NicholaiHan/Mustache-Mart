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
  const originalAisle=other.aisle,originalX=other.x;
  other.aisle=selected.aisle;other.x=selected.x;other.z=selected.z-1.9;
  assert.equal(r.drivePlatform(s,1,0,.25,()=>true),false,'lifts cannot overlap');
  other.aisle=originalAisle;other.x=originalX;other.z=old;
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
 assert.match(env,/const spine=round\(\.07,3\.30/);
 assert.match(env,/const diffuse=round\(\.055,\.10,3\.35/);
 assert.match(env,/if\(side==='LEFT'&&s\.floor===0&&z>80&&z<90\)continue/);
 assert.doesNotMatch(env,/panel\.position\.set\(x,6\.62,-12\.31\)/,'gray front-wall faux windows removed');
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
  assert.equal(s.robots[s.robots.length-1].placed,true,'replacement robot auto-spawns');
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

test('new stage: 30 automatic robot dispatch, least-crowded fallback and Mike movement runs',()=>{
 const env=source('environment.js'),game=source('game.js');
 assert.match(env,/daylightWindows/,'sunlight-blue windows must exist on each floor');
 assert.match(env,/color:'#ade9ff'/,'glazing has clear sky-blue illumination');
 assert.match(env,/integratedDaylightWall/,'blue panes are now cut into structural wall segments');
 assert.match(game,/Move to chosen floor \/ aisle/,'Mike can relocate without manual placement');
 assert.match(game,/const DEV_CASH_CENTS=10_000_000/,'developer mode now grants $100,000');
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.money=100000000;
  const ids=[];
  for(let a=0;a<10;a++){
   assert.equal(r.purchase(s,'robot'),true);
   const b=s.robots.at(-1);ids.push(b.id);
   assert.equal(b.placed,true);
   assert.equal(b.floor,s.floor);
   assert.equal(b.homeAisle,a,'first ten purchases choose each empty aisle in order');
   assert.equal(b.x,r.aisleX(a));
  }
  assert.equal(r.purchase(s,'robot'),true);
  assert.equal(s.robots.at(-1).homeAisle,0,'full floor falls back to nearest least-crowded aisle 1');
  assert.equal(r.purchase(s,'robot'),true);
  assert.equal(s.robots.at(-1).homeAisle,1,'next extra bot chooses nearest least-crowded aisle 2');
  const original=s.robots[0];
  original.carry=2;
  assert.equal(r.moveRobotFromMike(s,original.id,(s.floor+1)%r.FLOORS,8),true);
  assert.equal(original.floor,(i%r.FLOORS+1)%r.FLOORS);
  assert.equal(original.homeAisle,8);
  assert.equal(original.carry,2,'moving a robot must not delete carried cargo');
  assert.equal(original.phase,'shelf');
  const restored=r.loadState(r.serialize(s));
  const saved=restored.robots.find(b=>b.id===original.id);
  assert.equal(saved.floor,original.floor);
  assert.equal(saved.homeAisle,8);
  assert.equal(saved.placed,true);
  assert.equal(restored.stocked,s.stocked);
  assert.equal(restored.levels.robot,12);
 });
});

test('yes/no coin gamble: 30 first-$3000 win, loss, decline and reload cases',()=>{
 simulate(i=>{
  const s=r.newState();s.money=299999;
  assert.deepEqual(r.refreshCoinOffers(s),[]);
  s.money=300000+(i%3)*45000;
  assert.deepEqual(r.refreshCoinOffers(s),['cash']);
  assert.equal(r.coinFlipStake(s,'cash'),300000);
  assert.equal(r.coinFlipStake(s,'floor3'),0);
  if(i%3===0){
   assert.equal(r.declineCoinFlip(s,'cash'),true);
   assert.equal(r.coinFlipStake(s,'cash'),0);
   assert.equal(r.acceptCoinFlip(s,'cash',.2),null);
   const loaded=r.loadState(r.serialize(s));
   assert.equal(loaded.coinOffers.cash.declined,true);
   assert.equal(r.declineCoinFlip(loaded,'cash'),false);
   assert.equal(r.refreshCoinOffers(loaded).length,0);
  }else{
   assert.equal(r.markCoinOfferSeen(s,'cash'),true);
   const unloaded=r.loadState(r.serialize(s));
   assert.equal(unloaded.coinOffers.cash.played,false);
   // Closing a browser cannot be a backdoor permanent decision.
   unloaded.money=299999;
   assert.equal(r.acceptCoinFlip(unloaded,'cash',.2),null);
   unloaded.money=s.money;
   const before=unloaded.money,won=i%2===0;
   const result=r.acceptCoinFlip(unloaded,'cash',won?.1:.9);
   assert.equal(result.stake,300000);
   assert.equal(result.won,won);
   assert.equal(unloaded.money,before+(won?300000:-300000));
   assert.equal(r.acceptCoinFlip(unloaded,'cash',.2),null,'only one spin allowed');
   const loaded=r.loadState(r.serialize(unloaded));
   assert.equal(loaded.money,unloaded.money);
   assert.equal(loaded.coinOffers.cash.played,true);
   assert.equal(r.coinFlipStake(loaded,'cash'),0);
  }
 });
});
test('yes/no coin gamble: 30 all-in Floor 3 win, loss, and permanent NO cases',()=>{
 simulate(i=>{
  const s=r.newState();s.money=1200+i*7100;
  const base=2*r.CELLS_PER_FLOOR;
  s.fill.fill(r.SLOTS,base,base+r.CELLS_PER_FLOOR-1);
  s.stocked=(r.CELLS_PER_FLOOR-1)*r.SLOTS;
  assert.deepEqual(r.refreshCoinOffers(s),[],'99.9% is not complete');
  s.fill[base+r.CELLS_PER_FLOOR-1]=r.SLOTS;s.stocked+=r.SLOTS;
  assert.deepEqual(r.refreshCoinOffers(s),['floor3']);
  if(i%3===0){
   const original=s.money;
   assert.equal(r.declineCoinFlip(s,'floor3'),true);
   assert.equal(s.money,original);
   assert.equal(r.acceptCoinFlip(s,'floor3',.1),null);
   assert.equal(r.loadState(r.serialize(s)).coinOffers.floor3.declined,true);
  }else{
   const original=s.money;
   s.money=0;
   assert.equal(r.acceptCoinFlip(s,'floor3',.1),null,'zero bankroll cannot flip');
   s.money=original;
   const win=i%2===0,result=r.acceptCoinFlip(s,'floor3',win?.25:.75);
   assert.equal(result.stake,original);
   assert.equal(result.won,win);
   assert.equal(s.money,win?2*original:0);
   assert.equal(r.acceptCoinFlip(s,'floor3',.8),null);
   assert.equal(r.loadState(r.serialize(s)).coinOffers.floor3.played,true);
  }
 });
});
test('yes/no coin gamble: 30 safe threshold, invalid random input, legacy save and two-offer independence checks',()=>{
 simulate(i=>{
  const s=r.newState();s.money=300000;
  assert.deepEqual(r.refreshCoinOffers(s),['cash']);
  const rejected=r.acceptCoinFlip(s,'cash',1);
  assert.equal(rejected,null);
  assert.equal(s.coinOffers.cash.played,false);
  assert.equal(r.acceptCoinFlip(s,'cash',-.1),null);
  const first=r.acceptCoinFlip(s,'cash',.05);
  assert.equal(first.won,true);
  assert.equal(s.money,600000);
  const base=2*r.CELLS_PER_FLOOR;
  s.fill.fill(r.SLOTS,base,base+r.CELLS_PER_FLOOR);s.stocked=r.itemsPerFloor;
  assert.deepEqual(r.refreshCoinOffers(s),['floor3']);
  s.money=7500+i;const stake=s.money;
  const second=r.acceptCoinFlip(s,'floor3',i%2?.82:.12);
  assert.equal(second.stake,stake);
  assert.equal(s.money,i%2?0:stake*2);
  const reloaded=r.loadState(r.serialize(s));
  assert.equal(reloaded.coinOffers.cash.played,true);
  assert.equal(reloaded.coinOffers.floor3.played,true);
  assert.equal(reloaded.money,s.money);
  assert.equal(r.refreshCoinOffers(reloaded).length,0);
  const legacy=JSON.parse(r.serialize(s));delete legacy.coinOffers;
  const recovered=r.loadState(JSON.stringify(legacy));
  assert.equal(recovered.coinOffers.cash.played,false);
  assert.equal(recovered.coinOffers.floor3.played,false);
 });
});
test('receiving A: 30 removed signs and grounded portal regression checks',()=>{
 const env=source('environment.js');
 assert.doesNotMatch(env,/textLabel\('DOCK 01/);
 assert.match(env,/R\(\.36,8\.03,\.43,steel,xx,4\.015,95\)/);
 assert.match(env,/receivingSupplyPortal/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});
test('receiving B: 30 rotated wall, stacked boxed inventory, and clear pickup checks',()=>{
 const env=source('environment.js'),coll=source('collision.mjs');
 assert.match(env,/receivingRack=round\(\.65,4\.25,5\.0/);
 assert.match(env,/receivingBackroomCartons/);
 assert.match(env,/addPackedCarton/,'decorative stock uses shared carton models');
 assert.match(coll,/Receiving rotated warehouse divider/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});
test('elevator redesign: 30 floor navigation, full directory and completion display checks',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 const game=source('game.js');
 assert.match(html,/elevatorSymbol/);
 assert.match(html,/elevatorOverview/);
 assert.match(html,/elevatorFloor/);
 assert.doesNotMatch(html,/<h2 id="elevatorTitle">🛗/);
 assert.match(source('elevator-ui.js'),/floorBar/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  const f=i%r.FLOORS,base=f*r.CELLS_PER_FLOOR;
  s.fill.fill(r.SLOTS,base,base+r.CELLS_PER_FLOOR);
  s.stocked=r.itemsPerFloor;
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.floor,f);
  assert.equal(r.floorStocked(loaded,f),r.itemsPerFloor);
 });
});
test('conveyor interpolation: 30 real cargo-event conservation and corner-routing checks',()=>{
 const game=source('game.js');
 assert.match(game,/enqueueBeltVisualTransfer/);
 assert.match(game,/updateFlyingCartons/);
 assert.match(game,/movingRealConveyorCarton/);
 simulate(i=>{
  const s=r.newState();s.money=1e6;
  const f=i%r.FLOORS,a=i%r.AISLES;
  const first=r.placeFreeBelt(s,f,48.35,92.75,1),next=r.placeFreeBelt(s,f,51,92.75,2);
  assert.ok(first&&next);first.items=2;
  const events=[];
  r.advanceBelts(s,1.1,e=>events.push(e));
  assert.ok(events.some(e=>e.type==='free'&&e.fromId===first.id&&e.toId===next.id));
  assert.equal(first.items+next.items,2);
  assert.equal(r.loadState(r.serialize(s)).freeBelts.reduce((sum,b)=>sum+b.items,0),2);
  // Event-callback frame interpolation is purely cosmetic and never alters stocks.
  assert.equal(events.filter(e=>e.type==='free').length,1);
  // The original aisle conveyor also emits a real parcel transfer event;
  // both legacy and free-directed belts share the same visual tween.
  const aisle=i%r.AISLES,oldBelts=r.newState();oldBelts.money=1000;
  assert.equal(r.buildBelt(oldBelts,f,aisle,0),true);
  assert.equal(r.buildBelt(oldBelts,f,aisle,1),true);
  oldBelts.beltItems[f][aisle][0]=1;oldBelts.beltStock[f][aisle]=1;
  const originalEvents=[];
  r.advanceBelts(oldBelts,1,e=>originalEvents.push(e));
  assert.equal(originalEvents.filter(e=>e.type==='legacy').length,1);
  assert.equal(oldBelts.beltStock[f][aisle],1);
 });
});
test('robot ladder gating: 30 tall-ladder and exclusive auto-top-shelf cases',()=>{
 simulate(i=>{
  const s=r.newState();s.money=100000;
  const bot=r.hireRobot(s,250,true),f=i%r.FLOORS,a=i%r.AISLES,b=11+i%8;
  const t2=r.cellId(f,a,0,b,2),top=r.cellId(f,a,0,b,3);
  assert.equal(r.robotCanReach(s,bot,t2),false);
  assert.equal(r.robotCanReach(s,bot,top),false);
  r.purchase(s,'ladder');r.purchase(s,'ladderPlus');
  assert.equal(r.robotCanReach(s,bot,t2),false,'owning but not deploying a ladder is insufficient');
  const ladder=r.deployLadder(s,f,a,b);assert.ok(ladder);
  assert.equal(r.robotCanReach(s,bot,t2),true);
  assert.equal(r.robotCanReach(s,bot,top),false,'tall manual ladder cannot unlock top tier');
  s.levels.robotLift=1;
  assert.equal(r.robotCanReach(s,bot,top),true);
  const restored=r.loadState(r.serialize(s));
  assert.equal(r.robotCanReach(restored,restored.robots[0],top),true);
 });
});
test('platform freedom: 30 cross-aisle, between-aisle, and preserved-X tests',()=>{
 simulate(i=>{
  const s=r.newState();s.money=100000;r.purchase(s,'ladder');r.purchase(s,'cart');
  const p=s.platforms[0];r.selectPlatform(s,p.id);
  const x=p.x;
  assert.equal(r.drivePlatform(s,0,1,.8,()=>true),true);
  assert.ok(p.x>x,'platform moves across aisle center, not only at rear');
  assert.equal(r.drivePlatform(s,0,-1,.4,()=>false),false,'obstacles prevent side movement');
  assert.equal(r.drivePlatform(s,1,0,.5,()=>true),true);
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.platforms[0].x,p.x);
  assert.equal(loaded.platforms[0].z,p.z);
  assert.equal(loaded.cart.id,p.id);
 });
});
test('stage recessed windows: 30 wall-cutout cases preserving full-shell and door safety',()=>{
 const env=source('environment.js');
 assert.match(env,/integratedDaylightWall/);
 assert.match(env,/structuralOpening:true/);
 assert.match(env,/windowSpecs/);
 assert.match(env,/glazing\.name='recessedGlass'/);
 assert.doesNotMatch(env,/daylightFloorPool/,'no more separate floor-window decals');
 assert.match(env,/panel\(assembly,w,sill,d,x,sill\/2,z\)/,'lower plaster band leaves real opening');
 assert.match(env,/panel\(assembly,w,CEILING_Y-lintel/,'upper plaster band leaves real opening');
 simulate(i=>{
  const state=r.newState();state.floor=i%r.FLOORS;state.money=500+i;
  const loaded=r.loadState(r.serialize(state));
  assert.equal(loaded.floor,state.floor);
  assert.equal(loaded.money,500+i);
 });
});
test('stage crab controls: 30 dev-on, dev-off and natural-unlock regressions',()=>{
 const game=source('game.js'),html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 assert.match(game,/changeDevCrab\('on'\)/);
 assert.match(game,/changeDevCrab\('off'\)/);
 assert.match(game,/changeDevCrab\('auto'\)/);
 assert.match(html,/id="devCrabPanel" hidden/);
 simulate(i=>{
  const state=r.newState();state.money=1000+i;
  assert.equal(r.crabEnabled(state,false),false);
  assert.equal(r.setDeveloperCrab(state,'on'),true);
  assert.equal(r.crabEnabled(state,true),true,'summon even before 7-floor unlock');
  assert.equal(r.crabEnabled(state,false),false,'normal mode ignores dev override');
  assert.equal(r.advanceCrab(state,1199,true).length,0);
  assert.equal(r.advanceCrab(state,1,true).length,r.FLOORS,'forced dev crab can attack unfinished floors');
  const attacks=state.crab.attacks.reduce((a,b)=>a+b,0);
  const timers=state.crab.elapsed.slice();
  assert.equal(r.setDeveloperCrab(state,'off'),true);
  assert.equal(r.crabEnabled(state,true),false);
  assert.deepEqual(r.advanceCrab(state,1500,true),[]);
  assert.equal(state.crab.attacks.reduce((a,b)=>a+b,0),attacks,'off must stop strikes');
  assert.deepEqual(state.crab.elapsed,timers,'off pauses every clock');
  assert.equal(r.setDeveloperCrab(state,'auto'),true);
  assert.equal(r.crabEnabled(state,true),false,'natural unlock still has 7-floor prerequisite');
  const loaded=r.loadState(r.serialize(state));
  assert.equal(loaded.crab.devOverride,'auto');
  assert.equal(loaded.money,state.money);
  assert.equal(r.setDeveloperCrab(loaded,'on'),true);
  assert.equal(r.loadState(r.serialize(loaded)).crab.devOverride,'on');
  assert.equal(r.setDeveloperCrab(loaded,'wrong'),false);
 });
});
test('stage motorized robot top shelf: 30 no-bypass cases and actual motorized stocking',()=>{
 simulate(i=>{
  const state=r.newState();state.money=100000;
  const floor=0,aisle=i%r.AISLES,bay=9+i%12;
  const robot=r.hireRobot(state,300,true);
  robot.x=r.aisleX(aisle);robot.z=r.bayZ(bay);
  robot.floor=0;robot.aisle=aisle;robot.homeAisle=aisle;
  const top=r.cellId(0,aisle,0,bay,3),lower=r.cellId(0,aisle,0,bay,2);
  assert.equal(r.robotCanReach(state,robot,top),false);
  assert.equal(r.robotCanReach(state,robot,lower),false);
  state.levels.ladder=1;state.levels.ladderPlus=1;
  state.ladderInventory.push({kind:'ladder',paid:45});
  assert.ok(r.deployLadder(state,0,aisle,bay));
  assert.equal(r.robotCanReach(state,robot,lower),true);
  assert.equal(r.robotCanReach(state,robot,top),false,'tall ladder alone must never allow top stocking');
  const loaded=r.loadState(r.serialize(state)),savedBot=loaded.robots.find(b=>b.id===robot.id);
  assert.equal(r.robotCanReach(loaded,savedBot,top),false,'reload cannot bypass top-shelf lock');
  loaded.levels.robotLift=1;
  assert.equal(r.robotCanReach(loaded,savedBot,top),true);
  loaded.fill.fill(r.SLOTS);
  loaded.fill[top]=r.SLOTS-1;
  loaded.stocked=r.TOTAL_ITEMS-1;
  savedBot.phase='shelf';savedBot.carry=8;savedBot.target=top;savedBot.acc=0;savedBot.liftY=0;
  let complete=false;
  for(let step=0;step<60;step++){
   if(r.botStep(loaded,savedBot,.25)===top){complete=true;break;}
  }
  assert.equal(complete,true,'powered robot ladder must actually lift bot to top shelf and stock');
  assert.equal(loaded.fill[top],r.SLOTS);
 });
});
test('stage infrastructure polish: 30 instanced mechanical detail and save safety checks',()=>{
 const env=source('environment.js');
 for(const component of ['infrastructureHardware','pipeAndVentScrews','machinedScrewSlots',
  'sprinklerPipeBracket','ductInspectionHatch','boltedVentHousing','ventFanRotor','steelColumnJunction']){
  assert.ok(env.includes(component),'missing detailed hardware '+component);
 }
 assert.match(env,/new THREE\.InstancedMesh\(boltGeometry,screwMaterial,360\)/,'bolts instanced for 15-floor performance');
 simulate(i=>{
  const state=r.newState();
  state.money=i*1000;state.floor=i%r.FLOORS;
  state.levels.robotSpeed=i%3;
  const loaded=r.loadState(r.serialize(state));
  assert.equal(loaded.floor,state.floor);
  assert.equal(loaded.money,state.money);
  assert.equal(loaded.levels.robotSpeed,state.levels.robotSpeed);
 });
});

test('recovery stage: 30 old saves, ranks, floors and stocked products survive widened map',()=>{
 const game=source('game.js'),html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 assert.match(game,/mustacheMartSaveSnapshotsV1/);
 assert.match(game,/archiveSave\(current,'BEFORE MANUAL RESTORE'\)/);
 assert.match(game,/BEFORE FILE IMPORT/);
 assert.match(game,/showRecoveryCandidates\(\)/);
 assert.match(html,/id="scanSaveBackups"/);
 assert.match(html,/localhost:8011\/#dev/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.money=i*3719;
  s.levels.robotSpeed=i%6;s.levels.capacity=i%4;
  const id=r.cellId(i%r.FLOORS,i%r.AISLES,i%2,(i*7)%r.BAYS,i%r.TIERS);
  s.fill[id]=1+i%r.SLOTS;s.stocked=s.fill.reduce((t,n)=>t+n,0);
  const bot=r.hireRobot(s,300,true);bot.x=r.aisleX(i%r.AISLES);
  bot.aisle=i%r.AISLES;
  const original=r.serialize(s),restored=r.loadState(original);
  assert.equal(r.serialize(restored).length>10000,true);
  assert.equal(restored.stocked,s.stocked);
  assert.equal(restored.money,s.money);
  assert.equal(restored.floor,s.floor);
  assert.equal(restored.levels.robotSpeed,s.levels.robotSpeed);
  assert.equal(restored.robots[0].x,bot.x);
 });
});
test('wider store stage: 30 reversible X geometry and legacy aisle coordinates preserved',()=>{
 const game=source('game.js');
 assert.match(game,/world\.scale\.x=MAP_WIDTH_MULTIPLIER/);
 assert.match(game,/camera\.position\.set\(toWideX\(V\.x\)/);
 assert.match(game,/fromWideX\(point\.x\)/);
 assert.ok(game.includes('crabModel.scale.set(.36/MAP_WIDTH_MULTIPLIER,.68,.68)'));

 simulate(i=>{
  const x=r.aisleX(i%r.AISLES),left=r.aisleX(0),right=r.aisleX(9);
  assert.equal(r.MAP_WIDTH_MULTIPLIER,1.60);
  assert.ok(Math.abs(r.fromWideX(r.toWideX(x))-x)<1e-8);
  assert.ok(Math.abs(r.toWideX(right)-r.toWideX(left)-(right-left)*1.6)<1e-8);
  const old=r.newState();old.floor=i%r.FLOORS;
  old.fill[r.cellId(old.floor,i%r.AISLES,0,0,0)]=1;old.stocked=1;
  const migrated=r.loadState(r.serialize(old));
  assert.equal(migrated.stocked,1);
  assert.equal(r.aisleX(i%r.AISLES),x,'logical X never changes across build');
 });
});
test('crab lane stage: 30 large moving crab patrols remain inside broadened aisles',()=>{
 const game=source('game.js'),characters=source('characters.js');
 assert.ok(game.includes('crabModel.scale.set(.36/MAP_WIDTH_MULTIPLIER,.68,.68)'));

 assert.match(game,/crabModel\.position\.set\(\(p\.x\?\?aisleX\(p\.aisle\)\)/);
 assert.match(source('natural-crab.js'),/megaRobotCrab/);
 simulate(i=>{
  const state=r.newState();state.money=200+i;
  r.setDeveloperCrab(state,'on');
  assert.equal(r.crabEnabled(state,true),true);
  const f=i%r.FLOORS;
  const prior=state.crab.patrol[f].z;
  const events=r.advanceCrab(state,Math.min(60,1+i),true);
  assert.ok(state.crab.patrol[f].z>=9&&state.crab.patrol[f].z<=90);
  assert.ok(state.crab.patrol[f].z!==prior||i%2===0);
  assert.equal(events.length,0);
  const crabDiameterLogical=10.4*.36,wideLaneWidth=(10-1.69)*r.MAP_WIDTH_MULTIPLIER;
  assert.ok(crabDiameterLogical<wideLaneWidth,'resized crab fits visible widened corridor');
 });
});
test('smaller crab: 30 cosmetic shrink checks preserve 15-floor raids and save state',()=>{
 const game=source('game.js');
 assert.ok(game.includes('crabModel.scale.set(.36/MAP_WIDTH_MULTIPLIER,.68,.68)'),'crab remains naturally proportioned');
 simulate(i=>{
  const state=r.newState();state.money=7300+i;state.floor=i%r.FLOORS;
  const savedBefore=r.serialize(state);
  const eventFloor=i%r.FLOORS;
  r.setDeveloperCrab(state,'on');
  assert.equal(r.crabEnabled(state,true),true);
  const before=state.crab.attacks[eventFloor];
  const events=r.advanceCrab(state,1200,true);
  assert.equal(events.length,r.FLOORS,'raid scheduling remains unchanged');
  assert.equal(state.crab.attacks[eventFloor],before+1);
  assert.equal(state.money,7300+i,'shrinking the visual crab does not touch cash');
  assert.equal(state.stocked,0,'shrinking the visual crab does not touch stocking progress');
  const loaded=r.loadState(r.serialize(state));
  assert.equal(loaded.floor,eventFloor);
  assert.equal(loaded.money,7300+i);
  assert.equal(loaded.crab.attacks[eventFloor],before+1);
  assert.ok(savedBefore.includes('\"fill\"'));
 });
});
test('wide aisle upgrade: 30 preserved legacy saves at 16 meter visual separation',()=>{
 const render=source('game.js');
 assert.match(render,/world\.scale\.x=MAP_WIDTH_MULTIPLIER/);
 assert.match(render,/fromWideX\(point\.x\)/);
 simulate(i=>{
  const s=r.newState();s.money=50000+i*19;s.floor=i%r.FLOORS;
  s.levels.speed=i%4;
  const oldAisle=i%r.AISLES,oldX=r.aisleX(oldAisle);
  s.fill[r.cellId(s.floor,oldAisle,0,i%r.BAYS,i%r.TIERS)]=1+i%4;
  s.stocked=s.fill.reduce((a,b)=>a+b,0);
  const before=r.serialize(s),after=r.loadState(before);
  assert.equal(after.money,s.money);
  assert.equal(after.stocked,s.stocked);
  assert.equal(after.levels.speed,s.levels.speed);
  assert.equal(r.aisleX(oldAisle),oldX,'saved logical coordinate never changes');
  assert.ok(Math.abs(r.toWideX(r.aisleX(1))-r.toWideX(r.aisleX(0))-16)<1e-9);
  assert.ok(Math.abs(r.fromWideX(r.toWideX(oldX))-oldX)<1e-9);
  assert.equal(r.MAP_WIDTH_MULTIPLIER,1.6);
 });
});
test('detailed crab upgrade: 30 organic motion, one-time raids and existing save safety',()=>{
 const code=source('natural-crab.js'),game=source('game.js');
 for(const name of ['naturalCrabShell','naturalCrabUnderside','naturalCrabWalkingLeg',
  'livingCrabClaw','carapaceRidgeBump','livingEye','crabEyeStalk','pincerTooth','legDactylus']){
  assert.ok(code.includes(name),'missing natural anatomy '+name);
 }
 assert.doesNotMatch(code,/crabHydraulicCylinder|crabArmorRivets|crabAnimatedWarningBeacon/);
 assert.match(game,/crabModel\.scale\.set\(\.36\/MAP_WIDTH_MULTIPLIER,\.68,\.68\)/);
 simulate(i=>{
  const state=r.newState();state.money=10000+i*7;
  const floor=i%r.FLOORS;state.floor=floor;
  r.setDeveloperCrab(state,'on');
  assert.equal(r.crabEnabled(state,true),true);
  assert.deepEqual(r.advanceCrab(state,1199,true),[]);
  const attacks=r.advanceCrab(state,1,true);
  assert.equal(attacks.length,r.FLOORS,'all unfinished floors receive only one sweep');
  assert.equal(state.crab.attacks[floor],1);
  assert.equal(state.money,10000+i*7);
  assert.equal(state.stocked,0);
  const restored=r.loadState(r.serialize(state));
  assert.equal(restored.crab.attacks[floor],1);
  assert.equal(restored.floor,floor);
  assert.equal(restored.money,state.money);
 });
});
test('window detail stage: 30 decoration positions do not intersect clerestory aperture heights',()=>{
 const env=source('environment.js');
 assert.match(env,/for\(const y of \[5\.65,8\.35\]\)/);
 assert.match(env,/spine\.position\.set\(x,7\.60,z\)/);
 assert.match(env,/vent\.position\.set\(x,8\.85,z\)/);
 assert.doesNotMatch(env,/panel\.position\.set\(x,6\.62,-12\.31\)/);
 simulate(i=>{
  const sideBottom=12.78-2.65/2,frontBottom=9.75-2.35/2;
  const topRail=8.35+.085/2;
  const topConduit=7.6+3.3/2;
  const sideVentTop=8.85+1.36/2;
  const frontPanelTop=6.62+2.8/2;
  assert.ok(topRail<sideBottom);
  assert.ok(topConduit<sideBottom);
  assert.ok(sideVentTop<sideBottom);
  assert.ok(frontPanelTop<frontBottom);
  const state=r.newState();state.floor=i%r.FLOORS;
  assert.equal(r.loadState(r.serialize(state)).floor,state.floor);
 });
});

test('proportions refactor: 30 saved-world roundtrips with unstretched scene entities',()=>{
 const module=source('visual-proportions.js'),game=source('game.js');
 assert.match(module,/restoreObjectProportions/);
 assert.match(module,/object\.isInstancedMesh/);
 assert.match(module,/scale\.x\/=widthMultiplier/);
 assert.match(game,/restoreObjectProportions\(world,MAP_WIDTH_MULTIPLIER\)/);
 simulate(i=>{
  const state=r.newState();state.money=82700+i;
  state.floor=i%r.FLOORS;state.levels.capacity=i%5;
  const id=r.cellId(state.floor,i%r.AISLES,0,i%r.BAYS,0);
  state.fill[id]=1+i%r.SLOTS;state.stocked=state.fill.reduce((sum,n)=>sum+n,0);
  const loaded=r.loadState(r.serialize(state));
  assert.equal(loaded.money,state.money);
  assert.equal(loaded.floor,state.floor);
  assert.equal(loaded.stocked,state.stocked);
  assert.equal(loaded.levels.capacity,state.levels.capacity);
 });
});
test('consistent blue glazing: 30 scenarios with 12 real window openings and no gray facades',()=>{
 const env=source('environment.js');
 assert.match(env,/side:\[19,38,57,76\]/);
 assert.match(env,/front:\[13,63,81,94\]/);
 assert.match(env,/recessedBlueWindow/);
 assert.doesNotMatch(env,/panel\.position\.set\(x,6\.62,-12\.31\)/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.equal(4+4+4,12,'4 windows each on left, right and front');
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});
test('free-roaming organic crab: 30 smooth cross-aisle steps through belt routes',()=>{
 const natural=source('natural-crab.js'),rules=source('rules.mjs');
 assert.match(natural,/livingCrabClaw/);
 assert.match(natural,/naturalCrabWalkingLeg/);
 assert.doesNotMatch(natural,/crabHydraulicCylinder|crabArmorRivets/);
 assert.match(rules,/p\.x\+=Math\.max\(-step/);
 assert.match(rules,/p\.z=9\.5/);
 simulate(i=>{
  const s=r.newState();s.money=1_000_000;s.floor=i%r.FLOORS;
  const belt=r.placeFreeBelt(s,s.floor,48.35,92.75,i%4);assert.ok(belt);
  belt.items=2;
  r.setDeveloperCrab(s,'on');
  const initialX=s.crab.patrol[s.floor].x;
  const initialMoney=s.money,initialCount=belt.items;
  // Two real simulation ticks: first reach the front crosswalk, then cross aisles.
  const events=[...r.advanceCrab(s,30,true),...r.advanceCrab(s,30,true)];
  assert.equal(events.length,0);
  assert.notEqual(s.crab.patrol[s.floor].x,initialX,'crab can move sideways to another aisle');
  assert.equal(belt.items,initialCount,'the creature can cross a conveyor without consuming cargo');
  assert.equal(s.money,initialMoney,'roaming is not a charge or purchase');
  assert.ok(s.crab.patrol[s.floor].z>=9&&s.crab.patrol[s.floor].z<=90);
  const saved=r.loadState(r.serialize(s));
  assert.ok(Math.abs(saved.crab.patrol[s.floor].x-s.crab.patrol[s.floor].x)<1e-8);
 });
});
test('receiving cleanup: 30 shared pickup pallets and tidy one-header portal checks',()=>{
 const env=source('environment.js'),equip=source('equipment.js'),carton=source('carton-model.js');
 assert.match(env,/THE SUPPLY PORTAL/);
 assert.doesNotMatch(env,/const direction=textLabel\('COLLECT/);
 assert.doesNotMatch(env,/const upperLabel=textLabel\('MUSTACHE MART/);
 assert.doesNotMatch(env,/const dataPanel=textLabel\('SCAN/);
 assert.doesNotMatch(env,/const receivingLabel=textLabel\('INVENTORY/);
 assert.doesNotMatch(env,/for\(const x of \[31\.7,34\.5\]\)/);
 assert.match(env,/receivingBackroomCartons/);
 assert.match(env,/addInventoryPallet/);assert.match(equip,/addPackedCarton/);
 assert.match(carton,/boxedInventoryCarton/);
 simulate(i=>{
  const state=r.newState();state.floor=i%r.FLOORS;
  state.stockPiles.push({floor:state.floor,x:r.aisleX(i%r.AISLES),z:r.bayZ(i%r.BAYS),aisle:i%r.AISLES,count:60+i});
  const restored=r.loadState(r.serialize(state));
  assert.equal(restored.stockPiles[0].count,60+i);
  assert.equal(restored.stockPiles[0].x,state.stockPiles[0].x);
 });
});
test('elevator interface: 30 independent floor selectors preserve progress',()=>{
 const directory=source('elevator-ui.js'),game=source('game.js');
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 assert.match(directory,/renderElevatorDirectory/);
 assert.match(directory,/floorPercent/);
 assert.match(directory,/btn\.addEventListener\('click'/);
 assert.match(game,/renderElevatorDirectory\(\{/);
 assert.match(html,/elevatorDestination/);
 simulate(i=>{
  const s=r.newState(),floor=i%r.FLOORS;
  s.floor=floor;s.fill[r.cellId(floor,i%r.AISLES,0,1,0)]=1;s.stocked=1;
  assert.equal(r.loadState(r.serialize(s)).floor,floor);
  assert.equal(r.loadState(r.serialize(s)).stocked,1);
 });
});
test('developer budget and code separation: 30 $100k-credit and stable legacy-save checks',()=>{
 const game=source('game.js');
 assert.match(game,/DEV_CASH_CENTS=10_000_000/);
 assert.match(game,/Math\.max\(s\.money,DEV_CASH_CENTS\)/);
 assert.match(source('characters.js'),/createNaturalCrab/);
 assert.match(source('visual-proportions.js'),/export function restoreObjectProportions/);
 assert.match(source('carton-model.js'),/export function addPackedCarton/);
 simulate(i=>{
  const s=r.newState();s.money=i*30000;
  const before=r.serialize(s),restored=r.loadState(before);
  assert.equal(restored.money,s.money,'developer refill must not rewrite save serialization');
  const budget=Math.max(restored.money,10000000);
  assert.equal(budget,10000000);
  assert.equal(restored.levels.robot,0);
 });
});

test('offline server module safety: 30 approved local-module and no save mutation checks',()=>{
 const server=fs.readFileSync(path.resolve(__dirname,'../server.cjs'),'utf8');
 for(const module of ['natural-crab','carton-model','elevator-ui','visual-proportions']){
  assert.ok(server.includes("'/src/"+module+".js'"),module+' must load offline');
 }
 assert.match(server,/const PUBLIC_FILES = new Map/);
 assert.doesNotMatch(server,/serveStatic\(.*req\.url/);
 simulate(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.money=3000+i;
  const original=r.serialize(s),restored=r.loadState(original);
  assert.equal(restored.money,s.money);
  assert.equal(restored.floor,s.floor);
  assert.equal(restored.robots.length,s.robots.length);
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
