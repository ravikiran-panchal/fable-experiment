// Prepares the game for the Android app: one self-contained folder (app/www) with no outside requests.
// Works the same on Windows and macOS.   Usage: npm run app
//   1. rebuilds the game            2. swaps Google Fonts for font files shipped inside the app
//   3. copies sounds and the hand tracker   4. tells Capacitor to copy it all into the android/ project
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const www = r('app', 'www');

await import('./build.mjs');
await rm(www, { recursive: true, force: true });
await mkdir(path.join(www, 'fonts'), { recursive: true });

// fonts (SIL Open Font License), Latin subset
const FONTS = [
  ['dela-gothic-one', 'dela-gothic-one-latin-400-normal.woff2', 'Dela Gothic One', 400],
  ['zen-maru-gothic', 'zen-maru-gothic-latin-500-normal.woff2', 'Zen Maru Gothic', 500],
  ['zen-maru-gothic', 'zen-maru-gothic-latin-700-normal.woff2', 'Zen Maru Gothic', 700],
];
let css = '';
for (const [pkg, file, family, weight] of FONTS) {
  await cp(r('node_modules', '@fontsource', pkg, 'files', file), path.join(www, 'fonts', file));
  css += `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:swap;src:url(fonts/${file}) format("woff2")}`;
}

let html = await readFile(r('index.html'), 'utf8');
const link = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/;
if (!link.test(html)) throw new Error('Google Fonts link not found in index.html: the app page would still call Google');
html = html.replace(link, `<style>${css}</style>\n<script>window.EMBER_VISION = 'vision_bundle.js'; window.EMBER_APP = true;</script>`);
html = html.replace(/<meta property="og:[^>]*>\n|<meta name="twitter:card"[^>]*>\n/g, '');
if (/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<script>[\s\S]*<\/script>/g, ''))) console.warn('warning: the app page still mentions an outside address outside its scripts');
await writeFile(path.join(www, 'index.html'), html);

// sounds (finished mp3 files only, never the raw downloads) and the hand tracker
await mkdir(path.join(www, 'assets', 'audio'), { recursive: true });
for (const f of await readdir(r('assets', 'audio'))) if (/\.(mp3|js)$/.test(f)) await cp(r('assets', 'audio', f), path.join(www, 'assets', 'audio', f));
await cp(r('vendor', 'mediapipe'), path.join(www, 'vendor', 'mediapipe'), { recursive: true });
await cp(r('vendor', 'mediapipe', 'vision_bundle.mjs'), path.join(www, 'vendor', 'mediapipe', 'vision_bundle.js'));
await cp(r('privacy.html'), path.join(www, 'privacy.html'));
console.log('app/www is ready');

if (!process.argv.includes('--no-sync')) {
  const out = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'], { cwd: root, stdio: 'inherit' });
  if (out.status !== 0) process.exitCode = 1;
}
