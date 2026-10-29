import * as THREE from 'three';
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
function buildShell(){
 const theme=pastel[s.floor%pastel.length];
 scene.background.set('#d8ddda');scene.fog.color.set('#d8ddda');
 // Fine pale ceramic tiles with subtle grout and material variation.
 const fc=document.createElement('canvas');fc.width=fc.height=256;
 const ctx=fc.getContext('2d');
 ctx.fillStyle='#d6d4cd';ctx.fillRect(0,0,256,256);
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const shade=(row*7+col*3)%3;
  ctx.fillStyle=['#e6e6e0','#e9e9e3','#e2e4e0'][shade];
  ctx.fillRect(col*64+2,row*64+2,60,60);
 }
 ctx.strokeStyle='#c6c8c4';ctx.lineWidth=1;
 for(let p=0;p<=256;p+=64){ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,256);ctx.stroke();}
 const tiles=new THREE.CanvasTexture(fc);tiles.wrapS=tiles.wrapT=THREE.RepeatWrapping;
 tiles.repeat.set(FLOOR_W/6,FLOOR_D/6);
 const ground=add(new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W,FLOOR_D),new THREE.MeshStandardMaterial({map:tiles,roughness:.9})));
 ground.rotation.x=-Math.PI/2;ground.position.set(46.5,0,44);
 const ceiling=cube(FLOOR_W,.28,FLOOR_D,'#e8e8e4');ceiling.position.set(46.5,CEILING_Y,44);
 // Lightly textured industrial wall coating and physical door apertures.
 // A single solid panel is never placed behind either interactive door.
 const plaster=document.createElement('canvas');plaster.width=plaster.height=256;
 const pc=plaster.getContext('2d');pc.fillStyle='#d9ddda';pc.fillRect(0,0,256,256);
 for(let i=0;i<4400;i++){
   const n=(i*181+37)%65536,x=n%256,y=(i*53+Math.floor(i/256)*19)%256;
   pc.fillStyle=i%3?'#d4d8d5':'#e1e4e1';pc.fillRect(x,y,1+(i%3),1+(i%2));
 }
 const wallTex=new THREE.CanvasTexture(plaster);wallTex.wrapS=wallTex.wrapT=THREE.RepeatWrapping;
 wallTex.repeat.set(7,1.2);
 const wallMat=new THREE.MeshStandardMaterial({map:wallTex,roughness:.94,metalness:0});
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
 wallSegment(-10,44,.5,114);
 wallSegment(46.5,100.7,113,.5);
 if(s.floor===0){
   // Fire exit aperture on right side, centered z=40.5, width 3.4 m.
   wallSegment(103,12.9,.5,51.8);
   wallSegment(103,71.6,.5,58.8);
   wallSegment(103,40.5,.5,3.4,CEILING_Y-4.65,(CEILING_Y+4.65)/2);
   // Front entrance opening x=42.5..50.5, with a tall structural lintel.
   wallSegment(16.25,-12.7,52.5,.5);
   wallSegment(76.75,-12.7,52.5,.5);
   wallSegment(46.5,-12.7,8,.5,CEILING_Y-5.45,(CEILING_Y+5.45)/2);
 }else{
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
 for(let j=0;j<8;j++){
  const x=30+(j%4)*3.5,z=95+Math.floor(j/4)*3.0;
  const pallet=round(2.7,.22,2.4,'#9d8264');pallet.position.set(x,.14,z);
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let level=0;level<2;level++){
   const box=round(1.1,.75,.95,['#b39d7c','#b7a98b','#afa38d'][(j+a+b)%3]);
   box.position.set(x+(a-.5)*1.15,.64+level*.78,z+(b-.5)*1.07);
   const tape=cube(.09,.77,.99,'#e1d9c4');tape.position.copy(box.position);tape.position.y+=.02;
  }
 }
 for(let z=91;z<98;z+=2.2){
  const stripe=cube(4,.02,.22,'#d9be6d');stripe.position.set(1.5,.035,z);
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
   const m=add(new THREE.InstancedMesh(itemGeometry(i),toon('#ffffff'),maxForType));
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
 m.setColorAt(idx,color.set(palettes[aisle%5][slot%3]));
 m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;
}


return {buildShell,buildService,buildShelves,drawProduct,getMike:()=>mikeModel};
}
