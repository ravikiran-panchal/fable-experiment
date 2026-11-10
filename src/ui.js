import * as THREE from 'three';
import { clamp } from './util.js';
import { POI } from './world.js';

const $ = (s) => document.querySelector(s);
const hex = (c) => '#' + new THREE.Color(c).getHexString();
const V = new THREE.Vector3();

export class UI {
  constructor(G) {
    this.G = G;
    this.app = $('#app');
    this.el = {
      hud: $('#hud'), hp: $('#hp'), hpLag: $('#hp-lag'), ki: $('#ki'), kiMeter: $('.meter.ki'), buff: $('#buff'), look: $('#look-name'),
      foes: $('#foes'), foe: [$('#foe0'), $('#foe1')], objective: $('#objective'), prompt: $('#prompt'), dialog: $('#dialog'),
      card: $('#card'), callout: $('#callout'), toast: $('#toast'), fade: $('#fade'), dmg: $('#dmg'), vignette: $('#vignette'),
      title: $('#title'), heroes: $('#heroes'), start: $('#start'), map: $('#minimap'), tInteract: $('#t-interact'),
    };
    this.dialogState = null; this.toastT = 0; this.cardT = 0; this.calloutT = 0;
    this.el.dialog.addEventListener('click', () => this.advance());
    this.el.dialog.addEventListener('touchend', (e) => { e.preventDefault(); this.advance(); });
    this.mapCtx = this.el.map.getContext('2d');
    this.mapBase = null;
  }

  // ---- title ----
  buildTitle(heroes, onPick, onStart) {
    this.el.heroes.innerHTML = '';
    heroes.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hero'; b.id = 'hero-' + h.id; b.style.setProperty('--c', hex(h.color));
      const pips = (n) => Array.from({ length: 5 }, (_, k) => `<u class="${k < n ? 'on' : ''}"></u>`).join('');
      b.innerHTML = `<b>${h.name}</b><i>${h.title}</i><p>${h.blurb}</p><dl><dt>Power</dt><dd>${pips(h.stats.power)}</dd><dt>Speed</dt><dd>${pips(h.stats.speed)}</dd><dt>Reach</dt><dd>${pips(h.stats.reach)}</dd></dl><em>${h.special}</em>`;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', () => { this.pick(i); onPick(i); });
      this.el.heroes.appendChild(b);
    });
    this.el.start.addEventListener('click', onStart);
  }
  pick(i) { [...this.el.heroes.children].forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false')); }
  hideTitle() { this.el.title.hidden = true; }

  setHero(h) {
    document.documentElement.style.setProperty('--hero', hex(h.color));
    $('#hero-name').textContent = h.name; $('#hero-title').textContent = h.title; $('#key-special').textContent = h.special;
    this.el.hud.hidden = false;
  }

  // ---- HUD ----
  bars(p) {
    const hp = clamp(p.hp / p.maxHp, 0, 1), ki = clamp(p.ki / p.maxKi, 0, 1);
    this.el.hp.style.transform = `scaleX(${hp})`; this.el.hpLag.style.transform = `scaleX(${hp})`;
    this.el.ki.style.transform = `scaleX(${ki})`;
    this.el.kiMeter.classList.toggle('ready', p.ki >= 40);
    this.el.buff.hidden = !(p.fed > 0);
  }
  foes(list) {
    this.el.foes.hidden = !list;
    if (list) list.forEach((f, i) => { this.el.foe[i].style.transform = `scaleX(${clamp(f.hp / f.maxHp, 0, 1)})`; });
  }
  objective(t) { this.el.objective.textContent = t; }
  lookName(t) { this.el.look.textContent = t; }
  prompt(t) {
    this.el.prompt.hidden = !t;
    if (t) this.el.prompt.lastElementChild.textContent = t;
    this.el.tInteract.style.borderColor = t ? 'var(--ember)' : '';
  }
  cine(on) { this.app.classList.toggle('cine', on); }
  hudHidden(on) { this.app.classList.toggle('nohud', on); }
  hurt() { const v = this.el.vignette; v.classList.remove('hurt'); void v.offsetWidth; v.classList.add('hurt'); }
  fade(on) { this.el.fade.classList.toggle('on', on); return this.G.wait(0.55); }

  toast(t, dur = 2.2) { this.el.toast.textContent = t; this.el.toast.hidden = false; this.toastT = dur; }
  card(title, sub = '', dur = 3) {
    const c = this.el.card;
    c.querySelector('h2').textContent = title; c.querySelector('.card-sub').textContent = sub;
    c.hidden = true; void c.offsetWidth; c.hidden = false; this.cardT = dur;
  }
  callout(t, foe = false) {
    const c = this.el.callout;
    c.textContent = t + '!'; c.classList.toggle('foe', foe);
    c.hidden = true; void c.offsetWidth; c.hidden = false; this.calloutT = 1.1;
  }

  damage(pos, n, big = false, self = false) {
    V.copy(pos).project(this.G.camera);
    if (V.z > 1) return;
    const d = document.createElement('div');
    d.className = 'dmg' + (big ? ' big' : '') + (self ? ' self' : '');
    d.textContent = Math.round(n);
    d.style.left = ((V.x * 0.5 + 0.5) * 100 + (Math.random() - 0.5) * 4) + '%';
    d.style.top = ((-V.y * 0.5 + 0.5) * 100) + '%';
    this.el.dmg.appendChild(d);
    setTimeout(() => d.remove(), 800);
  }

  // ---- dialogue ----
  say(who, text, color) {
    return new Promise((resolve) => {
      const d = this.el.dialog;
      d.hidden = false;
      d.style.borderLeftColor = color ? hex(color) : '';
      const w = d.querySelector('.who'); w.textContent = who || ''; w.style.color = color ? hex(color) : '';
      this.dialogState = { text, n: 0, resolve, line: d.querySelector('.line'), hold: 0.25 };
      this.dialogState.line.textContent = '';
    });
  }
  advance() {
    const s = this.dialogState;
    if (!s || s.hold > 0) return;
    if (s.n < s.text.length) { s.n = s.text.length; s.line.textContent = s.text; s.hold = 0.15; return; }
    this.dialogState = null; this.el.dialog.hidden = true; this.G.audio.play('ui');
    s.resolve();
  }
  get talking() { return !!this.dialogState; }

  update(dt, input) {
    const s = this.dialogState;
    if (s) {
      s.hold -= dt;
      if (s.n < s.text.length) { s.n = Math.min(s.text.length, s.n + dt * 46); s.line.textContent = s.text.slice(0, Math.floor(s.n)); }
      if (input.hit('interact') || input.hit('jump') || input.hit('attack')) this.advance();
    }
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.el.toast.hidden = true;
    if (this.cardT > 0 && (this.cardT -= dt) <= 0) this.el.card.hidden = true;
    if (this.calloutT > 0 && (this.calloutT -= dt) <= 0) this.el.callout.hidden = true;
  }

  // ---- minimap ----
  buildMap(world) {
    const S = 300, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'), P = (v) => (v + 100) * (S / 200);
    g.drawImage(world.groundCanvas, 112, 112, 800, 800, 0, 0, S, S);
    g.fillStyle = 'rgba(14,11,22,0.25)'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#58b4d8'; g.fillRect(0, P(17), S, P(27) - P(17));
    g.beginPath(); g.arc(P(POI.pond.x), P(POI.pond.z), 12.5 * 1.5, 0, 7); g.fill();
    for (const c of world.colliders) {
      if (c.kind === 'cliff' || c.kind === 'gate' || c.kind === 'ramen' || c.kind === 'counter') continue;
      g.fillStyle = hex(c.color);
      g.fillRect(P(c.minX - c.ov), P(c.minZ - c.ov), (c.maxX - c.minX + c.ov * 2) * 1.5, (c.maxZ - c.minZ + c.ov * 2) * 1.5);
    }
    this.mapBase = cv;
  }
  drawMap(player, markers) {
    const g = this.mapCtx, S = 300, P = (v) => (v + 100) * 1.5;
    g.clearRect(0, 0, S, S);
    // centre on the player, north up
    const ox = clamp(P(player.pos.x) - S / 4, 0, S / 2), oz = clamp(P(player.pos.z) - S / 4, 0, S / 2);
    g.drawImage(this.mapBase, ox, oz, S / 2, S / 2, 0, 0, S, S);
    const X = (v) => (P(v) - ox) * 2, Z = (v) => (P(v) - oz) * 2;
    for (const m of markers) {
      const x = clamp(X(m.x), 10, S - 10), z = clamp(Z(m.z), 10, S - 10);
      g.fillStyle = m.color; g.strokeStyle = '#0e0b16'; g.lineWidth = 3;
      g.beginPath();
      if (m.shape === 'diamond') { g.moveTo(x, z - 10); g.lineTo(x + 9, z); g.lineTo(x, z + 10); g.lineTo(x - 9, z); g.closePath(); }
      else g.arc(x, z, m.r || 7, 0, 7);
      g.stroke(); g.fill();
    }
    g.save(); g.translate(X(player.pos.x), Z(player.pos.z)); g.rotate(-player.yaw + Math.PI);
    g.fillStyle = '#fff'; g.strokeStyle = '#0e0b16'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.stroke(); g.fill();
    g.restore();
  }
}
