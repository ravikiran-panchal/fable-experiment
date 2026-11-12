// Starts the desktop app in a special mode. Works the same on Windows and macOS.
//   node scripts/run-electron.mjs test    start the game with no window and print what works
//   node scripts/run-electron.mjs shots   take the store screenshots into store/graphics/
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const desktop = path.join(root, 'desktop');
const electron = createRequire(path.join(desktop, 'package.json'))('electron'); // path to the Electron program
const mode = process.argv[2];
const env = { ...process.env, ...(mode === 'shots' ? { EMBER_SHOTS: path.join(root, 'store', 'graphics') } : { EMBER_SELFTEST: '1' }) };
const out = spawnSync(electron, [desktop], { env, stdio: 'inherit' });
process.exit(out.status ?? 1);
