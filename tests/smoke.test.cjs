'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('../server.cjs');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
let server,base;
test.before(async()=>{
 server=createServer();
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 assert.equal(server.address().address,'127.0.0.1');
 base='http://127.0.0.1:'+server.address().port;
});
test.after(async()=>{if(server)await new Promise(done=>server.close(done));});
test('Game UI references correspond to valid IDs',()=>{
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 const required=[...new Set([...game.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]))];
 assert.deepEqual(required.filter(x=>!ids.has(x)),[]);
 assert.match(html,/15 floors/i);
 assert.match(html,/pay window/i);
 assert.match(html,/Mustache Mike/i);
});
test('Only local game assets are accessible and all serve successfully',async()=>{
 for(const a of ['/','/index.html','/src/game.js','/src/rules.mjs','/src/rendering.js','/src/environment.js','/src/characters.js','/src/equipment.js','/src/doors.js','/src/checkout.js','/src/ladder.mjs','/src/collision.mjs','/src/textures.js','/vendor/three.module.js']){
  const r=await fetch(base+a);assert.equal(r.status,200,a);
  assert.match(r.headers.get('content-security-policy'),/default-src 'none'/);
  assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  assert.ok((await r.arrayBuffer()).byteLength>20);
 }
 for(const a of ['/README.md','/package.json','/mustache-mart.zip','/.git/config','/tests/rules.test.cjs']){
  const r=await fetch(base+a);assert.equal(r.status,404,a);
 }
 assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
});
test('Game uses pinned local Three.js without remote CDNs or desktop security bypass',()=>{
 assert.match(html,/vendor\/three.module\.js/);
 assert.doesNotMatch(html+game,/(https?:\/\/(?:cdn|unpkg|jsdelivr))/i);
 const main=fs.readFileSync(path.join(root,'main.js'),'utf8');
 assert.doesNotMatch(main,/OutOfBlinkCors|webSecurity:\s*false|nodeIntegration:\s*true/);
 assert.match(main,/sandbox:\s*true/);
});
test('Browser scene implements floor access, building and ending',()=>{
 assert.match(game,/buildWorld\(\)/);
 assert.match(game,/buildNextBelt\(\)/);
 assert.match(game,/openElevator\(\)/);
 assert.match(game,/beginEnding\(\)/);
 const doors=fs.readFileSync(path.join(root,'src/doors.js'),'utf8');
 assert.match(doors,/FIRE EXIT/);
 assert.match(game,/stock the entire building before opening/);
 assert.match(game,/WENT BANKRUPT|endingDay/);
 assert.ok(fs.statSync(path.join(root,'vendor/three.module.js')).size>100000);
});
