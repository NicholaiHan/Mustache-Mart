// Pure, deterministic first-person collision model (world units are metres).
// Player radius is shared by player movement and automated collision regression tests.
import {AISLES,aisleX} from './rules.mjs';
export const PLAYER_RADIUS=.34;
const boxes=[
 // Front-of-store physical customer service and payroll counters.
 {name:'Mike service counter',x:1.5,z:-9,hx:2.3,hz:1.43},
 {name:'Mike concierge chassis',x:1.5,z:-7.05,hx:.53,hz:.48},
 {name:'Payroll counter',x:10,z:-3.2,hx:2.75,hz:1.2},
 {name:'Payroll back wall',x:10,z:-8.5,hx:2.85,hz:.26},
 {name:'Elevator housing',x:23,z:-11.4,hx:2.75,hz:.47},
 // Receiving desk, terminal, racking and pallets are solid.
 {name:'Receiving loading counter',x:1.5,z:96,hx:2.35,hz:1.47},
 {name:'Receiving terminal',x:3.7,z:95.8,hx:.5,hz:.4},
 {name:'Receiving warehouse rack',x:7.7,z:96.4,hx:2.35,hz:.75},
 {name:'Receiving shutter',x:17,z:100.2,hx:5.6,hz:.24}
];
for(let j=0;j<8;j++){
 boxes.push({name:'Stock pallet '+j,x:30+(j%4)*3.5,z:95+Math.floor(j/4)*3,hx:1.48,hz:1.32});
}
for(let z=6;z<98;z+=20)for(const x of [-7,101]){
 boxes.push({name:'Structural column',x,z,hx:.5,hz:.5});
}
export function getSolidObstacles(){return boxes.map(b=>({...b}));}
const overlaps=(x,z,b,r)=>Math.abs(x-b.x)<b.hx+r&&Math.abs(z-b.z)<b.hz+r;
export function isBlocked(x,z,floor=0,radius=PLAYER_RADIUS){
 if(!Number.isFinite(x)||!Number.isFinite(z)||radius<0)return true;
 // Building walls: no physical access outside the supermarket.
 if(x-radius< -9.73||x+radius>102.72||z-radius< -12.36||z+radius>100.42)return true;
 // High-bay shelving is continuous along every rack, not just at one bay center.
 if(z+radius>11.75&&z-radius<91.25){
   for(let a=0;a<AISLES;a++){
     const dx=Math.abs(x-aisleX(a));
     if(dx+radius>2.56&&dx-radius<4.25)return true;
   }
 }
 for(const b of boxes)if(overlaps(x,z,b,radius))return true;
 // Sliding entrance glass is a physical boundary before or after opening.
 // Do not let the player walk outside before the game ends.
 if(z-radius < -12.12)return true;
 return false;
}
// Axis-separated movement permits sliding along obstacles without tunneling,
// even when a fast machine produces a long frame.
export function moveWithCollisions(x,z,dx,dz,floor=0){
 const length=Math.hypot(dx,dz);
 const parts=Math.max(1,Math.ceil(length/.24));
 let px=x,pz=z;
 for(let i=0;i<parts;i++){
   const nx=px+dx/parts,nz=pz+dz/parts;
   if(!isBlocked(nx,pz,floor))px=nx;
   if(!isBlocked(px,nz,floor))pz=nz;
 }
 return {x:px,z:pz};
}
