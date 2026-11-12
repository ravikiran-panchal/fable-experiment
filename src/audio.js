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
const DIR = 'assets/audio/';
const FIRST = ['music_village', 'amb_village']; // what the opening scene plays: these download before anything else
const FIRST_SFX = ['ui', 'bell', 'jump', 'slash', 'hit', 'dash'];

// How the sound is loaded matters on a phone connection:
// - Music and ambience (long files) each stream through one <audio> element. Only the opening pair is
//   fetched up front; the rest are fetched one at a time once the game is running.
// - Short effects are fetched one at a time and played through Web Audio, so there is one small download
//   per effect. (The old way made four <audio> elements per effect, about 130 downloads at once, and the
//   music ran dry a few seconds in on a slow connection.)
// - Opened by double-click (file://), effects fall back to <audio> elements, because fetch is not allowed there.
export class GameAudio {
  // `files` is the list written by scripts/audio-scan.mjs, so only files that exist are requested.
  constructor(files) {
    this.muted = false; this.unlocked = false; this.sfx = {}; this.loops = {}; this.count = 0; this.ctx = null;
    if (!files || !files.length || typeof Audio === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.web = !!AC && typeof fetch === 'function' && location.protocol !== 'file:';
    this.AC = AC;
    // Safari (and every iPhone browser) only lets an <audio> element play later if it was started inside a tap.
    this.bless = !/Chrome|Chromium|Firefox|Edg\//.test(navigator.userAgent);
    for (const k in SLOTS) {
      const s = SLOTS[k];
      const name = PREFER.map((e) => `${s.file}.${e}`).find((f) => files.includes(f));
      if (!name) continue;
      if (s.loop) {
        const el = new Audio(); el.preload = FIRST.includes(k) ? 'auto' : 'none'; el.src = DIR + name; el.loop = true; el.volume = 0;
        this.loops[k] = { el, vol: 0, want: 0, max: s.vol, on: false, retry: 0 };
      } else if (this.web) this.sfx[k] = { url: DIR + name, vol: s.vol, buf: null, raw: null };
      else this.sfx[k] = { vol: s.vol, els: [0, 1].map(() => { const a = new Audio(DIR + name); a.preload = 'auto'; a.volume = s.vol; return a; }), i: 0 };
      this.count++;
    }
    if (this.web) this.fetchSfx();
  }

  // Effects download one after another (most used first), so they never crowd out the music.
  async fetchSfx() {
    const order = [...FIRST_SFX.filter((k) => this.sfx[k]), ...Object.keys(this.sfx).filter((k) => !FIRST_SFX.includes(k))];
    for (const k of order) {
      const s = this.sfx[k];
      try { const r = await fetch(s.url); if (!r.ok) continue; s.raw = await r.arrayBuffer(); this.decode(s); } catch { /* stays silent */ }
    }
  }
  decode(s) {
    if (!this.ctx || !s.raw || s.buf) return;
    const raw = s.raw; s.raw = null;
    try { this.ctx.decodeAudioData(raw, (b) => { s.buf = b; }, () => {}); } catch { /* stays silent */ }
  }

  // Browsers only allow sound after a tap or key press. Call this from inside that first gesture.
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.web) {
      try {
        this.ctx = new this.AC(); this.out = this.ctx.createGain(); this.out.connect(this.ctx.destination);
        this.ctx.resume?.();
        for (const k in this.sfx) this.decode(this.sfx[k]);
      } catch { this.ctx = null; }
    }
    if (this.bless) {
      // play-then-pause while muted marks each element as allowed; `busy` stops us pausing music that has really started
      const bless = (a, busy = () => false) => { a.muted = true; const p = a.play(); if (p) p.then(() => { if (busy()) return; a.pause(); a.currentTime = 0; a.muted = this.muted; }).catch(() => { if (!busy()) a.muted = this.muted; }); };
      if (!this.web) for (const k in this.sfx) this.sfx[k].els.forEach((a) => bless(a));
      for (const k in this.loops) { const l = this.loops[k]; if (!l.on) bless(l.el, () => l.on); }
    } else this.warm();
    // coming back to the tab (or out of a phone call): wake the sound up again
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.ctx?.resume?.(); });
  }

  // Fetch the later music one track at a time, each waiting for the one before, so the first battle or
  // festival does not open with a silent gap and the music already playing is never starved.
  async warm() {
    const ready = (el) => new Promise((res) => {
      if (el.readyState >= 4) { res(); return; }
      const done = () => { clearTimeout(t); res(); }, t = setTimeout(done, 30000);
      el.addEventListener('canplaythrough', done, { once: true }); el.addEventListener('error', done, { once: true });
    });
    for (const k of FIRST) if (this.loops[k]) await ready(this.loops[k].el);
    for (const k in this.loops) {
      const el = this.loops[k].el;
      if (el.preload !== 'none') continue;
      el.preload = 'auto';
      if (!this.loops[k].on) el.load();
      await ready(el);
    }
  }

  play(k) {
    const l = this.loops[k];
    if (l) { l.want = l.max; if (!l.on) { l.on = true; l.retry = 0; try { l.el.currentTime = 0; } catch { /* not loaded yet */ } l.el.muted = this.muted; l.el.play().catch(() => {}); } return; }
    const s = this.sfx[k];
    if (!s || this.muted) return;
    if (this.web) {
      if (!this.ctx || !s.buf) return; // not downloaded yet: skip this one rather than play it late
      if (this.ctx.state !== 'running') this.ctx.resume?.();
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = s.buf; g.gain.value = s.vol; src.connect(g); g.connect(this.out); src.start();
      return;
    }
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
      if (l.want === 0 && l.vol <= 0.001) { l.el.pause(); l.on = false; continue; }
      // music that should be playing but is paused (the phone took the speaker, or the first try was refused): try again once a second
      if (l.el.paused && (l.retry += dt) > 1) { l.retry = 0; l.el.play().catch(() => {}); }
    }
  }

  toggle() {
    this.muted = !this.muted;
    for (const k in this.loops) this.loops[k].el.muted = this.muted;
    return this.muted;
  }
}
