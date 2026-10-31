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
   // Back-left wall: recess and metal jamb are deliberately depth-separated to avoid z-fighting.
   const metal=mat('#647577',.5,.32);
   for(const z of [83.2,86.8]){
     const jamb=round(.29,4.53,.13,metal);jamb.position.set(-9.50,2.27,z);
   }
   const header=round(.28,.24,3.74,metal);header.position.set(-9.50,4.55,85);
   const sill=round(.3,.095,3.72,mat('#343c3d',.45,.5));sill.position.set(-9.53,.09,85);
   const brick=new THREE.Group();brick.position.set(-10.67,0,85);world.add(brick);
   const mortar=mat('#d0c4b4',0,.97);const brickTones=['#96584d','#854c42','#aa695c','#9f6252','#784a40'].map(c=>mat(c,.02,.86));
   const backing=round(.13,4.13,3.35,mortar,brick);backing.position.set(0,2.13,0);
   // Running bond brickwork with 16 staggered courses, visible mortar joins,
   // 5 brick colors, individual chipped joints and a recessed blocked doorway.
   for(let row=0;row<16;row++)for(let col=-3;col<=3;col++){
     const z=col*.51+(row%2?.255:0);
     if(Math.abs(z)>1.59)continue;
     const block=round(.097,.212,.47,brickTones[(row*7+col*11+17)%brickTones.length],brick);
     block.position.set(-.139,.32+row*.243,z);
     if((row*5+col*3)%7===0){
       const inset=round(.014,.12,.13,mat('#6e443c',0,.98),brick);
       inset.position.set(-.197,.32+row*.243,z+.1);
     }
   }
   // Visible chalky masonry seams and concrete lintel framing the obstruction.
   const lintel=round(.22,.25,3.42,mat('#95877b',.08,.87),brick);
   lintel.position.set(-.21,4.12,0);
   for(const zz of [-1.68,1.68]){
     const trim=round(.18,4.12,.11,mat('#9a8d82',.08,.9),brick);
     trim.position.set(-.18,2.07,zz);
   }
   const safetyPlate=round(.09,.61,1.13,mat('#f5e7c6',.06,.86));
   safetyPlate.position.set(-9.16,4.1,85);
   const exitSign=textLabel('FIRE EXIT',1.07,.38,'#aa2421','#ffffff',39,'interior');
   exitSign.rotation.y=Math.PI/2;exitSign.position.set(-9.11,4.18,85);world.add(exitSign);
   firePivot=new THREE.Group();firePivot.position.set(-9.37,0,83.48);world.add(firePivot);
   const door=round(.17,3.88,2.98,mat('#af2726',.23,.4),firePivot);door.position.set(0,2.1,1.49);
   const plate=round(.075,.48,1.55,mat('#dedddd',.45,.32),firePivot);plate.position.set(.14,2.05,1.49);
   const bar=round(.11,.11,1.68,mat('#566064',.58,.38),firePivot);bar.position.set(.22,1.95,1.49);
   const label=textLabel('FIRE EXIT',2.5,.44,'#f3eee9','#a52622',45,'interior');
   label.rotation.y=Math.PI/2;label.position.set(.19,3.36,1.49);firePivot.add(label);
   const pushPlate=round(.2,.62,.11,mat('#a9b5b3',.56,.24),firePivot);
   pushPlate.position.set(.23,2.01,2.47);
   for(const y of [1.18,2.72]){
    const hinge=round(.22,.19,.16,mat('#b9c2c0',.67,.27),firePivot);
    hinge.position.set(.16,y,.14);
   }
   const kick=round(.075,.58,2.71,mat('#cccbc6',.55,.35),firePivot);
   kick.position.set(.16,.53,1.49);
   const emergency=round(.16,.16,.13,new THREE.MeshBasicMaterial({color:'#f0d68c'}),firePivot);emergency.position.set(.2,3.68,2.72);
   // Double-panel front entrance with inset panes, metal rails, and sliding mechanism.
   const frameMat=mat('#59686a',.67,.31);
   const glazing=mat('#adc8cf',.18,.11);
   glazing.transparent=true;glazing.opacity=.33;glazing.depthWrite=false;
   const leftPost=round(.22,5.58,.42,frameMat);leftPost.position.set(42.6,2.79,-12.33);
   const rightPost=round(.22,5.58,.42,frameMat);rightPost.position.set(50.4,2.79,-12.33);
   const track=round(7.91,.21,.52,frameMat);track.position.set(46.5,5.57,-12.31);
   const threshold=round(7.9,.12,.61,mat('#abb1ae',.65,.32));threshold.position.set(46.5,.06,-12.31);
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
 function nearFire(x,z){return getFloor()===0&&Math.hypot(x+6.5,z-85)<4.8;}
 function nearEntrance(x,z){return getFloor()===0&&Math.hypot(x-46.5,z+8.3)<5.2;}
 function toggleFire(){if(!firePivot)return false;fireOpen=!fireOpen;return fireOpen;}
 function openEntrance(){if(!entryLeft||entryTriggered)return false;entryOpen=true;entryTriggered=true;return true;}
 function update(dt){
   const k=Math.min(1,dt*5.5);
   if(firePivot)firePivot.rotation.y+=((fireOpen?1.35:0)-firePivot.rotation.y)*k; // positive rotation swings left-wall door INTO shop (+X)
   if(entryLeft&&entryRight){
     entryLeft.position.x+=((46.5-1.86-(entryOpen?1.76:0))-entryLeft.position.x)*k;
     entryRight.position.x+=((46.5+1.86+(entryOpen?1.76:0))-entryRight.position.x)*k;
   }
 }
 return {build,update,nearFire,nearEntrance,toggleFire,openEntrance,isEntranceOpen:()=>entryOpen,isFireOpen:()=>fireOpen};
}
