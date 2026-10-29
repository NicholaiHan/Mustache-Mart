'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const url=require('node:url'),path=require('node:path');
const moduleUrl=url.pathToFileURL(path.resolve(__dirname,'../src/rules.mjs')).href;
let r;
test.before(async()=>{r=await import(moduleUrl);});
test('15 floors / 144,000 items with four height bands and unique indices',()=>{
 assert.equal(r.FLOORS,15);assert.equal(r.TOTAL_ITEMS,144000);
 assert.equal(r.CELLS_PER_FLOOR,2400);
 for(let f=0;f<15;f++)for(let a=0;a<10;a++)for(let side=0;side<2;side++)for(let bay=0;bay<30;bay++)for(let tier=0;tier<4;tier++){
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
 assert.equal(r.purchase(s,'ladderPlus'),false);assert.equal(r.purchase(s,'ladder'),true);
 assert.equal(r.purchase(s,'ladderPlus'),true);assert.equal(r.purchase(s,'cart'),true);
 assert.equal(s.levels.cart,1);
});
test('four shelf bands pay 1 / 1 / 2 / 3 cents and payout requires collection',()=>{
 const s=r.newState();
 for(let tier=0;tier<4;tier++)assert.equal(r.place(s,r.cellId(0,0,0,0,tier)),[1,1,2,3][tier]);
 assert.equal(s.pending,7);assert.equal(s.money,0);
 assert.equal(r.payOut(s),7);assert.equal(s.money,7);assert.equal(s.pending,0);
 const id=r.cellId(0,0,0,0,0);
 assert.ok(r.place(s,id));assert.ok(r.place(s,id));assert.ok(r.place(s,id));
 assert.equal(r.place(s,id),0);
 s.levels.autoPay=1;
 assert.equal(r.place(s,r.cellId(2,0,0,0,2),true),2);
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
 assert.equal(s.robots[0].placed,false,'newly bought robot waits for the player to place it');
 assert.equal(r.assignRobot(s,s.robots[0].id,0,0,18),true);
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
 assert.equal(restored.pending,11);assert.equal(restored.belts[8][3],9);
 assert.equal(restored.stocked,1);
 assert.equal(r.loadState('broken').stocked,0);
 const malformed=JSON.stringify({version:4,levels:{robot:9999,capacity:10000},fill:[9999],money:-5});
 const bounded=r.loadState(malformed);
 assert.equal(bounded.fill[0],4);assert.equal(bounded.levels.capacity,18);
 assert.equal(bounded.levels.robot,70);assert.equal(bounded.money,0);
});

test('legacy 3-band save migrates to 4-band shelf storage without lost goods',()=>{
 const old={version:3,levels:{capacity:3,speed:2},floor:6,money:123,pending:6,fill:Array(15*10*2*30*3).fill(0)};
 old.fill[(6*10*2*30+7)*3+2]=4;
 old.fill[0]=1;
 const s=r.loadState(JSON.stringify(old));
 assert.equal(s.stocked,5);assert.equal(s.floor,6);assert.equal(s.money,123);
 assert.equal(s.fill[(6*10*2*30+7)*4+2],4);assert.equal(s.fill[0],1);
 assert.equal(s.levels.capacity,3);
 assert.equal(JSON.parse(r.serialize(s)).version,4);
});
test('canned goods 3x contract costs exactly $50 and economy bonuses work for robots',()=>{
 const s=r.newState(),soup=r.cellId(0,0,0,0,3),water=r.cellId(0,1,0,0,2);
 assert.equal(r.earnings(s,soup),3);
 assert.equal(r.price(r.UPGRADES.find(u=>u.id==='soupTriple'),0),5000);
 assert.equal(r.purchase(s,'soupTriple'),false);
 s.money=10000;assert.equal(r.purchase(s,'soupTriple'),true);assert.equal(s.money,5000);
 assert.equal(r.earnings(s,soup),9);assert.equal(r.place(s,soup),9);
 assert.equal(r.earnings(s,water),2);
 assert.equal(r.purchase(s,'waterDouble'),true);assert.equal(r.earnings(s,water),4);
 s.levels.shelfBonus=1;s.levels.robotBonus=1;
 assert.equal(r.earnings(s,soup,true),15);
 assert.equal(r.CENTS[2],2);
 assert.equal(r.CENTS[3],3);
});
test('rear receiving and connector order start behind the highest bay',()=>{
 const s=r.newState();s.money=500;
 assert.deepEqual(r.DOCK,{x:1.5,z:96});
 assert.equal(r.bayZ(r.BAYS-1),89.85);
 assert.equal(r.buildBelt(s,0,0,0),true);
 assert.equal(r.buildBelt(s,0,0,1),true);
 assert.equal(s.belts[0][0],2);
});
