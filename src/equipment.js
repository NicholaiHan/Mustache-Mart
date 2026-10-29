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
 const crate=round(.59,.37,.48,equipmentMaterial('#bca582',0,.9),group);
 crate.position.set(0,.87,0);
 const tape=round(.056,.382,.49,light,group);tape.position.set(.02,.875,0);
 // Tape follows the moving carton, rather than hovering on the conveyor.
 crate.add(tape);tape.position.set(0,0,.03);
 getBeltCrates().push({crate,segment,aisle:a});
 return group;
}
function makeReceivingSystem(){
 const root=new THREE.Group();getWorld().add(root);
 const steel=equipmentMaterial('#7a8b8d',.7,.33);
 const dark=equipmentMaterial('#34494b',.3,.52);
 const yellow=equipmentMaterial('#dbb369',.25,.44);
 const green=new THREE.MeshBasicMaterial({color:'#9bd9af'});
 // A shared overhead feeder connects the rear dock to ten aisle branches.
 const crossbar=round(98,.14,.22,steel,root);crossbar.position.set(50.5,3.5,92.4);
 const secondary=round(98,.085,.12,dark,root);secondary.position.set(50.5,3.27,92.4);
 for(let a=0;a<10;a++){
  const x=aisleX(a)+1.4,active=s.belts[s.floor][a]>0;
  const anchor=round(.28,.24,.38,steel,root);anchor.position.set(x,3.45,92.4);
  const hanger=round(.095,1.35,.11,steel,root);hanger.position.set(x,2.66,92.4);
  const chute=round(.81,.11,2.35,active?steel:dark,root);
  chute.position.set(x,1.27,91.05);
  const guardL=round(.07,.2,2.25,steel,root);guardL.position.set(x-.45,1.35,91.05);
  const guardR=round(.07,.2,2.25,steel,root);guardR.position.set(x+.45,1.35,91.05);
  const indicator=round(.16,.17,.17,active?green:yellow,root);indicator.position.set(x,3.03,92.06);
  if(active){
   const feeder=round(.54,.33,.47,equipmentMaterial('#c2a780',0,.82),root);
   feeder.position.set(x,1.5,91.1);
   getFeedCrates().push({crate:feeder,aisle:a});
  }
 }
 // A believable transfer claw at receiving, no products dropped on the floor.
 const loader=new THREE.Group();root.add(loader);loader.position.set(2.7,0,93.2);
 const upright=round(.18,3.8,.18,steel,loader);upright.position.set(0,1.9,0);
 const beam=round(2.5,.18,.21,yellow,loader);beam.position.set(.94,3.73,0);
 const slide=round(.42,.26,.35,steel,loader);slide.position.set(1.85,3.5,0);
 loader.userData.jaws=[];
 for(const x of [1.65,2.05]){
  const jaw=round(.14,.82,.19,steel,loader);jaw.position.set(x,2.86,0);loader.userData.jaws.push(jaw);
  const tip=round(.19,.12,.22,dark,loader);tip.position.set(x,2.42,0);
 }
 const controller=round(.57,.48,.27,dark,loader);controller.position.set(-.2,1.62,-.15);
 const lamp=round(.24,.15,.085,green,loader);lamp.position.set(-.2,1.69,.025);
 if(setClawVisual)setClawVisual(loader);
 return root;
}
function makeCart(){
 if(!s.levels.cart)return;
 const cartMesh=new THREE.Group();getWorld().add(cartMesh);
 const shell=equipmentMaterial('#e4e2da',.15,.42);
 const steel=equipmentMaterial('#88999a',.6,.35);
 const dark=equipmentMaterial('#2d3439',.08,.62);
 const orange=equipmentMaterial('#c17e44',.18,.48);
 const body=round(1.38,.65,1.83,shell,cartMesh);body.position.y=.67;
 const bumper=round(1.46,.19,.17,dark,cartMesh);bumper.position.set(0,.42,-.92);
 const grille=round(.72,.31,.045,dark,cartMesh);grille.position.set(0,.78,-.93);
 for(const side of [-1,1]){
  industrialWheel(cartMesh,side*.69,.28,-.52,.27);
  industrialWheel(cartMesh,side*.69,.28,.57,.27);
  const light=round(.18,.12,.04,orange,cartMesh);light.position.set(side*.49,.94,-.938);
  const railing=round(.07,8.7,.08,steel,cartMesh);railing.position.set(side*.5,5.2,.62);
 }
 const mast=round(.19,9.6,.23,steel,cartMesh);mast.position.set(0,5.1,.49);
 const runner=round(.79,.14,.96,steel,cartMesh);runner.position.set(0,9.72,.23);
 const lift=round(.94,.08,.52,shell,cartMesh);lift.position.set(0,9.9,-.2);
 const stripe=round(.69,.08,.045,orange,cartMesh);stripe.position.set(0,1.04,-.925);
 const panel=round(.38,.23,.07,dark,cartMesh);panel.position.set(0,1.02,-.92);
 return cartMesh;
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
return {makeBelt,makeReceivingSystem,makeCart,makeLadder};
}
