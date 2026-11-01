import * as THREE from 'three';
import {polishedTileTexture,matteWallTexture,productTexture,cartonTexture} from './textures.js';
import {AISLES,BAYS,TIERS,SLOTS,CELLS_PER_FLOOR,DOCK,aisleX,bayZ,decode,floorLabel} from './rules.mjs';
import {PAYROLL_LAYOUT as PAY} from './collision.mjs';
// Architecture, walls, supermarket service counters, shelves, products.
// The factory owns shelf rendering buffers so other systems never modify them directly.
export function createEnvironment({s,scene,add,cube,round,roundedGeo,textLabel,toon,dummy,color,goods,pastel,FLOOR_W,FLOOR_D,CEILING_Y,RACK_HEIGHT,TIER_Y,makeMike}){
let meshes=[],mikeModel=null;
function itemGeometry(type){
 const shapes=[
 [[0,0],[.13,0],[.15,.03],[.15,.38],[.13,.4],[0,.4]],
 [[0,0],[.12,0],[.12,.28],[.07,.34],[.07,.42],[.09,.45],[0,.45]],
 [[0,0],[.13,0],[.13,.26],[.05,.33],[.05,.48],[.07,.52],[0,.52]],
 [[0,0],[.13,0],[.17,.07],[.14,.43],[.1,.47],[0,.47]],
 [[0,0],[.13,0],[.13,.43],[.11,.45],[0,.45]]
 ];
 return new THREE.LatheGeometry(shapes[type].map(([r,y])=>new THREE.Vector2(r,y)),16);
}
function contactShadow(x,z,w,d,opacity=.18){
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d'),grad=ctx.createRadialGradient(64,64,10,64,64,61);
 grad.addColorStop(0,'rgba(18,30,28,.65)');
 grad.addColorStop(1,'rgba(18,30,28,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
 const tex=new THREE.CanvasTexture(c);
 const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const shadow=add(new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat));
 shadow.rotation.x=-Math.PI/2;shadow.position.set(x,.018,z);
}
// One offline-rendered "photographic" employee portrait per floor. Mike's
// ceramic robot head, white pixel eyes, and white mustache match his 3D model.
// Each of the 15 jobs uses a unique pose, work prop, and color-graded backdrop.
const MIKE_PORTRAIT_JOBS=[
 ['CLOSING SHIFT','Checking the sales ledger','#537978','ledger'],
 ['STOCKING STAR','Unpacking the first delivery','#846d59','box'],
 ['QUALITY CONTROL','Inspecting the shelves','#667d8c','scanner'],
 ['SAFETY LEAD','Checking emergency equipment','#7f695e','clipboard'],
 ['ORDER EXPERT','Filling customer orders','#65765c','parcel'],
 ['NIGHT OPERATIONS','Running the night inventory','#5c667f','tablet'],
 ['MAINTENANCE PRO','Fixing a stocking robot','#8a7859','wrench'],
 ['FLOOR MANAGER','Leading a team meeting','#6b8180','clipboard'],
 ['DELIVERY CHAMP','Scanning incoming pallets','#8a7366','scanner'],
 ['CLEAN AISLES','Polishing the checkout lane','#708678','cloth'],
 ['INVENTORY HERO','Counting warehouse stock','#66707d','ledger'],
 ['AUTOMATION ACE','Calibrating the conveyor','#8b7a60','wrench'],
 ['CUSTOMER SERVICE','Helping a shopper','#806c7a','parcel'],
 ['PRECISION PICKER','Verifying product labels','#668684','tablet'],
 ['GRAND OPENING','Preparing the final inspection','#ac8558','clipboard']
];
function mikePortraitCanvas(floor){
 const [award,activity,accent,prop]=MIKE_PORTRAIT_JOBS[floor];
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=860;
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,seed=floor+1;
 const rect=(x,y,width,height,fill)=>{ctx.fillStyle=fill;ctx.fillRect(x,y,width,height);};
 const ellipse=(x,y,rx,ry,fill)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();};
 const line=(a,b,c,d,width,color)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke();};
 const rounded=(x,y,width,height,r,fill)=>{
  ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,width,height,r);ctx.fill();
 };
 const gradient=ctx.createLinearGradient(0,0,w,h);
 gradient.addColorStop(0,'#1c3137');gradient.addColorStop(.48,accent);gradient.addColorStop(1,'#192c33');
 rect(0,0,w,h,gradient);
 // Soft-focus store background: every floor gets a different rack arrangement.
 for(let i=0;i<8;i++){
  const x=((i*151+seed*43)%890)-80,y=95+((i*93+seed*37)%380);
  ctx.globalAlpha=.11+(i%3)*.02;
  rounded(x,y,72+(i%3)*25,290+(i%2)*90,9,i%2?'#fff4d7':'#101f26');
  for(let j=0;j<5;j++)rect(x+7,y+28+j*49,62,.008*400,'#f0eed7');
 }
 ctx.globalAlpha=1;
 // Overhead industrial lights create studio-photo highlights.
 for(let i=0;i<3;i++){
  const x=100+i*255+((seed*17)%50);
  const glow=ctx.createRadialGradient(x,75,5,x,75,190);
  glow.addColorStop(0,'rgba(255,247,218,.31)');glow.addColorStop(1,'rgba(255,247,218,0)');
  rect(x-190,-115,380,380,glow);
 }
 const spotlight=ctx.createRadialGradient(345,425,50,345,455,500);
 spotlight.addColorStop(0,'rgba(247,239,219,.22)');spotlight.addColorStop(1,'rgba(4,16,20,.42)');
 rect(0,0,w,h,spotlight);
 // Environmental prop: loading racks, checkout scanners, ledgers, etc.
 const tilt=(seed%5-2)*.065,look=(seed%3-1)*16;
 const body=ctx.createLinearGradient(200,430,525,775);
 body.addColorStop(0,'#faf6e8');body.addColorStop(.46,'#d8e4df');body.addColorStop(1,'#8fada9');
 ctx.save();ctx.translate(360,0);ctx.rotate(tilt);ctx.translate(-360,0);
 // Back arm: active working pose differs per floor, not a repeated portrait.
 const raised=seed%3===0,handY=raised?350:560,handX=seed%2===0?575:143;
 line(266,588,handX,handY,77,'#829a9c');
 line(266,588,handX,handY,53,'#e2e5db');
 ellipse(handX,handY,44,37,'#384b50');
 // Mike's angular, ceramic body.
 rounded(197,515,321,330,93,body);
 rounded(230,562,255,145,38,'#e5e7dd');
 rounded(274,581,173,38,12,'#30494d');
 rounded(313,595,96,10,5,'#a6e3d3');
 rounded(325,706,77,38,8,'#b99b68');
 ctx.fillStyle='#354548';ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.fillText('M I K E',363,732);
 // Polished articulated neck, bronzed collar, and robot head casing.
 rounded(300,466,115,96,18,'#4a6265');rounded(289,499,136,28,11,'#b3945d');
 const skull=ctx.createLinearGradient(242,190,520,390);
 skull.addColorStop(0,'#ffffff');skull.addColorStop(.52,'#e8ede7');skull.addColorStop(1,'#93aaa7');
 rounded(221+look,186,278,302,58,skull);
 rounded(232+look,198,256,27,13,'#fefbf2');
 rounded(246+look,256,228,157,35,'#1b3036');
 rounded(254+look,261,210,112,19,'#15252b');
 // Digital pixel-matrix eyes, using the same white bars as Mike's 3D face.
 for(const ex of [304+look,416+look]){
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   if(row===1||(row===0&&(col===1||col===2)))
    rounded(ex+(col-1.5)*10,298+(row-1)*11,9,9,2,'#eaffff');
  }
 }
 // His trademark flat white twin-tip mustache on black glass.
 ctx.strokeStyle='#fdfdf5';ctx.lineWidth=14;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(350+look,365);ctx.quadraticCurveTo(321+look,387,282+look,364);
 ctx.moveTo(350+look,365);ctx.quadraticCurveTo(386+look,387,427+look,355);ctx.stroke();
 ctx.strokeStyle='#9aefde';ctx.lineWidth=4;line(326+look,396,373+look,396,4,'#a6eee0');
 rounded(272+look,227,170,9,4,'#bd9e6b');
 // Foreground hand and the specific work object make every scene unique.
 const workHandY=590-((seed*31)%125);
 line(482,588,555,workHandY,64,'#849b9d');
 line(482,588,555,workHandY,43,'#f4f2e8');
 ellipse(559,workHandY,31,34,'#2d4145');
 ctx.save();ctx.translate(564,workHandY-42);ctx.rotate((seed%4-2)*.15);
 if(prop==='box'||prop==='parcel'){
  rounded(-52,-66,110,92,9,'#b79b72');
  rect(-4,-66,13,92,'#ece2c8');
  line(-42,-22,41,-22,3,'#876e50');
 }else if(prop==='wrench'){
  line(-10,-68,17,25,14,'#abb8b7');
  ellipse(-15,-78,21,19,'#ccd5d0');
  ellipse(-15,-78,10,8,'#32484d');
 }else if(prop==='scanner'){
  rounded(-20,-67,44,82,12,'#243b41');
  rounded(-11,-59,26,18,4,'#a7ded1');
  line(4,15,16,38,13,'#c4a36a');
 }else if(prop==='cloth'){
  ctx.beginPath();ctx.moveTo(-54,-54);ctx.lineTo(48,-43);ctx.lineTo(35,35);ctx.lineTo(-47,17);ctx.closePath();ctx.fillStyle='#ddebc8';ctx.fill();
 }else if(prop==='tablet'){
  rounded(-48,-91,98,139,12,'#21333b');
  rounded(-39,-82,80,110,6,'#8dbeb9');
  for(let j=0;j<4;j++)rect(-29,-61+j*24,59,7,j%2?'#4c7775':'#e1efe3');
 }else{
  rounded(-52,-88,104,143,9,'#c6b08a');
  rounded(-40,-72,80,116,4,'#f3eddc');
  for(let j=0;j<5;j++)line(-28,-53+j*21,28,-53+j*21,3,'#6a8580');
  rounded(-16,-96,32,15,4,'#555b52');
 }
 ctx.restore();
 ctx.restore();
 // Film-like treatment, top workplace stamp, and a small unique floor caption.
 const vignette=ctx.createRadialGradient(350,390,230,350,390,620);
 vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(3,13,17,.55)');
 rect(0,0,w,h,vignette);
 rect(0,0,w,75,'rgba(12,30,34,.82)');
 rect(0,790,w,70,'rgba(12,30,34,.83)');
 ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle='#f4e6b9';
 ctx.font='bold 25px system-ui';ctx.fillText(award,360,38);
 ctx.font='bold 23px system-ui';ctx.fillStyle='#eef5ed';
 ctx.fillText(activity,360,824);
 ctx.font='bold 17px system-ui';ctx.textAlign='right';ctx.fillStyle='#d3c7ab';
 ctx.fillText('FLOOR '+String(floor+1).padStart(2,'0'),690,752);
 return canvas;
}
function buildEmployeeOfMonthPortrait(){
 const floor=s.floor;
 if(floor<0||floor>=MIKE_PORTRAIT_JOBS.length)return;
 const group=new THREE.Group();
 group.name='employeeOfMonthPortrait';
 group.userData={floor,subject:'Mustache Mike',job:MIKE_PORTRAIT_JOBS[floor][0]};
 // Occupies the front wall just to the right of the elevator frame.
 group.position.set(31,0,-12.19);add(group);
 // Gilded 24K-yellow frame, not dark bronze. Metallic-only materials
 // read as brown in unlit WebGL scenes, so warm emissive highlights ensure
 // the bright gold remains identifiable on every floor.
 const gold=new THREE.MeshStandardMaterial({color:'#ffd029',metalness:.37,roughness:.22,emissive:'#8e5200',emissiveIntensity:.18});
 const highlight=new THREE.MeshBasicMaterial({color:'#ffe77c'});
 const shadowGold=new THREE.MeshStandardMaterial({color:'#b66e0a',metalness:.35,roughness:.29,emissive:'#5e3200',emissiveIntensity:.18});
 const velvet=new THREE.MeshStandardMaterial({color:'#172c29',roughness:.92,metalness:.02});
 const backing=round(3.54,4.94,.18,shadowGold,group);backing.position.set(0,3.61,0);
 const outer=round(3.47,4.86,.17,gold,group);outer.position.set(0,3.61,.14);
 const inner=round(3.18,4.57,.11,highlight,group);inner.position.set(0,3.61,.265);
 const insetGold=round(3.34,4.74,.055,shadowGold,group);insetGold.position.set(0,3.61,.315);
 const fineGold=round(3.11,4.49,.04,highlight,group);fineGold.position.set(0,3.61,.36);
  const matte=round(2.98,4.35,.105,velvet,group);matte.position.set(0,3.61,.37);
 // Four ornate gilded corner ornaments catch the light like a trophy.
 for(const xx of [-1.46,1.46])for(const yy of [1.48,5.73]){
  const corner=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),highlight);
  corner.scale.set(1.65,.62,.39);corner.position.set(xx,yy,.42);group.add(corner);
  const crest=round(.16,.26,.07,gold,group);crest.position.set(xx,yy,.43);
 }
 for(const x of [-1.50,1.50]){
  const filigree=round(.055,3.5,.075,gold,group);filigree.position.set(x,3.64,.46);
 }
 const photoTexture=new THREE.CanvasTexture(mikePortraitCanvas(floor));
 photoTexture.colorSpace=THREE.SRGBColorSpace;photoTexture.anisotropy=4;
 const image=new THREE.Mesh(new THREE.PlaneGeometry(2.73,3.15),
  new THREE.MeshBasicMaterial({map:photoTexture,side:THREE.FrontSide}));
 image.name='uniqueWorkingPortrait';
 image.position.set(0,3.55,.454);group.add(image);
 // Etched title and nameplates in separate gold ribbons remain legible.
 const title=textLabel('EMPLOYEE OF THE MONTH',2.77,.32,'#ffdd47','#293127',28,'interior');
 title.position.set(0,5.51,.463);group.add(title);
 const name=textLabel('Mustache Mike',2.75,.43,'#ffe159','#24332b',44,'interior');
 name.position.set(0,1.54,.466);group.add(name);
 const floorBadge=textLabel('AWARD • '+floorLabel(floor),1.35,.18,'#284340','#f4e0a4',26,'interior');
 floorBadge.position.set(0,1.21,.464);group.add(floorBadge);
 for(const x of [-1.67,1.67]){
  const raised=round(.075,4.7,.085,highlight,group);raised.position.set(x,3.61,.35);
 }
 for(const y of [1.28,5.95]){
  const lip=round(3.39,.075,.09,highlight,group);lip.position.set(0,y,.35);
 }
 return group;
}

function buildShell(){
 const theme=pastel[s.floor%pastel.length];
 scene.background.set('#d8ddda');scene.fog.color.set('#d8ddda');
 // Fine pale ceramic tiles with subtle grout and material variation.
 const tiles=polishedTileTexture();
 const floorMaterial=new THREE.MeshStandardMaterial({map:tiles,roughness:.83,metalness:.035,bumpMap:tiles,bumpScale:.009});
 const ground=add(new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W,FLOOR_D),floorMaterial));
 ground.rotation.x=-Math.PI/2;ground.position.set(46.5,0,44);ground.receiveShadow=true;
 const ceiling=cube(FLOOR_W,.28,FLOOR_D,'#e8e8e4');ceiling.position.set(46.5,CEILING_Y,44);
 // Lightly textured industrial wall coating and physical door apertures.
 // A single solid panel is never placed behind either interactive door.
 const wallTex=matteWallTexture();
 const wallMat=new THREE.MeshStandardMaterial({map:wallTex,roughness:.91,metalness:.012,bumpMap:wallTex,bumpScale:.011});
 const wallSegment=(x,z,w,d,h=CEILING_Y,y=CEILING_Y/2)=>{
   const body=cube(w,h,d,wallMat);body.position.set(x,y,z);
   if(h===CEILING_Y){
    // These decorative trims are offset toward the store, not coplanar with plaster.
    const horizontal=w>d;
    const trim=cube(horizontal?w-.08:.16,.22,horizontal?.12:d-.08,'#8a9691');
    trim.position.set(horizontal?x:x+(x>50?-.4:.4),.2,horizontal?z+(z<0?.36:-.36):z);
    const crown=cube(horizontal?w-.08:.18,.23,horizontal?.12:d-.08,'#adb7b1');
    crown.position.set(horizontal?x:x+(x>50?-.4:.4),CEILING_Y-.21,horizontal?z+(z<0?.36:-.36):z);
   }
 };
 wallSegment(46.5,100.7,113,.5);
 if(s.floor===0){
   // Single fire exit on the back-left wall, with a real door-shaped aperture.
   wallSegment(-10,35.15,.5,96.3);
   wallSegment(-10,93.85,.5,14.3);
   wallSegment(-10,85,.5,3.4,CEILING_Y-4.65,(CEILING_Y+4.65)/2);
   wallSegment(103,44,.5,114);
   // Front entrance opening x=42.5..50.5, with a tall structural lintel.
   wallSegment(16.25,-12.7,52.5,.5);
   wallSegment(76.75,-12.7,52.5,.5);
   wallSegment(46.5,-12.7,8,.5,CEILING_Y-5.45,(CEILING_Y+5.45)/2);
 }else{
   wallSegment(-10,44,.5,114);
   wallSegment(103,44,.5,114);
   wallSegment(46.5,-12.7,113,.5);
 }
 buildEmployeeOfMonthPortrait();
 // Uprights, panel joints, painted trims and wayfinding details are actual geometry.
 for(const x of [-5,5,16,28,40,53,65,78,91]){
  if(s.floor===0&&x>42&&x<52)continue;
  const rib=cube(.15,CEILING_Y-1,.18,'#b5c0ba');rib.position.set(x,CEILING_Y/2,-12.32);
 }
 for(const z of [0,18,56,76,95]){
  if(s.floor===0&&Math.abs(z-40.5)<3)continue;
  const rib=cube(.18,CEILING_Y-1,.15,'#bdc6c0');rib.position.set(102.57,CEILING_Y/2,z);
 }
 for(const z of [12,44,77]){
  const notice=textLabel(z===12?'SAFETY FIRST':z===44?'AISLE EQUIPMENT':'RECEIVING AHEAD',3.3,.55,'#e7e8df','#44554f',34,'interior');
  notice.position.set(101.9,3.8,z);notice.rotation.y=-Math.PI/2;add(notice);
 }
 // Repeated perimeter-wall detailing echoes the overhead ducts and lighting.
 // Thin, high-mounted pieces remain inside the wall boundary, so they never
 // block shelves, checkout aisles, the left FIRE EXIT, or grand-opening doors.
 const wallSteel=new THREE.MeshStandardMaterial({color:'#718584',metalness:.61,roughness:.40});
 const wallInset=new THREE.MeshStandardMaterial({color:'#b0bcb5',metalness:.21,roughness:.68});
 const conduitDark=new THREE.MeshStandardMaterial({color:'#445756',metalness:.51,roughness:.43});
 const ventShadow=new THREE.MeshStandardMaterial({color:'#354a4a',metalness:.23,roughness:.68});
 const lampLight=new THREE.MeshBasicMaterial({color:'#e8f1dc'});
 for(const [side,x,sgn] of [['LEFT',-9.64,1],['RIGHT',102.64,-1]]){
  // Steel service rails and horizontal wall-lighting spine, interrupted at the
  // emergency egress on Floor 1. All rails are mounted above head height.
  for(let z=4;z<=93;z+=7.8){
   if(side==='LEFT'&&s.floor===0&&z>80&&z<90)continue;
   for(const y of [5.65,12.1]){
    const rail=round(.08,.085,7.85,wallSteel);
    rail.position.set(x,y,z);
   }
   if(Math.floor(z/7.8)%2===0){
    const diffuse=round(.055,.10,3.35,lampLight);
    diffuse.position.set(x+sgn*.061,10.55,z+.25);
    const lightFrame=round(.10,.18,3.52,conduitDark);
    lightFrame.position.set(x-sgn*.01,10.55,z+.25);
    // Prevent the mounting frame from hiding the luminous inner strip.
    diffuse.position.x=x+sgn*.072;
   }
  }
  // Recessed electrical/service panels, vents and exposed ceiling-to-wall
  // conduit drops. Their dimensions are decorative, not collision obstacles.
  for(const z of [19,39,59,92]){
   if(side==='LEFT'&&s.floor===0&&z>80&&z<90)continue;
   const spine=round(.07,7.65,.085,conduitDark);
   spine.position.set(x,9.35,z);
   for(const y of [6.6,8.65,10.7]){
    const clamp=round(.11,.12,.23,wallSteel);
    clamp.position.set(x+sgn*.035,y,z);
   }
   const box=round(.15,1.24,1.42,wallSteel);box.position.set(x,5.03,z);
   const cover=round(.04,1.02,1.19,wallInset);
   cover.position.set(x+sgn*.10,5.03,z);
   const label=round(.023,.12,.57,conduitDark);
   label.position.set(x+sgn*.134,5.35,z);
   for(const offset of [-.45,.45]){
    const fastener=round(.04,.055,.055,ventShadow);
    fastener.position.set(x+sgn*.133,4.67,z+offset);
   }
  }
  // High wall intake/exhaust grilles face the aisles and remain clear of
  // the existing safety signs on the right-side wall.
  for(const z of [28,69]){
   const vent=round(.105,1.36,2.9,conduitDark);
   vent.position.set(x,10.5,z);
   const inset=round(.035,1.16,2.66,ventShadow);
   inset.position.set(x+sgn*.09,10.5,z);
   for(let n=0;n<7;n++){
    const slat=round(.057,.052,2.48,wallSteel);
    slat.position.set(x+sgn*.12,10.07+n*.143,z);
   }
  }
 }
 // Front-wall structural panels mirror the ceiling's repeated support beams;
 // do not span the opening x=42.5..50.5 on the ground floor.
 for(let x=4;x<=94;x+=12){
  if(s.floor===0&&x>38&&x<54)continue;
  const panel=round(5.9,2.8,.055,wallInset);
  panel.position.set(x,10.9,-12.31);
  const topTrim=round(6,.09,.095,wallSteel);
  topTrim.position.set(x,12.32,-12.25);
  for(const offset of [-2.82,2.82]){
   const frame=round(.085,2.67,.10,wallSteel);
   frame.position.set(x+offset,10.88,-12.25);
  }
 }

 // Ceiling infrastructure: sprinkler mains, segmented cable trays and diffuse luminaires.
 for(const x of [5,51,95]){
   const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.087,.087,107,10),
     new THREE.MeshStandardMaterial({color:'#74878a',metalness:.58,roughness:.41}));
   pipe.rotation.x=Math.PI/2;pipe.position.set(x,CEILING_Y-1.45,44);add(pipe);
   for(let z=7;z<98;z+=11){
      const valve=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.1,12),new THREE.MeshStandardMaterial({color:'#b88e54',metalness:.58,roughness:.37}));
      valve.position.set(x,CEILING_Y-1.54,z);add(valve);
   }
 }
 for(let z=-4;z<100;z+=18){
  const beam=cube(110,.35,.55,'#9aa4a3');beam.position.set(46.5,CEILING_Y-.58,z);
  for(let x=-3;x<102;x+=10){
   const fixture=round(4.1,.12,.52,new THREE.MeshBasicMaterial({color:'#fdfdf6'}));
   fixture.position.set(x,CEILING_Y-.85,z+1.7);
   const mount=cube(4.35,.1,.64,'#aab1ac');mount.position.set(x,CEILING_Y-.68,z+1.7);
  }
 }
 for(let z=6;z<98;z+=20){
  for(const x of [-7,101]){
   const column=new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,CEILING_Y-.4,16),toon('#a5aeab'));
   column.position.set(x,(CEILING_Y-.4)/2,z);add(column);
   const base=round(.83,.66,.83,'#687872');base.position.set(x,.33,z);
  }
 }
 // Visible ceiling ducts and sprinkler runs reinforce the industrial scale.
 for(const x of [1,48,96]){
  const vent=cube(1.3,.66,109,'#b4c0c0');vent.position.set(x,CEILING_Y-1.15,44);
  for(let z=0;z<95;z+=12){
   const collar=cube(1.5,.75,.12,'#889695');collar.position.set(x,CEILING_Y-1.15,z);
  }
 }
 // Wall-size wayfinding signs, mounted facing into the store, never mirrored.
 const name=textLabel('MUSTACHE MART  /  '+floorLabel(s.floor),10.8,1.05,'#38524a','#ffffff',53,'interior');
 name.position.set(47,14.2,-12.36);add(name);
 const direction=textLabel('RECEIVING WAREHOUSE  →  BACK OF STORE',10.8,.7,'#d8e1d8','#32453e',35,'interior');
 direction.position.set(47,12.9,-12.32);add(direction);
 // Back room visual staging: pallets, cartons, rolling shutter and safety striping.
 const shutter=round(11,8,.18,'#98a4a5');shutter.position.set(17,5,100.24);
 for(let y=1.2;y<8.2;y+=.7){
  const seam=cube(10.5,.055,.1,'#657577');seam.position.set(17,y,100.07);
 }
 const cartonMat=new THREE.MeshStandardMaterial({map:cartonTexture(),roughness:.89});
 for(let j=0;j<8;j++){
  const x=30+(j%4)*3.5,z=95+Math.floor(j/4)*3.0;
  const pallet=round(2.7,.22,2.4,'#9d8264');pallet.position.set(x,.14,z);
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let level=0;level<2;level++){
   const box=round(1.1,.75,.95,cartonMat);
   box.position.set(x+(a-.5)*1.15,.64+level*.78,z+(b-.5)*1.07);
   const tape=cube(.09,.77,.99,'#e1d9c4');tape.position.copy(box.position);tape.position.y+=.02;
  }
 }
 for(let z=91;z<98;z+=2.2){
  const stripe=cube(4,.02,.22,'#d9be6d');stripe.position.set(1.5,.035,z);
 }
 // Ground decals are raised slightly off the tile surface to avoid z-fighting.
 for(let z=5;z<88;z+=16){
   const marker=textLabel('RECEIVING  ↑',2.8,.56,'#d7d4b3','#485b52',33,'interior');
   marker.rotation.x=-Math.PI/2;marker.rotation.y=0;marker.position.set(1.5,.042,z);
   add(marker);
 }
 // Supermarket finish pass: color-coded aisle wayfinding, perimeter
 // wainscoting, checkout queue guides, ceiling smoke detectors, vents and
 // small grounded retail fittings. Batches are intentionally sparse to avoid
 // increasing draw calls with 15 huge floors.
 const ivory='#e4e6df',gunmetal='#697c78',warm='#d2b075';
 for(const x of [3,17,31,45,59,73,87]){
  const baseboard=round(6.5,.21,.11,gunmetal);baseboard.position.set(x,.18,-12.13);
  const scuff=round(6.5,.035,.12,'#ced4c9');scuff.position.set(x,.33,-12.11);
 }
 for(let i=0;i<AISLES;i++){
  const x=aisleX(i),z=7.6;
  const category=['PANTRY','DRINKS','HOUSEHOLD','SNACKS'][i%4];
  const hangerL=round(.042,1.07,.05,gunmetal);hangerL.position.set(x-1.58,CEILING_Y-2.3,z);
  const hangerR=round(.042,1.07,.05,gunmetal);hangerR.position.set(x+1.58,CEILING_Y-2.3,z);
  // Only one neutral, entrance-facing sign. The old raised colored edges
  // and opaque backing plates obscured aisle names from some camera angles.
  // The sign itself is readable when approaching from the front (-Z).
  const front=textLabel('AISLE '+String(i+1).padStart(2,'0')+'  /  '+category,3.24,.58,'#2a4540','#ffffff',37,'entrance');
  front.position.set(x,CEILING_Y-3.05,z-.12);add(front);
  // No colored flags, plate, or extra overlay between the player and the text.
  for(const sz of [20,51,81]){
   const outlet=round(.12,.12,.16,gunmetal);outlet.position.set(x,CEILING_Y-.27,sz);
   const vent=round(1.55,.04,.42,'#cdd3ce');vent.position.set(x,CEILING_Y-.32,sz+1.5);
   for(let n=0;n<4;n++){
    const grille=round(.038,.048,.37,'#798b85');grille.position.set(x+(n-1.5)*.31,CEILING_Y-.354,sz+1.5);
   }
  }
 }
 // Everyday shopping baskets and service-barrier uprights by the front entry.
 for(const x of [31.7,34.5]){
  const basket=round(1.15,.62,.72,'#597b70');basket.position.set(x,.36,-6.65);
  const rim=round(1.28,.068,.84,'#e0c38b');rim.position.set(x,.7,-6.65);
  for(const dz of [-.25,0,.25]){
   const rib=round(.055,.45,.04,'#a2b8a9');rib.position.set(x+.57,.35,-6.65+dz);
  }
 }
 // Removed floor-level cashier queue bollards: they looked like random nubs
 // and cluttered the approach to the payment registers.
 const staffing=textLabel('EMPLOYEE ACCESS  •  CHECK-IN',5.7,.63,'#e9ebe3','#42594d',29,'interior');
 staffing.position.set(13.6,5.35,-12.14);add(staffing);
 const receiver=textLabel('GOODS RECEIVING  •  LOAD HERE',7,.9,'#d8c088','#303a3a',43);
 receiver.position.set(DOCK.x,4.4,94.4);add(receiver);
}
function addKiosk(x,z,name,accent,facing='interior'){
 const platform=round(4,1.1,2.3,'#ffffff');platform.position.set(x,.55,z);
 const top=round(4.5,.18,2.6,accent);top.position.set(x,1.18,z);
 const stripe=round(4.1,.22,.2,'#322947');stripe.position.set(x,.85,z-1.18);
 const sign=textLabel(name,4.6,.82,accent,'#303b3c',44,facing);sign.position.set(x,2.8,z-1);add(sign);
}
function buildService(){
 addKiosk(DOCK.x,DOCK.z,'WAREHOUSE PICKUP','#c9b080','entrance');
 contactShadow(PAY.x,PAY.counterZ+.48,6.6,2.7,.22);
 contactShadow(1.5,-9,5.6,3.8,.2);
 contactShadow(DOCK.x,DOCK.z,5.5,4.2,.25);
 // WALL-MOUNTED PAYROLL: the actual building front wall is at z=-12.7
 // (inner surface -12.45). Both the fascia and the countertop physically
 // overlap that wall. No separate booth, freestanding backdrop or rear gap.
 const payBack=round(5.6,3.65,PAY.fasciaDepth,'#536363');
 payBack.position.set(PAY.x,2.94,PAY.fasciaZ);
 const payFloor=round(5.68,.16,PAY.counterDepth+.12,'#647675');
 payFloor.position.set(PAY.x,.085,PAY.counterZ);
 const counter=round(PAY.counterWidth,1.18,PAY.counterDepth,'#dddcd5');
 counter.position.set(PAY.x,.59,PAY.counterZ);
 const workTop=round(5.32,.13,PAY.counterDepth+.06,'#7e8988');
 workTop.position.set(PAY.x,1.24,PAY.counterZ);
 // Finished fascia, glass and metal jambs mounted directly on plaster.
 const glassMat=new THREE.MeshStandardMaterial({
  color:'#b8d1d3',transparent:true,opacity:.32,metalness:.1,
  roughness:.12,depthWrite:false
 });
 const glass=cube(4.92,1.79,.05,glassMat);
 glass.position.set(PAY.x,2.62,PAY.glassZ);
 for(const x of [7.5,12.5]){
  const jamb=round(.12,2.27,.13,'#657477');
  jamb.position.set(x,2.57,PAY.glassZ+.04);
  const fastener=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,.035,8),
   new THREE.MeshStandardMaterial({color:'#404f51',metalness:.72,roughness:.27}));
  fastener.rotation.x=Math.PI/2;
  fastener.position.set(x,3.59,PAY.glassZ+.11);add(fastener);
 }
 for(const y of [1.57,3.63]){
  const rail=round(5.12,.11,.15,'#697878');
  rail.position.set(PAY.x,y,PAY.glassZ+.035);
 }
 const payHeader=round(5.45,.71,.24,'#344e4a');
 payHeader.position.set(PAY.x,4.02,PAY.glassZ);
 const windowSign=textLabel('PAY WINDOW   /   PAYROLL',4.95,.54,
  '#344e4a','#f1f3ea',36,'interior');
 windowSign.position.set(PAY.x,4.05,PAY.signZ);add(windowSign);
 // Actual transaction equipment sits ON the countertop, attached to the wall.
 const terminal=round(.74,.47,.12,'#303b40');
 terminal.position.set(9.2,1.56,PAY.counterZ+.51);
 const screen=round(.5,.27,.03,new THREE.MeshBasicMaterial({color:'#92c4b6'}));
 screen.position.set(9.2,1.6,PAY.counterZ+.61);
 const documents=round(.78,.035,.43,'#f4f2e8');
 documents.position.set(10.9,1.35,PAY.counterZ+.33);
 const printer=round(.64,.35,.58,'#e2e5e1');
 printer.position.set(11.45,1.49,PAY.counterZ+.35);
 const printed=round(.41,.02,.28,'#f9f8ee');
 printed.position.set(11.45,1.7,PAY.counterZ+.54);
 // Customer queue is OUTSIDE the wall-mounted window, with a walkable gap.
 for(const x of [6.75,13.25]){
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.94,14),
   new THREE.MeshStandardMaterial({color:'#9ba5a1',metalness:.62,roughness:.3}));
  post.position.set(x,.47,-8.35);add(post);
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.09,16),
   new THREE.MeshStandardMaterial({color:'#465655',metalness:.46,roughness:.45}));
  foot.position.set(x,.045,-8.35);add(foot);
 }
 const rope=round(6.5,.055,.05,'#6f847b');
 rope.position.set(PAY.x,.81,-8.35);
 const payLogo=textLabel('STAFF SERVICES   •   VERIFIED PAYROLL',4.55,.4,
  '#536963','#f3f4ee',28,'interior');
 payLogo.position.set(PAY.x,4.57,PAY.signZ);add(payLogo);
 const clipboard=round(.44,.67,.045,'#c4b394');
 clipboard.position.set(13.1,1.7,PAY.glassZ+.08);
 const notebook=textLabel('MM  /  001',.38,.14,
  '#eae2c8','#343f37',27,'interior');
 notebook.position.set(13.1,1.74,PAY.glassZ+.11);add(notebook);
 // Mike stands BEHIND his own desk: customers interact from the open aisle.
 const mikeDesk=round(4.5,1.16,1.82,'#e3e5df');mikeDesk.position.set(1.5,.58,-8.65);
 const mikeTop=round(4.75,.15,2.08,'#7b8985');mikeTop.position.set(1.5,1.235,-8.65);
 const mikeFront=round(4.1,.64,.055,'#3e5b56');mikeFront.position.set(1.5,.76,-7.715);
 const mikeBadge=textLabel('MUSTACHE MIKE   /   CONCIERGE',3.85,.48,'#3e5b56','#f2f1e8',31,'interior');
 mikeBadge.position.set(1.5,.79,-7.673);add(mikeBadge);
 for(const x of [-.6,3.6]){
  const post=round(.14,2.56,.19,'#6b7b76');post.position.set(x,2.58,-8.84);
 }
 const nameHousing=round(4.9,.78,.36,'#364a47');nameHousing.position.set(1.5,3.96,-8.78);
 const nameSign=textLabel('MUSTACHE MIKE  •  CUSTOMER SERVICE',4.58,.53,'#364a47','#f2f3e8',32,'interior');
 nameSign.position.set(1.5,3.96,-8.566);add(nameSign);
 const deskTerminal=round(.72,.41,.22,'#28373b');deskTerminal.position.set(2.66,1.49,-8.82);
 const deskGlow=round(.54,.23,.03,new THREE.MeshBasicMaterial({color:'#aad9ce'}));deskGlow.position.set(2.66,1.51,-8.683);
 mikeModel=makeMike(1.5,-10.48);
 // Refined flush stainless passenger lift with inset double-door leaves,
 // floor indicator, recessed frame, side control station and detailed seams.
 const brushed=new THREE.MeshStandardMaterial({color:'#b5c0c1',metalness:.79,roughness:.29});
 const bronze=new THREE.MeshStandardMaterial({color:'#c8ad78',metalness:.62,roughness:.35});
 const frame=round(5.52,6.7,.24,brushed);frame.position.set(23,3.35,-11.45);
 const well=round(4.95,6.18,.19,'#263539');well.position.set(23,3.25,-11.25);
 for(const sign of [-1,1]){
  const leaf=round(2.37,5.84,.14,brushed);leaf.position.set(23+sign*1.18,3.16,-11.085);
  for(const x of [23+sign*.2,23+sign*2.15]){
   const bevel=round(.043,5.79,.035,'#707e80');bevel.position.set(x,3.16,-10.99);
  }
  const inset=round(1.77,4.91,.045,'#d3d7d4');inset.position.set(23+sign*1.19,3.24,-10.974);
  const engraving=round(1.53,.037,.04,bronze);engraving.position.set(23+sign*1.19,.72,-10.942);
  for(const y of [1.12,5.38]){
   const accent=round(2.29,.035,.04,'#76878b');accent.position.set(23+sign*1.18,y,-10.96);
  }
 }
 const centerGap=round(.055,5.9,.06,'#273b41');centerGap.position.set(23,3.17,-10.923);
 const header=round(5.83,.45,.39,'#35494a');header.position.set(23,6.82,-11.4);
 const floorDisplay=round(1.02,.34,.055,'#152629');floorDisplay.position.set(23,6.8,-11.166);
 const displayText=textLabel(floorLabel(s.floor)+'   ↑',.87,.21,'#183a36','#95e5c0',29,'interior');
 displayText.position.set(23,6.8,-11.126);add(displayText);
 const title=textLabel('PASSENGER ELEVATOR  /  F01–F15',5.2,.53,'#394d4e','#f3f5ed',34,'interior');
 title.position.set(23,7.37,-11.035);add(title);
 const threshold=round(5.28,.09,.62,'#899899');threshold.position.set(23,.06,-10.82);
 for(const sign of [-1,1]){
   const jamb=round(.17,6.43,.31,brushed);jamb.position.set(23+sign*2.55,3.27,-11.11);
   const seal=round(.035,6.12,.06,'#323f40');seal.position.set(23+sign*2.44,3.18,-10.926);
 }
 const callPanel=round(.44,1.05,.13,'#4c6063');callPanel.position.set(26.1,2.08,-11.04);
 const callScreen=round(.32,.26,.04,new THREE.MeshBasicMaterial({color:'#a1e6c1'}));
 callScreen.position.set(26.1,2.33,-10.965);
 for(const y of [1.85,2.01]){
  const button=new THREE.Mesh(new THREE.CylinderGeometry(.066,.066,.039,14),brushed);
  button.rotation.x=Math.PI/2;button.position.set(26.1,y,-10.942);add(button);
 }
 const receivingRack=round(4.3,3.8,.75,'#838f8d');receivingRack.position.set(7.7,1.9,96.4);
 for(let shelf=1;shelf<4;shelf++){const r=round(4.5,.11,1.2,'#c2c7c0');r.position.set(7.7,shelf*.98,96.4);}
 const dockTerminal=round(.85,1.1,.52,'#7a8b8c');dockTerminal.position.set(3.7,.59,95.8);
 const dockScreen=round(.64,.43,.08,new THREE.MeshBasicMaterial({color:'#accfbd'}));dockScreen.position.set(3.7,.95,95.49);
 // Receiving workstation: hanging rack structure, scanners, pallet jack and boxes.
 const scanner=round(.15,.37,.26,'#32454b');scanner.position.set(4,.99,95.1);
 const scannerLight=round(.1,.052,.15,new THREE.MeshBasicMaterial({color:'#7fe6bb'}));scannerLight.position.set(4,1.2,95.02);
 const dataPanel=textLabel('SCAN  |  VERIFY  |  DISPATCH',4.0,.48,'#3c5652','#e5ecdf',31,'entrance');
 dataPanel.position.set(7.1,4.4,95.2);add(dataPanel);
 const receivingLabel=textLabel('INVENTORY  /  RECEIVING',5.4,.77,'#dfd9c4','#414d48',39,'entrance');receivingLabel.position.set(DOCK.x,5.7,94.35);add(receivingLabel);
 const entranceSign=textLabel('CUSTOMER SERVICE   |   PAYROLL',8.2,.76,'#e5e5db','#475752',39,'interior');
 entranceSign.position.set(9,6.2,-12.24);add(entranceSign);
 // Follow-through markers guide the player toward distant stock.
 const rearArrow=textLabel('STOCKROOM / RECEIVING  ↑  100 m',8.0,.68,'#46594e','#ffffff',36);
 rearArrow.position.set(1.6,4.6,8.8);add(rearArrow);
}
function buildShelves(){
 const per=AISLES*2*BAYS;
 // Reusable instancing gives the taller racks a convincing metal framework
 // without building tens of thousands of individual draw calls.
 const boardGeo=roundedGeo(1.55,.11,2.46,.035);
 const backGeo=roundedGeo(.11,RACK_HEIGHT,2.48,.024);
 const postGeo=roundedGeo(.13,RACK_HEIGHT,.16,.029);
 const lipGeo=roundedGeo(.09,.18,2.46,.026);
 const kickGeo=roundedGeo(.13,.31,2.46,.03);
 const metal=new THREE.MeshStandardMaterial({color:'#d8dbd9',metalness:.36,roughness:.42});
 const darkMetal=new THREE.MeshStandardMaterial({color:'#9fa8a6',metalness:.5,roughness:.4});
 const boards=add(new THREE.InstancedMesh(boardGeo,metal,per*TIERS));
 const backs=add(new THREE.InstancedMesh(backGeo,darkMetal,per));
 const posts=add(new THREE.InstancedMesh(postGeo,darkMetal,per*2));
 const lips=add(new THREE.InstancedMesh(lipGeo,metal,per*TIERS));
 const kicks=add(new THREE.InstancedMesh(kickGeo,darkMetal,per));
 // Physical shelf bolts and two angled rear brace struts per bay. One draw call
 // per detail category instead of thousands of separate meshes (MacBook-safe).
 const boltGeo=new THREE.CylinderGeometry(.046,.046,.028,6);
 const bolts=add(new THREE.InstancedMesh(boltGeo,new THREE.MeshStandardMaterial({
  color:'#515d60',metalness:.79,roughness:.27
 }),per*TIERS*4));
 const braceGeo=roundedGeo(.055,RACK_HEIGHT*.84,.058,.009);
 const braces=add(new THREE.InstancedMesh(braceGeo,darkMetal,per*2));
 bolts.frustumCulled=false;braces.frustumCulled=false;
 for(const inst of [boards,backs,posts,lips,kicks])inst.frustumCulled=false;
 let bi=0,ri=0,pi=0,ki=0,boltIndex=0,braceIndex=0;
 for(let a=0;a<AISLES;a++){
  const aisleLabel=textLabel('AISLE '+String(a+1).padStart(2,'0')+'  |  '+goods[a%goods.length],5.6,.7,'#465f55','#ffffff',39);
  aisleLabel.position.set(aisleX(a),4.35,9.1);add(aisleLabel);
  // No elevated aisle-top flags: the single entrance-facing aisle sign remains.
  for(let side=0;side<2;side++)for(let bay=0;bay<BAYS;bay++){
   const sg=side===0?-1:1,x=aisleX(a)+sg*3.4,z=bayZ(bay);
   dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
   dummy.position.set(x+sg*.46,RACK_HEIGHT/2,z);dummy.updateMatrix();
   backs.setMatrixAt(ri,dummy.matrix);
   backs.setColorAt(ri,color.set('#b2b7b3'));ri++;
   for(const offs of [-1.15,1.15]){
    dummy.position.set(x+sg*.1,RACK_HEIGHT/2,z+offs);dummy.updateMatrix();
    posts.setMatrixAt(pi,dummy.matrix);posts.setColorAt(pi++,color.set('#737d80'));
   }
   dummy.position.set(x-sg*.55,.22,z);dummy.updateMatrix();
   kicks.setMatrixAt(ki,dummy.matrix);kicks.setColorAt(ki++,color.set('#727d79'));
   for(let tier=0;tier<TIERS;tier++){
    dummy.position.set(x,TIER_Y[tier]-.07,z);dummy.updateMatrix();boards.setMatrixAt(bi,dummy.matrix);
    boards.setColorAt(bi,color.set('#d7dad7'));
    dummy.position.set(x-sg*.72,TIER_Y[tier]+.025,z);dummy.updateMatrix();lips.setMatrixAt(bi,dummy.matrix);
    lips.setColorAt(bi,color.set(tier===3?'#b09973':tier===2?'#8c9a8f':'#c6c9c2'));bi++;
    // Four small hex fasteners fix every shelf lip to its supports.
    for(const zOffset of [-1.0,1.0])for(const yOffset of [-.042,.042]){
      dummy.position.set(x-sg*.77,TIER_Y[tier]+.024+yOffset,z+zOffset);
      dummy.rotation.set(0,0,Math.PI/2);
      dummy.updateMatrix();bolts.setMatrixAt(boltIndex++,dummy.matrix);
    }
    dummy.rotation.set(0,0,0);
   }
   // Rear crossed rack braces: diagonals align with real upright positions.
   for(const direction of [-1,1]){
     dummy.position.set(x+sg*.54,RACK_HEIGHT/2,z);
     dummy.rotation.set(direction*.18,0,0);
     dummy.updateMatrix();braces.setMatrixAt(braceIndex++,dummy.matrix);
   }
   dummy.rotation.set(0,0,0);
  }
 }
 for(const m of [boards,backs,posts,lips,kicks,bolts,braces]){
  m.instanceMatrix.needsUpdate=true;
  if(m.instanceColor)m.instanceColor.needsUpdate=true;
 }
 // Price-band notices: 1¢ low, 2¢ step ladder, 3¢ telescopic extension.
 for(let a=0;a<AISLES;a++)for(let side of [0,1]){
  const label=textLabel('1c  /  1c  /  2c  /  3c',2.65,.34,'#f4f2e8','#445651',34);
  label.position.set(aisleX(a)+(side===0?-2.3:2.3),3.38,12.15);
  label.rotation.y=0;add(label);
  const endPlate=round(.18,.85,.68,'#72837c');
  endPlate.position.set(aisleX(a)+(side===0?-3.1:3.1),2.45,11.56);
  const yellowGuard=round(.21,.14,.8,'#d4aa65');
  yellowGuard.position.set(aisleX(a)+(side===0?-3.1:3.1),2.04,11.56);
 }
 const maxForType=Math.ceil(AISLES/5)*2*BAYS*TIERS*SLOTS;
 meshes=Array.from({length:5},(_,i)=>{
   const m=add(new THREE.InstancedMesh(itemGeometry(i),new THREE.MeshStandardMaterial({map:productTexture(i),metalness:.05,roughness:.57}),maxForType));
   m.count=0;m.frustumCulled=false;return m;
 });
 for(let i=s.floor*CELLS_PER_FLOOR;i<(s.floor+1)*CELLS_PER_FLOOR;i++){
   for(let k=0;k<s.fill[i];k++)drawProduct(i,k);
 }
}
function drawProduct(id,slot){
 const {floor,aisle,side,bay,tier}=decode(id);if(floor!==s.floor||!meshes.length)return;
 const m=meshes[aisle%5],idx=m.count++;if(idx>=m.instanceMatrix.count)return;
 const sg=side===0?-1:1;
 dummy.position.set(aisleX(aisle)+sg*2.93,TIER_Y[tier]+.07,bayZ(bay)+(slot-1.5)*.53);
 dummy.rotation.set(0,(slot+id)*1.14%6.28,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
 m.setMatrixAt(idx,dummy.matrix);
 const palettes=[['#9f5948','#b56b51','#b47d54'],['#72909c','#91a5aa','#b6c8c8'],['#805654','#5e745d','#68617a'],['#bd9f6d','#b59e75','#9d866b'],['#8b9c86','#a26d60','#79919b']];
 m.setColorAt(idx,color.set(['#ffffff','#e5eeeb','#d7e4e0'][slot%3]));
 m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;
}


return {buildShell,buildService,buildShelves,drawProduct,getMike:()=>mikeModel};
}
