// What goes in each game sound slot. `cands` are tried in order; `npm run audio:next -- <slot>` steps through them.
// src = an id from audio-sources.mjs, file = the file inside that pack, start/dur = trim in seconds.
// Loops are levelled to a loudness target; one-shot effects are peak-normalised.
export const SLOTS = [
  { slot: 'music_village', use: 'Exploring the village (loops)', loop: true, lufs: -18, cands: [
    { src: 'hot_springs', note: 'Japanese town theme, 2:40' },
    { src: 'tyhosiasian', note: 'Japanese "plinky" town tune, 3:29' },
  ] },
  { slot: 'music_battle', use: 'Boss duel (loops)', loop: true, lufs: -16, cands: [
    { src: 'boss_koto', note: 'koto boss theme, 1:41' },
    { src: 'jp_fight', note: 'looping Japanese fight track, 1:04' },
    { src: 'komiku_fight', note: 'orchestral adventure fight, 3:08' },
  ] },
  { slot: 'amb_village', use: 'Background ambience (loops)', loop: true, lufs: -24, cands: [
    { src: 'forest_amb', note: 'seamless forest loop, 0:45' },
  ] },
  { slot: 'sfx_hit', use: 'Every landed strike', cands: [
    { src: 'k_impact', file: 'Audio/impactPunch_medium_000.ogg' },
    { src: 'k_impact', file: 'Audio/impactPunch_heavy_001.ogg' },
    { src: 'k_impact', file: 'Audio/impactSoft_heavy_000.ogg' },
    { src: 'sfx100', file: 'hit_03.ogg' },
  ] },
  { slot: 'sfx_hurt', use: 'Player takes damage', cands: [
    { src: 'k_impact', file: 'Audio/impactPunch_heavy_000.ogg' },
    { src: 'k_impact', file: 'Audio/impactSoft_heavy_002.ogg' },
    { src: 'sfx100', file: 'hit_04.ogg' },
  ] },
  { slot: 'sfx_whoosh', use: 'Strike swing, throwing star', cands: [
    { src: 'swishes', file: 'swishes/swish-7.wav' },
    { src: 'swishes', file: 'swishes/swish-3.wav' },
    { src: 'rpg80', file: 'blade_01.ogg' },
    { src: 'swishes', file: 'swishes/swish-1.wav' },
  ] },
  { slot: 'sfx_dash', use: 'Dash', cands: [
    { src: 'swishes', file: 'swishes/swish-9.wav' },
    { src: 'swishes', file: 'swishes/swish-8.wav' },
    { src: 'rpg80', file: 'blade_03.ogg' },
  ] },
  { slot: 'sfx_jump', use: 'Jump', cands: [
    { src: 'k_rpg', file: 'Audio/cloth1.ogg' },
    { src: 'k_rpg', file: 'Audio/cloth3.ogg' },
    { src: 'swishes', file: 'swishes/swish-12.wav' },
  ] },
  { slot: 'sfx_special', use: 'Special move', cands: [
    { src: 'magic4', note: 'spell cast, 2.4 s' },
    { src: 'rpg80', file: 'spell_fire_03.ogg' },
    { src: 'magic1', note: 'spell cast, 1.6 s' },
    { src: 'rpg80', file: 'spell_fire_04.ogg' },
  ] },
  { slot: 'sfx_slurp', use: 'Ramen scene (no CC0 slurp found: chopsticks and bowl instead)', cands: [
    { src: 'cutlery_pick' },
    { src: 'sfx100', file: 'dishes_01.ogg' },
    { src: 'cutlery_fork' },
    { src: 'cutlery_drop' },
  ] },
  { slot: 'sfx_bell', use: 'Omen and beacon', cands: [
    { src: 'sfx100', file: 'gong_01.ogg' },
    { src: 'k_impact', file: 'Audio/impactBell_heavy_001.ogg' },
    { src: 'sfx100', file: 'bell_03.ogg' },
    { src: 'sfx100', file: 'gong_02.ogg' },
  ] },
  { slot: 'sfx_ui', use: 'Dialogue advance', cands: [
    { src: 'k_ui', file: 'Audio/click_001.ogg' },
    { src: 'k_ui', file: 'Audio/select_003.ogg' },
    { src: 'k_ui', file: 'Audio/pluck_002.ogg' },
    { src: 'k_impact', file: 'Audio/impactWood_heavy_000.ogg' },
  ] },
  { slot: 'sfx_firework', use: 'Finale', cands: [
    { src: 'bang25', file: 'fw_04.ogg' },
    { src: 'bang25', file: 'fw_03.ogg' },
    { src: 'bang25', file: 'fw_06.ogg' },
    { src: 'bang25', file: 'fw_01.ogg' },
  ] },
  { slot: 'sfx_victory', use: 'Duel won', cands: [
    { src: 'fanfares10', start: 41.1, dur: 6.3, fadeOut: 0.6, note: 'East Asian fanfare, 6 s' },
    { src: 'fanfares10', start: 54.8, dur: 8.6, fadeOut: 0.6, note: 'East Asian fanfare, 8.5 s' },
    { src: 'fanfares10', start: 47.95, dur: 6.6, fadeOut: 0.6, note: 'East Asian fanfare, 6.5 s' },
    { src: 'fanfares10', start: 0, dur: 5.6, fadeOut: 0.5, note: 'East Asian fanfare, 5.5 s' },
    { src: 'fanfares10', start: 20.5, dur: 5.0, fadeOut: 0.5, note: 'East Asian fanfare, 5 s' },
    { src: 'k_jingles', file: 'Audio/Steel jingles/jingles_STEEL07.ogg' },
    { src: 'k_jingles', file: 'Audio/Pizzicato jingles/jingles_PIZZI07.ogg' },
    { src: 'k_jingles', file: 'Audio/8-Bit jingles/jingles_NES00.ogg' },
    { src: 'k_jingles', file: 'Audio/Sax jingles/jingles_SAX07.ogg' },
  ] },
];
