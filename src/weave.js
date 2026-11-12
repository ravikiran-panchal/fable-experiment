// Sign Weaving: the upgrade that brings the Hand Sign Jutsu project into the village.
// V opens the weave (time slows), you chain hand signs, and the matching jutsu is cast in the 3D world.
// Signs come from your real hands through the camera (B), or from the sign pad (keys 1 to 6, or taps).
import { JUTSU, ELEMENTS, SIGN_NAMES, SIGN_HINTS, costFor } from './jutsu-list.js';
import { SIGN_ORDER, SIGN_SHAPES, classifyFrame, WeaveMatcher } from './signs.js';
import { HandTracker } from './tracker.js';

const $ = (s) => document.querySelector(s);
const css = (c) => '#' + c.toString(16).padStart(6, '0');
const SLOW = 0.25; // how fast the world runs while you weave (0.25 = a quarter of normal speed)
const MAX_FOCUS = 15; // seconds of real time before the weave slips
const BONES = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]];

// Original hand-sign icons, drawn as SVG from the same finger patterns the recogniser uses.
function hand(shape, dx = 0, flip = false) {
  let s = `<g transform="translate(${dx} 0)${flip ? ' translate(48 0) scale(-1 1)' : ''}">`;
  s += '<rect x="11" y="27" width="26" height="23" rx="8"/><rect x="3" y="29" width="7" height="15" rx="3.5" transform="rotate(-28 9 42)"/>';
  shape.forEach((up, i) => { const h = up ? [21, 24, 21, 16][i] : 6; s += `<rect x="${11.5 + i * 6.5}" y="${30 - h}" width="5.5" height="${h + 4}" rx="2.75"/>`; });
  return s + '</g>';
}
function icon(sign) {
  if (sign === 'gate') return `<svg viewBox="0 0 100 56" aria-hidden="true">${hand(SIGN_SHAPES.palm, 0)}${hand(SIGN_SHAPES.palm, 52, true)}</svg>`;
  return `<svg viewBox="0 0 48 56" aria-hidden="true">${hand(SIGN_SHAPES[sign])}</svg>`;
}

export class Weave {
  constructor(G) {
    this.G = G;
    this.matcher = new WeaveMatcher(JUTSU);
    this.focus = false; this.focusT = 0; this.hinted = false; this.cool = 0;
    this.cam = 'off'; // off | loading | on
    this.phone = matchMedia('(pointer: coarse)').matches; // phones: SIGN turns the camera on by itself and the panel stays small
    this.camOff = false; // the player switched the camera off in the panel: leave it off until they switch it back. A refused permission is asked again on every SIGN
    this.tracker = null; this.hands = []; this.signs = new Set(); this.lastDetect = 0; this.lastVideoTime = -1;
    this.el = { panel: $('#weave'), status: $('#weave-status'), list: $('#weave-list'), pad: $('#weave-pad'), camBtn: $('#weave-cam'), pip: $('#weave-pip'), cv: $('#weave-cv'), video: $('#weave-video'), pill: $('#sign-pill'), note: $('#weave-note') };
    this.ctx = this.el.cv.getContext('2d');

    this.el.list.innerHTML = JUTSU.map((j) => `<li data-id="${j.id}" style="--c:${css(j.color)}"><div class="w-name"><b>${j.name}</b><u style="color:${css(ELEMENTS[j.el].color)}">${ELEMENTS[j.el].name}</u><i></i></div><p>${j.sub}</p><div class="w-seq">${j.sequence.map((s) => `<span title="${SIGN_NAMES[s]}">${icon(s)}</span>`).join('')}</div></li>`).join('');
    this.el.pad.innerHTML = SIGN_ORDER.map((s, i) => `<button type="button" data-sign="${s}" title="${SIGN_HINTS[s]}"><kbd>${i + 1}</kbd>${icon(s)}<span>${SIGN_NAMES[s]}</span></button>`).join('');
    this.el.pad.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.push(b.dataset.sign); });
    this.el.camBtn.addEventListener('click', () => this.toggleCamera());
    $('#weave-close').addEventListener('click', () => this.close());
    addEventListener('keydown', (e) => {
      if (!this.focus || e.repeat) return;
      const n = /^Digit[1-6]$/.test(e.code) ? Number(e.code.slice(5)) : 0;
      if (n) { this.push(SIGN_ORDER[n - 1]); e.preventDefault(); }
      if (e.code === 'Escape') this.close();
    });
    addEventListener('pagehide', () => this.stopCamera());
    this.render();
  }

  get timeScale() { return this.focus ? SLOW : 1; }
  get canFocus() { const G = this.G, P = G.player; return !!P && !P.locked && !G.story.busy && P.state !== 'down' && !G.isCine(); }

  open(keepPath = false) {
    if (this.focus || !this.canFocus) return false;
    this.focus = true; this.focusT = 0;
    this.matcher.list = this.known();
    if (!keepPath) this.matcher.reset();
    this.G.input.releasePointer();
    this.G.ui.app.classList.add('weaving');
    this.el.panel.hidden = false;
    this.G.audio.play('ui');
    if (this.phone && this.cam === 'off' && !this.camOff) this.startCamera();
    this.render();
    return true;
  }

  close(msg) {
    if (!this.focus) return;
    this.focus = false; this.cool = 0.8;
    this.matcher.reset();
    this.G.ui.app.classList.remove('weaving');
    this.el.panel.hidden = true;
    if (msg) this.G.ui.toast(msg);
  }

  // Ether jutsu stay sealed until the story (or the #ether practice link) awakens them.
  known() { return JUTSU.filter((j) => !j.sealed || this.G.state.ether); }

  // A sign from the pad (key or tap).
  push(sign) {
    if (!this.focus) return;
    this.after(this.matcher.push(sign, performance.now()));
  }

  after(result) {
    if (!result) return;
    const G = this.G;
    if (result === 'step') G.audio.play('sign');
    else if (result === 'miss') { this.matcher.reset(); this.note('That sign does not continue any jutsu. Start again.'); G.audio.play('ui'); }
    else if (result === 'timeout') this.note('Too slow. Start the weave again.');
    else if (result === 'done') {
      const id = this.matcher.result;
      G.audio.play('sign');
      this.close();
      G.jutsu.cast(id);
      return;
    }
    this.render();
  }

  note(t) { this.el.note.textContent = t; this.noteT = 2.2; }

  render() {
    const m = this.matcher, P = this.G.player, open = m.options(), n = m.path.length, want = m.next();
    for (const li of this.el.list.children) {
      const j = JUTSU.find((x) => x.id === li.dataset.id), live = open.includes(j);
      const cost = costFor(j, P && P.hero), sealed = !!j.sealed && !this.G.state.ether;
      li.classList.toggle('out', !live && !sealed);
      li.classList.toggle('sealed', sealed);
      li.classList.toggle('poor', !!P && P.ki < cost);
      li.querySelector('.w-name i').textContent = sealed ? 'sealed' : cost + ' ki' + (cost < j.cost ? ' ★' : '');
      [...li.querySelectorAll('.w-seq span')].forEach((s, i) => { s.classList.toggle('done', live && i < n); s.classList.toggle('next', live && i === n); });
    }
    for (const b of this.el.pad.children) b.classList.toggle('want', want.has(b.dataset.sign));
    this.el.camBtn.textContent = this.phone ? (this.cam === 'on' ? 'Camera on' : this.cam === 'loading' ? 'Starting…' : 'Camera off') : this.cam === 'on' ? 'Camera on (B turns it off)' : this.cam === 'loading' ? 'Starting camera…' : 'Weave with your camera (B)';
    this.el.panel.classList.toggle('cam-on', this.cam === 'on');
    this.el.pip.hidden = this.cam !== 'on';
    this.el.pill.textContent = this.cam === 'on' ? 'Signs: camera' : 'Signs: V';
  }

  // ---------------------------------------------------------------- camera
  toggleCamera() { if (this.cam === 'off') { this.camOff = false; this.startCamera(); } else if (this.cam === 'on') { this.camOff = true; this.stopCamera(); this.G.ui.toast('Camera off. The sign pad still works'); } }

  stopCamera() {
    this.el.video.srcObject?.getTracks().forEach((t) => t.stop());
    this.el.video.srcObject = null;
    this.cam = 'off'; this.hands = []; this.signs = new Set();
    this.render();
  }

  async startCamera() {
    const G = this.G, fail = (t) => { this.stopCamera(); this.note(t); G.ui.toast(t, 5); };
    if (location.protocol === 'file:') return fail('Camera signs need the web link or localhost. The sign pad works here');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return fail('This page cannot use a camera. The sign pad still works');
    this.cam = 'loading'; this.render();
    G.ui.toast('Allow the camera. The video never leaves this device', 4);
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }); }
    catch (err) {
      const why = { NotAllowedError: this.phone ? 'Camera not allowed. Tap SIGN to be asked again. If no question appears, tap the lock by the address bar and allow Camera' : 'Camera is blocked. Allow it next to the address bar, then press B', NotFoundError: 'No camera found. The sign pad still works', NotReadableError: 'Camera is busy in another app (a call, OBS). Close it, then press B' }[err.name];
      return fail(why || 'Camera could not start. The sign pad still works');
    }
    this.el.video.srcObject = stream;
    try { await this.el.video.play(); } catch { /* autoplay quirks: frames are still readable */ }
    try {
      if (!this.tracker) { G.ui.toast('Loading the hand tracker (about 22 MB the first time)…', 6); const t = new HandTracker(); await t.load(new URL('vendor/mediapipe/', document.baseURI).href); this.tracker = t; }
    } catch (err) { console.error(err); return fail('Hand tracker did not load. The sign pad still works'); }
    this.cam = 'on';
    G.ui.toast('Camera ready. Hold a sign to start weaving', 4);
    this.render();
  }

  readCamera(now) {
    const v = this.el.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime) return false;
    if (!this.focus && now - this.lastDetect < 110) return false; // listen lazily until a weave starts
    this.lastVideoTime = v.currentTime; this.lastDetect = now;
    try { this.hands = this.tracker.detect(v, now); this.signs = classifyFrame(this.hands); }
    catch (err) { if (!this.trackErr) console.error('Tracking error', err); this.trackErr = err; return false; }
    return true;
  }

  drawPip() {
    const g = this.ctx, v = this.el.video, W = this.el.cv.width, H = this.el.cv.height;
    g.save(); g.translate(W, 0); g.scale(-1, 1); // mirrored, like a mirror
    g.drawImage(v, 0, 0, W, H);
    g.lineWidth = 2.5; g.lineCap = 'round'; g.strokeStyle = this.matcher.holdSign ? '#ffd060' : '#ffffff'; g.fillStyle = g.strokeStyle;
    for (const h of this.hands) {
      for (const chain of BONES) { g.beginPath(); chain.forEach((i, k) => g[k ? 'lineTo' : 'moveTo'](h.lm[i].x * W, h.lm[i].y * H)); g.stroke(); }
      for (const i of [4, 8, 12, 16, 20]) { g.beginPath(); g.arc(h.lm[i].x * W, h.lm[i].y * H, 3.2, 0, 7); g.fill(); }
    }
    g.restore();
  }

  // Called every frame with real (not slowed) time.
  update(dt) {
    const G = this.G, I = G.input, now = performance.now();
    this.cool -= dt;
    if (this.noteT > 0 && (this.noteT -= dt) <= 0) this.el.note.textContent = '';
    if (!G.player) return;
    if (!this.hinted && this.canFocus) { this.hinted = true; G.ui.toast(this.phone ? 'New: tap SIGN to weave hand signs into jutsu' : 'New: press V to weave hand signs into jutsu', 4.5); }
    if (I.hit('camera')) this.toggleCamera();
    if (I.hit('weave')) { if (this.focus) this.close(); else this.open(); }
    if (this.focus && !this.canFocus) this.close();

    if (this.cam === 'on' && (this.focus || (!this.phone && this.canFocus && this.cool <= 0)) && this.readCamera(now)) { // phones only read hands while the weave is open (saves battery)
      if (!this.focus) this.matcher.list = this.known();
      this.matcher.holdMs = this.focus ? 260 : 480; // the sign that starts a weave must be held a little longer
      const r = this.matcher.update(this.signs, now, this.hands.length);
      if (!this.focus) { if (r === 'step' && !this.open(true)) this.matcher.reset(); else if (r === 'step') { G.audio.play('sign'); this.render(); } }
      else this.after(r);
      if (this.focus) this.drawPip();
    }

    if (!this.focus) return;
    if (this.cam !== 'loading') this.focusT += dt; // the clock waits while the camera starts
    if (this.focusT > MAX_FOCUS) return this.close('The weave slips');
    const seen = this.signs.has('gate') ? 'gate' : [...this.signs][0];
    this.el.status.textContent = this.cam === 'on'
      ? (!this.hands.length ? 'Show your hand to the camera' : seen ? `Seeing: ${SIGN_NAMES[seen]}` : 'Hand found. Shape not clear yet')
      : this.cam === 'loading' ? 'Starting the camera… you can tap the signs meanwhile' : this.phone ? 'Tap the signs in order' : 'Press 1 to 6, or tap a sign';
    this.el.panel.style.setProperty('--left', (1 - this.focusT / MAX_FOCUS).toFixed(3));
    this.el.panel.style.setProperty('--hold', this.matcher.hold.toFixed(2));
    if (G.frameN % 10 === 0) this.render(); // keeps the "not enough ki" dimming current
  }
}
