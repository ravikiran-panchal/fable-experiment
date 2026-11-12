// Tiny local web server for testing the game with sound: node scripts/serve.mjs  ->  http://localhost:8765/play.html
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.css': 'text/css', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const b = await readFile(p.endsWith(path.sep) ? path.join(p, 'index.html') : p); res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }).end(b); }
  catch { res.writeHead(404).end('not found'); }
}).listen(8765, () => console.log('Will of Fire on http://localhost:8765/play.html'));
