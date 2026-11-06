'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const source=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
let rules,traffic;
test.before(async()=>{
 [rules,traffic]=await Promise.all(['rules.mjs','robot-traffic.mjs'].map(p=>import(pathToFileURL(path.resolve(__dirname,'../src',p)).href)));
});
function repeat30(fn){for(let i=0;i<30;i++)fn(i);}

test('30 real old-save pileups: 40 workers separate BEFORE first frame without losing inventory/jobs',()=>{
 repeat30(i=>{
  const s=rules.newState();
  for(let n=0;n<40;n++){
   const bot=rules.hireRobot(s,250,true);
   rules.assignRobot(s,bot.id,i%rules.FLOORS,i%rules.AISLES,15);
   bot.x=rules.aisleX(i%rules.AISLES);bot.z=rules.bayZ(15);
  }
  s.money=50319+i;s.robots[2].broken=true;
  const loaded=rules.loadState(rules.serialize(s));
  assert.equal(loaded.robots.length,40);
  assert.equal(loaded.money,s.money);
  assert.equal(loaded.robots[2].broken,true);
  const positions=new Set(loaded.robots.map(b=>b.x.toFixed(3)+','+b.z.toFixed(3)));
  assert.equal(positions.size,40,'all saved workers must be visibly unfused before gameplay');
  for(let a=0;a<loaded.robots.length;a++)for(let b=a+1;b<loaded.robots.length;b++)
   assert.ok(Math.hypot(loaded.robots[a].x-loaded.robots[b].x,
    loaded.robots[a].z-loaded.robots[b].z)>=traffic.ROBOT_CLEARANCE-1e-4,'saved robots are physically separate');
  assert.ok(loaded.robots.every(b=>b.placed&&b.floor===i%rules.FLOORS));
 });
});

test('30 persistent moving crabs: on reaching a waypoint it immediately moves to another',()=>{
 repeat30(i=>{
  const s=rules.newState();s.crab.unlocked=true;
  const patrol=s.crab.patrol[0];
  patrol.x=rules.aisleX(0);patrol.aisle=0;patrol.z=15;
  patrol.targetAisle=0;patrol.targetZ=15;patrol.roamTimer=120;
  const before={x:patrol.x,z:patrol.z};
  rules.advanceCrab(s,.25,true);
  assert.ok(Math.hypot(patrol.x-before.x,patrol.z-before.z)>.001,
   'crab cannot pause for its old 120-second timer after waypoint reached');
  assert.ok(patrol.targetAisle!==0);
  for(let frame=0;frame<100;frame++){
   const oldX=patrol.x,oldZ=patrol.z;
   rules.advanceCrab(s,.20,true);
   assert.ok(Math.hypot(patrol.x-oldX,patrol.z-oldZ)>.001,'crab walks continuously each frame');
  }
 });
});

test('30 organic crab anatomy checks: no scattered shell circles; muscular legs and broad claws',()=>{
 const crab=source('natural-crab.js'),game=source('game.js');
 for(const part of ['naturalCarapaceMottle','carapaceRidgeBump','naturalShellFreckle',
  'naturalCrabRoundedShellRidge','naturalCrabShellScar','naturalCrabPincerNodule',
  'naturalCrabRoundedEdge','clawTextureNodule','crabAngularCarapaceScute'])
  assert.ok(!crab.includes("'"+part+"'"),part+' must be absent');
 repeat30(()=>{
  assert.match(crab,/branch\(hip,'legPropodus',warm,elbow,ankle,\.30,\.19\)/);
  assert.match(crab,/ellipsoid\(arm,'clawPalm',shell,side\*1\.45,-\.15,-\.95,1\.08,\.69,\.89\)/);
  assert.match(game,/crabModel\.scale\.set\(\.77\/MAP_WIDTH_MULTIPLIER,\.77,\.77\)/);
  assert.match(crab,/const outline=\[/);
  assert.match(crab,/legDactylus/);
 });
});

test('30 attached portraits and service fixtures retain same scaling parent',()=>{
 const scene=source('environment.js');
 repeat30(()=>{
  assert.match(scene,/keepProportion:true/);
  assert.match(scene,/connectedPortraitGoldVertical/);
  assert.match(scene,/connectedPortraitGoldHorizontal/);
  assert.match(scene,/top-bottom\+rail\*1\.6/);
  assert.match(scene,/connectedCustomerServiceQueue/);
  assert.match(scene,/customerServiceLinePole/);
  assert.match(scene,/customerServiceConnectedLine/);
  assert.match(scene,/proportionalCustomerServiceKiosk/);
  assert.match(scene,/customerServiceCenteredSignHousing/);
  assert.match(scene,/customerServiceCenteredSign/);
 });
});

test('30 new inventory type checks: distinct metal cans, necked bottles and square cereal boxes',()=>{
 const scene=source('environment.js');
 repeat30(()=>{
  assert.match(scene,/new THREE\.CylinderGeometry\(type===0\?\.18:\.16/);
  assert.match(scene,/new THREE\.BoxGeometry\(\.37,\.55,\.23\)/);
  assert.match(scene,/water-bottle-with-neck/);
  assert.match(scene,/wine-bottle-with-neck/);
  assert.match(scene,/cereal-box/);
  assert.match(scene,/productShape:'can'/);
 });
});

test('30 pallet jack proportions: wider body, realistic fork/wheel width and short length',()=>{
 const equip=source('equipment.js');
 repeat30(()=>{
  assert.match(equip,/round\(\.33,\.17,1\.51,yellow,root\)/);
  assert.match(equip,/round\(1\.90,\.49,\.67,yellow,root\)/);
  assert.match(equip,/industrialWheel\(root,side\*\.74,\.27,\.81,\.27\)/);
  assert.match(equip,/palletJackCargoDeck/);
  assert.match(equip,/palletJackSizedCargoCarton/);
 });
});
