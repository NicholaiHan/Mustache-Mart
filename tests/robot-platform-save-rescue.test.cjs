'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
let r,saves;
test.before(async()=>{
 [r,saves]=await Promise.all(['rules.mjs','save-rescue.mjs'].map(x=>import(pathToFileURL(path.resolve(__dirname,'../src',x)).href)));
});
const source=name=>fs.readFileSync(path.join(__dirname,'..','src',name),'utf8');
const run30=fn=>{for(let i=0;i<30;i++)fn(i);};
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};

test('robot physical top-shelf platform: 30 no-bypass, raised lift and relaunch cases',()=>{
 run30(i=>{
  const s=r.newState();const aisle=i%r.AISLES,bay=4+i%16,id=r.cellId(0,aisle,0,bay,3);
  const robot=r.hireRobot(s,250,true);robot.floor=0;robot.aisle=aisle;
  robot.x=r.aisleX(aisle);robot.z=r.bayZ(bay);
  s.levels.ladder=1;s.levels.ladderPlus=1;
  s.levels.robotLift=1;
  assert.equal(r.robotCanReach(s,robot,id),false,'paid robot lift alone must fail');
  const p={id:1,floor:0,aisle,x:r.aisleX(aisle),z:r.bayZ(bay),liftHeight:0,mounted:false,paid:140};
  s.platforms=[p];s.levels.cart=1;
  assert.equal(r.robotCanReach(s,robot,id),false,'unraised platform does not help');
  p.liftHeight=9.3;p.z+=5;
  assert.equal(r.robotCanReach(s,robot,id),false,'wrong bay is insufficient');
  p.z=r.bayZ(bay);p.x+=4;
  assert.equal(r.robotCanReach(s,robot,id),false,'wrong aisle is insufficient');
  p.x=r.aisleX(aisle);p.floor=1;
  assert.equal(r.robotCanReach(s,robot,id),false,'platform on another floor is insufficient');
  p.floor=0;p.mounted=true;
  assert.equal(r.robotCanReach(s,robot,id),false,'robot must not ride an occupied platform');
  p.mounted=false;
  assert.equal(r.robotCanReach(s,robot,id),true,'only a raised adjacent motorized platform works');
  const restored=r.loadState(r.serialize(s));
  assert.equal(r.robotCanReach(restored,restored.robots[0],id),true);
  restored.platforms[0].liftHeight=0;
  assert.equal(r.robotCanReach(restored,restored.robots[0],id),false,'lowering platform revokes access instantly');
 });
});

test('robot actually uses the raised physical platform: 30 stocking actions and side effects',()=>{
 run30(i=>{
  const s=r.newState();s.money=100000;
  const aisle=i%r.AISLES,bay=8+i%11,id=r.cellId(0,aisle,0,bay,3);
  const robot=r.hireRobot(s,250,true);robot.floor=0;robot.aisle=aisle;robot.homeAisle=aisle;
  robot.x=r.aisleX(aisle);robot.z=r.bayZ(bay);
  robot.phase='shelf';robot.carry=8;robot.target=id;robot.breakAt=Infinity;robot.acc=0;
  s.levels.robotLift=1;s.levels.cart=1;
  const p={id:1,floor:0,aisle,x:r.aisleX(aisle),z:r.bayZ(bay),liftHeight:9.35,mounted:false,paid:140};
  s.platforms=[p];
  let stocked=false;
  for(let t=0;t<65;t++)if(r.botStep(s,robot,.25)===id){stocked=true;break;}
  assert.equal(stocked,true,'robot must board available raised platform and stock');
  assert.equal(s.fill[id],1);
  assert.equal(robot.liftY,0,'top shelf height comes from platform, not free levitation');
  p.z+=8;
  assert.equal(r.robotCanReach(s,robot,id),false,'moving platform revokes further top shelf access');
 });
});

test('Double Jump price and removed Sprint Training: 30 economy and legacy save cases',()=>{
 const u=r.UPGRADES.find(x=>x.id==='doubleJump');
 assert.equal(u.base,30000,'Double Jump should cost $300');
 assert.equal(r.UPGRADES.some(x=>x.id==='sprintTraining'),false);
 assert.doesNotMatch(source('game.js'),/sprintTraining:\[0,1280\]/);
 run30(i=>{
  const s=r.newState();s.money=u.base-1;
  s.levels.jump=1;
  assert.equal(r.purchase(s,'doubleJump'),false);
  s.money=u.base+i;
  assert.equal(r.purchase(s,'doubleJump'),true);
  assert.equal(s.levels.doubleJump,1);
  s.levels.sprintTraining=4; // A legacy file is safe to read even after retirement.
  const restored=r.loadState(r.serialize(s));
  assert.equal(restored.levels.sprintTraining,undefined);
  assert.equal(r.purchase(restored,'sprintTraining'),false);
  assert.equal(r.playerMoveMultiplier(restored,true,false),1.4);
 });
});

test('Employee of the Month frame: 30 connected rectangular gold border checks',()=>{
 const env=source('environment.js');
 assert.match(env,/connectedPortraitGoldHorizontal/);
 assert.match(env,/connectedPortraitGoldVertical/);
 run30(i=>{
  const halfWidth=1.67,bottom=1.23,top=5.99,rail=.13;
  const vY=[bottom-rail/2,top+rail/2];
  const hY=[bottom-rail/2,bottom+rail/2,top-rail/2,top+rail/2];
  assert.ok(vY[0]<=hY[0]&&vY[1]>=hY[3]);
  assert.ok(halfWidth+rail/2>(halfWidth*2+rail)/2-.001);
  const s=r.newState();s.floor=i%r.FLOORS;
  assert.equal(r.loadState(r.serialize(s)).floor,s.floor);
 });
});

test('30 recovery starts prefer newer mirrored or recovery copy to stale primary',()=>{
 run30(i=>{
  const older=r.newState();older.fill[0]=1;
  const newer=r.newState();newer.fill[0]=2;newer.money=123000+i;newer.levels.doubleJump=1;
  const old=saves.stampSave(r.serialize(older),10000+i),recent=saves.stampSave(r.serialize(newer),20000+i);
  const selected=saves.bestStartupSave(old,recent,[],null);
  assert.equal(selected.raw,recent,'newest confirmed copy prevents rollback to old main file');
  const archived=saves.bestStartupSave(old,null,[{data:recent}],null);
  assert.equal(archived.raw,recent,'a newer confirmed recovery snapshot can restore progress');
  assert.equal(saves.bestStartupSave('corrupted',recent,[],null).raw,recent);
  assert.equal(saves.bestStartupSave(recent,old,[],null).raw,recent);
  assert.equal(saves.bestStartupSave(recent,old,[],null).origin,'main saved game');
 });
});

test('30 verified writes prevent stale tabs from overwriting new player progress',()=>{
 run30(i=>{
  const storage=memory(),key=r.SAVE_KEY,shadow=saves.MIRROR_SAVE_KEY;
  const s=r.newState();s.money=300+i;
  const first=saves.stampSave(r.serialize(s),1000+i);
  let w=saves.guardedSave(storage,key,shadow,first,null);
  assert.equal(w.ok,true);assert.equal(w.mirrorOk,true);
  assert.equal(storage.getItem(key),first);
  assert.equal(storage.getItem(shadow),first);
  s.money=500+i;const second=saves.stampSave(r.serialize(s),2000+i);
  w=saves.guardedSave(storage,key,shadow,second,first);
  assert.equal(w.ok,true);
  assert.equal(saves.guardedSave(storage,key,shadow,first,first).reason,'conflict','stale tab may not roll back progress');
  assert.equal(storage.getItem(key),second);
  assert.equal(storage.getItem(shadow),second);
  assert.equal(JSON.parse(storage.getItem(key)).money,500+i);
  assert.equal(JSON.parse(storage.getItem(key)).savedAt,2000+i);
 });
});
