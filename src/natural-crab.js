import * as THREE from 'three';

// Organic crab model. Render-only: combat, stocking, damage and saves are owned
// by rules.mjs. Natural shell, articulated chitin legs and muscular claws use
// shared materials, so refining the creature never changes game state.
export function createNaturalCrab({getWorld,tamed=false}){
 const root=new THREE.Group();
 root.name='megaRobotCrab'; // Retained historic scene identifier for dev QA.
 getWorld().add(root);
 const shell=new THREE.MeshStandardMaterial({color:'#9f4939',roughness:.73,metalness:0,flatShading:true});
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
 // A genuinely polygonal crab shell with flat shoulders, a broad frontal
 // apron, a low crown, and an angular tapered hind edge; no spherical oval.
 const outline=[
  [-2.05,-1.63],[-1.35,-2.03],[-.47,-2.20],[.47,-2.20],
  [1.35,-2.03],[2.05,-1.63],[2.63,-.90],[2.78,-.08],
  [2.45,1.07],[1.62,1.85],[.60,2.18],[-.60,2.18],
  [-1.62,1.85],[-2.45,1.07],[-2.78,-.08],[-2.63,-.90]
 ];
 const facets=[];
 const triangle=(a,b,c)=>facets.push(...a,...b,...c);
 for(let n=0;n<outline.length;n++){
  const [x,z]=outline[n],[nx,nz]=outline[(n+1)%outline.length];
  const topA=[x,3.95-.045*Math.abs(z),z],topB=[nx,3.95-.045*Math.abs(nz),nz];
  const edgeA=[x*.96,3.39,z*.975],edgeB=[nx*.96,3.39,nz*.975];
  triangle([0,4.32,.02],topB,topA);
  triangle(topA,topB,edgeB);triangle(topA,edgeB,edgeA);
  triangle([0,3.17,.05],edgeA,edgeB);
 }
 const shellGeo=new THREE.BufferGeometry();
 shellGeo.setAttribute('position',new THREE.Float32BufferAttribute(facets,3));
 shellGeo.computeVertexNormals();
 const shellBodyMaterial=shell.clone();
 shellBodyMaterial.side=THREE.DoubleSide;
 shellBodyMaterial.flatShading=true;
 const mainShell=new THREE.Mesh(shellGeo,shellBodyMaterial);
 mainShell.name='naturalCrabShell';root.add(mainShell);
 // Subtle continuous seam lines trace the natural armored carapace. The
 // shell itself carries the color and texture: NO round plates or beads.
 const seamMaterial=new THREE.MeshStandardMaterial({color:'#7d3a30',roughness:.92,metalness:0});
 for(const side of [-1,1])for(const z of [-.82,.48]){
  branch(root,'crabCarapaceSegmentationSeam',seamMaterial,
   [side*.25,4.195,z],[side*2.16,3.89,z+.12],.021,.025);
 }
 ellipsoid(root,'naturalCrabUnderside',underside,0,3.02,.09,2.53,.56,2.09);
 ellipsoid(root,'naturalCrabFrontRim',warm,0,3.53,-1.81,2.62,.19,.34);
 // Carapace rim is a continuous smooth chitin edge, not rows of balls.
 // The polygon body already gives natural mottled highlights.
 for(const side of [-1,1]){
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
  ellipsoid(hip,'legCoxa',rusty,side*.13,0,0,.47,.35,.42);
  // Thick muscular crab legs with articulated joints and a tapered walking tip.
  const merusEnd=[side*1.11,.56,(i-1.5)*.19];
  const elbow=[side*2.13,.23,(i-1.5)*.36];
  const ankle=[side*2.60,-1.76,(i-1.5)*.43];
  const foot=[side*2.69,-3.04,(i-1.5)*.45];
  branch(hip,'legMerus',warm,[side*.12,0,0],merusEnd,.45,.35);
  ellipsoid(hip,'legJoint',joints,...merusEnd,.32,.30,.32);
  branch(hip,'legCarpus',shell,merusEnd,elbow,.38,.29);
  ellipsoid(hip,'legKnee',rusty,...elbow,.29,.28,.29);
  ellipsoid(hip,'crabLegElbowJointCollar',rusty,...elbow,.26,.14,.24);
  branch(hip,'legPropodus',warm,elbow,ankle,.30,.19);
  ellipsoid(hip,'legAnkle',joints,...ankle,.20,.20,.19);
  ellipsoid(hip,'crabLegAnkleJointCollar',rusty,...ankle,.20,.12,.18);
  branch(hip,'legDactylus',pale,ankle,foot,.175,.045);
   legs.push({joint:hip,index:i,side});
 }
 const jaws=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.name='livingCrabClaw';root.add(arm);
  arm.position.set(side*1.94,3.05,-1.39);
  // A large crusher on the right, a narrow cutter on the left.
  if(side===1){arm.scale.set(1.18,1.14,1.16);arm.userData.crusherClaw=true;}
  else{arm.scale.set(1.04,1.08,1.08);arm.userData.cutterClaw=true;}
  ellipsoid(arm,'clawShoulder',rusty,side*.13,0,0,.59,.50,.52);
  branch(arm,'clawArm',warm,[side*.11,0,0],[side*1.24,-.15,-.72],.55,.43);
  ellipsoid(arm,'clawPalm',shell,side*1.45,-.15,-.95,1.08,.69,.89);
  // Two independently curving cuticle fingers taper toward pointed ends.
  for(const sign of [-1,1]){
   const grip=new THREE.Group();grip.name='crabOrganicPincerFinger';
   grip.position.set(side*1.93,-.15+sign*.25,-1.34);arm.add(grip);
   const b=[side*.33,sign*.28,-.40],c=[side*.48,sign*.21,-.98];
   branch(grip,'curvingClawFinger',sign===1?shell:pale,[0,0,0],b,.34,.25);
   branch(grip,'taperedClawTip',sign===1?shell:pale,b,c,.25,.055);
   for(let n=0;n<3;n++){
    ellipsoid(grip,'pincerTooth',underside,
     side*(.14+n*.11),sign*(.24-n*.013),-.31-n*.18,.08,.055,.095);
   }
  }
  jaws.push(arm);
 }
 // Natural cuticle markings belong to the continuous carapace material.
 // No round shell nodules, rings, spots, oval gill decals or pincer beads.
 // Tough, attached mandibles and defined brow remain anatomical, not trim.
 const blackShell=new THREE.MeshStandardMaterial({color:'#53231e',roughness:.94,metalness:0});
 for(const side of [-1,1]){
  branch(root,'naturalCrabMandiblePlate',underside,[side*.63,3.06,-1.98],
   [side*.75,2.83,-2.23],.17,.085);
  const brow=ellipsoid(root,'naturalCrabHeavyBrow',blackShell,
   side*1.45,4.19,-1.80,.43,.14,.20);
  brow.rotation.z=-side*.14;
 }
 // A tamed crab gets a simple leather riding pad and rope grip, never
 // robotic armor or an engine. Saddle is cosmetic; purchasing controls AI.
 if(tamed){
  const leather=new THREE.MeshStandardMaterial({color:'#514037',roughness:.93,metalness:0});
  const rope=new THREE.MeshStandardMaterial({color:'#ad956d',roughness:.97,metalness:0});
  const pad=ellipsoid(root,'crabKingRidingSaddle',leather,0,4.28,.40,1.24,.23,1.13);
  pad.rotation.x=.05;
  for(const side of [-1,1]){
   const strap=ellipsoid(root,'crabKingRopeStrap',rope,side*1.11,4.13,.43,.075,.18,1.05);
   strap.rotation.z=side*.09;
  }
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.38,.057,8,22,Math.PI),rope);
  handle.name='crabKingSaddleHandle';handle.rotation.x=Math.PI/2;
  handle.position.set(0,4.61,-.23);root.add(handle);
 }
 root.userData.tamed=tamed;
 root.userData.legs=legs;root.userData.jaws=jaws;
 root.userData.warningLights=[]; // Living crab has no robotic warning LEDs.
 root.userData.organicCrab=true;
 root.userData.detailStats={legs:8,claws:2,organic:true,metalParts:0};
 return root;
}
