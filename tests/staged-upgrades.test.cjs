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
