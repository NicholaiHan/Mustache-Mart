import * as THREE from 'three';
import {polishedTileTexture,matteWallTexture,productTexture,cartonTexture} from './textures.js';
import {AISLES,BAYS,TIERS,SLOTS,CELLS_PER_FLOOR,DOCK,aisleX,bayZ,decode,floorLabel} from './rules.mjs';
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
 contactShadow(10,-3.2,6.6,3.5,.24);
 contactShadow(1.5,-9,5.6,3.8,.2);
 contactShadow(DOCK.x,DOCK.z,5.5,4.2,.25);
 const payBack=round(5.6,3.6,.24,'#536363');payBack.position.set(10,2.8,-8.5);
 const counter=round(5.1,1.18,2.05,'#dddcd5');counter.position.set(10,.59,-3.2);
 const workTop=round(5.32,.13,2.18,'#7e8988');workTop.position.set(10,1.24,-3.2);
 const glassMat=new THREE.MeshStandardMaterial({color:'#b8d1d3',transparent:true,opacity:.24,metalness:.1,roughness:.12,depthWrite:false});
 const glass=cube(4.95,1.8,.06,glassMat);glass.position.set(10,2.65,-3.89);
 for(const x of [7.5,12.5]){const stanchion=round(.1,2.24,.17,'#657477');stanchion.position.set(x,2.56,-3.89);}
 const windowSign=textLabel('PAYROLL  /  STAFF SERVICES',4.8,.69,'#dce4dd','#33443d',37,'interior');
 windowSign.position.set(10,4.1,-3.75);add(windowSign);
 const terminal=round(.74,.47,.12,'#303b40');terminal.position.set(9.2,1.56,-3.05);
 const screen=round(.5,.27,.03,new THREE.MeshBasicMaterial({color:'#92c4b6'}));screen.position.set(9.2,1.6,-2.97);
 const documents=round(.78,.035,.43,'#f4f2e8');documents.position.set(10.9,1.35,-2.96);
 // Printer, receipt roll, ledger, terminal frame, and a small queue barrier.
 const printer=round(.64,.35,.58,'#e2e5e1');printer.position.set(11.45,1.49,-3.25);
 const printed=round(.41,.02,.28,'#f9f8ee');printed.position.set(11.45,1.7,-3.04);
 for(const x of [6.75,13.25]){
   const post=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.94,14),new THREE.MeshStandardMaterial({color:'#9ba5a1',metalness:.62,roughness:.3}));
   post.position.set(x,.47,-.5);add(post);
   const foot=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.09,16),new THREE.MeshStandardMaterial({color:'#465655',metalness:.46,roughness:.45}));
   foot.position.set(x,.045,-.5);add(foot);
 }
 const rope=round(6.5,.055,.05,'#6f847b');rope.position.set(10,.81,-.5);
 const payLogo=textLabel('PAYROLL VERIFIED  |  STAFF ONLY',4.3,.59,'#3d5c53','#f3f4ee',31,'interior');
 payLogo.position.set(10,3.65,-8.2);add(payLogo);
 const clipboard=round(.44,.67,.045,'#c4b394');clipboard.position.set(13.1,1.7,-3.95);
 const notebook=textLabel('MM  /  001',.38,.14,'#eae2c8','#343f37',27,'interior');
 notebook.position.set(13.1,1.74,-3.916);add(notebook);
 addKiosk(1.5,-9,'MUSTACHE MIKE','#c8c2b6','interior');
 mikeModel=makeMike(1.5,-7.1);
 const elevator=round(5.1,6.5,.6,'#71888c');elevator.position.set(23,3.25,-11.4);
 const seam=round(.09,6.1,.12,'#3b484e');seam.position.set(23,3.25,-11.03);
 const upper=round(5.6,.35,.7,'#404c50');upper.position.set(23,6.48,-11.34);
 const esign=textLabel('ELEVATOR  /  F01–F15',5.6,.75,'#e0e4db','#344541',39,'interior');
 esign.position.set(23,7.2,-11.02);add(esign);
 const receivingRack=round(4.3,3.8,.75,'#838f8d');receivingRack.position.set(7.7,1.9,96.4);
 for(let shelf=1;shelf<4;shelf++){const r=round(4.5,.11,1.2,'#c2c7c0');r.position.set(7.7,shelf*.98,96.4);}
 const dockTerminal=round(.85,1.1,.52,'#7a8b8c');dockTerminal.position.set(3.7,.59,95.8);
 const dockScreen=round(.64,.43,.08,new THREE.MeshBasicMaterial({color:'#accfbd'}));dockScreen.position.set(3.7,.95,95.49);
 // Receiving workstation: hanging rack structure, scanners, pallet jack and boxes.
 const jack=new THREE.Group();add(jack);jack.position.set(10.7,0,94.1);
 for(const off of [-.55,.55]){
   const tine=round(.19,.11,2.1,'#b88c4e',jack);tine.position.set(off,.18,.35);
   const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.15,16),
     new THREE.MeshStandardMaterial({color:'#273035',roughness:.92}));
   wheel.rotation.z=Math.PI/2;wheel.position.set(off,.13,1.26);jack.add(wheel);
 }
 const jackHandle=round(.15,1.4,.13,'#566969',jack);jackHandle.position.set(0,.78,-.84);
 const grip=round(.67,.11,.13,'#263a3e',jack);grip.position.set(0,1.52,-.84);
 const scanner=round(.15,.37,.26,'#32454b');scanner.position.set(4,.99,95.1);
 const scannerLight=round(.1,.052,.15,new THREE.MeshBasicMaterial({color:'#7fe6bb'}));scannerLight.position.set(4,1.2,95.02);
 const dataPanel=textLabel('SCAN  |  VERIFY  |  DISPATCH',4.0,.48,'#3c5652','#e5ecdf',31,'entrance');
 dataPanel.position.set(7.1,4.4,95.2);add(dataPanel);
 const receivingLabel=textLabel('INVENTORY  /  RECEIVING',5.4,.77,'#dfd9c4','#414d48',39,'entrance');receivingLabel.position.set(DOCK.x,5.7,94.35);add(receivingLabel);
 const entranceSign=textLabel('CUSTOMER SERVICE   |   PAYROLL',8.2,.76,'#e5e5db','#475752',39,'interior');
 entranceSign.position.set(9,4.65,-11.7);add(entranceSign);
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
 for(const inst of [boards,backs,posts,lips,kicks])inst.frustumCulled=false;
 let bi=0,ri=0,pi=0,ki=0;
 for(let a=0;a<AISLES;a++){
  const aisleLabel=textLabel('AISLE '+String(a+1).padStart(2,'0')+'  |  '+goods[a%goods.length],5.6,.7,'#465f55','#ffffff',39);
  aisleLabel.position.set(aisleX(a),4.35,9.1);add(aisleLabel);
  const highTag=textLabel(goods[a%goods.length]+'  •  '+(a+1),5.6,.78,'#d7dbd5','#384441',47);
  highTag.position.set(aisleX(a),14.55,9.3);add(highTag);
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
   }
  }
 }
 for(const m of [boards,backs,posts,lips,kicks]){
  m.instanceMatrix.needsUpdate=true;
  if(m.instanceColor)m.instanceColor.needsUpdate=true;
 }
 // Price-band notices: 1¢ low, 2¢ step ladder, 3¢ telescopic extension.
 for(let a=0;a<AISLES;a++)for(let side of [0,1]){
  const label=textLabel('1c  /  1c  /  2c  /  3c',2.65,.34,'#f4f2e8','#445651',34);
  label.position.set(aisleX(a)+(side===0?-2.3:2.3),3.38,12.15);
  label.rotation.y=0;add(label);
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
