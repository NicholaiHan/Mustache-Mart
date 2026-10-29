// Pure rules for Mustache Mart. No rendering, network, or OS dependencies.
export const FLOORS=15, AISLES=10, BAYS=30, TIERS=4, SLOTS=4;
export const CELLS_PER_FLOOR=AISLES*2*BAYS*TIERS, TOTAL_CELLS=FLOORS*CELLS_PER_FLOOR, TOTAL_ITEMS=TOTAL_CELLS*SLOTS;
export const CENTS=[1,1,2,3], SAVE_KEY='mustacheMartV4';
export const aisleX=a=>8+a*10, bayZ=b=>13+b*2.65;
export const DOCK={x:1.5,z:96};
export const floorLabel=f=>'F'+String(f+1).padStart(2,'0');
export const centsText=c=>'$'+(Math.max(0,Math.floor(c))/100).toFixed(2);
export const UPGRADES=[
{id:'capacity',name:'Double Grip',detail:'Carry one more product per trip (starts at one).',base:8,factor:1.22,max:18},
{id:'speed',name:'Comfy Sneakers',detail:'Walk faster through the giant store.',base:12,factor:1.36,max:16},
{id:'jump',name:'Spring-Loaded Shoes',detail:'Unlock Space to reach the second, 1-cent rack.',base:32,factor:1,max:1},
{id:'ladder',name:'Portable Step Ladder',detail:'Deploy with L to reach 2-cent high racks.',base:45,factor:1,max:1},
{id:'ladderPlus',name:'Telescopic Ladder Extension',detail:'Climb higher to reach the top 3-cent shelf; also extends placed ladders.',base:175,factor:1,max:1},
{id:'ladderUnit',name:'Additional Portable Ladder',detail:'One more climbable ladder to install on any aisle; sell back for half its cost.',base:65,factor:1.2,max:24},
{id:'cart',name:'Self-Driving Ladder Cart',detail:'Convert ladder into a slow automatic stocking cart.',base:140,factor:1,max:1},
{id:'cartSpeed',name:'Cart Motor',detail:'Increase mobile cart stocking speed.',base:110,factor:1.65,max:10},
{id:'robot',name:'Mustache Stocker Bot',detail:'Buy a separate robot, then walk it to an aisle and left-click to deploy. Sell any robot for half.',base:250,factor:1.38,max:70},
{id:'robotLift',name:'Motorized Robot Ladder',detail:'All robot stockers gain a portable powered lift to climb high shelves while moving.',base:850,factor:1,max:1},
{id:'robotSpeed',name:'Robot Espresso',detail:'Faster robot movement and stocking.',base:160,factor:1.52,max:12},
{id:'autoPay',name:'Automatic Payroll Terminal',detail:'Deposit wages instantly without visiting the desk.',base:420,factor:1,max:1},
{id:'soupTriple',name:'Canned Goods Supercontract',detail:'ALL canned goods pay 3× their normal cents. A $50 investment.',base:5000,factor:1,max:1,category:'economy'},
{id:'waterDouble',name:'Bottled Water Partnership',detail:'Water products pay twice their normal cents.',base:2500,factor:1,max:1,category:'economy'},
{id:'shelfBonus',name:'High-Shelf Premium',detail:'Add 1¢ per level to 2¢ and 3¢ height-band products.',base:900,factor:1.9,max:5,category:'economy'},
{id:'robotBonus',name:'Automation Profit Share',detail:'Robots and the cart earn 25% more cents per level.',base:3500,factor:2.0,max:5,category:'economy'}
];
export function cellId(f,a,side,bay,tier){return ((((f*AISLES+a)*2+side)*BAYS+bay)*TIERS+tier);}
export function decode(id){const tier=id%TIERS;id=Math.floor(id/TIERS);const bay=id%BAYS;id=Math.floor(id/BAYS);const side=id%2;id=Math.floor(id/2);return {floor:Math.floor(id/AISLES),aisle:id%AISLES,side,bay,tier};}
const limit=(v,max)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
export function newState(){return {version:4,money:0,pending:0,floor:0,stocked:0,fill:new Uint8Array(TOTAL_CELLS),levels:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),belts:Array.from({length:FLOORS},()=>Array(AISLES).fill(0)),beltReceipts:Array.from({length:FLOORS},()=>Array.from({length:AISLES},()=>[])),beltStock:Array.from({length:FLOORS},()=>Array(AISLES).fill(0)),beltTimers:Array.from({length:FLOORS},()=>Array(AISLES).fill(0)),ladderInventory:[],ladders:[],ladderNextId:1,robots:[],robotNextId:1,cart:{floor:0,aisle:0,z:13,acc:0},cursor:Array(FLOORS).fill(0)};}
export function loadState(text){
 const s=newState();if(!text)return s;
 try{
 const d=JSON.parse(text);if(d.version!==4&&d.version!==3)return s;
 const old=d.version===3;
 if(Array.isArray(d.fill))d.fill.slice(0,old?FLOORS*AISLES*2*BAYS*3:TOTAL_CELLS).forEach((v,i)=>{
  // Existing 15-floor save files keep their products when the 4th shelf band is added.
  const index=old?Math.floor(i/3)*TIERS+i%3:i;
  s.fill[index]=limit(v,SLOTS);
 });
 s.stocked=s.fill.reduce((a,b)=>a+b,0);s.money=limit(d.money,1000000000);s.pending=limit(d.pending,1000000000);s.floor=limit(d.floor,FLOORS-1);
 for(const u of UPGRADES)s.levels[u.id]=limit(d.levels?.[u.id],u.max);
 if(Array.isArray(d.belts))for(let f=0;f<FLOORS;f++)for(let a=0;a<AISLES;a++)s.belts[f][a]=limit(d.belts[f]?.[a],BAYS);
 if(Array.isArray(d.cursor))d.cursor.slice(0,FLOORS).forEach((v,i)=>s.cursor[i]=limit(v,CELLS_PER_FLOOR-1));
 for(let f=0;f<FLOORS;f++)for(let a=0;a<AISLES;a++){
  for(let i=0;i<s.belts[f][a];i++)s.beltReceipts[f][a].push(limit(d.beltReceipts?.[f]?.[a]?.[i]??(12+Math.floor(i*1.3)),100000));
  s.beltStock[f][a]=limit(d.beltStock?.[f]?.[a],16);
  const t=Number(d.beltTimers?.[f]?.[a]);s.beltTimers[f][a]=Number.isFinite(t)?Math.max(0,Math.min(30,t)):0;
 }
 if(Array.isArray(d.ladders))s.ladders=d.ladders.slice(0,50).map((l,i)=>({id:limit(l.id,1000000)||i+1,floor:limit(l.floor,FLOORS-1),aisle:limit(l.aisle,AISLES-1),bay:limit(l.bay,BAYS-1),x:aisleX(limit(l.aisle,AISLES-1)),z:bayZ(limit(l.bay,BAYS-1)),paid:limit(l.paid,100000),kind:l.kind==='ladderUnit'?'ladderUnit':'ladder'}));
 s.ladderNextId=Math.max(limit(d.ladderNextId,1000000)||1,...s.ladders.map(l=>l.id+1));
 s.ladderInventory=Array.isArray(d.ladderInventory)?d.ladderInventory.filter(i=>['ladder','ladderUnit'].includes(i.kind)).slice(0,40).map(i=>({kind:i.kind,paid:limit(i.paid,100000)})):[];
 if(!Array.isArray(d.ladderInventory)&&!Array.isArray(d.ladders)){
  if(s.levels.ladder)s.ladderInventory.push({kind:'ladder',paid:45});
  for(let i=0;i<s.levels.ladderUnit;i++)s.ladderInventory.push({kind:'ladderUnit',paid:price(UPGRADES.find(u=>u.id==='ladderUnit'),i)});
 }
 if(Array.isArray(d.robots))s.robots=d.robots.slice(0,70).map((r,i)=>({
 id:limit(r.id,1000000)||i+1,floor:limit(r.floor,FLOORS-1),
 aisle:limit(r.aisle??Math.round(((Number(r.x)||8)-8)/10),AISLES-1),
 x:old?DOCK.x:(Number.isFinite(r.x)?r.x:DOCK.x),
 z:old||(r.phase==='supply'&&Math.abs(Number(r.x)-DOCK.x)<3&&Number(r.z)>93&&Number(r.z)<98)?REAR_CROSSWALK:(Number.isFinite(r.z)?r.z:REAR_CROSSWALK),
 placed:r.placed!==false,paid:limit(r.paid??price(UPGRADES.find(u=>u.id==='robot'),i),100000),
 phase:!old&&['supply','shelf'].includes(r.phase)?r.phase:'supply',
 target:!old&&Number.isInteger(r.target)&&r.target>=0&&r.target<TOTAL_CELLS?r.target:-1,
 carry:limit(r.carry,8),acc:0,liftY:0,source:null
 }));
 s.robotNextId=Math.max(limit(d.robotNextId,1000000)||1,...s.robots.map(r=>r.id+1));
 while(s.robots.length<s.levels.robot)hireRobot(s,250,true);
 s.levels.robot=s.robots.length;
 const c=d.cart||{};s.cart={floor:limit(c.floor,FLOORS-1),aisle:limit(c.aisle,AISLES-1),z:Math.max(11,Math.min(94,Number(c.z)||13)),acc:0};
 }catch(_){return newState();}
 return s;
}
export function serialize(s){return JSON.stringify({version:4,money:s.money,pending:s.pending,floor:s.floor,fill:Array.from(s.fill),levels:s.levels,belts:s.belts,beltReceipts:s.beltReceipts,beltStock:s.beltStock,beltTimers:s.beltTimers,ladderInventory:s.ladderInventory,ladders:s.ladders,ladderNextId:s.ladderNextId,robots:s.robots,robotNextId:s.robotNextId,cart:s.cart,cursor:s.cursor});}
export const capacity=s=>1+s.levels.capacity,walkSpeed=s=>3.3+s.levels.speed*.45;
export const price=(u,l)=>Math.ceil(u.base*u.factor**l);
export function purchase(s,id){
 const u=UPGRADES.find(x=>x.id===id);if(!u)return false;
 const level=s.levels[id],cost=price(u,level);if(level>=u.max||s.money<cost)return false;
 if(id==='cart'&&!s.levels.ladder&&!s.levels.ladderUnit)return false;
 if(id==='ladderPlus'&&!s.levels.ladder&&!s.levels.ladderUnit)return false;
 s.money-=cost;s.levels[id]++;if(id==='robot')hireRobot(s,cost,false);if(id==='ladder'||id==='ladderUnit')s.ladderInventory.push({kind:id,paid:cost});return true;
}
export function payOut(s){const p=s.pending;s.pending=0;s.money+=p;return p;}
export function earnings(s,id,automatic=false){
 const {aisle,tier}=decode(id);
 let amount=CENTS[tier]+(tier>=2?s.levels.shelfBonus:0);
 if(aisle%5===0&&s.levels.soupTriple)amount*=3;
 if(aisle%5===1&&s.levels.waterDouble)amount*=2;
 if(automatic&&s.levels.robotBonus)amount=Math.ceil(amount*(1+.25*s.levels.robotBonus));
 return amount;
}
export function place(s,id,automatic=false){
 if(!Number.isInteger(id)||id<0||id>=TOTAL_CELLS||s.fill[id]>=SLOTS)return 0;
 s.fill[id]++;s.stocked++;const c=earnings(s,id,automatic);if(automatic||s.levels.autoPay)s.money+=c;else s.pending+=c;return c;
}
export function beltCost(s,f,a){return s.belts[f][a]>=BAYS?Infinity:12+Math.floor(s.belts[f][a]*1.3);}
export function buildBelt(s,f,a,segment){
 if(f<0||f>=FLOORS||a<0||a>=AISLES||segment!==s.belts[f][a]||segment>=BAYS)return false;
 const cost=beltCost(s,f,a);if(s.money<cost)return false;
 s.money-=cost;s.belts[f][a]++;s.beltReceipts[f][a].push(cost);return true;
}
export function incomplete(s,f,start=0){
 if(f<0||f>=FLOORS)return -1;
 for(let d=0;d<CELLS_PER_FLOOR;d++){const local=(start+d)%CELLS_PER_FLOOR,id=f*CELLS_PER_FLOOR+local;if(s.fill[id]<SLOTS)return id;}
 return -1;
}
export function nextRobotFloor(s){for(let f=0;f<FLOORS;f++)if(incomplete(s,f,s.cursor[f])>=0)return f;return -1;}
export function hireRobot(s,paid=250,placed=false){
 const f=nextRobotFloor(s);if(f<0)return null;
 const r={id:s.robotNextId++,floor:f,aisle:0,x:DOCK.x,z:REAR_CROSSWALK,placed,paid,phase:'supply',target:-1,carry:0,acc:0,liftY:0,source:null};
 s.robots.push(r);return r;
}
export function assignRobot(s,id,f,a,bay){
 const r=s.robots.find(x=>x.id===id);
 if(!r||!Number.isInteger(a)||a<0||a>=AISLES||!Number.isInteger(bay)||bay<0||bay>=BAYS||f<0||f>=FLOORS)return false;
 r.floor=f;r.aisle=a;r.x=aisleX(a);r.z=bayZ(bay);r.placed=true;r.phase='supply';r.target=-1;r.carry=0;r.acc=0;r.liftY=0;r.source=null;
 return true;
}
export function sellRobot(s,id){
 const index=s.robots.findIndex(r=>r.id===id);if(index<0)return 0;
 const [r]=s.robots.splice(index,1);const refund=Math.floor(r.paid/2);
 s.money+=refund;s.levels.robot=s.robots.length;return refund;
}
export function deployLadder(s,f,a,bay){
 if(!s.ladderInventory.length||f<0||f>=FLOORS||a<0||a>=AISLES||bay<0||bay>=BAYS)return null;
 if(s.ladders.some(l=>l.floor===f&&l.aisle===a&&Math.abs(l.bay-bay)<=1))return null;
 const owned=s.ladderInventory.shift();
 const l={id:s.ladderNextId++,floor:f,aisle:a,bay,x:aisleX(a),z:bayZ(bay),kind:owned.kind,paid:owned.paid};
 s.ladders.push(l);return l;
}
export function sellLadder(s,id){
 const i=s.ladders.findIndex(l=>l.id===id);if(i<0)return 0;
 const [l]=s.ladders.splice(i,1);const refund=Math.floor(l.paid/2);
 s.money+=refund;s.levels[l.kind]=Math.max(0,s.levels[l.kind]-1);return refund;
}
export function sellBelt(s,f,a,segment){
 if(!Number.isInteger(segment)||segment!==s.belts[f]?.[a]-1)return 0;
 s.belts[f][a]--;const cost=s.beltReceipts[f][a].pop()||12;
 if(s.belts[f][a]===0){s.beltStock[f][a]=0;s.beltTimers[f][a]=0;}
 const refund=Math.floor(cost/2);s.money+=refund;return refund;
}
export function advanceBelts(s,dt){
 // Every connected segment moves stock from receiving toward the exposed end.
 // Packages become available only after transit and can be taken by humans or bots.
 for(let f=0;f<FLOORS;f++)for(let a=0;a<AISLES;a++){
  const n=s.belts[f][a];if(!n||s.beltStock[f][a]>=16)continue;
  s.beltTimers[f][a]+=dt;
  const travel=.85+n*.32;
  while(s.beltTimers[f][a]>=travel&&s.beltStock[f][a]<16){s.beltTimers[f][a]-=travel;s.beltStock[f][a]++;}
 }
}
export function takeBelt(s,f,a){
 if(!s.belts[f]?.[a]||!s.beltStock[f][a])return false;
 s.beltStock[f][a]--;return true;
}
export const remaining=s=>TOTAL_ITEMS-s.stocked;
export const canOpenStore=s=>s.stocked===TOTAL_ITEMS&&remaining(s)===0;
export function floorStocked(s,f){let sum=0,base=f*CELLS_PER_FLOOR;for(let i=0;i<CELLS_PER_FLOOR;i++)sum+=s.fill[base+i];return sum;}
export const itemsPerFloor=CELLS_PER_FLOOR*SLOTS;
// Robot lane routing. Transitions between aisles happen only in the open
// rear crosswalk, away from high-bay shelves and rear warehouse pallets.
export const REAR_CROSSWALK=92.35;
function approach(r,x,z,dt,speed){
 let gx=x,gz=z;
 const crossing=Math.abs(r.x-x)>2.2;
 if(crossing&&r.z<REAR_CROSSWALK-.35){
  gx=r.x;gz=REAR_CROSSWALK; // move along current aisle first
 }else if(crossing){
  gx=x;gz=REAR_CROSSWALK; // cross only behind the racks
 }
 const dx=gx-r.x,dz=gz-r.z,dist=Math.hypot(dx,dz);
 if(dist>=.27){
  const n=Math.min(dist,dt*speed);
  r.x+=dx/dist*n;r.z+=dz/dist*n;
 }
 // Do not report success at an intermediate crosswalk waypoint.
 return Math.hypot(x-r.x,z-r.z)<.31;
}
export function robotCanReach(s,r,id){
 const {floor,aisle,bay,tier}=decode(id);
 if(tier<2)return true;
 if(s.levels.robotLift)return true;
 return s.ladders.some(l=>l.floor===floor&&l.aisle===aisle&&Math.abs(l.bay-bay)<=1&&(tier<=2||s.levels.ladderPlus));
}
export function robotTarget(s,r){
 // Assign the closest *reachable* empty slot on the requested aisle.
 // If it is completely filled, rotate to the nearest aisle with work.
 let choice=-1,best=Infinity,preferred=r.aisle??0;
 for(let radius=0;radius<AISLES;radius++){
  for(const a of [...new Set([preferred-radius,preferred+radius])]){
   if(a<0||a>=AISLES)continue;
   for(let bay=0;bay<BAYS;bay++)for(let side=0;side<2;side++)for(let tier=0;tier<TIERS;tier++){
    const id=cellId(r.floor,a,side,bay,tier);
    if(s.fill[id]>=SLOTS||!robotCanReach(s,r,id))continue;
    const distance=Math.abs(r.x-aisleX(a))*1.8+Math.abs(r.z-bayZ(bay))+tier*.12;
    if(distance<best){best=distance;choice=id;}
   }
  }
  if(choice>=0)break;
 }
 return choice;
}
export function robotSource(s,r){
 const candidates=[{type:'dock',x:DOCK.x,z:REAR_CROSSWALK,aisle:-1}];
 for(let a=0;a<AISLES;a++){
  const n=s.belts[r.floor][a];
  if(n&&s.beltStock[r.floor][a]>0)
   candidates.push({type:'belt',x:aisleX(a)+1.4,z:bayZ(BAYS-n),aisle:a});
 }
 candidates.sort((u,v)=>{
  const metric=p=>Math.abs(p.x-r.x)*1.3+Math.abs(p.z-r.z);
  return metric(u)-metric(v);
 });
 return candidates[0];
}
export function botStep(s,r,dt){
 if(!r.placed||dt<=0)return -1;
 if(r.phase==='supply')r.liftY=Math.max(0,(r.liftY||0)-dt*5);
 if(incomplete(s,r.floor,0)<0){
  const f=nextRobotFloor(s);if(f<0)return -1;
  r.floor=f;r.x=aisleX(r.aisle??0);r.z=REAR_CROSSWALK;
  r.phase='supply';r.target=-1;r.carry=0;r.source=null;
 }
 const speed=3.4+s.levels.robotSpeed*.38;
 if(r.phase==='supply'){
  // A new source is chosen on every supply run (belt vs dock).
  const source=robotSource(s,r);r.source=source;
  if(approach(r,source.x,source.z,dt,speed)){
    if(source.type==='belt'&&!takeBelt(s,r.floor,source.aisle))return -1;
    r.carry=source.type==='belt'?1:8;r.phase='shelf';r.target=-1;r.source=null;
  }
  return -1;
 }
 if(r.target<0||s.fill[r.target]>=SLOTS||!robotCanReach(s,r,r.target)){
   r.target=robotTarget(s,r);
   if(r.target<0){r.phase='supply';r.carry=0;return -1;}
 }
 const {aisle,bay,tier}=decode(r.target);
 if(approach(r,aisleX(aisle),bayZ(bay),dt,speed)){
  // Vertical movement is animated, not a magic instantaneous upper-shelf placement.
  const desired=tier<2?0:tier===2?5.0:9.4;
  r.liftY=Math.min(desired,(r.liftY||0)+dt*4.5);
  if(r.liftY+0.1<desired)return -1;
  r.acc+=dt*(.7+s.levels.robotSpeed*.16);
  if(r.acc>=1){
   r.acc-=1;
   if(place(s,r.target,true)){
     const done=r.target;r.carry--;
     s.cursor[r.floor]=(done-r.floor*CELLS_PER_FLOOR+1)%CELLS_PER_FLOOR;
     r.target=-1;if(r.carry<=0)r.phase='supply';
     return done;
   }
  }
 }else r.liftY=Math.max(0,(r.liftY||0)-dt*5);
 return -1;
}

// Cart stocking obeys the same 4-band economics as player and robot stocking.
export function cartStep(s,dt){
 if(!s.levels.cart||remaining(s)<=0)return -1;
 const c=s.cart;
 c.z+=dt*(.28+s.levels.cartSpeed*.14);
 if(c.z>bayZ(BAYS-1)+1.4){
  c.z=bayZ(0);c.aisle=(c.aisle+1)%AISLES;
  if(c.aisle===0)c.floor=(c.floor+1)%FLOORS;
 }
 c.acc+=dt*(.15+s.levels.cartSpeed*.09);
 if(c.acc>=1){
  c.acc-=1;
  const bay=Math.max(0,Math.min(BAYS-1,Math.round((c.z-13)/2.65)));
  for(const tier of [3,2,1,0])for(const side of [0,1]){
   const id=cellId(c.floor,c.aisle,side,bay,tier);
   if(s.fill[id]<SLOTS&&place(s,id,true))return id;
  }
 }
 return -1;
}
