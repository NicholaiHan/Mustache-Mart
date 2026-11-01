import * as THREE from 'three';
import {equipmentMaterial,industrialWheel} from './equipment.js';
// Customer-service robot (Mike) and autonomous worker machines.
export function createCharacters({s,add,round,toon,textLabel,getWorld}){
function makeMike(x,z){
 // MUSTACHE MIKE: a stationary, premium concierge robot, intentionally unlike
 // wheeled stocker bots. Ceramic chassis, expressively lit face and articulated arms.
 const guy=new THREE.Group();add(guy);
 const pearl=equipmentMaterial('#e5e9e5',.24,.27);
 const enamel=equipmentMaterial('#f3efe4',.11,.34);
 const trim=equipmentMaterial('#687779',.58,.29);
 const graphite=equipmentMaterial('#17282d',.24,.26);
 const white=equipmentMaterial('#f8faf7',.04,.32);
 const brass=equipmentMaterial('#bd925e',.55,.3);
 const mint=new THREE.MeshStandardMaterial({color:'#a7e7de',emissive:'#69d4c3',emissiveIntensity:1.6,roughness:.25});
 const eyeWhite=new THREE.MeshBasicMaterial({color:'#ffffff'});
 const base=round(1.18,.27,1.0,graphite,guy);base.position.set(0,.15,0);
 const foot=round(1.04,.31,.84,trim,guy);foot.position.set(0,.43,0);
 const center=round(.55,.83,.54,graphite,guy);center.position.set(0,.91,0);
 for(const zoff of [-.24,.24]){
   const piston=new THREE.Mesh(new THREE.CylinderGeometry(.095,.11,.82,14),trim);
   piston.position.set(0,1.02,zoff);guy.add(piston);
 }
 const torso=round(1.16,1.37,.78,pearl,guy);torso.position.set(0,1.77,0);
 const waist=round(.95,.15,.71,brass,guy);waist.position.set(0,1.15,0);
 const chest=round(.93,.7,.09,enamel,guy);chest.position.set(0,1.83,.4);
 const inset=round(.67,.25,.055,graphite,guy);inset.position.set(0,1.95,.474);
 const signal=round(.32,.08,.059,mint,guy);signal.position.set(0,1.99,.514);
 for(const sign of [-1,1]){
   const shoulder=new THREE.Mesh(new THREE.SphereGeometry(.24,20,16),trim);
   shoulder.position.set(sign*.67,2.1,0);guy.add(shoulder);
   const arm=round(.27,.84,.35,pearl,guy);arm.position.set(sign*.78,1.65,.02);
   const cuff=round(.3,.12,.38,brass,guy);cuff.position.set(sign*.78,1.28,.02);
   const hand=round(.29,.28,.37,graphite,guy);hand.position.set(sign*.78,1.1,.02);
 }
 const neck=round(.4,.36,.42,graphite,guy);neck.position.set(0,2.57,0);
 const ring=round(.57,.12,.5,brass,guy);ring.position.set(0,2.68,0);
 const head=new THREE.Group();head.name='mikeServoHead';guy.add(head);head.position.set(0,2.93,0);
 const skull=round(1.06,.91,.83,pearl,head);skull.position.set(0,0,0);
 const brow=round(.91,.14,.89,enamel,head);brow.position.set(0,.39,.01);
 const face=round(.88,.57,.064,graphite,head);face.position.set(0,-.035,.437);
 // Two flat, high-contrast digital pixel matrices embedded in the faceplate.
 // No raised eyeballs or spherical sockets: the LEDs are a single flush layer.
 const eyeOn=new THREE.MeshBasicMaterial({color:'#ebffff'});
 const eyeOff=new THREE.MeshBasicMaterial({color:'#365458'});
 const ledFrame=round(.76,.30,.015,trim,head);ledFrame.position.set(0,.065,.483);
 const ledScreen=round(.72,.25,.01,graphite,head);ledScreen.position.set(0,.065,.495);
 for(const sign of [-1,1]){
  const bx=sign*.185;
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   const lit=(row===1)||(row===0&&(col===1||col===2));
   const cell=round(.037,.039,.002,lit?eyeOn:eyeOff,head);
   cell.position.set(bx+(col-1.5)*.049,.066+(row-1)*.054,.508);
  }
  // Flat white twin-tip mustache on the front glass, not an extruded bulb.
  const wing=round(.24,.043,.012,white,head);
  wing.position.set(sign*.147,-.195,.515);
  wing.rotation.z=-sign*.27;
  const point=round(.09,.035,.012,white,head);point.position.set(sign*.32,-.172,.515);
  point.rotation.z=sign*.22;
 }
 const mouthLED=round(.18,.018,.01,mint,head);mouthLED.position.set(0,-.285,.505);
 const sideLens=round(.1,.18,.32,brass,head);sideLens.position.set(.54,-.12,0);
 const hairline=round(.77,.085,.08,brass,head);hairline.position.set(0,.4,.32);
 const badge=round(.63,.2,.055,brass,guy);badge.position.set(0,1.5,.474);
 const name=textLabel('M I K E',.55,.17,'#e8d1ac','#354146',37,'interior');
 name.position.set(0,1.51,.515);guy.add(name);
 const pedestalLight=round(.61,.07,.09,mint,guy);pedestalLight.position.set(0,.43,.45);
 guy.userData.serviceRobot=true;guy.position.set(x,0,z);
 return guy;
}


// Boss hazard: a giant industrial robot crab, about 10m across with active
// jointed legs and oversized hydraulic pincers. Only one model on the
// currently viewed floor is rendered; the rules track all floors independently.
function makeMegaCrab(){
 const root=new THREE.Group();root.name='megaRobotCrab';getWorld().add(root);
 const shell=equipmentMaterial('#9a3d31',.62,.29);
 const bright=equipmentMaterial('#d36341',.45,.38);
 const dark=equipmentMaterial('#28363a',.58,.38);
 const steel=equipmentMaterial('#aab9b8',.82,.23);
 const gold=equipmentMaterial('#dca94d',.68,.27);
 const glow=new THREE.MeshBasicMaterial({color:'#fb8d52'});
 const body=new THREE.Mesh(new THREE.SphereGeometry(2.45,24,16),shell);
 body.scale.set(1.35,.64,1.05);body.position.y=3.4;root.add(body);
 const armor=round(4.1,.28,3.75,bright,root);armor.position.set(0,4.16,.08);
 for(const side of [-1,1]){
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),glow);
  lens.position.set(side*1.26,3.76,-1.65);root.add(lens);
  const brow=round(.96,.16,.31,dark,root);brow.position.set(side*1.28,4.18,-1.62);
 }
 const jaws=[],legs=[];
 for(const side of [-1,1]){
  for(let i=0;i<4;i++){
   const hip=new THREE.Group();hip.position.set(side*2.0,3.36,-1.7+i*1.17);root.add(hip);
   const upper=round(2.75,.34,.42,steel,hip);
   upper.position.set(side*1.35,-.34,0);upper.rotation.z=side*.35;
   const piston=round(1.22,.23,.28,gold,hip);piston.position.set(side*1.85,-.6,0);
   const knee=new THREE.Mesh(new THREE.SphereGeometry(.36,12,10),dark);
   knee.position.set(side*2.6,-.86,0);hip.add(knee);
   const shin=round(.39,2.45,.38,shell,hip);shin.position.set(side*2.77,-2.0,0);shin.rotation.z=-side*.16;
   const foot=round(.72,.28,.9,dark,hip);foot.position.set(side*2.87,-3.09,.08);
   legs.push({joint:hip,index:i,side});
  }
  const arm=new THREE.Group();arm.position.set(side*2.05,3.54,-1.55);root.add(arm);
  const forearm=round(2.85,.49,.67,steel,arm);forearm.position.set(side*1.25,-.1,-.49);
  const grip=new THREE.Group();grip.position.set(side*2.7,-.12,-.52);arm.add(grip);
  const pincer=round(1.46,.77,1.2,bright,grip);pincer.position.set(side*.27,0,-.38);
  for(const sign of [-1,1]){
   const tooth=round(.28,.59,1.0,dark,grip);
   tooth.position.set(side*.88,sign*.37,-1.10);tooth.rotation.y=sign*.25;
  }
  const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.14,10),gold);
  bolt.rotation.z=Math.PI/2;bolt.position.set(side*.2,.4,-.05);grip.add(bolt);
  jaws.push(arm);
 }
 const spine=round(3.5,.32,.38,dark,root);spine.position.set(0,4.0,1.08);
 for(let i=0;i<6;i++){
  const light=round(.24,.09,.10,gold,root);light.position.set(-1.5+i*.61,4.23,.92);
 }
 // Distinct mechanical components give the compact crab believable weight
 // without making its walking/attack hitbox larger. Materials are shared and
 // small rivets use a single InstancedMesh rather than hundreds of draw calls.
 const titanium=equipmentMaterial('#aabdc0',.82,.25);
 const burntMetal=equipmentMaterial('#3d464d',.75,.36);
 const polished=equipmentMaterial('#e4d8bb',.82,.23);
 const oilBlack=equipmentMaterial('#19292d',.42,.43);
 const cautionYellow=equipmentMaterial('#f2c659',.42,.33);
 const deepRed=equipmentMaterial('#772b2c',.59,.31);
 const ledAmber=new THREE.MeshStandardMaterial({color:'#f8b94b',emissive:'#f18419',emissiveIntensity:1.45,roughness:.24});
 const ledAqua=new THREE.MeshStandardMaterial({color:'#95e9e7',emissive:'#52bdb4',emissiveIntensity:1.32,roughness:.24});
 const rigidLink=(parent,a,b,radius,material,name)=>{
  const delta=new THREE.Vector3().subVectors(b,a),center=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),10),material);
  rod.position.copy(center);rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  rod.name=name;parent.add(rod);return rod;
 };
 // Stepped, overlapping titanium carapace sections and deeply set rear shell
 // fins make the body read as plated industrial machinery, not a plastic ball.
 const armorPlates=[];
 for(let i=0;i<5;i++){
  const z=-1.41+i*.70;
  const width=i===0||i===4?2.90:3.54;
  const plate=round(width,.14,.57,i%2===0?deepRed:shell,root);
  plate.name='crabSegmentedCarapace';
  plate.position.set(0,4.335,z);plate.rotation.x=(2-i)*.055;
  armorPlates.push(plate);
  for(const side of [-1,1]){
   const brace=round(.11,.10,.54,titanium,root);
   brace.position.set(side*(width/2-.14),4.43,z);
  }
 }
 for(const side of [-1,1]){
  // Raised side armor protects independent power packs and incorporates
  // louvered vents, recessed seams, and a replaceable access door.
  const panel=round(.28,.89,2.44,deepRed,root);
  panel.name='crabSideArmorPanel';panel.position.set(side*2.82,3.48,.30);
  const hatch=round(.09,.52,1.19,burntMetal,root);
  hatch.position.set(side*2.99,3.48,.34);
  const hinge=round(.10,.71,.11,polished,root);
  hinge.position.set(side*3.045,3.5,1.01);
  for(let i=0;i<6;i++){
   const slit=round(.035,.06,1.12,oilBlack,root);
   slit.name='crabCoolingVent';slit.position.set(side*3.054,3.22+i*.11,.31);
  }
  // Glow-rim eye sockets and transparent sensor lenses.
  const lensRing=new THREE.Mesh(new THREE.TorusGeometry(.45,.065,8,24),titanium);
  lensRing.name='crabEyeBezel';lensRing.position.set(side*1.26,3.76,-2.03);root.add(lensRing);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),ledAqua);
  pupil.name='crabOpticalSensor';pupil.position.set(side*1.26,3.76,-2.11);root.add(pupil);
  // Front folding mandibles with exposed pivot/collars.
  const mandible=round(.17,.41,.93,titanium,root);
  mandible.name='crabRetractableMandible';mandible.position.set(side*.63,3.04,-2.23);
  mandible.rotation.y=side*.37;
  const jawTip=round(.22,.24,.37,polished,root);
  jawTip.position.set(side*.88,2.88,-2.67);
 }
 // Engine vents and rear power-cell exhaust plumbing remain under the shell.
 const engine=round(1.54,.39,.72,oilBlack,root);engine.position.set(0,3.64,2.09);
 engine.name='crabEngineCore';
 for(const side of [-1,1]){
  const exhaust=round(.27,.68,.85,burntMetal,root);
  exhaust.name='crabRearExhaust';exhaust.position.set(side*.57,3.80,2.20);
  for(let fin=0;fin<4;fin++){
   const grille=round(.34,.045,.72,titanium,root);
   grille.name='crabExhaustLouver';grille.position.set(side*.57,3.53+fin*.15,2.61);
  }
 }
 // Functional hydraulic rams, cable conduits, hinge gears and layered
 // stabilizing footplates follow every animated leg assembly automatically.
 for(const leg of legs){
  const hip=leg.joint,side=leg.side;
  const gear=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.15,16),burntMetal);
  gear.name='crabLegDriveGear';gear.rotation.x=Math.PI/2;
  gear.position.set(side*.33,-.06,0);hip.add(gear);
  const gearHub=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.19,12),polished);
  gearHub.rotation.x=Math.PI/2;gearHub.position.set(side*.33,-.06,.08);hip.add(gearHub);
  const actuator=rigidLink(hip,
   new THREE.Vector3(side*.73,-.22,-.13),
   new THREE.Vector3(side*2.28,-.74,-.13),.11,oilBlack,'crabHydraulicCylinder');
  actuator.userData.mechanical=true;
  rigidLink(hip,
   new THREE.Vector3(side*1.23,-.37,-.13),
   new THREE.Vector3(side*2.40,-.78,-.13),.055,polished,'crabPolishedPistonRod');
  const kneecap=new THREE.Mesh(new THREE.SphereGeometry(.31,12,10),titanium);
  kneecap.name='crabServoKnee';kneecap.position.set(side*2.60,-.86,.21);hip.add(kneecap);
  const shinPlate=round(.42,1.45,.13,deepRed,hip);
  shinPlate.name='crabShinArmor';shinPlate.position.set(side*2.78,-1.79,-.21);
  shinPlate.rotation.z=-side*.16;
  const toe=round(.88,.14,.96,titanium,hip);
  toe.name='crabStabilizerFoot';toe.position.set(side*2.87,-3.12,-.13);
  for(const z of [-.24,.24]){
   const hingeBolt=new THREE.Mesh(new THREE.CylinderGeometry(.115,.115,.12,10),polished);
   hingeBolt.name='crabKneeBolt';hingeBolt.rotation.x=Math.PI/2;
   hingeBolt.position.set(side*2.62,-.86,z);hip.add(hingeBolt);
  }
 }
 // Claws are made of replaceable alloy plates with actual pivot joints,
 // opposing serrated jaws, safety stripes and external hydraulic feedlines.
 for(let i=0;i<jaws.length;i++){
  const arm=jaws[i],side=i===0?-1:1;
  const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.32,18),burntMetal);
  shoulder.name='crabPincerRotaryJoint';shoulder.rotation.x=Math.PI/2;
  shoulder.position.set(0,.03,-.07);arm.add(shoulder);
  const seal=new THREE.Mesh(new THREE.TorusGeometry(.34,.06,8,20),cautionYellow);
  seal.position.set(0,.03,-.25);arm.add(seal);
  rigidLink(arm,
   new THREE.Vector3(side*.37,.12,-.28),
   new THREE.Vector3(side*2.32,-.02,-.68),.095,oilBlack,'crabPincerHydraulicTube');
  rigidLink(arm,
   new THREE.Vector3(side*1.14,.11,-.50),
   new THREE.Vector3(side*2.4,-.02,-.69),.045,polished,'crabPincerHydraulicRod');
  for(let n=0;n<3;n++){
   const hazard=round(.10,.105,.74,cautionYellow,arm);
   hazard.name='crabClawSafetyStripe';
   hazard.position.set(side*(1.13+n*.4),.19,-.51);
   hazard.rotation.y=side*.42;
  }
  const grip=arm.children.find(child=>child.type==='Group');
  if(grip){
   for(const sign of [-1,1])for(let tooth=0;tooth<3;tooth++){
    const cutter=round(.18,.15,.20,polished,grip);
    cutter.name='crabSerratedPincerTeeth';
    cutter.position.set(side*.89,sign*.35,-1.17-tooth*.23);
   }
   const pistonCover=round(.58,.20,.62,titanium,grip);
   pistonCover.name='crabClawServicePanel';pistonCover.position.set(side*.26,.46,-.22);
  }
 }
 // Scattered tiny maintenance fasteners are batched into one instanced mesh.
 // All coordinates remain relative to the existing physical crab.
 const rivetGeo=new THREE.CylinderGeometry(.055,.055,.039,8);
 const rivets=new THREE.InstancedMesh(rivetGeo,polished,130);
 rivets.name='crabArmorRivets';rivets.count=0;
 const rivetPose=new THREE.Object3D();
 function addRivet(x,y,z,rotX=0){
  if(rivets.count>=130)return;
  rivetPose.position.set(x,y,z);rivetPose.rotation.set(rotX,0,0);
  rivetPose.updateMatrix();rivets.setMatrixAt(rivets.count++,rivetPose.matrix);
 }
 for(let i=0;i<5;i++)for(const side of [-1,1])for(const offset of [-.14,.14]){
  const z=-1.41+i*.70,half=(i===0||i===4?2.90:3.54)/2;
  addRivet(side*(half-.18),4.438,z+offset);
 }
 for(const side of [-1,1])for(let i=0;i<8;i++){
  const z=-.69+i*.28;
  addRivet(side*3.06,3.98,z,Math.PI/2);
  addRivet(side*3.06,3.06,z,Math.PI/2);
 }
 rivets.instanceMatrix.needsUpdate=true;rivets.frustumCulled=false;root.add(rivets);
 // Four warning beacons pulse just before / during the singular claw strike.
 const warningLights=[];
 for(const side of [-1,1])for(const z of [-1.3,1.3]){
  const base=round(.31,.12,.34,burntMetal,root);
  base.position.set(side*1.48,4.51,z);
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.13,10,9),ledAmber);
  lens.name='crabAnimatedWarningBeacon';
  lens.position.set(side*1.48,4.63,z);root.add(lens);warningLights.push(lens);
 }
 // These dynamic parts live on the root so the existing animation loop can
 // toggle beacons without allocating geometry or updating any save fields.
 root.userData.warningLights=warningLights;
 root.userData.detailStats={plates:armorPlates.length,legHydraulics:legs.length,
  pincerJoints:jaws.length,rivets:rivets.count,ventSlits:12,beacons:warningLights.length};

 root.userData.legs=legs;root.userData.jaws=jaws;
 root.userData.animationSpeed=2.0;
 return root;
}
// Comedic, irreparable wreck: detached, cracked head on the floor, a tall
// exposed coiled spring instead of a neck, and scattered screws and bolts.
function wreckedBotAppearance(robot){
 const root=new THREE.Group();getWorld().add(root);
 root.name='crabDestroyedStocker';root.userData.wrecked=true;
 const shell=equipmentMaterial('#b9c5c2',.28,.44);
 const steel=equipmentMaterial('#d6d5d0',.84,.25);
 const dark=equipmentMaterial('#28353b',.27,.55);
 const rust=equipmentMaterial('#b05f3c',.38,.51);
 const body=round(.93,.83,.91,shell,root);body.position.set(0,.78,0);body.rotation.z=-.12;
 const trim=round(1.0,.19,.96,dark,root);trim.position.set(0,.44,0);
 for(const side of [-1,1]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.17,12),dark);
  wheel.rotation.z=Math.PI/2;wheel.position.set(side*.48,.24,.3);root.add(wheel);
 }
 const springPoints=[];
 for(let i=0;i<=100;i++){
  const t=i/100,angle=t*13*Math.PI*2;
  springPoints.push(new THREE.Vector3(Math.cos(angle)*.23,1.2+t*1.62,Math.sin(angle)*.23));
 }
 const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),240,.078,7,false),steel);
 spring.name='comedicBodySpring';root.add(spring);
 const head=new THREE.Group();head.name='detachedRobotHead';head.position.set(.82,.40,-.83);head.rotation.set(.15,.33,-.62);root.add(head);
 const casing=round(.76,.55,.68,shell,head);
 const visor=round(.65,.29,.08,dark,head);visor.position.set(0,.07,-.37);
 for(const side of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:'#a8eee6'}));
  eye.position.set(side*.16,.11,-.42);head.add(eye);
  const stache=round(.24,.06,.035,dark,head);stache.position.set(side*.13,-.13,-.414);stache.rotation.z=side*.3;
 }
 // Wide cracks show that the head cannot be repaired.
 for(const side of [-1,1]){
  const crack=round(.025,.22,.031,rust,head);
  crack.position.set(side*.25,-.05,-.417);crack.rotation.z=side*.33;
 }
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11,dist=.84+(i%4)*.21;
  const bolt=i%2===0?new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.17,8),steel):
   new THREE.Mesh(new THREE.BoxGeometry(.17,.08,.11),rust);
  bolt.name=i%2===0?'looseBolt':'looseScrew';
  bolt.rotation.set(.8*i,.3*i,.18*i);
  bolt.position.set(Math.cos(a)*dist,.10,Math.sin(a)*dist);root.add(bolt);
 }
 const warning=new THREE.Mesh(new THREE.SphereGeometry(.14,10,9),new THREE.MeshBasicMaterial({color:'#ff4636'}));
 warning.position.set(0,1.19,0);root.add(warning);
 root.position.set(robot.x,0,robot.z);return root;
}

function botAppearance(r){
 if(r.wrecked)return wreckedBotAppearance(r);
 const b=new THREE.Group();getWorld().add(b);
 const shell=equipmentMaterial('#e0e1db',.16,.37);
 const trim=equipmentMaterial('#677476',.35,.38);
 const black=equipmentMaterial('#252c31',.05,.45);
 const orange=equipmentMaterial('#c57d3c',.18,.4);
 const frame=round(.95,.36,.98,black,b);frame.position.y=.43;
 const body=round(.86,.75,.88,shell,b);body.position.y=.88;
 const shoulder=round(.79,.15,.78,trim,b);shoulder.position.y=1.27;
 const head=round(.69,.51,.65,shell,b);head.position.y=1.57;
 const visor=round(.59,.29,.07,black,b);visor.position.set(0,1.59,-.34);
 for(const side of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.073,16,12),new THREE.MeshBasicMaterial({color:'#a3d8d5'}));
  eye.position.set(side*.16,1.64,-.388);b.add(eye);
  const stache=new THREE.Mesh(new THREE.SphereGeometry(.155,16,12),black);
  stache.scale.set(1,.33,.5);stache.position.set(side*.13,1.46,-.39);
  stache.rotation.z=side*.22;b.add(stache);
  industrialWheel(b,side*.48,.27,-.3,.22);
  industrialWheel(b,side*.48,.27,.32,.22);
  const arm=round(.16,.48,.18,trim,b);arm.position.set(side*.54,1.01,-.06);
 }
 const light=round(.26,.08,.12,orange,b);light.position.set(0,1.84,-.07);
 // A prominent fault lamp stays on the chassis even when the lifting mast rises.
 const repairBeacon=new THREE.Mesh(
  new THREE.SphereGeometry(.16,14,10),
  new THREE.MeshBasicMaterial({color:'#f15b42'})
 );
 repairBeacon.name='repairBeacon';repairBeacon.position.set(0,2.07,0);repairBeacon.visible=false;b.add(repairBeacon);
 const alarmBase=round(.32,.09,.32,trim,b);alarmBase.position.set(0,1.94,0);
 const hatch=round(.55,.07,.44,trim,b);hatch.position.set(0,1.31,.13);
 if(s.levels.robotLift){
  // Compact motorized scissor lift; only the robots have this mechanism.
  for(const side of [-1,1]){
   const mast=round(.085,1.26,.1,trim,b);mast.position.set(side*.29,1.5,.34);
   const actuator=round(.1,.66,.1,orange,b);actuator.position.set(side*.29,1.7,.4);
  }
  const platform=round(.77,.09,.7,shell,b);platform.position.set(0,2.13,.06);
  const caution=round(.66,.065,.12,orange,b);caution.position.set(0,2.21,-.26);
 }
 const crate=round(.45,.33,.39,equipmentMaterial('#b89e79',0,.75),b);
 crate.position.set(0,1.55,-.16);crate.name='crate';
 if(s.levels.robotLift){
  // Motorized lift: wheels stay planted while the upper robot rises.
  const liftBody=new THREE.Group();liftBody.name='liftBody';
  for(const part of [...b.children])if(part.position.y>.58&&part.name!=='repairBeacon'){
   b.remove(part);liftBody.add(part);
  }
  b.add(liftBody);
  const liftingJack=round(.16,1,.16,trim,b);liftingJack.name='liftingJack';
  liftingJack.position.set(0,.98,.12);
 }
 // Without the motorized lift, the entire robot moves up a PLAYER-PLACED ladder.
 b.position.set(r.x,0,r.z);return b;
}

return {makeMike,botAppearance,makeMegaCrab};
}
