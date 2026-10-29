'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'src/game.js'), 'utf8');
let server, origin;

test.before(async () => {
  server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  assert.equal(server.address().address, '127.0.0.1', 'server must bind to loopback');
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

test('critical game controls and all DOM identifiers are present', () => {
  const present = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const required = new Set([...game.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]));
  const missing = [...required].filter(id => !present.has(id));
  assert.deepEqual(missing, []);
  assert.match(html, /MUSTACHE/);
  assert.match(game, /const DAYS = 20/);
  assert.match(game, /const AISLES = 24, UNITS = 100/);
});

test('game uses local Three.js module, not an external CDN', () => {
  assert.match(html, /"three":"\.\/vendor\/three\.module\.js"/);
  assert.doesNotMatch(html, /node_modules\/three/);
  assert.ok(fs.statSync(path.join(root, 'vendor/three.module.js')).size > 100000);
  assert.match(game, /import \* as THREE from 'three'/);
});

test('localhost preview serves only permitted assets', async () => {
  const assets = ['/', '/index.html', '/src/game.js', '/vendor/three.module.js'];
  for (const route of assets) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok((await response.arrayBuffer()).byteLength > 10);
  }
  for (const route of ['/package.json', '/package-lock.json', '/mustache-mart.zip', '/.git/config', '/scripts/enhance.py', '/README.md']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 404, route);
  }
  const post = await fetch(origin + '/', { method: 'POST' });
  assert.equal(post.status, 405);
});

test('game source includes no remote resource imports or unsafe Electron switch', () => {
  assert.doesNotMatch(html + game, /https?:\/\/(?:cdn|unpkg|jsdelivr)/i);
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.doesNotMatch(main, /OutOfBlinkCors|webSecurity:\s*false|nodeIntegration:\s*true/);
  assert.match(main, /sandbox:\s*true/);
});

test('test ending is deterministic and normal game keeps 20 cycles', () => {
  assert.match(game, /'#ending-test'/);
  assert.match(game, /document\.documentElement\.dataset\.endingDay/);
  assert.match(game, /if \(S.stocked >= TOTAL && !ending\) startEnding\(\)/);
});
