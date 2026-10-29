import * as THREE from 'three';
// Interactive fire exit and grand opening doors. Both are built on Floor 1 only.
// Fire exit intentionally reveals a blocked brick service wall; not an actual egress route.
export function createDoors({getWorld,getFloor,round,cube,textLabel}){
 let firePivot=null,fireOpen=false,entryLeft=null,entryRight=null,entryOpen=false,entryTriggered=false;
 const mat=(color,metalness=.12,roughness=.62)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 function build(){
   firePivot=entryLeft=entryRight=null;fireOpen=entryOpen=entryTriggered=false;
   if(getFloor()!==0)return;
   const world=getWorld();
   // Right wall: recess and metal jamb are deliberately depth-separated to avoid z-fighting.
   const recess=round(.25,4.4,3.45,mat('#6a7778',.35,.4));recess.position.set(102.48,2.25,40.5);
   const sill=round(.26,.17,3.6,mat('#343c3d',.3,.5));sill.position.set(102.25,.16,40.5);
   const brick=new THREE.Group();brick.position.set(103.3,0,40.5);world.add(brick);
   const mortar=mat('#b5aaa0',0,.95),brickMat=mat('#8f5148',0,.9);
   const backing=round(.25,4.1,3.2,mortar,brick);backing.position.set(0,2.16,0);
   for(let row=0;row<13;row++)for(let col=0;col<5;col++){
     const z=(col-2)*.67+(row%2?.25:0);
     if(z>1.6)continue;
     const block=round(.08,.27,.6,brickMat,brick);
     block.position.set(-.18,.35+row*.29,z);
   }
   firePivot=new THREE.Group();firePivot.position.set(102.17,0,38.98);world.add(firePivot);
   const door=round(.17,3.88,2.98,mat('#af2726',.23,.4),firePivot);door.position.set(0,2.1,1.49);
   const plate=round(.075,.48,1.55,mat('#dedddd',.45,.32),firePivot);plate.position.set(-.13,2.05,1.49);
   const bar=round(.11,.11,1.68,mat('#566064',.58,.38),firePivot);bar.position.set(-.22,1.95,1.49);
   const label=textLabel('FIRE EXIT',2.5,.44,'#f3eee9','#a52622',45,'interior');
   label.rotation.y=Math.PI/2;label.position.set(-.19,3.36,1.49);firePivot.add(label);
   const emergency=round(.16,.16,.13,new THREE.MeshBasicMaterial({color:'#f0d68c'}),firePivot);emergency.position.set(-.2,3.68,2.72);
   // Double-panel front entrance with inset panes, metal rails, and sliding mechanism.
   const frame=round(8.5,5.6,.34,mat('#59676a',.67,.35));frame.position.set(46.5,2.8,-12.43);
   const inset=round(7.8,4.95,.12,mat('#343d41',.4,.45));inset.position.set(46.5,2.5,-12.17);
   const glazing=mat('#adc8cf',.18,.11);glazing.transparent=true;glazing.opacity=.35;glazing.depthWrite=false;
   const track=round(7.65,.16,.35,mat('#abb1ae',.65,.28));track.position.set(46.5,5.05,-11.96);
   entryLeft=new THREE.Group();entryRight=new THREE.Group();world.add(entryLeft,entryRight);
   for(const [g,side] of [[entryLeft,-1],[entryRight,1]]){
     g.position.set(46.5+side*1.86,0,-11.91);
     const pane=round(3.5,4.65,.055,glazing,g);pane.position.y=2.45;
     for(const xx of [-1.73,1.73]){const rail=round(.11,4.65,.16,mat('#8d999a',.62,.27),g);rail.position.set(xx,2.45,.035);}
     for(const yy of [.17,4.78]){const rail=round(3.6,.13,.16,mat('#829093',.62,.31),g);rail.position.set(0,yy,.035);}
     const handle=round(.12,1.15,.15,mat('#d2d7d5',.65,.22),g);handle.position.set(-side*.37,2.25,.15);
   }
   const title=textLabel('GRAND OPENING  •  KEEP CLOSED',7.2,.67,'#e6e9e3','#364744',41,'interior');
   title.position.set(46.5,6.25,-12.05);world.add(title);
 }
 function nearFire(x,z){return getFloor()===0&&Math.hypot(x-98.6,z-40.5)<4.8;}
 function nearEntrance(x,z){return getFloor()===0&&Math.hypot(x-46.5,z+8.3)<5.2;}
 function toggleFire(){if(!firePivot)return false;fireOpen=!fireOpen;return fireOpen;}
 function openEntrance(){if(!entryLeft||entryTriggered)return false;entryOpen=true;entryTriggered=true;return true;}
 function update(dt){
   const k=Math.min(1,dt*5.5);
   if(firePivot)firePivot.rotation.y+=((fireOpen?-1.32:0)-firePivot.rotation.y)*k;
   if(entryLeft&&entryRight){
     entryLeft.position.x+=((46.5-1.86-(entryOpen?1.76:0))-entryLeft.position.x)*k;
     entryRight.position.x+=((46.5+1.86+(entryOpen?1.76:0))-entryRight.position.x)*k;
   }
 }
 return {build,update,nearFire,nearEntrance,toggleFire,openEntrance,isEntranceOpen:()=>entryOpen,isFireOpen:()=>fireOpen};
}
