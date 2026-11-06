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
  const errs=[];page.on('pageerror',e=>{errs.push(e.message);console.error('BROWSER PAGE ERROR',e.message)});
  page.on('console',m=>{if(m.type()==='error')console.error('BROWSER CONSOLE ERROR',m.text());});
  await page.goto(origin+'/#rich',{waitUntil:'load'});
  try{await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&window.__martTest,undefined,{timeout:45000});}
  catch(error){console.error('BROWSER INIT FAILURE',errs,await page.title());throw error;}
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
  await camera('portal-sign-proportions',-1.8,88.5,Math.PI,.62);
  await camera('portal-stock',4.2,87,Math.PI,.12);
  await camera('portal-crates-close',6.5,92.4,Math.PI,.12);
  await camera('proper-inventory-stacks',8.5,90.2,Math.PI,.16);
  await camera('compact-pallet-jack',2.3,88.5,Math.PI,.09);
  await camera('customer-service-kiosk',1.5,-.3,0,.18);
  await camera('connected-service-queue',10,-3.9,0,.04);
  await camera('connected-gold-portrait',31,-4.0,0,.23);
  const details=await page.evaluate(()=>window.__martTest.visualChecklist());
  console.log('FOCUS SCENE CHECKLIST',JSON.stringify(details));
  console.log('FOCUS NEW GEOMETRY',JSON.stringify({
   frame:details.portraitGoldFrame,service:details.customerServiceGeometry,
   productShapes:details.productShapes
  }));
  assert.equal(details.portraitGoldFrame?.bars,4,'all four gold portrait rails exist');
  assert.equal(details.portraitGoldFrame?.allCornersTouch,true,'gold frame must connect at every corner after aisle widening');
  assert.equal(details.customerServiceGeometry?.lineAttached,true,'customer queue line joins both posts');
  assert.equal(details.customerServiceGeometry?.signAligned,true,'customer service sign is centered on its housing');
  assert.deepEqual(details.productShapes?.map(p=>p.kind),
   ['can','water-bottle-with-neck','wine-bottle-with-neck','cereal-box','can']);
  assert.deepEqual(details.productShapes?.map(p=>p.geometryType),
   ['CylinderGeometry','LatheGeometry','LatheGeometry','BoxGeometry','CylinderGeometry']);
  assert.deepEqual(details.productShapes?.map(p=>p.capGeometry),
   ['CylinderGeometry','CylinderGeometry','CylinderGeometry','BoxGeometry','CylinderGeometry'],
   'real cans, bottles and cartons each need an appropriate visible finishing cap');
  assert.deepEqual(details.productShapes?.map(p=>p.sealGeometry),
   ['TorusGeometry','TorusGeometry','TorusGeometry','BoxGeometry','TorusGeometry'],
   'can end rims, bottle neck rings and cereal folds must render');
  console.log('FOCUS PACKAGE DETAILS',JSON.stringify(details.productShapes));
  const sign=details.portalSignGeometry;
  assert.ok(sign?.panel&&sign?.lettering&&sign?.frame&&sign?.lights,
   'real sign face, lettering, frame and LED backing must render together');
  console.log('FOCUS PORTAL SIGN PROPORTIONS',JSON.stringify(sign));
  assert.ok(Math.abs(sign.panel.width-10.08)<.15,'sign background must NOT stretch to 16m with wider aisles');
  assert.ok(Math.abs(sign.panel.height-1.48)<.15,'sign background height must match its intended proportion');
  assert.ok(Math.abs(sign.lettering.width-8.34)<.15,'lettering must retain natural horizontal dimensions');
  assert.ok(Math.abs(sign.lettering.height-.98)<.15,'lettering must not be wafer-thin or clipped');
  assert.ok(Math.abs(sign.frame.width-9.72)<.15,'gold frame stays neatly inside panel');
  assert.ok(sign.textCentered&&sign.textFits&&sign.frameFits,'all sign parts fit with balanced margins');
  assert.ok(sign.panel.width/sign.panel.height<7.5,'sign must have a sensible width to height ratio');
  const inv=details.inventoryGeometry;
  assert.ok(inv?.packedCarton&&inv?.workingPallet&&inv?.palletJack&&inv?.receivingIntake&&inv?.jackFork,'all inventory and jack models must render');
  console.log('FOCUS STOCK PROPORTIONS',JSON.stringify(inv));
  assert.ok(inv.packedCarton.width>.85&&inv.packedCarton.width<1.3,'carton should not be flattened or stretched');
  assert.ok(inv.workingPallet.width>2&&inv.workingPallet.width<2.45,'working pallet must preserve original physical width');
  assert.ok(inv.receivingIntake.width>3.9&&inv.receivingIntake.width<4.55,'intake rails and rollers must stay proportional');
  assert.ok(inv.palletJack.depth<2.5,'shorter pallet jack must not have the old overlong silhouette');
  assert.ok(inv.palletJack.width>1.65&&inv.palletJack.width<2.05,'new hand jack must be wide and naturally proportioned');
  assert.ok(inv.palletJack.depth/inv.palletJack.width<1.45,'jack cannot look skinny or excessively long');
  assert.ok(inv.jackFork.depth<1.9,'jack forks must be compact');
  const links=details.portalConnections;
  assert.ok(links,'real portal geometry inspection must be available');
  for(const part of ['topLeft','topRight','lowerLeft','lowerRight','signLower','signTop','ledSign']){
   assert.equal(links[part],true,'actual transformed Supply Portal geometry is DISCONNECTED at '+part);
  }
  assert.equal(links.dockX,-1.8,'pickup counter and Supply Portal center must travel together');
  assert.ok(links.topSpan>links.postSpan,'full-width horizontal beam must be wider than the upright span');
  await page.evaluate(()=>window.__martTest.crabTest.stockTarget(0,0,6,2));
  await camera('shelf-product-shapes',8,28,Math.PI/2,.05);
  await page.evaluate(()=>window.__martTest.crabTest.spawn());
  const patrol=await page.evaluate(()=>window.__martTest.crabRideStatus().patrol);
  await camera('crab-front',patrol.x,patrol.z-12,Math.PI,.10);
  await camera('crab-side',patrol.x+8,patrol.z-2,Math.PI*1.5,.13);
  const crab=await page.evaluate(()=>window.__martTest.crabDetailStats());
  console.log('FOCUS CRAB PARTS',JSON.stringify(crab));
  assert.ok(crab?.walkingLegs===8);
  assert.equal(crab.shellTriangles,64,'the body must be a physically angular sixteen-sided polygonal shell, not a sphere');
  const crowd=await page.evaluate(()=>window.__martTest.crabTest.crowdPreview(16,450));
  console.log('FOCUS ROBOT CROWD',JSON.stringify({...crowd,positions:crowd.positions.slice(0,12)}));
  assert.equal(crowd.count,16,'all sixteen intentionally stacked robots must survive');
  assert.equal(crowd.allFinite,true,'no corrupted robot positions');
  assert.ok(crowd.distinct>=6,'robot positions must separate in the same aisle');
  assert.ok(crowd.stocked>=8,'a pileup must not prevent actual shelf stocking');
  let minimumSeparation=Infinity;
  for(let i=0;i<crowd.positions.length;i++)for(let j=i+1;j<crowd.positions.length;j++){
   const a=crowd.positions[i],b=crowd.positions[j];
   minimumSeparation=Math.min(minimumSeparation,Math.hypot(a.x-b.x,a.z-b.z));
  }
  console.log('FOCUS ROBOT MIN SEPARATION',minimumSeparation);
  assert.ok(minimumSeparation>=.924,'moving robots must be PHYSICALLY SOLID and never pass through one another');
  await camera('robots-after-45s',8,90,0,.10);
  assert.equal(errs.length,0,errs.join('; '));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
