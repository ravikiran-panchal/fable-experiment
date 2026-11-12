import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Env, CYCLE } from './env.js';
import { World, POI } from './world.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { TouchUI } from './touch.js';
import { GameAudio } from './audio.js';
import { Story } from './story.js';
import { Jutsu } from './jutsu.js';
import { Weave } from './weave.js';
import { Ether } from './ether.js';
import { Dream } from './dream.js';
import { Jobs } from './jobs.js';
import { Save } from './save.js';
import { makeCharacter } from './character.js';
import { HEROES, Player, Gouma, Yoru, Villager, Npc, Projectiles } from './actors.js';
import { clamp, damp, dampAngle, lerp } from './util.js';

const LOOK_NAMES = { golden: 'Golden hour', day: 'Midday', dusk: 'Dusk', night: 'Night', omen: 'Ill omen' };
const app = document.getElementById('app'), canvas = document.getElementById('view');

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.2, 2000);
camera.position.set(0, 12, 110);

const G = {
  scene, camera, renderer,
  state: { omen: false, beacon: false, bonfire: false, dream: false, ether: false, coins: 12 },
  arena: { active: false },
  cam: { yaw: 0, pitch: 0.24, dist: 4.3, cur: 4.3, close: true, override: null, pos: new THREE.Vector3(0, 12, 110), look: new THREE.Vector3(0, 8, 0), fov: 58, lastLook: -10, target: new THREE.Vector3() },
  player: null, rogues: [], illusions: [], villagers: [], npcs: [], cast: {}, time: 0, quality: 2, foeSlow: 1,
};
if (typeof window !== 'undefined') window.__game = G;

G.save = new Save();
G.env = new Env(scene, renderer);
G.world = new World(scene);
G.fx = new FX(scene);
G.input = new Input(canvas, document.getElementById('touch'));
G.audio = new GameAudio(window.EMBER_AUDIO || []);
G.ui = new UI(G);
G.story = new Story(G);
G.projectiles = new Projectiles(G);
G.ui.buildMap(G.world);
G.jutsu = new Jutsu(G);
G.weave = new Weave(G);
G.touchUI = new TouchUI(G);
G.ether = new Ether(G);
G.dream = new Dream(G);
G.jobs = new Jobs(G);

// post-processing: bloom makes lanterns, ki and lightning glow
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.5, 0.55, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = Math.max(1, app.clientWidth), h = Math.max(1, app.clientHeight);
  const cap = G.quality >= 2 ? 2 : G.quality === 1 ? 1.25 : 1;
  const pr = Math.min(window.devicePixelRatio || 1, cap);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  composer.setPixelRatio(pr); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(app);
resize();

function setQuality(q) {
  G.quality = q;
  renderer.shadowMap.enabled = q >= 1;
  G.env.sun.castShadow = q >= 1;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  resize();
}

// ---------------------------------------------------------------- helpers shared with the rest of the game
const waits = [];
G.wait = (s) => new Promise((res) => waits.push({ t: s, res }));
const tweens = [];
G.tween = (dur, fn) => new Promise((res) => tweens.push({ t: 0, dur, fn, res })); // fn(0..1) every frame
let hitstopT = 0, slowT = 0, slowScale = 1;
G.hitstop = (t) => { hitstopT = Math.max(hitstopT, t); };
G.slowmo = (scale, t) => { slowScale = scale; slowT = t; };
G.shoot = (o) => G.projectiles.shoot(o);
// A freeze-frame close-up: game time stops for `dur` real seconds while the camera shows the hero, then their eyes.
let cut = null;
const cutA = new THREE.Vector3(), cutB = new THREE.Vector3();
G.cutIn = (dur) => { const P = G.player; if (cut || !P) return; cut = { t: 0, dur, prev: G.cam.override, locked: P.locked }; P.locked = true; G.ui.cine(true); };
function runCut(dt) {
  const P = G.player, f = P.forward(), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw), sc = P.char.spec.scale, hy = P.pos.y + 1.87 * sc + (P.char.J.body.position.y - 0.92) * sc;
  cut.t += dt;
  if (cut.t < 0.65) { // where they stand and what they are doing
    cutA.set(P.pos.x + f.x * 3.3 + rx * 1.5, P.pos.y + 1.25, P.pos.z + f.z * 3.3 + rz * 1.5); cutB.set(P.pos.x, P.pos.y + 1.15, P.pos.z);
    G.cam.override = { pos: cutA, look: cutB, fov: 44, snap: true };
  } else { // then the eyes, with a slow push in
    const k = (cut.t - 0.65) / (cut.dur - 0.65), d = 1.3 - k * 0.22;
    cutA.set(P.pos.x + f.x * d + rx * 0.1, hy + 0.02, P.pos.z + f.z * d + rz * 0.1); cutB.set(P.pos.x, hy, P.pos.z);
    G.cam.override = { pos: cutA, look: cutB, fov: 20, snap: true };
  }
  if (cut.t >= cut.dur) { G.cam.override = cut.prev; P.locked = cut.locked; G.ui.cine(G.story.busy); cut = null; }
}

const dummies = G.world.dummies.map((d) => ({
  pos: d.pos, radius: d.radius, height: d.height, yaw: 0,
  takeHit(dmg, dir) { d.dir.set(dir.x, dir.z); d.wobV += 5 + dmg * 0.25; return true; },
}));
const targetList = [];
G.targets = () => {
  targetList.length = 0;
  for (const r of G.rogues) if (r.alive && r.visible) targetList.push(r);
  for (const r of G.illusions) if (r.alive) targetList.push(r);
  if (!G.arena.active) for (const d of dummies) targetList.push(d);
  return targetList;
};

// the two rogues wait on the pagoda steps until the story calls them
G.rogues = [new Gouma(G), new Yoru(G)];
for (const r of G.rogues) r.visible = false; // unseen until the story brings them to the pagoda
G.placeRogues = () => {
  const [g, y] = G.rogues;
  g.pos.set(-2.4, 2.4, -66.5); y.pos.set(2.2, 2.4, -66.5);
  for (const r of G.rogues) { r.yaw = 0; r.vel.set(0, 0, 0); r.hp = r.maxHp; r.down = false; r.active = false; r.visible = true; r.set('idle'); r.anim = { name: 'arms' }; }
};
G.startDuel = () => {
  G.arena.active = true;
  for (const r of G.rogues) { r.active = true; r.set('idle'); r.restT = 0.6; r.next = 1.2; }
  barrier.visible = true;
};
G.spawnIllusion = (at) => {
  const y = new Yoru(G, true);
  y.pos.copy(at); y.active = true; y.visible = true; y.char.root.visible = true; y.next = 1 + Math.random() * 2;
  G.fx.moths(new THREE.Vector3(at.x, 1.1, at.z), 20);
  G.illusions.push(y);
};
G.clearIllusions = () => { for (const y of G.illusions) { scene.remove(y.char.root); } G.illusions.length = 0; };
G.onRogueDown = (r) => {
  if (r.illusion) { G.fx.moths(new THREE.Vector3(r.pos.x, r.pos.y + 1.1, r.pos.z), 30); scene.remove(r.char.root); G.illusions.splice(G.illusions.indexOf(r), 1); return; }
  G.slowmo(0.2, 0.9); G.fx.shake(1.0);
  G.fx.ring(new THREE.Vector3(r.pos.x, r.pos.y + 0.2, r.pos.z), { r0: 1, r1: 12, life: 0.7, color: 0xffffff });
  if (G.rogues.every((x) => x.down)) { barrier.visible = false; G.story.victory(); }
  else G.ui.toast(r.name + ' is down. One left');
};
G.onPlayerDown = () => {
  const P = G.player;
  P.hp = P.maxHp; P.ki = P.maxKi; P.invuln = 2;
  if (G.arena.active) { P.pos.set(POI.arena.x, 0, POI.arena.z + POI.arenaR - 3); P.yaw = Math.PI; G.projectiles.clear(); G.ui.toast('Back on your feet, Lamplighter'); }
  else G.ui.toast('Shake it off');
};

// ring of light that closes the plaza during the duel
const barrier = new THREE.Mesh(
  new THREE.CylinderGeometry(POI.arenaR + 0.7, POI.arenaR + 0.7, 7, 64, 1, true),
  new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float t; void main(){ float a = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.5); float s = 0.6 + 0.4 * sin(vUv.x * 240.0 + t * 3.0 + vUv.y * 8.0); gl_FragColor = vec4(vec3(0.85, 0.8, 1.0) * 1.6, a * s * 0.55); }',
  }),
);
barrier.position.set(POI.arena.x, 3.5, POI.arena.z); barrier.visible = false;
scene.add(barrier);

// the ramen chef
// the named cast: chef, innkeeper, teacher, Susake and his class
{
  const C = G.cast, kr = [0x2a2028, 0x5a3b28, 0x1c2140, 0x8a5a3a, 0x6a6a72], kt = [0xd8a43c, 0x4f7fa8, 0xa8554a, 0x7a5a9a, 0x5f8f5a], ks = ['bun', 'spiky', 'tail', 'long', 'spiky'];
  C.chef = new Npc(G, { name: 'Chef Hinode', color: 0xffb45a, at: [POI.ramenChef.x, POI.ramenChef.z], yaw: Math.PI / 2, anim: () => ({ name: G.story.phase === 'explore' && G.story.busy ? 'cook' : 'idle' }),
    look: { hair: 0x3a3a40, hairStyle: 'bun', top: 0xf4efe6, pants: 0x2c3550, accent: 0xd9483a, eye: '#5a3b28', skin: 0xe0b088, grin: true, headband: true, scale: 1.04 } });
  C.keeper = new Npc(G, { name: 'Sayo', color: 0xe8a8c8, at: [POI.innkeeper.x, POI.innkeeper.z], yaw: -Math.PI / 2, line: 'The bath is hot and the futon is aired. Ten copper a night, whenever you have it.',
    look: { hair: 0x8a8a94, hairStyle: 'bun', top: 0x7a4a6a, pants: 0x3a3048, accent: 0xf2ead8, eye: '#5a3b28', skin: 0xf0d2b4, grin: true, scale: 0.98 } });
  C.teacher = new Npc(G, { name: 'Sensei Awai', color: 0x9fd8b0, at: [POI.teacher.x, POI.teacher.z], yaw: Math.PI, hidden: true, line: 'This door is always open to you. Mind the chalk dust.',
    look: { hair: 0x3a3a40, hairStyle: 'tail', top: 0x3f6a5a, pants: 0x2c3550, accent: 0xe0c070, eye: '#3a8a5a', skin: 0xe0b088, stern: true, bracer: true, scale: 1.05 } });
  C.susake = new Npc(G, { name: 'Susake', color: 0x9fe07a, at: [58, -24], hidden: true, speed: 9, line: 'Panda! Panda! Panda! Do the panda one!',
    look: { hair: 0x8a5a3a, hairStyle: 'spiky', top: 0x4f9a5a, pants: 0xe9dcc0, accent: 0xf2c53d, eye: '#5a8a3a', grin: true, headband: true, sleeve: false, scale: 0.66 } });
  C.kids = ks.map((hairStyle, i) => new Npc(G, { name: 'Student', at: [54 + i * 2, -24], hidden: true, line: ['Do the lightning one again!', 'Is it true you ran on the river?', 'I am going to be a Lamplighter too.', 'Sensei cried a bit. Do not tell.', 'How many signs do you know? All of them?'][i],
    look: { hair: kr[i], hairStyle, top: kt[i], pants: 0x3a3a48, accent: 0xf2ead8, eye: ['#5a3b28', '#3a6fd8', '#3a8a5a', '#a070ff', '#5a3b28'][i], skin: [0xf2c9a4, 0xe0b088, 0xf6d8bc, 0xc99a76, 0xf2c9a4][i], grin: i % 2 === 0, scale: 0.6 + i * 0.015 } }));
  G.npcs.push(C.chef, C.keeper, C.teacher, C.susake, ...C.kids);
}

for (let i = 0; i < 6; i++) G.villagers.push(new Villager(G, i));

// ---------------------------------------------------------------- title screen: the three heroes at the gate
let picked = 0, started = false;
const previews = HEROES.map((h, i) => {
  const c = makeCharacter(h.look);
  c.root.position.set(0.25 + i * 1.2, 0, 85.5);
  c.root.rotation.y = Math.atan2(0.5 - c.root.position.x, 7.5);
  scene.add(c.root);
  return c;
});
function start(cp = null) {
  if (started) return;
  started = true;
  if (cp) picked = Math.max(0, HEROES.findIndex((h) => h.id === cp.hero)); else G.save.reset(); // a new game starts a new list of checkpoints
  G.audio.unlock();
  for (const c of previews) scene.remove(c.root);
  const hero = HEROES[picked];
  G.player = new Player(G, hero);
  G.ui.setHero(hero); G.ui.hideTitle(); G.ui.lookName(LOOK_NAMES[G.env.lookName]);
  canvas.focus?.();
  const hash = (location.hash || '').slice(1);
  if (cp) G.story.restore(cp);
  else if (hash === 'fight') { G.env.setLook('omen', true); G.state.omen = true; for (const n of G.villagers) n.hidden = true; G.placeRogues(); for (const r of G.rogues) r.char.root.visible = true; G.player.pos.set(0, 0, -12); G.ui.lookName(LOOK_NAMES.omen); G.story.setPhase('omen'); }
  else if (hash === 'roam') { G.story.setPhase('explore'); }
  else if (hash === 'dojo') { G.player.pos.set(POI.training.x, 0, POI.training.z + 9); G.player.yaw = Math.PI; G.cam.yaw = 0; G.story.setPhase('free'); G.ui.objective('Training ground. V opens the sign weave, B turns on your camera'); }
  else if (hash === 'ether') { G.state.ether = true; G.player.pos.set(POI.training.x, 0, POI.training.z + 9); G.player.yaw = Math.PI; G.cam.yaw = 0; G.story.setPhase('free'); G.ui.objective('Ether practice. V, then Gate + Fist (Mirror Melt) or Gate + Spike + Fist (Dust Verdict)'); }
  else if (hash === 'beacon') { G.env.setLook('dusk', true); G.player.pos.set(0, G.world.beaconTopY + 3, POI.pagoda.z + 2); G.story.setPhase('beacon'); }
  else if (!G.story.jump(hash)) G.story.intro();
}
G.ui.buildTitle(HEROES, (i) => { picked = i; }, () => start());
G.ui.buildSaves(G.save, HEROES, (cp) => start(cp));
addEventListener('keydown', (e) => {
  if (started) return;
  if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { picked = Number(e.code.slice(5)) - 1; G.ui.pick(picked); }
  if (e.code === 'ArrowRight') { picked = (picked + 1) % 3; G.ui.pick(picked); }
  if (e.code === 'ArrowLeft') { picked = (picked + 2) % 3; G.ui.pick(picked); }
  if (e.code === 'Enter') start(G.save.latest);
});
G.start = (i = 0) => { picked = i; start(); };
G.load = (cp = G.save.latest) => start(cp);
G.setQuality = (q) => setQuality(q);
G.isCine = () => cine;

// ---------------------------------------------------------------- cameras
const SHOTS = [
  { a: [0, 5, 96], b: [0, 12, 84], la: [0, 10, -40], lb: [0, 13, -76], fov: 46, t: 8 },
  { a: [-1.5, 4.8, 80], b: [1.5, 4.3, 36], la: [0, 5, 0], lb: [0, 8, -76], fov: 52, t: 9 },
  { a: [3.2, 2.2, 45], b: [3.2, 2.9, 58], la: [-10, 2.3, 51], lb: [-10, 2.4, 51], fov: 40, t: 7 },
  { a: [-64, 2.4, 23], b: [-16, 3.4, 21], la: [0, 3, 22], lb: [30, 5, 10], fov: 46, t: 8 },
  { a: [22, 3, -28], b: [32, 38, -46], la: [0, 8, -76], lb: [0, 20, -76], fov: 48, t: 9 },
  { a: [-28, 7, -56], b: [-40, 13, -66], la: [-50, 16, -94], lb: [-50, 9, -90], fov: 50, t: 7 },
  { orbit: { c: [0, 0, -20], r: 135, h: 74, a0: 0.5, a1: 1.5 }, la: [0, 6, -30], lb: [0, 6, -30], fov: 42, t: 12 },
];
let cine = false, shotI = 0, shotT = 0, shotFading = false;
const A = new THREE.Vector3(), B = new THREE.Vector3(), DIR = new THREE.Vector3(), PT = new THREE.Vector3();
let fov = 58;

function drone(dt) {
  const s = SHOTS[shotI];
  shotT += dt;
  const k = shotT / s.t, e = k * k * (3 - 2 * k) * 0.5 + k * 0.5;
  if (s.orbit) { const a = lerp(s.orbit.a0, s.orbit.a1, e); camera.position.set(s.orbit.c[0] + Math.sin(a) * s.orbit.r, s.orbit.h, s.orbit.c[2] + Math.cos(a) * s.orbit.r); }
  else camera.position.lerpVectors(A.fromArray(s.a), B.fromArray(s.b), e);
  camera.lookAt(PT.lerpVectors(A.fromArray(s.la), B.fromArray(s.lb), e));
  fov = s.fov;
  if (!shotFading && shotT > s.t - 0.45) { shotFading = true; G.ui.el.fade.classList.add('on'); }
  if (shotT >= s.t) { shotI = (shotI + 1) % SHOTS.length; shotT = 0; shotFading = false; G.ui.el.fade.classList.remove('on'); }
}

function updateCamera(dt) {
  const c = G.cam, P = G.player, I = G.input, portrait = camera.aspect < 0.9;
  if (!started) { // title: heroes on the right, main street running away behind them
    const t = G.time;
    if (portrait) { camera.position.set(1.45 + Math.sin(t * 0.2) * 0.2, 1.5, 95.8); camera.lookAt(1.45, 0.7, 85.5); fov = 50; }
    else { camera.position.set(0.5 + Math.sin(t * 0.2) * 0.25, 1.15, 93); camera.lookAt(-2.5, 1.9, 79.5); fov = 42; }
  } else if (cine) drone(dt);
  else if (c.override) {
    const o = c.override;
    if (o.snap) { c.pos.copy(o.pos); c.look.copy(o.look); fov = o.fov; o.snap = false; }
    else { const k = 1 - Math.exp(-1.5 * dt); c.pos.lerp(o.pos, k); c.look.lerp(o.look, k); fov = damp(fov, o.fov, 2, dt); }
    camera.position.copy(c.pos); camera.lookAt(c.look);
  } else {
    if (I.look.x || I.look.y) c.lastLook = G.time;
    c.yaw -= I.look.x * 0.0026; c.pitch = clamp(c.pitch + I.look.y * 0.0022, -0.3, 1.25);
    const kx = (I.down('camR') ? 1 : 0) - (I.down('camL') ? 1 : 0), ky = (I.down('camU') ? 1 : 0) - (I.down('camD') ? 1 : 0);
    if (kx || ky) { c.yaw -= kx * 2.2 * dt; c.pitch = clamp(c.pitch + ky * 1.2 * dt, -0.3, 1.25); c.lastLook = G.time; }
    c.dist = clamp(c.dist + I.zoom * 0.8, 2.6, 16);
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (G.time - c.lastLook > 2.4 && sp > 3 && !I.locked) c.yaw = dampAngle(c.yaw, P.yaw + Math.PI, 0.9, dt);
    // aim point: the hero, pulled a little toward the nearest rogue during the duel
    const side = c.close ? 0.55 : 0; // close view sits over the right shoulder
    PT.set(P.pos.x + Math.cos(c.yaw) * side, P.pos.y + (c.close ? 1.55 : 1.5), P.pos.z - Math.sin(c.yaw) * side);
    let extra = portrait ? 1.6 : 0;
    if (G.arena.active) {
      let best = null, bd = 30;
      for (const r of G.rogues) if (r.alive) { const d = Math.hypot(r.pos.x - P.pos.x, r.pos.z - P.pos.z); if (d < bd) { bd = d; best = r; } }
      if (best) { PT.x = lerp(PT.x, best.pos.x, 0.2); PT.z = lerp(PT.z, best.pos.z, 0.2); extra += clamp(bd * 0.18, 0, 3); }
    }
    c.target.lerp(PT, c.target.lengthSq() === 0 ? 1 : 1 - Math.exp(-16 * dt));
    DIR.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
    const want = c.dist + extra;
    let allowed = want;
    for (let s = 0.8; s <= want; s += 0.4) {
      A.copy(c.target).addScaledVector(DIR, s);
      if (A.y < 0.25 || G.world.solidAt(A.x, A.y, A.z)) { allowed = Math.max(1.0, s - 0.5); break; }
    }
    c.cur = allowed < c.cur ? damp(c.cur, allowed, 30, dt) : damp(c.cur, allowed, 4, dt);
    camera.position.copy(c.target).addScaledVector(DIR, c.cur);
    if (camera.position.y < 0.3) camera.position.y = 0.3;
    camera.lookAt(c.target);
    c.pos.copy(camera.position); c.look.copy(c.target);
    fov = damp(fov, (portrait ? 72 : 58) + clamp((sp - 8) * 1.2, 0, 8), 5, dt);
  }
  const sh = G.fx.shakeAmt;
  if (sh > 0.001) { camera.position.x += (Math.random() - 0.5) * sh * 0.5; camera.position.y += (Math.random() - 0.5) * sh * 0.5; camera.rotation.z += (Math.random() - 0.5) * sh * 0.02; }
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();
let perfT = 0, perfN = 0, perfChecks = 0;
const focus = new THREE.Vector3(0, 0, 80), fireC = new THREE.Color();
document.getElementById('loading').hidden = true;

function tick(dt) {
  G.time += dt;
  const I = G.input, P = G.player;

  for (let i = waits.length - 1; i >= 0; i--) { waits[i].t -= dt; if (waits[i].t <= 0) { waits[i].res(); waits.splice(i, 1); } }
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; w.fn(Math.min(1, w.t / w.dur)); if (w.t >= w.dur) { tweens.splice(i, 1); w.res(); } }
  let sim = dt;
  if (hitstopT > 0) { hitstopT -= dt; sim = 0; }
  else if (slowT > 0) { slowT -= dt; sim = dt * slowScale; }
  sim *= G.weave.timeScale; // the world slows while you weave signs
  if (cut) { runCut(dt); sim = 0; }

  // global keys
  if (started) {
    if (I.hit('hud')) { G.hudOff = !G.hudOff; G.ui.hudHidden(G.hudOff); }
    if (I.hit('cine') && !G.story.busy && !G.arena.active && !G.weave.focus) { cine = !cine; shotI = 0; shotT = 0; shotFading = false; G.ui.cine(cine); G.ui.el.fade.classList.remove('on'); if (P) P.locked = cine; if (!cine) G.cam.lastLook = G.time; }
    if (I.hit('time') && !G.state.omen && !G.story.busy) { const n = CYCLE[(CYCLE.indexOf(G.env.lookName) + 1) % CYCLE.length]; G.env.setLook(n); G.ui.lookName(LOOK_NAMES[n]); }
    if (I.hit('quality')) { setQuality((G.quality + 2) % 3); G.ui.toast(['Low detail', 'Medium detail', 'High detail'][G.quality]); }
    if (I.hit('sound')) G.ui.toast(G.audio.toggle() ? 'Sound off' : 'Sound on');
    if (I.hit('view')) { const c = G.cam; c.close = !c.close; c.dist = c.close ? 4.3 : 7.6; G.ui.toast(c.close ? 'Camera: close, over the shoulder' : 'Camera: far'); }
    if (I.hit('train') && P && !cut) G.story.train();
  }

  G.story.update(dt);
  G.touchUI.update();
  if (P) {
    P.update(sim);
    focus.copy(P.pos);
    G.ui.bars(P);
    if (G.arena.active) G.ui.foes(G.rogues);
  } else {
    previews.forEach((c, i) => c.update(dt, i === picked ? { name: 'idle', guard: true } : { name: 'arms' }));
    previews.forEach((c, i) => { c.root.position.z = damp(c.root.position.z, (i === picked ? 86.9 : 85.5), 6, dt); });
  }
  if (P) {
    for (const r of G.rogues) r.update(sim * G.foeSlow); // Lantern Eye slows them
    for (const r of [...G.illusions]) r.update(sim * G.foeSlow);
    for (const n of G.villagers) n.update(sim);
    for (const n of G.npcs) n.update(sim);
    if (G.dream.active) focus.copy(camera.position); // sky and sun follow the dream camera
  }
  // the riverside bonfire
  const fire = G.world.town.fireLight;
  if (G.state.bonfire) {
    const F = POI.bonfire;
    for (let i = 0; i < 2; i++) { fireC.set(Math.random() < 0.5 ? 0xff5a14 : 0xff9a30); G.fx.add.emit({ x: F.x + (Math.random() - 0.5) * 1.5, y: 0.5 + Math.random() * 0.7, z: F.z + (Math.random() - 0.5) * 1.5, vx: (Math.random() - 0.5) * 1.2, vy: 3.5 + Math.random() * 4.5, vz: (Math.random() - 0.5) * 1.2, life: 0.6 + Math.random() * 0.5, size: 1.3, size1: 0.15, color: fireC, boost: 0.7, alpha: 0.4 }); }
    if (Math.random() < dt * 14) { fireC.set(0xffd080); G.fx.add.emit({ x: F.x, y: 1.6, z: F.z, vx: (Math.random() - 0.5) * 3, vy: 5 + Math.random() * 5, vz: (Math.random() - 0.5) * 3, life: 1.6, size: 0.18, size1: 0, color: fireC, boost: 2.4, sway: 1 }); }
    fire.intensity = 62 + Math.sin(G.time * 17) * 7 + Math.sin(G.time * 7.3) * 6;
  } else fire.intensity = 0;
  G.projectiles.update(sim);
  G.jutsu.update(sim);
  G.ether.update(sim);
  G.jobs.update(sim);
  G.world.update(G.time, G.env);
  G.env.update(dt, focus);
  barrier.material.uniforms.t.value = G.time;
  if (cine || !started) focus.copy(camera.position).setY(0);
  G.fx.ambient(sim, focus, G.env, G.world, G.state);
  G.fx.update(sim, camera, renderer);
  G.dream.update(dt);
  updateCamera(dt);
  G.weave.update(dt);
  G.ui.update(dt, I);
  G.audio.update(dt);

  if (P && (G.frameN = (G.frameN || 0) + 1) % 3 === 0) {
    const m = [{ x: POI.ramenSeat.x, z: POI.ramenSeat.z, color: '#ff7a3c', r: 6 }], goal = G.jobs.target() || G.story.target();
    if (goal) m.push({ x: goal.x, z: goal.z, color: G.story.phase === 'omen' ? '#ff4d5e' : '#ffd060', shape: 'diamond' });
    for (const r of G.rogues) if (r.alive) m.push({ x: r.pos.x, z: r.pos.z, color: '#d8ccff', r: 6 });
    G.ui.drawMap(P, m);
  }

  I.endFrame();
}

// Test hooks: G.step(seconds) runs the game forward by hand (used when the tab is hidden and frames stop),
// G.auto = true clicks through dialogue on its own.
G.step = async (seconds, dt = 1 / 30) => {
  for (let i = 0, n = Math.round(seconds / dt); i < n; i++) { tick(dt); await null; await null; await null; }
  if (G.quality >= 2) composer.render(); else renderer.render(scene, camera);
};

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  if (G.turbo) for (let i = 0; i < G.turbo; i++) tick(1 / 30); // test hook: fast-forward
  else tick(dt);
  if (G.quality >= 2) { bloom.strength = 0.42 + G.env.glow * 0.1; composer.render(); }
  else renderer.render(scene, camera);

  // drop detail automatically on slow machines
  if (started && perfChecks < 2) {
    perfT += dt; perfN++;
    if (perfN >= 100) {
      if (perfT / perfN > 1 / 26 && G.quality > 0) { setQuality(G.quality - 1); G.ui.toast('Detail lowered for a smoother frame rate (G to change)'); }
      perfChecks++; perfT = 0; perfN = 0;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
