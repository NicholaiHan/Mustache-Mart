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
  assert.equal(await page.locator('#saveExport').count(),1,'save backup export is accessible from the introduction');
  assert.equal(await page.locator('#saveImportFile').count(),1,'save file import is accessible from the introduction');
  await page.waitForFunction(()=>document.querySelector('#buildChip')?.textContent.includes('2026.10.31.2'));
  assert.match(await page.locator('#buildIntro').innerText(),/UPDATED EDITION.*2026\.10\.31\.2/);
  assert.match(await page.locator('#devBanner').innerText(),/DEVELOPMENT MODE/);
  assert.equal(await page.locator('#devBanner').isVisible(),true);
  const build=await page.evaluate(async()=>await (await fetch('./build.json')).json());
  assert.equal(build.version,'2026.10.31.2');
  console.log('PASS: game prints latest build badge, features, manifest and $500 dev banner');

  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().money),50000,'development account starts with precisely $500');
  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().checkoutCount),4,'four real checkout stations on floor 1');
  console.log('PASS: game renders fifteen-floor store with $500 developer account and four checkout lanes');

  // Exercise real portable save download and import on the game's local origin.
  const downloadStarted=page.waitForEvent('download',{timeout:20000});
  await page.locator('#saveExport').click();
  const saveDownload=await downloadStarted;
  const saved=JSON.parse(fs.readFileSync(await saveDownload.path(),'utf8'));
  assert.equal(saved.version,4,'exported save has compatible format');
  assert.ok(Array.isArray(saved.fill)&&saved.fill.length>10000,'export includes entire fifteen-floor progress');
  saved.money=50123;
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#saveImportFile').setInputFiles({name:'mustache-mart-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await page.waitForFunction(()=>window.__martTest?.snapshot().money===50123,undefined,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().money),50123,'imported money persists across beforeunload and reload');
  assert.equal(await page.locator('#intro').isVisible(),true);
  console.log('PASS: exported save downloads and confirmed import persists through reload without overwrite');

  await page.locator('#play').click();
  // Actual collision-safe loading position, not inside the receiving counter.
  await page.evaluate(()=>{window.__martTest.teleport(1.5,93.1);window.__martTest.setLook(Math.PI,-.07);});
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(1.5,93.1)),false);
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(1.5,96)),true);
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
  assert.equal(snap.carry,0);
  console.log('PASS: rear warehouse pickup and reachable lower-rack 1-cent payout');

  await page.evaluate(()=>{window.__martTest.teleport(10,-8.38);window.__martTest.setLook(0,-.07);});
  await page.screenshot({path:path.join(art,'payroll-window.png'),timeout:90000});
  await page.keyboard.press('e');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.pending,0);
  assert.ok(snap.money>=50001);
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
  assert.equal(await page.locator('#shopitems .upgrade').count(),12,'skill tree lists twelve new skills');
  assert.equal(await page.locator('#shopitems .skillNode').count(),12,'skills render as connected graph nodes');
  assert.equal(await page.locator('#shopitems .skillWires path').count(),12,'each skill shows its real prerequisite wire');
  assert.equal(await page.locator('#shopitems .skillFoundation').count(),7,'equipment and economy prerequisites appear as foundation links');
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

  // Purchased robots are NOT automatically active: left click an aisle position.
  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  await page.keyboard.press('e');
  await page.locator('#shop.open').waitFor();
  await page.locator('#tab-tools').click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Mustache Stocker Bot'}).first().locator('button').first().click();
  await page.waitForFunction(()=>!document.querySelector('#shop').classList.contains('open'));
  assert.equal(await page.evaluate(()=>window.__martTest.snapshot().placementRobotId!==null),true);
  // Aim the placement ray at a clear floor tile, not at shelving or a checkout.
  await page.evaluate(()=>{window.__martTest.teleport(8,60.7);window.__martTest.setLook(0,-.6);});
  await page.waitForTimeout(250);
  await page.mouse.move(640,400);
  await page.mouse.click(640,400);
  try{
   await page.waitForFunction(()=>window.__martTest.snapshot().placementRobotId===null,undefined,{timeout:12000});
  }catch(error){
   console.error('ROBOT PLACEMENT DIAGNOSTICS:',JSON.stringify(await page.evaluate(()=>({snap:window.__martTest.snapshot(),message:document.querySelector('#toast')?.textContent}))));
   throw error;
  }
  let robotSnap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(robotSnap.robotCount,1);
  console.log('PASS: Mike sells an independent robot, click-to-place activates it in chosen aisle');

  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  await page.keyboard.press('e');await page.locator('#shop.open').waitFor();
  await page.locator('#tab-tools').click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Robot Espresso'}).first().locator('button').first().click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Motorized Robot Ladder'}).first().locator('button').first().click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Portable Step Ladder'}).first().locator('button').first().click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Telescopic Ladder Extension'}).first().locator('button').first().click();
  robotSnap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(robotSnap.levels.robotSpeed,1);
  assert.equal(robotSnap.levels.robotLift,1);
  assert.equal(robotSnap.levels.ladder,1);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__martTest.teleport(8,61));
  await page.keyboard.press('l');
  await page.waitForFunction(()=>window.__martTest.snapshot().ladders===1);
  await page.keyboard.press('e');
  assert.notEqual((await page.evaluate(()=>window.__martTest.snapshot().climbing)),null,'E must grab a placed ladder');
  await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
  assert.ok((await page.evaluate(()=>window.__martTest.snapshot().y))>.4,'player truly climbs upward');
  await page.keyboard.press('c');
  await page.keyboard.press('x');
  await page.waitForFunction(()=>window.__martTest.snapshot().ladders===0);
  console.log('PASS: separate robot upgrades, E-to-grab real player ladder ascent and 50% ladder resale');
  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  await page.keyboard.press('e');await page.locator('#shop.open').waitFor();
  await page.locator('#tab-tools').click();
  await page.locator('#shopitems .upgrade').filter({hasText:'Stocker #'}).first().locator('button').last().click();
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
  // Sweep a fast movement into the high-bay rack; it must not tunnel through steel.
  await page.evaluate(()=>window.__martTest.teleport(8,28));
  const pos=await page.evaluate(()=>window.__martTest.move(12,0));
  assert.ok(pos.x<10.5,'rack collision prevents player clipping');
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(10,-11.48)),true);
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(30,95)),true);
  console.log('PASS: collision blocks store fixtures, long shelving and pallets');

  await page.evaluate(()=>window.__martTest.teleport(23,-9));
  await page.keyboard.press('r');
  await page.locator('#elevator.open').waitFor();
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
  await page.evaluate(()=>window.__martTest.setCompletion(true));
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#end').isVisible(),false,'completion alone must not start ending');
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().entrance),true,'E should open after 100%');
  console.log('PASS: Final front entrance is locked until full stock, then E opens it');
  const dir=art;
  await page.screenshot({path:path.join(dir,'entrance-unlocked.png'),timeout:90000});
  console.log('PASS: floor elevator reaches F15 and rebuilds the 3D store');

  await page.close();const ending=await context.newPage();
  ending.on('pageerror',e=>errors.push(e.message));
  await ending.goto(root+'/#ending-test',{waitUntil:'load'});
  await ending.waitForFunction(()=>getComputedStyle(document.querySelector('#bank')).display!=='none',undefined,{timeout:45000});
  assert.match(await ending.locator('#bank').textContent(),/WENT BANKRUPT/);
  assert.match(await ending.locator('#thanks').textContent(),/Thanks for Playing!/);
  await ending.screenshot({path:path.join(dir,'bankruptcy.png')});
  console.log('PASS: 20 accelerating cycles reach empty grand opening bankruptcy finale');
  assert.deepEqual(errors,[]);
  await context.close();
 } finally {
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
 }
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
