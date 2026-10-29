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

export function createEquipment({s,round,getWorld,getLadder,getBeltCrates}){
function makeBelt(f,a,segment){
 const group=new THREE.Group();getWorld().add(group);
 group.position.set(aisleX(a)+1.4,0,bayZ(BAYS-1-segment));
 const steel=equipmentMaterial('#a2adae',.62,.36);
 const belt=equipmentMaterial('#384447',.08,.85);
 const orange=equipmentMaterial('#ba743c',.2,.45);
 const frame=round(1.08,.2,2.55,steel,group);frame.position.y=.44;
 const surface=round(.86,.065,2.4,belt,group);surface.position.y=.56;
 for(const side of [-1,1]){
   const rail=round(.07,.22,2.55,steel,group);rail.position.set(side*.5,.65,0);
   for(const z of [-.91,.91]) {
    const foot=round(.1,.45,.14,steel,group);foot.position.set(side*.45,.23,z);
   }
 }
 for(let i=0;i<6;i++)cylinder(.07,.91,steel,group,0,.6,(i-2.5)*.4,Math.PI/2);
 const guard=round(.06,.16,.44,orange,group);guard.position.set(.54,.67,-.83);
 const crate=round(.59,.37,.48,equipmentMaterial('#bca582',0,.9),group);
 crate.position.set(0,.84,0);
 getBeltCrates().push({crate,segment,aisle:a});
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
return {makeBelt,makeCart,makeLadder};
}
