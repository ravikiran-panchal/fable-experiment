// App flow: allow camera -> library -> weave signs -> effect plays -> release.
import { APP, JUTSU, SIGNS, TEXT } from './names.js';
import { JUTSU_LIST } from './sequences.js';
import { classifyFrame, SequenceMatcher } from './signs.js';
import { signIcon, templateHand } from './icons.js';
import { sounds } from './audio.js';
import { Tracker } from './tracker.js';
import { drawSkeleton } from './effects/util.js';
import * as sphere from './effects/sphere.js';
import * as lightning from './effects/lightning.js';
import * as eye from './effects/eye.js';
import * as sand from './effects/sand.js';
import * as panda from './effects/panda.js';
import * as fire from './effects/fire.js';

const EFFECTS = { sphere, lightning, eye, sand, panda, fire };
const MAX_CAST_SECONDS = 60; // an effect releases itself after this long

const $ = (s) => document.querySelector(s);
const video = $('#cam');
const canvas = $('#fx');
const g = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const low = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const tracker = new Tracker();

const S = {
  screen: 'gate', phase: 'signing', sim: false, jutsu: null, matcher: null, effect: null, effectAge: 0,
  hands: [], signs: new Set(), face: null, prev: [], W: 0, H: 0,
  simSign: 'palm', pointer: null, lastVideoTime: -1, lastDetect: 0, fps: 0, detectMs: 0, trackerError: null,
};
window.hsj = S; // handy in the browser console when debugging

// ---------- text and static UI ----------
document.title = APP.title;
$('#appTitle').textContent = APP.title;
$('#libKicker').textContent = APP.title;
$('#gateTitle').textContent = TEXT.gateTitle;
$('#gateBody').textContent = TEXT.gateBody;
$('#allowBtn').textContent = TEXT.gateButton;
$('#simBtn').textContent = TEXT.gateSim;
$('#libTitle').textContent = TEXT.libraryTitle;
$('#libHint').textContent = TEXT.libraryHint;
$('#releaseBtn').textContent = TEXT.release;
$('#backBtn').textContent = '‹ ' + TEXT.back;
$('#lensIcon').innerHTML = signIcon('palm');

const seqHtml = (seq) => seq.map((s) => `<span class="sign">${signIcon(s)}${SIGNS[s].label}</span>`).join('<span class="arrow">›</span>');
$('#cards').innerHTML = JUTSU_LIST.map((j) => `
  <button class="card" data-id="${j.id}" style="--c:${j.color}">
    <div><span class="sub">${JUTSU[j.id].sub}</span><h3>${JUTSU[j.id].label}</h3></div>
    <div class="seq">${seqHtml(j.sequence)}</div>
  </button>`).join('');
$('#legend').innerHTML = Object.entries(SIGNS).map(([id, s]) => `<div class="legend-item">${signIcon(id)}<div><b>${s.label}</b>${s.hint}</div></div>`).join('');
$('#simPad').innerHTML = Object.entries(SIGNS).map(([id, s]) => `<button data-sign="${id}">${signIcon(id)}${s.label}</button>`).join('');

function show(screen) {
  S.screen = screen;
  document.body.dataset.screen = screen;
  for (const id of ['gate', 'library', 'cast']) $('#' + id).hidden = id !== screen;
}

function renderMute() { $('#muteBtn').textContent = sounds.muted ? 'Sound off' : 'Sound on'; }
renderMute();

// ---------- camera ----------
const CAMERA_HELP = {
  secure: ['This page is not secure', 'Browsers only allow the camera on https pages or on localhost. Open the https link, or on this computer use http://localhost:8766.'],
  NotAllowedError: ['Camera is blocked', 'Tap the lock or camera icon next to the address, set Camera to Allow, then reload the page. On Android also check Settings > Apps > Chrome > Permissions > Camera.'],
  NotFoundError: ['No camera found', 'Plug in a webcam, or open this page on your phone.'],
  NotReadableError: ['Camera is busy', 'Another app is using the camera (a video call, OBS, a capture tool). Close it and try again.'],
  OverconstrainedError: ['Camera could not start', 'This camera rejected the requested settings. Reload and try again.'],
  tracker: ['Hand tracker failed to load', 'Check your connection and reload. If it keeps failing, this browser may not support WebAssembly.'],
};

function gateError(kind, err) {
  const [title, body] = CAMERA_HELP[kind] || ['Camera could not start', String(err?.message || kind)];
  $('#gateBusy').hidden = true;
  $('#allowBtn').disabled = false;
  const inApp = /Instagram|FBAN|FBAV|Line\/|TikTok|Snapchat/i.test(navigator.userAgent);
  $('#gateError').innerHTML = `<b>${title}</b>${body}${inApp ? ' You seem to be inside an app’s built-in browser, which often blocks the camera: use the menu to open this page in Chrome.' : ''}`;
  $('#gateError').hidden = false;
  if (err) console.error(err);
}

function busy(text) { $('#gateBusy').textContent = text; $('#gateBusy').hidden = false; $('#gateError').hidden = true; }

async function startCamera() {
  sounds.unlock();
  sounds.play('ui_tick');
  $('#allowBtn').disabled = true;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return gateError('secure');
  busy('Waiting for you to allow the camera...');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: low ? 640 : 1280 }, height: { ideal: low ? 480 : 720 } },
    });
  } catch (err) { return gateError(err.name, err); }
  video.srcObject = stream;
  try { await video.play(); } catch { /* autoplay quirks: the frame loop still reads the video */ }
  busy('Loading the hand tracker (about 12 MB the first time)...');
  try { await tracker.loadHands(); } catch (err) { return gateError('tracker', err); }
  $('#gateBusy').hidden = true;
  show('library');
}

function startSim() {
  sounds.unlock();
  sounds.play('ui_tick');
  S.sim = true;
  document.body.classList.add('sim');
  $('#simPad').hidden = false;
  show('library');
}

// ---------- jutsu selection and casting ----------
function selectJutsu(id) {
  const j = JUTSU_LIST.find((x) => x.id === id);
  if (!j) return;
  sounds.play('ui_tick');
  S.jutsu = j;
  S.matcher = new SequenceMatcher(j.sequence);
  if (j.needsFace && !S.sim) tracker.loadFace();
  $('#cast').style.setProperty('--c', j.color);
  $('#castName').textContent = JUTSU[id].label;
  $('#castSub').textContent = JUTSU[id].sub;
  $('#steps').innerHTML = j.sequence.map((s) => `<li class="step">${signIcon(s)}<span>${SIGNS[s].label}</span></li>`).join('');
  setPhase('signing');
  show('cast');
}

function setPhase(phase) {
  S.phase = phase;
  document.body.dataset.phase = phase;
  $('#releaseBtn').hidden = phase !== 'active';
  $('#hint').textContent = phase === 'active' ? JUTSU[S.jutsu.id].tip : S.sim ? TEXT.simPad : TEXT.signingHint;
  renderSteps();
}

function renderSteps() {
  const m = S.matcher;
  document.querySelectorAll('#steps .step').forEach((el, i) => {
    el.classList.toggle('done', i < m.index);
    el.classList.toggle('current', i === m.index);
    el.style.setProperty('--hold', i === m.index ? m.hold.toFixed(2) : 0);
  });
}

function env() {
  return { W: S.W, H: S.H, hands: S.hands, face: S.face, low, sim: S.sim, sounds };
}

function cast() {
  sounds.play('cast');
  S.effect = EFFECTS[S.jutsu.id].create(env());
  S.effectAge = 0;
  video.style.filter = S.effect.videoFilter || '';
  const c = $('#callout');
  c.textContent = JUTSU[S.jutsu.id].label + '!';
  c.classList.remove('go');
  void c.offsetWidth; // restart the animation
  c.classList.add('go');
  setPhase('active');
}

function release(silent) {
  if (!S.effect) return;
  S.effect.stop?.();
  S.effect = null;
  S.face = null;
  video.style.filter = '';
  if (!silent) sounds.play('release');
  S.matcher.reset();
  setPhase('signing');
}

function backToLibrary() {
  release(true);
  sounds.play('ui_tick');
  show('library');
}

// ---------- turning tracker output into screen-space hands ----------
// The video is shown mirrored and cropped to fill the screen ("cover"); this maps a tracker point onto it.
function mapper() {
  const vw = video.videoWidth || S.W, vh = video.videoHeight || S.H;
  const sc = Math.max(S.W / vw, S.H / vh);
  const dw = vw * sc, dh = vh * sc, ox = (S.W - dw) / 2, oy = (S.H - dh) / 2;
  return (p) => ({ x: ox + (1 - p.x) * dw, y: oy + p.y * dh });
}

function finishHand(pts, sign, dt) {
  const palm = { x: 0, y: 0 };
  for (const i of [0, 5, 9, 13, 17]) { palm.x += pts[i].x / 5; palm.y += pts[i].y / 5; }
  const dx = pts[9].x - pts[0].x, dy = pts[9].y - pts[0].y, size = Math.hypot(dx, dy) || 1;
  const hand = { pts, sign, palm, size, dir: { x: dx / size, y: dy / size }, vel: { x: 0, y: 0 } };
  let near = null, best = size * 4; // match with the same hand last frame to get its speed
  for (const p of S.prev) { const d = Math.hypot(p.palm.x - palm.x, p.palm.y - palm.y); if (d < best) { best = d; near = p; } }
  if (near && dt > 0) {
    hand.vel.x = near.vel.x * 0.5 + ((palm.x - near.palm.x) / dt) * 0.5;
    hand.vel.y = near.vel.y * 0.5 + ((palm.y - near.palm.y) / dt) * 0.5;
  }
  return hand;
}

function readCamera(now) {
  if (!tracker.hands || video.readyState < 2 || video.currentTime === S.lastVideoTime) return;
  S.lastVideoTime = video.currentTime;
  const dt = Math.min(0.2, (now - S.lastDetect) / 1000);
  S.lastDetect = now;
  const map = mapper();
  try {
    const t0 = performance.now();
    const raw = tracker.detectHands(video, now);
    const { signs, per } = classifyFrame(raw);
    S.signs = signs;
    S.prev = S.hands;
    S.hands = raw.map((h, i) => finishHand(h.lm.map(map), per[i].sign, dt));
    if (S.effect && S.jutsu.needsFace) {
      const f = tracker.detectFace(video, now);
      S.face = f ? f.map(map) : null;
    }
    S.detectMs = S.detectMs * 0.9 + (performance.now() - t0) * 0.1;
  } catch (err) {
    if (!S.trackerError) console.error('Tracking error', err);
    S.trackerError = err;
  }
}

// Practice mode: the pointer is the hand, the sign pad picks its shape.
function readSim(dt) {
  const p = S.pointer || { x: S.W / 2, y: S.H * 0.45 };
  const size = Math.min(S.W, S.H) * 0.11;
  const gate = S.simSign === 'gate';
  const shape = templateHand(gate ? 'palm' : S.simSign);
  const make = (cx, flip) => finishHand(shape.map(([x, y]) => ({ x: cx + (flip ? -x : x) * size, y: p.y + y * size })), gate ? 'palm' : S.simSign, dt);
  S.prev = S.hands;
  S.hands = gate ? [make(p.x - size * 1.7, false), make(p.x + size * 1.7, true)] : [make(p.x, false)];
  S.signs = new Set(gate ? ['palm', 'gate'] : [S.simSign]);
}

// ---------- frame loop ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
  S.W = window.innerWidth; S.H = window.innerHeight;
  canvas.width = Math.round(S.W * dpr); canvas.height = Math.round(S.H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  frame(now);
}
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  S.fps = S.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
  if (S.screen === 'gate') return;
  if (S.sim) readSim(dt); else readCamera(now);
  g.clearRect(0, 0, S.W, S.H);
  if (S.screen !== 'cast') return;

  if (S.phase === 'signing') {
    const result = S.matcher.update(S.signs, now);
    if (result === 'step') sounds.play('sign_ok');
    if (result === 'timeout') $('#hint').textContent = TEXT.timeout;
    if (result === 'done') { sounds.play('sign_ok'); cast(); }
    else {
      renderSteps();
      const want = S.jutsu.sequence[S.matcher.index];
      const seen = [...S.signs].filter((s) => s !== 'gate' || S.signs.has('gate'));
      const label = S.signs.has('gate') ? SIGNS.gate.label : seen.length ? SIGNS[seen[0]].label : null;
      const st = $('#status');
      st.textContent = !S.hands.length ? TEXT.noHand : label ? `Seeing: ${label}` : 'Hand found. Shape not clear yet.';
      st.classList.toggle('seen', S.signs.has(want));
      for (const h of S.hands) drawSkeleton(g, h, h.sign === want || (want === 'gate' && S.signs.has('gate')) ? S.jutsu.color : '#ffffff', 0.85);
    }
  }
  if (S.effect) {
    const e = env();
    S.effectAge += dt;
    S.effect.update(dt, e);
    S.effect.draw(g, e);
    if (S.effect.hint !== undefined) $('#hint').textContent = S.effect.hint || JUTSU[S.jutsu.id].tip;
    if (S.effectAge > MAX_CAST_SECONDS) release();
  }
  if (!$('#debug').hidden) {
    $('#debug').textContent = `fps ${S.fps.toFixed(0)}  track ${S.detectMs.toFixed(1)} ms  ${tracker.delegate || (S.sim ? 'practice' : '-')}\nhands ${S.hands.length}  signs ${[...S.signs].join(',') || '-'}\nvideo ${video.videoWidth}x${video.videoHeight}  low ${low}${S.trackerError ? '\nERR ' + S.trackerError.message : ''}`;
  }
}

// ---------- wiring ----------
$('#allowBtn').addEventListener('click', startCamera);
$('#simBtn').addEventListener('click', startSim);
$('#cards').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) selectJutsu(c.dataset.id); });
$('#backBtn').addEventListener('click', backToLibrary);
$('#releaseBtn').addEventListener('click', () => release());
$('#muteBtn').addEventListener('click', () => { sounds.setMuted(!sounds.muted); renderMute(); });

function setSimSign(sign) {
  S.simSign = sign;
  document.querySelectorAll('#simPad button').forEach((b) => b.classList.toggle('on', b.dataset.sign === sign));
}
$('#simPad').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setSimSign(b.dataset.sign); });
setSimSign('palm');
window.addEventListener('pointermove', (e) => { S.pointer = { x: e.clientX, y: e.clientY }; });
window.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) S.pointer = { x: e.clientX, y: e.clientY }; });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (S.effect) release(); else if (S.screen === 'cast') backToLibrary(); }
  const n = Number(e.key);
  if (S.sim && n >= 1 && n <= 6) setSimSign(Object.keys(SIGNS)[n - 1]);
  if (e.key === 'd') $('#debug').hidden = !$('#debug').hidden;
});
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
window.addEventListener('pagehide', () => video.srcObject?.getTracks().forEach((t) => t.stop()));

if (params.has('debug')) $('#debug').hidden = false;
S.frame = frame; // lets a test advance the app one frame at a time
resize();
requestAnimationFrame(loop);
if (params.has('sim')) startSim(); // ?sim=1 opens practice mode directly (sound stays off until the first tap)
