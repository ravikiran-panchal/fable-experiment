// Bundles the game into ONE html file that runs by double-click on Windows and macOS.
// Usage: node scripts/build.mjs
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);

async function bundle(audio) {
  const out = await build({
    entryPoints: [r('src', 'main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020',
    write: false, legalComments: 'none', define: { __AUDIO__: String(audio) },
  });
  return out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

await import('./audio-scan.mjs');
const css = await readFile(r('web', 'style.css'), 'utf8');
const body = await readFile(r('web', 'body.html'), 'utf8');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Maru+Gothic:wght@500;700&display=swap">';
const head = `<title>Hidden Ember</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n<style>\n${css}\n</style>`;

await mkdir(r('dist'), { recursive: true });

// 1) Standalone file: open play.html directly. Audio hooks on (reads assets/audio/ next to it if present).
const jsLocal = await bundle(true);
await writeFile(r('play.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n<script src="assets/audio/audio-list.js"></script>\n<script>\n${jsLocal}\n</script>\n</body>\n</html>\n`);

// 2) Page fragment for publishing as a Claude artifact (the host adds its own html/head/body wrapper). No audio lookups.
const jsWeb = await bundle(false);
await writeFile(r('dist', 'hidden-ember.artifact.html'), `${head}\n${body}\n<script>\n${jsWeb}\n</script>\n`);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('built play.html', kb(jsLocal), '| dist/hidden-ember.artifact.html', kb(jsWeb));
