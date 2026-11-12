// Copies the hand-tracking library out of node_modules and downloads the hand model into vendor/mediapipe,
// which Sign Weaving loads when the camera is turned on. vendor/ is committed, so you only need this again
// when upgrading the library. Same command on Windows and macOS:  npm install  then  npm run vendor
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

const name = 'hand_landmarker.task';
const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const dest = path.join(out, name);
const have = await stat(dest).then((s) => s.size, () => 0);
if (have > 100000 && !process.argv.includes('--force')) console.log('have', name, have, 'bytes');
else {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
  console.log('downloaded', name, buf.length, 'bytes');
}
