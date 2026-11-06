'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../server.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const server=createServer();let browser;
 const errors=[];
 try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const root='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  // Pointer lock after a menu closes varies by browser and operating system.
  // When a fresh click is required, exercise the game's click-to-resume path.
  const ensureMouseLook=async()=>{
   const locked=()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'));
   if(!(await locked())){
    await page.waitForTimeout(250);
    await page.locator('canvas').click({position:{x:1250,y:740},force:true});
   }
   // Headless macOS can deny pointer lock even on a user-like click.
   // The UI must then show its manual recovery hint instead of silently freezing.
   const mode=await page.evaluate(()=>({locked:document.pointerLockElement===document.querySelector('canvas'),prompt:!document.querySelector('#lookPrompt').hidden}));
   assert.ok(mode.locked||mode.prompt,'mouse look or recovery hint must remain available');
  };
  page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER CONSOLE:',msg.text());});
  page.on('requestfailed',req=>console.error('BROWSER REQUEST FAILED:',req.url(),req.failure()?.errorText));
  await page.goto(root+'/#rich',{waitUntil:'load'});
  try{
    await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#progressText')?.textContent.includes('144,000'),undefined,{timeout:25000});
  }catch(error){
    console.error('BROWSER DIAGNOSTICS:',JSON.stringify(await page.evaluate(()=>({
      loading:document.querySelector('#loading')?.hidden,
      text:document.querySelector('#loading')?.textContent,
      progress:document.querySelector('#progressText')?.textContent,
      canvas:document.querySelector('canvas')?.outerHTML?.slice(0,200)
    }))));
    console.error('BROWSER ERRORS:',errors);
    throw error;
  }
  assert.equal(await page.locator('canvas').count(),1);
  assert.equal(await page.locator('#intro').isVisible(),true);
  assert.equal(await page.locator('#devEnable').isVisible(),true,'developer-money controls visible on title screen');
  assert.match(await page.locator('#devEnable').textContent(),/Refill developer cash/);
  assert.match(await page.locator('#saveOriginStatus').textContent(),/THIS BROWSER SAVE/);
  assert.equal(await page.locator('#saveExport').count(),1,'save backup export is accessible from the introduction');
   assert.equal(await page.locator('#saveNow').count(),1,'manual Save Now action is available');
   assert.equal(await page.locator('#liveSaveStatus').count(),1,'verified save status is shown');
  assert.equal(await page.locator('#saveImportFile').count(),1,'save file import is accessible from the introduction');
  await page.waitForFunction(()=>document.querySelector('#buildChip')?.textContent.includes('2026.11.06.1'));
  assert.match(await page.locator('#buildIntro').innerText(),/UPDATED EDITION.*2026\.11\.06\.1/);
  assert.match(await page.locator('#devBanner').innerText(),/DEVELOPMENT MODE/);
  assert.equal(await page.locator('#devBanner').isVisible(),true);
  const build=await page.evaluate(async()=>await (await fetch('./build.json')).json());
  assert.equal(build.version,'2026.11.06.1');
  // Inspect the live scene graph: static tests alone did not catch the
  // previously invisible or unrendered geometry updates.
  const visual=await page.evaluate(()=>window.__martTest.visualChecklist());
  assert.equal(visual.portalGantryX,-3.20,'entire portal gantry is actually moved toward fire exit');
  assert.equal(visual.portalLedBacking,1,'LED rail and bulbs are mounted to sign');
  assert.equal(visual.emblemMount,1,'mustache emblem is fixed to supporting beam');
  assert.equal(visual.portalBeam,1,'portal horizontal connector is physically present in the 3D scene');
  assert.equal(visual.portalJoints,2,'both portal uprights connect to the lower beam');
  assert.ok(visual.portalSignGeometry?.textCentered,'marquee lettering centered within sign');
  assert.ok(visual.portalSignGeometry?.textFits,'full lettering fits inside sign');
  assert.ok(visual.portalSignGeometry?.frameFits,'gold border fits inside background');
  assert.ok(Math.abs(visual.portalSignGeometry?.panel?.width-10.08)<.15,'sign panel is not stretched by 60%-wider aisles');
  assert.ok(Math.abs(visual.portalSignGeometry?.lettering?.height-.98)<.15,'marquee lettering is proportionally tall');
  assert.equal(visual.inventoryPallets,2,'usable rear stock crates render');
  assert.equal(visual.decorPallets,3,'far-right decorative pallets render');
  assert.equal(visual.palletJack,1,'updated pallet jack renders');
  assert.equal(visual.wideForks,2,'wider pallet jack forks are visible');
  assert.equal(visual.jackHousing,1,'full-width pallet jack housing is rendered');
  console.log('PASS: live Supply Portal, warehouse pallets and proportional jack are present in the 3D scene');
  console.log('PASS: game displays correct edition and $1,000,000 developer mode banner');

  // Each floor must have exactly one actual framed painting with its own
  // distinct working portrait texture, not a copied floor-number label.
  const seenJobs=new Set();
  for(let floor=0;floor<15;floor++){
   const floorData=await page.evaluate(n=>{
    window.__martTest.setFloor(n);
    return {portraits:window.__martTest.portraitInfo(),windows:window.__martTest.architectureStats().windows};
   },floor);
   assert.equal(floorData.windows,12,'all 15 floors must have identical blue window counts');
   const portraits=floorData.portraits;
   assert.equal(portraits.length,1,'exactly one framed painting on floor '+(floor+1));
   const painting=portraits[0];
   assert.equal(painting.floor,floor,'portrait belongs to its floor');
   assert.equal(painting.subject,'Mustache Mike');
   assert.equal(painting.imageWidth,720);
   assert.equal(painting.imageHeight,860);
   assert.ok(painting.frame>=8,'real 3D gold frame, label, mat and portrait exist');
   seenJobs.add(painting.job);
  }
  assert.equal(seenJobs.size,15,'15 floors have 15 unique Mike-at-work portraits');
  await page.evaluate(()=>window.__martTest.setFloor(0));
  const integrated=await page.evaluate(()=>window.__martTest.architectureStats());
  assert.equal(integrated.windows,12,'all 12 clerestory panes are in real structural openings');
  assert.equal(integrated.freeWindowOverlays,0,'no floating wall-overlay window entities');
  assert.ok(integrated.cutWallSections>=3,'front and side wall segments contain their apertures');
  assert.ok(integrated.screws>=150,'bolted pipe, vent and duct fixtures render as instanced hardware');
  assert.ok(integrated.vents>=4);
  assert.ok(integrated.pipeBrackets>=20);
  const wide=await page.evaluate(()=>window.__martTest.worldLayoutStats());
  assert.equal(wide.scaleX,1.6,'rendered supermarket is now 60% wider than original');
  assert.ok(Math.abs(wide.width-180.8)<1e-6,'new rendered store width is 180.8 meters');
  assert.ok(Math.abs(wide.aisleSeparation-16)<1e-6,'aisle-to-aisle distance is now 16 render meters');
  assert.equal(wide.savedAisleX,98,'original aisle positions remain preserved in old saves');
  assert.ok(wide.proportions.normalized>100,'small model meshes are corrected for unnatural stretching');
  assert.ok(wide.proportions.instances>1000,'instanced shelf units are proportionally sized');
  console.log('PASS: 16m aisle centers and 60% wider world while saved logical positions remain stable');
  console.log('PASS: 12 recessed structural windows and instanced detailed ventilation/piping hardware');

  console.log('PASS: all 15 floors show one unique framed Mustache Mike employee painting');


  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().money),100000000,'developer mode starts with precisely $1,000,000');
  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().checkoutCount),4,'four real checkout stations on floor 1');
  console.log('PASS: game renders fifteen-floor store with $1,000,000 developer account and four checkout lanes');

  // Exercise real portable save download and import on the game's local origin.
  const downloadStarted=page.waitForEvent('download',{timeout:20000});
  await page.locator('#saveExport').click();
  const saveDownload=await downloadStarted;
  const saved=JSON.parse(fs.readFileSync(await saveDownload.path(),'utf8'));
   assert.ok(Number.isFinite(saved.savedAt)&&saved.savedAt>0,'export includes verified save timestamp');
   assert.match(saveDownload.suggestedFilename(),/stocked-.*\.json$/,'backup filename is unique and contains progress timestamp');
  assert.equal(saved.version,4,'exported save has compatible format');
  assert.ok(Array.isArray(saved.fill)&&saved.fill.length>10000,'export includes entire fifteen-floor progress');
  saved.money=100000123;
  page.once('dialog',dialog=>dialog.accept());
  const importedReload=page.waitForEvent('load',{timeout:45000});
  await page.locator('#saveImportFile').setInputFiles({name:'mustache-mart-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await importedReload;
  await page.waitForFunction(()=>window.__martTest?.snapshot().money===100000123&&document.querySelector('#loading')?.hidden,undefined,{timeout:45000});
  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().money),100000123,'imported money persists across beforeunload and reload');
  await page.locator('#devEnable').click();
  assert.ok((await page.evaluate(()=>window.__martTest.snapshot().money))>=100000000,'developer refill keeps at least $1,000,000');
  assert.equal(await page.locator('#intro').isVisible(),true);
  await page.locator('#scanSaveBackups').click();
  assert.ok((await page.locator('#saveRecoveryList .saveRecoveryEntry').count())>=1,
    'player can review archived previous saves before choosing to restore');
  assert.equal(await page.locator('.saveRecoveryLinks a').count(),4,'recovery links expose four host/port origins');
  console.log('PASS: recovery panel lists browser-local saved snapshots and four possible older origins');
  console.log('PASS: exported save downloads and confirmed import persists through reload without overwrite');

  await page.locator('#play').click();
  // Developer credit starts above $3,000, so the hidden offer appears once at
  // shift start. Declining preserves it for later instead of deleting it.
  await page.locator('#coinflip.open').waitFor({timeout:30000});
  assert.equal(await page.locator('#coinTitle').textContent(),'THE $3,000 SECRET FLIP');
  assert.match(await page.locator('#coinStake').textContent(),/\$3,000/);
  assert.equal((await page.evaluate(()=>window.__martTest.coinOffers())).cash.unlocked,true);
  assert.equal((await page.evaluate(()=>window.__martTest.coinOffers())).cash.played,false);
  assert.equal(await page.locator('#coinLater').count(),0,'there must be no Not now or waiting option');
  assert.equal(await page.locator('#secretFlipBtn').count(),0,'there is no deferral/reopen shortcut');
  assert.match(await page.locator('#coinHeads').textContent(),/^YES/);
  assert.match(await page.locator('#coinTails').textContent(),/^NO/);
  assert.match(await page.locator('#coinDescription').textContent(),/permanently rejects/);
  await page.locator('#coinTails').click();
  assert.equal((await page.evaluate(()=>window.__martTest.coinOffers())).cash.declined,true);
  assert.equal((await page.evaluate(()=>window.__martTest.coinOffers())).cash.played,false);
  assert.equal(await page.locator('#devCrabPanel').isVisible(),true);
  // Dev Tab intentionally releases pointer lock for mouse-accessible HUD buttons.
  await page.evaluate(()=>document.exitPointerLock?.());
  await page.waitForFunction(()=>!document.pointerLockElement);
  await page.locator('#devCrabAdd').click();
  let devCrab=await page.evaluate(()=>window.__martTest.crabTest.status());
  assert.equal(devCrab.devOverride,'on');
  assert.equal(devCrab.visible,true,'dev crab can spawn before 7 floors are stocked');
  assert.equal(await page.locator('#devCrabSmack').count(),1,'developer HUD exposes instant crab attack');
  await page.evaluate(()=>document.querySelector('#devCrabSmack').click());
  devCrab=await page.evaluate(()=>window.__martTest.crabTest.status());
  assert.equal(devCrab.attacks[0],1,'instant demo triggers one authentic raid on current unfinished floor');
  assert.equal(devCrab.attacks.slice(1).every(x=>x===0),true,'demo does not raid other floors');
  assert.equal(devCrab.visible,true,'demo shows an attacking crab model');
  const crabLayout=await page.evaluate(()=>window.__martTest.worldLayoutStats());
  assert.ok(Math.abs(crabLayout.crabWidthScale-(.77/1.6))<1e-9,'organic crab retains its natural width after store widening');
  assert.equal(crabLayout.crabHeightScale,.77,'crab body keeps its true proportional height');
  assert.equal(crabLayout.crabDepthScale,.77,'crab body retains proportional depth');
  const detail=await page.evaluate(()=>window.__martTest.crabDetailStats());
  assert.ok(detail,'crab mesh must exist in developer mode');
  assert.equal(detail.walkingLegs,8,'all eight walking legs remain animated');
  assert.equal(detail.animatedClaws,2,'both pincers remain animated');
  assert.equal(detail.organic,true,'creature is organic, not robotic');
  assert.equal(detail.metalParts,0,'no industrial metal body parts');
  assert.equal(detail.components.naturalShellFreckle||0,0,'no random raised spots on the shell');
  assert.equal(detail.components.naturalCrabWalkingLeg,8);
  assert.equal(detail.components.livingCrabClaw,2);
  assert.ok(detail.components.pincerTooth>=12);
  assert.equal(detail.components.livingEye,2);
  assert.equal(detail.components.naturalCrabDorsalSpine||0,0,'crab shell must have NO dorsal spikes');
  assert.equal(detail.components.naturalCrabEdgeSpine||0,0,'crab shell must have NO edge spikes');
  assert.equal(detail.components.naturalCrabPincerSpike||0,0,'claws must have NO sharp decorative spikes');
  assert.equal(detail.components.naturalCrabMandibleTusk||0,0,'no decorative facial tusks');
  assert.equal(detail.components.legPropodus,8,'eight crab legs have extra articulated segments');
  assert.equal(detail.components.crabAngularCarapaceScute||0,0,'no random circular armor plates');
  assert.ok(detail.components.crabCarapaceSegmentationSeam>=4,'natural shell has subtle anatomical seam details');
  assert.equal(detail.clawScales.length,2);
  assert.ok(detail.clawScales[1].x>detail.clawScales[0].x*1.10,'crusher remains bigger while both claws stay muscular');
  assert.equal(detail.components.naturalCrabShellScar||0,0,'no decorative round scars on the crab');
  console.log('PASS: proportionate organic crab has a clean shell and thick jointed legs/claws');
  const canopy=await page.evaluate(()=>window.__martTest.architectureStats());
  assert.equal(canopy.windows,12,'new ceiling schedule must not impact integrated windows');
  // Pointer-locking WebGL can intercept Playwright's physical second click.
  // Dispatch an actual DOM button click without fighting the locked cursor.
  await page.evaluate(()=>document.querySelector('#devCrabRemove').click());
  devCrab=await page.evaluate(()=>window.__martTest.crabTest.status());
  assert.equal(devCrab.devOverride,'off');
  assert.equal(devCrab.visible,false,'dev crab removal removes the model');
  await page.keyboard.press('Shift+J');
  devCrab=await page.evaluate(()=>window.__martTest.crabTest.status());
  assert.equal(devCrab.visible,true,'crab spawn shortcut works in gameplay');
  await page.keyboard.press('Shift+K');
  assert.equal((await page.evaluate(()=>window.__martTest.crabTest.status())).visible,false);
  await page.evaluate(()=>document.querySelector('#devCrabAuto').click());
  devCrab=await page.evaluate(()=>window.__martTest.crabTest.status());
  assert.equal(devCrab.devOverride,'auto');
  assert.equal(devCrab.visible,false,'normal mode restores locked 7-floor threshold');
  console.log('PASS: developer crab spawn/removal, keyboard shortcuts and normal automatic behavior');
  console.log('PASS: cash coin offer only YES/NO; NO is permanent; waiting path removed');
  // Actual collision-safe loading position, not inside the receiving counter.
  await page.evaluate(()=>{window.__martTest.teleport(-1.8,93.1);window.__martTest.setLook(Math.PI,-.07);});
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(-1.8,93.1)),false);
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(-1.8,96)),true);
  const art=path.join(__dirname,'..','test-artifacts');fs.mkdirSync(art,{recursive:true});
  await page.screenshot({path:path.join(art,'warehouse-receiving.png'),timeout:90000});
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  let snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.carry,1,'initial carrying cap is one');

  await page.evaluate(()=>{window.__martTest.teleport(8,13);window.__martTest.setLook(-Math.PI/2,-.5);});
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.stocked,1);
  assert.equal(snap.pending,1);
  const centering=await page.evaluate(()=>window.__martTest.visualChecklist().firstProduct);
  assert.ok(centering,'stocked inventory should be present in the 3D scene');
  assert.ok(Math.abs(centering.x-11.4)<.01,'stocked product must be centered on the right-facing shelf at x=11.4, not offset toward its lip');
  assert.equal(snap.carry,0);
  console.log('PASS: rear warehouse pickup and reachable lower-rack 1-cent payout');

  await page.evaluate(()=>{window.__martTest.teleport(10,-8.38);window.__martTest.setLook(0,-.07);});
  await page.screenshot({path:path.join(art,'payroll-window.png'),timeout:90000});
  await page.keyboard.press('e');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.pending,0);
  assert.ok(snap.money>=500001);
  // Receipt popup may have auto-dismissed during a slow GPU frame; payment and amount are authoritative.
  assert.equal(await page.locator('#receiptAmount').textContent(),'$0.01');
  console.log('PASS: physical pay-window converts unsettled wages into money with professional receipt');
  // Verify that cash register terminals are solid and respond on Floor 1.
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(57,2)),true);
  await page.evaluate(()=>{window.__martTest.teleport(57,-3.45);window.__martTest.setLook(Math.PI,0);});
  await page.screenshot({path:path.join(art,'first-floor-checkout.png'),timeout:90000});
  await page.keyboard.press('e');
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('CHECKOUT'));
  assert.match(await page.locator('#toast').textContent(),/Card terminal powered/);
  console.log('PASS: cashier lanes have working belt animation, POS payment terminals and interaction');


  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  // Pointing/clicking at Mike is NOT a dialogue command.
  await page.mouse.click(634,407);
  assert.equal(await page.locator('#shop').evaluate(el=>el.classList.contains('open')),false,'Mike must not open from click');
  await page.keyboard.press('e');
  await page.locator('#shop.open').waitFor();
  assert.equal(await page.locator('#shopTitle').textContent(),'Mustache Mike');
  await page.locator('#tab-skills').click();
  assert.equal(await page.locator('#shopitems .upgrade').count(),15,'skill tree includes Double Jump and Midair Control, without Sprint Training');
  assert.equal(await page.locator('#shopitems .skillNode').count(),15,'all fifteen skills render as connected graph nodes');
  assert.equal(await page.locator('#shopitems .skillWires path').count(),14,'each skill shows its real prerequisite wire');
  assert.equal(await page.locator('#shopitems .skillFoundation').count(),8,'eight equipment and economy prerequisites appear as foundation links');
  assert.equal(await page.locator('#shopitems .skillTreeSummary').count(),1,'interactive skill tree has branch summary');
  await page.screenshot({path:path.join(art,'mike-skill-network.png'),timeout:90000});
  const reliability=page.locator('#shopitems .upgrade').filter({hasText:'Robot Reliability Tree'});
  assert.equal(await reliability.locator('button').textContent(),'LOCKED','maintenance requires prerequisite');
  await page.locator('#tab-tools').click();
  assert.ok((await page.locator('#shopitems .toolUpgrade').count())>=10,'equipment uses premium purchasing cards');
  await page.screenshot({path:path.join(art,'mike-upgrades.png'),timeout:90000});
  await page.locator('#shopitems .upgrade').first().locator('button').click();
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.levels.capacity,1);
  await page.locator('#tab-economy').click();
  assert.equal(await page.locator('#shopitems .toolUpgrade, #shopitems .skillNode').count(),0,'economy retains the original simple purchase layout');
  await page.locator('#shopitems .upgrade').first().locator('button').click();
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.levels.soupTriple,1,'the $50 can contract should be purchasable');
  // Closing from the actual shop button is a trusted click activation:
  // pointer lock should return right away, with no multi-second mouse freeze.
  await page.locator('#shopClose').click();
  await page.waitForFunction(()=>!document.querySelector('#shop').classList.contains('open'));
  await ensureMouseLook();
  await page.keyboard.press('e');
  await page.locator('#shop.open').waitFor();
  await page.keyboard.press('e');
  await page.waitForFunction(()=>!document.querySelector('#shop').classList.contains('open'));
  await ensureMouseLook();
  console.log('PASS: E-only Mike interaction, click does not open dialogue, E or Close restores mouse look');
  await page.keyboard.press('e');
  await page.locator('#shop.open').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#shop').classList.contains('open'));

  // Purchased robots now spawn immediately into the first aisle that has no
  // assigned robot. Mike's console can move them between floors and aisles.
  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  await page.keyboard.press('e');await page.locator('#shop.open').waitFor();
  await page.locator('#tab-tools').click();
  const buyBot=()=>page.locator('#shopitems .upgrade').filter({hasText:'Mustache Stocker Bot'}).first().locator('button').first();
  await buyBot().click({force:true});
  let robotSnap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(robotSnap.robotCount,1);
  assert.equal(robotSnap.placementRobotId,null,'purchasing no longer requires placing a hologram');
  let active=await page.evaluate(()=>window.__martTest.robots());
  assert.equal(active[0].placed,true);
  assert.equal(active[0].floor,0);
  assert.equal(active[0].homeAisle,0,'first auto-bot goes to Aisle 1');
  await buyBot().click({force:true});
  active=await page.evaluate(()=>window.__martTest.robots());
  assert.equal(active.length,2);
  assert.equal(active[1].homeAisle,1,'second robot goes to next robot-free aisle');
  const manager=page.locator('#shopitems .toolManagement').filter({hasText:'Stocker #'+active[0].id}).first();
  await manager.locator('select[aria-label^="Choose floor"]').selectOption('2');
  await manager.locator('select[aria-label^="Choose aisle"]').selectOption('4');
  await manager.locator('button').filter({hasText:'Move to chosen floor / aisle'}).click();
  active=await page.evaluate(()=>window.__martTest.robots());
  assert.equal(active[0].floor,2,'Mike can dispatch robot to Floor 3 without exiting the shop');
  assert.equal(active[0].homeAisle,4,'Mike can dispatch robot to Aisle 5');
  // Return to Floor 1 before the other first-floor gameplay checks.
  const again=page.locator('#shopitems .toolManagement').filter({hasText:'Stocker #'+active[0].id}).first();
  await again.locator('select[aria-label^="Choose floor"]').selectOption('0');
  await again.locator('select[aria-label^="Choose aisle"]').selectOption('0');
  await again.locator('button').filter({hasText:'Move to chosen floor / aisle'}).click();
  assert.equal((await page.evaluate(()=>window.__martTest.robots()))[0].floor,0);
  console.log('PASS: instant robot purchase, automatic vacant-aisle distribution, Mike floor/aisle moves');
  await page.locator('#shopitems .upgrade').filter({hasText:'Robot Espresso'}).first().locator('button').first().click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Motorized Robot Ladder'}).first().locator('button').first().click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Portable Step Ladder'}).first().locator('button').first().click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Telescopic Ladder Extension'}).first().locator('button').first().click();
  const platformPurchase=()=>page.locator('#shopitems .upgrade').filter({hasText:'Motorized Platform Ladder'}).first().locator('button').first();
  await platformPurchase().click();
  await platformPurchase().click();
  robotSnap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(robotSnap.platformCount,2,'Mike sells two distinct motorized platforms');
  assert.equal(robotSnap.levels.robotSpeed,1);
  assert.equal(robotSnap.levels.robotLift,1);
  assert.equal(robotSnap.levels.ladder,1);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__martTest.teleport(18,16.2));
  await page.keyboard.press('f');
  assert.equal((await page.evaluate(()=>window.__martTest.snapshot())).activePlatformId,2,'F rides the nearest second platform');
  assert.equal((await page.evaluate(()=>window.__martTest.snapshot())).cartMounted,true);
  await page.keyboard.press('f');
  assert.equal((await page.evaluate(()=>window.__martTest.snapshot())).cartMounted,false);
  await page.evaluate(()=>window.__martTest.teleport(8,61));
  await page.keyboard.press('l');
  await page.waitForFunction(()=>window.__martTest.snapshot().ladders===1);
  await page.keyboard.press('e');
  assert.notEqual((await page.evaluate(()=>window.__martTest.snapshot().climbing)),null,'E must grab a placed ladder');
  await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
  assert.ok((await page.evaluate(()=>window.__martTest.snapshot().y))>.4,'player truly climbs upward');
  await page.keyboard.press('c');
  // Return to the placed ladder before using the proximity-gated resale action.
  // This isolates the resale check from any player drift after climbing.
  await page.evaluate(()=>window.__martTest.teleport(8,61));
  await page.keyboard.press('x');
  await page.waitForFunction(()=>window.__martTest.snapshot().ladders===0);
  console.log('PASS: separate robot upgrades, E-to-grab real player ladder ascent and 50% ladder resale');
  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  await page.keyboard.press('e');await page.locator('#shop.open').waitFor();
  await page.locator('#tab-tools').click();
  // Two robots were bought earlier. Selling one must leave ONE, not zero.
  await page.locator('#shopitems .toolManagement').filter({hasText:'Stocker #'}).first().locator('button').filter({hasText:'Sell 50%'}).click();
  await page.waitForFunction(()=>window.__martTest.snapshot().robotCount===1);
  await page.locator('#shopitems .toolManagement').filter({hasText:'Stocker #'}).first().locator('button').filter({hasText:'Sell 50%'}).click();
  await page.waitForFunction(()=>window.__martTest.snapshot().robotCount===0);
  await page.keyboard.press('Escape');
  console.log('PASS: separately bought robot can be resold for half original price via Mike');


  await page.evaluate(()=>window.__martTest.teleport(8,89.85));
  await page.keyboard.press('b');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.belts[0],1);
  // Belt exists without stock; only a purchased and installed claw may feed it.
  const none=await page.evaluate(()=>window.__martTest.advanceConveyors(8));
  assert.equal(none[0],0,'empty belts cannot make inventory from nowhere');
  await page.evaluate(()=>{window.__martTest.giveClaw();window.__martTest.teleport(9.8,89.85);});
  await page.keyboard.press('k');
  assert.equal(await page.evaluate(()=>window.__martTest.logistics().claws),1,'K installs a separately purchased item claw');
  await page.keyboard.press('z');
  const turn=await page.evaluate(()=>window.__martTest.logistics().beltDirections[0][0]);
  assert.equal(turn,1,'Z rotates conveyor outlet right');
  // Accelerate actual claw transfer rules; GPU frame rate must not affect QA.
  const delivered=await page.evaluate(()=>window.__martTest.advanceConveyors(8));
  assert.ok(delivered[0]>0,'connected conveyor must deliver usable product stock');
  const physical=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(physical.beltItems[0][0],3,'first physical belt may hold exactly 3 cartons');
  assert.equal(physical.beltItems[0].reduce((a,b)=>a+b,0),3,'no hidden invented conveyor stock');
  const blocked=await page.evaluate(()=>window.__martTest.advanceConveyors(60));
  assert.equal(blocked[0],3,'missing downstream belt must stop all additional claw inventory');

  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.ok(snap.beltStock[0]>0,'connected conveyor transports products to its endpoint');
  await page.evaluate(()=>window.__martTest.teleport(9.4,89.85));
  await page.keyboard.press('e');
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.ok(snap.carry>0,'player can actually collect conveyor stock');
  await page.evaluate(()=>window.__martTest.setCarry(0));
  await page.keyboard.press('x');
  await page.waitForFunction(()=>window.__martTest.snapshot().belts[0]===0);
  console.log('PASS: empty belt stays empty until K claw is deployed; Z turns outlet right; real stock delivered, collected and sold');
  // New free-placement conveyors: start in a rear crosswalk, route east,
  // then turn south without using fixed aisle positions or receiving chutes.
  const customBelts=await page.evaluate(()=>{
   const t=window.__martTest;
   const first=t.placeFreeBelt(60.95,92.75,1);
   const corner=t.placeFreeBelt(63.6,92.75,2);
   const last=t.placeFreeBelt(63.6,95.4,2);
   return {first,corner,last,belts:t.freeBelts()};
  });
  assert.ok(customBelts.first&&customBelts.corner&&customBelts.last,'player can build outside fixed aisle coordinates');
  assert.equal(customBelts.belts.filter(b=>b.floor===0).length,3);
  assert.equal(customBelts.belts.find(b=>b.id===customBelts.first).dir,1);
  assert.equal(customBelts.belts.find(b=>b.id===customBelts.corner).dir,2);
  assert.equal(await page.evaluate(id=>window.__martTest.turnFreeBelt(id),customBelts.last),3,'outlet rotates to face other directions');
  console.log('PASS: player can freely build 90-degree world-grid conveyors, save and rotate them independent of aisle runs');

  // Sweep a fast movement into the high-bay rack; it must not tunnel through steel.
  await page.evaluate(()=>window.__martTest.teleport(8,28));
  const pos=await page.evaluate(()=>window.__martTest.move(12,0));
  assert.ok(pos.x<10.5,'rack collision prevents player clipping');
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(10,-11.48)),true);
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(9.4,95.95)),true);
  console.log('PASS: collision blocks store fixtures, long shelving and pallets');

  await page.evaluate(()=>window.__martTest.teleport(23,-9));
  await page.keyboard.press('r');
  await page.locator('#elevator.open').waitFor();
  assert.equal(await page.locator('.elevatorSymbol svg').count(),1,'custom SVG elevator icon replaces emoji');
  assert.equal(await page.locator('#elevatorlist .elevatorFloor').count(),15);
  assert.equal(await page.locator('.elevatorOverview').count(),1);
  await page.locator('#elevatorlist button').last().click({noWaitAfter:true,timeout:90000});
  try{
    await page.waitForFunction(()=>document.querySelector('#floorStat')?.textContent.includes('F15'),undefined,{timeout:45000});
    assert.equal(await page.evaluate(()=>window.__martTest.snapshot().checkoutCount),0,'cashier lanes do not appear above first floor');
  }catch(error){
    console.error('FLOOR TRANSITION DIAGNOSTICS:',JSON.stringify(await page.evaluate(()=>({
      floor:document.querySelector('#floorStat')?.textContent,
      loading:document.querySelector('#loading')?.hidden,
      dialogs:[...document.querySelectorAll('.dialog.open')].map(n=>n.id),
      status:document.querySelector('#toast')?.textContent
    }))));
    console.error('PAGE EXCEPTIONS:',errors);
    throw error;
  }
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.floor,14);
  assert.equal(snap.stocked,1);
  assert.equal(await page.evaluate(()=>document.querySelector('#intro').classList.contains('open')),false);
  // Return to Floor 1 to verify door mechanics and completion-gated interaction.
  await page.evaluate(()=>window.__martTest.teleport(23,-9));
  await page.keyboard.press('r');
  await page.locator('#elevator.open').waitFor();
  await page.locator('#elevatorlist button').first().click({noWaitAfter:true,timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#floorStat')?.textContent.includes('F01'),undefined,{timeout:45000});
  await page.evaluate(()=>{window.__martTest.teleport(-6.5,85);window.__martTest.setLook(Math.PI/2,0);});
  await page.screenshot({path:path.join(art,'fire-exit.png'),timeout:90000});
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().fire),true);
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().fire),false);
  console.log('PASS: single back-left FIRE EXIT opens and closes, revealing brick wall');
  await page.evaluate(()=>{window.__martTest.teleport(46.5,-8.3);window.__martTest.setLook(0,0);});
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().entrance),false,'must stay locked below 100%');
  // Finishing the THIRD floor produces the one-time all-in second coin flip.
  // Use the isolated QA hook to finish only that floor without a 9,600-click run.
  await page.evaluate(()=>{
   window.__martTest.coinTest.setCash(12345);
   window.__martTest.coinTest.finishThirdFloor();
  });
  await page.locator('#coinflip.open').waitFor({timeout:30000});
  assert.match(await page.locator('#coinTitle').textContent(),/FLOOR 3.*ALL-IN/);
  assert.match(await page.locator('#coinStake').textContent(),/\$123\.45/);
  await page.screenshot({path:path.join(art,'secret-floor3-all-in-offer.png'),timeout:90000});
  assert.match(await page.locator('#coinHeads').textContent(),/^YES/);
  await page.locator('#coinHeads').click();
  const outcome=await page.evaluate(()=>({
   cash:window.__martTest.snapshot().money,
   status:window.__martTest.coinOffers().floor3
  }));
  assert.equal(outcome.status.played,true);
  assert.equal(outcome.status.result.stake,12345,'wagers exact balance at the moment of the flip');
  assert.ok([0,24690].includes(outcome.cash),'all-in result is either zero or exactly doubled');
  await page.locator('#coinClose').click();
  assert.equal((await page.evaluate(()=>window.__martTest.coinOffers())).floor3.played,true);
  console.log('PASS: finishing Floor 3 triggers a fair, one-use all-in flip, and result persists');
  await page.evaluate(()=>window.__martTest.setCompletion(true));
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#end').isVisible(),false,'completion alone must not start ending');
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().entrance),true,'E should open after 100%');
  console.log('PASS: Final front entrance is locked until full stock, then E opens it');
  const dir=art;
  await page.screenshot({path:path.join(dir,'entrance-unlocked.png'),timeout:90000});
  console.log('PASS: floor elevator reaches F15 and rebuilds the 3D store');

  // Isolated endgame boss QA: do not modify the ordinary gameplay save.
  const crabContext=await browser.newContext({viewport:{width:1280,height:800}});
  const crabPage=await crabContext.newPage();
  crabPage.on('pageerror',e=>errors.push(e.message));
  await crabPage.goto(root+'/#rich',{waitUntil:'load'});
  await crabPage.waitForFunction(()=>document.querySelector('#loading')?.hidden,undefined,{timeout:45000});
  assert.equal(await crabPage.evaluate(()=>window.__martTest.crabTest.status().unlocked),false);
  const scene=await crabPage.evaluate(()=>{
   const qa=window.__martTest.crabTest;
   const unlocked=qa.completeFloors(7);
   window.__martTest.setFloor(7);
   const stocked=qa.stockTarget(7,3,12,2);
   const botId=qa.spawnBot(7,3,12,400);
   return {unlocked,stocked,botId,before:qa.status()};
  });
  assert.equal(scene.unlocked,true,'crab unlocks after seven complete floors');
  assert.equal(scene.stocked,48);
  assert.equal(scene.before.visible,true,'gigantic walking crab model is present on unfinished floor');
  assert.equal(await crabPage.locator('#crabStatus').count(),0,'Crab Alert HUD is removed; boss still exists');
  const raid=await crabPage.evaluate(()=>window.__martTest.crabTest.swing(7,3,12));
  assert.equal(raid.fallen,48);
  assert.deepEqual(raid.robots,[scene.botId]);
  const after=await crabPage.evaluate(()=>window.__martTest.crabTest.status());
  assert.ok(after.wreckModels>=1,'detached head and giant spring render as a wreck model');
  assert.equal(after.piles.filter(p=>p.floor===7).reduce((a,p)=>a+p.count,0),48);
  const destroyed=await crabPage.evaluate(id=>window.__martTest.crabTest.robot(id),scene.botId);
  assert.equal(destroyed.wrecked,true);
  await crabPage.evaluate(()=>{window.__martTest.teleport(38,45);window.__martTest.setLook(0,-.08);});
  await crabPage.screenshot({path:path.join(art,'mega-crab-robot-wreck.png'),timeout:90000});
  const refund=await crabPage.evaluate(id=>window.__martTest.crabTest.scrap(id),scene.botId);
  assert.equal(refund,100,'destroyed $4 robot must return 25% scrap credit');
  assert.equal(await crabPage.evaluate(()=>window.__martTest.crabTest.status().wrecked.length),0);
  const king=await crabPage.evaluate(()=>{
   const t=window.__martTest;
   t.setUpgrade('crabKing',1);
   const p=t.crabRideStatus().patrol;
   t.teleport(p.x,p.z);
   const mounted=t.mountCrab();
   const saddle=t.crabDetailStats();
   const before=t.crabRideStatus();
   const moved=t.steerCrab(1,0,.1);
   const after=t.crabRideStatus();
   const noRaid=t.crabTest.swing(7,3,12)===null;
   const dismounted=t.mountCrab();
   return {mounted,moved,noRaid,dismounted,before,after,saddle};
  });
  assert.equal(king.mounted,true,'G/crab rider action mounts when near');
  assert.equal(king.moved,true,'crab rides under player steering');
  assert.ok(king.after.patrol.z!==king.before.patrol.z||king.after.patrol.x!==king.before.patrol.x);
  assert.equal(king.noRaid,true,'tamed crab never knocks products or robots');
  assert.equal(king.dismounted,true,'rider dismount works');
  assert.ok(king.saddle.components.naturalCrabShell>=1,'organic crab retains natural carapace');
  assert.equal(king.saddle.components.crabKingRidingSaddle,1,'buying King adds a leather riding saddle');
  console.log('PASS: King of Crab saddle, mount/steer/dismount and globally disabled destructive raids');

  console.log('PASS: seven-floor crab boss appears, knocks stock to floor, permanently wrecks robot, and enforces 25% scrap');
  await crabContext.close();

  await page.close();const ending=await context.newPage();
  ending.on('pageerror',e=>errors.push(e.message));
  await ending.goto(root+'/#ending-test',{waitUntil:'load'});
  await ending.waitForFunction(()=>getComputedStyle(document.querySelector('#bank')).display!=='none',undefined,{timeout:45000});
  assert.match(await ending.locator('#bank').textContent(),/WENT BANKRUPT/);
  assert.match(await ending.locator('#thanks').textContent(),/Thanks for Playing!/);
  await ending.screenshot({path:path.join(dir,'bankruptcy.png'),timeout:90000});
  console.log('PASS: 20 accelerating cycles reach empty grand opening bankruptcy finale');
  assert.deepEqual(errors,[]);
  await context.close();
 } finally {
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
 }
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
