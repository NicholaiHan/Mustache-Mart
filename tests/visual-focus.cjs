'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../server.cjs');
(async()=>{
 const server=createServer();let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(origin+'/#rich',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&window.__martTest,undefined,{timeout:45000});
  const version=await page.locator('#buildChip').textContent();
  console.log('FOCUS BUILD',version);
  await page.locator('#play').click();
  await page.locator('#coinflip.open').waitFor({timeout:25000});
  await page.locator('#coinTails').click();
  const out=path.resolve(__dirname,'../test-artifacts/visual-focus');
  fs.mkdirSync(out,{recursive:true});
  const camera=async(name,x,z,yaw,pitch)=>{
   await page.evaluate(([px,pz,py,pp])=>{window.__martTest.teleport(px,pz);window.__martTest.setLook(py,pp);},[x,z,yaw,pitch]);
   await page.waitForTimeout(500);
   await page.screenshot({path:path.join(out,name+'.png'),timeout:70000});
  };
  await camera('portal-overview',-1.8,82,Math.PI,.42);
  await camera('portal-structure',-1.8,89,Math.PI,.7);
  await camera('portal-stock',4.2,87,Math.PI,.12);
  const details=await page.evaluate(()=>window.__martTest.visualChecklist());
  console.log('FOCUS SCENE CHECKLIST',JSON.stringify(details));
  const links=details.portalConnections;
  assert.ok(links,'real portal geometry inspection must be available');
  for(const part of ['topLeft','topRight','lowerLeft','lowerRight','signLower','signTop','ledSign']){
   assert.equal(links[part],true,'actual transformed Supply Portal geometry is DISCONNECTED at '+part);
  }
  assert.equal(links.dockX,-1.8,'pickup counter and Supply Portal center must travel together');
  assert.ok(links.topSpan>links.postSpan,'full-width horizontal beam must be wider than the upright span');
  await page.evaluate(()=>window.__martTest.crabTest.spawn());
  const patrol=await page.evaluate(()=>window.__martTest.crabRideStatus().patrol);
  await camera('crab-front',patrol.x,patrol.z-12,Math.PI,.10);
  await camera('crab-side',patrol.x+8,patrol.z-2,Math.PI*1.5,.13);
  const crab=await page.evaluate(()=>window.__martTest.crabDetailStats());
  console.log('FOCUS CRAB PARTS',JSON.stringify(crab));
  assert.ok(crab?.walkingLegs===8);
  assert.equal(errs.length,0,errs.join('; '));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
