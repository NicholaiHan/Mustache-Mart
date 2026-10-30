import * as THREE from 'three';
import {BAYS,aisleX,bayZ} from './rules.mjs';
// Equipment design and conveyor/cart/ladder geometry.
export function equipmentMaterial(hex, metalness=.12, roughness=.48){
 return new THREE.MeshStandardMaterial({color:hex,metalness,roughness});
}
export function cylinder(radius,depth,material,parent,x,y,z,rotation=0){
 const part=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,20),material);
 part.rotation.z=rotation;part.position.set(x,y,z);parent.add(part);return part;
}
export function industrialWheel(parent,x,y,z,r=.26){
 const rubber=equipmentMaterial('#292f32',.08,.85),rim=equipmentMaterial('#8d999a',.55,.3);
 cylinder(r,.17,rubber,parent,x,y,z,Math.PI/2);
 cylinder(r*.55,.18,rim,parent,x,y,z,Math.PI/2);
 cylinder(r*.16,.19,equipmentMaterial('#c77a34',.25,.4),parent,x,y,z,Math.PI/2);
}

export function createEquipment({s,round,getWorld,getLadder,getBeltCrates,getFeedCrates,setClawVisual}){
function makeBelt(f,a,segment){
 const group=new THREE.Group();getWorld().add(group);
 group.position.set(aisleX(a)+1.4,0,bayZ(BAYS-1-segment));
 group.rotation.y=-(s.beltDirection?.[f]?.[a]?.[segment]||0)*Math.PI/2;
 const steel=equipmentMaterial('#a2adae',.65,.32);
 const rubber=equipmentMaterial('#2a373b',.09,.88);
 const orange=equipmentMaterial('#e2a753',.25,.45);
 const dark=equipmentMaterial('#4c5c60',.52,.38);
 const light=equipmentMaterial('#f3e8cb',0,.74);
 const frame=round(1.1,.19,2.55,steel,group);frame.position.y=.45;
 const surface=round(.88,.063,2.4,rubber,group);surface.position.y=.57;
 for(const side of [-1,1]){
   const rail=round(.08,.26,2.55,steel,group);rail.position.set(side*.51,.68,0);
   const rubberGuard=round(.035,.055,2.35,dark,group);rubberGuard.position.set(side*.44,.805,0);
   for(const z of [-.91,.91]){
    const foot=round(.13,.44,.18,steel,group);foot.position.set(side*.43,.22,z);
    const plate=round(.24,.045,.27,dark,group);plate.position.set(side*.43,.03,z);
    const bolt=round(.055,.04,.06,orange,group);bolt.position.set(side*.43,.063,z);
   }
   for(const z of [-.93,.93]){
    const fastener=round(.065,.055,.065,dark,group);fastener.position.set(side*.51,.81,z);
   }
 }
 for(let i=0;i<7;i++)cylinder(.057,.89,steel,group,0,.61,(i-3)*.31,Math.PI/2);
 // White lane chevrons show actual direction: toward the FRONT (-Z).
 for(let j=0;j<3;j++){
   for(const side of [-1,1]){
     const arrow=round(.035,.009,.29,light,group);
     arrow.rotation.y=side*.64;arrow.position.set(side*.12,.613,-.70+j*.7);
   }
 }
 // Motor gearbox, hazard protection, and intake roller.
 const motor=round(.22,.28,.42,dark,group);motor.position.set(.69,.44,.85);
 const guard=round(.075,.18,.44,orange,group);guard.position.set(.56,.66,-.86);
 const axle=round(.065,.18,.13,steel,group);axle.position.set(.71,.58,.62);
 // Three physically distinct stock positions per segment. All start hidden:
 // a conveyor is NEVER decorated with fake products when it is empty.
 const cardboard=equipmentMaterial('#bca582',0,.9);
 for(let slot=0;slot<3;slot++){
  const crate=round(.59,.37,.48,cardboard,group);
  crate.position.set(0,.87,.78-slot*.78);
  crate.visible=false;
  const tape=round(.056,.382,.49,light,crate);tape.position.set(0,0,.03);
  getBeltCrates().push({crate,segment,aisle:a,slot});
 }
 return group;
}
function makeReceivingSystem(){
 // Receiving equipment stays at the rear inventory bay only. No permanent
 // 98-metre overhead crossbar, dark floating bar, or ten unused empty chutes.
 // The K-installed item claws supply the actual B-built conveyors.
 const root=new THREE.Group();getWorld().add(root);
 const steel=equipmentMaterial('#8e9a9a',.63,.34);
 const dark=equipmentMaterial('#3a4a4d',.3,.5);
 const yellow=equipmentMaterial('#d6ab66',.22,.45);
 const concrete=equipmentMaterial('#aab3ac',.02,.94);
 const floor=round(4.2,.085,2.8,concrete,root);floor.position.set(5.4,.04,96.2);
 const backStop=round(4.2,.12,.13,yellow,root);backStop.position.set(5.4,.17,97.55);
 const intake=round(2.7,.2,1.35,dark,root);intake.position.set(5.6,.63,95.2);
 for(const side of [-1,1]){
  const rail=round(.09,.25,1.5,steel,root);rail.position.set(5.6+side*1.37,.76,95.2);
  for(const z of [94.63,95.76]){
   const leg=round(.13,.55,.16,steel,root);leg.position.set(5.6+side*1.1,.32,z);
   const foot=round(.25,.04,.25,dark,root);foot.position.set(5.6+side*1.1,.045,z);
  }
 }
 for(let k=0;k<6;k++){
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.47,12),steel);
  roller.rotation.z=Math.PI/2;roller.position.set(5.6,.76,94.62+k*.23);root.add(roller);
 }
 const bumper=round(2.7,.09,.12,yellow,root);bumper.position.set(5.6,.66,94.51);
 const sign=round(2.2,.34,.08,dark,root);sign.position.set(5.6,2.35,96.32);
 const digits=round(.5,.09,.03,new THREE.MeshBasicMaterial({color:'#8ce3bd'}),root);
 digits.position.set(5.6,2.35,96.27);
 const post=round(.12,2,.13,steel,root);post.position.set(5.6,1.35,96.43);
 // No cartons are placed on this intake until an actual item claw picks them
 // from receiving stock and sends them onto a paid, connected belt.
 return root;
}
function makeCart(){
 if(!s.levels.cart)return null;
 const root=new THREE.Group();getWorld().add(root);
 const shell=equipmentMaterial('#e5e2da',.25,.39);
 const steel=equipmentMaterial('#7e9091',.72,.31);
 const dark=equipmentMaterial('#283536',.16,.69);
 const orange=equipmentMaterial('#d9a75b',.28,.43);
 const frame=round(1.44,.46,2.06,shell,root);frame.position.y=.49;
 const bumper=round(1.5,.16,.15,dark,root);bumper.position.set(0,.35,-1);
 for(const side of [-1,1]){
  for(const z of [-.68,.68])industrialWheel(root,side*.72,.27,z,.26);
  const guide=round(.095,9.6,.11,steel,root);guide.position.set(side*.49,5.1,.58);
  const hydraulic=round(.12,4.7,.13,dark,root);hydraulic.position.set(side*.32,2.8,.6);
  const brake=round(.28,.09,.13,orange,root);brake.position.set(side*.68,.68,-.82);
 }
 const platform=new THREE.Group();platform.name='riderPlatform';root.add(platform);
 const deck=round(1.22,.17,1.3,steel,platform);deck.position.set(0,1.18,-.13);
 const mat=round(1.05,.033,1.06,dark,platform);mat.position.set(0,1.28,-.16);
 for(const side of [-1,1]){
  const post=round(.06,1.18,.08,orange,platform);post.position.set(side*.54,1.85,-.53);
  const post2=round(.06,1.18,.08,orange,platform);post2.position.set(side*.54,1.85,.42);
  const sideRail=round(.065,.075,1.08,steel,platform);sideRail.position.set(side*.54,2.38,-.04);
 }
 const backRail=round(1.14,.09,.08,steel,platform);backRail.position.set(0,2.38,.43);
 const frontGate=round(1.1,.08,.08,orange,platform);frontGate.position.set(0,2.14,-.56);
 const panel=round(.31,.24,.09,dark,platform);panel.position.set(.36,1.81,-.58);
 const indicator=round(.18,.11,.02,new THREE.MeshBasicMaterial({color:'#a0edc7'}),platform);indicator.position.set(.36,1.87,-.526);
 const caution=round(.75,.07,.065,orange,root);caution.position.set(0,.77,-1.016);
 return root;
}
function makePalletJack(){
 const root=new THREE.Group();getWorld().add(root);
 const frame=equipmentMaterial('#e0a64d',.4,.44),steel=equipmentMaterial('#829193',.72,.32);
 const dark=equipmentMaterial('#273638',.11,.72),card=equipmentMaterial('#bca27a',.05,.85);
 for(const side of [-1,1]){
  const fork=round(.16,.12,2.0,frame,root);fork.position.set(side*.42,.23,-.27);
  industrialWheel(root,side*.45,.18,-1.12,.17);
 }
 const housing=round(1.24,.33,.86,frame,root);housing.position.set(0,.45,.54);
 for(const side of [-1,1])industrialWheel(root,side*.58,.25,.56,.23);
 const column=round(.13,1.3,.16,steel,root);column.position.set(0,1.19,.81);
 const steering=round(.85,.12,.12,dark,root);steering.position.set(0,1.85,.81);
 const crate=round(.95,.62,1.18,card,root);crate.position.set(0,.63,-.36);crate.name='palletCargo';
 const stripe=round(.72,.04,.035,dark,crate);stripe.position.set(0,.28,-.6);
 const status=round(.24,.15,.045,new THREE.MeshBasicMaterial({color:'#b5e4bd'}),root);status.position.set(0,1.35,.92);
 return root;
}
function makeClaws(){
 const groups=[];
 for(const claw of s.claws.filter(c=>c.floor===s.floor)){
  const root=new THREE.Group();getWorld().add(root);
  root.position.set(claw.x,0,claw.z);
  const steel=equipmentMaterial('#76888a',.68,.33),yellow=equipmentMaterial('#e1af59',.24,.4),dark=equipmentMaterial('#344447',.22,.62);
  for(const side of [-1,1]){
   const support=round(.11,2.9,.13,steel,root);support.position.set(side*.49,1.54,.31);
   const foot=round(.38,.1,.36,dark,root);foot.position.set(side*.49,.07,.31);
  }
  const beam=round(1.52,.19,.25,yellow,root);beam.position.set(0,3.02,.3);
  const gearbox=round(.54,.35,.43,dark,root);gearbox.position.set(0,2.8,0);
  const craneArm=round(.13,.95,.16,steel,root);craneArm.position.set(0,2.2,0);
  const gripping=new THREE.Group();root.add(gripping);gripping.name='gripper';
  for(const side of [-1,1]){
   const jaw=round(.13,.58,.16,steel,gripping);jaw.position.set(side*.26,1.53,0);
   const gripPad=round(.22,.15,.18,dark,gripping);gripPad.position.set(side*.26,1.24,0);
  }
  const box=round(.48,.33,.46,equipmentMaterial('#bfa681',0,.87),gripping);box.position.set(0,1.17,0);box.name='clawCargo';
  const label=round(.66,.11,.065,yellow,root);label.position.set(0,2.52,-.28);
  groups.push({id:claw.id,root,gripping,box});
 }
 return groups;
}
function makeStockPiles(){
 const items=[];
 const cardboard=equipmentMaterial('#bea47c',.03,.87),wood=equipmentMaterial('#98734b',.1,.85);
 for(const p of s.stockPiles.filter(q=>q.floor===s.floor&&q.count>0)){
  const g=new THREE.Group();getWorld().add(g);g.position.set(p.x,0,p.z);g.userData.pile=p;
  const pallet=round(1.65,.15,1.65,wood,g);pallet.position.y=.13;
  for(let tier=0;tier<Math.min(4,Math.ceil(p.count/70));tier++){
   for(let side of [-1,1]){
    const box=round(.72,.46,.8,cardboard,g);box.position.set(side*.38,.5+tier*.5,0);
   }
  }
  items.push(g);
 }
 return items;
}
function makeLadder(){
 const group=new THREE.Group();getWorld().add(group);
 for(const ladder of s.ladders.filter(l=>l.floor===s.floor)){
  const ladderMesh=new THREE.Group();group.add(ladderMesh);
  const high=s.levels.ladderPlus;
  const h=high?10.6:6.2;
  const metal=equipmentMaterial('#b5bdba',.68,.28),warning=equipmentMaterial('#d6aa48',.32,.4),rubber=equipmentMaterial('#2e3b40',.03,.86);
  for(const x of [-.43,.43]){
   const post=round(.11,h,.13,metal,ladderMesh);post.position.set(x,h/2+.1,0);
   const foot=round(.2,.2,.27,rubber,ladderMesh);foot.position.set(x,.14,0);
  }
  for(let n=0;n<(high?18:10);n++){
   const rung=round(.81,.105,.19,n%3===0?warning:metal,ladderMesh);
   rung.position.set(0,.48+n*.55,-.04);
  }
  const stabilizer=round(1.2,.15,.88,warning,ladderMesh);stabilizer.position.set(0,.17,.36);
  const cap=round(1,.13,.31,rubber,ladderMesh);cap.position.set(0,h+.08,0);
  ladderMesh.position.set(ladder.x,0,ladder.z);
  ladderMesh.name='ladder-'+ladder.id;
 }
 return group;
}
return {makeBelt,makeReceivingSystem,makeCart,makeLadder,makePalletJack,makeClaws,makeStockPiles};
}
