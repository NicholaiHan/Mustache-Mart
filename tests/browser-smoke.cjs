'use strict';
const { chromium } = require('playwright');
const { createServer } = require('../server.cjs');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const server = createServer();
  let browser;
  const errors = [];
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({
      headless: true,
      args: ['--enable-webgl', '--use-angle=swiftshader']
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(base + '/#rich', { waitUntil: 'load' });
    await page.waitForFunction(() =>
      document.querySelector('#barTxt')?.textContent.includes('57,600'),
      undefined, { timeout: 45000 }
    );
    if (!await page.locator('canvas').count()) throw Error('3D game canvas was not created');
    if (!await page.locator('#start').isVisible()) throw Error('Start screen missing');

    const dir = path.join(__dirname, '..', 'test-artifacts');
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'start.png') });
    console.log('PASS: browser rendered 57,600-product game startup');
    await page.locator('#start').click({ position: { x: 300, y: 400 } });
    await page.waitForTimeout(300);
    if (errors.length) throw Error('Browser exceptions: ' + errors.join(' | '));

    await page.close();
    // A new page is essential: hash-only navigation would not reinitialize the game.
    const endingPage = await context.newPage();
    endingPage.on('pageerror', e => errors.push(e.message));
    await endingPage.goto(base + '/#ending-test', { waitUntil: 'load' });
    await endingPage.waitForFunction(() =>
      document.querySelector('#bank')?.classList.contains('show'),
      undefined, { timeout: 20000 }
    );
    const ending = await endingPage.locator('#tape').textContent();
    const thanks = await endingPage.locator('#thanks').textContent();
    if (!ending.includes('WENT BANKRUPT') || !thanks.includes('Thanks for Playing!')) {
      throw Error('Incorrect ending: ' + ending + ' / ' + thanks);
    }
    await endingPage.screenshot({ path: path.join(dir, 'ending.png') });
    if (errors.length) throw Error('Browser exceptions: ' + errors.join(' | '));
    console.log('PASS: 20-cycle ending reaches WENT BANKRUPT and Thanks for Playing');
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => {
  console.error(err.stack || err);
  process.exitCode = 1;
});
