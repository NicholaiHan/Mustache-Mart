'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..','src',p),'utf8');
for(let i=0;i<30;i++){
 test('Crab no spikes, asymmetric crusher/cutter claws and jointed legs · '+i,()=>{
  const crab=src('natural-crab.js');
  for(const forbidden of ['naturalCrabDorsalSpine','naturalCrabEdgeSpine','naturalCrabPincerSpike','naturalCrabMandibleTusk','new THREE.ConeGeometry'])
   assert.equal(crab.includes(forbidden),false,'unwanted crab spike '+forbidden);
  assert.match(crab,/arm\.scale\.set\(1\.30,1\.18,1\.26\)/);
  assert.match(crab,/arm\.scale\.set\(\.91,\.92,\.94\)/);
  assert.match(crab,/legPropodus/);assert.match(crab,/legAnkle/);
  assert.match(crab,/legCuticlePlate/);
  assert.match(crab,/for\(const side of \[-1,1\]\)for\(let i=0;i<4;i\+\+\)/);
 });
 test('No Safety First sign and proportional pallet jack · '+i,()=>{
  const env=src('environment.js'),equip=src('equipment.js');
  assert.equal(env.includes("'SAFETY FIRST'"),false);
  assert.match(equip,/fullWidthPalletJack/);
  assert.match(equip,/widePalletJackFork/);
  assert.match(equip,/proportionalPalletJackRearHousing/);
  assert.match(equip,/round\(1\.95,\.43,1\.05,frame,root\)/);
  assert.match(equip,/round\(1\.46,\.73,1\.35,card,root\)/);
 });
 test('Shelf product center and real right-corner warehouse · '+i,()=>{
  const env=src('environment.js'),rules=src('rules.mjs');
  assert.match(env,/aisleX\(aisle\)\+sg\*3\.4,TIER_Y\[tier\]\+\.015/);
  assert.match(env,/shelfStockedProductsType/);
  assert.match(rules,/divider:Object\.freeze\(\{x:11\.95,z:96\.35\}\)/);
  assert.match(rules,/\{x:5\.1,z:95\.95\},\{x:9\.4,z:95\.95\}/);
  assert.match(rules,/\[14\.5,17\.7,20\.9\]/);
  assert.match(env,/supplyPortalLowerCrossbeam/);
 });
}
