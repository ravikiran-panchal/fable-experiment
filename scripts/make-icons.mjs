// Makes every icon, splash and store image from store/graphics/icon-1024.png and cover.jpg.
// Works the same on Windows and macOS. Needs ffmpeg.   Usage: npm run icons
// icon-1024.png is a render of store/graphics/icon.svg (any SVG tool can re-export it at 1024 x 1024).
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const G = r('store', 'graphics'), RES = r('android', 'app', 'src', 'main', 'res'), ICON = path.join(G, 'icon-1024.png');
const ff = (...a) => execFileSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
const probe = (f) => String(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', f])).trim().split('x').map(Number);
const ZOOM = 'crop=840:840'; // trims the empty border so the ember fills small icons

// Play Store listing images
ff('-i', ICON, '-vf', `${ZOOM},scale=512:512:flags=lanczos`, path.join(G, 'play-icon-512.png'));
ff('-i', r('cover.jpg'), '-vf', 'scale=1024:-2:flags=lanczos,crop=1024:500:0:0', path.join(G, 'feature-graphic-1024x500.png'));

// launcher icons for old Android versions (new ones use the vector drawing in drawable/ic_launcher_foreground.xml)
for (const [name, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const dir = path.join(RES, `mipmap-${name}`);
  ff('-i', ICON, '-vf', `${ZOOM},scale=${s}:${s}:flags=lanczos`, path.join(dir, 'ic_launcher.png'));
  ff('-i', ICON, '-vf', `${ZOOM},scale=${s}:${s}:flags=lanczos,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-W/2,Y-H/2),W/2),255,0)'`, path.join(dir, 'ic_launcher_round.png'));
  rmSync(path.join(dir, 'ic_launcher_foreground.png'), { force: true });
}

// splash screens: the icon on the game's dark background, at whatever size each file already is
let n = 0;
for (const d of readdirSync(RES)) {
  const f = path.join(RES, d, 'splash.png');
  try { statSync(f); } catch { continue; }
  const [w, h] = probe(f), m = Math.round(Math.min(w, h) * 0.4);
  ff('-f', 'lavfi', '-i', `color=c=0x0e0b16:s=${w}x${h}`, '-i', ICON, '-filter_complex', `[1]${ZOOM},scale=${m}:${m}:flags=lanczos[i];[0][i]overlay=(W-w)/2:(H-h)/2`, '-frames:v', '1', f);
  n++;
}
console.log(`icons done: 2 store images, 10 launcher icons, ${n} splash screens`);
