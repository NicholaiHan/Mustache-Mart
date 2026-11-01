import * as THREE from 'three';

// Organic crab model. Render-only: combat, stocking, damage and saves are owned
// by rules.mjs. Natural shell, articulated chitin legs and muscular claws use
// shared materials, so refining the creature never changes game state.
export function createNaturalCrab({getWorld}){
 const root=new THREE.Group();
 root.name='megaRobotCrab'; // Retained historic scene identifier for dev QA.
 getWorld().add(root);
 const shell=new THREE.MeshStandardMaterial({color:'#9f4939',roughness:.73,metalness:0});
 const rusty=new THREE.MeshStandardMaterial({color:'#7c352b',roughness:.82,metalness:0});
 const warm=new THREE.MeshStandardMaterial({color:'#c87451',roughness:.78,metalness:0});
 const pale=new THREE.MeshStandardMaterial({color:'#e3b58c',roughness:.86,metalness:0});
 const underside=new THREE.MeshStandardMaterial({color:'#d0a58a',roughness:.9,metalness:0});
 const joints=new THREE.MeshStandardMaterial({color:'#63372d',roughness:.88,metalness:0});
 const ebony=new THREE.MeshStandardMaterial({color:'#191a14',roughness:.24,metalness:0});
 const glint=new THREE.MeshStandardMaterial({color:'#f5dfbd',roughness:.39,metalness:0});
 const sphere=new THREE.SphereGeometry(1,20,14);
 function ellipsoid(parent,name,material,x,y,z,sx,sy,sz){
  const mesh=new THREE.Mesh(sphere,material);mesh.name=name;
  mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
  parent.add(mesh);return mesh;
 }
 function branch(parent,name,material,a,b,r1,r2){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),dif=to.clone().sub(from);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,dif.length(),10,1),material);
  mesh.name=name;mesh.position.copy(from.add(to).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dif.normalize());
  parent.add(mesh);return mesh;
 }
 // Asymmetrical domed carapace and pale abdominal apron; nonmetallic, matte.
 ellipsoid(root,'naturalCrabShell',shell,0,3.54,.06,2.92,.94,2.24);
 ellipsoid(root,'naturalCrabUnderside',underside,0,3.04,.09,2.45,.52,1.93);
 ellipsoid(root,'naturalCrabFrontRim',warm,0,3.54,-1.73,2.55,.25,.43);
 for(let i=0;i<7;i++){
  const t=(i-3)/3;
  const patch=ellipsoid(root,'naturalCarapaceMottle',i%2?rusty:warm,
    t*2.1,4.20-.12*t*t,-.1+(i%3)*.44,.31,.08,.46);
  patch.rotation.y=.15*t;
 }
 for(const side of [-1,1]){
  // Serrated shell edge, natural dark pigment and clustered rough bumps.
  for(let i=0;i<7;i++){
   const z=-1.53+i*.48;
   const bump=ellipsoid(root,'carapaceRidgeBump',i%3===0?pale:rusty,
    side*(2.51-.20*Math.abs((i-3)/4)),3.65,z,.19,.13,.22);
   bump.rotation.z=side*.2;
  }
  for(let i=0;i<18;i++){
   const angle=i*2.399+side;
   ellipsoid(root,'naturalShellFreckle',i%4===0?pale:rusty,
    side*(.3+Math.abs(Math.cos(angle))*2),4.28-.1*Math.abs(Math.cos(angle)),
    Math.sin(angle)*1.47,.055+(i%3)*.018,.035,.08);
  }
  // Two eyes on organic stalks and wet-looking black pupils.
  const eye=new THREE.Group();eye.name='crabEyeStalk';root.add(eye);
  eye.position.set(side*1.43,3.65,-1.48);
  branch(eye,'eyestalk',warm,[0,0,0],[side*.09,.52,-.18],.12,.15);
  ellipsoid(eye,'eyebulb',shell,side*.09,.53,-.23,.29,.23,.29);
  ellipsoid(eye,'livingEye',ebony,side*.09,.54,-.46,.22,.19,.12);
  ellipsoid(eye,'eyeReflection',glint,side*.16,.63,-.54,.063,.048,.019);
 }
 // Six flexible mouthparts around the mandibles.
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.25;
  const feeler=ellipsoid(root,'movingCrabMouthpart',i%2?pale:warm,
   x,2.92,-1.86,.10,.32,.11);
  feeler.rotation.z=(i-2.5)*.13;
 }
 const legs=[];
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const z=-1.25+i*.86,hip=new THREE.Group();
  hip.name='naturalCrabWalkingLeg';hip.position.set(side*2.22,3.22,z);root.add(hip);
  ellipsoid(hip,'legCoxa',rusty,side*.13,0,0,.38,.27,.34);
  const middle=[side*1.26,.13,(i-1.5)*.19];
  const knee=[side*2.24,-.68,(i-1.5)*.22];
  const toe=[side*2.53,-2.71,(i-1.5)*.24];
  branch(hip,'legMerus',warm,[side*.12,0,0],middle,.31,.25);
  ellipsoid(hip,'legJoint',joints,...middle,.28,.24,.25);
  branch(hip,'legCarpus',shell,middle,knee,.25,.19);
  ellipsoid(hip,'legKnee',rusty,...knee,.26,.24,.24);
  branch(hip,'legDactylus',warm,knee,toe,.17,.075);
  branch(hip,'livingCrabFoot',pale,toe,[side*2.60,-3.04,(i-1.5)*.24],.075,.018);
  // Exoskeletal ridges follow the flexible upper leg instead of steel rods.
  for(let r=0;r<3;r++){
   const t=(r+1)/4;
   const a=side*(.12+(1.26-.12)*t),y=.13*t,zr=(i-1.5)*.19*t;
   const rib=ellipsoid(hip,'legCuticleRidge',rusty,a,y+.04,zr,.15,.1,.17);
   rib.rotation.z=side*.12;
  }
  legs.push({joint:hip,index:i,side});
 }
 const jaws=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.name='livingCrabClaw';root.add(arm);
  arm.position.set(side*1.94,3.05,-1.39);
  ellipsoid(arm,'clawShoulder',rusty,side*.13,0,0,.46,.42,.45);
  branch(arm,'clawArm',warm,[side*.11,0,0],[side*1.24,-.15,-.72],.41,.32);
  ellipsoid(arm,'clawPalm',shell,side*1.45,-.15,-.95,.91,.52,.71);
  // Two independently curving cuticle fingers taper toward pointed ends.
  for(const sign of [-1,1]){
   const grip=new THREE.Group();grip.name='crabOrganicPincerFinger';
   grip.position.set(side*1.93,-.15+sign*.25,-1.34);arm.add(grip);
   const b=[side*.33,sign*.28,-.40],c=[side*.48,sign*.21,-.98];
   branch(grip,'curvingClawFinger',sign===1?shell:pale,[0,0,0],b,.27,.18);
   branch(grip,'taperedClawTip',sign===1?shell:pale,b,c,.18,.015);
   for(let n=0;n<3;n++){
    ellipsoid(grip,'pincerTooth',underside,
     side*(.14+n*.11),sign*(.24-n*.013),-.31-n*.18,.08,.055,.095);
   }
  }
  for(let i=0;i<5;i++){
   const wart=ellipsoid(arm,'clawTextureNodule',i%2?warm:rusty,
    side*(1.10+i*.15),.32,-.85+i*.13,.1,.065,.12);
   wart.rotation.y=side*.23;
  }
  jaws.push(arm);
 }
 root.userData.legs=legs;root.userData.jaws=jaws;
 root.userData.warningLights=[]; // Living crab has no robotic warning LEDs.
 root.userData.organicCrab=true;
 root.userData.detailStats={legs:8,claws:2,organic:true,metalParts:0};
 return root;
}
