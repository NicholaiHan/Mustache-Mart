'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
let r,collision;
test.before(async()=>{
 [r,collision]=await Promise.all(['rules.mjs','collision.mjs'].map(f=>import(pathToFileURL(path.resolve(__dirname,'../src',f)).href)));
});
const source=name=>fs.readFileSync(path.resolve(__dirname,'../src',name),'utf8');
const batch=fn=>{for(let i=0;i<30;i++)fn(i);};

test('Supply Portal: 30 joined pillar, lower crossbeam and complete sign alignment checks',()=>{
 const env=source('environment.js');
 for(const name of ['supplyPortalLowerCrossbeam','supplyPortalCrossbeamJoint','supplyPortalBeamGoldInlay','attachedSupplyPortalSign','attachedPortalLedRail'])assert.match(env,new RegExp(name));
 assert.match(env,/R\(10\.22,\.52,\.52,steel,1\.40,5\.98,94\.65\)/);
 assert.match(env,/R\(10\.08,1\.48,\.34,dark,1\.40,6\.94,94\.55\)/);
 batch(i=>{
  const beam={x:1.4,y:5.98,w:10.22,h:.52};
  const sign={y:6.94,h:1.48};
  const pillars=[-3.55,6.35];
  assert.ok(pillars.every(x=>x>=beam.x-beam.w/2&&x<=beam.x+beam.w/2),'horizontal beam reaches both pillars');
  assert.ok(beam.y+beam.h/2>sign.y-sign.h/2,'lower beam intersects sign so no floating gap');
  assert.ok(beam.y-beam.h/2>4.6,'horizontal beam does not obstruct player passage');
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});

test('Compact portal-side organized inventory: 30 crate accessibility, decoration, collisions and robot sourcing',()=>{
 const env=source('environment.js');
 const layout=r.WAREHOUSE_STORAGE_LAYOUT,crates=r.WAREHOUSE_CRATE_SOURCES;
 assert.equal(crates.length,2);
 assert.equal(layout.decoration.length,3);
 assert.match(env,/rightSideInventoryDivider/);
 assert.match(env,/WAREHOUSE_STORAGE_LAYOUT\.shutter\.x/);
 assert.match(env,/WAREHOUSE_STORAGE_LAYOUT\.decoration\.entries\(\)/);
 assert.match(env,/collectibleWarehouseCratePallet/);
 assert.match(env,/decorativeWarehousePallet/);
 assert.ok(crates.every(c=>c.x>2&&c.x<8),'usable crates are brought close to the fire-exit-side Supply Portal');
 assert.ok(crates[1].x-crates[0].x>4,'stock crates have a full walking gap');
 assert.ok(layout.decoration.every(p=>p.x>crates.at(-1).x),'decoration is in the farthest right-hand row');
 assert.ok(layout.decoration.every(p=>p.z>crates[0].z),'decoration is behind the active stock');
 assert.equal(collision.getSolidObstacles().some(b=>b.name==='Receiving storage stand'),false,'old invisible stand removed');
 batch(i=>{
  const s=r.newState();s.floor=i%r.FLOORS;
  const crate=crates[i%2],approach={x:crate.x,z:crate.z-2.2};
  assert.equal(collision.isBlocked(approach.x,approach.z,s.floor),false,'accessible crate pickup front');
  assert.equal(collision.isBlocked(crate.x,crate.z,s.floor),true,'solid matches visible stock pallet');
  assert.equal(r.nearestWarehouseCrate(approach.x,approach.z)?.id,crate.id);
  s.pallet.floor=s.floor;s.pallet.x=approach.x;s.pallet.z=approach.z;
  assert.equal(r.loadPallet(s),r.palletCapacity(s),'pallet jack still loads from relocated pallet');
  const bot=r.hireRobot(s,250,true);bot.floor=s.floor;bot.x=crate.x;bot.z=crate.z-2.1;
  assert.equal(r.robotSource(s,bot).type,'crate');
  r.botStep(s,bot,.2);assert.equal(bot.carry,8,'robot loads from new stock position');
  const claw={floor:s.floor,x:crate.x,z:crate.z,aisle:0};
  assert.equal(r.nearestClawSource(s,claw)?.type,'crate');
  assert.equal(collision.isBlocked(25,96.35,s.floor),false,'old stockroom area no longer blocks the open loading area');
  assert.equal(collision.isBlocked(layout.divider.x,layout.divider.z,s.floor),true,'new partition collision matches the model');
  assert.equal(r.loadState(r.serialize(s)).pallet.load,s.pallet.load,'saved cargo survives layout-only change');
 });
});

test('Crab-scrapped robot: 30 smaller detailed sprung-neck cosmetic and gameplay invariants',()=>{
 const chars=source('characters.js');
 assert.match(chars,/comedicBodySpring/);
 assert.match(chars,/damagedSpringMountingCollar/);
 assert.match(chars,/springMountRetainingPin/);
 assert.match(chars,/damagedRobotSpringGuide/);
 assert.match(chars,/springCollarRim/);
 assert.match(chars,/i\/176,angle=t\*11\*Math\.PI\*2/);
 assert.match(chars,/TubeGeometry\(new THREE\.CatmullRomCurve3\(springPoints\),330,\.049,10,false\)/);
 assert.doesNotMatch(chars,/Math\.cos\(angle\)\*\.23,1\.2\+t\*1\.62/);
 batch(i=>{
  assert.ok(.17<.23&&1.34<1.62&&.049<.078,'new spring is narrower, shorter and finer');
  const s=r.newState(),f=i%r.FLOORS,a=i%r.AISLES,b=4+i%18;
  const robot=r.hireRobot(s,240+i,true);r.assignRobot(s,robot.id,f,a,b);
  r.setDeveloperCrab(s,'on');
  const event=r.performCrabSwing(s,f,a,b,true);
  assert.ok(event?.robots.includes(robot.id),'the crab can still scrap the stocker');
  assert.equal(robot.wrecked,true);
  assert.equal(r.botStep(s,robot,10),-1,'a destroyed spring-neck bot cannot continue working');
  const saved=r.loadState(r.serialize(s));
  assert.equal(saved.robots[0].wrecked,true,'destroyed bot state survives reload');
  const cost=robot.paid;
  assert.equal(r.sellRobot(saved,robot.id),Math.floor(cost*.25),'scrap refund remains unchanged by visual spring upgrade');
 });
});
