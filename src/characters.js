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
 for(const sign of [-1,1]){
  const socket=new THREE.Mesh(new THREE.SphereGeometry(.12,20,14),equipmentMaterial('#486465',.2,.32));
  socket.position.set(sign*.19,.06,.486);head.add(socket);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.068,20,14),eyeWhite);
  eye.position.set(sign*.19,.06,.588);head.add(eye);
  const moustache=new THREE.Mesh(new THREE.SphereGeometry(.19,20,12),white);
  moustache.scale.set(1,.32,.5);moustache.position.set(sign*.14,-.175,.535);
  moustache.rotation.z=sign*.24;head.add(moustache);
 }
 const sideLens=round(.1,.18,.32,brass,head);sideLens.position.set(.54,-.12,0);
 const hairline=round(.77,.085,.08,brass,head);hairline.position.set(0,.4,.32);
 const badge=round(.63,.2,.055,brass,guy);badge.position.set(0,1.5,.474);
 const name=textLabel('M I K E',.55,.17,'#e8d1ac','#354146',37,'interior');
 name.position.set(0,1.51,.515);guy.add(name);
 const pedestalLight=round(.61,.07,.09,mint,guy);pedestalLight.position.set(0,.43,.45);
 guy.userData.serviceRobot=true;guy.position.set(x,0,z);
 return guy;
}

function botAppearance(r){
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
  for(const part of [...b.children])if(part.position.y>.58){
   b.remove(part);liftBody.add(part);
  }
  b.add(liftBody);
  const liftingJack=round(.16,1,.16,trim,b);liftingJack.name='liftingJack';
  liftingJack.position.set(0,.98,.12);
 }
 // Without the motorized lift, the entire robot moves up a PLAYER-PLACED ladder.
 b.position.set(r.x,0,r.z);return b;
}

return {makeMike,botAppearance};
}
