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
 // Multiple low-profile, articulated-looking carapace scutes give the top
 // recognizable crab segmentation without spikes, spikes, or a metal body.
 const scuteMaterial=new THREE.MeshStandardMaterial({color:'#b75f46',roughness:.86,metalness:0,flatShading:true});
 const seamMaterial=new THREE.MeshStandardMaterial({color:'#6b322a',roughness:.89,metalness:0});
 for(const z of [-1.05,-.12,.82])for(const x of [-1.36,0,1.36]){
  const scute=new THREE.Mesh(new THREE.CylinderGeometry(.61,.68,.105,6,1),scuteMaterial);
  scute.name='crabAngularCarapaceScute';
  scute.scale.set(1.15,1,.82);
  scute.position.set(x,4.11-.07*(Math.abs(x)/1.36),z);
  scute.rotation.y=x*.11;root.add(scute);
 }
 for(const side of [-1,1])for(const z of [-.95,.05,1.02]){
  branch(root,'crabCarapaceSegmentationSeam',seamMaterial,
   [side*.35,4.20,z],[side*2.25,3.89,z+.10],.034,.030);
 }
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
  // True bent crab legs, with raised shoulder, wide elbow and thin walking tip.
  const merusEnd=[side*1.11,.56,(i-1.5)*.19];
  const elbow=[side*2.13,.23,(i-1.5)*.36];
  const ankle=[side*2.60,-1.76,(i-1.5)*.43];
  const foot=[side*2.69,-3.04,(i-1.5)*.45];
  branch(hip,'legMerus',warm,[side*.12,0,0],merusEnd,.34,.28);
  ellipsoid(hip,'legJoint',joints,...merusEnd,.30,.26,.29);
  branch(hip,'legCarpus',shell,merusEnd,elbow,.27,.20);
  ellipsoid(hip,'legKnee',rusty,...elbow,.26,.23,.23);
  ellipsoid(hip,'crabLegElbowJointCollar',pale,...elbow,.23,.09,.21);
  branch(hip,'legPropodus',warm,elbow,ankle,.17,.095);
  ellipsoid(hip,'legAnkle',joints,...ankle,.125,.16,.14);
  ellipsoid(hip,'crabLegAnkleJointCollar',rusty,...ankle,.16,.095,.16);
  branch(hip,'legDactylus',pale,ankle,foot,.087,.017);
  for(let rib=0;rib<3;rib++){
   const t=(rib+1)/4;
   const plate=ellipsoid(hip,'legCuticlePlate',rusty,
    side*(.12+(1.11-.12)*t),.56*t,(i-1.5)*.19*t,.18,.075,.20);
   plate.rotation.z=side*.22;
  }
   legs.push({joint:hip,index:i,side});
 }
 const jaws=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.name='livingCrabClaw';root.add(arm);
  arm.position.set(side*1.94,3.05,-1.39);
  // A large crusher on the right, a narrow cutter on the left.
  if(side===1){arm.scale.set(1.30,1.18,1.26);arm.userData.crusherClaw=true;}
  else{arm.scale.set(.91,.92,.94);arm.userData.cutterClaw=true;}
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
 // Menacing but biological: a tough asymmetrical cuticle, raised central
 // Smooth, rounded carapace ridges replace ALL sharp dorsal/edge spikes.
 const bone=new THREE.MeshStandardMaterial({color:'#ecbf90',roughness:.9,metalness:0});
 const blackShell=new THREE.MeshStandardMaterial({color:'#53231e',roughness:.94,metalness:0});
 const amber=new THREE.MeshStandardMaterial({color:'#a26331',roughness:.71,metalness:0});
 for(const side of [-1,1])for(let i=0;i<10;i++){
  const t=i/9,z=-1.68+t*3.32,x=side*(.8+Math.sin(t*Math.PI)*.7);
  const ridge=ellipsoid(root,'naturalCrabRoundedShellRidge',i%3===0?amber:rusty,
   x,4.28-.07*Math.abs(z),z,.17,.047,.26);
  ridge.rotation.y=side*.23;
  const scar=ellipsoid(root,'naturalCrabShellScar',blackShell,
   x+side*.18,4.22-.13*Math.abs(z),z,.13,.025,.06);
  scar.rotation.y=side*.30;
 }
 for(const side of [-1,1])for(let i=0;i<9;i++){
  const z=-1.67+i*.42;
  const rim=ellipsoid(root,'naturalCrabRoundedEdge',i%3===0?bone:rusty,
   side*(2.68-.10*Math.abs(i-4)),3.72,z,.24,.095,.23);
  rim.rotation.z=side*.12;
 }
 // Segmented abdominal membrane, weathered under-shell and curved gill slits.
 for(let i=0;i<8;i++){
  const z=-1.49+i*.42;
  ellipsoid(root,'naturalCrabAbdominalSegment',i%2?underside:pale,0,2.85,z,
   1.76,.09,.17);
  for(const side of [-1,1]){
   const slit=ellipsoid(root,'naturalCrabGillSlit',blackShell,
    side*1.95,3.10,z,.10,.042,.15);
   slit.rotation.y=side*.25;
  }
 }
 // Rounded pincer grips and low knuckles replace claw spikes and tusks.
 for(const arm of jaws){
  const side=arm.position.x<0?-1:1;
  for(let k=0;k<10;k++){
   const z=-.25-k*.18;
   ellipsoid(arm,'naturalCrabPincerNodule',k%3===0?bone:rusty,
    side*(.81+.11*(k%3)),.10+((k%4)*.08),z,.14,.10,.18);
  }
  for(let k=0;k<5;k++){
   ellipsoid(arm,'naturalCrabPincerGrippingPad',bone,
    side*(1.2+k*.19),.48,-.79+k*.10,.13,.055,.15);
  }
 }
 for(const side of [-1,1]){
  ellipsoid(root,'naturalCrabMandiblePlate',bone,side*.76,3.04,-2.04,.23,.32,.12);
  const brow=ellipsoid(root,'naturalCrabHeavyBrow',blackShell,
   side*1.45,4.28,-1.80,.47,.25,.21);
  brow.rotation.z=-side*.19;
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
