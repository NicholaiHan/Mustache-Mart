import * as THREE from 'three';
import {createRendering} from './rendering.js';
import {createEnvironment} from './environment.js';
import {createCharacters} from './characters.js';
import {createEquipment} from './equipment.js';
import {createDoors} from './doors.js';
import {createCheckout} from './checkout.js';
import {ladderHeight,canStockFromHeight} from './ladder.mjs';
import {moveWithCollisions,isBlocked,blockedEquipment,PAYROLL_LAYOUT as PAY} from './collision.mjs';
import {cartonTexture} from './textures.js';
import {
 FLOORS,AISLES,BAYS,TIERS,SLOTS,CENTS,DOCK,CELLS_PER_FLOOR,TOTAL_ITEMS,SAVE_KEY,
 aisleX,bayZ,floorLabel,centsText,UPGRADES,cellId,decode,loadState,serialize,
 capacity,walkSpeed,price,purchase,payOut,place,earnings,buildBelt,beltCost,incomplete,
 floorStocked,itemsPerFloor,remaining,canOpenStore,botStep,cartStep,drivePlatform,liftPlatform,loadPallet,unloadPallet,drivePallet,palletCapacity,assignRobot,sellRobot,deployLadder,sellLadder,sellBelt,advanceBelts,takeBelt,deployClaw,rotateBelt,nearestClawSource,takePile
} from './rules.mjs';

const $=id=>document.getElementById(id);
// Upgrade existing fifteen-floor saves by reindexing their old three-band shelves.
let s=loadState(localStorage.getItem(SAVE_KEY) || localStorage.getItem('mustacheMartV3'));
// Explicit opt-in dev mode: restore at least $500 in test cash without touching normal saves.
const DEV_MODE=location.hash==='#rich'||location.hash==='#dev';
if(DEV_MODE)s.money=Math.max(s.money,50000);
if(DEV_MODE){const banner=document.getElementById('devBanner');if(banner)banner.style.display='block';}
fetch('./build.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('build manifest missing')))
.then(build=>{
 const label='UPDATED BUILD · '+build.version;
 const chip=document.getElementById('buildChip');if(chip)chip.textContent=label;
 const intro=document.getElementById('buildIntro');
 if(intro)intro.firstChild.textContent='UPDATED EDITION · BUILD '+build.version+' ';
}).catch(()=>{const chip=document.getElementById('buildChip');if(chip)chip.textContent='BUILD MANIFEST NOT FOUND';});
const TEST_ENDING=location.hash==='#ending-test', PREVIEW_ENDING=location.hash==='#ending'||TEST_ENDING;
const V={x:33,z:-3,y:0,vy:0,yaw:Math.PI,pitch:0,carry:0,walked:0};
let running=false,modal='intro',mouseDown=false,held={},last=performance.now(),actionClock=0,shopCategory='tools';
let doorInteractionHeld=false,ignoreMouseUntil=0,placementRobotId=null,placementSpot=null,robotGhost=null,climbingLadderId=null;
let currentFloor=-1,world=null,robotModels=new Map(),beltCrates=[],feederCrates=[],clawVisual=null,cartMesh=null,ladderMesh=null,palletMesh=null,placedClawMeshes=[],pileMeshes=[];
let selectedBeltAisle=0;
let ending=false,endStarted=false,endingTimer=0,endComplete=false,toastTimer=0,savingAt=0;
let receiptTimeout=0,payrollTransactions=0;
const NOTE='Easy shelves: 1¢ · ladder: 2¢ · upgraded ladder: 3¢ · deliveries at the BACK';
function notify(msg){$('toast').textContent=msg;$('toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity='0',2700);}
function showPayReceipt(amount){
 const receipt=$('payReceipt');
 $('receiptAmount').textContent=centsText(amount);
 $('receiptNumber').textContent='#'+String(++payrollTransactions).padStart(4,'0');
 receipt.setAttribute('aria-hidden','false');
 receipt.classList.add('active');
 clearTimeout(receiptTimeout);
 receiptTimeout=setTimeout(()=>{receipt.classList.remove('active');receipt.setAttribute('aria-hidden','true');},4100);
}
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
renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#d9dfe0');scene.fog=new THREE.Fog('#d9dfe0',75,190);
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,1100);camera.rotation.order='YXZ';
scene.add(camera);
const skyLight=new THREE.HemisphereLight('#ffffff','#a7afb6',1.2);scene.add(skyLight);
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
const placeRay=new THREE.Raycaster(),groundForPlacement=new THREE.Plane(new THREE.Vector3(0,1,0),0),placeHit=new THREE.Vector3();

const {add,cube,roundedGeo,round,textLabel,clearWorld}=createRendering({getWorld:()=>world,scene,toon});
const {makeMike,botAppearance}=createCharacters({s,add,round,toon,textLabel,getWorld:()=>world});
const {buildShell,buildService,buildShelves,drawProduct,getMike}=createEnvironment({
 s,scene,add,cube,round,roundedGeo,textLabel,toon,dummy,color,goods,pastel,
 FLOOR_W,FLOOR_D,CEILING_Y,RACK_HEIGHT,TIER_Y,makeMike
});
const {makeBelt,makeReceivingSystem,makeCart,makeLadder,makePalletJack,makeClaws,makeStockPiles}=createEquipment({
 s,round,getWorld:()=>world,getBeltCrates:()=>beltCrates,getFeedCrates:()=>feederCrates,setClawVisual:claw=>clawVisual=claw
});
const doors=createDoors({getWorld:()=>world,getFloor:()=>s.floor,round,cube,textLabel});
const checkout=createCheckout({getWorld:()=>world,getFloor:()=>s.floor,round,textLabel});
function buildWorld(){
 clearWorld(world);
 world=new THREE.Group();scene.add(world);
 currentFloor=s.floor;beltCrates=[];feederCrates=[];clawVisual=null;cartMesh=null;ladderMesh=null;palletMesh=null;placedClawMeshes=[];pileMeshes=[];robotModels=new Map();robotGhost=null;
 buildShell();buildService();buildShelves();doors.build();checkout.build();makeReceivingSystem();
 for(let a=0;a<AISLES;a++)for(let segment=0;segment<s.belts[s.floor][a];segment++)makeBelt(s.floor,a,segment);
 for(const robot of s.robots)if(robot.placed&&robot.floor===s.floor)robotModels.set(robot.id,botAppearance(robot));
 cartMesh=makeCart();
 palletMesh=makePalletJack();placedClawMeshes=makeClaws();pileMeshes=makeStockPiles();
 ladderMesh=makeLadder();
 uiUpdate();
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
function nearestLadder(distance=1.8){
 let best=null,dist=distance;
 for(const l of s.ladders)if(l.floor===s.floor){
  const d=Math.hypot(V.x-l.x,V.z-l.z);if(d<dist){dist=d;best=l;}
 }
 return best;
}
function isLadderNear(){return !!nearestLadder(3.2);}
function isCartNear(){return s.levels.cart&&s.cart.mounted&&s.cart.floor===s.floor&&nearby(aisleX(s.cart.aisle),s.cart.z,2.5);}
function canReach(tier){return canStockFromHeight(tier,V.y,false);}
function toggleClimb(){
 if(climbingLadderId!==null){climbingLadderId=null;notify('Released ladder.');return;}
 const l=nearestLadder(1.9);
 if(!l){notify('Approach a placed ladder and press C to climb.');return;}
 climbingLadderId=l.id;V.vy=0;V.x=l.x;V.z=l.z;
 notify('Climbing: W up · S down · C release.');
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
 // Shelves becoming full unlocks the entrance; the player decides when to open it.
 return true;
}
function act(source='keyboard'){
 if(modal||ending||placementRobotId!==null)return;
 if(doors.nearFire(V.x,V.z)){
  if(doorInteractionHeld)return;
  doorInteractionHeld=true;
  notify(doors.toggleFire()?'The FIRE EXIT opens... but a brick wall blocks the way.':'The fire exit is closed.');
  return;
 }
 if(doors.nearEntrance(V.x,V.z)){
  if(doorInteractionHeld)return;
  doorInteractionHeld=true;
  if(!canOpenStore(s)){notify('You have to stock the entire building before opening.');return;}
  if(doors.openEntrance()){
    notify('The building is fully stocked. Opening for the grand opening!');
    setTimeout(()=>beginEnding(),1350);
  }
  return;
 }
 const register=checkout.nearest(V.x,V.z);
 if(register>=0){
   notify('CHECKOUT '+String(register+1).padStart(2,'0')+' · Card terminal powered; customer payments begin at the grand opening.');
   return;
 }
 if(nearby(1.5,-7,4.0)){
  // Clicking is used for robot placement / picking up inventory. Mike's
  // dialogue should only respond to the universal E interaction key.
  if(source==='keyboard')openShop();
  return;
 }
 if(nearby(PAY.x,PAY.customerZ,PAY.interactionRadius)){const paid=payOut(s);if(paid)showPayReceipt(paid);else notify('Your payroll balance is currently $0.00. Stock more products to earn wages.');save();return;}
 if(nearby(23,-9,4.4)){openElevator();return;}
 if(nearby(DOCK.x,DOCK.z,4.4)&&V.carry<capacity(s)){V.carry++;return;}
 if(collectNearbyPile()){notify('Collected product from your pallet drop-off.');return;}
 if(V.carry<capacity(s)){
  const source=nearestBeltStock();
  if(source){takeBelt(s,s.floor,source.aisle);V.carry++;notify('Picked up one delivered conveyor product.');return;}
 }
 if(manualStock())return;
 // With empty hands, E is an accessible alternative to C for gripping a ladder.
 if(!V.carry&&(climbingLadderId!==null||nearestLadder(1.9))){
   if(doorInteractionHeld)return;
   doorInteractionHeld=true;toggleClimb();return;
 }
}
function nearbyPallet(d=3){return s.pallet.floor===s.floor&&nearby(s.pallet.x,s.pallet.z,d);}
function nearbyPlatform(d=3){return s.levels.cart&&s.cart.floor===s.floor&&nearby(aisleX(s.cart.aisle),s.cart.z,d);}
function toggleVehicle(){
 if(s.pallet.driving){s.pallet.driving=false;notify('Parked pallet jack. U unloads inventory at an aisle.');save();return;}
 if(s.cart.mounted){s.cart.mounted=false;V.y=0;notify('Exited motorized platform.');save();return;}
 if(nearbyPallet(3.8)){s.pallet.driving=true;climbingLadderId=null;notify('PALLET JACK · WASD drive · U load at dock / unload beside aisle · F park');return;}
 if(nearbyPlatform(3.6)){s.cart.mounted=true;climbingLadderId=null;notify('MOTORIZED PLATFORM · WASD drive · Space raise · Ctrl lower · F exit');return;}
 notify('Approach the pallet jack or the motorized ladder platform, then press F.');
}
function handlePalletCargo(){
 if(s.pallet.floor!==s.floor||!nearbyPallet(5)){notify('Approach the pallet jack first.');return;}
 // When carrying a load, prefer unloading at a valid aisle—even if that
 // location happens to fall within the rear dock's loading radius.
 if(s.pallet.load){
  const dropped=unloadPallet(s);
  if(dropped){buildWorld();save();notify('Delivered '+dropped+' products to aisle '+(Math.round((s.pallet.x-8)/10)+1)+'. Place a claw with K to feed a conveyor.');return;}
 }
 const count=loadPallet(s);
 if(count){notify('Loaded '+count+' products · '+s.pallet.load+'/'+palletCapacity(s)+' capacity. Drive to an aisle with WASD.');save();return;}
 notify(s.pallet.load?'Drive to the front of an aisle, then press U to unload.':'Park near rear inventory to load the pallet jack.');
}
function installClaw(){
 if(!s.clawInventory.length){notify('Buy an Automated Item Claw from Mike first.');return;}
 const a=nearestAisle(),n=s.belts[s.floor][a],bay=n?BAYS-n:nearestBay();
 if(!n||Math.abs(V.x-(aisleX(a)+1.4))>4.4||Math.abs(V.z-bayZ(bay))>5.0){
  notify('Install a belt first, then stand near the belt endpoint and press K.');return;
 }
 const claw=deployClaw(s,s.floor,a,bay);
 if(!claw){notify('A claw is already placed at this belt endpoint.');return;}
 buildWorld();save();notify('Item claw installed. It draws ONLY from nearby inventory or pallet piles, then supplies the belt.');
}
function turnBelt(){
 const a=nearestAisle(),n=s.belts[s.floor][a];
 if(!n||Math.abs(V.x-(aisleX(a)+1.4))>4.4||Math.abs(V.z-bayZ(BAYS-n))>5){
   notify('Stand at the FRONT TIP of a conveyor and press Z to rotate its output.');return;
 }
 const angle=rotateBelt(s,s.floor,a,n-1);buildWorld();save();
 notify('Belt outlet turned '+['FORWARD','RIGHT','REVERSE','LEFT'][angle]+'. Right/left transfers only to a connected adjacent belt.');
}
function collectNearbyPile(){
 if(V.carry>=capacity(s))return false;
 const index=s.stockPiles.findIndex(p=>p.floor===s.floor&&p.count>0&&nearby(p.x,p.z,3));
 if(index<0)return false;
 if(!takePile(s,index,1))return false;
 V.carry++;return true;
}
function nearestBeltStock(){
 let best=null,dist=2.7;
 for(let a=0;a<AISLES;a++){
  const n=s.belts[s.floor][a];if(!n||!s.beltStock[s.floor][a])continue;
  const x=aisleX(a)+1.4,z=bayZ(BAYS-n),d=Math.hypot(V.x-x,V.z-z);
  if(d<dist){dist=d;best={aisle:a,x,z};}
 }
 return best;
}
function startRobotPlacement(id){
 placementRobotId=id;placementSpot=null;show(null);running=true;document.exitPointerLock?.();
 robotGhost=botAppearance({x:V.x,z:V.z,carry:0,id:-1});
 robotGhost.scale.setScalar(.9);
 robotGhost.traverse(o=>{
  if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.55;o.material.depthWrite=false;}
 });
 notify('ROBOT PLACEMENT · Walk to an aisle and LEFT CLICK to install · Escape cancels');
}
function completeRobotPlacement(){
 if(placementRobotId===null)return false;
 const a=placementSpot?.aisle??nearestAisle(),bay=placementSpot?.bay??nearestBay();
 const x=aisleX(a),z=bayZ(bay);
 if(!placementSpot&&(V.z<11||V.z>91.8||Math.abs(V.x-x)>2.4)){
  notify('Walk to an aisle or aim your pointer at a visible aisle floor.');return false;
 }
 if(isBlocked(x,z,s.floor)||blockedEquipment(s,x,z)){notify('That location is occupied. Choose an open spot.');return false;}
 if(!assignRobot(s,placementRobotId,s.floor,a,bay))return false;
 const id=placementRobotId;placementRobotId=null;placementSpot=null;
 if(robotGhost){world.remove(robotGhost);robotGhost=null;}
 buildWorld();save();
 notify('Robot #'+id+' installed in aisle '+(a+1)+'. It will use the closest stock source.');
 return true;
}
function cancelPlacement(){
 if(placementRobotId===null)return false;
 placementRobotId=null;placementSpot=null;
 if(robotGhost){world.remove(robotGhost);robotGhost=null;}
 notify('Placement canceled. Your purchased robot remains in Mike’s shop.');return true;
}
function sellNearby(){
 let best=null,dist=2.7;
 for(const l of s.ladders.filter(l=>l.floor===s.floor)){
  const d=Math.hypot(V.x-l.x,V.z-l.z);
  if(d<dist){dist=d;best={type:'ladder',id:l.id};}
 }
 if(!best||best.type!=='ladder')for(const r of s.robots.filter(r=>r.placed&&r.floor===s.floor)){
  const d=Math.hypot(V.x-r.x,V.z-r.z);
  if(d<dist){dist=d;best={type:'robot',id:r.id};}
 }
 if(!best||best.type!=='ladder')for(let a=0;a<AISLES;a++){
  const n=s.belts[s.floor][a];if(!n)continue;
  const z=bayZ(BAYS-n),d=Math.hypot(V.x-(aisleX(a)+1.4),V.z-z);
  if(d<dist){dist=d;best={type:'belt',a,seg:n-1};}
 }
 if(!best){notify('Walk close to a robot, ladder, or END conveyor segment and press X.');return;}
 const refund=best.type==='ladder'?sellLadder(s,best.id):best.type==='robot'?sellRobot(s,best.id):sellBelt(s,s.floor,best.a,best.seg);
 if(!refund){notify('Cannot sell that equipment.');return;}
 if(best.type==='ladder'&&climbingLadderId===best.id){climbingLadderId=null;V.y=0;V.vy=0;}
 buildWorld();save();
 notify('Sold '+best.type+' for '+centsText(refund)+' (half the original purchase price).');
}
function pointerRequest(){
 if(!renderer.domElement.requestPointerLock)return;
 try{
  const result=renderer.domElement.requestPointerLock();
  if(result?.catch)result.catch(()=>{
   if(!modal&&!ending){
    $('lookPrompt').hidden=false;
    notify('Click once on the game to restore mouse look.');
   }
  });
 }catch(_){
  if(!modal&&!ending)$('lookPrompt').hidden=false;
 }
}
function show(id){
 for(const key of ['intro','shop','elevator','end'])$(key).classList.toggle('open',key===id);
 modal=id;running=!id&&!ending;
 $('lookPrompt').hidden=!!id || document.pointerLockElement===renderer.domElement;
 if(id)document.exitPointerLock?.();
}
function resume(){
 // Close dialogue, clear the old held interaction keys and restore focus.
 // The shop Close button invokes this in the same trusted click activation,
 // so browsers can immediately grant pointer lock.
 show(null);held={};mouseDown=false;actionClock=0;doorInteractionHeld=false;
 ignoreMouseUntil=0;
 renderer.domElement.tabIndex=0;
 renderer.domElement.focus({preventScroll:true});
 pointerRequest();
}
function openShop(){
 if(!nearby(1.5,-7,4.6)){notify('Find Mustache Mike at the front customer service counter.');return;}
 // No mouse click interaction: E only, consistent with payroll / checkout.
 held.KeyE=false;mouseDown=false;actionClock=0;
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
   if(u.id==='robot'){const r=s.robots[s.robots.length-1];save();startRobotPlacement(r.id);return;}
   if(['cart','ladderPlus','robotLift'].includes(u.id))buildWorld();
   if(u.id==='itemClaw')notify('Item claw purchased. Stand by a conveyor outlet and press K to install it.');
   save();renderShop();uiUpdate();
  });
  row.append(info,btn);list.append(row);
 }
 if(shopCategory==='tools'){
  if(s.robots.length){
   const heading=document.createElement('h3');heading.textContent='Your robots · Placement and resale';list.append(heading);
   for(const r of s.robots){
    const item=document.createElement('div');item.className='upgrade';
    const name=document.createElement('strong');
    name.textContent='Stocker #'+r.id+' · '+(r.placed?floorLabel(r.floor)+' / Aisle '+(r.aisle+1):'Pending placement');
    item.append(name);const buttons=document.createElement('div');buttons.className='robotActions';
    const relocate=document.createElement('button');relocate.textContent=r.placed?'Move / redeploy':'Deploy';
    relocate.addEventListener('click',()=>startRobotPlacement(r.id));
    const sell=document.createElement('button');sell.textContent='Sell for '+centsText(Math.floor(r.paid/2));
    sell.addEventListener('click',()=>{sellRobot(s,r.id);buildWorld();save();renderShop();uiUpdate();});
    buttons.append(relocate,sell);item.append(buttons);list.append(item);
   }
  }
  if(s.ladderInventory.length){
   const info=document.createElement('p');info.className='hint';
   info.textContent=s.ladderInventory.length+' undeployed ladders · L to place · C to climb · X to sell placed ladder';
   list.append(info);
  }
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
 if(!s.ladderInventory.length){notify('Buy a portable ladder from Mike first.');return;}
 if(V.z<11||V.z>92||Math.abs(V.x-aisleX(nearestAisle()))>2.5){notify('Stand in a supermarket aisle to install a ladder.');return;}
 const l=deployLadder(s,s.floor,nearestAisle(),nearestBay());
 if(!l){notify('A ladder already occupies this area.');return;}
 buildWorld();save();notify('Ladder placed · C to climb, W/S to go up/down, X to sell.');
}
function buildNextBelt(){
 // Building begins at the physical stock dock: choose an aisle with [ / ].
 // Once the rear source is connected, extend that aisle from its frontmost tip.
 const atDock=nearby(DOCK.x,DOCK.z,5.0);
 const a=atDock?selectedBeltAisle:nearestAisle(),n=s.belts[s.floor][a];
 if(atDock&&n>0){
   notify('AISLE '+(a+1)+' already fed. To extend, go to the FRONT end of its belt, press B there.');
   return;
 }
 if(!atDock&&(Math.abs(V.x-aisleX(a))>2.7||n>=BAYS||Math.abs(V.z-bayZ(BAYS-1-n))>4.2)){
  notify('Start at BACK RECEIVING: use [ / ] to choose aisle, then B. For more segments, stand at the belt’s front end.');return;
 }
 if(n>=BAYS){notify('That belt is at its maximum safe length.');return;}
 const cost=beltCost(s,s.floor,a);
 if(!buildBelt(s,s.floor,a,n)){notify('Need '+centsText(cost)+' to build an aisle conveyor connection.');return;}
 // Rebuild once to add the newly connected overhead chute, solid direction
 // markings and a moving feeder package, not a visually disconnected segment.
 buildWorld();save();
 notify('AISLE '+(a+1)+' · '+(n===0?'Connected to stock claw':'Added forward segment')+
   ' · Products move forward and stop when the destination buffer fills.');
}
function updatePrompt(){
 let msg='';
 if(s.pallet.driving)msg='PALLET JACK '+s.pallet.load+'/'+palletCapacity(s)+' · WASD drive · U load/unload · F park';
 else if(s.cart.mounted)msg='LADDER PLATFORM · WASD move · Space elevate · Ctrl descend · F exit · E stock shelves';
 else if(nearbyPallet(4))msg='F drive pallet jack · U load '+palletCapacity(s)+' products at receiving / unload by aisles';
 else if(nearbyPlatform(3.6))msg='F ride motorized ladder platform · WASD move · Space raise · Ctrl lower';
 else if(s.clawInventory.length&&V.z>10)msg='K place bought item claw near conveyor outlet · Z rotate outlet · F use machines';
 else if(placementRobotId!==null)msg='ROBOT #'+placementRobotId+' · WALK to the aisle · LEFT CLICK to deploy · ESC cancel';
 else if(climbingLadderId!==null)msg='CLIMBING · W up · S down · C release · Hold E to stock';
 else if(nearestLadder(1.8))msg='E or C · Grab ladder · Hold W to climb / S to descend · X sell';
 else if(nearestBeltStock())msg='E · Take conveyor stock · X sell LAST segment';
 else if(doors.nearFire(V.x,V.z))msg='E · '+(doors.isFireOpen()?'Close':'Open')+' FIRE EXIT (brick wall behind)';
 else if(doors.nearEntrance(V.x,V.z))
   msg=canOpenStore(s)?'E · Unlock the grand opening and slide open the doors':'E · You have to stock the building before opening';
 else if(checkout.nearest(V.x,V.z)>=0)msg='E · Check cashier terminal · Checkout belts active · Customer payments begin on opening';
 else if(nearby(DOCK.x,DOCK.z,5.0))msg='RECEIVING CLAW: SELECT AISLE '+(selectedBeltAisle+1)+' WITH [ / ] · PRESS B TO CONNECT · E TO PICK UP';
 else if(nearby(1.5,-7,4.0))msg='E · Speak with Mustache Mike · E or Close returns to mouse look';
 else if(nearby(PAY.x,PAY.customerZ,PAY.interactionRadius))msg='E · Collect '+centsText(s.pending)+' at the WALL-MOUNTED payroll window';
 else if(nearby(23,-9,4.4))msg='E or R · Ride elevator to floors 1–15';
 else if(V.z>=11){
   const id=cellToStock();
   if(id>=0)msg='Hold E · Stock '+['LOW (1¢)','SECOND (1¢)','LADDER (2¢)','EXTENDED LADDER (3¢)'][id%TIERS]+(canReach(id%TIERS)?'':' · NEEDS A HIGHER ACCESS UPGRADE')+' · B builds conveyor';
   else msg='Look toward a nearby shelf · B build conveyor · L deploy ladder';
 }
 if(msg){$('prompt').hidden=false;$('prompt').textContent=msg;}else $('prompt').hidden=true;
 const pickup=$('pickupStatus');
 pickup.hidden=!!modal||!nearby(DOCK.x,DOCK.z,4.4);
 if(!pickup.hidden)pickup.textContent='RECEIVING CLAW  •  AISLE '+(selectedBeltAisle+1)+'  •  [ / ] SELECT   •  B BUILD   •  E PICK UP';
 const panel=$('routingStatus');
 if(panel){
  const count=s.belts[s.floor].filter(v=>v>0).length;
  panel.hidden=!!modal||!nearby(DOCK.x,DOCK.z,8.0);
  if(!panel.hidden)panel.textContent='INVENTORY → CLAW → AISLE '+String(selectedBeltAisle+1).padStart(2,'0')+
   '  |  Connected: '+count+'/'+AISLES+'  |  Delivered: '+s.beltStock[s.floor][selectedBeltAisle]+'/16  |  [ / ] choose · B connect';
 }
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
function tickCart(){/* The moving ladder platform belongs to the player, never auto-stocks. */}
function syncRobots(){
 for(const r of s.robots){
  if(r.placed&&r.floor===s.floor){
   if(!robotModels.has(r.id))robotModels.set(r.id,botAppearance(r));
   const obj=robotModels.get(r.id);obj.visible=true;obj.position.set(r.x,(s.levels.robotLift?0:(r.liftY||0))+.04*Math.sin(performance.now()/230+r.id),r.z);
   const body=obj.getObjectByName('liftBody');
   if(body)body.position.y=r.liftY||0;
   const jack=obj.getObjectByName('liftingJack');
   if(jack){jack.scale.y=1+(r.liftY||0);jack.position.y=.98+(r.liftY||0)*.5;}
   const crate=obj.getObjectByName('crate');if(crate)crate.visible=r.carry>0;
  }else if(robotModels.has(r.id)){const obj=robotModels.get(r.id);obj.visible=false;robotModels.delete(r.id);}
 }
}
// The player visibly carries a labeled warehouse package, not a skin-colored cube.
const hand=new THREE.Group();camera.add(hand);hand.position.set(.51,-.47,-1.01);
const carried=round(.42,.39,.34,new THREE.MeshStandardMaterial({map:cartonTexture(),roughness:.88}),hand);
carried.rotation.set(-.12,-.28,.14);
const strap=round(.45,.045,.37,'#a7895d',hand);strap.position.y=.1;
hand.visible=false;
function animate(now){
 requestAnimationFrame(animate);const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.06,elapsed);last=now;
 if(running&&!ending){
  const turn=(held.ArrowLeft?1:0)-(held.ArrowRight?1:0);
  V.yaw+=turn*dt*1.7;V.pitch=Math.max(-1.25,Math.min(1.25,V.pitch+((held.ArrowUp?1:0)-(held.ArrowDown?1:0))*dt));
  const forward=(held.KeyW?1:0)-(held.KeyS?1:0),side=(held.KeyD?1:0)-(held.KeyA?1:0);
  if(s.pallet.driving){
   const moved=drivePallet(s,forward,side,dt,(x,z)=>!isBlocked(x,z,s.floor));
   V.x=s.pallet.x;V.z=s.pallet.z;V.y=0;V.vy=0;
  }else if(s.cart.mounted){
   drivePlatform(s,forward,side,dt,(x,z)=>!isBlocked(x,z,s.floor));
   liftPlatform(s,(held.Space?1:0)-(held.ControlLeft||held.ControlRight?1:0),dt);
   V.x=aisleX(s.cart.aisle);V.z=s.cart.z;V.y=s.cart.liftHeight+1.15;V.vy=0;
  }else if(climbingLadderId!==null){
   const l=s.ladders.find(l=>l.id===climbingLadderId&&l.floor===s.floor);
   if(!l){climbingLadderId=null;V.y=0;}
   else{const top=s.levels.ladderPlus?9.45:4.75;
    V.x=l.x;V.z=l.z;V.vy=0;V.y=ladderHeight(V.y,forward,elapsed,!!s.levels.ladderPlus);
   }
  }else if(forward||side){
   const speed=walkSpeed(s)*(held.ShiftLeft?1.4:1)*dt/Math.hypot(forward,side);
   const dx=(-Math.sin(V.yaw)*forward+Math.cos(V.yaw)*side)*speed;
   const dz=(-Math.cos(V.yaw)*forward-Math.sin(V.yaw)*side)*speed;
   const next=moveWithCollisions(V.x,V.z,dx,dz,s.floor,(x,z)=>blockedEquipment(s,x,z));
   V.x=next.x;V.z=next.z;
  }
  if(climbingLadderId===null&&!s.pallet.driving&&!s.cart.mounted){V.vy-=13*dt;V.y=Math.max(0,V.y+V.vy*dt);if(V.y===0&&V.vy<0)V.vy=0;}
  if(climbingLadderId===null&&!s.pallet.driving&&!s.cart.mounted&&held.Space&&s.levels.jump&&V.y===0)V.vy=5.4;
  if(!s.pallet.driving&&(held.KeyE||mouseDown)){actionClock+=dt;while(actionClock>=.32){actionClock-=.32;act(held.KeyE?'keyboard':'mouse');if(modal)break;}}else actionClock=0;
 }
 if(!ending&&running){
  // Render the current floor; background robot simulation advances on every floor.
  camera.position.set(V.x,1.65+V.y,V.z);camera.rotation.set(V.pitch,V.yaw,0);
  hand.visible=V.carry>0;hand.scale.setScalar(.45+Math.min(1,V.carry/capacity(s))*.55);
 }
 if(!ending){
  advanceBelts(s,Math.min(elapsed,2));
  for(const r of s.robots){
   const prevTarget=r.target,prevCount=prevTarget>=0?s.fill[prevTarget]:-1;
   const id=botStep(s,r,dt);
   if(id>=0&&decode(id).floor===s.floor)drawProduct(id,s.fill[id]-1);
  }
  tickCart(dt);
  if(s.levels.cart&&cartMesh){
   cartMesh.visible=s.cart.floor===s.floor;
   if(cartMesh.visible){
    cartMesh.position.set(aisleX(s.cart.aisle),0,s.cart.z);
    const platform=cartMesh.getObjectByName('riderPlatform');
    if(platform)platform.position.y=s.cart.liftHeight;
   }
  }
  if(palletMesh){
   palletMesh.visible=s.pallet.floor===s.floor;
   palletMesh.position.set(s.pallet.x,0,s.pallet.z);
   palletMesh.rotation.y=s.pallet.yaw;
   const cargo=palletMesh.getObjectByName('palletCargo');
   if(cargo){cargo.visible=s.pallet.load>0;cargo.scale.y=.45+Math.min(1,s.pallet.load/palletCapacity(s))*.55;}
  }
  for(const p of pileMeshes){p.visible=p.userData.pile?.count>0;if(p.visible)p.scale.y=Math.max(.45,Math.min(1,p.userData.pile.count/140));}
  for(const entry of placedClawMeshes){
   const claw=s.claws.find(c=>c.id===entry.id);
   if(!claw)continue;
   const ready=!!nearestClawSource(s,claw)&&s.belts[claw.floor][claw.aisle]>0&&s.beltStock[claw.floor][claw.aisle]<16;
   entry.gripping.position.y=ready?Math.sin(now*.004+entry.id)*.25:0;
   entry.box.visible=ready;
  }
  syncRobots();
  if(clawVisual){
   const cycle=(now*.00066)%1;
   // Lift while crossing the dock, close the jaws to grasp, and release at chute.
   clawVisual.position.y=Math.sin(cycle*Math.PI*2)*.17;
   if(clawVisual.userData.jaws)clawVisual.userData.jaws.forEach((jaw,i)=>{
    jaw.position.x=(i===0?1.65:2.05)+(i===0?1:-1)*(.08+.13*Math.cos(cycle*Math.PI*2));
   });
  }
  for(const f of feederCrates){
   f.crate.visible=s.beltStock[s.floor][f.aisle]>0;
   if(f.crate.visible){
     f.crate.position.z=91.76-(now*.00037+f.aisle*.19)%1.55;
     f.crate.rotation.y=Math.sin(now*.0004+f.aisle)*.04;
   }
  }
  for(const b of beltCrates){
   const n=s.belts[s.floor][b.aisle],stored=s.beltStock[s.floor][b.aisle];
   b.crate.visible=stored>0;
   b.crate.position.z=(((now*.001+b.segment*.27)%2.25)-1.1);
   const direction=s.beltDirection[s.floor][b.aisle][b.segment]||0;
   b.crate.position.x=direction===1?(.46*Math.sin(now*.0015)):direction===3?(-.46*Math.sin(now*.0015)):0;
   if(b.segment===n-1&&stored>0)b.crate.position.z=0;
  }
  // Completion alone does NOT trigger the ending. Open the front doors with E.
 }
 doors.update(dt);
 checkout.update(now/1000);
 if(ending)endingTick(elapsed);
 if(robotGhost&&placementRobotId!==null){
  const a=placementSpot?.aisle??nearestAisle(),b=placementSpot?.bay??nearestBay();
  const x=aisleX(a),z=bayZ(b);
  robotGhost.position.set(x,0,z);
  robotGhost.visible=(!!placementSpot||(V.z>=11&&V.z<=92))&&!isBlocked(x,z,s.floor);
 }
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
  if(cancelPlacement())return;
  if(modal==='shop'||modal==='elevator'||modal==='intro')resume();
  else if(!ending){show('intro');$('play').textContent='Resume shift';}
  return;
 }
 if(modal==='shop'&&e.code==='KeyE'){
  // E also closes Mike's menu, requesting mouse lock directly from this key.
  e.preventDefault();resume();return;
 }
 if(modal||ending)return;
 // Mustache Mike is interacted with using E, not a click or Q shortcut.
 if(e.code==='KeyR'&&!s.pallet.driving&&!s.cart.mounted)openElevator();
 if(e.code==='KeyL')placeLadder();
 if(e.code==='KeyC')toggleClimb();
 if(climbingLadderId!==null&&(e.code==='KeyW'||e.code==='KeyS')){
  const top=s.levels.ladderPlus?9.45:4.75;
  V.y=ladderHeight(V.y,e.code==='KeyW'?1:-1,.56/3.1,!!s.levels.ladderPlus);
 }
 if(e.code==='KeyX')sellNearby();
 if(e.code==='BracketLeft'&&nearby(DOCK.x,DOCK.z,5.0)){selectedBeltAisle=(selectedBeltAisle+AISLES-1)%AISLES;notify('Receiving claw: target AISLE '+(selectedBeltAisle+1));}
 if(e.code==='BracketRight'&&nearby(DOCK.x,DOCK.z,5.0)){selectedBeltAisle=(selectedBeltAisle+1)%AISLES;notify('Receiving claw: target AISLE '+(selectedBeltAisle+1));}
 if(e.code==='KeyB')buildNextBelt();
 if(e.code==='KeyF')toggleVehicle();
 if(e.code==='KeyU')handlePalletCargo();
 if(e.code==='KeyK')installClaw();
 if(e.code==='KeyZ')turnBelt();
 if(e.code==='KeyE'&&!s.pallet.driving&&!s.cart.mounted){e.preventDefault();actionClock=0;act('keyboard');}
});
window.addEventListener('keyup',e=>{held[e.code]=false;if(e.code==='KeyE')doorInteractionHeld=false;});
window.addEventListener('blur',()=>{held={};mouseDown=false;doorInteractionHeld=false;actionClock=0;});
window.addEventListener('mousemove',e=>{
 if(!running||modal)return;
 if(placementRobotId!==null){
  // Mouse cursor selects a visible floor point; the preview snaps to the aisle.
  const screen=new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
  placeRay.setFromCamera(screen,camera);
  const point=placeRay.ray.intersectPlane(groundForPlacement,placeHit);
  placementSpot=null;
  if(point&&Math.hypot(point.x-V.x,point.z-V.z)<20&&point.z>=11&&point.z<=91.5){
   const a=Math.max(0,Math.min(AISLES-1,Math.round((point.x-8)/10)));
   const bay=Math.max(0,Math.min(BAYS-1,Math.round((point.z-13)/2.65)));
   if(!isBlocked(aisleX(a),bayZ(bay),s.floor))placementSpot={aisle:a,bay};
  }
  return;
 }
 if(document.pointerLockElement===renderer.domElement||e.buttons===1){
  // Ignore a browser's synthetic pointer recenter jump and bound subsequent deltas.
  if(performance.now()<ignoreMouseUntil)return;
  const dx=Math.max(-90,Math.min(90,e.movementX));
  const dy=Math.max(-90,Math.min(90,e.movementY));
  V.yaw-=dx*.0024;
  V.pitch=Math.max(-1.25,Math.min(1.25,V.pitch-dy*.0024));
 }
});
renderer.domElement.addEventListener('mousedown',()=>{
 if(modal)return;
 if(placementRobotId!==null){completeRobotPlacement();return;}
 // Clicking Mike must NOT open the dialogue or consume a stocking action.
 if(nearby(1.5,-7,4.0)){if(document.pointerLockElement!==renderer.domElement)pointerRequest();return;}
 if(document.pointerLockElement!==renderer.domElement){pointerRequest();return;}
 mouseDown=true;actionClock=0;act('mouse');
});
window.addEventListener('mouseup',()=>{mouseDown=false;doorInteractionHeld=false;});
document.addEventListener('pointerlockchange',()=>{
 if(document.pointerLockElement===renderer.domElement){
  ignoreMouseUntil=performance.now()+24;
  $('lookPrompt').hidden=true;
  return;
 }
 if(!ending&&!modal&&document.pointerLockElement!==renderer.domElement){
  $('lookPrompt').hidden=false;
  // Browser security can suppress an immediate relock after Escape.
  // The next click on the canvas is a genuine user gesture and restores it.
  notify('Click the game once to restore mouse look.');
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
if(DEV_MODE){
 window.__martTest={
  teleport(x,z){V.x=x;V.z=z;V.y=0;V.vy=0;},
  setLook(yaw,pitch){V.yaw=yaw;V.pitch=pitch;},
  setCarry(count){V.carry=Math.min(capacity(s),Math.max(0,count));},
  setUpgrade(id,level){if(id in s.levels)s.levels[id]=level;},
  giveClaw(){s.clawInventory.push({paid:450});return s.clawInventory.length;},
  logistics(){return {claws:s.claws.length,clawInventory:s.clawInventory.length,palletLoad:s.pallet.load,palletCapacity:palletCapacity(s),palletDriving:s.pallet.driving,cartMounted:s.cart.mounted,cartHeight:s.cart.liftHeight,stockPiles:s.stockPiles.map(x=>({...x})),beltDirections:s.beltDirection[s.floor].map(x=>x.slice())};},

  setCompletion(value){s.fill.fill(value?SLOTS:0);s.stocked=value?TOTAL_ITEMS:0;},
  doorStatus(){return {fire:doors.isFireOpen(),entrance:doors.isEntranceOpen()};},
  checkBlocked(x,z){return isBlocked(x,z,s.floor)||blockedEquipment(s,x,z);},
  advanceConveyors(seconds){advanceBelts(s,Math.max(0,Math.min(120,Number(seconds)||0)));return s.beltStock[s.floor].slice();},
   move(dx,dz){const next=moveWithCollisions(V.x,V.z,dx,dz,s.floor,(x,z)=>blockedEquipment(s,x,z));V.x=next.x;V.z=next.z;return next;},
   snapshot(){return {selectedBeltAisle,feedCrates:feederCrates.length,devMode:DEV_MODE,checkoutCount:s.floor===0?4:0,x:V.x,y:V.y,z:V.z,climbing:climbingLadderId,placementRobotId,beltStock:s.beltStock[s.floor].slice(),ladders:s.ladders.filter(l=>l.floor===s.floor).length,floor:s.floor,money:s.money,pending:s.pending,stocked:s.stocked,carry:V.carry,belts:s.belts[s.floor].slice(),robotCount:s.robots.length,levels:{...s.levels}};}
 };
}
buildWorld();$('loading').hidden=true;$('hud').hidden=false;uiUpdate();
if(PREVIEW_ENDING)beginEnding();
requestAnimationFrame(animate);
