import * as THREE from 'three';
import {BAYS,aisleX,bayZ} from './rules.mjs';
import {addPackedCarton,addInventoryPallet,cartonMaterials} from './carton-model.js';
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
// Shared materials keep hundreds of seamless conveyor segments inexpensive.
const beltSteel=equipmentMaterial('#a6b2b3',.72,.29);
const beltRim=equipmentMaterial('#68797b',.63,.36);
const beltRubber=equipmentMaterial('#252e31',.07,.83);
const beltGroove=equipmentMaterial('#455155',.12,.75);
const beltGold=equipmentMaterial('#bb934f',.31,.48);
const beltShadow=equipmentMaterial('#172125',.08,.74);
const beltStripe=equipmentMaterial('#c1d4d0',.07,.55);
const beltCardboard=equipmentMaterial('#bca582',0,.9);
function makeBelt(f,a,segment,freePiece=null){
 const group=new THREE.Group();getWorld().add(group);
 group.name='continuousConveyorSection';group.userData.keepProportion=true;
 if(freePiece)group.position.set(freePiece.x,0,freePiece.z);
 else group.position.set(aisleX(a)+1.4,0,bayZ(BAYS-1-segment));
 const direction=freePiece?freePiece.dir:(s.beltDirection?.[f]?.[a]?.[segment]||0);
 group.rotation.y=-direction*Math.PI/2;
 // Bays are 2.65m apart. The 2.68m working ribbon overlaps its neighbors
 // by just 3cm, removing visible gaps while preserving individual sections
 // for routing, placement, resale, and independent inventory quantities.
 const pitch=2.65,skinLength=2.68;
 const chassis=round(1.25,.21,pitch,beltSteel,group);chassis.position.y=.43;
 const recessed=round(1.13,.071,skinLength,beltShadow,group);recessed.position.y=.565;
 const continuousRubber=round(.96,.054,skinLength,beltRubber,group);
 continuousRubber.position.y=.607;
 // Continuous slim side guides sit beyond the belt, not as isolated plates.
 for(const side of [-1,1]){
  const rail=round(.085,.19,skinLength,beltRim,group);rail.position.set(side*.583,.684,0);
  const liner=round(.035,.035,skinLength,beltGroove,group);liner.position.set(side*.524,.765,0);
  const reflectiveEdge=round(.018,.025,skinLength,beltStripe,group);
  reflectiveEdge.position.set(side*.634,.67,0);
  // Low-profile support frames are periodic instead of repeating at every join.
  if(segment%2===0){
   for(const z of [-.99,.99]){
    const foot=round(.16,.43,.17,beltSteel,group);foot.position.set(side*.52,.23,z);
    const base=round(.26,.045,.28,beltShadow,group);base.position.set(side*.52,.045,z);
    const joint=round(.09,.045,.09,beltGold,group);joint.position.set(side*.52,.082,z);
   }
  }
  for(const z of [-1.08,1.08]){
   const rivet=round(.042,.024,.042,beltGold,group);
   rivet.position.set(side*.594,.792,z);
  }
 }
 // Fine transverse rubber tread grooves create a single textured industrial
 // belt, not visible gaps or seven exposed roller cylinders per bay.
 for(let j=-5;j<=5;j++){
  const rib=round(.91,.008,.018,beltGroove,group);rib.position.set(0,.641,j*.225);
 }
 // Discrete direction marks repeat across bays while the belt stays continuous.
 for(const z of [-.78,.15,.99]){
  const shaft=round(.025,.009,.27,beltStripe,group);shaft.position.set(0,.648,z);
  for(const side of [-1,1]){
   const tip=round(.025,.01,.14,beltStripe,group);
   tip.position.set(side*.047,.65,z-.17);tip.rotation.y=side*.63;
  }
 }
 // Only the rear intake and forward outlet expose pulley housings and drive
 // motors. Intermediate joints now read as one uninterrupted moving surface.
 const lastSection=freePiece||segment===(s.belts[f]?.[a]||1)-1;
 if(segment===0||lastSection){
  const end=segment===0?1:-1;
  const pulley=new THREE.Mesh(new THREE.CylinderGeometry(.135,.135,1.04,12),beltRim);
  pulley.rotation.z=Math.PI/2;pulley.position.set(0,.62,end*1.22);group.add(pulley);
  const shroud=round(.12,.22,.32,beltSteel,group);shroud.position.set(.67,.52,end*1.10);
  if(segment===0){
   const motor=round(.28,.29,.43,beltShadow,group);motor.position.set(.79,.43,1.02);
   const collar=round(.12,.19,.20,beltGold,group);collar.position.set(.83,.55,.82);
  }
 }
 // One pivot disc makes a routed 90-degree outlet visibly jointed.
 if(direction){
  const turnTable=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.026,18),beltRim);
  turnTable.position.set(0,.622,-1.16);group.add(turnTable);
  const turnInset=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.028,18),beltRubber);
  turnInset.position.set(0,.642,-1.16);group.add(turnInset);
 }
 // Three physical stock slots; never place cosmetic fake inventory on an empty belt.
 for(let slot=0;slot<3;slot++){
  const crate=round(.59,.37,.48,beltCardboard,group);
  crate.position.set(0,.88,.78-slot*.78);
  crate.visible=false;
  const tape=round(.056,.382,.49,beltStripe,crate);tape.position.set(0,0,.03);
  getBeltCrates().push({crate,segment,aisle:a,slot,freeId:freePiece?.id||null});
 }
 return group;
}
function makeReceivingSystem(){
 // Receiving equipment stays at the rear inventory bay only. No permanent
 // 98-metre overhead crossbar, dark floating bar, or ten unused empty chutes.
 // The K-installed item claws supply the actual B-built conveyors.
 const root=new THREE.Group();getWorld().add(root);
 root.name='proportionalReceivingIntake';root.position.x=5.6;root.userData.keepProportion=true;
 const steel=equipmentMaterial('#8e9a9a',.63,.34);
 const dark=equipmentMaterial('#3a4a4d',.3,.5);
 const yellow=equipmentMaterial('#d6ab66',.22,.45);
 const concrete=equipmentMaterial('#aab3ac',.02,.94);
 const floor=round(4.2,.085,2.8,concrete,root);floor.position.set(-.2,.04,96.2);
 const backStop=round(4.2,.12,.13,yellow,root);backStop.position.set(-.2,.17,97.55);
 const intake=round(2.7,.2,1.35,dark,root);intake.position.set(0,.63,95.2);
 for(const side of [-1,1]){
  const rail=round(.09,.25,1.5,steel,root);rail.position.set(side*1.37,.76,95.2);
  for(const z of [94.63,95.76]){
   const leg=round(.13,.55,.16,steel,root);leg.position.set(side*1.1,.32,z);
   const foot=round(.25,.04,.25,dark,root);foot.position.set(side*1.1,.045,z);
  }
 }
 for(let k=0;k<6;k++){
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.47,12),steel);
  roller.rotation.z=Math.PI/2;roller.position.set(0,.76,94.62+k*.23);root.add(roller);
 }
 const bumper=round(2.7,.09,.12,yellow,root);bumper.position.set(0,.66,94.51);
 const sign=round(2.2,.34,.08,dark,root);sign.position.set(0,2.35,96.32);
 const digits=round(.5,.09,.03,new THREE.MeshBasicMaterial({color:'#8ce3bd'}),root);
 digits.position.set(0,2.35,96.27);
 const post=round(.12,2,.13,steel,root);post.position.set(0,1.35,96.43);
 // No cartons are placed on this intake until an actual item claw picks them
 // from receiving stock and sends them onto a paid, connected belt.
 return root;
}
function makeCart(){
 if(!s.levels.cart)return null;
 const root=new THREE.Group();getWorld().add(root);root.userData.keepProportion=true;
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
 // Entire old pallet jack model removed. New hand-powered warehouse jack
 // constructed around two real fork profiles and a central hydraulic pump.
 const root=new THREE.Group();root.name='fullWidthPalletJack';
 root.userData.keepProportion=true;getWorld().add(root);
 const chassis=equipmentMaterial('#cf9c2e',.31,.45);
 const bright=equipmentMaterial('#f0bd43',.32,.40);
 const metal=equipmentMaterial('#9faeb0',.66,.32);
 const rubber=equipmentMaterial('#242b2e',.08,.88);
 const grease=equipmentMaterial('#404c4d',.24,.55);
 const materials=cartonMaterials();
 const part=(w,h,d,mat,x,y,z,name)=>{
  const m=round(w,h,d,mat,root);m.position.set(x,y,z);
  if(name)m.name=name;return m;
 };
 // Two extruded steel forks: a long flat load platform, upward neck, and
 // tapered tips. Each is thick enough to visibly carry a full wood pallet.
 // Y is vertical; the profile is drawn from the side and extruded to width.
 const profile=new THREE.Shape();
 profile.moveTo(-.79,.10);profile.lineTo(-.75,.19);
 profile.lineTo(.48,.19);profile.lineTo(.58,.31);profile.lineTo(.76,.36);
 profile.lineTo(.76,.12);profile.lineTo(-.72,.10);profile.closePath();
 const forkGeometry=new THREE.ExtrudeGeometry(profile,{
  depth:.35,steps:1,bevelEnabled:true,bevelThickness:.025,
  bevelSize:.025,bevelSegments:2,curveSegments:3
 });
 // The extrusion depth becomes the fork's physical X thickness.
 for(const side of [-1,1]){
  const fork=new THREE.Group();fork.name='widePalletJackFork';
  fork.position.x=side*.54;root.add(fork);
  const runner=new THREE.Mesh(forkGeometry,bright);
  runner.name='realPalletJackTaperedFork';
  runner.rotation.y=Math.PI/2;runner.position.set(-.18,0,-.11);
  fork.add(runner);
  const steelEdge=round(.34,.062,1.21,metal,fork);
  steelEdge.position.set(0,.21,-.03);
  const heel=round(.39,.24,.37,chassis,fork);
  heel.position.set(0,.28,.58);
  const wheelHousing=round(.36,.12,.35,rubber,fork);
  wheelHousing.position.set(0,.10,-.57);
  industrialWheel(fork,0,.16,-.59,.145);
 }
 // One sturdy rear yoke joins both forks, with reinforced side shoulders.
 part(1.60,.25,.35,chassis,0,.36,.63,'palletJackCrossYoke');
 part(1.63,.45,.55,bright,0,.48,.88,'proportionalPalletJackRearHousing');
 for(const side of [-1,1]){
  part(.24,.40,.45,chassis,side*.72,.44,.83,'palletJackFrameCheek');
  industrialWheel(root,side*.67,.265,.97,.245);
  part(.12,.12,.06,metal,side*.83,.51,.93,'palletJackAxleBolt');
 }
 // Visible hydraulic cylinder, piston and pump handle bearing.
 const pumpBase=new THREE.Mesh(new THREE.CylinderGeometry(.26,.30,.33,18),grease);
 pumpBase.name='hydraulicPumpCylinder';pumpBase.position.set(0,.82,.88);root.add(pumpBase);
 const pumpRam=new THREE.Mesh(new THREE.CylinderGeometry(.145,.17,.46,18),metal);
 pumpRam.position.set(0,1.15,.88);root.add(pumpRam);
 part(.50,.22,.36,chassis,0,.90,1.04,'palletJackPivotHousing');
 // Tilting mechanical steering tiller; dark ergonomic T-grip at adult waist.
 const tiller=new THREE.Group();tiller.name='palletJackArticulatedTiller';
 tiller.position.set(0,.94,1.05);tiller.rotation.x=.22;root.add(tiller);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.095,.13,.99,12),metal);
 stem.position.y=.49;stem.name='palletJackTillerSteelStem';tiller.add(stem);
 const handGrip=round(1.02,.15,.19,rubber,tiller);
 handGrip.position.y=1.01;handGrip.name='widePalletJackHandle';
 for(const side of [-1,1]){
  const cushion=round(.24,.18,.23,grease,tiller);
  cushion.position.set(side*.42,1.01,0);
 }
 const handLever=round(.32,.045,.13,metal,tiller);
 handLever.position.set(.17,.91,-.14);
 part(.60,.15,.06,grease,0,.68,.585,'palletJackManufacturerPlate');
 part(.39,.07,.065,metal,0,.69,.555,'palletJackSpecificationBadge');
 // Cargo stays a single proportional box-and-wood-deck assembly, and the
 // original palletCargo identifier remains usable by animations and saves.
 const cargo=new THREE.Group();cargo.name='palletCargo';
 cargo.position.set(0,.43,-.13);root.add(cargo);
 const deck=addInventoryPallet({round,parent:cargo,materials,width:1.35,depth:1.09});
 deck.name='palletJackCargoDeck';
 const box=addPackedCarton({round,parent:deck,materials,x:0,y:.68,z:0,variant:2,scale:.91});
 box.name='palletJackSizedCargoCarton';
 return root;
}
function makeClaws(){
 const groups=[];
 for(const claw of s.claws.filter(c=>c.floor===s.floor)){
  const root=new THREE.Group();getWorld().add(root);
  root.userData.keepProportion=true;root.position.set(claw.x,0,claw.z);
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
 const materials=cartonMaterials();
 for(const p of s.stockPiles.filter(q=>q.floor===s.floor&&q.count>0)){
  const g=new THREE.Group();getWorld().add(g);g.position.set(p.x,0,p.z);g.userData.pile=p;g.userData.keepProportion=true;
  if(p.crabDebris){
   // Loose products, not a packed pallet: the player can pick up each spill
   // and re-stock the emptied shelves. Scattering is seeded by floor/aisle.
   const scrap=equipmentMaterial('#8b765d',.04,.9);
   for(let i=0;i<Math.min(12,p.count);i++){
    const angle=i*2.399+((p.aisle||0)*.41),radius=.23+Math.sqrt(i)*.34;
    const product=round(.37+(i%3)*.06,.29,.38,scrap,g);
    product.name='crabSpilledProduct';
    product.position.set(Math.cos(angle)*radius,.17+((i%4)===0?.08:0),Math.sin(angle)*radius);
    product.rotation.set(i*.07,i*.49,i*.18);
   }
   items.push(g);continue;
  }
  // Player-collectible piles use the SAME cardboard, tape, carton labels,
  // barcode print and wooden pallet as the receiving stockroom's decoration.
  const pallet=addInventoryPallet({round,parent:g,materials,x:0,z:0,width:1.9,depth:1.8});
  for(let tier=0;tier<Math.min(4,Math.ceil(p.count/70));tier++){
   for(const side of [-1,1]){
    addPackedCarton({round,parent:pallet,materials,x:side*.43,y:.68+tier*.69,z:0,variant:tier+(side+1),scale:.79});
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
