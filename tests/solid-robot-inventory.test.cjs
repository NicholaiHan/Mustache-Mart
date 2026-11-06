'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
let r,traffic;
test.before(async()=>{
 [r,traffic]=await Promise.all(['rules.mjs','robot-traffic.mjs'].map(n=>import(pathToFileURL(path.join(__dirname,'../src',n)).href)));
});
const source=n=>fs.readFileSync(path.join(__dirname,'../src',n),'utf8');

test('30 solid-body checks: robots block full swept paths and yield around stationary broken robots',()=>{
 for(let i=0;i<30;i++){
  const s=r.newState(),a=i%r.AISLES;
  const bot=r.hireRobot(s,250,true);r.assignRobot(s,bot.id,0,a,6);
  const obstacle=r.hireRobot(s,250,true);r.assignRobot(s,obstacle.id,0,a,7);
  const x=r.aisleX(a);bot.x=x;bot.z=22;obstacle.x=x;obstacle.z=24;
  assert.equal(traffic.robotPathClear(s,bot,x,27),false,'solid bot must block an entire segment');
  assert.equal(traffic.robotPathClear(s,bot,x,22.8),true);
  assert.equal(traffic.robotBlocker(s,bot,x,24)?.id,obstacle.id);
  obstacle.broken=true;
  let motion=0;
  for(let t=0;t<75;t++){
   const ox=bot.x,oz=bot.z;
   traffic.walkRobotAround(s,bot,x,27,.1,3.4);
   motion+=Math.hypot(bot.x-ox,bot.z-oz);
   assert.ok(Math.hypot(bot.x-obstacle.x,bot.z-obstacle.z)>=traffic.ROBOT_CLEARANCE-1e-5);
  }
  assert.ok(bot.z>23.5&&motion>.2,'worker must steer around an unmoving solid robot');
 }
});

test('30 dense 16-robot queues: zero body overlaps while real shelf inventory continues to be stocked',()=>{
 for(let i=0;i<30;i++){
  const s=r.newState(),a=i%6,count=16;
  s.levels.robotReliability=4;
  const bots=[];
  for(let k=0;k<count;k++){
   const bot=r.hireRobot(s,200+k,true);r.assignRobot(s,bot.id,0,a,15);
   bot.x=r.aisleX(a);bot.z=r.bayZ(15);bots.push(bot);
  }
  let placements=0,min=Infinity;
  for(let tick=0;tick<650;tick++){
   for(const bot of bots)if(r.botStep(s,bot,.10)>=0)placements++;
   for(let p=0;p<bots.length;p++)for(let q=p+1;q<bots.length;q++){
    const d=Math.hypot(bots[p].x-bots[q].x,bots[p].z-bots[q].z);
    min=Math.min(min,d);
    assert.ok(d>=traffic.ROBOT_CLEARANCE-1e-4,'robot bodies must never overlap even once');
   }
  }
  assert.ok(min>=traffic.ROBOT_CLEARANCE-1e-4);
  assert.ok(placements>3&&s.stocked>3,'stock must move while robots avoid one another');
  assert.ok(new Set(bots.map(b=>b.x.toFixed(2)+','+b.z.toFixed(2))).size>=12);
  const recovered=r.loadState(r.serialize(s));assert.equal(recovered.stocked,s.stocked);
 }
});

test('30 proportion checks: crates, pallet decks and compact jack remain physically intact',()=>{
 const carton=source('carton-model.js'),equip=source('equipment.js'),proportion=source('visual-proportions.js');
 assert.match(carton,/g\.userData\.keepProportion=true;g\.userData\.cartonDimensions/);
 assert.match(carton,/g\.userData\.keepProportion=true;g\.userData\.palletDimensions/);
 assert.match(proportion,/if\(object\.userData\?\.keepProportion\)/);
 for(let i=0;i<30;i++){
  assert.match(equip,/root\.userData\.keepProportion=true/);
  assert.match(equip,/new THREE\.ExtrudeGeometry\(profile/);
  assert.match(equip,/hydraulicPumpCylinder/);
  assert.match(equip,/palletJackCargoDeck/);
  assert.match(equip,/palletJackSizedCargoCarton/);
  assert.doesNotMatch(equip,/round\(\.33,\.18,2\.16,frame,root\)/);
 }
});
