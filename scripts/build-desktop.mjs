// Packs the game for the desktop app (desktop/www). Works the same on Windows and macOS.
// Usage: npm run desktop          then, inside desktop/:  npm start   (run it)   or   npm run mas   (Mac App Store build)
import { rm, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-app.mjs'), '--no-sync'], { cwd: root, stdio: 'inherit' });
if (out.status !== 0) process.exit(1);
await rm(path.join(root, 'desktop', 'www'), { recursive: true, force: true });
await cp(path.join(root, 'app', 'www'), path.join(root, 'desktop', 'www'), { recursive: true });
await cp(path.join(root, 'store', 'graphics', 'icon-1024.png'), path.join(root, 'desktop', 'icon.png'));
console.log('desktop/www is ready');
