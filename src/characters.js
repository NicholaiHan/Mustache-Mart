import * as THREE from 'three';
import {equipmentMaterial,industrialWheel} from './equipment.js';
// Customer-service robot (Mike) and autonomous worker machines.
export function createCharacters({add,round,toon,getWorld}){
function makeMike(x,z){
 const guy=new THREE.Group();add(guy);
 // Mike is facing the shopper: two clearly visible black dot eyes,
 // a waxed mustache, tidy green apron and a small brass nameplate.
 const torso=round(.98,1.3,.65,'#667f72',guy);torso.position.set(0,1.08,0);
 const apron=round(.73,.92,.08,'#c5cec7',guy);apron.position.set(0,1,.39);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.45,24,18),toon('#d9ad88'));
 head.position.set(0,2.04,0);guy.add(head);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.46,22,10,0,Math.PI*2,0,Math.PI*.48),toon('#46564b'));
 cap.position.set(0,2.18,0);guy.add(cap);
 const brim=round(.8,.085,.27,'#46564b',guy);brim.position.set(0,2.31,.28);
 for(const sign of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.069,12,10),toon('#202b2c'));
  eye.position.set(sign*.16,2.12,.445);guy.add(eye);
  const moustache=new THREE.Mesh(new THREE.SphereGeometry(.18,14,10),toon('#33302e'));
  moustache.scale.set(1,.47,.62);moustache.position.set(sign*.14,1.89,.435);
  moustache.rotation.z=sign*.2;guy.add(moustache);
 }
 const badge=round(.34,.15,.045,'#d5b472',guy);badge.position.set(.23,1.35,.447);
 guy.position.set(x,0,z);
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
 const crate=round(.45,.33,.39,equipmentMaterial('#b89e79',0,.75),b);
 crate.position.set(0,1.55,-.16);crate.name='crate';
 b.position.set(r.x,0,r.z);return b;
}

return {makeMike,botAppearance};
}
