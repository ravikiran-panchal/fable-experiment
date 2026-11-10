// Local test server (Windows, macOS, Linux):  node scripts/serve.mjs  ->  http://localhost:8766
// Camera access needs a "secure" page. localhost counts; a LAN address like http://192.168.x.x does not.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8766;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.task': 'application/octet-stream', '.md': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  let p = path.join(root, rel);
  if (p !== root && !p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'Content-Type': types[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`Hand Sign Jutsu on http://localhost:${port}`));
