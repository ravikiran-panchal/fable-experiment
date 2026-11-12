// Saved progress. The game writes a checkpoint each time the story reaches a new step, in the browser's or
// app's own storage on this device. Nothing is sent anywhere. Starting a new game clears the list.
const KEY = 'will-of-fire-save-v1';

// The story steps you can come back to, in order, with the name shown on the title screen.
export const CHECKPOINTS = {
  explore: 'Home again, before dinner',
  omen: 'Strangers at the pagoda',
  beacon: 'After the duel',
  festival: 'The bonfire',
  inn: 'At the inn desk',
  bath: 'Your room at the inn',
  sleep: 'Before bed',
  morning: 'The next morning',
  academy: 'On the way to the academy',
  showcase: 'The showcase',
  free: 'Free roam',
};

export class Save {
  constructor() {
    this.list = []; this.paused = false; // paused while a checkpoint is being loaded
    try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.list)) this.list = d.list.filter((c) => CHECKPOINTS[c.phase]); } catch { /* no storage here: play without saving */ }
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify({ list: this.list })); } catch { /* storage is blocked or full */ } }
  get latest() { return this.list[this.list.length - 1] || null; }
  reset() { this.list = []; this.write(); }
  // Reaching a step again replaces its old entry and moves it to the end.
  add(phase, hero, coins) {
    if (!CHECKPOINTS[phase] || this.paused) return;
    this.list = this.list.filter((c) => c.phase !== phase);
    this.list.push({ phase, hero, coins, at: Date.now() });
    this.write();
  }
  coins(n) { const c = this.latest; if (c && !this.paused && c.coins !== n) { c.coins = n; this.write(); } }
}
