// Solid robot-to-robot navigation in logical game coordinates.
// No renderer or storage dependency: existing saves retain the same schema.
export const ROBOT_RADIUS=.44;
export const ROBOT_CLEARANCE=ROBOT_RADIUS*2+.045;
// 10 inches of AIR between the .925m-wide robots, not centers 10 inches apart.
export const ROBOT_ENTRY_CLEARANCE=ROBOT_CLEARANCE+.254;
const MIN_X=-8.8,MAX_X=101.9,MIN_Z=9.15,MAX_Z=99.2;
const AISLE_START=8,AISLE_STEP=10;
const aisleBand=x=>Math.round((x-AISLE_START)/AISLE_STEP);

// Rear of the racks is a free crosswalk. In the rack area, keep bots inside
// their own aisle, not in the solid shelves that run along either side.
export function robotWalkable(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||x<MIN_X||x>MAX_X||z<MIN_Z||z>MAX_Z)return false;
 if(z>91.7||z<11.0)return true;
 const near=aisleBand(x),center=AISLE_START+near*AISLE_STEP;
 return near>=0&&near<10&&Math.abs(x-center)<2.05;
}
export function robotBlocker(s,bot,x,z,radius=ROBOT_CLEARANCE){
 for(const other of s.robots){
  if(other===bot||!other.placed||other.floor!==bot.floor)continue;
  if(Math.hypot(x-other.x,z-other.z)<radius-1e-5)return other;
 }
 return null;
}
export function robotPathClear(s,bot,x,z){
 if(!robotWalkable(x,z))return false;
 const fromX=bot.x,fromZ=bot.z,dx=x-fromX,dz=z-fromZ,travel=dx*dx+dz*dz;
 for(const other of s.robots){
  if(other===bot||!other.placed||other.floor!==bot.floor)continue;
  const t=travel>1e-9?Math.max(0,Math.min(1,((other.x-fromX)*dx+(other.z-fromZ)*dz)/travel)):0;
  // Sweep the complete path, not just its endpoint; two workers cannot
  // tunnel through each other even with high speed and large frame dt.
  if(Math.hypot(fromX+dx*t-other.x,fromZ+dz*t-other.z)<ROBOT_CLEARANCE-1e-5)return false;
 }
 return true;
}
// Recover a pre-existing old-save pileup once; normal movement thereafter
// is strictly solid. Search unoccupied positions near the old stacked spot.
export function rescueStackedRobot(s,bot){
 if(!robotBlocker(s,bot,bot.x,bot.z))return false;
 const bx=bot.x,bz=bot.z;
 for(let ring=1;ring<=17;ring++){
  const radius=ring*.55;
  for(let n=0;n<24;n++){
   const phase=(n+(bot.id%7)*3)%24,angle=phase*Math.PI/12;
   const x=bx+Math.cos(angle)*radius,z=bz+Math.sin(angle)*radius;
   if(robotWalkable(x,z)&&!robotBlocker(s,bot,x,z)){
    bot.x=x;bot.z=z;return true;
   }
  }
 }
 return false;
}

// Repair frozen robot clusters before their very first rendered game frame.
// Legacy browser saves can contain dozens of identical robot coordinates;
// a normal physics step cannot disperse the entire pile without a visibly
// frozen initial state. Reserve collision-free three-lane bays per aisle.
export function normalizeRobotSpawns(s,floor=null){
 let fixed=0;
 const floors=floor===null?[...new Set(s.robots.map(b=>b.floor))]:[floor];
 for(const f of floors){
  const bots=s.robots.filter(b=>b.placed&&b.floor===f)
   .sort((a,b)=>a.id-b.id);
  const occupied=[];
  for(const bot of bots){
   const currentFree=robotWalkable(bot.x,bot.z)&&occupied.every(p=>
    Math.hypot(p.x-bot.x,p.z-bot.z)>=ROBOT_ENTRY_CLEARANCE-1e-6);
   if(currentFree){occupied.push({x:bot.x,z:bot.z});continue;}
   const center=AISLE_START+Math.max(0,Math.min(9,bot.aisle??0))*AISLE_STEP;
   const originZ=Math.min(89.5,Math.max(13,Number.isFinite(bot.z)?bot.z:76));
   const sites=[];
   // Prefer a nearby position rather than relocating the robot far away.
   for(let bay=0;bay<73;bay++){
    const z=13+bay*1.28;
    for(const offset of [0,-1.28,1.28]){
     const x=center+offset;
     if(robotWalkable(x,z))sites.push({x,z,distance:Math.hypot(x-bot.x,z-originZ)});
    }
   }
   sites.sort((a,b)=>a.distance-b.distance);
   const spot=sites.find(p=>occupied.every(other=>Math.hypot(other.x-p.x,other.z-p.z)>=ROBOT_ENTRY_CLEARANCE-1e-6));
   if(spot){bot.x=spot.x;bot.z=spot.z;fixed++;}
   // If a floor is fully saturated, keep it valid and let the next tick
   // resolve it; no item counts, money or robot jobs are reset.
   occupied.push({x:bot.x,z:bot.z});
  }
 }
 return fixed;
}
function moveAngle(s,bot,step,angle){
 const x=bot.x+Math.cos(angle)*step,z=bot.z+Math.sin(angle)*step;
 if(!robotPathClear(s,bot,x,z))return false;
 bot.x=x;bot.z=z;return true;
}
// Every active robot is a solid disk. Forward motion is preferred, but a
// waiting worker can steer into a free side lane instead of permanently
// freezing at a shared stock pile or source counter.
export function walkRobotAround(s,bot,gx,gz,dt,speed){
 rescueStackedRobot(s,bot);
 const dx=gx-bot.x,dz=gz-bot.z,dist=Math.hypot(dx,dz);
 if(dist<1e-5)return false;
 const step=Math.min(dist,Math.max(0,dt)*speed);
 if(step<=0)return false;
 const heading=Math.atan2(dz,dx);
 if(moveAngle(s,bot,step,heading))return true;
 const turn=bot.id%2===0?1:-1;
 for(const a of [.44,.90,1.42,1.9,2.25]){
  if(moveAngle(s,bot,step,heading+turn*a))return true;
  if(moveAngle(s,bot,step,heading-turn*a))return true;
 }
 // A fully blocked bot waits for a physical gap instead of passing through.
 return false;
}
