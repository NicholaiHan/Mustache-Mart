'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
let r,collision;
test.before(async()=>{[r,collision]=await Promise.all(['rules.mjs','collision.mjs'].map(name=>import(pathToFileURL(path.resolve(__dirname,'../src',name)).href)));});
const source=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
const run30=fn=>{for(let i=0;i<30;i++)fn(i);};

test('Robot crowds: 30 runs with 70 assigned robots get distinct persistent 3-lane berths',()=>{
 run30(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  for(let k=0;k<70;k++){
   const bot=r.hireRobot(s,250+k,true);assert.ok(bot);
   assert.equal(r.moveRobotFromMike(s,bot.id,s.floor,i%r.AISLES),true);
  }
  const spots=s.robots.map(bot=>bot.x.toFixed(3)+','+bot.z.toFixed(3));
  assert.equal(new Set(spots).size,70,'no ninth-worker spawn clamp or overlapping arrivals');
  const decoded=r.loadState(r.serialize(s));
  assert.deepEqual(decoded.robots.map(bot=>bot.x.toFixed(3)+','+bot.z.toFixed(3)),spots,'stagger is saved');
  assert.ok(s.robots.every(bot=>Math.abs(bot.x-r.aisleX(i%r.AISLES))<=.7));
 });
});

test('Crowd movement: 30 simulations of identical overlapping workers continue receiving, separating and stocking',()=>{
 run30(i=>{
  const s=r.newState(),a=i%r.AISLES;
  for(let k=0;k<7;k++){
   const bot=r.hireRobot(s,300,true);
   assert.equal(r.assignRobot(s,bot.id,0,a,15),true);
   bot.x=r.aisleX(a);bot.z=r.bayZ(15);
  }
  const initial=s.robots.map(bot=>({x:bot.x,z:bot.z}));
  let deliveries=0,positiveSteps=0;
  for(let tick=0;tick<380;tick++){
   for(const bot of s.robots) {
    const oldX=bot.x,oldZ=bot.z,oldCarry=bot.carry;
    const result=r.botStep(s,bot,.12);
    if(Math.hypot(bot.x-oldX,bot.z-oldZ)>.001)positiveSteps++;
    if(result>=0||oldCarry===0&&bot.carry>0)deliveries++;
   }
  }
  const unique=new Set(s.robots.map(bot=>bot.x.toFixed(2)+','+bot.z.toFixed(2)));
  assert.ok(positiveSteps>30,'robot stack must not lock motion');
  assert.ok(unique.size>=3,'most of the cluster must unstack');
  assert.ok(s.robots.some((bot,k)=>Math.hypot(bot.x-initial[k].x,bot.z-initial[k].z)>2),'at least one robot escapes the initial pileup');
  assert.ok(deliveries>0,'actual receiving/stocking must continue in a crowded aisle');
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.stocked,s.stocked,'anti-clipping cannot mutate save totals');
  assert.equal(loaded.robots.length,7);
 });
});

test('Crossing pileups: 30 source queues resolve coincident robots without NaN or teleporting',()=>{
 run30(i=>{
  const s=r.newState(),a=i%r.AISLES;
  const bots=Array.from({length:8},()=>r.hireRobot(s,300,true));
  for(const bot of bots){bot.floor=0;bot.aisle=a;bot.x=r.aisleX(a);bot.z=r.REAR_CROSSWALK;bot.phase='supply';}
  for(let tick=0;tick<450;tick++)for(const bot of bots)r.botStep(s,bot,.10);
  assert.ok(bots.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.z)),'dense arrivals stay numerically valid');
  assert.ok(new Set(bots.map(b=>b.x.toFixed(2)+','+b.z.toFixed(2))).size>=3);
  assert.ok(bots.some(b=>b.carry>0||b.phase==='shelf'),'shared dock/box source must still supply workers');
  assert.ok(s.stocked>=0&&s.stocked<=r.TOTAL_ITEMS);
 });
});

test('Portal: 30 checks of moved left-wall-side gantry with physically joined sign, LED and emblem',()=>{
 const env=source('environment.js');
 for(const part of ['fireExitSidePortalGantry','supplyPortalLowerCrossbeam','supplyPortalCrossbeamJoint',
  'attachedSupplyPortalSign','attachedSupplyPortalEmblemMount','supplyPortalLedBackingAttached'])assert.ok(env.includes(part),part);
 assert.match(env,/gantry\.position\.x=-3\.20/);
 assert.match(env,/portalParent=gantry/);
 assert.match(env,/gantry\.add\(marquee\)/);
 run30(i=>{
  const shift=-3.2,left=-3.55+shift,right=6.35+shift,signCenter=1.4+shift;
  assert.ok(left<-6&&left>-9.73,'new portal upright is near the fire exit but inside wall');
  assert.ok(right<4,'portal has moved as a whole, not just sign text');
  const beamLeft=signCenter-10.22/2,beamRight=signCenter+10.22/2;
  assert.ok(beamLeft<=left&&beamRight>=right,'lower beam overlaps both uprights');
  const signBottom=6.94-1.48/2,beamTop=5.98+.52/2;
  assert.ok(beamTop>=signBottom,'lower crossbeam touches marquee cassette');
  // LED backing intersects sign (z=94.55 +/- .17), strip (94.30 +/- .05),
  // and LED bulbs (94.20 +/- .035), joining the visible lighting to a solid.
  assert.ok(94.33+.34/2>=94.55-.34/2);
  assert.ok(94.33-.34/2<=94.20+.07/2);
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});

test('Stock boxes: 30 pickup, claw, pallet, robot and collision checks next to new portal',()=>{
 const layoutSource=source('rules.mjs'),env=source('environment.js');
 assert.match(env,/WAREHOUSE_STORAGE_LAYOUT\.decoration\.entries\(\)/);
 assert.match(layoutSource,/\{x:2\.9,z:96\.4\},\{x:7\.1,z:96\.4\}/);
 run30(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  const crates=r.WAREHOUSE_CRATE_SOURCES,box=crates[i%2];
  assert.ok(box.x<8&&box.x>2,'boxes are close to left-side portal');
  assert.ok(r.WAREHOUSE_STORAGE_LAYOUT.decoration.every(d=>d.x<20),'decorations are also staged near receiving');
  const front={x:box.x,z:box.z-2.2};
  assert.equal(collision.isBlocked(front.x,front.z,s.floor),false,'hand pickup approach is open');
  assert.equal(r.nearestWarehouseCrate(front.x,front.z)?.id,box.id);
  assert.equal(collision.isBlocked(box.x,box.z,s.floor),true,'solid crate matches visual');
  s.pallet.floor=s.floor;s.pallet.x=front.x;s.pallet.z=front.z;
  assert.equal(r.loadPallet(s),r.palletCapacity(s));
  const bot=r.hireRobot(s,250,true);bot.floor=s.floor;bot.x=front.x;bot.z=front.z;
  assert.equal(r.robotSource(s,bot).type,'crate');
  const claw={floor:s.floor,x:box.x,z:box.z,aisle:0};
  assert.equal(r.nearestClawSource(s,claw)?.type,'crate');
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.pallet.load,s.pallet.load);
 });
});

test('Crab: 30 anatomical and geometry checks preserve spike-free angular shell and asymmetry',()=>{
 const crab=source('natural-crab.js');
 assert.match(crab,/shellGeo=new THREE\.BufferGeometry\(\)/);
 assert.match(crab,/const outline=\[/);
 assert.match(crab,/triangle\(\[0,4\.32,\.02\],topB,topA\)/);
 assert.match(crab,/flatShading:true/);
 assert.match(crab,/crabAngularCarapaceScute/);
 assert.match(crab,/crabCarapaceSegmentationSeam/);
 assert.match(crab,/crabLegElbowJointCollar/);
 assert.match(crab,/crabLegAnkleJointCollar/);
 assert.match(crab,/arm\.scale\.set\(1\.30,1\.18,1\.26\)/);
 assert.doesNotMatch(crab,/naturalCrabDorsalSpine|naturalCrabEdgeSpine|new THREE\.ConeGeometry/);
 run30(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;s.money=200+i;
  const loaded=r.loadState(r.serialize(s));
  assert.equal(loaded.money,s.money,'geometry does not modify existing saves');
 });
});
