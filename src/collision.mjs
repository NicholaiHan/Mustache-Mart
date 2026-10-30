// Pure, deterministic first-person collision model (world units are metres).
// Player radius is shared by player movement and automated collision regression tests.
import {AISLES,BAYS,aisleX,bayZ} from './rules.mjs';
export const PLAYER_RADIUS=.34;
// One shared layout contract for the payroll window, its physical solid,
// the renderer, and the E interaction. Back faces deliberately intersect the
// front interior wall at z=-12.45: there is NO empty space behind the station.
export const PAYROLL_LAYOUT=Object.freeze({
 x:10,
 wallInnerZ:-12.45,
 fasciaZ:-12.30,
 fasciaDepth:.35,
 counterZ:-11.48,
 counterDepth:2.12,
 counterWidth:5.1,
 glassZ:-12.10,
 signZ:-11.93,
 customerZ:-8.38,
 interactionRadius:3.4
});
const boxes=[
 // Front-of-store physical customer service and payroll counters.
 {name:'Mike service counter',x:1.5,z:-8.65,hx:2.37,hz:1.07},
 {name:'Mike concierge chassis',x:1.5,z:-10.48,hx:.53,hz:.51},
 {name:'Payroll counter',x:PAYROLL_LAYOUT.x,z:PAYROLL_LAYOUT.counterZ,hx:2.75,hz:PAYROLL_LAYOUT.counterDepth/2},
 {name:'Payroll wall-mounted facade',x:PAYROLL_LAYOUT.x,z:PAYROLL_LAYOUT.fasciaZ,hx:2.85,hz:PAYROLL_LAYOUT.fasciaDepth/2},
 {name:'Elevator housing',x:23,z:-11.4,hx:2.75,hz:.47},
 // Receiving desk, terminal, racking and pallets are solid.
 {name:'Receiving loading counter',x:1.5,z:96,hx:2.35,hz:1.47},
 {name:'Receiving terminal',x:3.7,z:95.8,hx:.5,hz:.4},
 {name:'Receiving warehouse rack',x:7.7,z:96.4,hx:2.35,hz:.75},
 {name:'Receiving shutter',x:17,z:100.2,hx:5.6,hz:.24},
 {name:'Receiving storage stand',x:10.7,z:96.4,hx:.25,hz:.27}
];
// Real cashier lanes: grounded POS counter, belt housing and bagging areas.
for(const x of [32,57,70,83]){
 boxes.push({name:'Cashier checkout lane',x,z:1.7,hx:1.73,hz:3.7,floor:0});
}
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
 for(const b of boxes)if((b.floor===undefined||b.floor===floor)&&overlaps(x,z,b,radius))return true;
 // Sliding entrance glass is a physical boundary before or after opening.
 // Do not let the player walk outside before the game ends.
 if(z-radius < -12.12)return true;
 return false;
}
// Moving machines and built conveyor segments are collidable as well.
// The world state comes from the caller, so the module stays renderer-independent.
export function blockedEquipment(s,x,z,radius=PLAYER_RADIUS){
 if(!s)return false;
 const floor=s.floor;
 for(let a=0;a<AISLES;a++){
   const built=s.belts?.[floor]?.[a]||0;
   for(let segment=0;segment<built;segment++){
     if(Math.abs(x-(aisleX(a)+1.4))<.54+radius&&Math.abs(z-bayZ(BAYS-1-segment))<1.29+radius)return true;
   }
 }
 // Pallet jack is a moving solid for pedestrians, but drivers can exit freely.
 if(s.pallet&&s.pallet.floor===floor&&!s.pallet.driving&&Math.hypot(x-s.pallet.x,z-s.pallet.z)<.65+radius)return true;
 for(const bot of s.robots||[]){
   if(bot.placed&&bot.floor===floor&&Math.hypot(x-bot.x,z-bot.z)<.61+radius)return true;
 }
 if(s.levels?.cart&&s.cart.floor===floor){
   if(Math.hypot(x-aisleX(s.cart.aisle),z-s.cart.z)<.84+radius)return true;
 }
 return false;
}
// Axis-separated movement permits sliding along obstacles without tunneling,
// even when a fast machine produces a long frame.
export function moveWithCollisions(x,z,dx,dz,floor=0,extraBlocked=null){
 const length=Math.hypot(dx,dz);
 const parts=Math.max(1,Math.ceil(length/.24));
 let px=x,pz=z;
 for(let i=0;i<parts;i++){
   const nx=px+dx/parts,nz=pz+dz/parts;
   // A roaming robot can move into the player. Let the player step OUT of
   // its footprint instead of trapping them inside an overlapping collider.
   const insideDynamic=!!(extraBlocked&&extraBlocked(px,pz));
   if(!isBlocked(nx,pz,floor)&&(!extraBlocked||insideDynamic||!extraBlocked(nx,pz)))px=nx;
   if(!isBlocked(px,nz,floor)&&(!extraBlocked||insideDynamic||!extraBlocked(px,nz)))pz=nz;
 }
 return {x:px,z:pz};
}
