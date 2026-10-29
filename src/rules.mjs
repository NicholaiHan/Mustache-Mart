// Pure rules for Mustache Mart. No rendering, network, or OS dependencies.
export const FLOORS=15, AISLES=10, BAYS=30, TIERS=3, SLOTS=4;
export const CELLS_PER_FLOOR=AISLES*2*BAYS*TIERS, TOTAL_CELLS=FLOORS*CELLS_PER_FLOOR, TOTAL_ITEMS=TOTAL_CELLS*SLOTS;
export const CENTS=[1,2,3], SAVE_KEY='mustacheMartV3';
export const aisleX=a=>8+a*10, bayZ=b=>13+b*2.65;
export const floorLabel=f=>'F'+String(f+1).padStart(2,'0');
export const centsText=c=>'$'+(Math.max(0,Math.floor(c))/100).toFixed(2);
export const UPGRADES=[
{id:'capacity',name:'Double Grip',detail:'Carry one more product per trip (starts at one).',base:8,factor:1.22,max:18},
{id:'speed',name:'Comfy Sneakers',detail:'Walk faster through the giant store.',base:12,factor:1.36,max:16},
{id:'jump',name:'Spring-Loaded Shoes',detail:'Unlock Space to jump to top shelves.',base:32,factor:1,max:1},
{id:'ladder',name:'Portable Step Ladder',detail:'Deploy with L to reach the highest shelf.',base:45,factor:1,max:1},
{id:'cart',name:'Self-Driving Ladder Cart',detail:'Convert ladder into a slow automatic stocking cart.',base:140,factor:1,max:1},
{id:'cartSpeed',name:'Cart Motor',detail:'Increase mobile cart stocking speed.',base:110,factor:1.65,max:10},
{id:'robot',name:'Mustache Stocker Bot',detail:'Hire a robot to fetch supplies and stock shelves.',base:250,factor:1.38,max:70},
{id:'robotSpeed',name:'Robot Espresso',detail:'Faster robot movement and stocking.',base:160,factor:1.52,max:12},
{id:'autoPay',name:'Automatic Payroll Terminal',detail:'Deposit wages instantly without visiting the desk.',base:420,factor:1,max:1}
];
export function cellId(f,a,side,bay,tier){return ((((f*AISLES+a)*2+side)*BAYS+bay)*TIERS+tier);}
export function decode(id){const tier=id%TIERS;id=Math.floor(id/TIERS);const bay=id%BAYS;id=Math.floor(id/BAYS);const side=id%2;id=Math.floor(id/2);return {floor:Math.floor(id/AISLES),aisle:id%AISLES,side,bay,tier};}
const limit=(v,max)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
export function newState(){return {version:3,money:0,pending:0,floor:0,stocked:0,fill:new Uint8Array(TOTAL_CELLS),levels:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),belts:Array.from({length:FLOORS},()=>Array(AISLES).fill(0)),robots:[],cart:{floor:0,aisle:0,z:13,acc:0},cursor:Array(FLOORS).fill(0)};}
export function loadState(text){
 const s=newState();if(!text)return s;
 try{
 const d=JSON.parse(text);if(d.version!==3)return s;
 if(Array.isArray(d.fill))d.fill.slice(0,TOTAL_CELLS).forEach((v,i)=>s.fill[i]=limit(v,SLOTS));
 s.stocked=s.fill.reduce((a,b)=>a+b,0);s.money=limit(d.money,1000000000);s.pending=limit(d.pending,1000000000);s.floor=limit(d.floor,FLOORS-1);
 for(const u of UPGRADES)s.levels[u.id]=limit(d.levels?.[u.id],u.max);
 if(Array.isArray(d.belts))for(let f=0;f<FLOORS;f++)for(let a=0;a<AISLES;a++)s.belts[f][a]=limit(d.belts[f]?.[a],BAYS);
 if(Array.isArray(d.cursor))d.cursor.slice(0,FLOORS).forEach((v,i)=>s.cursor[i]=limit(v,CELLS_PER_FLOOR-1));
 if(Array.isArray(d.robots))s.robots=d.robots.slice(0,s.levels.robot).map((r,i)=>({id:i,floor:limit(r.floor,FLOORS-1),x:Number.isFinite(r.x)?r.x:2,z:Number.isFinite(r.z)?r.z:7,phase:['supply','shelf'].includes(r.phase)?r.phase:'supply',target:Number.isInteger(r.target)&&r.target>=0&&r.target<TOTAL_CELLS?r.target:-1,carry:limit(r.carry,8),acc:0}));
 while(s.robots.length<s.levels.robot)hireRobot(s);
 const c=d.cart||{};s.cart={floor:limit(c.floor,FLOORS-1),aisle:limit(c.aisle,AISLES-1),z:Math.max(11,Math.min(94,Number(c.z)||13)),acc:0};
 }catch(_){return newState();}
 return s;
}
export function serialize(s){return JSON.stringify({version:3,money:s.money,pending:s.pending,floor:s.floor,fill:Array.from(s.fill),levels:s.levels,belts:s.belts,robots:s.robots,cart:s.cart,cursor:s.cursor});}
export const capacity=s=>1+s.levels.capacity,walkSpeed=s=>3.3+s.levels.speed*.45;
export const price=(u,l)=>Math.ceil(u.base*u.factor**l);
export function purchase(s,id){
 const u=UPGRADES.find(x=>x.id===id);if(!u)return false;
 const level=s.levels[id],cost=price(u,level);if(level>=u.max||s.money<cost)return false;
 if(id==='cart'&&!s.levels.ladder)return false;
 s.money-=cost;s.levels[id]++;if(id==='robot')hireRobot(s);return true;
}
export function payOut(s){const p=s.pending;s.pending=0;s.money+=p;return p;}
export function place(s,id,automatic=false){
 if(!Number.isInteger(id)||id<0||id>=TOTAL_CELLS||s.fill[id]>=SLOTS)return 0;
 s.fill[id]++;s.stocked++;const c=CENTS[id%TIERS];if(automatic||s.levels.autoPay)s.money+=c;else s.pending+=c;return c;
}
export function beltCost(s,f,a){return s.belts[f][a]>=BAYS?Infinity:12+Math.floor(s.belts[f][a]*1.3);}
export function buildBelt(s,f,a,segment){
 if(f<0||f>=FLOORS||a<0||a>=AISLES||segment!==s.belts[f][a]||segment>=BAYS)return false;
 const cost=beltCost(s,f,a);if(s.money<cost)return false;
 s.money-=cost;s.belts[f][a]++;return true;
}
export function incomplete(s,f,start=0){
 if(f<0||f>=FLOORS)return -1;
 for(let d=0;d<CELLS_PER_FLOOR;d++){const local=(start+d)%CELLS_PER_FLOOR,id=f*CELLS_PER_FLOOR+local;if(s.fill[id]<SLOTS)return id;}
 return -1;
}
export function nextRobotFloor(s){for(let f=0;f<FLOORS;f++)if(incomplete(s,f,s.cursor[f])>=0)return f;return -1;}
export function hireRobot(s){const f=nextRobotFloor(s);if(f>=0)s.robots.push({id:s.robots.length,floor:f,x:2,z:7,phase:'supply',target:-1,carry:0,acc:0});}
export const remaining=s=>TOTAL_ITEMS-s.stocked;
export function floorStocked(s,f){let sum=0,base=f*CELLS_PER_FLOOR;for(let i=0;i<CELLS_PER_FLOOR;i++)sum+=s.fill[base+i];return sum;}
export const itemsPerFloor=CELLS_PER_FLOOR*SLOTS;
function approach(r,x,z,dt,speed){
 let gx=x,gz=z;if(Math.abs(r.x-x)>2&&r.z>10){gx=r.x;gz=7;}else if(Math.abs(r.x-x)>2)gz=7;
 const dx=gx-r.x,dz=gz-r.z,dist=Math.hypot(dx,dz);if(dist<.3)return true;
 const n=Math.min(dist,dt*speed);r.x+=dx/dist*n;r.z+=dz/dist*n;return false;
}
export function botStep(s,r,dt){
 if(incomplete(s,r.floor,s.cursor[r.floor])<0){const f=nextRobotFloor(s);if(f<0)return -1;r.floor=f;r.x=2;r.z=7;r.phase='supply';r.target=-1;r.carry=0;}
 if(r.phase==='supply'){
  r.target=incomplete(s,r.floor,s.cursor[r.floor]);if(r.target<0)return -1;
  const {aisle,bay}=decode(r.target),length=s.belts[r.floor][aisle];
  const x=length?aisleX(aisle)+1.3:2,z=length?bayZ(Math.min(length-1,bay)):7;
  if(approach(r,x,z,dt,3.8+s.levels.robotSpeed*.35)){r.carry=8;r.phase='shelf';}
  return -1;
 }
 if(r.target<0||s.fill[r.target]>=SLOTS){r.target=incomplete(s,r.floor,s.cursor[r.floor]);if(r.target<0){r.phase='supply';return -1;}}
 const {aisle,bay}=decode(r.target);
 if(approach(r,aisleX(aisle),bayZ(bay),dt,3.4+s.levels.robotSpeed*.35)){
  r.acc+=dt*(.7+s.levels.robotSpeed*.16);
  if(r.acc>=1){r.acc-=1;if(place(s,r.target,true)){r.carry--;s.cursor[r.floor]=(r.target-r.floor*CELLS_PER_FLOOR+1)%CELLS_PER_FLOOR;if(r.carry<=0)r.phase='supply';return r.target;}}
 }
 return -1;
}
