// Copies the hand-tracking library out of node_modules and downloads the two tracking models into vendor/,
// so the site runs with no build step and no CDN. Run after `npm install`:  node scripts/vendor.mjs
// vendor/ is committed, so you only need this again when upgrading the library.
import { copyFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const out = path.join(root, 'vendor', 'mediapipe');
await mkdir(path.join(out, 'wasm'), { recursive: true });

for (const f of ['vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm']) {
  await copyFile(path.join(lib, ...f.split('/')), path.join(out, ...f.split('/')));
  console.log('copied', f);
}

const models = {
  'hand_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'face_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
};
for (const [name, url] of Object.entries(models)) {
  const dest = path.join(out, name);
  const have = await stat(dest).then((s) => s.size, () => 0);
  if (have > 100000 && !process.argv.includes('--force')) { console.log('have', name, have, 'bytes'); continue; }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
  console.log('downloaded', name, buf.length, 'bytes');
}
