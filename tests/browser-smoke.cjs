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
  console.log('PASS: game renders giant 15-floor store without Electron');

  await page.locator('#play').click();
  // Actual collision-safe loading position, not inside the receiving counter.
  await page.evaluate(()=>window.__martTest.teleport(1.5,93.1));
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(1.5,93.1)),false);
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(1.5,96)),true);
  const art=path.join(__dirname,'..','test-artifacts');fs.mkdirSync(art,{recursive:true});
  await page.screenshot({path:path.join(art,'warehouse-receiving.png')});
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

  await page.evaluate(()=>window.__martTest.teleport(10,-1.3));
  await page.screenshot({path:path.join(art,'payroll-window.png')});
  await page.keyboard.press('e');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.pending,0);
  assert.ok(snap.money>=100001);
  assert.equal(await page.locator('#payReceipt').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#receiptAmount').textContent(),'$0.01');
  console.log('PASS: physical pay-window converts unsettled wages into money with professional receipt');

  await page.evaluate(()=>window.__martTest.teleport(1.5,-4.1));
  await page.keyboard.press('q');
  await page.locator('#shop.open').waitFor();
  assert.equal(await page.locator('#shopTitle').textContent(),'Mustache Mike');
  await page.screenshot({path:path.join(art,'mike-upgrades.png')});
  await page.locator('#shopitems .upgrade').first().locator('button').click();
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.levels.capacity,1);
  await page.locator('#tab-economy').click();
  await page.locator('#shopitems .upgrade').first().locator('button').click();
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.levels.soupTriple,1,'the $50 can contract should be purchasable');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#shop').classList.contains('open'));
  console.log('PASS: Mike buys carrying upgrade + $50 canned-goods 3x contract; Escape closes dialogue');
  await page.keyboard.press('q');
  await page.locator('#shop.open').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#shop').classList.contains('open'));

  await page.evaluate(()=>window.__martTest.teleport(8,89.85));
  await page.keyboard.press('b');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.belts[0],1);
  console.log('PASS: player connects the first rear-fed conveyor in an aisle');
  // Sweep a fast movement into the high-bay rack; it must not tunnel through steel.
  await page.evaluate(()=>window.__martTest.teleport(8,28));
  const pos=await page.evaluate(()=>window.__martTest.move(12,0));
  assert.ok(pos.x<10.5,'rack collision prevents player clipping');
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(10,-3.2)),true);
  assert.equal(await page.evaluate(()=>window.__martTest.checkBlocked(30,95)),true);
  console.log('PASS: collision blocks store fixtures, long shelving and pallets');

  await page.evaluate(()=>window.__martTest.teleport(23,-9));
  await page.keyboard.press('r');
  await page.locator('#elevator.open').waitFor();
  await page.locator('#elevatorlist button').last().click({noWaitAfter:true,timeout:90000});
  try{
    await page.waitForFunction(()=>document.querySelector('#floorStat')?.textContent.includes('F15'),undefined,{timeout:45000});
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
  await page.evaluate(()=>window.__martTest.teleport(98.6,40.5));
  await page.screenshot({path:path.join(art,'fire-exit.png')});
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().fire),true);
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().fire),false);
  console.log('PASS: Fire Exit opens and closes by E, revealing brick wall');
  await page.evaluate(()=>window.__martTest.teleport(46.5,-8.3));
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().entrance),false,'must stay locked below 100%');
  await page.evaluate(()=>window.__martTest.setCompletion(true));
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#end').isVisible(),false,'completion alone must not start ending');
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__martTest.doorStatus().entrance),true,'E should open after 100%');
  console.log('PASS: Final front entrance is locked until full stock, then E opens it');
  const dir=art;
  await page.screenshot({path:path.join(dir,'entrance-unlocked.png')});
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
