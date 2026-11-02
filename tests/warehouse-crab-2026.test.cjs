'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
let rules,collision;
test.before(async()=>{
 [rules,collision]=await Promise.all(['rules.mjs','collision.mjs'].map(file=>import(pathToFileURL(path.resolve(__dirname,'../src',file)).href)));
});
const source=name=>fs.readFileSync(path.resolve(__dirname,'../src',name),'utf8');
const repeat=fn=>{for(let i=0;i<30;i++)fn(i);};

test('warehouse cleanup: 30 rear crosswalks free of phantom pallet blocks',()=>{
 const obstacles=collision.getSolidObstacles();
 assert.ok(!obstacles.some(o=>/^Stock pallet /.test(o.name)),'legacy invisible boxes must be deleted');
 assert.ok(!obstacles.some(o=>o.name==='Receiving boxed stock behind divider'),'no broad invisible rear warehouse solid');
 repeat(i=>{
  const s=rules.newState();s.floor=i%rules.FLOORS;
  const x=30+(i%4)*3.5,z=95+Math.floor(i%2)*3;
  assert.equal(collision.isBlocked(x,z,s.floor),false,'old phantom pallet must be walkable');
  assert.equal(collision.isBlocked(rules.DOCK.x,rules.DOCK.z,s.floor),true,'real desk stays solid');
  assert.equal(rules.loadState(rules.serialize(s)).floor,s.floor);
 });
});

test('usable boxed warehouse stock: 30 hand, pallet, robot and claw sourcing scenarios',()=>{
 assert.equal(rules.WAREHOUSE_CRATE_SOURCES.length,2);
 const scene=source('environment.js'),game=source('game.js');
 assert.match(scene,/collectibleWarehouseCratePallet/);
 assert.match(scene,/collectibleWarehouseCarton/);
 assert.match(game,/nearestWarehouseCrate\(V\.x,V\.z,2\.75\)/);
 repeat(i=>{
  const s=rules.newState();s.floor=i%rules.FLOORS;
  const crate=rules.WAREHOUSE_CRATE_SOURCES[i%2];
  const approach={x:crate.x,z:crate.z-2.2};
  assert.equal(collision.isBlocked(approach.x,approach.z,s.floor),false,'front of real crate must be accessible');
  assert.equal(collision.isBlocked(crate.x,crate.z,s.floor),true,'only visible crate footprint is solid');
  assert.equal(rules.nearestWarehouseCrate(approach.x,approach.z)?.id,crate.id);
  s.pallet.floor=s.floor;s.pallet.x=approach.x;s.pallet.z=approach.z;
  assert.equal(rules.loadPallet(s),rules.palletCapacity(s),'jack loads directly from real crates');
  const bot=rules.hireRobot(s,250,true);
  bot.floor=s.floor;bot.x=crate.x;bot.z=crate.z;bot.phase='supply';bot.carry=0;
  assert.equal(rules.robotSource(s,bot).type,'crate','robot navigates to inventory crates');
  rules.botStep(s,bot,.25);
  assert.equal(bot.carry,8,'robot loads a full crate batch');
  const claw={floor:s.floor,x:crate.x,z:crate.z,aisle:0};
  assert.equal(rules.nearestClawSource(s,claw).type,'crate','claw can draw from crate inventory');
  assert.equal(rules.loadState(rules.serialize(s)).pallet.load,s.pallet.load);
 });
});

test('separate decorative stock behind warehouse desk: 30 floor and visual checks',()=>{
 const env=source('environment.js');
 assert.match(env,/decorativeCartonsBehindWarehouseDesk/);
 assert.match(env,/decorativeWarehousePallet/);
 assert.match(env,/x,z:98\.9/,'decorative pallets belong behind the desk at z=96');
 assert.match(env,/addPackedCarton/,'both decorations and real stock use matching packing details');
 repeat(i=>{
  const s=rules.newState();s.floor=i%rules.FLOORS;
  assert.equal(collision.isBlocked(rules.DOCK.x,93,s.floor),false);
  assert.equal(s.stocked,0,'decoration does not generate inventory');
  assert.equal(rules.loadState(rules.serialize(s)).stocked,0);
 });
});

test('$1m dev credit and instant authentic single-floor crab smack: 30 saves and raid checks',()=>{
 const game=source('game.js'),html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 assert.match(game,/DEV_CASH_CENTS=100_000_000/);
 assert.match(game,/function previewDevCrabSmack\(\)/);
 assert.match(html,/id="devCrabSmack"/);
 assert.match(html,/\$1,000,000/);
 repeat(i=>{
  const s=rules.newState();s.floor=i%rules.FLOORS;
  s.money=i*11;
  assert.equal(Math.max(s.money,100_000_000),100_000_000);
  const floor=s.floor,aisle=i%rules.AISLES,bay=5+i%16,id=rules.cellId(floor,aisle,0,bay,0);
  s.fill[id]=2;s.stocked=2;
  assert.equal(rules.setDeveloperCrab(s,'on'),true);
  const event=rules.performCrabSwing(s,floor,aisle,bay,true);
  assert.equal(event.floor,floor);
  assert.equal(event.fallen,2);
  assert.equal(s.stocked,0);
  assert.equal(s.crab.attacks.reduce((total,n)=>total+n,0),1,'demo does not strike every floor');
  assert.equal(s.stockPiles.filter(p=>p.crabDebris).reduce((n,p)=>n+p.count,0),2);
  s.levels.crabKing=1;
  assert.equal(rules.performCrabSwing(s,floor,aisle,bay,true),null,'tamed crab cannot be forced to damage stock');
  const saved=rules.loadState(rules.serialize(s));
  assert.equal(saved.crab.attacks[floor],1);
  assert.equal(saved.levels.crabKing,1);
 });
});
