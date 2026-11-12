// Bundles the game into ONE html file that runs by double-click on Windows and macOS.
// Usage: node scripts/build.mjs
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);

async function bundle() {
  const out = await build({
    entryPoints: [r('src', 'main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020',
    write: false, legalComments: 'none',
  });
  return out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

await import('./audio-scan.mjs');
const css = await readFile(r('web', 'style.css'), 'utf8');
const body = await readFile(r('web', 'body.html'), 'utf8');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Maru+Gothic:wght@500;700&display=swap">';
const head = `<title>Will of Fire: The Last Ember</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n<style>\n${css}\n</style>`;

await mkdir(r('dist'), { recursive: true });

const SITE = 'https://ravikiran-panchal.github.io/fable-experiment/';
const DESC = 'Will of Fire: The Last Ember. A playable 3D anime ninja village built entirely from code. Weave hand signs into jutsu, duel two rogues at the pagoda and light the beacon.';
const share = `<meta name="description" content="${DESC}">\n<meta property="og:type" content="website">\n<meta property="og:title" content="Will of Fire: The Last Ember">\n<meta property="og:description" content="${DESC}">\n<meta property="og:url" content="${SITE}">\n<meta property="og:image" content="${SITE}cover.jpg">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="theme-color" content="#0e0b16">`;
const js = await bundle();

// 1) The game as one file. play.html is for double-clicking; index.html is the same file for the public
//    GitHub Pages link. Both read assets/audio/ next to them.
const page = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${share}\n${head}\n</head>\n<body>\n${body}\n<script src="assets/audio/audio-list.js"></script>\n<script>\n${js}\n</script>\n</body>\n</html>\n`;
await writeFile(r('play.html'), page);
await writeFile(r('index.html'), page);

// 2) Page fragment for the Claude artifact link (the host adds its own html/head/body wrapper). Always silent.
await writeFile(r('dist', 'will-of-fire.artifact.html'), `${head}\n${body}\n<script>\n${js}\n</script>\n`);

console.log('built play.html + index.html', (Buffer.byteLength(js) / 1024).toFixed(0) + ' KB', '| dist/will-of-fire.artifact.html');
