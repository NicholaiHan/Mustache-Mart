import * as THREE from 'three';
import {createRendering} from './rendering.js';
import {createEnvironment} from './environment.js';
import {createCharacters} from './characters.js';
import {createEquipment} from './equipment.js';
import {createDoors} from './doors.js';
import {createCheckout} from './checkout.js';
import {restoreObjectProportions} from './visual-proportions.js';
import {renderElevatorDirectory} from './elevator-ui.js';
import {ladderHeight,canStockFromHeight} from './ladder.mjs';
import {moveWithCollisions,isBlocked,blockedEquipment,PAYROLL_LAYOUT as PAY} from './collision.mjs';
import {cartonTexture} from './textures.js';
import {MIRROR_SAVE_KEY,bestStartupSave,stampSave,guardedSave} from './save-rescue.mjs';
import {
 FLOORS,AISLES,BAYS,TIERS,SLOTS,CENTS,DOCK,nearestWarehouseCrate,CELLS_PER_FLOOR,TOTAL_ITEMS,SAVE_KEY,MAP_WIDTH_MULTIPLIER,MAP_WIDTH_CENTER,toWideX,fromWideX,
 aisleX,bayZ,floorLabel,centsText,UPGRADES,cellId,decode,loadState,serialize,
 capacity,walkSpeed,playerMoveMultiplier,tryPlayerJump,price,skillAvailable,purchase,autoPlaceRobot,moveRobotFromMike,chooseRobotSpawnAisle,refreshCoinOffers,coinFlipStake,markCoinOfferSeen,declineCoinFlip,acceptCoinFlip,COIN_FLIP_FIRST_STAKE,payOut,place,earnings,buildBelt,beltCost,incomplete,
 floorStocked,itemsPerFloor,remaining,canOpenStore,FREE_BELT_PITCH,FREE_BELT_VECTORS,snapFreeCoordinate,freeBeltAt,placeFreeBelt,turnFreeBelt,takeFreeBelt,sellFreeBelt,deployFreeClaw,freeBeltConnected,completedFloors,crabEnabled,crabTamed,moveTamedCrab,setDeveloperCrab,advanceCrab,performCrabSwing,CRAB_UNLOCK_FLOORS,CRAB_ATTACK_SECONDS,botStep,cartStep,drivePlatform,liftPlatform,platformsOnFloor,closestPlatform,selectPlatform,loadPallet,unloadPallet,drivePallet,palletCapacity,assignRobot,setRobotAisle,repairRobot,resetRobotRepair,repairRange,ROBOT_REPAIR_SECONDS,robotPlatformFor,sellRobot,deployLadder,sellLadder,sellBelt,sellClaw,advanceBelts,takeBelt,beltInput,clawReceivingSegment,beltPickupSegment,BELT_CAPACITY,BELT_MOVE_SECONDS,deployClaw,rotateBelt,nearestClawSource,takePile
} from './rules.mjs';

const $=id=>document.getElementById(id);
// Protect original browser-local progress BEFORE any new version can write.
// Historical localStorage keys and non-destructive rolling snapshots are
// visible to the player in the Save Recovery section on the title screen.
const SAVE_ARCHIVE_KEY='mustacheMartSaveSnapshotsV1';
const validSave=raw=>{
 if(!raw)return false;
 try{const d=JSON.parse(raw);return [3,4].includes(d.version)&&Array.isArray(d.fill)&&d.fill.length>=10000;}catch{return false;}
};
const progressSummary=raw=>{
 if(!validSave(raw))return null;
 const d=JSON.parse(raw);
 return {stocked:Array.isArray(d.fill)?d.fill.reduce((sum,n)=>sum+(Number(n)||0),0):0,
  upgrades:Object.values(d.levels||{}).reduce((sum,n)=>sum+(Number(n)||0),0),
  robots:Array.isArray(d.robots)?d.robots.length:0,
  money:Number(d.money)||0, version:d.version};
};
const progressScore=o=>o?o.stocked*1000+o.upgrades*100+o.robots*20:0;
function readRecoveryArchives(){
 try{const data=JSON.parse(localStorage.getItem(SAVE_ARCHIVE_KEY)||'[]');
  return Array.isArray(data)?data.filter(entry=>validSave(entry?.data)).slice(0,3):[];
 }catch{return [];}
}
function archiveSave(raw,reason='AUTOMATIC'){
 if(!validSave(raw))return false;
 const backups=readRecoveryArchives(),info=progressSummary(raw);
 if(backups.some(x=>x.data===raw))return true;
 backups.unshift({at:new Date().toISOString(),reason,summary:info,data:raw});
 try{localStorage.setItem(SAVE_ARCHIVE_KEY,JSON.stringify(backups.slice(0,3)));return true;}
 catch{return false;} // Quota errors must never prevent writing the actual save.
}
const startup=bestStartupSave(localStorage.getItem(SAVE_KEY),localStorage.getItem(MIRROR_SAVE_KEY),readRecoveryArchives(),localStorage.getItem('mustacheMartV3'));
let ORIGINAL_SAVE_DATA=startup.raw;
let ORIGINAL_SAVE_SOURCE=startup.origin;
let lastConfirmedRaw=localStorage.getItem(SAVE_KEY);
let saveWarning='';
let lastSavedAt=0;
if(validSave(ORIGINAL_SAVE_DATA))archiveSave(ORIGINAL_SAVE_DATA,'PRE-UPDATE SAVED PROGRESS');
let s=loadState(ORIGINAL_SAVE_DATA);
// Explicit opt-in dev mode: restore at least $1,000,000 in test cash while preserving larger balances.
const DEV_MODE=location.hash==='#rich'||location.hash==='#dev';
const DEV_CASH_CENTS=100_000_000; // $1,000,000 in cents, never reduce larger saves
if(DEV_MODE)s.money=Math.max(s.money,DEV_CASH_CENTS);
if(DEV_MODE){const banner=document.getElementById('devBanner');if(banner)banner.style.display='block';}
fetch('./build.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('build manifest missing')))
.then(build=>{
 const label='UPDATED BUILD · '+build.version;
 const chip=document.getElementById('buildChip');if(chip)chip.textContent=label;
 const intro=document.getElementById('buildIntro');
 if(intro)intro.firstChild.textContent='UPDATED EDITION · BUILD '+build.version+' ';
}).catch(()=>{const chip=document.getElementById('buildChip');if(chip)chip.textContent='BUILD MANIFEST NOT FOUND';});
const TEST_ENDING=location.hash==='#ending-test', PREVIEW_ENDING=location.hash==='#ending'||TEST_ENDING;
const V={x:33,z:-3,y:0,vy:0,yaw:Math.PI,pitch:0,carry:0,walked:0,jumpCount:0};
let running=false,modal='intro',mouseDown=false,held={},last=performance.now(),actionClock=0,shopCategory='tools';
let doorInteractionHeld=false,ignoreMouseUntil=0,placementRobotId=null,placementSpot=null,robotGhost=null,climbingLadderId=null;
let repairingRobotId=null,repairKeyConsumed=false;
let currentFloor=-1,world=null,robotModels=new Map(),crabModel=null,crabSwingEnds=0,beltCrates=[],feederCrates=[],clawVisual=null,cartMesh=null,cartMeshes=[],ladderMesh=null,palletMesh=null,placedClawMeshes=[],pileMeshes=[];
let selectedBeltAisle=0,freeBeltDirection=0,crabRiding=false;
let flyingCartons=[],incomingCartonCounts=new Map();
let ending=false,endStarted=false,endingTimer=0,endComplete=false,toastTimer=0,savingAt=0;
let activeCoinOffer=null;
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
let lastSaveArchiveAt=0;
function save(){
 try{
  const fresh=stampSave(serialize(s));
  const result=guardedSave(localStorage,SAVE_KEY,MIRROR_SAVE_KEY,fresh,lastConfirmedRaw);
  if(!result.ok){
   if(saveWarning!==result.message)notify('SAVE WARNING · '+result.message);
   saveWarning=result.message;
   const label=$('liveSaveStatus');if(label)label.textContent='SAVE NOT UPDATED · '+result.message;
   return false;
  }
  const old=lastConfirmedRaw;
  lastConfirmedRaw=fresh;lastSavedAt=result.stamp;
  saveWarning=result.mirrorOk?'':'Backup mirror unavailable; main save verified';
  if(!lastSaveArchiveAt||Date.now()-lastSaveArchiveAt>180000){
   if(validSave(old))archiveSave(old,'PREVIOUS GAME STATE');
   lastSaveArchiveAt=Date.now();
  }
  const label=$('liveSaveStatus');
  if(label)label.textContent='SAVED IN THIS BROWSER · '+new Date(result.stamp).toLocaleTimeString()+(result.mirrorOk?' · TWO VERIFIED COPIES':' · MAIN COPY ONLY');
  return true;
 }catch(err){saveWarning='Browser storage unavailable';notify('Could not save: browser storage might be full or unavailable.');return false;}
}
setInterval(save,5000);
addEventListener('beforeunload',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
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
const {makeMike,botAppearance,makeMegaCrab}=createCharacters({s,add,round,toon,textLabel,getWorld:()=>world});
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
 world=new THREE.Group();world.scale.x=MAP_WIDTH_MULTIPLIER;world.position.x=MAP_WIDTH_CENTER*(1-MAP_WIDTH_MULTIPLIER);scene.add(world);
 currentFloor=s.floor;flyingCartons=[];incomingCartonCounts=new Map();beltCrates=[];feederCrates=[];clawVisual=null;cartMesh=null;cartMeshes=[];ladderMesh=null;palletMesh=null;placedClawMeshes=[];pileMeshes=[];robotModels=new Map();crabModel=null;robotGhost=null;
 buildShell();buildService();buildShelves();doors.build();checkout.build();makeReceivingSystem();
 for(let a=0;a<AISLES;a++)for(let segment=0;segment<s.belts[s.floor][a];segment++)makeBelt(s.floor,a,segment);
 for(const b of s.freeBelts)if(b.floor===s.floor)makeBelt(s.floor,Math.max(0,Math.min(AISLES-1,Math.round((b.x-8)/10))),0,b);
 for(const robot of s.robots)if(robot.placed&&robot.floor===s.floor)robotModels.set(robot.id,botAppearance(robot));
 if(crabEnabled(s,DEV_MODE)&&(crabTamed(s)||s.crab.devOverride==='on'&&DEV_MODE||floorStocked(s,s.floor)<itemsPerFloor)){
  crabModel=makeMegaCrab();
  // Make the complete crab about one-third smaller (body, legs and pincers),
  // while keeping the widened aisle clearance and normal patrol animation.
  // Only the model is scaled: raid timing, stock damage and saves are unchanged.
  // Keep the crab's previous compact physical silhouette even as the
  // aisles expand to 16m visually. Only cosmetic geometry changes.
  // A broader intimidating animal, with the rest of the store still proportional.
  crabModel.scale.set(.52/MAP_WIDTH_MULTIPLIER,.72,.72);
 }
 for(const platform of platformsOnFloor(s)){
  const model=makeCart();if(model){cartMeshes.push({platform,model});if(platform===s.cart)cartMesh=model;}
 }
 palletMesh=makePalletJack();placedClawMeshes=makeClaws();pileMeshes=makeStockPiles();
 ladderMesh=makeLadder();
 // Normalize actual mesh widths, preserving intentionally wider aisle coordinates.
 world.userData.proportionStats=restoreObjectProportions(world,MAP_WIDTH_MULTIPLIER);
 uiUpdate();
}
// A transfer is recorded at the exact point the logical carton moves. A
// rendered carton now travels visibly from the old segment to the next one,
// and its destination slot remains hidden until the moving carton arrives.
// No duplicated inventory is produced; graphics are transient only.
function beltRenderKey(type,id,a,segment){
 return type==='free'?'free:'+id:'legacy:'+a+':'+segment;
}
function enqueueBeltVisualTransfer(event){
 if(event.floor!==s.floor||flyingCartons.length>=110)return;
 const fromKey=event.type==='free'?beltRenderKey('free',event.fromId):
  beltRenderKey('legacy',0,event.fromAisle,event.fromSegment);
 const toKey=event.type==='free'?beltRenderKey('free',event.toId):
  beltRenderKey('legacy',0,event.toAisle,event.toSegment);
 const entries=key=>beltCrates.filter(b=>b.freeId?
  key==='free:'+b.freeId:key==='legacy:'+b.aisle+':'+b.segment);
 const from=entries(fromKey),to=entries(toKey);
 if(!from.length||!to.length)return;
 // Source slot is the old lead carton removed by the transfer; destination
 // slot is the newly occupied slot in the receiving belt section.
 const fromCount=event.type==='free'?(s.freeBelts.find(b=>b.id===event.fromId)?.items||0):
  (s.beltItems[event.floor][event.fromAisle][event.fromSegment]||0);
 const toCount=event.type==='free'?(s.freeBelts.find(b=>b.id===event.toId)?.items||0):
  (s.beltItems[event.floor][event.toAisle][event.toSegment]||0);
 const src=from.find(b=>b.slot===Math.min(2,fromCount))||from[0];
 const dst=to.find(b=>b.slot===Math.min(2,Math.max(0,toCount-1)))||to[0];
 if(!src?.crate||!dst?.crate)return;
 world.updateMatrixWorld(true);
 const start=world.worldToLocal(src.crate.getWorldPosition(new THREE.Vector3()));
 const finish=world.worldToLocal(dst.crate.getWorldPosition(new THREE.Vector3()));
 if(start.distanceTo(finish)>14)return;
 const graphic=src.crate.clone(true);
 graphic.name='movingRealConveyorCarton';graphic.visible=true;
 graphic.position.copy(start);
 graphic.quaternion.copy(src.crate.getWorldQuaternion(new THREE.Quaternion()));
 world.add(graphic);
 flyingCartons.push({graphic,start,finish,fromRotation:graphic.quaternion.clone(),
  toRotation:dst.crate.getWorldQuaternion(new THREE.Quaternion()),toKey,
  started:performance.now(),duration:650});
}
function updateFlyingCartons(now){
 incomingCartonCounts=new Map();
 for(let i=flyingCartons.length-1;i>=0;i--){
  const flight=flyingCartons[i],t=Math.max(0,Math.min(1,(now-flight.started)/flight.duration));
  if(t>=1){world.remove(flight.graphic);flyingCartons.splice(i,1);continue;}
  const smooth=t*t*(3-2*t);
  flight.graphic.position.lerpVectors(flight.start,flight.finish,smooth);
  flight.graphic.position.y+=Math.sin(Math.PI*t)*.055;
  flight.graphic.quaternion.copy(flight.fromRotation).slerp(flight.toRotation,smooth);
  incomingCartonCounts.set(flight.toKey,(incomingCartonCounts.get(flight.toKey)||0)+1);
 }
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
function nearestBrokenRobot(){
 let nearest=null,dist=repairRange(s);
 for(const robot of s.robots){
  if(!robot.broken||robot.wrecked||!robot.placed||robot.floor!==s.floor)continue;
  const d=Math.hypot(V.x-robot.x,V.z-robot.z);
  if(d<dist){nearest=robot;dist=d;}
 }
 return nearest;
}
function cancelRepairHold(){
 if(repairingRobotId!==null)resetRobotRepair(s,repairingRobotId);
 repairingRobotId=null;repairKeyConsumed=false;
}
function tickRobotRepair(dt){
 if(!held.KeyE||modal||ending||placementRobotId!==null||s.cart.mounted||s.pallet.driving){
  if(repairingRobotId!==null)cancelRepairHold();
  return false;
 }
 if(repairKeyConsumed)return true;
 const robot=nearestBrokenRobot();
 if(!robot){
  if(repairingRobotId!==null){
   resetRobotRepair(s,repairingRobotId);repairingRobotId=null;
   repairKeyConsumed=true;return true;
  }
  return false;
 }
 if(repairingRobotId!==null&&repairingRobotId!==robot.id)
  resetRobotRepair(s,repairingRobotId);
 repairingRobotId=robot.id;
 repairRobot(s,robot.id,dt);
 if(!robot.broken){
  repairingRobotId=null;repairKeyConsumed=true;
  notify('STOCKER #'+robot.id+' repaired after 6 seconds · Back in service!');
  save();
 }
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
 if(nearestBrokenRobot())return; // E must be continuously held; clicks never repair.
 if(nearby(1.5,-7,4.0)){
  // Clicking is used for robot placement / picking up inventory. Mike's
  // dialogue should only respond to the universal E interaction key.
  if(source==='keyboard')openShop();
  return;
 }
 if(nearby(PAY.x,PAY.customerZ,PAY.interactionRadius)){const paid=payOut(s);if(paid)showPayReceipt(paid);else notify('Your payroll balance is currently $0.00. Stock more products to earn wages.');save();return;}
 if(nearby(23,-9,4.4)){openElevator();return;}
 if(V.carry<capacity(s)&&nearestWarehouseCrate(V.x,V.z,2.75)){
  V.carry++;notify('Picked up boxed inventory from the warehouse supply crates.');return;
 }
 if(nearby(DOCK.x,DOCK.z,4.4)&&V.carry<capacity(s)){V.carry++;return;}
 if(collectNearbyPile()){notify('Collected product from your pallet drop-off.');return;}
 if(V.carry<capacity(s)){
  const source=nearestBeltStock();
  if(source&&((source.freeId&&takeFreeBelt(s,source.freeId))||(!source.freeId&&takeBelt(s,s.floor,source.aisle,source.segment)))){V.carry++;notify('Picked up one delivered conveyor product.');return;}
 }
 if(manualStock())return;
 // With empty hands, E is an accessible alternative to C for gripping a ladder.
 if(!V.carry&&(climbingLadderId!==null||nearestLadder(1.9))){
   if(doorInteractionHeld)return;
   doorInteractionHeld=true;toggleClimb();return;
 }
}
function nearbyPallet(d=3){return s.pallet.floor===s.floor&&nearby(s.pallet.x,s.pallet.z,d);}
function nearbyPlatform(d=3){return !!closestPlatform(s,V.x,V.z,s.floor,d);}
// G mounts or dismounts the conquered crab. WASD steers without belt collisions.
function toggleCrabRide(){
 if(crabRiding){
  crabRiding=false;
  const p=s.crab.patrol[s.floor];
  V.x=p.x;V.z=Math.max(9.5,Math.min(90,p.z+5));V.y=0;V.vy=0;
  save();notify('Dismounted your crab · Press G near it to ride again.');return true;
 }
 if(!crabTamed(s)){notify('Buy King of the Crab from Mustache Mike after seven completed floors.');return false;}
 if(!crabModel||s.pallet.driving||s.cart.mounted||climbingLadderId!==null){
  notify('Stand on foot near your tamed crab to ride it.');return false;
 }
 const p=s.crab.patrol[s.floor];
 if(Math.hypot(V.x-p.x,V.z-p.z)>6.5){
  notify('Approach the crab before pressing G.');return false;
 }
 crabRiding=true;V.x=p.x;V.z=p.z;V.y=2.35;V.vy=0;
 notify('KING OF THE CRAB · WASD steer · Mouse look · G dismount · Zero raids.');
 return true;
}
function toggleVehicle(){
 if(s.pallet.driving){s.pallet.driving=false;notify('Parked pallet jack. U unloads inventory at an aisle.');save();return;}
 if(s.cart.mounted){s.cart.mounted=false;V.y=0;notify('Exited motorized platform.');save();return;}
 if(nearbyPallet(3.8)){s.pallet.driving=true;climbingLadderId=null;notify('PALLET JACK · WASD drive · U load at dock / unload beside aisle · F park');return;}
 const platform=closestPlatform(s,V.x,V.z,s.floor,3.6);
 if(platform){selectPlatform(s,platform.id);climbingLadderId=null;save();notify('PLATFORM #'+platform.id+' · WASD drive · Space raise · Ctrl lower · F exit');return;}
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
function nearestFreeBelt(distance=3.1){
 let closest=null,best=distance;
 for(const b of s.freeBelts){
  if(b.floor!==s.floor)continue;
  const d=Math.hypot(V.x-b.x,V.z-b.z);
  if(d<best){closest=b;best=d;}
 }
 return closest;
}
function freeBeltPlacement(){
 const heading=FREE_BELT_VECTORS[freeBeltDirection];
 // Place in the chosen direction, not an aisle-specific path or warehouse
 // checkpoint. World-grid snapping allows clean joins with other segments.
 return {x:snapFreeCoordinate(V.x+heading[0]*2.65),z:snapFreeCoordinate(V.z+heading[1]*2.65)};
}
function installClaw(){
 if(!s.clawInventory.length){notify('Buy an Automated Item Claw from Mike first.');return;}
 const free=nearestFreeBelt(3.4);
 if(free){const claw=deployFreeClaw(s,free.id);if(!claw){notify('A claw is already supplying this segment.');return;}
  buildWorld();save();notify('Claw linked to free conveyor #'+free.id+' · Supply from nearby dock or stock piles.');return;}
 const a=nearestAisle(),n=s.belts[s.floor][a],bay=n?BAYS-n:nearestBay();
 if(!n||Math.abs(V.x-(aisleX(a)+1.4))>4.4||Math.abs(V.z-bayZ(bay))>5.0){
  notify('Install a belt first, then stand near the belt endpoint and press K.');return;
 }
 const claw=deployClaw(s,s.floor,a,bay);
 if(!claw){notify('A claw is already placed at this belt endpoint.');return;}
 buildWorld();save();notify('Item claw installed. It draws ONLY from nearby inventory or pallet piles, then supplies the belt.');
}
function turnBelt(){
 const free=nearestFreeBelt(2.7);
 if(free){const dir=turnFreeBelt(s,free.id);buildWorld();save();notify('Custom conveyor #'+free.id+' now faces '+['NORTH','EAST','SOUTH','WEST'][dir]+'.');return;}
 const a=nearestAisle(),n=s.belts[s.floor][a];
 if(!n||Math.abs(V.x-(aisleX(a)+1.4))>4.4||Math.abs(V.z-bayZ(BAYS-n))>5){
   freeBeltDirection=(freeBeltDirection+1)%4;notify('Free-placement direction: '+['NORTH (-Z)','EAST (+X)','SOUTH (+Z)','WEST (-X)'][freeBeltDirection]+'. B places a new belt ahead.');return;
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
  const n=s.belts[s.floor][a];
  if(!n||!s.beltStock[s.floor][a])continue;
  for(let seg=0;seg<n;seg++){
   if(!s.beltItems[s.floor][a][seg])continue;
   const x=aisleX(a)+1.4,z=bayZ(BAYS-1-seg),d=Math.hypot(V.x-x,V.z-z);
   if(d<dist){dist=d;best={aisle:a,segment:seg,x,z};}
  }
 }
 for(const b of s.freeBelts){if(b.floor!==s.floor||!b.items)continue;const d=Math.hypot(V.x-b.x,V.z-b.z);if(d<dist){dist=d;best={freeId:b.id,x:b.x,z:b.z};}}
 return best;
}
function startRobotPlacement(id){
 if(s.robots.some(r=>r.id===id&&r.wrecked)){notify('CRAB DESTROYED THIS ROBOT · Sell for 25% before buying and deploying a replacement.');return;}
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
 if(!best||best.type!=='ladder')for(const claw of s.claws.filter(c=>c.floor===s.floor)){
  const d=Math.hypot(V.x-claw.x,V.z-claw.z);
  if(d<dist){dist=d;best={type:'claw',id:claw.id};}
 }
 if(!best||best.type!=='ladder')for(const r of s.robots.filter(r=>r.placed&&r.floor===s.floor)){
  const d=Math.hypot(V.x-r.x,V.z-r.z);
  if(d<dist){dist=d;best={type:'robot',id:r.id};}
 }
 if(!best||best.type!=='ladder')for(const b of s.freeBelts.filter(b=>b.floor===s.floor)){
  const d=Math.hypot(V.x-b.x,V.z-b.z);if(d<dist){dist=d;best={type:'freeBelt',id:b.id};}
 }
 if(!best||best.type!=='ladder')for(let a=0;a<AISLES;a++){
  const n=s.belts[s.floor][a];if(!n)continue;
  const z=bayZ(BAYS-n),d=Math.hypot(V.x-(aisleX(a)+1.4),V.z-z);
  if(d<dist){dist=d;best={type:'belt',a,seg:n-1};}
 }
 if(!best){notify('Walk close to a robot, item claw, ladder, or END conveyor segment and press X.');return;}
 const wasWrecked=best.type==='robot'&&!!s.robots.find(r=>r.id===best.id)?.wrecked;
 const refund=best.type==='ladder'?sellLadder(s,best.id):best.type==='robot'?sellRobot(s,best.id):best.type==='claw'?sellClaw(s,best.id):best.type==='freeBelt'?sellFreeBelt(s,best.id):sellBelt(s,s.floor,best.a,best.seg);
 if(!refund){notify('Cannot sell that equipment.');return;}
 if(best.type==='ladder'&&climbingLadderId===best.id){climbingLadderId=null;V.y=0;V.vy=0;}
 buildWorld();save();
 notify('Sold '+best.type+' for '+centsText(refund)+(wasWrecked?' (25% crab-damage scrap value; replacement slot now free).':' (50% of original cost).'));
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

function upcomingCoinOffer(){
 for(const key of ['cash','floor3']){
  const entry=s.coinOffers[key];
  if(entry.unlocked&&!entry.played&&!entry.declined&&coinFlipStake(s,key)>0&&!entry.seen)return key;
 }
 return null;
}
const coinCash=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
function renderCoinFlip(){
 const key=activeCoinOffer;if(!key)return;
 const stake=coinFlipStake(s,key),second=key==='floor3';
 $('coinTitle').textContent=second?'FLOOR 3 · ALL-IN COIN FLIP':'THE $3,000 SECRET FLIP';
 $('coinStake').textContent=coinCash(stake|| (second?s.money:COIN_FLIP_FIRST_STAKE))+' AT STAKE';
 $('coinDescription').textContent=second?
  'You finished Floor 3. YES flips a fair coin for your ENTIRE CURRENT CASH BALANCE. Heads doubles your money; tails takes ALL of it. NO permanently rejects this offer. This is your only decision.':
  'You have reached $3,000 cash. YES flips a fair coin: HEADS wins another $3,000, TAILS loses $3,000. NO permanently rejects the offer. There is no waiting or retrying.';
 $('coinOutcome').textContent=stake?'Choose YES to risk this amount or NO to refuse forever. No postponing.':
  'You need the full wager in your account before deciding.';
 $('coinEmblem').classList.remove('flip-result');$('coinEmblem').innerHTML='✦<span>MM</span>';
 $('coinHeads').hidden=$('coinTails').hidden=false;
 $('coinHeads').disabled=!stake;$('coinTails').disabled=false;
 $('coinHeads').textContent='YES · FLIP THE COIN';
 $('coinTails').textContent='NO · DECLINE FOREVER';
 $('coinClose').hidden=true;
}
function openCoinFlip(key){
 if(!['cash','floor3'].includes(key)||!s.coinOffers[key].unlocked||s.coinOffers[key].played||s.coinOffers[key].declined)return false;
 activeCoinOffer=key;markCoinOfferSeen(s,key);renderCoinFlip();save();show('coinflip');return true;
}
function closeCoinFlip(){
 activeCoinOffer=null;save();resume();
}
function updateSecretCoinOffer(){
 const newly=refreshCoinOffers(s);
 if(newly.length)save();
 if(!modal&&running){
  const unseen=upcomingCoinOffer();
  if(unseen)openCoinFlip(unseen);
 }
}
function acceptSecretCoin(){
 const key=activeCoinOffer;if(!key||modal!=='coinflip')return;
 const unit=typeof crypto!=='undefined'&&crypto.getRandomValues?
  crypto.getRandomValues(new Uint32Array(1))[0]/4294967296:Math.random();
 const result=acceptCoinFlip(s,key,unit);
 if(!result){renderCoinFlip();return;}
 save();uiUpdate();showSaveOrigin();
 const coin=$('coinEmblem');coin.classList.remove('flip-result');
 coin.textContent=result.won?'H':'T';void coin.offsetWidth;coin.classList.add('flip-result');
 $('coinOutcome').textContent=(result.won?'HEADS · YOU WON! ':'TAILS · YOU LOST. ')+
  (result.won?'+':'−')+coinCash(result.stake)+' · NEW BALANCE '+coinCash(result.balanceAfter);
 $('coinDescription').textContent=result.won?
  'You won the one-time coin flip. Your result is permanently saved.':
  'You lost the one-time coin flip. Your result is permanently saved.';
 $('coinHeads').hidden=$('coinTails').hidden=true;
 $('coinClose').hidden=false;
}
function rejectSecretCoin(){
 const key=activeCoinOffer;if(!key||modal!=='coinflip')return;
 if(!declineCoinFlip(s,key))return;
 save();closeCoinFlip();
 notify('SECRET OFFER DECLINED · This coin flip will never return.');
}

function show(id){
 for(const key of ['intro','shop','elevator','coinflip','end'])$(key).classList.toggle('open',key===id);
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
$('coinHeads').addEventListener('click',acceptSecretCoin);
$('coinTails').addEventListener('click',rejectSecretCoin);
$('coinClose').addEventListener('click',closeCoinFlip);
function openShop(){
 if(!nearby(1.5,-7,4.6)){notify('Find Mustache Mike at the front customer service counter.');return;}
 // No mouse click interaction: E only, consistent with payroll / checkout.
 held.KeyE=false;mouseDown=false;actionClock=0;
 show('shop');renderShop();
}
// The skill-tree graph is presentation only. All prerequisites and prices come
// from UPGRADES and the production purchase() function; save data is unchanged.
const SKILL_LAYOUT={
 carryHarness:[0,205],courierStride:[0,424],warehouseLogistics:[0,643],
 doubleJump:[0,915],airControl:[0,1100],
 warehouseFocus:[1,205],robotEfficiency:[1,350],clawCycle:[1,630],beltMotor:[1,790],
 repairTraining:[2,205],robotReliability:[2,350],crabKing:[2,550],
 retailMargin:[3,205],robotCommission:[3,350],cashback:[3,500]
};
const FOUNDATION_LAYOUT={
 capacity:[0,105],speed:[0,324],palletCapacity:[0,543],jump:[0,805],
 robotSpeed:[1,105],itemClaw:[1,525],
 robot:[2,105],shelfBonus:[3,105]
};
const SKILL_BRANCHES=['Handling','Automation','Maintenance','Retail'];
const SKILL_X=[28,328,628,928];
function makeUpgradeCard(u,view='economy'){
 const lv=s.levels[u.id],cost=price(u,lv),max=lv>=u.max;
 const scrapRequired=u.id==='robot'&&s.robots.some(r=>r.wrecked);
 const unlocked=skillAvailable(s,u)&&(u.id!=='crabKing'||s.crab.unlocked||completedFloors(s)>=CRAB_UNLOCK_FLOORS);
 const state=max?'maxed':scrapRequired?'locked':!unlocked?'locked':s.money<cost?'unaffordable':'ready';
 const row=document.createElement('div');
 row.className='upgrade '+(view==='skills'?'skillNode ':view==='tools'?'toolUpgrade ':'')+'state-'+state;
 row.dataset.upgrade=u.id;
 const info=document.createElement('div');info.className='upgradeInfo';
 const name=document.createElement('strong'),desc=document.createElement('small');
 name.textContent=(view==='economy'&&u.branch?'['+u.branch+'] ':'')+u.name+(view==='economy'?' · Lv '+lv+'/'+u.max:'');
 desc.textContent=u.detail+(view==='economy'&&u.requires?' · Requires: '+Object.entries(u.requires).map(([id,n])=>(UPGRADES.find(x=>x.id===id)?.name||id)+' Lv '+n).join(', '):'');
 if(view!=='economy'){
  const meta=document.createElement('div');meta.className='upgradeMeta';
  const family=document.createElement('span');family.className='upgradeFamily';
  family.textContent=view==='skills'?u.branch:'MM / '+(u.id.startsWith('robot')?'ROBOTICS':u.id.toLowerCase().includes('ladder')||u.id==='cart'?'ACCESS':u.id==='itemClaw'?'LOGISTICS':'EQUIPMENT');
  const rank=document.createElement('span');rank.className='upgradeRank';rank.textContent='LV '+lv+' / '+u.max;
  meta.append(family,rank);info.append(meta);
 }
 info.append(name,desc);
 if(view==='skills'){
  const requirements=document.createElement('div');requirements.className='skillNeeds';
  for(const [id,n] of Object.entries(u.requires||{})){
   const req=document.createElement('span');const source=UPGRADES.find(x=>x.id===id);
   const met=(s.levels[id]||0)>=n;req.className='skillRequirement '+(met?'met':'unmet');
   req.textContent=(met?'✓ ':'◇ ')+(source?.name||id)+' '+n;
   requirements.append(req);
  }
  info.append(requirements);
 }
 const bottom=document.createElement('div');bottom.className='upgradeFooter';
 if(view!=='economy'){
  const badge=document.createElement('span');badge.className='upgradeStatus';
  badge.textContent=max?'COMPLETE':scrapRequired?'SELL CRAB WRECK FIRST':!unlocked?'PREREQUISITE':s.money<cost?'FUNDS NEEDED':'READY';
  bottom.append(badge);
 }
 const btn=document.createElement('button');btn.type='button';
 btn.textContent=max?'MAXED':scrapRequired?'SCRAP FIRST':!unlocked?'LOCKED':centsText(cost);
 btn.setAttribute('aria-label',max?u.name+' maxed':!unlocked?u.name+' locked': 'Purchase '+u.name+' for '+centsText(cost));
 btn.disabled=max||scrapRequired||s.money<cost||!unlocked||(['cart','ladderPlus'].includes(u.id)&&!s.levels.ladder);
 btn.addEventListener('click',()=>{
  if(!purchase(s,u.id))return;
  if(u.id==='robot'){
   const bot=s.robots[s.robots.length-1];
   buildWorld();save();renderShop();uiUpdate();
   notify('STOCKER #'+bot.id+' spawned on '+floorLabel(bot.floor)+' · AISLE '+(bot.aisle+1)+' · Manage its placement in Mike’s robot pad.');
   return;
  }
  if(['cart','ladderPlus','robotLift','crabKing'].includes(u.id))buildWorld();
  if(u.id==='crabKing'){crabSwingEnds=0;notify('KING OF THE CRAB UNLOCKED · All crab attacks stopped! Approach its shell and press G to ride.');}
  else if(u.id==='itemClaw')notify('Item claw purchased. Stand by a conveyor outlet and press K to install it.');
  else notify('UPGRADE INSTALLED · '+u.name+' · Level '+s.levels[u.id]);
  save();renderShop();uiUpdate();
  const updated=$('shopitems').querySelector('[data-upgrade="'+u.id+'"]');
  if(updated){updated.classList.add('justPurchased');updated.scrollIntoView({block:'nearest',inline:'nearest'});}
 });
 bottom.append(btn);row.append(info,bottom);
 return row;
}
function renderSkillGraph(list){
 list.className='skillTree';
 const summary=document.createElement('div');summary.className='skillTreeSummary';
 const copy=document.createElement('div'),heading=document.createElement('strong'),description=document.createElement('small');
 heading.textContent='THE UPGRADE NETWORK';
 description.textContent='Follow the connections. Branches unlock as you purchase the required equipment or earlier skills.';
 copy.append(heading,description);
 const tally=document.createElement('div');tally.className='skillTreeCount';
 const skills=UPGRADES.filter(u=>u.category==='skills');
 tally.textContent=skills.filter(u=>s.levels[u.id]>0).length+' / '+skills.length+' skills started';
 summary.append(copy,tally);list.append(summary);
 const legend=document.createElement('div');legend.className='skillLegend';
 for(const [kind,label] of [['ready','Available'],['maxed','Completed'],['locked','Locked'],['unaffordable','Need funds']]){
  const labelNode=document.createElement('span');labelNode.className='legend-'+kind;labelNode.textContent=label;legend.append(labelNode);
 }
 list.append(legend);
 const viewport=document.createElement('div');viewport.className='skillViewport';viewport.tabIndex=0;
 viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Connected upgrade skill tree. Scroll horizontally and vertically to browse.');
 const board=document.createElement('div');board.className='skillBoard';
 for(let col=0;col<SKILL_BRANCHES.length;col++){
  const lane=document.createElement('div');lane.className='skillLane skillLane-'+col;lane.style.left=SKILL_X[col]+'px';
  const title=document.createElement('h3');title.textContent=SKILL_BRANCHES[col];
  const sub=document.createElement('small');sub.textContent=['MOVE & HAUL','MACHINES & ROUTES','SERVICE & REPAIR','SALES & REBATES'][col];
  lane.append(title,sub);board.append(lane);
 }
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('class','skillWires');svg.setAttribute('width','1200');svg.setAttribute('height','1490');
 svg.setAttribute('viewBox','0 0 1200 1490');svg.setAttribute('aria-hidden','true');
 board.append(svg);
 const targets=new Map();
 for(const [id,[col,y]] of Object.entries(FOUNDATION_LAYOUT)){
  const u=UPGRADES.find(x=>x.id===id);
  const levelsNeeded=Math.max(...skills.map(x=>x.requires?.[id]||0),1);
  const available=(s.levels[id]||0)>=levelsNeeded;
  const base=document.createElement('div');base.className='skillFoundation '+(available?'foundationActive':'foundationLocked');
  base.style.left=SKILL_X[col]+'px';base.style.top=y+'px';base.dataset.foundation=id;
  const top=document.createElement('span');top.textContent='FOUNDATION · '+(u.category==='economy'?'ECONOMY':'TOOLS');
  const name=document.createElement('strong');name.textContent=u.name;
  const progress=document.createElement('small');progress.textContent='LV '+(s.levels[id]||0)+' / '+levelsNeeded+(available?' · ONLINE':' · REQUIRED');
  base.append(top,name,progress);
  base.title='Click to find this prerequisite in '+(u.category==='economy'?'Economy':'Equipment');
  base.tabIndex=0;base.setAttribute('role','button');
  base.setAttribute('aria-label','Find prerequisite '+u.name);
  const follow=()=>{shopCategory=u.category||'tools';renderShop();};
  base.addEventListener('click',follow);
  base.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();follow();}});
  board.append(base);targets.set(id,{x:SKILL_X[col]+125,y:y+76,ready:available});
 }
 for(const u of skills){
  const pos=SKILL_LAYOUT[u.id];if(!pos)continue;
  const [col,y]=pos,x=SKILL_X[col];
  const node=makeUpgradeCard(u,'skills');
  node.style.left=x+'px';node.style.top=y+'px';
  board.append(node);
  targets.set(u.id,{x:x+125,y:y,ready:s.levels[u.id]>0});
 }
 for(const u of skills){
  const dest=targets.get(u.id);if(!dest)continue;
  for(const [id,n] of Object.entries(u.requires||{})){
   const src=targets.get(id);if(!src)continue;
   const met=(s.levels[id]||0)>=n;
   const startY=src.y;
   const endY=dest.y;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   const bend=Math.max(28,Math.min(85,Math.abs(endY-startY)*.48));
   path.setAttribute('d','M '+src.x+' '+startY+' C '+src.x+' '+(startY+bend)+', '+dest.x+' '+(endY-bend)+', '+dest.x+' '+endY);
   path.setAttribute('class','skillWire '+(met?'wireActive':'wireLocked'));
   svg.append(path);
  }
 }
 viewport.append(board);list.append(viewport);
 const foot=document.createElement('p');foot.className='skillGraphFoot';
 foot.textContent='Foundation blocks link to their required purchase category. The upgrade network does not change prices, prerequisites or saved progress.';
 list.append(foot);
}
function renderShop(){
 $('shopMoney').textContent=centsText(s.money);
 $('shop').classList.toggle('skillTreeMode',shopCategory==='skills');
 $('shop').classList.toggle('toolShopMode',shopCategory==='tools');
 for(const name of ['tools','skills','economy']){
  const tab=$('tab-'+name);tab.setAttribute('aria-pressed',String(shopCategory===name));
  tab.classList.toggle('selected',shopCategory===name);
 }
 const list=$('shopitems');list.replaceChildren();list.className='';
 if(shopCategory==='skills'){
  renderSkillGraph(list);
  return;
 }
 if(shopCategory==='tools'){
  list.classList.add('shopTools');
  const heading=document.createElement('div');heading.className='toolsHeading';
  const eyebrow=document.createElement('span');eyebrow.textContent='MUSTACHE MIKE / EQUIPMENT DEPOT';
  const title=document.createElement('h3');title.textContent='Build your own retail machine.';
  const caption=document.createElement('small');caption.textContent='Upgrade, deploy, and automate your way through fifteen floors.';
  heading.append(eyebrow,title,caption);list.append(heading);
 }
 for(const u of UPGRADES.filter(u=>(u.category||'tools')===shopCategory)){
  list.append(makeUpgradeCard(u,shopCategory));
 }
 if(shopCategory==='tools'){
  if(s.robots.length){
   const heading=document.createElement('h3');heading.className='toolsGroupTitle';heading.textContent='Your robots · Placement and resale';list.append(heading);
   for(const r of s.robots){
    const item=document.createElement('div');item.className='upgrade toolManagement';
    const name=document.createElement('strong');
    name.textContent='Stocker #'+r.id+' · '+(r.wrecked?'CRAB DESTROYED · SELL REQUIRED · ':r.broken?'REPAIR NEEDED · ':'')+(r.placed?floorLabel(r.floor)+' / Aisle '+(r.aisle+1):'Pending placement')+' · '+(r.stockedSinceService||0)+' stocked since service';
    item.append(name);const buttons=document.createElement('div');buttons.className='robotActions';
    const relocate=document.createElement('button');relocate.textContent='Move to chosen floor / aisle';
    relocate.disabled=!!r.wrecked;
    relocate.title=r.wrecked?'Irreparable crab damage: sell and purchase a new robot.':'Instantly move the robot using Mike’s control panel.';
    const sell=document.createElement('button');sell.textContent=(r.wrecked?'Scrap 25% · ':'Sell 50% · ')+centsText(Math.floor(r.paid*(r.wrecked?.25:.5)));
    sell.addEventListener('click',()=>{sellRobot(s,r.id);buildWorld();save();renderShop();uiUpdate();});
    const chooser=document.createElement('select');chooser.setAttribute('aria-label','Choose aisle for stocker '+r.id);
    for(let aisle=0;aisle<AISLES;aisle++){
     const option=document.createElement('option');option.value=String(aisle);
     option.textContent='Aisle '+(aisle+1);option.selected=aisle===(r.homeAisle??r.aisle);
     chooser.append(option);
    }
    chooser.disabled=!!r.wrecked;
    const floorChooser=document.createElement('select');floorChooser.setAttribute('aria-label','Choose floor for stocker '+r.id);
    for(let f=0;f<FLOORS;f++){
      const option=document.createElement('option');option.value=String(f);
      option.textContent='Floor '+String(f+1).padStart(2,'0');option.selected=f===r.floor;
      floorChooser.append(option);
    }
    floorChooser.disabled=!!r.wrecked;
    relocate.addEventListener('click',()=>{
      const f=Number(floorChooser.value),a=Number(chooser.value);
      if(moveRobotFromMike(s,r.id,f,a)){
        buildWorld();save();renderShop();uiUpdate();
        notify('Mike dispatched stocker #'+r.id+' to '+floorLabel(f)+' / AISLE '+(a+1)+'.');
      }
    });
    item.append(floorChooser,chooser);
    buttons.append(relocate,sell);item.append(buttons);list.append(item);
   }
  }
  if(s.claws.length){
   const heading=document.createElement('h3');heading.className='toolsGroupTitle';heading.textContent='Deployed claws · Resale';list.append(heading);
   for(const claw of s.claws){
    const row=document.createElement('div');row.className='upgrade toolManagement';
    const label=document.createElement('strong');label.textContent='Claw #'+claw.id+' · '+floorLabel(claw.floor)+' / Aisle '+(claw.aisle+1);
    const button=document.createElement('button');button.textContent='Sell '+centsText(Math.floor(claw.paid/2));
    button.addEventListener('click',()=>{sellClaw(s,claw.id);buildWorld();save();renderShop();uiUpdate();});
    row.append(label,button);list.append(row);
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
 show('elevator');
 renderElevatorDirectory({
  panel:$('elevator'),state:s,floorCount:FLOORS,itemsPerFloor,totalItems:TOTAL_ITEMS,floorStocked,
  onChoose:f=>{
   crabRiding=false;s.floor=f;V.x=23;V.z=-5;V.y=V.vy=0;V.carry=0;
   buildWorld();save();
   notify('Lift arrived at '+floorLabel(f)+' · '+itemsPerFloor.toLocaleString()+' pieces per floor.');
   resume();
  }
 });
}
function placeLadder(){
 if(!s.ladderInventory.length){notify('Buy a portable ladder from Mike first.');return;}
 if(V.z<11||V.z>92||Math.abs(V.x-aisleX(nearestAisle()))>2.5){notify('Stand in a supermarket aisle to install a ladder.');return;}
 const l=deployLadder(s,s.floor,nearestAisle(),nearestBay());
 if(!l){notify('A ladder already occupies this area.');return;}
 buildWorld();save();notify('Ladder placed · C to climb, W/S to go up/down, X to sell.');
}
function buildNextBelt(){
 const atDock=nearby(DOCK.x,DOCK.z,5),a=atDock?selectedBeltAisle:nearestAisle(),n=s.belts[s.floor][a];
 // Existing old-style rear-to-front aisle networks remain available so
 // previously purchased conveyors and stock-routing workflows keep working.
 const legacyTip=Math.abs(V.x-aisleX(a))<2.7&&Math.abs(V.z-bayZ(BAYS-1-n))<4.2;
 if((atDock||legacyTip)&&freeBeltDirection===0){
  if(atDock&&n>0){notify('Aisle conveyor already connected. Approach its tip to extend, or turn with Z to start a free route.');return;}
  if(n>=BAYS){notify('This legacy aisle conveyor is full. Use Z and B to start a free route.');return;}
  if(!buildBelt(s,s.floor,a,n)){notify('Need '+centsText(beltCost(s,s.floor,a))+' to build.');return;}
  buildWorld();save();notify('Extended connected aisle conveyor · B adds sections at its tip.');return;
 }
 // Otherwise B works anywhere physically unobstructed on the current floor.
 const pos=freeBeltPlacement();
 const cost=12+Math.floor(s.freeBelts.filter(b=>b.floor===s.floor).length*.65);
 const piece=placeFreeBelt(s,s.floor,pos.x,pos.z,freeBeltDirection,(x,z)=>
  !isBlocked(x,z,s.floor,.72)&&!blockedEquipment(s,x,z,.72));
 if(!piece){
  notify('Cannot place conveyor there. Need '+centsText(cost)+' and open space ahead · Z rotate direction · B place.');return;
 }
 buildWorld();save();
 notify('FREE CONVEYOR #'+piece.id+' · '+['NORTH','EAST','SOUTH','WEST'][piece.dir]+
  ' · B adds ahead · Z rotate near belt · K attach claw · X sell · Every tile transports 3 actual packages max.');
}
function updatePrompt(){
 let msg='';
 const wreckNearby=s.robots.find(r=>r.wrecked&&r.placed&&r.floor===s.floor&&nearby(r.x,r.z,3.3));
 const brokenNearby=nearestBrokenRobot();
 if(crabRiding)msg='KING OF THE CRAB · WASD RIDE · MOUSE LOOK · G DISMOUNT · NO MORE SWIPES';
 else if(crabTamed(s)&&crabModel&&Math.hypot(V.x-s.crab.patrol[s.floor].x,V.z-s.crab.patrol[s.floor].z)<6.5)msg='G · MOUNT YOUR TAMED CRAB · NO DAMAGE TO STOCK OR ROBOTS';
 else if(wreckNearby)msg='CRAB DESTROYED STOCKER #'+wreckNearby.id+' · X SCRAP FOR 25% · THEN PURCHASE A NEW ROBOT';
 else if(brokenNearby){
  const progress=Math.floor((brokenNearby.repairProgress||0)/ROBOT_REPAIR_SECONDS*100);
  msg='REPAIR STOCKER #'+brokenNearby.id+' · HOLD E FOR 6 SEC · '+progress+'%';
 }
 else if(s.pallet.driving)msg='PALLET JACK '+s.pallet.load+'/'+palletCapacity(s)+' · WASD drive · U load/unload · F park';
 else if(s.cart.mounted)msg='LADDER PLATFORM · WASD move · Space elevate · Ctrl descend · F exit · E stock shelves';
 else if(nearbyPallet(4))msg='F drive pallet jack · U load '+palletCapacity(s)+' products at receiving / unload by aisles';
 else if(nearbyPlatform(3.6))msg='F ride motorized ladder platform · WASD move · Space raise · Ctrl lower';
 else if(s.claws.some(c=>c.floor===s.floor&&nearby(c.x,c.z,3.5))){
  const claw=s.claws.find(c=>c.floor===s.floor&&nearby(c.x,c.z,3.5));
  const free=claw.freeBeltId?s.freeBelts.find(b=>b.id===claw.freeBeltId):null;
  const seg=free?-1:clawReceivingSegment(s,claw);
  const filled=free?free.items:seg>=0?s.beltItems[s.floor][claw.aisle][seg]:0;
  msg=seg<0&&!free?'CLAW DISCONNECTED · Build a conveyor beside it':
      filled>=BELT_CAPACITY?'CLAW PAUSED · Receiving belt '+filled+'/'+BELT_CAPACITY+' FULL · Clear downstream or collect a carton':
      !nearestClawSource(s,claw)?'CLAW IDLE · Place inventory beside it with pallet jack':
      'CLAW LOADING · '+filled+'/'+BELT_CAPACITY+' cartons in segment · Moves only if next belt has space';
 }
 else if(s.clawInventory.length&&V.z>10)msg='K place bought item claw near conveyor outlet · Z rotate outlet · F use machines';
 else if(placementRobotId!==null)msg='ROBOT #'+placementRobotId+' · WALK to the aisle · LEFT CLICK to deploy · ESC cancel';
 else if(climbingLadderId!==null)msg='CLIMBING · W up · S down · C release · Hold E to stock';

 else if(nearestLadder(1.8))msg='E or C · Grab ladder · Hold W to climb / S to descend · X sell';
 else if(nearestBeltStock())msg='E · Take conveyor stock · X sell a nearby conveyor';
 else if(doors.nearFire(V.x,V.z))msg='E · '+(doors.isFireOpen()?'Close':'Open')+' FIRE EXIT (brick wall behind)';
 else if(doors.nearEntrance(V.x,V.z))
   msg=canOpenStore(s)?'E · Unlock the grand opening and slide open the doors':'E · You have to stock the building before opening';
 else if(checkout.nearest(V.x,V.z)>=0)msg='E · Check cashier terminal · Checkout belts active · Customer payments begin on opening';
 else if(nearestWarehouseCrate(V.x,V.z,3))msg='BOXED WAREHOUSE STOCK · E collect inventory · U load nearby pallet jack';
 else if(nearby(DOCK.x,DOCK.z,5.0))msg='RECEIVING · E COLLECT · B BUILD · Z ROTATE FREE BELT DIRECTION · K CONNECT CLAW';
 else if(nearby(1.5,-7,4.0))msg='E · Speak with Mustache Mike · E or Close returns to mouse look';
 else if(nearby(PAY.x,PAY.customerZ,PAY.interactionRadius))msg='E · Collect '+centsText(s.pending)+' at the WALL-MOUNTED payroll window';
 else if(nearby(23,-9,4.4))msg='E or R · Ride elevator to floors 1–15';
 else if(V.z>=11){
   const id=cellToStock();
   if(id>=0)msg='Hold E · Stock '+['LOW (1¢)','SECOND (1¢)','LADDER (2¢)','EXTENDED LADDER (3¢)'][id%TIERS]+(canReach(id%TIERS)?'':' · NEEDS A HIGHER ACCESS UPGRADE')+' · B builds conveyor';
   else msg='B place belt in any clear area · Z change its facing · K connect claw · L ladder';
 }
 if(msg){$('prompt').hidden=false;$('prompt').textContent=msg;}else $('prompt').hidden=true;
 const pickup=$('pickupStatus');
 pickup.hidden=!!modal||!nearby(DOCK.x,DOCK.z,4.4);
 if(!pickup.hidden)pickup.textContent='RECEIVING CLAW  •  AISLE '+(selectedBeltAisle+1)+'  •  [ / ] SELECT   •  B BUILD   •  E PICK UP';
 const panel=$('routingStatus');
 if(panel){
  const count=s.belts[s.floor].filter(v=>v>0).length+s.freeBelts.filter(b=>b.floor===s.floor).length;
  panel.hidden=!!modal||!nearby(DOCK.x,DOCK.z,8.0);
  if(!panel.hidden)panel.textContent='INVENTORY → CLAW → AISLE '+String(selectedBeltAisle+1).padStart(2,'0')+
   '  |  Built paths: '+count+'  |  Items on legacy line: '+s.beltStock[s.floor][selectedBeltAisle]+'/'+(s.belts[s.floor][selectedBeltAisle]*BELT_CAPACITY)+'  |  Max 3/segment · [ / ] choose';
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
   const obj=robotModels.get(r.id);obj.visible=true;
   if(r.wrecked){obj.position.set(r.x,0,r.z);continue;}
   const cell=r.phase==='shelf'&&r.target>=0?decode(r.target):null;
   const platform=cell?.tier===3?robotPlatformFor(s,r.target):null;
   const aboard=platform&&Math.hypot(r.x-(platform.x??aisleX(platform.aisle)),r.z-platform.z)<.38;
   obj.position.set(r.x,(aboard?platform.liftHeight+1.3:s.levels.robotLift===1?0:Math.min(5,r.liftY||0))+.04*Math.sin(performance.now()/230+r.id),r.z);
   const body=obj.getObjectByName('liftBody');
   if(body)body.position.y=aboard?0:s.levels.robotLift===1?r.liftY||0:0;
   const jack=obj.getObjectByName('liftingJack');
   if(jack){const height=aboard?0:s.levels.robotLift===1?r.liftY||0:0;jack.scale.y=1+height;jack.position.y=.98+height*.5;}
   const crate=obj.getObjectByName('crate');if(crate)crate.visible=r.carry>0;
   const beacon=obj.getObjectByName('repairBeacon');
   if(beacon)beacon.visible=!!r.broken;
   if(r.broken)obj.rotation.y=Math.sin(performance.now()/600)*.06;
  }else if(robotModels.has(r.id)){const obj=robotModels.get(r.id);obj.visible=false;robotModels.delete(r.id);}
 }
}
function syncCrab(now){
 if(!crabModel)return;
 const p=s.crab.patrol[s.floor],wave=now*.001;
 crabModel.position.set((p.x??aisleX(p.aisle))+.16*Math.sin(wave*.8),.15*Math.sin(wave*3.6),p.z);
 crabModel.rotation.y+=((Math.abs((p.x??0)-aisleX(p.targetAisle??p.aisle))>.25?
   ((p.x??0)<aisleX(p.targetAisle??p.aisle)?-Math.PI/2:Math.PI/2):0)-crabModel.rotation.y)*.06;
 for(const leg of crabModel.userData.legs||[]){
  leg.joint.rotation.z=Math.sin(wave*2.1+leg.index*1.6+leg.side)*.18;
  leg.joint.rotation.y=Math.sin(wave*1.4+leg.index*1.1)*.085;
 }
 const striking=!crabTamed(s)&&now<crabSwingEnds;
 for(const [i,lens] of (crabModel.userData.warningLights||[]).entries()){
  // Warm idle indicator and an obvious red-orange flicker during a swing.
  lens.visible=striking?Math.sin(wave*19+i*1.8)>-.5:Math.sin(wave*2+i*.7)>.36;
 }
 for(const claw of crabModel.userData.jaws||[]){
  claw.rotation.y=Math.sin(wave*2)*.2+(striking?Math.sin(wave*23)*.95:0);
  claw.rotation.z=striking?Math.sin(wave*19)*.28:Math.sin(wave*2.5)*.09;
 }
}
function tickCrabRaids(elapsed,now){
 if(!running||modal||ending)return;
 const justUnlocked=!s.crab.unlocked;
 const events=advanceCrab(s,Math.min(elapsed,.25),DEV_MODE,crabRiding?s.floor:-1);
 if(justUnlocked&&s.crab.unlocked){
  buildWorld();notify('Something enormous is moving through the store...');
  save();
 }
 for(const event of events){
  if(event.floor===s.floor){
   crabSwingEnds=now+2400;
   buildWorld();
   notify('CRAB SWING · AISLE '+(event.aisle+1)+' · '+event.fallen+' GOODS ON FLOOR · '+event.robots.length+' ROBOTS DESTROYED!');
  }
  // Raids on other floors are simulated and saved even when not rendered.
  save();
 }
 syncCrab(now);
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
  if(crabRiding){
   moveTamedCrab(s,s.floor,forward,side,dt,V.yaw);
   const p=s.crab.patrol[s.floor];V.x=p.x;V.z=p.z;V.y=2.35;V.vy=0;
  }else if(s.pallet.driving){
   const moved=drivePallet(s,forward,side,dt,(x,z)=>!isBlocked(x,z,s.floor));
   V.x=s.pallet.x;V.z=s.pallet.z;V.y=0;V.vy=0;
  }else if(s.cart.mounted){
   drivePlatform(s,forward,side,dt,(x,z)=>!isBlocked(x,z,s.floor,.87)&&!blockedEquipment(s,x,z,.87));
   liftPlatform(s,(held.Space?1:0)-(held.ControlLeft||held.ControlRight?1:0),dt);
   V.x=s.cart.x??aisleX(s.cart.aisle);V.z=s.cart.z;V.y=s.cart.liftHeight+1.15;V.vy=0;
  }else if(climbingLadderId!==null){
   const l=s.ladders.find(l=>l.id===climbingLadderId&&l.floor===s.floor);
   if(!l){climbingLadderId=null;V.y=0;}
   else{const top=s.levels.ladderPlus?9.45:4.75;
    V.x=l.x;V.z=l.z;V.vy=0;V.y=ladderHeight(V.y,forward,elapsed,!!s.levels.ladderPlus);
   }
  }else if(forward||side){
   const speed=walkSpeed(s)*playerMoveMultiplier(s,!!held.ShiftLeft,V.y>0)*dt/Math.hypot(forward,side);
   const dx=(-Math.sin(V.yaw)*forward+Math.cos(V.yaw)*side)*speed/MAP_WIDTH_MULTIPLIER;
   const dz=(-Math.cos(V.yaw)*forward-Math.sin(V.yaw)*side)*speed;
   const next=moveWithCollisions(V.x,V.z,dx,dz,s.floor,(x,z)=>blockedEquipment(s,x,z));
   V.x=next.x;V.z=next.z;
  }
  if(!crabRiding&&climbingLadderId===null&&!s.pallet.driving&&!s.cart.mounted){V.vy-=13*dt;V.y=Math.max(0,V.y+V.vy*dt);if(V.y===0&&V.vy<0){V.vy=0;V.jumpCount=0;}}
  // Repair time tracks elapsed real seconds, not the capped movement timestep.
  const repairing=tickRobotRepair(Math.min(elapsed,.25));
  if(!repairing&&!crabRiding&&!s.pallet.driving&&(held.KeyE||mouseDown)){actionClock+=dt;while(actionClock>=.32){actionClock-=.32;act(held.KeyE?'keyboard':'mouse');if(modal)break;}}else actionClock=0;
 }
 if(!ending&&running){
  // Render the current floor; background robot simulation advances on every floor.
  camera.position.set(toWideX(V.x),1.65+V.y,V.z);camera.rotation.set(V.pitch,V.yaw,0);
  hand.visible=V.carry>0;hand.scale.setScalar(.45+Math.min(1,V.carry/capacity(s))*.55);
 }
 if(!ending){
  tickCrabRaids(elapsed,now);
  advanceBelts(s,Math.min(elapsed,2),enqueueBeltVisualTransfer);
  for(const r of s.robots){
   const prevTarget=r.target,prevCount=prevTarget>=0?s.fill[prevTarget]:-1;
   const id=botStep(s,r,dt);
   if(id>=0&&decode(id).floor===s.floor)drawProduct(id,s.fill[id]-1);
  }
  tickCart(dt);
  for(const {platform,model} of cartMeshes){
   model.visible=platform.floor===s.floor;
   if(model.visible){
    model.position.set(platform.x??aisleX(platform.aisle),0,platform.z);
    const lift=model.getObjectByName('riderPlatform');
    if(lift)lift.position.y=platform.liftHeight;
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
   const free=claw.freeBeltId?s.freeBelts.find(b=>b.id===claw.freeBeltId):null;
   const ready=(free?free.items<BELT_CAPACITY:beltInput(s,claw))&&!!nearestClawSource(s,claw);
   entry.gripping.position.y=ready?Math.sin(now*.004+entry.id)*.25:0;
   entry.box.visible=ready;
  }
  syncRobots();
  syncCrab(now);
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
  updateFlyingCartons(now);
  for(const b of beltCrates){
   const free=b.freeId?s.freeBelts.find(p=>p.id===b.freeId):null;
   const actual=free?free.items:(s.beltItems[s.floor][b.aisle][b.segment]||0);
   const key=b.freeId?'free:'+b.freeId:'legacy:'+b.aisle+':'+b.segment;
   const arrivals=incomingCartonCounts.get(key)||0;
   b.crate.visible=b.slot<Math.max(0,actual-arrivals);
   // Animate only a REAL parcel with a connected, non-full destination.
   // Blocked and terminal belts are completely still.
   const direction=free?free.dir:(s.beltDirection[s.floor][b.aisle][b.segment]||0);
   const destA=b.aisle+(direction===1?1:direction===3?-1:0);
   const destSeg=b.segment+(direction===0?1:direction===2?-1:0);
   const dx=FREE_BELT_VECTORS[direction][0]*FREE_BELT_PITCH,dz=FREE_BELT_VECTORS[direction][1]*FREE_BELT_PITCH;
   const nextFree=free?freeBeltAt(s,s.floor,free.x+dx,free.z+dz):null;
   const hasNext=free?!!nextFree:destA>=0&&destA<AISLES&&destSeg>=0&&destSeg<(s.belts[s.floor][destA]||0);
   const space=free?!!nextFree&&nextFree.items<BELT_CAPACITY:hasNext&&s.beltItems[s.floor][destA][destSeg]<BELT_CAPACITY;
   const pct=space&&b.slot===actual-1&&actual>0?
      (s.beltFlowTimer/BELT_MOVE_SECONDS):0;
   b.crate.position.set(0,.87,.78-b.slot*.78-pct*.6);
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
 if(now-savingAt>260){uiUpdate();updateSecretCoinOffer();savingAt=now;}
 renderer.render(scene,camera);
}
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 held[e.code]=true;
 if(e.repeat)return;
 if(e.code==='Escape'){
  e.preventDefault();held={};mouseDown=false;actionClock=0;cancelRepairHold();
  if(cancelPlacement())return;
  if(modal==='coinflip'){notify('SECRET COIN OFFER · Choose YES or NO. You cannot postpone this decision.');}
  else if(modal==='shop'||modal==='elevator'||modal==='intro')resume();
  else if(!ending){show('intro');$('play').textContent='Resume shift';}
  return;
 }
 if(modal==='shop'&&e.code==='KeyE'){
  // E also closes Mike's menu, requesting mouse lock directly from this key.
  e.preventDefault();resume();return;
 }
 if(modal||ending)return;
 // Developer cursor toggle: release mouse look with Tab to click debug HUD
 // buttons, then click on the canvas to resume normal first-person look.
 if(DEV_MODE&&e.code==='Tab'){
  e.preventDefault();
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  else pointerRequest();
  return;
 }
 // Dev-only shortcuts work even with pointer lock: Shift+J / Shift+K / Shift+N.
 if(DEV_MODE&&e.shiftKey&&['KeyJ','KeyK','KeyN'].includes(e.code)){
  e.preventDefault();changeDevCrab(e.code==='KeyJ'?'on':e.code==='KeyK'?'off':'auto');return;
 }
 if(e.code==='KeyG'){e.preventDefault();if(!e.repeat)toggleCrabRide();return;}
 if(crabRiding)return; // Equipment and stocking keys disabled on crab.
 // Space keydown is edge-triggered; a second press activates Double Jump.
 if(e.code==='Space'){
  if(!s.pallet.driving&&!s.cart.mounted&&climbingLadderId===null&&tryPlayerJump(s,V)&&V.jumpCount===2)
   notify('DOUBLE JUMP · Airborne jump activated!');
  return;
 }
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
 if(e.code==='KeyE'&&!s.pallet.driving&&!s.cart.mounted){
  e.preventDefault();actionClock=0;
  if(nearestBrokenRobot())return; // Hold to repair; keydown is not an instant repair.
  act('keyboard');
 }
});
window.addEventListener('keyup',e=>{held[e.code]=false;if(e.code==='KeyE'){doorInteractionHeld=false;cancelRepairHold();}});
window.addEventListener('blur',()=>{held={};mouseDown=false;doorInteractionHeld=false;actionClock=0;cancelRepairHold();});
window.addEventListener('mousemove',e=>{
 if(!running||modal)return;
 if(placementRobotId!==null){
  // Mouse cursor selects a visible floor point; the preview snaps to the aisle.
  const screen=new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
  placeRay.setFromCamera(screen,camera);
  const point=placeRay.ray.intersectPlane(groundForPlacement,placeHit);
  placementSpot=null;
  if(point&&Math.hypot(fromWideX(point.x)-V.x,point.z-V.z)<20&&point.z>=11&&point.z<=91.5){
   const a=Math.max(0,Math.min(AISLES-1,Math.round((fromWideX(point.x)-8)/10)));
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
// A #dev URL is easy to forget; offer a visible, one-click way to enable
// testing funds without changing the user's purchased skills or shelf progress.
function showSaveOrigin(){
 const status=$('saveOriginStatus');
 const totalRanks=Object.values(s.levels).reduce((sum,n)=>sum+n,0);
 const locationLabel=location.protocol+'//'+location.host;
 status.textContent='THIS BROWSER SAVE · '+locationLabel+' · '+s.stocked.toLocaleString()+' products stocked · '+totalRanks+' total upgrade ranks · '+centsText(s.money)+' cash. '+(!ORIGINAL_SAVE_DATA?'No previous saved game found at THIS address. Check the original browser or port.':'Loaded '+ORIGINAL_SAVE_SOURCE+' on this browser address.')+(saveWarning?' WARNING: '+saveWarning:'');
 const btn=$('devEnable');
 btn.textContent=DEV_MODE?'Refill developer cash to $1,000,000':'Enable $1,000,000 Developer Mode';
 $('devStatus').textContent=DEV_MODE?'Developer Mode ON · Refill this account to at least $1,000,000 whenever needed.':'Developer Mode OFF · Enable without losing existing shelf or skill progress.';
}
// Only user-selected archived backups may replace an existing valid save.
// This panel cannot access another browser or host+port, so it explicitly
// explains those separate recovery locations instead of inventing progress.
function showRecoveryCandidates(){
 const list=$('saveRecoveryList');list.replaceChildren();
 const candidates=[
  {origin:'Current saved game',data:localStorage.getItem(SAVE_KEY),time:''},
  ...readRecoveryArchives().map((e,i)=>({origin:'Automatic backup '+(i+1)+' · '+e.reason,
    data:e.data,time:e.at})),
  {origin:'Older original V3 save',data:localStorage.getItem('mustacheMartV3'),time:''}
 ].filter(e=>validSave(e.data));
 if(!candidates.length){
  list.textContent='No valid saved game exists at this specific address. Check the other host/port links above or import a previously downloaded backup.';
  return;
 }
 const seen=new Set();
 for(const entry of candidates){
  if(seen.has(entry.data))continue;
  seen.add(entry.data);
  const info=progressSummary(entry.data),line=document.createElement('div');
  line.className='saveRecoveryEntry';
  const infoPanel=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('small');
  title.textContent=entry.origin;
  desc.textContent=info.stocked.toLocaleString()+' items stocked · '+info.upgrades+' upgrades · '+
    info.robots+' robots · '+centsText(info.money)+' saved cash'+(entry.time?' · '+new Date(entry.time).toLocaleString():'');
  infoPanel.append(title,desc);
  const btn=document.createElement('button');
  btn.type='button';btn.textContent='Restore this save';
  btn.addEventListener('click',()=>{
   const current=localStorage.getItem(SAVE_KEY);
   if(!confirm('Restore '+entry.origin+'? Your current progress will first be copied to the recovery archive. Do not continue if the chosen save is not the one you want.'))return;
   if(validSave(current))archiveSave(current,'BEFORE MANUAL RESTORE');
   const candidate=loadState(entry.data);
   // Preserve complete original 15-floor stocking state and purchased skills.
   s=candidate;if(DEV_MODE)s.money=Math.max(s.money,DEV_CASH_CENTS);
   lastConfirmedRaw=localStorage.getItem(SAVE_KEY); // User chose this recovery point.
   if(save())location.reload();
  });
  line.append(infoPanel,btn);list.append(line);
 }
}
$('scanSaveBackups').addEventListener('click',showRecoveryCandidates);
showRecoveryCandidates();

$('devEnable').addEventListener('click',()=>{
 if(!DEV_MODE){
  // Changing the fragment keeps the same browser origin/local save.
  location.hash='#dev';
  location.reload();
  return;
 }
 const previous=s.money;
 s.money=Math.max(s.money,DEV_CASH_CENTS);
 save();uiUpdate();showSaveOrigin();
 notify(s.money===previous?'Developer funds ready · '+centsText(s.money):'Developer account refilled to '+centsText(s.money));
});
$('play').addEventListener('click',resume);
$('saveNow').addEventListener('click',()=>{if(save()){showSaveOrigin();showRecoveryCandidates();notify('Current progress saved and verified.');}});
$('reset').addEventListener('click',e=>{e.stopPropagation();if(confirm('Reset the current game? This archives its previous save first. You can restore archived progress using Find saved backups.')){const old=localStorage.getItem(SAVE_KEY);if(validSave(old))archiveSave(old,'BEFORE USER RESET');s=newState();if(DEV_MODE)s.money=DEV_CASH_CENTS;lastConfirmedRaw=localStorage.getItem(SAVE_KEY);if(save())location.reload();}});
// Browser localStorage is isolated by host+port. Portable save files provide
// deliberate, lossless transfer without clearing either browser origin.
$('saveExport').addEventListener('click',()=>{
 try{
  if(!save())throw new Error('Save verification failed');
  const data=localStorage.getItem(SAVE_KEY);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');
  const stamp=new Date(lastSavedAt).toISOString().replace(/[:.]/g,'-');
  a.href=url;a.download='mustache-mart-'+s.stocked+'-stocked-'+stamp+'.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  $('saveTransferStatus').textContent='Backup downloaded. Keep this file somewhere safe.';
 }catch(err){$('saveTransferStatus').textContent='Export failed. Check whether browser downloads are allowed.';}
});
$('saveImportFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 const status=$('saveTransferStatus');
 try{
  if(file.size>5000000)throw new Error('File is too large for a Mustache Mart save.');
  const raw=await file.text();const data=JSON.parse(raw);
  if(![3,4].includes(data?.version)||!Array.isArray(data.fill)||data.fill.length<10000||!Number.isFinite(data.money))
   throw new Error('This file is not a compatible Mustache Mart save.');
  const restored=loadState(raw);
  if(!confirm('Import this save? It will replace progress on this browser address only. Your backup file and any save on another port will not be deleted.')){status.textContent='Import canceled; progress unchanged.';return;}
  // Keep a recoverable copy of the current working save before importing.
  const active=localStorage.getItem(SAVE_KEY);if(validSave(active))archiveSave(active,'BEFORE FILE IMPORT');
  // Update the live state before reloading, because beforeunload calls save().
  // Otherwise that handler could overwrite the imported backup with old data.
  s=restored;
  if(DEV_MODE)s.money=Math.max(s.money,DEV_CASH_CENTS);
  lastConfirmedRaw=localStorage.getItem(SAVE_KEY); // Explicitly confirmed import.
  if(!save())throw new Error('Imported game could not be verified in browser storage');
  status.textContent='Save imported and verified. Reloading your game…';
  location.reload();
 }catch(err){status.textContent='Import not completed: '+err.message;}
 finally{e.target.value='';}
});
$('shopClose').addEventListener('click',resume);
for(const category of ['tools','skills','economy'])$('tab-'+category).addEventListener('click',()=>{shopCategory=category;renderShop();});
$('elevatorClose').addEventListener('click',resume);
// Three non-destructive crab controls are exposed only in developer mode.
// Removing the crab pauses its timers; it never resets stocked items,
// already damaged stockers, or the genuine seven-floor completion milestone.
function updateDevCrabControls(){
 if(!DEV_MODE)return;
 const current=s.crab.devOverride||'auto';
 $('devCrabState').textContent=current==='on'?'CRAB FORCED ON':current==='off'?'CRAB FORCED OFF':'NORMAL 7-FLOOR RULE';
 for(const [mode,id] of [['on','devCrabAdd'],['off','devCrabRemove'],['auto','devCrabAuto']]){
  $(''+id).setAttribute('aria-pressed',String(current===mode));
 }
}
function changeDevCrab(mode){
 if(!DEV_MODE||!setDeveloperCrab(s,mode))return false;
 buildWorld();save();updateDevCrabControls();
 notify(mode==='on'?'DEV: GIANT CRAB SUMMONED':mode==='off'?'DEV: GIANT CRAB REMOVED · ATTACK CLOCKS PAUSED':'DEV: CRAB RETURNED TO NORMAL UNLOCK');
 return true;
}
// Trigger one authentic raid on the CURRENT floor, never all 15 floors.
function previewDevCrabSmack(){
 if(!DEV_MODE||ending)return null;
 if(crabTamed(s)){notify('King of the Crab permanently prevents attacks.');return null;}
 if(floorStocked(s,s.floor)===itemsPerFloor){notify('This floor is fully stocked. Raids affect unfinished floors only.');return null;}
 setDeveloperCrab(s,'on');updateDevCrabControls();
 let a=Math.max(0,Math.min(AISLES-1,Math.round((V.x-8)/10)));
 let b=Math.max(2,Math.min(BAYS-3,Math.round((V.z-13)/2.65)));
 // Aim at existing stocked shelves, never invent cargo for the demo.
 let best=Infinity;
 for(let aisle=0;aisle<AISLES;aisle++)for(let bay=2;bay<BAYS-2;bay++){
  let occupied=false;
  for(let side=0;side<2;side++)for(let tier=0;tier<TIERS;tier++)
   if(s.fill[cellId(s.floor,aisle,side,bay,tier)]>0)occupied=true;
  if(!occupied)continue;
  const d=Math.hypot((aisle-a)*10,(bay-b)*2.65);
  if(d<best){best=d;a=aisle;b=bay;}
 }
 const event=performCrabSwing(s,s.floor,a,b,true);
 if(!event){notify('The crab cannot strike this floor right now.');return null;}
 const patrol=s.crab.patrol[s.floor];
 patrol.x=aisleX(a);patrol.z=bayZ(b);patrol.aisle=a;
 patrol.targetAisle=a;patrol.targetZ=bayZ(b);patrol.roamTimer=4;
 crabRiding=false;V.x=aisleX(a);V.z=Math.max(12,bayZ(b)-8);
 V.y=0;V.vy=0;V.yaw=Math.PI;V.pitch=.06;
 crabSwingEnds=performance.now()+3200;
 buildWorld();save();uiUpdate();
 notify('DEV CRAB SMACK · Aisle '+(a+1)+' · '+event.fallen+' items knocked down · '+event.robots.length+' robots wrecked'+(event.fallen===0?' · Stock shelves first to see falling inventory.':''));
 return event;
}
if(DEV_MODE){
 $('devCrabPanel').hidden=false;
 $('devCrabAdd').addEventListener('click',()=>changeDevCrab('on'));
 $('devCrabRemove').addEventListener('click',()=>changeDevCrab('off'));
 $('devCrabAuto').addEventListener('click',()=>changeDevCrab('auto'));
 $('devCrabSmack').addEventListener('click',previewDevCrabSmack);
 updateDevCrabControls();
}

// Local-only QA controls are enabled solely with the explicit #rich developer URL.
if(DEV_MODE){
 window.__martTest={
  teleport(x,z){V.x=x;V.z=z;V.y=0;V.vy=0;},
  setLook(yaw,pitch){V.yaw=yaw;V.pitch=pitch;},
  mountCrab(){return toggleCrabRide();},
  steerCrab(forward,side,seconds=0.1){return moveTamedCrab(s,s.floor,forward,side,seconds,V.yaw);},
  crabRideStatus(){return {riding:crabRiding,owned:crabTamed(s),player:{x:V.x,z:V.z,y:V.y},patrol:{...s.crab.patrol[s.floor]}};},
  setFloor(floor){
   if(!Number.isInteger(floor)||floor<0||floor>=FLOORS)return false;
   crabRiding=false;s.floor=floor;buildWorld();V.x=31;V.z=-7;V.y=0;V.vy=0;return true;
  },
  crabDetailStats(){
   if(!crabModel)return null;
   const components={},names=['naturalCrabShell','naturalCrabUnderside','naturalCrabWalkingLeg','livingCrabClaw','crabKingRidingSaddle',
    'carapaceRidgeBump','livingEye','crabEyeStalk','pincerTooth','legDactylus','legPropodus','crabAngularCarapaceScute','crabCarapaceSegmentationSeam','crabLegElbowJointCollar','naturalCrabRoundedShellRidge','naturalCrabEdgeSpine','naturalCrabPincerSpike','naturalCrabMandibleTusk','naturalShellFreckle','naturalCrabDorsalSpine','naturalCrabShellScar'];
   crabModel.traverse(node=>{if(names.includes(node.name))components[node.name]=(components[node.name]||0)+1;});
   const shell=crabModel.getObjectByName('naturalCrabShell');
   const shellTriangles=shell?.geometry?.getAttribute('position')?.count/3||0;
   return {shellTriangles,components,...crabModel.userData.detailStats,walkingLegs:crabModel.userData.legs?.length||0,
    animatedClaws:crabModel.userData.jaws?.length||0,
    clawScales:(crabModel.userData.jaws||[]).map(j=>({x:j.scale.x,y:j.scale.y,z:j.scale.z,crusher:!!j.userData.crusherClaw}))};
  },
  worldLayoutStats(){return {scaleX:world.scale.x,originX:world.position.x,proportions:world.userData.proportionStats,
   width:113*world.scale.x,aisleSeparation:(toWideX(aisleX(1))-toWideX(aisleX(0))),
   totalStocked:s.stocked,savedAisleX:aisleX(9),
   crabWidthScale:crabModel?.scale.x??null,crabHeightScale:crabModel?.scale.y??null,crabDepthScale:crabModel?.scale.z??null,crabVisible:!!crabModel};},
  visualChecklist(){
   // Inspect the final rendered WORLD-space geometry after the store widener
   // adjusted all standalone props. Dimension-only tests missed giant gaps.
   const count=name=>{let n=0;world.traverse(o=>{if(o.name===name)n++;});return n;};
   const frame=world.getObjectByName('fireExitSidePortalGantry'),posts=[];
   frame?.traverse(node=>{if(node.name==='portalStructuralUpright')posts.push(node);});
   posts.sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).x-b.getWorldPosition(new THREE.Vector3()).x);
   const bound=node=>node?new THREE.Box3().setFromObject(node):null;
   const top=bound(frame?.getObjectByName('portalStructuralTopBeam'));
   const lower=bound(frame?.getObjectByName('supplyPortalLowerCrossbeam'));
   const sign=bound(frame?.getObjectByName('attachedSupplyPortalSign'));
   const led=bound(frame?.getObjectByName('supplyPortalLedBackingAttached'));
   const p0=bound(posts[0]),p1=bound(posts[1]);
   const joined=(a,b)=>!!a&&!!b&&a.intersectsBox(b);
   const portalConnections={
    topLeft:joined(top,p0),topRight:joined(top,p1),
    lowerLeft:joined(lower,p0),lowerRight:joined(lower,p1),
    signLower:joined(sign,lower),signTop:joined(sign,top),
    ledSign:joined(led,sign),dockX:DOCK.x,
    topSpan:top?Number((top.max.x-top.min.x).toFixed(3)):0,
    postSpan:p0&&p1?Number((p1.getCenter(new THREE.Vector3()).x-p0.getCenter(new THREE.Vector3()).x).toFixed(3)):0
   };
   const item=world.getObjectByName('shelfStockedProductsType0');
   let firstProduct=null;
   if(item?.count>0){
    const m=new THREE.Matrix4();item.getMatrixAt(0,m);
    const p=new THREE.Vector3().setFromMatrixPosition(m);
    firstProduct={x:p.x,y:p.y,z:p.z};
   }
   return {portalConnections,portalGantryX:world.getObjectByName('fireExitSidePortalGantry')?.position.x,
    portalLedBacking:count('supplyPortalLedBackingAttached'),emblemMount:count('attachedSupplyPortalEmblemMount'),
    portalBeam:count('supplyPortalLowerCrossbeam'),portalJoints:count('supplyPortalCrossbeamJoint'),
    inventoryPallets:count('collectibleWarehouseCratePallet'),decorPallets:count('decorativeWarehousePallet'),
    palletJack:count('fullWidthPalletJack'),wideForks:count('widePalletJackFork'),
    jackHousing:count('proportionalPalletJackRearHousing'),firstProduct};
  },
  architectureStats(){
   let windows=0,cutWallSections=0,screws=0,vents=0,pipeBrackets=0,freeWindowOverlays=0;
   world.traverse(object=>{
    if(object.name==='recessedBlueWindow'&&object.userData?.structuralOpening)windows++;
    if(object.name==='integratedDaylightWall')cutWallSections++;
    if(object.name==='pipeAndVentScrews')screws+=object.count;
    if(object.name==='boltedVentHousing')vents++;
    if(object.name==='sprinklerPipeBracket')pipeBrackets++;
    if(object.name==='lightBlueWindow')freeWindowOverlays++;
   });
   return {windows,cutWallSections,screws,vents,pipeBrackets,freeWindowOverlays};
  },
  portraitInfo(){
   const portraits=world.children.filter(child=>child.name==='employeeOfMonthPortrait');
   return portraits.map(p=>{
    const image=p.getObjectByName('uniqueWorkingPortrait');
    const canvas=image?.material?.map?.image;
    // Distinct content fingerprints are computed from the actual rendered art.
    const pixels=canvas?.getContext('2d').getImageData(40,140,1,1).data;
    return {floor:p.userData.floor,subject:p.userData.subject,job:p.userData.job,
     frame:p.children.length,imageWidth:canvas?.width,imageHeight:canvas?.height,
     contentSample:pixels?Array.from(pixels):null};
   });
  },
  crabTest:{
   completeFloors(n=7){for(let f=0;f<Math.min(FLOORS,n);f++)for(let i=f*CELLS_PER_FLOOR;i<(f+1)*CELLS_PER_FLOOR;i++)s.fill[i]=SLOTS;s.stocked=s.fill.reduce((sum,n)=>sum+n,0);crabEnabled(s);buildWorld();return s.crab.unlocked;},
   advance(seconds){const events=advanceCrab(s,seconds,DEV_MODE);if(events.some(e=>e.floor===s.floor))buildWorld();return events;},
   demoSmack(){return previewDevCrabSmack();},
   swing(f,a,b){const event=performCrabSwing(s,f,a,b,DEV_MODE);if(event?.floor===s.floor)buildWorld();return event;},
   spawn(){return changeDevCrab('on');},
   remove(){return changeDevCrab('off');},
   auto(){return changeDevCrab('auto');},
   status(){return {unlocked:s.crab.unlocked,devOverride:s.crab.devOverride,elapsed:s.crab.elapsed.slice(),attacks:s.crab.attacks.slice(),recent:s.crab.recent.slice(),wrecked:s.robots.filter(r=>r.wrecked).map(r=>r.id),piles:s.stockPiles.filter(p=>p.crabDebris).map(p=>({...p})),visible:!!crabModel,wreckModels:world.children.filter(x=>x.name==='crabDestroyedStocker').length};},
   stockTarget(f,a,b,count=2){let inserted=0;for(let bb=b-1;bb<=b+1;bb++)for(let side=0;side<2;side++)for(let tier=0;tier<TIERS;tier++){const id=cellId(f,a,side,bb,tier);const n=Math.max(0,Math.min(SLOTS,count));inserted+=n-s.fill[id];s.fill[id]=n;}s.stocked+=inserted;buildWorld();return inserted;},
   spawnBot(f,a,bay,paid=400){const bot={id:s.robotNextId++,floor:f,aisle:a,homeAisle:a,x:aisleX(a),z:bayZ(bay),placed:true,paid,phase:'supply',target:-1,carry:0,acc:0,liftY:0,source:null,broken:false,wrecked:false,stockedSinceService:0,breakdowns:0,breakAt:0,repairProgress:0};s.robots.push(bot);s.levels.robot=s.robots.length;buildWorld();return bot.id;},
   robot(id){const r=s.robots.find(r=>r.id===id);return r?{...r}:null;},
   scrap(id){const money=sellRobot(s,id);buildWorld();return money;}
  },
  setCarry(count){V.carry=Math.min(capacity(s),Math.max(0,count));},
  setUpgrade(id,level){if(id in s.levels){s.levels[id]=level;if(['robotLift','crabKing'].includes(id))buildWorld();}},
  giveClaw(){s.clawInventory.push({paid:450});return s.clawInventory.length;},
  logistics(){return {claws:s.claws.length,clawInventory:s.clawInventory.length,palletLoad:s.pallet.load,palletCapacity:palletCapacity(s),palletDriving:s.pallet.driving,cartMounted:s.cart.mounted,cartHeight:s.cart.liftHeight,platforms:s.platforms.map(p=>({id:p.id,floor:p.floor,aisle:p.aisle,x:p.x??aisleX(p.aisle),z:p.z,liftHeight:p.liftHeight,mounted:p.mounted})),stockPiles:s.stockPiles.map(x=>({...x})),beltDirections:s.beltDirection[s.floor].map(x=>x.slice())};},

  setCompletion(value){s.fill.fill(value?SLOTS:0);s.stocked=value?TOTAL_ITEMS:0;},
  doorStatus(){return {fire:doors.isFireOpen(),entrance:doors.isEntranceOpen()};},
  checkBlocked(x,z){return isBlocked(x,z,s.floor)||blockedEquipment(s,x,z);},
  advanceConveyors(seconds){advanceBelts(s,Math.max(0,Math.min(120,Number(seconds)||0)));return s.beltStock[s.floor].slice();},
   placeFreeBelt(x,z,dir=0){const b=placeFreeBelt(s,s.floor,x,z,dir,(px,pz)=>!isBlocked(px,pz,s.floor,.72)&&!blockedEquipment(s,px,pz,.72));if(b)buildWorld();return b?.id||null;},
   freeBelts(){return s.freeBelts.map(b=>({...b}));},
   conveyorVisuals(){return {moving:flyingCartons.length,renderedCrates:beltCrates.length,keys:[...incomingCartonCounts.keys()]};},
   robots(){return s.robots.map(r=>({id:r.id,floor:r.floor,aisle:r.aisle,homeAisle:r.homeAisle,placed:r.placed,carry:r.carry,wrecked:r.wrecked}));},
   coinOffers(){return JSON.parse(JSON.stringify(s.coinOffers));},
   coinTest:{
    setCash(cents){s.money=Math.max(0,Math.floor(cents));updateSecretCoinOffer();uiUpdate();return s.money;},
    finishThirdFloor(){for(let id=2*CELLS_PER_FLOOR;id<3*CELLS_PER_FLOOR;id++){s.stocked+=SLOTS-s.fill[id];s.fill[id]=SLOTS;}updateSecretCoinOffer();return s.coinOffers.floor3.unlocked;},
    refresh(){updateSecretCoinOffer();return JSON.parse(JSON.stringify(s.coinOffers));},
    accept(event,unit){const result=acceptCoinFlip(s,event,unit);if(result){save();uiUpdate();}return result;},
    decline(event){const ok=declineCoinFlip(s,event);if(ok)save();return ok;}
   },
   deployFreeClaw(id){s.clawInventory.push({paid:450});const c=deployFreeClaw(s,id);if(c)buildWorld();return c?.id||null;},
   turnFreeBelt(id){const angle=turnFreeBelt(s,id);if(angle>=0)buildWorld();return angle;},
   move(dx,dz){const next=moveWithCollisions(V.x,V.z,dx,dz,s.floor,(x,z)=>blockedEquipment(s,x,z));V.x=next.x;V.z=next.z;return next;},
   snapshot(){return {jumpCount:V.jumpCount,mapWidthMultiplier:MAP_WIDTH_MULTIPLIER,visualX:toWideX(V.x),beltItems:s.beltItems[s.floor].map(row=>row.slice()),selectedBeltAisle,feedCrates:feederCrates.length,devMode:DEV_MODE,checkoutCount:s.floor===0?4:0,x:V.x,y:V.y,z:V.z,climbing:climbingLadderId,placementRobotId,beltStock:s.beltStock[s.floor].slice(),ladders:s.ladders.filter(l=>l.floor===s.floor).length,floor:s.floor,money:s.money,pending:s.pending,stocked:s.stocked,carry:V.carry,belts:s.belts[s.floor].slice(),robotCount:s.robots.length,platformCount:s.platforms.length,activePlatformId:s.cart.id,cartMounted:s.cart.mounted,levels:{...s.levels}};}
 };
}
buildWorld();$('loading').hidden=true;$('hud').hidden=false;uiUpdate();showSaveOrigin();
if(PREVIEW_ENDING)beginEnding();
requestAnimationFrame(animate);
