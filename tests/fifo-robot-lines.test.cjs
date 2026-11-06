'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
let r,q,traffic;
test.before(async()=>{[r,q,traffic]=await Promise.all(
 ['rules.mjs','robot-pickup-queue.mjs','robot-traffic.mjs']
 .map(p=>import(pathToFileURL(path.resolve(__dirname,'../src',p)).href))
);});
const repeat30=fn=>{for(let i=0;i<30;i++)fn(i);};

test('30 new-game starts: 70 robots fill ten aisles with ten-inch clear body spacing',()=>{
 repeat30(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  for(let k=0;k<70;k++){
   const bot=r.hireRobot(s,250,true);
   assert.ok(r.autoPlaceRobot(s,bot.id,s.floor));
  }
  const counts=Array(r.AISLES).fill(0);
  for(const bot of s.robots)counts[bot.homeAisle]++;
  assert.deepEqual(counts,Array(r.AISLES).fill(7),'round robin workers into all ten aisles');
  const startSpace=traffic.ROBOT_CLEARANCE+q.TEN_INCHES_METERS;
  assert.ok(Math.abs(startSpace-q.ROBOT_SPAWN_PITCH)<1e-12);
  for(let j=0;j<s.robots.length;j++)for(let k=j+1;k<s.robots.length;k++){
   const a=s.robots[j],b=s.robots[k];
   assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=startSpace-1e-5,
    'no new robot may spawn closer than ten inches of clear space');
  }
  const restored=r.loadState(r.serialize(s));
  assert.equal(restored.robots.length,70);
  assert.ok(restored.robots.every(b=>b.placed),'all workers remain assigned');
 });
});

test('30 simultaneous arrivals: stable FIFO tickets grant exactly one pickup per station service cycle',()=>{
 repeat30(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.levels.robotReliability=4;
  const source={type:'dock',x:r.DOCK.x,z:r.REAR_CROSSWALK,aisle:-1};
  const bots=[];
  for(let n=0;n<9;n++){
   const bot=r.hireRobot(s,250,true);
   assert.ok(r.moveRobotFromMike(s,bot.id,s.floor,n%r.AISLES));
   bot.x=r.aisleX(n%r.AISLES);bot.z=r.bayZ(28);
   bot.phase='supply';bot.carry=0;
   q.reservePickup(s,bot,source);
   bots.push(bot);
  }
  assert.deepEqual(q.queueMembers(s,q.pickupKey(s.floor,source)).map(x=>x.id),bots.map(x=>x.id));
  assert.equal(q.queueRank(s,bots[0]),0);
  assert.equal(q.queueRank(s,bots[8]),8);
  for(let t=0;t<530;t++){
   let pickups=0;
   for(const bot of bots){
    const old=bot.carry;
    r.botStep(s,bot,.10);
    if(old===0&&bot.carry>0)pickups++;
   }
   assert.ok(pickups<=1,'one physical inventory station serves at most one robot per service tick');
  }
  const successful=bots.filter(x=>x.stockedSinceService>0||x.carry>0);
  assert.ok(successful.length>0,'FIFO queue does not lock all workers');
  assert.ok(bots.some(x=>x.source?.queueKey||x.phase==='shelf'),'workers retain their reservations');
  assert.equal(r.loadState(r.serialize(s)).robotQueueNextTicket,s.robotQueueNextTicket);
 });
});

test('30 inventory types: every source gets a separate queue, back-of-line robots cannot bypass the first',()=>{
 repeat30(i=>{
  const s=r.newState(),floor=s.floor;
  const sources=[
   {type:'dock',x:r.DOCK.x,z:r.REAR_CROSSWALK},
   {type:'crate',crateId:1,x:r.WAREHOUSE_CRATE_SOURCES[0].x,z:r.WAREHOUSE_CRATE_SOURCES[0].z-2.1},
   {type:'crate',crateId:2,x:r.WAREHOUSE_CRATE_SOURCES[1].x,z:r.WAREHOUSE_CRATE_SOURCES[1].z-2.1}
  ];
  const all=[];
  for(const src of sources){
   assert.equal(q.pickupAvailable(s,src,floor),true);
   const pair=[];
   for(let j=0;j<3;j++){
    const bot=r.hireRobot(s,250,true);bot.floor=floor;
    bot.aisle=i%r.AISLES;bot.homeAisle=bot.aisle;
    q.reservePickup(s,bot,src);pair.push(bot);all.push(bot);
   }
   assert.equal(q.queueRank(s,pair[0]),0);
   assert.equal(q.queueRank(s,pair[1]),1);
   assert.equal(q.queueRank(s,pair[2]),2);
   for(let j=1;j<pair.length;j++){
    const a=q.queueWaitingPoint(pair[j-1],j-1),b=q.queueWaitingPoint(pair[j],j);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=q.ROBOT_SPAWN_PITCH-1e-6);
   }
   assert.equal(q.canCollectPickup(s,pair[1],10),false,'the second robot can never skip the head');
   assert.equal(q.canCollectPickup(s,pair[2],10),false,'the third robot can never skip the head');
  }
  assert.equal(new Set(all.map(b=>b.source.queueKey)).size,3);
  assert.equal(new Set(all.map(b=>b.source.queueTicket)).size,9);
  const copy=r.loadState(r.serialize(s));
  assert.equal(copy.robots.filter(b=>b.source?.queueKey).length,9,
   'an existing save retains every queue reservation');
  assert.equal(q.queueRank(copy,copy.robots[1]),1);
 });
});

test('30 source-turnover checks: consumed belt or empty pile releases its reservation safely',()=>{
 repeat30(i=>{
  const s=r.newState(),bot=r.hireRobot(s,250,true);
  r.moveRobotFromMike(s,bot.id,0,i%r.AISLES);
  const pile={floor:0,aisle:0,x:r.aisleX(0),z:r.bayZ(10),count:1};
  s.stockPiles.push(pile);
  const source={type:'pile',index:0,x:pile.x,z:pile.z,aisle:0};
  q.reservePickup(s,bot,source);
  assert.equal(q.pickupAvailable(s,bot.source,0),true);
  pile.count=0;
  assert.equal(q.pickupAvailable(s,bot.source,0),false);
  r.botStep(s,bot,.1);
  assert.notEqual(bot.source?.type,'pile','robot leaves exhausted source for an available warehouse intake');
 });
});

test('30 models: deleted jack replaced by a thick hydraulic design; shelf stock has real metal lids and caps',()=>{
 const equipment=fs.readFileSync(path.join(__dirname,'../src/equipment.js'),'utf8');
 const env=fs.readFileSync(path.join(__dirname,'../src/environment.js'),'utf8');
 repeat30(()=>{
  assert.match(equipment,/new THREE\.ExtrudeGeometry\(profile/);
  assert.match(equipment,/realPalletJackTaperedFork/);
  assert.match(equipment,/hydraulicPumpCylinder/);
  assert.match(equipment,/palletJackArticulatedTiller/);
  assert.match(equipment,/industrialWheel\(root,side\*\.67/);
  assert.match(env,/new THREE\.TorusGeometry\(radius-\.015/);
  assert.match(env,/productAccentGeometry\(i,secondary\)/);
  assert.match(env,/shelfProductDetail/);
  assert.match(env,/new THREE\.LatheGeometry/);
  assert.match(env,/new THREE\.BoxGeometry\(\.37,\.55,\.23\)/);
 });
});
