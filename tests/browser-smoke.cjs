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
  await page.goto(root+'/#rich',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#progressText')?.textContent.includes('108,000'),undefined,{timeout:60000});
  assert.equal(await page.locator('canvas').count(),1);
  assert.equal(await page.locator('#intro').isVisible(),true);
  console.log('PASS: game renders giant 15-floor store without Electron');

  await page.locator('#play').click();
  await page.evaluate(()=>window.__martTest.teleport(-5,-3));
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  let snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.carry,1,'initial carrying cap is one');

  await page.evaluate(()=>{window.__martTest.teleport(8,13);window.__martTest.setLook(-Math.PI/2,0);});
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.stocked,1);
  assert.equal(snap.pending,2);
  assert.equal(snap.carry,0);
  console.log('PASS: single-item pickup and manual middle-shelf 2-cent payout');

  await page.evaluate(()=>window.__martTest.teleport(10,-3));
  await page.keyboard.press('e');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.pending,0);
  assert.ok(snap.money>=100002);
  console.log('PASS: physical pay-window converts unsettled wages into money');

  await page.evaluate(()=>window.__martTest.teleport(1.5,-7));
  await page.keyboard.press('q');
  await page.locator('#shop.open').waitFor();
  await page.locator('#shopitems .upgrade').first().locator('button').click();
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.levels.capacity,1);
  await page.locator('#shopClose').click();
  console.log('PASS: shopkeeper sells multi-item carrying upgrade');

  await page.evaluate(()=>window.__martTest.teleport(8,13));
  await page.keyboard.press('b');await page.waitForTimeout(250);
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.belts[0],1);
  console.log('PASS: player places connected conveyor segment in aisle');

  await page.evaluate(()=>window.__martTest.teleport(23,-9));
  await page.keyboard.press('r');
  await page.locator('#elevator.open').waitFor();
  await page.locator('#elevatorlist button').last().click();
  await page.waitForFunction(()=>document.querySelector('#floorStat')?.textContent.includes('F15'),undefined,{timeout:12000});
  snap=await page.evaluate(()=>window.__martTest.snapshot());
  assert.equal(snap.floor,14);
  const dir=path.join(__dirname,'..','test-artifacts');fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'floor15.png')});
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
