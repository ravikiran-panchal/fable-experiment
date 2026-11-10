// Fills assets/audio/ with CC0 (public-domain) sounds from Freesound, using YOUR free API key.
// Works the same on Windows and macOS. Needs Node 18 or newer. Nothing is synthesized.
//
//   node scripts/fetch-audio.mjs              fill every empty slot
//   node scripts/fetch-audio.mjs --force      re-pick every slot from scratch
//   node scripts/fetch-audio.mjs --next sfx_hit      don't like a sound? switch that slot to the next candidate
//   node scripts/fetch-audio.mjs --list       show what is in each slot and the alternatives
//
// The key: create one at https://freesound.org/apiv2/apply and copy "Client secret/Api key".
// The script asks for it once and keeps it in .freesound-key (ignored by git, never uploaded).
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'assets', 'audio');
const statePath = path.join(dir, 'sources.json');
const keyPath = path.join(root, '.freesound-key');
const CC0 = 'publicdomain/zero';
const KEEP = 6; // candidates remembered per slot

// What each slot needs: search phrases (tried in order) and a sensible length in seconds.
const SLOTS = [
  { slot: 'music_village', use: 'Exploring the village (loops)', dur: [30, 240], q: ['koto loop', 'japanese calm music loop', 'shamisen loop', 'asian ambient music loop', 'calm flute loop'] },
  { slot: 'music_battle', use: 'Boss duel (loops)', dur: [20, 240], q: ['taiko loop', 'japanese battle music loop', 'epic drums loop', 'war drums loop'] },
  { slot: 'amb_village', use: 'Background ambience (loops)', dur: [30, 300], q: ['birds stream ambience', 'village ambience birds', 'forest birds morning ambience'] },
  { slot: 'sfx_hit', use: 'Every landed strike', dur: [0.05, 1.2], q: ['punch impact', 'punch hit', 'body hit'] },
  { slot: 'sfx_whoosh', use: 'Strike swing, throwing star', dur: [0.1, 1.0], q: ['sword swing whoosh', 'swing whoosh', 'swoosh'] },
  { slot: 'sfx_jump', use: 'Jump', dur: [0.1, 1.0], q: ['cloth swoosh', 'jump whoosh', 'jump'] },
  { slot: 'sfx_dash', use: 'Dash', dur: [0.15, 1.2], q: ['fast whoosh', 'dash swoosh', 'whoosh'] },
  { slot: 'sfx_special', use: 'Special move', dur: [0.5, 3.5], q: ['energy blast', 'magic spell blast', 'magic impact'] },
  { slot: 'sfx_hurt', use: 'Player takes damage', dur: [0.1, 1.5], q: ['body impact thud', 'heavy punch', 'hit impact'] },
  { slot: 'sfx_slurp', use: 'Ramen scene', dur: [0.5, 6], q: ['slurp noodles', 'slurp soup', 'slurp'] },
  { slot: 'sfx_bell', use: 'Omen and beacon', dur: [2, 14], q: ['temple bell', 'japanese bell', 'gong'] },
  { slot: 'sfx_ui', use: 'Dialogue advance', dur: [0.02, 0.5], q: ['wood click', 'soft click', 'tick'] },
  { slot: 'sfx_firework', use: 'Finale', dur: [0.8, 6], q: ['firework explosion', 'firework burst', 'fireworks'] },
  { slot: 'sfx_victory', use: 'Duel won', dur: [1.5, 9], q: ['victory fanfare', 'success jingle', 'win jingle'] },
];

const exists = (p) => access(p).then(() => true, () => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const valueOf = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);

async function getKey() {
  if (process.env.FREESOUND_API_KEY) return process.env.FREESOUND_API_KEY.trim();
  if (await exists(keyPath)) return (await readFile(keyPath, 'utf8')).trim();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nA free Freesound API key is needed (https://freesound.org/apiv2/apply, copy "Client secret/Api key").');
  const key = (await rl.question('Paste the key here and press Enter: ')).trim();
  rl.close();
  if (!key) throw new Error('No key entered.');
  await writeFile(keyPath, key + '\n');
  console.log('Saved to .freesound-key (git ignores this file).');
  return key;
}

async function search(key, query, [dmin, dmax]) {
  const fields = 'id,name,username,license,duration,avg_rating,num_ratings,num_downloads,previews';
  const attempt = async (filter) => {
    const url = 'https://freesound.org/apiv2/search/text/?' + new URLSearchParams({ query, filter, sort: 'rating_desc', page_size: '30', fields });
    const res = await fetch(url, { headers: { Authorization: `Token ${key}` } });
    if (res.status === 401) throw new Error('Freesound rejected the key. Delete .freesound-key and run again with the "Client secret/Api key" value.');
    if (res.status === 429) throw new Error('Freesound says too many requests for now. Wait a few minutes and run again; finished slots are kept.');
    if (!res.ok) return null;
    return (await res.json()).results || [];
  };
  const base = `license:"Creative Commons 0" duration:[${dmin} TO ${dmax}]`;
  return (await attempt(`${base} num_ratings:[2 TO *]`)) ?? (await attempt(base)) ?? [];
}

// Well-rated and widely used first.
const score = (r) => (r.avg_rating || 0) * Math.log10(10 + (r.num_downloads || 0)) * Math.min(1, (r.num_ratings || 0) / 5 + 0.4);

async function candidatesFor(key, s) {
  const seen = new Map();
  for (const q of s.q) {
    for (const r of await search(key, q, s.dur)) {
      if (!String(r.license).includes(CC0) || !r.previews?.['preview-hq-mp3'] || seen.has(r.id)) continue;
      seen.set(r.id, { id: r.id, name: r.name, author: r.username, license: 'CC0 1.0', licenseUrl: r.license, seconds: Math.round(r.duration * 10) / 10,
        rating: Math.round((r.avg_rating || 0) * 10) / 10, downloads: r.num_downloads || 0, page: `https://freesound.org/s/${r.id}/`, preview: r.previews['preview-hq-mp3'], score: score(r), query: q });
    }
    if (seen.size >= KEEP) break;
    await sleep(350);
  }
  return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, KEEP);
}

async function download(c, slot) {
  const res = await fetch(c.preview);
  if (!res.ok) throw new Error(`Download failed for ${c.page} (${res.status})`);
  await writeFile(path.join(dir, `${slot}.mp3`), Buffer.from(await res.arrayBuffer()));
}

async function writeReport(state) {
  const rows = SLOTS.map((s) => {
    const e = state[s.slot], c = e?.candidates?.[e.chosen];
    return c ? `| \`${s.slot}.mp3\` | [${c.name.replace(/\|/g, '/')}](${c.page}) by ${c.author} | Freesound | [${c.license}](${c.licenseUrl}) | ${s.use} | None (public domain) |`
      : `| \`${s.slot}.mp3\` | *empty* | | | ${s.use} | Run the fetch script or add a CC0 file |`;
  });
  await writeFile(path.join(dir, 'SOURCES.md'), `# Audio sources\n\nGenerated by \`scripts/fetch-audio.mjs\`. Every file is CC0 (public domain), fetched from Freesound as its\nstandard high-quality mp3 preview. No attribution is required; this table is the record of where each came from.\n\n| File | Asset | Source | Licence | Where used | Your action |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`);
}

async function main() {
  await mkdir(dir, { recursive: true });
  const state = (await exists(statePath)) ? JSON.parse(await readFile(statePath, 'utf8')) : {};

  if (flag('--list')) {
    for (const s of SLOTS) {
      const e = state[s.slot];
      console.log(`\n${s.slot}  (${s.use})`);
      if (!e) { console.log('   empty'); continue; }
      e.candidates.forEach((c, i) => console.log(`  ${i === e.chosen ? '>' : ' '} ${i + 1}. ${c.name}  [${c.seconds}s, rating ${c.rating}]  ${c.page}`));
    }
    return;
  }

  const next = valueOf('--next');
  if (next) {
    const e = state[next];
    if (!e) throw new Error(`No candidates stored for "${next}". Slots: ${SLOTS.map((s) => s.slot).join(', ')}`);
    e.chosen = (e.chosen + 1) % e.candidates.length;
    const c = e.candidates[e.chosen];
    await download(c, next);
    console.log(`${next}: now "${c.name}" by ${c.author} (${e.chosen + 1} of ${e.candidates.length})  ${c.page}`);
  } else {
    const key = await getKey();
    for (const s of SLOTS) {
      const have = state[s.slot] && (await exists(path.join(dir, `${s.slot}.mp3`)));
      if (have && !flag('--force')) { console.log(`${s.slot}: kept`); continue; }
      const list = await candidatesFor(key, s);
      if (!list.length) { console.log(`${s.slot}: nothing CC0 found, left silent`); delete state[s.slot]; continue; }
      state[s.slot] = { chosen: 0, candidates: list };
      await download(list[0], s.slot);
      console.log(`${s.slot}: "${list[0].name}" by ${list[0].author}  (+${list.length - 1} alternatives)`);
      await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
    }
  }
  await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
  await writeReport(state);
  await import('./build.mjs'); // refresh the file list and rebuild play.html / index.html
  console.log('\nDone. Open play.html to listen. Swap any sound with:  node scripts/fetch-audio.mjs --next <slot>');
}

main().catch((e) => { console.error('\n' + e.message); process.exitCode = 1; });
