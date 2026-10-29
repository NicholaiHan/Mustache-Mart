import * as THREE from 'three';
import {
 FLOORS,AISLES,BAYS,TIERS,SLOTS,CENTS,DOCK,CELLS_PER_FLOOR,TOTAL_ITEMS,SAVE_KEY,
 aisleX,bayZ,floorLabel,centsText,UPGRADES,cellId,decode,loadState,serialize,
 capacity,walkSpeed,price,purchase,payOut,place,earnings,buildBelt,beltCost,incomplete,
 floorStocked,itemsPerFloor,remaining,botStep
} from './rules.mjs';

const $=id=>document.getElementById(id);
// Upgrade existing fifteen-floor saves by reindexing their old three-band shelves.
let s=loadState(localStorage.getItem(SAVE_KEY) || localStorage.getItem('mustacheMartV3'));
if(location.hash==='#rich')s.money=100000;
const TEST_ENDING=location.hash==='#ending-test', PREVIEW_ENDING=location.hash==='#ending'||TEST_ENDING;
const V={x:33,z:-3,y:0,vy:0,yaw:Math.PI,pitch:0,carry:0,walked:0};
let running=false,modal='intro',mouseDown=false,held={},last=performance.now(),actionClock=0,shopCategory='tools';
let currentFloor=-1,world=null,meshes=[],robotModels=new Map(),beltCrates=[],cartMesh=null,ladderMesh=null,ladder=null;
let ending=false,endStarted=false,endingTimer=0,endComplete=false,toastTimer=0,savingAt=0;
const NOTE='Easy shelves: 1¢ · ladder: 2¢ · upgraded ladder: 3¢ · deliveries at the BACK';
function notify(msg){$('toast').textContent=msg;$('toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity='0',2700);}
function save(){try{localStorage.setItem(SAVE_KEY,serialize(s));}catch(err){notify('Could not save: browser storage might be full or unavailable.');}}
setInterval(save,5000);addEventListener('beforeunload',save);
function uiUpdate(){
 $('floorStat').textContent=floorLabel(s.floor)+' / F15';
 $('money').textContent=centsText(s.money);
 $('pending').textContent=centsText(s.pending);
 $('carry').textContent=V.carry+' / '+capacity(s);
 $('robots').textContent=s.robots.length;
 $('progressText').textContent=s.stocked.toLocaleString()+' / '+TOTAL_ITEMS.toLocaleString()+' items · '+floorLabel(s.floor)+': '+Math.round(floorStocked(s,s.floor)/itemsPerFloor*100)+'%';
 $('progress-bar').style.width=(s.stocked/TOTAL_ITEMS*100)+'%';
 $('objective').textContent=(V.carry===0?'Run all the way to the BACK WAREHOUSE for inventory. Follow the overhead receiving signs.':
   'Look at a rack and hold E to stock. Upper bays need jumping, a ladder or the extended ladder.')+' '+NOTE;
}
const renderer=(()=>{try{return new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});}catch(e){
 $('loading').innerHTML='<div>3D graphics unavailable. Update your browser or try Chrome with hardware acceleration enabled. The game has not loaded.</div>';throw e;
}})();
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#d9dfe0');scene.fog=new THREE.Fog('#d9dfe0',75,190);
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,1100);camera.rotation.order='YXZ';
scene.add(camera);
const skyLight=new THREE.HemisphereLight('#ffffff','#a7afb6',1.55);scene.add(skyLight);
const sunlight=new THREE.DirectionalLight('#ffffff',1.1);sunlight.position.set(-30,75,35);scene.add(sunlight);
const toon=(c,extra={})=>new THREE.MeshToonMaterial({color:c,...extra});
const baseMat=new THREE.MeshStandardMaterial({color:'#d9dedf',roughness:.52,metalness:.12});
const pastel=['#849b92','#83949c','#b5a28b','#9aaba9','#a5a19a'];
const goods=['SOUP','WATER','WINE','CEREAL','SODA'];
const FLOOR_W=113,FLOOR_D=114,FRONT=-13,BACK=101;
// Roughly four times taller than the prototype: 13.5m industrial racks.
const RACK_HEIGHT=13.5,CEILING_Y=16.2;
const TIER_Y=[.65,2.65,6.9,11.8],CHEST_REACH=1.8;
const dummy=new THREE.Object3D(),color=new THREE.Color();
function add(mesh,parent=world){parent.add(mesh);return mesh;}
function cube(w,h,d,c,parent=world){return add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'||typeof c==='number'?toon(c):c),parent);}
function roundedGeo(w,h,d,r=.09){
 const shape=new THREE.Shape(),rad=Math.min(r,w/2,h/2);
 shape.moveTo(-w/2+rad,-h/2);
 shape.lineTo(w/2-rad,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+rad);
 shape.lineTo(w/2,h/2-rad);shape.quadraticCurveTo(w/2,h/2,w/2-rad,h/2);
 shape.lineTo(-w/2+rad,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-rad);
 shape.lineTo(-w/2,-h/2+rad);shape.quadraticCurveTo(-w/2,-h/2,-w/2+rad,-h/2);
 const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:4});
 g.translate(0,0,-d/2);return g;
}
function round(w,h,d,mat,parent=world){return add(new THREE.Mesh(roundedGeo(w,h,d),typeof mat==='string'||typeof mat==='number'?toon(mat):mat),parent);}
function textLabel(text,w=3,h=.75,bg='#fffaf0',fg='#302945',font=44){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*h/w);
 const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#302945';ctx.lineWidth=12;ctx.strokeRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+font+'px system-ui';ctx.fillText(text,256,canvas.height/2,480);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:false,side:THREE.FrontSide}));
 // Every lettered sign faces the entrance (-Z); its reverse is never mirrored.
 sign.rotation.y=Math.PI;
 return sign;
}
function clearWorld(){
 if(!world)return;
 scene.remove(world);
 const gg=new Set(),mm=new Set(),tt=new Set();
 world.traverse(o=>{if(o.geometry)gg.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){mm.add(m);if(m.map)tt.add(m.map);}});
 for(const g of gg)g.dispose();for(const m of mm)m.dispose();for(const t of tt)t.dispose();
}
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
 scene.background.set(theme);scene.fog.color.set(theme);
 const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=128;
 const ctx=floorCanvas.getContext('2d');ctx.fillStyle='#fff6e5';ctx.fillRect(0,0,128,128);
 ctx.fillStyle='#f4e7e5';ctx.fillRect(0,0,64,64);ctx.fillRect(64,64,64,64);
 ctx.strokeStyle='#e9d9d1';ctx.lineWidth=3;for(let p=0;p<=128;p+=64){ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,128);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(128,p);ctx.stroke();}
 const tex=new THREE.CanvasTexture(floorCanvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(FLOOR_W/4,FLOOR_D/4);
 const tiles=add(new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W,FLOOR_D),new THREE.MeshStandardMaterial({map:tex,roughness:.85})));
 tiles.rotation.x=-Math.PI/2;tiles.position.set(46.5,0,44);
 const ceiling=cube(FLOOR_W,.3,FLOOR_D,'#fffbe9');ceiling.position.set(46.5,6.3,44);
 for(const [x,z,w,d] of [[-10,44,.5,114],[103,44,.5,114],[46.5,100.7,113,.5],[46.5,-12.7,113,.5]]){
 const wall=cube(w,6.25,d,theme);wall.position.set(x,3.1,z);
 }
 for(let x=-1;x<100;x+=10)for(let z=0;z<100;z+=18){
   const lamp=round(3.4,.09,.35,new THREE.MeshBasicMaterial({color:'#fffef0'}));lamp.position.set(x,6.09,z);
 }
 // Colored pillars and tall glass display panels avoid the empty-box feel.
 for(let z=8;z<96;z+=20){
   const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.26,.3,6.1,16),toon('#ffcf7b'));pillar.position.set(101.8,3.05,z);add(pillar);
   const glass=cube(.05,2.8,12,new THREE.MeshStandardMaterial({color:'#c3eeff',metalness:.18,roughness:.12,transparent:true,opacity:.65}));
   glass.position.set(102.2,3.2,z);
 }
 const sign=textLabel('MUSTACHE MART · '+floorLabel(s.floor),11,1.2,'#ff9db6','#322947',54);sign.position.set(45,5.3,-11.95);add(sign);
 const mapSign=textLabel('15 FLOORS · 108,000 PRODUCTS',9.4,.75,'#f5fff4','#343249',37);mapSign.position.set(45,4.2,-11.8);add(mapSign);
}
function addKiosk(x,z,name,accent){
 const platform=round(4,1.1,2.3,'#ffffff');platform.position.set(x,.55,z);
 const top=round(4.5,.18,2.6,accent);top.position.set(x,1.18,z);
 const stripe=round(4.1,.22,.2,'#322947');stripe.position.set(x,.85,z-1.18);
 const sign=textLabel(name,4.5,.85,accent,'#322947',48);sign.position.set(x,2.8,z-1);add(sign);
}
function makeMike(x,z){
 const guy=new THREE.Group();add(guy);
 const body=round(1.1,1.25,.7,'#5cbfd1',guy);body.position.set(0,1.1,0);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.42,20,16),toon('#ffc997'));head.position.set(0,2.05,0);guy.add(head);
 for(const sign of [-1,1]){
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.066,10,8),toon('#26233b'));eye.position.set(sign*.15,2.12,-.35);guy.add(eye);
 const moustache=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),toon('#332237'));moustache.scale.set(1,.45,.6);moustache.position.set(sign*.14,1.88,-.39);moustache.rotation.z=sign*.25;guy.add(moustache);
 }
 guy.position.set(x,0,z);
}
function buildService(){
 addKiosk(-5,-3,'DELIVERY DOCK','#ffdf70');addKiosk(10,-3,'PAY WINDOW','#95e7cb');
 addKiosk(1.5,-9,'MUSTACHE MIKE','#ffb2d0');makeMike(1.5,-7.1);
 const elevator=round(5,4.8,.6,'#8d9bc4');elevator.position.set(23,2.4,-11.4);
 const seam=round(.09,4.3,.12,'#373747');seam.position.set(23,2.4,-11.03);
 const esign=textLabel('ELEVATOR · 1–15',5.5,.75,'#c9f7ff','#322947',43);esign.position.set(23,5.4,-11.0);add(esign);
}
function buildShelves(){
 const per=AISLES*2*BAYS;
 const boardGeo=roundedGeo(1.45,.13,2.46),backGeo=roundedGeo(.13,3.35,2.48),lipGeo=roundedGeo(.11,.15,2.46);
 const material=new THREE.MeshStandardMaterial({color:'#fffdf6',roughness:.43,metalness:.08});
 const boards=add(new THREE.InstancedMesh(boardGeo,material,per*TIERS));
 const backs=add(new THREE.InstancedMesh(backGeo,material,per));
 const lips=add(new THREE.InstancedMesh(lipGeo,material,per*TIERS));
 boards.frustumCulled=backs.frustumCulled=lips.frustumCulled=false;
 let bi=0,ri=0;
 for(let a=0;a<AISLES;a++){
  const tag=textLabel('AISLE '+(a+1)+' · '+goods[a%goods.length],5,.82,pastel[a%5],'#302945',38);
  tag.position.set(aisleX(a),4.55,9.6);add(tag);
  for(let side=0;side<2;side++)for(let bay=0;bay<BAYS;bay++){
   const sg=side===0?-1:1,x=aisleX(a)+sg*3.4,z=bayZ(bay);
   dummy.position.set(x+sg*.45,1.76,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();backs.setMatrixAt(ri,dummy.matrix);
   backs.setColorAt(ri,color.set(pastel[a%5]));ri++;
   for(let tier=0;tier<TIERS;tier++){
     dummy.position.set(x,TIER_Y[tier]-.06,z);dummy.updateMatrix();boards.setMatrixAt(bi,dummy.matrix);
     boards.setColorAt(bi,color.set('#ffffff'));
     dummy.position.set(x-sg*.7,TIER_Y[tier]+.035,z);dummy.updateMatrix();lips.setMatrixAt(bi,dummy.matrix);
     lips.setColorAt(bi,color.set(pastel[a%5]));bi++;
   }
  }
 }
 for(const m of [boards,backs,lips]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
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
 const palettes=[['#ff657f','#ffa956','#fff176'],['#6ebcfa','#87e1df','#e7f9ff'],['#8a3d68','#3f7a63','#56375d'],['#ffa453','#eadd63','#e67b80'],['#8abef8','#ff8e8e','#93d9a2']];
 m.setColorAt(idx,color.set(palettes[aisle%5][slot%3]));
 m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;
}
function makeBelt(f,a,segment){
 const group=new THREE.Group();world.add(group);const z=bayZ(BAYS-1-segment);
 group.position.set(aisleX(a)+1.4,0,z);
 const base=round(.98,.28,2.55,'#667682',group);base.position.y=.25;
 for(let k=0;k<5;k++){
 const roller=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.93,12),toon('#38485a'));
 roller.rotation.z=Math.PI/2;roller.position.set(0,.41,(k-2)*.55);group.add(roller);
 }
 const crate=round(.55,.42,.52,'#d89b5b',group);crate.position.set(0,.75,0);
 beltCrates.push({crate,segment});
}
function botAppearance(r){
 const b=new THREE.Group();world.add(b);
 const body=round(.78,.82,.6,'#79dcc8',b);body.position.y=.7;
 const head=round(.66,.46,.55,'#b4fff0',b);head.position.y=1.33;
 for(let j of [-1,1]){
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.073,12,10),toon('#252539'));eye.position.set(j*.18,1.41,-.29);b.add(eye);
 const moustache=new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),toon('#49314b'));moustache.scale.set(1,.42,.55);moustache.position.set(j*.15,1.2,-.33);moustache.rotation.z=j*.28;b.add(moustache);
 }
 for(let j of [-1,1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.2,14),toon('#424251'));wheel.rotation.z=Math.PI/2;wheel.position.set(j*.42,.26,0);b.add(wheel);}
 const crate=round(.37,.3,.35,'#d8a05f',b);crate.position.set(0,1,-.38);crate.name='crate';
 b.position.set(r.x,0,r.z);return b;
}
function makeCart(){
 if(!s.levels.cart)return;
 cartMesh=new THREE.Group();world.add(cartMesh);
 const base=round(1.2,.33,1.5,'#f7c357',cartMesh);base.position.y=.38;
 const mast=round(.13,1.5,.16,'#80becd',cartMesh);mast.position.set(.35,1.25,.45);
 const shelf=round(.8,.12,.9,'#ffffff',cartMesh);shelf.position.set(.15,2,.2);
 for(let side of [-1,1])for(let z of [-.5,.5]){
 const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.16,16),toon('#393344'));wheel.rotation.z=Math.PI/2;wheel.position.set(side*.57,.22,z);cartMesh.add(wheel);
 }
}
function makeLadder(){
 if(!ladder||s.levels.cart||ladder.floor!==s.floor)return;
 ladderMesh=new THREE.Group();world.add(ladderMesh);
 for(const x of [-.4,.4]){const h=s.levels.ladderPlus?10.6:6.2;const post=round(.13,h,.13,'#d5a844',ladderMesh);post.position.set(x,h/2+.1,0);}
 for(let n=0;n<(s.levels.ladderPlus?18:10);n++){const rung=round(.82,.12,.3,'#b5bec3',ladderMesh);rung.position.set(0,.42+n*.55,0);}
 ladderMesh.position.set(ladder.x,0,ladder.z);
}
function buildWorld(){
 clearWorld();world=new THREE.Group();scene.add(world);currentFloor=s.floor;meshes=[];beltCrates=[];cartMesh=null;ladderMesh=null;robotModels=new Map();
 buildShell();buildService();buildShelves();
 for(let a=0;a<AISLES;a++)for(let seg=0;seg<s.belts[s.floor][a];seg++)makeBelt(s.floor,a,seg);
 for(const r of s.robots)if(r.floor===s.floor)robotModels.set(r.id,botAppearance(r));
 makeCart();makeLadder();
 uiUpdate();
}
function isBlocked(x,z){
 if(x<-9.2||x>100.8||z<-11.2||z>99)return true;
 if(z>11.2&&z<93.2)for(let a=0;a<AISLES;a++){
 const rel=Math.abs(x-aisleX(a));if(rel>2.57&&rel<4.2)return true;
 }
 return false;
}
function nearestAisle(){let a=Math.round((V.x-8)/10);return Math.max(0,Math.min(AISLES-1,a));}
function nearestBay(){return Math.max(0,Math.min(BAYS-1,Math.round((V.z-13)/2.65)));}
function nearby(x,z,d){return Math.hypot(V.x-x,V.z-z)<d;}
function cellToStock(){
 const a=nearestAisle(),bay=nearestBay();
 if(Math.abs(V.x-aisleX(a))>2.7||Math.abs(V.z-bayZ(bay))>1.75)return -1;
 const faceX=-Math.sin(V.yaw),side=faceX>=0?1:0;
 const tier=V.pitch>.78?3:V.pitch>.38?2:V.pitch<-.3?0:1;
 return cellId(s.floor,a,side,bay,tier);
}
function isLadderNear(){return ladder&&ladder.floor===s.floor&&nearby(ladder.x,ladder.z,3.2);}
function isCartNear(){return s.levels.cart&&s.cart.floor===s.floor&&nearby(aisleX(s.cart.aisle),s.cart.z,3.6);}
function canReach(tier){
 if(tier===0)return true;
 if(tier===1)return V.y>.35||isLadderNear()||isCartNear();
 if(tier===2)return isLadderNear()||isCartNear();
 return (isLadderNear()&&s.levels.ladderPlus)||isCartNear();
}
function manualStock(){
 if(!V.carry)return false;
 const id=cellToStock();
 if(id<0)return false;
 const t=id%TIERS;
 if(!canReach(t)){notify(t===3?'TOP RACK: buy the telescopic ladder extension or mobile cart for 3¢ items!':t===2?'HIGH RACK: a nearby step ladder earns you 2¢ per item!':'That rack needs a jump or a nearby ladder.');return false;}
 const old=s.fill[id],c=place(s,id,false);
 if(!c){notify('That shelf is full. Look for another empty spot.');return false;}
 V.carry--;drawProduct(id,old);
 if(s.stocked>=TOTAL_ITEMS)beginEnding();
 return true;
}
function act(){
 if(modal||ending)return;
 if(nearby(1.5,-7,4.0)){openShop();return;}
 if(nearby(10,-3,4.0)){const paid=payOut(s);notify(paid?'Collected '+centsText(paid)+' in wages.':'No outstanding wages. Stock products first!');save();return;}
 if(nearby(23,-9,4.4)){openElevator();return;}
 if(nearby(DOCK.x,DOCK.z,4.4)&&V.carry<capacity(s)){V.carry++;return;}
 if(manualStock())return;
}
function pointerRequest(){
 if(!renderer.domElement.requestPointerLock)return;
 try{const result=renderer.domElement.requestPointerLock();if(result?.catch)result.catch(()=>notify('Mouse capture unavailable. Arrow keys still let you look.'));}catch(_){notify('Mouse capture unavailable; use arrow keys to look.');}
}
function show(id){for(const key of ['intro','shop','elevator','end'])$(key).classList.toggle('open',key===id);modal=id;running=!id&&!ending;if(id)document.exitPointerLock?.();}
function resume(){show(null);running=true;pointerRequest();}
function openShop(){
 if(!nearby(1.5,-7,4.6)){notify('Find Mustache Mike at the front customer service counter.');return;}
 show('shop');renderShop();
}
function renderShop(){
 $('shopMoney').textContent=centsText(s.money);
 for(const name of ['tools','economy']){
  const tab=$('tab-'+name);tab.setAttribute('aria-pressed',String(shopCategory===name));
  tab.classList.toggle('selected',shopCategory===name);
 }
 const list=$('shopitems');list.replaceChildren();
 for(const u of UPGRADES.filter(u=>(u.category||'tools')===shopCategory)){
  const lv=s.levels[u.id],cost=price(u,lv),max=lv>=u.max;
  const row=document.createElement('div');row.className='upgrade';
  const info=document.createElement('div'),name=document.createElement('strong'),desc=document.createElement('small');
  name.textContent=u.name+' · Lv '+lv+'/'+u.max;desc.textContent=u.detail;
  info.append(name,desc);const btn=document.createElement('button');
  btn.textContent=max?'MAXED':centsText(cost);btn.disabled=max||s.money<cost||(['cart','ladderPlus'].includes(u.id)&&!s.levels.ladder);
  btn.addEventListener('click',()=>{
   if(!purchase(s,u.id))return;
   if(u.id==='robot'){const r=s.robots[s.robots.length-1];if(r?.floor===s.floor)robotModels.set(r.id,botAppearance(r));}
   if(u.id==='cart'){ladder=null;buildWorld();}
   save();renderShop();uiUpdate();
  });
  row.append(info,btn);list.append(row);
 }
}
function openElevator(){
 if(!nearby(23,-9,4.5)){notify('Use the elevator near the front of the store.');return;}
 show('elevator');const list=$('elevatorlist');list.replaceChildren();
 for(let f=0;f<FLOORS;f++){
  const btn=document.createElement('button');
  btn.textContent=floorLabel(f)+' · '+Math.round(floorStocked(s,f)/itemsPerFloor*100)+'%';btn.disabled=f===s.floor;
  btn.addEventListener('click',()=>{
   s.floor=f;V.x=23;V.z=-5;V.y=V.vy=0;V.carry=0;
   buildWorld();save();notify('Now working on '+floorLabel(f)+'. Another '+itemsPerFloor.toLocaleString()+' items!');resume();
  });list.append(btn);
 }
}
function placeLadder(){
 if(!s.levels.ladder){notify('Buy a ladder from Mustache Mike first.');return;}
 if(s.levels.cart){notify('Your ladder was upgraded into an automatic cart.');return;}
 if(V.z<11){notify('Take the ladder into an aisle first.');return;}
 ladder={floor:s.floor,x:V.x,z:V.z};buildWorld();notify(s.levels.ladderPlus?'Extended ladder deployed: 2¢ and 3¢ rack bands unlocked.':'Step ladder deployed: 2¢ bands unlocked. Upgrade it for 3¢ racks.');
}
function buildNextBelt(){
 const a=nearestAisle(),n=s.belts[s.floor][a];
 if(Math.abs(V.x-aisleX(a))>2.7||n>=BAYS||Math.abs(V.z-bayZ(BAYS-1-n))>4.2){
  notify('To extend a belt: start at REAR RECEIVING and connect sections toward the entrance.');return;
 }
 const cost=beltCost(s,s.floor,a);
 if(!buildBelt(s,s.floor,a,n)){notify('Need '+centsText(cost)+' to build the next conveyor segment.');return;}
 makeBelt(s.floor,a,n);save();notify('Back-fed conveyor segment '+(n+1)+' connected! Robots can collect here.');
}
function updatePrompt(){
 let msg='';
 if(nearby(DOCK.x,DOCK.z,4.4))msg=V.carry<capacity(s)?'Hold E · Load product from REAR RECEIVING (one per action)':'Carry capacity reached — return to an aisle';
 else if(nearby(1.5,-7,4.0))msg='E or Q · Talk to Mustache Mike for upgrades';
 else if(nearby(10,-3,4.0))msg='E · Collect '+centsText(s.pending)+' in wages';
 else if(nearby(23,-9,4.4))msg='E or R · Ride elevator to floors 1–15';
 else if(V.z>=11){
   const id=cellToStock();
   if(id>=0)msg='Hold E · Stock '+['LOW (1¢)','SECOND (1¢)','LADDER (2¢)','EXTENDED LADDER (3¢)'][id%TIERS]+(canReach(id%TIERS)?'':' · NEEDS A HIGHER ACCESS UPGRADE')+' · B builds conveyor';
   else msg='Look toward a nearby shelf · B build conveyor · L deploy ladder';
 }
 if(msg){$('prompt').hidden=false;$('prompt').textContent=msg;}else $('prompt').hidden=true;
}
function createEndingBodies(){
 const sun=new THREE.Mesh(new THREE.SphereGeometry(12,24,18),new THREE.MeshBasicMaterial({color:'#ffe178',fog:false}));
 const moon=new THREE.Mesh(new THREE.SphereGeometry(9,24,18),new THREE.MeshBasicMaterial({color:'#e5f1ff',fog:false}));
 sun.visible=moon.visible=false;scene.add(sun,moon);return {sun,moon};
}
const skyBodies=createEndingBodies();
function beginEnding(){
 if(ending)return;ending=true;save();show('end');endStarted=true;V.x=45;V.z=-8;V.y=0;V.pitch=.1;V.yaw=0;
 $('end').style.background='rgba(21,28,51,.25)';$('end').querySelector('.panel').style.background='transparent';
}
function endingTick(dt){
 if(!ending||endComplete)return;
 const first=TEST_ENDING?.35:10,fade=.85;
 endingTimer+=dt;let t=endingTimer,day=0;
 while(day<20&&t>=first*fade**day){t-=first*fade**day;day++;}
 if(day>=20){
   endComplete=true;$('endingDay').textContent='Day 20 · Customers: 0';
   $('bank').style.display='block';$('thanks').style.display='block';skyBodies.sun.visible=skyBodies.moon.visible=false;
   scene.background.set('#260b22');return;
 }
 $('endingDay').textContent='Day '+(day+1)+' · Customers: 0';
 const span=first*fade**day,p=t/span;
 const sunPhase=p<.7,theta=(sunPhase?p/.7:(p-.7)/.3)*Math.PI;
 const active=sunPhase?skyBodies.sun:skyBodies.moon;
 skyBodies.sun.visible=sunPhase;skyBodies.moon.visible=!sunPhase;
 active.position.set(45-95*Math.cos(theta),15+88*Math.sin(theta),-120);
 const dawn=Math.max(0,Math.sin((p-.05)*Math.PI*2));
 scene.background.set('#1b2447').lerp(new THREE.Color('#a6dcf4'),dawn);
 sunlight.intensity=.3+1.7*dawn;
}
function tickCart(dt){
 if(!s.levels.cart||remaining(s)<=0)return;
 const c=s.cart;
 c.z+=dt*(.28+s.levels.cartSpeed*.14);
 if(c.z>bayZ(BAYS-1)+1.4){c.z=bayZ(0);c.aisle=(c.aisle+1)%AISLES;if(c.aisle===0)c.floor=(c.floor+1)%FLOORS;}
 c.acc+=dt*(.15+s.levels.cartSpeed*.09);
 if(c.acc>=1){
  c.acc-=1;const bay=Math.max(0,Math.min(BAYS-1,Math.round((c.z-13)/2.65)));
  for(const tier of [2,1,0])for(const side of [0,1]){
   const id=cellId(c.floor,c.aisle,side,bay,tier);
   if(s.fill[id]<SLOTS){const prev=s.fill[id];place(s,id,true);if(c.floor===s.floor)drawProduct(id,prev);return;}
  }
 }
}
function syncRobots(){
 for(const r of s.robots){
  if(r.floor===s.floor){
   if(!robotModels.has(r.id))robotModels.set(r.id,botAppearance(r));
   const obj=robotModels.get(r.id);obj.position.set(r.x,.08*Math.sin(performance.now()/230+r.id),r.z);
   const crate=obj.getObjectByName('crate');if(crate)crate.visible=r.carry>0;
  }else if(robotModels.has(r.id)){const obj=robotModels.get(r.id);obj.visible=false;robotModels.delete(r.id);}
 }
}
const hand=round(.55,.46,.5,'#db9f68',camera);hand.position.set(.55,-.52,-1);hand.visible=false;
function animate(now){
 requestAnimationFrame(animate);const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.06,elapsed);last=now;
 if(running&&!ending){
  const turn=(held.ArrowLeft?1:0)-(held.ArrowRight?1:0);
  V.yaw+=turn*dt*1.7;V.pitch=Math.max(-1.25,Math.min(1.25,V.pitch+((held.ArrowUp?1:0)-(held.ArrowDown?1:0))*dt));
  const forward=(held.KeyW?1:0)-(held.KeyS?1:0),side=(held.KeyD?1:0)-(held.KeyA?1:0);
  if(forward||side){
   const speed=walkSpeed(s)*(held.ShiftLeft?1.4:1)*dt/Math.hypot(forward,side);
   const dx=(-Math.sin(V.yaw)*forward+Math.cos(V.yaw)*side)*speed;
   const dz=(-Math.cos(V.yaw)*forward-Math.sin(V.yaw)*side)*speed;
   if(!isBlocked(V.x+dx,V.z))V.x+=dx;
   if(!isBlocked(V.x,V.z+dz))V.z+=dz;
  }
  V.vy-=13*dt;V.y=Math.max(0,V.y+V.vy*dt);if(V.y===0&&V.vy<0)V.vy=0;
  if(held.Space&&s.levels.jump&&V.y===0)V.vy=5.4;
  if(held.KeyE||mouseDown){actionClock+=dt;while(actionClock>=.32){actionClock-=.32;act();if(modal)break;}}else actionClock=0;
 }
 if(!ending&&running){
  // Render the current floor; background robot simulation advances on every floor.
  camera.position.set(V.x,1.65+V.y,V.z);camera.rotation.set(V.pitch,V.yaw,0);
  hand.visible=V.carry>0;hand.scale.setScalar(.45+Math.min(1,V.carry/capacity(s))*.55);
 }
 if(!ending){
  for(const r of s.robots){
   const prevTarget=r.target,prevCount=prevTarget>=0?s.fill[prevTarget]:-1;
   const id=botStep(s,r,dt);
   if(id>=0&&decode(id).floor===s.floor)drawProduct(id,s.fill[id]-1);
  }
  tickCart(dt);
  if(s.levels.cart&&cartMesh){cartMesh.visible=s.cart.floor===s.floor;if(cartMesh.visible)cartMesh.position.set(aisleX(s.cart.aisle),0,s.cart.z);}
  syncRobots();
  for(const b of beltCrates)b.crate.position.z=((now*.00065+b.segment*.27)%2.0)-1;
  if(s.stocked>=TOTAL_ITEMS)beginEnding();
 }
 if(ending)endingTick(elapsed);
 if(!modal){updatePrompt();}
 if(now-savingAt>260){uiUpdate();savingAt=now;}
 renderer.render(scene,camera);
}
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 held[e.code]=true;
 if(e.repeat)return;
 if(e.code==='Escape'){
  e.preventDefault();held={};mouseDown=false;actionClock=0;
  if(modal==='shop'||modal==='elevator'||modal==='intro')resume();
  else if(!ending){show('intro');$('play').textContent='Resume shift';}
  return;
 }
 if(modal||ending)return;
 if(e.code==='KeyQ')openShop();
 if(e.code==='KeyR')openElevator();
 if(e.code==='KeyL')placeLadder();
 if(e.code==='KeyB')buildNextBelt();
 if(e.code==='KeyE'){actionClock=.32;act();}
});
window.addEventListener('keyup',e=>held[e.code]=false);
window.addEventListener('blur',()=>{held={};mouseDown=false;actionClock=0;});
window.addEventListener('mousemove',e=>{
 if(!running||modal)return;
 if(document.pointerLockElement===renderer.domElement||e.buttons===1){
   V.yaw-=e.movementX*.0024;V.pitch=Math.max(-1.25,Math.min(1.25,V.pitch-e.movementY*.0024));
 }
});
renderer.domElement.addEventListener('mousedown',()=>{if(!modal){mouseDown=true;actionClock=.32;act();}});
window.addEventListener('mouseup',()=>mouseDown=false);
document.addEventListener('pointerlockchange',()=>{
 if(!ending&&!modal&&document.pointerLockElement!==renderer.domElement){
  // Arrow-key fallback still works, without bypassing browser permissions.
  notify('Mouse released. Use arrow keys to look or click to recapture.');
 }
});
renderer.domElement.addEventListener('click',()=>{if(running)pointerRequest();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
$('play').addEventListener('click',resume);
$('reset').addEventListener('click',e=>{e.stopPropagation();if(confirm('Erase your new 15-floor save and restart?')){localStorage.removeItem(SAVE_KEY);location.reload();}});
$('shopClose').addEventListener('click',resume);
for(const category of ['tools','economy'])$('tab-'+category).addEventListener('click',()=>{shopCategory=category;renderShop();});
$('elevatorClose').addEventListener('click',resume);
// Local-only QA controls are enabled solely with the explicit #rich developer URL.
if(location.hash==='#rich'){
 window.__martTest={
  teleport(x,z){V.x=x;V.z=z;V.y=0;V.vy=0;},
  setLook(yaw,pitch){V.yaw=yaw;V.pitch=pitch;},
  setCarry(count){V.carry=Math.min(capacity(s),Math.max(0,count));},
  setUpgrade(id,level){if(id in s.levels)s.levels[id]=level;},
  snapshot(){return {floor:s.floor,money:s.money,pending:s.pending,stocked:s.stocked,carry:V.carry,belts:s.belts[s.floor].slice(),robotCount:s.robots.length,levels:{...s.levels}};}
 };
}
buildWorld();$('loading').hidden=true;$('hud').hidden=false;uiUpdate();
if(PREVIEW_ENDING)beginEnding();
requestAnimationFrame(animate);
