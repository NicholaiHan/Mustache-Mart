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
   // The obstruction is visibly behind the fire door, never an escape route.
   // Brick faces are on the STORE side of the backing mortar: previous bricks
   // were recessed behind an opaque mortar panel and much of their detail vanished.
   const brick=new THREE.Group();brick.position.set(-10.78,0,85);world.add(brick);
   const mortar=mat('#c9beb0',0,.99);
   const brickTones=['#9e594d','#8e4e45','#ad6556','#95584c','#7e4740','#b16e5b'].map(c=>mat(c,.035,.88));
   const backing=round(.12,4.17,3.36,mortar,brick);backing.position.set(-.18,2.14,0);
   // Running-bond brickwork with 17 staggered courses, deep mortar joins,
   // varied brick tones, purposeful chips and hairline wear.
   const brickWidth=.476,course=.238;
   for(let row=0;row<17;row++){
     const yy=.19+row*course;
     for(let col=-4;col<=4;col++){
       const z=col*.49+(row%2?.245:0);
       if(Math.abs(z)>1.62)continue;
       const width=Math.min(brickWidth,3.29-2*Math.abs(z));
       if(width<.1)continue;
       const n=Math.abs(row*37+col*19);
       const face=round(.13,.212,width,brickTones[n%brickTones.length],brick);
       face.position.set(.10+(n%3)*.008,yy,z);
       // Inset recessed chips break otherwise perfectly repeated masonry.
       if(n%7===0){
         const chip=round(.008,.045,.085,mat('#70453b',0,.97),brick);
         chip.position.set(.183,yy+.044,z+(n%2?.13:-.13));
       }
       if(n%11===0){
         const pit=round(.009,.023,.042,mat('#d1a68f',0,.96),brick);
         pit.position.set(.187,yy-.043,z-.09);
       }
     }
   }
   const concrete=mat('#999188',.10,.91);
   const lintel=round(.27,.28,3.55,concrete,brick);
   lintel.position.set(.018,4.30,0);
   const lintelInset=round(.042,.055,3.3,mat('#6f6660',.1,.88),brick);
   lintelInset.position.set(.175,4.12,0);
   for(const zz of [-1.7,1.7]){
     const jamb=round(.24,4.22,.13,concrete,brick);
     jamb.position.set(.025,2.15,zz);
     for(let i=0;i<5;i++){
       const bolt=round(.045,.055,.048,mat('#71716b',.25,.6),brick);
       bolt.position.set(.17,.58+i*.78,zz);
     }
   }
   // Rubber smoke seal, coated steel frame, and a real threshold.
   const seal=mat('#202d30',.12,.9),jambSteel=mat('#6e7b7d',.73,.31);
   for(const z of [83.37,86.63]){
     const inner=round(.10,4.14,.07,seal);inner.position.set(-9.27,2.15,z);
     const steel=round(.22,4.44,.10,jambSteel);steel.position.set(-9.35,2.25,z);
   }
   const topSeal=round(.10,.085,3.24,seal);topSeal.position.set(-9.26,4.28,85);
   const sillStrip=round(.28,.045,3.42,mat('#adada9',.65,.37));sillStrip.position.set(-9.32,.065,85);
   const safetyPlate=round(.09,.61,1.13,mat('#f2e9d5',.06,.82));
   safetyPlate.position.set(-9.16,4.1,85);
   const exitSign=textLabel('FIRE EXIT',1.07,.38,'#9c2d28','#ffffff',39,'interior');
   exitSign.rotation.y=Math.PI/2;exitSign.position.set(-9.11,4.18,85);world.add(exitSign);
   // Ceiling-mounted dual emergency lamp (lightweight emissive meshes).
   const lampFrame=mat('#26383b',.42,.44),lampGlow=new THREE.MeshBasicMaterial({color:'#eef8d6'});
   const housing=round(.23,.21,1.02,lampFrame);housing.position.set(-9.04,4.61,85);
   for(const dz of [-.35,.35]){
     const lens=round(.08,.12,.23,lampGlow);lens.position.set(-8.9,4.60,85+dz);
   }
   firePivot=new THREE.Group();firePivot.position.set(-9.37,0,83.48);world.add(firePivot);
   // Heavy insulated red steel leaf, hinged at the near-Z frame post.
   const red=mat('#a52a28',.36,.41),redEdge=mat('#6e2526',.55,.42);
   const door=round(.17,3.88,2.98,red,firePivot);door.position.set(0,2.10,1.49);
   for(const z of [.07,2.91]){
     const rim=round(.205,3.79,.055,redEdge,firePivot);rim.position.set(.006,2.10,z);
   }
   for(const y of [.29,3.94]){
     const rim=round(.20,.060,2.78,redEdge,firePivot);rim.position.set(.006,y,1.49);
   }
   // Pressed inset panels and shallow bevelled edges create believable door depth.
   const panelEdge=mat('#7f2929',.3,.56),panelFill=mat('#b5332e',.24,.52);
   for(const [y,h] of [[1.02,1.31],[2.64,1.60]]){
     const inset=round(.028,h,2.48,panelEdge,firePivot);inset.position.set(.10,y,1.49);
     const fill=round(.028,h-.11,2.37,panelFill,firePivot);fill.position.set(.133,y,1.49);
   }
   // Stainless panic bar: supported crossbar, hinge pivots, stamped kick plate.
   const stainless=mat('#c1c9c6',.75,.22),darkSteel=mat('#445256',.64,.36);
   for(const z of [.83,2.18]){
     const socket=round(.20,.25,.16,darkSteel,firePivot);socket.position.set(.18,1.98,z);
     const arm=round(.14,.11,.26,stainless,firePivot);arm.position.set(.29,1.98,z);
   }
   const pushBar=round(.16,.12,1.74,stainless,firePivot);pushBar.position.set(.36,1.98,1.49);
   const pushBacking=round(.045,.39,1.92,darkSteel,firePivot);pushBacking.position.set(.16,1.97,1.49);
   const kick=round(.050,.58,2.63,stainless,firePivot);kick.position.set(.14,.55,1.49);
   const bottomRail=round(.07,.065,2.68,darkSteel,firePivot);bottomRail.position.set(.178,.28,1.49);
   for(const z of [.30,2.68]){
     for(const y of [.38,.74]){
       const screw=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.014,8),darkSteel);
       screw.rotation.z=Math.PI/2;screw.position.set(.177,y,z);firePivot.add(screw);
     }
   }
   for(const y of [1.15,2.2,3.22]){
     const hinge=round(.23,.26,.18,stainless,firePivot);hinge.position.set(-.035,y,.09);
     const pin=new THREE.Mesh(new THREE.CylinderGeometry(.073,.073,.31,12),darkSteel);
     pin.position.set(.06,y,.09);firePivot.add(pin);
   }
   const label=textLabel('FIRE EXIT',2.40,.40,'#f3eee9','#9f2c27',47,'interior');
   label.rotation.y=Math.PI/2;label.position.set(.195,3.48,1.49);firePivot.add(label);
   const warning=textLabel('PUSH BAR TO OPEN',1.66,.23,'#e4e5df','#3c514c',29,'interior');
   warning.rotation.y=Math.PI/2;warning.position.set(.19,2.39,1.49);firePivot.add(warning);
   const emergency=round(.095,.16,.14,new THREE.MeshBasicMaterial({color:'#f5d382'}),firePivot);
   emergency.position.set(.19,3.77,2.67);
   // Double-panel front entrance with inset panes, metal rails, and sliding mechanism.
   const frameMat=mat('#59686a',.67,.31);
   const glazing=new THREE.MeshStandardMaterial({color:'#b8ebff',emissive:'#77c6ff',emissiveIntensity:.32,metalness:.04,roughness:.08,transparent:true,opacity:.61,depthWrite:false});
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
