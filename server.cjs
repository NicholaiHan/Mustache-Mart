'use strict';
// Offline, loopback-only Mustache Mart preview. No Electron or package install needed.
// Only three static game assets are exposed, never local files or user information.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/src/game.js', ['src/game.js', 'text/javascript; charset=utf-8']],
  ['/vendor/three.module.js', ['vendor/three.module.js', 'text/javascript; charset=utf-8']]
]);
const HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  // The import map is intentionally inline; all executable code stays local.
  'content-security-policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
};

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { ...HEADERS, allow: 'GET, HEAD' }).end('Method not allowed');
        return;
      }
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      const entry = PUBLIC_FILES.get(pathname);
      if (!entry) {
        res.writeHead(404, HEADERS).end('Not found');
        return;
      }
      const [relative, mime] = entry;
      const bytes = await fs.readFile(path.join(ROOT, relative));
      res.writeHead(200, { ...HEADERS, 'content-type': mime, 'content-length': bytes.length });
      if (req.method === 'HEAD') res.end();
      else res.end(bytes);
    } catch (err) {
      const status = err.code === 'ENOENT' ? 404 : 500;
      res.writeHead(status, HEADERS).end(status === 404 ? 'Not found' : 'Server error');
    }
  });
}

if (require.main === module) {
  const parsed = Number(process.env.PORT ?? 8000);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    console.error('Invalid PORT; expected 0-65535');
    process.exitCode = 1;
  } else {
    const server = createServer();
    server.on('error', err => {
      console.error(err.code === 'EADDRINUSE' ? 'Port in use. Stop an older Mustache Mart server with Control+C.' : err.message);
      process.exitCode = 1;
    });
    server.listen(parsed, '127.0.0.1', () => {
      console.log('Mustache Mart running at http://127.0.0.1:' + server.address().port);
      console.log('Open that address in Safari or Chrome. Control+C stops the server.');
    });
  }
}

module.exports = { createServer };
