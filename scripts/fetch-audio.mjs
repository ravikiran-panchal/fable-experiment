// Fills assets/audio/ with CC0 (public-domain) sounds from OpenGameArt and Kenney.nl. No account or key needed.
// Works the same on Windows and macOS. Needs Node 18+ and ffmpeg (Mac: brew install ffmpeg; Windows: winget install ffmpeg).
// Nothing is synthesized: every slot is cut from a real recording or a composer's track (see audio-sources.mjs).
//
//   npm run audio:fetch                 download the sources (once) and fill every empty slot
//   npm run audio:fetch -- --force      rebuild every slot from its current pick
//   npm run audio:next -- sfx_hit       don't like a sound? switch that slot to its next candidate
//   npm run audio:list                  show every slot, its candidates and which one is in use
import { readFile, writeFile, mkdir, access, readdir, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SOURCES } from './audio-sources.mjs';
import { SLOTS } from './audio-slots.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'assets', 'audio');
const srcDir = path.join(dir, '_src');
const statePath = path.join(dir, 'sources.json');
const UA = 'hidden-ember-audio-fetch/1.0 (github.com/ravikiran-panchal/fable-experiment)';

const exists = (p) => access(p).then(() => true, () => false);
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const valueOf = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);

function ffmpeg(a) {
  const bin = process.env.FFMPEG || 'ffmpeg';
  try { return execFileSync(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) {
    if (e.code === 'ENOENT') throw new Error('ffmpeg is not installed. Mac: brew install ffmpeg   Windows: winget install ffmpeg   (then open a new terminal)');
    throw new Error('ffmpeg failed: ' + String(e.stderr || e.message).trim());
  }
}

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  return res;
}

// Kenney's page hands out a short-lived signed link, the same way its Download button does.
async function kenneyUrl(slug) {
  const page = `https://kenney.nl/assets/${slug}`;
  const first = await get(page);
  const cookie = (first.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  const id = Buffer.from(`assets/${slug}`).toString('hex');
  const res = await get(`https://kenney.nl/download-link/${id}`, { Referer: page, Cookie: cookie });
  return { url: (await res.json()).url, headers: { Referer: page, Cookie: cookie } };
}

function unzip(zip, to) {
  try { execFileSync('tar', ['-xf', zip, '-C', to], { stdio: 'ignore' }); } // bsdtar: macOS and Windows 10+
  catch { execFileSync('unzip', ['-oq', zip, '-d', to], { stdio: 'ignore' }); } // Linux fallback
}

async function fetchSource(id) {
  const s = SOURCES[id];
  const to = path.join(srcDir, id);
  if (await exists(path.join(to, '.done'))) return to;
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  const { url, headers } = s.kenney ? await kenneyUrl(s.kenney) : { url: s.url, headers: {} };
  const buf = Buffer.from(await (await get(url, headers)).arrayBuffer());
  const name = s.kenney ? `${s.kenney}.zip` : decodeURIComponent(url.split('/').pop());
  const file = path.join(to, name);
  await writeFile(file, buf);
  if (name.endsWith('.zip')) unzip(file, to);
  await writeFile(path.join(to, '.done'), new Date().toISOString() + '\n');
  console.log(`  downloaded ${s.title} (${(buf.length / 1048576).toFixed(1)} MB) from ${s.site}`);
  return to;
}

async function findFile(base, rel) {
  if (!rel) { // single-file source: the one audio file in the folder
    const f = (await readdir(base)).find((n) => /\.(mp3|ogg|wav|flac)$/i.test(n));
    if (!f) throw new Error(`No audio file in ${base}`);
    return path.join(base, f);
  }
  const walk = async (d) => (await Promise.all((await readdir(d, { withFileTypes: true })).map((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))).flat();
  const want = rel.replace(/\\/g, '/').toLowerCase();
  const hit = (await walk(base)).find((p) => p.replace(/\\/g, '/').toLowerCase().endsWith('/' + want));
  if (!hit) throw new Error(`"${rel}" not found in ${base}`);
  return hit;
}

// Cut, fade and level one candidate into assets/audio/<slot>.mp3
async function render(slot, c) {
  const input = await findFile(await fetchSource(c.src), c.file);
  const a = [];
  if (c.start) a.push('-ss', String(c.start));
  if (c.dur) a.push('-t', String(c.dur));
  a.push('-i', input);
  const f = [];
  if (c.fadeIn) f.push(`afade=t=in:d=${c.fadeIn}`);
  if (c.fadeOut && c.dur) f.push(`afade=t=out:st=${Math.max(0, c.dur - c.fadeOut)}:d=${c.fadeOut}`);
  if (slot.loop) f.push(`loudnorm=I=${slot.lufs}:TP=-1.5:LRA=11`); // music and ambience: even loudness
  else {
    f.push('silenceremove=start_periods=1:start_threshold=-50dB'); // effects start on the frame they're triggered
    // one-shots are too short for loudness metering, so bring the peak to -1 dBFS instead
    const probe = String(spawnSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', ...a, '-af', [...f, 'volumedetect'].join(','), '-f', 'null', '-']).stderr);
    const peak = Number((/max_volume: (-?[\d.]+) dB/.exec(probe) || [])[1] ?? 0);
    f.push(`volume=${(-1 - peak).toFixed(1)}dB`);
  }
  a.push('-af', f.join(','), '-ar', '44100', '-ac', slot.loop ? '2' : '1', '-b:a', slot.loop ? '160k' : '128k', path.join(dir, `${slot.slot}.mp3`));
  ffmpeg(a);
}

const label = (c) => `${SOURCES[c.src].title}${c.file ? ' / ' + c.file : ''}${c.note ? ' (' + c.note + ')' : ''}`;

async function writeReport(state) {
  const rows = SLOTS.map((s) => {
    const c = s.cands[state[s.slot] ?? 0], src = c && SOURCES[c.src];
    if (!c || !(state[s.slot] !== undefined)) return `| \`${s.slot}.mp3\` | *empty* | | | ${s.use} | Run \`npm run audio:fetch\` |`;
    return `| \`${s.slot}.mp3\` | [${label(c).replace(/\|/g, '/')}](${src.page}) by ${src.author} | ${src.site} | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)${src.licNote ? ' (' + src.licNote + ')' : ''} | ${s.use} | None (public domain) |`;
  });
  await writeFile(path.join(dir, 'SOURCES.md'), `# Audio sources\n\nGenerated by \`scripts/fetch-audio.mjs\`. Every file is CC0 (public domain), cut and levelled from the\nsource named here. No attribution is required; this table is the record of where each sound came from.\n\n| File | Asset | Source | Licence | Where used | Your action |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`);
}

async function main() {
  await mkdir(srcDir, { recursive: true });
  const state = (await exists(statePath)) ? JSON.parse(await readFile(statePath, 'utf8')) : {};
  const bySlot = Object.fromEntries(SLOTS.map((s) => [s.slot, s]));

  if (flag('--list')) {
    for (const s of SLOTS) {
      console.log(`\n${s.slot}  (${s.use})`);
      s.cands.forEach((c, i) => console.log(`  ${i === state[s.slot] ? '>' : ' '} ${i + 1}. ${label(c)}`));
    }
    return;
  }

  const next = valueOf('--next');
  if (next) {
    const s = bySlot[next];
    if (!s) throw new Error(`Unknown slot "${next}". Slots: ${SLOTS.map((x) => x.slot).join(', ')}`);
    const pick = valueOf(next) ? Number(valueOf(next)) - 1 : ((state[next] ?? -1) + 1) % s.cands.length;
    await render(s, s.cands[pick]);
    state[next] = pick;
    console.log(`${next}: now ${pick + 1} of ${s.cands.length}: ${label(s.cands[pick])}`);
  } else {
    for (const s of SLOTS) {
      const have = state[s.slot] !== undefined && (await exists(path.join(dir, `${s.slot}.mp3`)));
      if (have && !flag('--force')) { console.log(`${s.slot}: kept`); continue; }
      const pick = state[s.slot] ?? 0;
      await render(s, s.cands[pick]);
      state[s.slot] = pick;
      console.log(`${s.slot}: ${label(s.cands[pick])}  (+${s.cands.length - 1} alternatives)`);
      await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
    }
  }
  await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
  await writeReport(state);
  await import('./build.mjs'); // refresh the file list and rebuild play.html / index.html
  console.log('\nDone. Open play.html to listen. Swap a sound with:  npm run audio:next -- <slot>');
}

if (flag('--download-only')) {
  await mkdir(srcDir, { recursive: true });
  for (const id of Object.keys(SOURCES)) await fetchSource(id);
} else main().catch((e) => { console.error('\n' + e.message); process.exitCode = 1; });
