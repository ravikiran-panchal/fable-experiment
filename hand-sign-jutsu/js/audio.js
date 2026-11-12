// Plays recorded CC0 sound files from assets/audio. Nothing here generates sound: no oscillators,
// no noise buffers. The Web Audio API is only used to decode and play the files with low delay.
// A missing or broken file is skipped silently so the visuals never depend on audio.

const FILES = ['ui_tick', 'sign_ok', 'cast', 'release', 'sphere', 'lightning', 'eye', 'sand', 'fire', 'valley_gong', 'valley_loop'];
const dir = new URL('../assets/audio/', import.meta.url).href;

class Sounds {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.muted = false;
    try { this.muted = localStorage.getItem('hsj-muted') === '1'; } catch { /* private mode */ }
  }

  // Must be called from a tap or click: browsers keep audio locked until the visitor interacts.
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.gain.value = this.muted ? 0 : 1;
    this.out.connect(this.ctx.destination);
    for (const name of FILES) {
      fetch(`${dir}${name}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((b) => this.ctx.decodeAudioData(b))
        .then((buf) => this.buffers.set(name, buf))
        .catch((err) => console.warn(`Sound "${name}" not loaded`, err));
    }
  }

  // Returns a handle with stop(), or null when the sound is not available.
  play(name, { volume = 1, loop = false, rate = 1 } = {}) {
    const buf = this.buffers.get(name);
    if (!this.ctx || !buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.out);
    src.start();
    return {
      stop: (fade = 0.4) => {
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + fade);
        src.stop(t + fade + 0.05);
      },
    };
  }

  setMuted(m) {
    this.muted = m;
    if (this.out) this.out.gain.value = m ? 0 : 1;
    try { localStorage.setItem('hsj-muted', m ? '1' : '0'); } catch { /* private mode */ }
  }
}

export const sounds = new Sounds();
