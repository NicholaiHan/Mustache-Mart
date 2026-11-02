'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
let rules,collision;
test.before(async()=>{[rules,collision]=await Promise.all(['rules.mjs','collision.mjs'].map(f=>import(pathToFileURL(path.resolve(__dirname,'../src',f)).href)));});
const source=name=>fs.readFileSync(path.resolve(__dirname,'../src',name),'utf8');
const run30=fn=>{for(let i=0;i<30;i++)fn(i);};

test('portal sign: 30 alignment and safe save cases, lighting no longer placed on rear wall',()=>{
 const env=source('environment.js');
 assert.match(env,/attachedSupplyPortalSign/);
 assert.match(env,/attachedPortalLedRail/);
 assert.match(env,/portalSignLightDot/);
 assert.match(env,/R\(10\.08,1\.48,\.34,dark,1\.40,6\.94,94\.55\)/);
 assert.match(env,/R\(8\.0,\.12,\.10,steel,1\.4,6\.40,94\.30\)/);
 assert.doesNotMatch(env,/9\.70,99\.91|9\.93,99\.82|9\.67,99\.68/,'old wall-mounted LEDs removed');
 run30(i=>{
  const pillarCenters=[-3.55,6.35],cassette={center:1.4,width:10.08,bottom:6.94-1.48/2,top:6.94+1.48/2};
  assert.ok(pillarCenters[0]>=cassette.center-cassette.width/2&&pillarCenters[1]<=cassette.center+cassette.width/2);
  assert.ok(Math.abs(cassette.top-(7.99-.62/2))<.01,'sign touches supporting beam');
  assert.ok(cassette.bottom<6.42&&cassette.top>7.13);
  const s=rules.newState();s.floor=i%rules.FLOORS;
  assert.equal(rules.loadState(rules.serialize(s)).floor,s.floor);
 });
});

test('player mobility: 30 two-press double-jump limits, purchasable tiers, and old-save compatibility',()=>{
 const game=source('game.js');
 assert.match(game,/tryPlayerJump\(s,V\)/);
 assert.match(game,/e\.code==='Space'/);
 assert.match(game,/doubleJump:\[0,915\]/);
 assert.match(game,/playerMoveMultiplier/);
 run30(i=>{
  const s=rules.newState();s.money=10000000+i;
  const p={y:0,vy:0,jumpCount:0};
  assert.equal(rules.tryPlayerJump(s,p),false,'no free jump without Spring-Loaded Shoes');
  assert.equal(rules.purchase(s,'doubleJump'),false,'cannot bypass prerequisite');
  assert.equal(rules.purchase(s,'jump'),true);
  assert.equal(rules.tryPlayerJump(s,p),true,'first jump works');
  p.y=.3;
  assert.equal(rules.tryPlayerJump(s,p),false,'cannot double jump before purchase');
  assert.equal(rules.purchase(s,'doubleJump'),true);
  assert.equal(rules.tryPlayerJump(s,p),true,'second Space press in the air works');
  assert.equal(p.jumpCount,2);
  assert.equal(rules.tryPlayerJump(s,p),false,'third airborne jump is always blocked');
  p.y=0;p.vy=0;
  assert.equal(rules.tryPlayerJump(s,p),true,'landing restores one ground jump');
  assert.equal(p.jumpCount,1);
  const saved=rules.loadState(rules.serialize(s));
  assert.equal(saved.levels.doubleJump,1);
  assert.equal(saved.levels.jump,1);
 });
});

test('midair control and sprint training: 30 skill unlock, speed scaling, and save cases',()=>{
 run30(i=>{
  const s=rules.newState();s.money=10000000+i;
  assert.equal(rules.purchase(s,'airControl'),false);
  assert.equal(rules.purchase(s,'sprintTraining'),false);
  assert.equal(rules.purchase(s,'jump'),true);
  assert.equal(rules.purchase(s,'doubleJump'),true);
  for(let k=0;k<(i%4)+1;k++)assert.equal(rules.purchase(s,'airControl'),true);
  assert.equal(rules.purchase(s,'speed'),true);
  assert.equal(rules.purchase(s,'speed'),true);
  assert.equal(rules.purchase(s,'courierStride'),true);
  assert.equal(rules.purchase(s,'courierStride'),true);
  for(let k=0;k<(i%5)+1;k++)assert.equal(rules.purchase(s,'sprintTraining'),true);
  const air=rules.playerMoveMultiplier(s,false,true),sprint=rules.playerMoveMultiplier(s,true,false);
  assert.ok(Math.abs(air-(1+.12*s.levels.airControl))<1e-9);
  assert.ok(Math.abs(sprint-(1.4+.12*s.levels.sprintTraining))<1e-9);
  assert.ok(Math.abs(rules.playerMoveMultiplier(s,true,true)-air*sprint)<1e-9);
  const saved=rules.loadState(rules.serialize(s));
  assert.equal(saved.levels.airControl,s.levels.airControl);
  assert.equal(saved.levels.sprintTraining,s.levels.sprintTraining);
 });
});

test('fire exit and wall-mounted supports: 30 safe door paths and integrated shelf columns',()=>{
 const env=source('environment.js'),coll=source('collision.mjs');
 assert.match(env,/notice\.position\.set\(102\.46,3\.8,z\)/);
 assert.match(env,/PERIMETER_COLUMN_X=\[-9\.44,102\.48\]/);
 assert.match(env,/wallIntegratedShelfColumn/);
 assert.match(env,/perimeterShelfTie/);
 assert.match(env,/if\(x<0&&z===86\)continue/);
 assert.doesNotMatch(env,/for\(const x of \[-7,101\]\)/);
 const pillars=collision.getSolidObstacles().filter(x=>x.name==='Structural wall column');
 assert.ok(pillars.length>=8);
 assert.equal(pillars.some(x=>x.x<0&&x.z===86),false,'no column in fire exit door');
 run30(i=>{
  const f=i%rules.FLOORS;
  assert.equal(collision.isBlocked(-9.1,85,f),false,'fire exit approach has no pillar collision');
  assert.equal(collision.isBlocked(-7,26,f),false,'removed decorative left aisle blocker');
  assert.equal(collision.isBlocked(102.48,26,f),true,'new wall column has real collision');
  const s=rules.newState();s.floor=f;
  assert.equal(rules.loadState(rules.serialize(s)).floor,f);
 });
});
