// Sound is deliberately NOT generated in code. Every slot below is an empty hook that plays a
// licensed file if you drop one into assets/audio/ with the matching name (see ASSETS.md).
// With no files present the game simply runs silent.
export const SLOTS = {
  music_village: { file: 'music_village.mp3', loop: true, vol: 0.45 },
  music_battle: { file: 'music_battle.mp3', loop: true, vol: 0.55 },
  amb_village: { file: 'amb_village.mp3', loop: true, vol: 0.35 },
  hit: { file: 'sfx_hit.mp3', vol: 0.8 },
  slash: { file: 'sfx_whoosh.mp3', vol: 0.6 },
  jump: { file: 'sfx_jump.mp3', vol: 0.5 },
  dash: { file: 'sfx_dash.mp3', vol: 0.6 },
  special: { file: 'sfx_special.mp3', vol: 0.9 },
  hurt: { file: 'sfx_hurt.mp3', vol: 0.8 },
  slurp: { file: 'sfx_slurp.mp3', vol: 0.8 },
  bell: { file: 'sfx_bell.mp3', vol: 0.9 },
  ui: { file: 'sfx_ui.mp3', vol: 0.5 },
  firework: { file: 'sfx_firework.mp3', vol: 0.8 },
  victory: { file: 'sfx_victory.mp3', vol: 0.9 },
};

export class GameAudio {
  // `files` is the list written by scripts/audio-scan.mjs: only files that really exist are requested.
  constructor(files) {
    this.muted = false; this.ready = {}; this.loops = {};
    if (!files.length || typeof Audio === 'undefined') return;
    for (const k in SLOTS) {
      if (!files.includes(SLOTS[k].file)) continue;
      const a = new Audio();
      a.preload = 'auto'; a.loop = !!SLOTS[k].loop; a.volume = SLOTS[k].vol;
      a.addEventListener('canplaythrough', () => { this.ready[k] = a; }, { once: true });
      a.addEventListener('error', () => { /* no file in this slot: stay silent */ }, { once: true });
      a.src = 'assets/audio/' + SLOTS[k].file;
    }
  }

  play(k) {
    const a = this.ready[k];
    if (!a || this.muted) return;
    if (SLOTS[k].loop) { if (this.loops[k]) return; this.loops[k] = a; a.currentTime = 0; a.play().catch(() => {}); return; }
    const c = a.cloneNode(); c.volume = SLOTS[k].vol; c.play().catch(() => {});
  }

  stop(k) { const a = this.loops[k]; if (a) { a.pause(); delete this.loops[k]; } }
  toggle() { this.muted = !this.muted; for (const k in this.loops) this.loops[k].muted = this.muted; return this.muted; }
}
