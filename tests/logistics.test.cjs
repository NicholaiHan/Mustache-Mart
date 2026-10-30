'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
let r;
test.before(async()=>{r=await import(pathToFileURL(path.resolve(__dirname,'../src/rules.mjs')).href);});
test('robots are purchased separately from upgrades, placed manually, and can be sold for half',()=>{
 const s=r.newState();s.money=20000;
 assert.equal(r.purchase(s,'robot'),true);
 const bot=s.robots[0],cost=bot.paid;
 assert.equal(bot.placed,false);
 for(let i=0;i<500;i++)r.botStep(s,bot,.1);
 assert.equal(s.stocked,0,'unplaced robots must not stock automatically');
 assert.equal(r.purchase(s,'robotSpeed'),true);
 assert.equal(r.purchase(s,'robotLift'),true);
 assert.equal(s.levels.robot,1);
 assert.equal(s.levels.robotSpeed,1);
 assert.equal(s.levels.robotLift,1);
 assert.equal(r.assignRobot(s,bot.id,3,4,18),true);
 assert.equal(bot.floor,3);assert.equal(bot.aisle,4);assert.equal(bot.placed,true);
 for(let i=0;i<650;i++)r.botStep(s,bot,.1);
 assert.ok(s.stocked>0,'deployed bot picks up stock and works');
 const before=s.money,refund=r.sellRobot(s,bot.id);
 assert.equal(refund,Math.floor(cost/2));
 assert.equal(s.money,before+refund);
 assert.equal(s.levels.robot,0);assert.equal(s.robots.length,0);
});
test('conveyors deliver inventory over time that can be collected by robots or player, then resold at half',()=>{
 const s=r.newState();s.money=10000;
 assert.equal(r.buildBelt(s,0,0,0),true);
 assert.equal(s.beltStock[0][0],0);
 r.advanceBelts(s,.3);
 assert.equal(s.beltStock[0][0],0);
 r.advanceBelts(s,5);
 assert.equal(s.beltStock[0][0],0,'belts must NEVER create products by themselves');
 assert.equal(r.purchase(s,'itemClaw'),true);
 assert.ok(r.deployClaw(s,0,0,r.BAYS-1));
 r.advanceBelts(s,5);
 assert.ok(s.beltStock[0][0]>0,'placed claw must transfer inventory from dock');
 s.money-=r.price(r.UPGRADES.find(u=>u.id==='robot'),0);
 r.hireRobot(s,250,false);
 assert.equal(r.assignRobot(s,s.robots[0].id,0,0,29),true);
 const source=r.robotSource(s,s.robots[0]);
 assert.equal(source.type,'belt');
 assert.equal(source.aisle,0);
 const oldStock=s.beltStock[0][0];
 assert.equal(r.takeBelt(s,0,0),true);
 assert.equal(s.beltStock[0][0],oldStock-1);
 const refund=r.sellBelt(s,0,0,0);
 assert.equal(refund,6);
 assert.equal(s.belts[0][0],0);
 assert.equal(r.takeBelt(s,0,0),false);
});
test('robots select closest reachable empty bay; fixed ladders or a moving lift unlock higher tiers',()=>{
 const s=r.newState();s.money=10000;
 assert.equal(r.purchase(s,'robot'),true);
 const bot=s.robots[0];r.assignRobot(s,bot.id,0,0,18);
 const top=r.cellId(0,0,0,18,3),low=r.cellId(0,0,0,18,0);
 assert.equal(r.robotCanReach(s,bot,low),true);
 assert.equal(r.robotCanReach(s,bot,top),false);
 assert.equal(r.purchase(s,'ladder'),true);
 assert.equal(r.purchase(s,'ladderPlus'),true);
 assert.ok(r.deployLadder(s,0,0,18));
 assert.equal(r.robotCanReach(s,bot,top),true);
 assert.equal(r.purchase(s,'robotLift'),true);
 assert.equal(r.robotCanReach(s,bot,r.cellId(0,0,0,28,3)),true);
});
test('placed ladders, extra ladders, conveyors and their receipts survive saved progress',()=>{
 const s=r.newState();s.money=10000;
 r.purchase(s,'ladder');r.purchase(s,'ladderUnit');
 const first=r.deployLadder(s,0,2,11);
 const second=r.deployLadder(s,1,4,25);
 assert.ok(first&&second);
 r.buildBelt(s,0,4,0);r.buildBelt(s,0,4,1);
 assert.equal(r.purchase(s,'itemClaw'),true);
 s.stockPiles.push({floor:0,aisle:4,x:r.aisleX(4)+2.3,z:r.bayZ(r.BAYS-2),count:16});
 assert.ok(r.deployClaw(s,0,4,r.BAYS-2));
 r.advanceBelts(s,5);
 const restored=r.loadState(r.serialize(s));
 assert.equal(restored.ladders.length,2);
 assert.equal(restored.belts[0][4],2);
 assert.equal(restored.beltReceipts[0][4].length,2);
 assert.ok(restored.beltStock[0][4]>0);
 assert.equal(r.sellBelt(restored,0,4,0),0,'only final segment can be removed');
 const money=restored.money;
 assert.equal(r.sellLadder(restored,first.id),22);
 assert.equal(restored.money,money+22);
 assert.equal(restored.ladders.length,1);
});

test('pallet jack and purchased claws never conjure goods; drop-offs save and capacity grows from 1/20 to one aisle',()=>{
 const s=r.newState();s.money=1000000000;
 assert.equal(r.itemsPerAisle,960);
 assert.equal(r.palletCapacity(s),48);
 assert.equal(r.loadPallet(s),48);
 s.pallet.x=r.aisleX(1);s.pallet.z=r.bayZ(28);
 assert.equal(r.unloadPallet(s),48);
 assert.equal(s.stockPiles[0].count,48);
 assert.equal(r.buildBelt(s,0,1,0),true);
 assert.equal(r.advanceBelts(s,12),0);
 assert.equal(r.purchase(s,'itemClaw'),true);
 assert.ok(r.deployClaw(s,0,1,29));
 assert.ok(r.advanceBelts(s,8)>0);
 const before=r.loadState(r.serialize(s));
 assert.equal(before.claws.length,1);
 assert.equal(before.stockPiles[0].count,s.stockPiles[0].count);
 for(const cap of [60,120,240,480,960]){
  assert.equal(r.purchase(s,'palletCapacity'),true);
  assert.equal(r.palletCapacity(s),cap);
 }
 assert.equal(r.purchase(s,'palletCapacity'),false);
});
test('rotating the outlet right transfers existing goods only to connected adjacent belts',()=>{
 const s=r.newState();s.money=10000;
 r.buildBelt(s,0,0,0);
 assert.equal(r.advanceBelts(s,50),0);
 assert.equal(r.rotateBelt(s,0,0,0),1);
 assert.equal(r.advanceBelts(s,10),0);
 assert.equal(s.beltStock[0][0],0);
 r.purchase(s,'itemClaw');r.deployClaw(s,0,0,29);
 r.advanceBelts(s,8);
 const qty=s.beltStock[0][0];assert.ok(qty>0);
 r.advanceBelts(s,3);assert.ok(s.beltStock[0][0]>=qty,'without adjacent belt, stock remains on the original belt');
 r.buildBelt(s,0,1,0);
 r.advanceBelts(s,1.25);
 assert.ok(s.beltStock[0][1]>0);
 const count=s.beltStock[0][0]+s.beltStock[0][1];
 s.claws=[]; // Stop further real supplier input before checking conservative routing.
 r.advanceBelts(s,1.25);
 assert.equal(s.beltStock[0][0]+s.beltStock[0][1],count,'turns transfer existing stock without creating new items');
});
test('player-operated mobile ladder does not automatically earn money or stock shelves',()=>{
 const s=r.newState();s.money=1000;
 r.purchase(s,'ladder');r.purchase(s,'cart');
 s.cart.mounted=true;s.cart.z=40;s.levels.cartSpeed=2;
 assert.equal(r.cartStep(s,100),-1);
 assert.equal(s.stocked,0);
 assert.equal(r.liftPlatform(s,1,4),9.6);
 const before=s.cart.z;
 assert.equal(r.drivePlatform(s,1,0,.5),true);
 assert.ok(s.cart.z<before);
 assert.equal(s.stocked,0);
});

test('claw loads exactly three cartons into one segment, then stops until space opens',()=>{
 const q=r.newState();q.money=100000;
 const a=4,pile={floor:0,aisle:a,x:r.aisleX(a)+2.1,z:r.bayZ(r.BAYS-1),count:50};
 assert.equal(r.buildBelt(q,0,a,0),true);
 q.stockPiles.push(pile);
 assert.equal(r.advanceBelts(q,60),0,'empty belt cannot source its own goods');
 assert.equal(r.purchase(q,'itemClaw'),true);
 assert.ok(r.deployClaw(q,0,a,r.BAYS-1));
 assert.equal(r.advanceBelts(q,30),3,'only three may load before the belt backs up');
 assert.equal(q.beltStock[0][a],3);
 assert.equal(r.beltSegmentCount(q,0,a,0),3);
 assert.equal(pile.count,47);
 assert.equal(r.advanceBelts(q,150),0,'claw must stop when the receiving segment is full');
 assert.equal(pile.count,47,'blocked claw cannot consume inventory');
 assert.equal(r.takeBelt(q,0,a,0),true);
 assert.equal(r.advanceBelts(q,1.5),1,'only one new item enters the freed slot');
 assert.equal(r.beltSegmentCount(q,0,a,0),3);
 assert.equal(pile.count,46);
});
test('multiple forward sections move exactly one hop and freeze at blocked or missing next segment',()=>{
 const q=r.newState();q.money=100000;const a=5;
 r.buildBelt(q,0,a,0);
 q.stockPiles.push({floor:0,aisle:a,x:r.aisleX(a)+2.1,z:r.bayZ(r.BAYS-1),count:50});
 r.purchase(q,'itemClaw');r.deployClaw(q,0,a,r.BAYS-1);
 r.advanceBelts(q,20);
 assert.deepEqual(q.beltItems[0][a].slice(0,2),[3,0]);
 r.buildBelt(q,0,a,1);
 r.advanceBelts(q,50);
 assert.deepEqual(q.beltItems[0][a].slice(0,3),[3,3,0]);
 const consumed=q.stockPiles[0].count;
 r.advanceBelts(q,80);
 assert.equal(q.stockPiles[0].count,consumed);
 assert.deepEqual(q.beltItems[0][a].slice(0,3),[3,3,0]);
 r.takeBelt(q,0,a,1);
 assert.equal(q.beltItems[0][a][1],2);
 r.advanceBelts(q,1);
 assert.deepEqual(q.beltItems[0][a].slice(0,3),[2,3,0],
  'only one product moves to the newly available downstream section');
 r.advanceBelts(q,2);
 assert.deepEqual(q.beltItems[0][a].slice(0,3),[3,3,0],
  'remaining conveyor space refills through claw, with no overflow');
});
test('rotated junction refuses a full adjacent segment, and never duplicates inventory',()=>{
 const q=r.newState();q.money=100000;
 for(const a of [5,6])r.buildBelt(q,0,a,0);
 q.stockPiles.push({floor:0,aisle:5,x:r.aisleX(5)+2.1,z:r.bayZ(r.BAYS-1),count:30});
 q.stockPiles.push({floor:0,aisle:6,x:r.aisleX(6)+2.1,z:r.bayZ(r.BAYS-1),count:30});
 for(const a of [5,6]){r.purchase(q,'itemClaw');r.deployClaw(q,0,a,r.BAYS-1);}
 r.advanceBelts(q,25);
 assert.deepEqual([q.beltStock[0][5],q.beltStock[0][6]],[3,3]);
 assert.equal(r.rotateBelt(q,0,5,0),1);
 const before=q.stockPiles.map(p=>p.count).reduce((a,b)=>a+b,0)+q.beltStock[0][5]+q.beltStock[0][6];
 r.advanceBelts(q,15);
 assert.deepEqual([q.beltStock[0][5],q.beltStock[0][6]],[3,3],
  'full target prevents junction movement');
 assert.equal(q.stockPiles.map(p=>p.count).reduce((a,b)=>a+b,0)+q.beltStock[0][5]+q.beltStock[0][6],before);
 r.takeBelt(q,0,6,0);
 r.advanceBelts(q,1);
 assert.equal(q.beltStock[0][6],3,'right-turn sends a real product into the free slot');
 assert.equal(q.beltStock[0][5],2,'source loses exactly one carton');
});
test('older saves migrate into three-slot segments without destroying overflow',()=>{
 const q=r.newState();q.money=10000;
 r.buildBelt(q,0,4,0);r.purchase(q,'itemClaw');
 const legacy=JSON.parse(r.serialize(q));delete legacy.beltItems;
 legacy.beltStock[0][4]=16;
 const v=r.loadState(JSON.stringify(legacy));
 assert.equal(v.beltStock[0][4],3);
 assert.equal(v.beltItems[0][4][0],3);
 assert.equal(v.stockPiles.filter(p=>p.aisle===4).reduce((sum,p)=>sum+p.count,0),13);
 assert.equal(r.loadState(r.serialize(v)).stockPiles.filter(p=>p.aisle===4).reduce((sum,p)=>sum+p.count,0),13);
});
test('30 randomized first-floor conveyor sessions conserve every item under sustained blockages',()=>{
 for(let session=0;session<30;session++){
  const q=r.newState();q.money=100000;
  const a=3+session%5,initial=40+session;
  for(let seg=0;seg<3;seg++)assert.equal(r.buildBelt(q,0,a,seg),true);
  q.stockPiles.push({floor:0,aisle:a,x:r.aisleX(a)+2.1,z:r.bayZ(r.BAYS-1),count:initial});
  r.purchase(q,'itemClaw');r.deployClaw(q,0,a,r.BAYS-1);
  let collected=0,seed=session*997+5;
  for(let tick=0;tick<450;tick++){
   seed=(1664525*seed+1013904223)>>>0;
   if(seed%17===0 && r.takeBelt(q,0,a))collected++;
   r.advanceBelts(q,.31);
   const items=q.beltItems[0][a].slice(0,3);
   assert.ok(items.every(v=>Number.isInteger(v)&&v>=0&&v<=3),'invalid slot count in run '+session);
   const sum=items.reduce((n,v)=>n+v,0);
   assert.equal(q.beltStock[0][a],sum,'aggregate out of sync');
   assert.equal(q.stockPiles[0].count+sum+collected,initial,'products duplicated/lost in run '+session);
  }
  const restored=r.loadState(r.serialize(q));
  assert.deepEqual(restored.beltItems[0][a].slice(0,3),q.beltItems[0][a].slice(0,3));
 }
 console.log('30 randomized first-floor clogged-belt simulations passed: 3 items per section, no duplication, no disappearance, saves intact');
});
