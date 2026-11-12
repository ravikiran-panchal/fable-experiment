// Sound is deliberately NOT generated in code. Every slot below plays a real audio file from
// assets/audio/ (see ASSETS.md for the source and licence of each one). A slot with no file is silent.
export const SLOTS = {
  music_village: { file: 'music_village', loop: true, vol: 0.21 }, // -6 dB after the first listen
  music_battle: { file: 'music_battle', loop: true, vol: 0.25 }, // -6 dB after the first listen
  amb_village: { file: 'amb_village', loop: true, vol: 0.3 },
  hit: { file: 'sfx_hit', vol: 0.8 },
  slash: { file: 'sfx_whoosh', vol: 0.55 },
  jump: { file: 'sfx_jump', vol: 0.75 }, // was a soft cloth rustle at 0.45 and got lost under the music
  dash: { file: 'sfx_dash', vol: 0.55 },
  special: { file: 'sfx_special', vol: 0.9 },
  hurt: { file: 'sfx_hurt', vol: 0.8 },
  slurp: { file: 'sfx_slurp', vol: 0.8 },
  bell: { file: 'sfx_bell', vol: 0.36 }, // gong was too loud: about -8 dB
  ui: { file: 'sfx_ui', vol: 0.45 },
  firework: { file: 'sfx_firework', vol: 0.7 },
  victory: { file: 'sfx_victory', vol: 0.45 }, // a full fanfare now, so sits at music level
  // Sign Weaving (CC0 files shared with the Hand Sign Jutsu project)
  sign: { file: 'sfx_sign', vol: 0.6 },
  cast: { file: 'sfx_cast', vol: 0.7 },
  j_comet: { file: 'sfx_j_comet', vol: 0.8 },
  j_storm: { file: 'sfx_j_storm', vol: 0.8 },
  j_eye: { file: 'sfx_j_eye', vol: 0.5 },
  j_ward: { file: 'sfx_j_ward', vol: 0.7 },
  j_panda: { file: 'sfx_j_panda', vol: 0.5 },
  j_breath: { file: 'sfx_j_breath', vol: 0.8 },
  // v3: chapter one
  music_festival: { file: 'music_festival', loop: true, vol: 0.24 },
  coins: { file: 'sfx_coins', vol: 0.7 },
  splash: { file: 'sfx_splash', vol: 0.6 },
  door: { file: 'sfx_door', vol: 0.6 },
  paper: { file: 'sfx_paper', vol: 0.6 },
  pickup: { file: 'sfx_pickup', vol: 0.6 },
  job_done: { file: 'sfx_job_done', vol: 0.6 },
  job_fail: { file: 'sfx_job_fail', vol: 0.5 },
  j_tide: { file: 'sfx_j_tide', vol: 0.7 },
  j_melt: { file: 'sfx_j_melt', vol: 0.8 },
  j_unmake: { file: 'sfx_j_unmake', vol: 0.8 },
  eye_cut: { file: 'sfx_eye_cut', vol: 0.5 },
  // wanted, no file yet (silent until one is added): see ASSETS.md
  music_dream: { file: 'music_dream', loop: true, vol: 0.25 },
  amb_fire: { file: 'amb_fire', loop: true, vol: 0.4 },
};
const PREFER = ['mp3', 'm4a', 'ogg', 'wav'];
const VOICES = 4; // how many copies of one effect can overlap

export class GameAudio {
  // `files` is the list written by scripts/audio-scan.mjs, so only files that exist are requested.
  constructor(files) {
    this.muted = false; this.unlocked = false; this.sfx = {}; this.loops = {}; this.count = 0;
    if (!files || !files.length || typeof Audio === 'undefined') return;
    for (const k in SLOTS) {
      const s = SLOTS[k];
      const name = PREFER.map((e) => `${s.file}.${e}`).find((f) => files.includes(f));
      if (!name) continue;
      const make = () => { const a = new Audio('assets/audio/' + name); a.preload = 'auto'; a.volume = s.loop ? 0 : s.vol; a.loop = !!s.loop; return a; };
      if (s.loop) this.loops[k] = { el: make(), vol: 0, want: 0, max: s.vol, on: false };
      else this.sfx[k] = { els: Array.from({ length: VOICES }, make), i: 0 };
      this.count++;
    }
  }

  // Browsers only allow sound after a tap or key press. Call this from inside that first gesture.
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    // play-then-pause while muted marks each element as allowed; `busy` stops us pausing music that has really started
    const bless = (a, busy = () => false) => { a.muted = true; const p = a.play(); if (p) p.then(() => { if (busy()) return; a.pause(); a.currentTime = 0; a.muted = this.muted; }).catch(() => { if (!busy()) a.muted = this.muted; }); };
    for (const k in this.sfx) this.sfx[k].els.forEach((a) => bless(a));
    for (const k in this.loops) { const l = this.loops[k]; if (!l.on) bless(l.el, () => l.on); }
  }

  play(k) {
    const l = this.loops[k];
    if (l) { l.want = l.max; if (!l.on) { l.on = true; l.el.currentTime = 0; l.el.muted = this.muted; l.el.play().catch(() => { l.on = false; }); } return; }
    const s = this.sfx[k];
    if (!s || this.muted) return;
    const a = s.els[s.i]; s.i = (s.i + 1) % s.els.length;
    try { a.currentTime = 0; } catch { /* not loaded yet */ }
    a.muted = false;
    a.play().catch(() => {});
  }

  stop(k) { const l = this.loops[k]; if (l) l.want = 0; }

  // Smooth fades between the village and battle music.
  update(dt) {
    for (const k in this.loops) {
      const l = this.loops[k];
      if (!l.on) continue;
      l.vol += Math.sign(l.want - l.vol) * Math.min(Math.abs(l.want - l.vol), dt * 0.5);
      l.el.volume = Math.max(0, Math.min(1, l.vol));
      if (l.want === 0 && l.vol <= 0.001) { l.el.pause(); l.on = false; }
    }
  }

  toggle() {
    this.muted = !this.muted;
    for (const k in this.loops) this.loops[k].el.muted = this.muted;
    return this.muted;
  }
}
