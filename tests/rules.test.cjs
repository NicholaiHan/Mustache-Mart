'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const url=require('node:url'),path=require('node:path');
const moduleUrl=url.pathToFileURL(path.resolve(__dirname,'../src/rules.mjs')).href;
let r;
test.before(async()=>{r=await import(moduleUrl);});
test('15 floors / 108,000 items with unique indices',()=>{
 assert.equal(r.FLOORS,15);assert.equal(r.TOTAL_ITEMS,108000);
 assert.equal(r.CELLS_PER_FLOOR,1800);
 for(let f=0;f<15;f++)for(let a=0;a<10;a++)for(let side=0;side<2;side++)for(let bay=0;bay<30;bay++)for(let tier=0;tier<3;tier++){
  const id=r.cellId(f,a,side,bay,tier);
  assert.deepEqual(r.decode(id),{floor:f,aisle:a,side,bay,tier});
 }
});
test('initial one-item carrying capacity, progressive upgrades and ladder to cart',()=>{
 const s=r.newState();assert.equal(r.capacity(s),1);assert.equal(r.walkSpeed(s),3.3);
 assert.equal(r.purchase(s,'capacity'),false);
 s.money=2000;
 assert.equal(r.purchase(s,'capacity'),true);assert.equal(r.capacity(s),2);
 assert.equal(r.purchase(s,'speed'),true);assert.ok(r.walkSpeed(s)>3.3);
 assert.equal(r.purchase(s,'cart'),false);
 assert.equal(r.purchase(s,'ladder'),true);assert.equal(r.purchase(s,'cart'),true);
 assert.equal(s.levels.cart,1);
});
test('shelf heights pay exactly 1 / 2 / 3 cents and payout requires collection',()=>{
 const s=r.newState();
 for(let tier=0;tier<3;tier++)assert.equal(r.place(s,r.cellId(0,0,0,0,tier)),tier+1);
 assert.equal(s.pending,6);assert.equal(s.money,0);
 assert.equal(r.payOut(s),6);assert.equal(s.money,6);assert.equal(s.pending,0);
 const id=r.cellId(0,0,0,0,0);
 assert.ok(r.place(s,id));assert.ok(r.place(s,id));assert.ok(r.place(s,id));
 assert.equal(r.place(s,id),0);
 s.levels.autoPay=1;
 assert.equal(r.place(s,r.cellId(2,0,0,0,2),true),3);
 assert.equal(s.money,9);
});
test('belt segments require adjacent route and money, persist with floors',()=>{
 const s=r.newState();s.money=200;
 assert.equal(r.buildBelt(s,0,0,1),false);
 assert.equal(r.buildBelt(s,0,0,0),true);
 assert.equal(s.belts[0][0],1);
 assert.equal(r.buildBelt(s,1,0,1),false);
 assert.equal(r.buildBelt(s,0,0,1),true);
 assert.equal(s.belts[0][0],2);
 assert.equal(s.belts[1][0],0);
});
test('bots collect supplies and stock shelves, including unvisited floors',()=>{
 const s=r.newState();s.money=300;
 assert.equal(r.purchase(s,'robot'),true);
 assert.equal(s.robots.length,1);
 for(let i=0;i<1500;i++)r.botStep(s,s.robots[0],.1);
 assert.ok(s.stocked>0,'robot should stock after collecting supplies');
 assert.ok(s.money>0,'robot earnings should be automatic');
 const s2=r.loadState(r.serialize(s));
 assert.equal(s2.stocked,s.stocked);
 assert.equal(s2.robots.length,1);
 s2.floor=14;
 const before=s2.stocked;
 for(let i=0;i<500;i++)r.botStep(s2,s2.robots[0],.1);
 assert.ok(s2.stocked>before,'robot operates when player is on another floor');
});
test('save restores economy, exact shelf progress and valid upgrades',()=>{
 const s=r.newState();s.floor=11;s.money=500;s.pending=9;s.belts[8][3]=9;
 r.place(s,r.cellId(11,8,1,15,2));
 const restored=r.loadState(r.serialize(s));
 assert.equal(restored.floor,11);assert.equal(restored.money,500);
 assert.equal(restored.pending,12);assert.equal(restored.belts[8][3],9);
 assert.equal(restored.stocked,1);
 assert.equal(r.loadState('broken').stocked,0);
 const malformed=JSON.stringify({version:3,levels:{robot:9999,capacity:10000},fill:[9999],money:-5});
 const bounded=r.loadState(malformed);
 assert.equal(bounded.fill[0],4);assert.equal(bounded.levels.capacity,18);
 assert.equal(bounded.levels.robot,70);assert.equal(bounded.money,0);
});
