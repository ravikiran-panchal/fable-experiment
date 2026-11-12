// Tiny local web server for testing the game with sound: node scripts/serve.mjs  ->  http://localhost:8765/play.html
// Optional: node scripts/serve.mjs <port> <kbps>   e.g. `node scripts/serve.mjs 8771 1500` imitates a slow phone
// connection (all downloads together share 1500 kilobits per second), to test how sound behaves on a weak network.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 8765, kbps = Number(process.argv[3]) || 0;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.css': 'text/css', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };

// slow mode: every open download takes turns sending a small piece, ten times a second
const open = new Set();
if (kbps) setInterval(() => {
  if (!open.size) return;
  const each = Math.max(256, Math.floor((kbps * 125) / 10 / open.size)); // bytes per download per tick
  for (const d of open) {
    const end = Math.min(d.b.length, d.at + each);
    d.res.write(d.b.subarray(d.at, end)); d.at = end;
    if (d.at >= d.b.length) { d.res.end(); open.delete(d); }
  }
}, 100);

createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const b = await readFile(p.endsWith(path.sep) ? path.join(p, 'index.html') : p);
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Content-Length': b.length, 'Cache-Control': 'no-store' });
    if (!kbps) { res.end(b); return; }
    const d = { res, b, at: 0 }; open.add(d); res.on('close', () => open.delete(d));
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`Hidden Ember on http://localhost:${port}/play.html` + (kbps ? ` (slow network: ${kbps} kbps)` : '')));
