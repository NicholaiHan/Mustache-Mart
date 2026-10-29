// Local-only static server for playing Mustache Mart without Electron.
// This is a development preview, not a publicly accessible web service.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const decoded = decodeURIComponent(pathname);
    const requested = decoded === '/' ? '/index.html' : decoded;
    const filepath = path.resolve(root, '.' + requested);
    if (!(filepath === root || filepath.startsWith(root + path.sep)) || filepath.includes(path.sep + '.git' + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const bytes = await fs.readFile(filepath);
    res.writeHead(200, { 'content-type': mime[path.extname(filepath)] || 'application/octet-stream', 'cache-control': 'no-cache', 'x-content-type-options':'nosniff' });
    res.end(bytes);
  } catch (error) {
    res.writeHead(404).end('Not found');
  }
});
server.listen(8000, '127.0.0.1', () => {
  console.log('Mustache Mart browser preview: http://localhost:8000');
  console.log('Press Control + C in Terminal to stop.');
});
