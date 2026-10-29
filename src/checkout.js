import * as THREE from 'three';
// Floor 1: four grounded, operational-looking point-of-sale lanes.
// A separate loop animates checkout belts; checkout inventory is deliberately
// independent from the warehouse delivery system.
export const CHECKOUT_X=[32,57,70,83];
export const CHECKOUT_Z=1.8;
export function createCheckout({getWorld,getFloor,round,textLabel}){
 let carriers=[],laneRoots=[];
 const steel=new THREE.MeshStandardMaterial({color:'#899c9b',metalness:.65,roughness:.28});
 const body=new THREE.MeshStandardMaterial({color:'#e3e4dd',metalness:.16,roughness:.46});
 const dark=new THREE.MeshStandardMaterial({color:'#303c40',roughness:.82});
 const black=new THREE.MeshStandardMaterial({color:'#202a2d',roughness:.4});
 const gold=new THREE.MeshStandardMaterial({color:'#c08b50',metalness:.34,roughness:.48});
 const paper=new THREE.MeshStandardMaterial({color:'#d6c6a9',roughness:.85});
 const display=new THREE.MeshBasicMaterial({color:'#9bd8c6'});
 const mustache=new THREE.MeshStandardMaterial({color:'#f1f0e8',metalness:.12,roughness:.52});
 function fixture(parent,w,h,d,mat,x,y,z){
  const obj=round(w,h,d,mat,parent);obj.position.set(x,y,z);return obj;
 }
 function build(){
  carriers=[];laneRoots=[];
  if(getFloor()!==0)return;
  const world=getWorld();
  for(let i=0;i<CHECKOUT_X.length;i++){
   const x=CHECKOUT_X[i];
   const lane=new THREE.Group();lane.position.set(x,0,CHECKOUT_Z);world.add(lane);laneRoots.push(lane);
   // Continuous checkout base, not a floating belt.
   fixture(lane,1.55,.25,5.5,body,0,.65,0);
   for(const xx of [-.64,.64])for(const zz of [-2.2,2.2]){
     fixture(lane,.13,.59,.16,steel,xx,.29,zz);
     fixture(lane,.26,.08,.26,black,xx,.045,zz);
   }
   fixture(lane,1.22,.07,4.6,dark,0,.84,.1);
   for(const xx of [-.68,.68])fixture(lane,.065,.22,5.36,steel,xx,.86,0);
   // Recessed fasteners along the checkout stainless apron.
   for(let fast=0;fast<8;fast++)for(const side of [-1,1]){
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.023,6),steel);
    bolt.rotation.z=Math.PI/2;
    bolt.position.set(side*.686,.87,-2.13+fast*.61);lane.add(bolt);
   }
   for(let n=0;n<11;n++){
    const roller=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,1.19,10),steel);
    roller.rotation.z=Math.PI/2;roller.position.set(0,.9,-2.12+n*.43);lane.add(roller);
   }
   // Painted directional markings in front of the moving product lane.
   for(const z of [.8,1.7]){
    for(const side of [-1,1]){
     const chevron=fixture(lane,.042,.013,.28,steel,side*.13,.923,z);
     chevron.rotation.y=side*.62;
    }
   }
   // POS console and scanner at the customer-facing end.
   fixture(lane,1.85,1.15,1.23,body,.1,.65,-3.23);
   fixture(lane,2.05,.12,1.48,steel,.1,1.27,-3.23);
   fixture(lane,.63,.14,.5,dark,-.45,1.39,-3.32); // scanner
   fixture(lane,.52,.7,.13,black,.39,1.79,-3.46); // angled payment screen
   fixture(lane,.43,.46,.038,display,.39,1.82,-3.548);
   fixture(lane,.12,.23,.18,black,-.46,1.54,-2.89); // handheld scanner cradle
   const keypad=fixture(lane,.32,.07,.39,black,-.46,1.41,-2.83);
   fixture(lane,.26,.038,.09,display,-.46,1.47,-2.94);
   // Tactile keypad, visible invoice stripe and recessed scanner glass.
   for(let row=0;row<4;row++)for(let col=0;col<3;col++){
    fixture(lane,.054,.016,.047,steel,-.55+col*.087,1.455,-2.89+row*.075);
   }
   const scannerGlass=fixture(lane,.41,.02,.28,black,-.45,1.472,-3.34);
   const scanLight=fixture(lane,.26,.02,.03,display,-.45,1.493,-3.38);
   for(let row=0;row<3;row++)
    fixture(lane,.27,.016,.012,paper,.39,1.83+row*.086,-3.577);
   // Actual flat mustache silhouette on the cash register: not two bulbs.
   const moustachePath=new THREE.Shape();
   moustachePath.moveTo(-.17,.025);
   moustachePath.bezierCurveTo(-.09,.095,-.04,.066,0,.028);
   moustachePath.bezierCurveTo(.04,.066,.09,.095,.17,.025);
   moustachePath.bezierCurveTo(.13,-.04,.06,-.05,0,.0);
   moustachePath.bezierCurveTo(-.06,-.05,-.13,-.04,-.17,.025);
   const moustacheBadge=new THREE.Mesh(new THREE.ShapeGeometry(moustachePath),mustache);
   moustacheBadge.position.set(.39,1.59,-3.535);lane.add(moustacheBadge);
   for(const dx of [-.256,.256])fixture(lane,.035,.69,.035,steel,.39+dx,1.81,-3.561);
   for(const dy of [-.32,.32])fixture(lane,.53,.034,.035,steel,.39,1.81+dy,-3.561);
   moustacheBadge.position.set(.39,1.57,-3.588);
   // Bagging/receipt and checkout light supported by actual hardware.
   fixture(lane,1.3,.11,.87,steel,1.04,1.26,-3.35);
   fixture(lane,.52,.37,.33,body,1.02,1.48,-3.3);
   fixture(lane,.4,.035,.27,paper,1.02,1.7,-3.25);
   const receiptRoll= new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.31,14),paper);
   receiptRoll.rotation.z=Math.PI/2;receiptRoll.position.set(.96,1.74,-3.29);lane.add(receiptRoll);
   const bagArm=fixture(lane,.11,.56,.12,steel,1.04,.98,-3.22);
   const bagHandle=fixture(lane,.36,.035,.18,black,1.04,1.02,-3.2);
   fixture(lane,.1,3.25,.1,steel,-.81,2.81,-3.35);
   fixture(lane,.85,.53,.21,black,-.82,4.52,-3.35);
   const number=textLabel('LANE '+String(i+1).padStart(2,'0'),.78,.35,'#2a4441','#d9f0df',39,'entrance');
   number.position.set(-.82,4.54,-3.22);lane.add(number);
   const closed=textLabel('PAYMENT  /  CARD  /  RECEIPT',2.85,.45,'#d5ddd6','#394c45',28,'entrance');
   closed.position.set(0,1.62,2.85);lane.add(closed);
   const items=[];
   for(let j=0;j<3;j++){
    const item=fixture(lane,.32,.39,.35,
      new THREE.MeshStandardMaterial({color:['#a5b99f','#cc9c6f','#8ca7ba'][j],roughness:.67}),
      (j%2?.26:-.21),1.11,1.1+j*.95);
    const label=fixture(lane,.28,.19,.018,body,item.position.x,item.position.y,item.position.z-.184);
    items.push({item,label,start:j*.95,side:item.position.x});
   }
   carriers.push({items,lane});
  }
 }
 function update(timeSec){
  if(getFloor()!==0)return;
  // Customer belt animation exists even before grand opening as a powered demo.
  for(const {items} of carriers)for(const {item,label,start,side} of items){
   const z=2.0-((timeSec*.32+start)%4.0);
   item.position.set(side,1.11,z);
   label.position.set(side,1.11,z-.184);
  }
 }
 function nearest(x,z){
  if(getFloor()!==0)return -1;
  let best=-1,dist=2.15;
  for(let i=0;i<CHECKOUT_X.length;i++){
   const d=Math.hypot(x-CHECKOUT_X[i],z-(CHECKOUT_Z-3.2));
   if(d<dist){dist=d;best=i;}
  }
  return best;
 }
 return {build,update,nearest};
}
