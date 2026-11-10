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
import { GameAudio } from './audio.js';
import { Story } from './story.js';
import { makeCharacter } from './character.js';
import { HEROES, Player, Gouma, Yoru, Villager, Projectiles } from './actors.js';
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
  state: { omen: false, beacon: false },
  arena: { active: false },
  cam: { yaw: 0, pitch: 0.24, dist: 7.4, cur: 7.4, override: null, pos: new THREE.Vector3(0, 12, 110), look: new THREE.Vector3(0, 8, 0), fov: 58, lastLook: -10, target: new THREE.Vector3() },
  player: null, rogues: [], illusions: [], villagers: [], time: 0, quality: 2,
};
if (typeof window !== 'undefined') window.__game = G;

G.env = new Env(scene, renderer);
G.world = new World(scene);
G.fx = new FX(scene);
G.input = new Input(canvas, document.getElementById('touch'));
G.audio = new GameAudio((typeof __AUDIO__ === 'undefined' ? true : __AUDIO__) ? (window.EMBER_AUDIO || []) : []);
G.ui = new UI(G);
G.story = new Story(G);
G.projectiles = new Projectiles(G);
G.ui.buildMap(G.world);

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
let hitstopT = 0, slowT = 0, slowScale = 1;
G.hitstop = (t) => { hitstopT = Math.max(hitstopT, t); };
G.slowmo = (scale, t) => { slowScale = scale; slowT = t; };
G.shoot = (o) => G.projectiles.shoot(o);

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
    fragmentShader: 'varying vec2 vUv; uniform float t; void main(){ float a = pow(1.0 - vUv.y, 2.5); float s = 0.6 + 0.4 * sin(vUv.x * 240.0 + t * 3.0 + vUv.y * 8.0); gl_FragColor = vec4(vec3(0.85, 0.8, 1.0) * 1.6, a * s * 0.55); }',
  }),
);
barrier.position.set(POI.arena.x, 3.5, POI.arena.z); barrier.visible = false;
scene.add(barrier);

// the ramen chef
const chef = makeCharacter({ hair: 0x3a3a40, hairStyle: 'bun', top: 0xf4efe6, pants: 0x2c3550, accent: 0xd9483a, eye: '#5a3b28', skin: 0xe0b088, grin: true, headband: true, scale: 1.04 });
chef.root.position.copy(POI.ramenChef); chef.root.rotation.y = Math.PI / 2;
scene.add(chef.root);

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
function start() {
  if (started) return;
  started = true;
  for (const c of previews) scene.remove(c.root);
  const hero = HEROES[picked];
  G.player = new Player(G, hero);
  G.ui.setHero(hero); G.ui.hideTitle(); G.ui.lookName(LOOK_NAMES[G.env.lookName]);
  canvas.focus?.();
  const hash = (location.hash || '').slice(1);
  if (hash === 'fight') { G.env.setLook('omen', true); G.state.omen = true; for (const n of G.villagers) n.hidden = true; G.placeRogues(); for (const r of G.rogues) r.char.root.visible = true; G.player.pos.set(0, 0, -12); G.ui.lookName(LOOK_NAMES.omen); G.story.setPhase('omen'); }
  else if (hash === 'roam') { G.story.setPhase('explore'); }
  else if (hash === 'beacon') { G.env.setLook('dusk', true); G.player.pos.set(0, G.world.beaconTopY + 3, POI.pagoda.z + 2); G.story.setPhase('beacon'); }
  else G.story.intro();
}
G.ui.buildTitle(HEROES, (i) => { picked = i; }, start);
addEventListener('keydown', (e) => {
  if (started) return;
  if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { picked = Number(e.code.slice(5)) - 1; G.ui.pick(picked); }
  if (e.code === 'ArrowRight') { picked = (picked + 1) % 3; G.ui.pick(picked); }
  if (e.code === 'ArrowLeft') { picked = (picked + 2) % 3; G.ui.pick(picked); }
  if (e.code === 'Enter') start();
});
G.start = (i = 0) => { picked = i; start(); };
G.setQuality = (q) => setQuality(q);

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
    c.dist = clamp(c.dist + I.zoom * 0.8, 3.5, 16);
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (G.time - c.lastLook > 2.4 && sp > 3 && !I.locked) c.yaw = dampAngle(c.yaw, P.yaw + Math.PI, 0.9, dt);
    // aim point: the hero, pulled a little toward the nearest rogue during the duel
    PT.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
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
const focus = new THREE.Vector3(0, 0, 80);
document.getElementById('loading').hidden = true;

function tick(dt) {
  G.time += dt;
  const I = G.input, P = G.player;

  for (let i = waits.length - 1; i >= 0; i--) { waits[i].t -= dt; if (waits[i].t <= 0) { waits[i].res(); waits.splice(i, 1); } }
  let sim = dt;
  if (hitstopT > 0) { hitstopT -= dt; sim = 0; }
  else if (slowT > 0) { slowT -= dt; sim = dt * slowScale; }

  // global keys
  if (started) {
    if (I.hit('hud')) { G.hudOff = !G.hudOff; G.ui.hudHidden(G.hudOff); }
    if (I.hit('cine') && !G.story.busy && !G.arena.active) { cine = !cine; shotI = 0; shotT = 0; shotFading = false; G.ui.cine(cine); G.ui.el.fade.classList.remove('on'); if (P) P.locked = cine; if (!cine) G.cam.lastLook = G.time; }
    if (I.hit('time') && !G.state.omen && !G.story.busy) { const n = CYCLE[(CYCLE.indexOf(G.env.lookName) + 1) % CYCLE.length]; G.env.setLook(n); G.ui.lookName(LOOK_NAMES[n]); }
    if (I.hit('quality')) { setQuality((G.quality + 2) % 3); G.ui.toast(['Low detail', 'Medium detail', 'High detail'][G.quality]); }
    if (I.hit('sound')) G.ui.toast(G.audio.toggle() ? 'Sound off' : 'Sound on');
  }

  G.story.update();
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
    for (const r of G.rogues) r.update(sim);
    for (const r of [...G.illusions]) r.update(sim);
    for (const n of G.villagers) n.update(sim);
  }
  chef.update(sim, { name: G.story.phase === 'explore' && G.story.busy ? 'cook' : 'idle' });
  G.projectiles.update(sim);
  G.world.update(G.time, G.env);
  G.env.update(dt, focus);
  barrier.material.uniforms.t.value = G.time;
  if (cine || !started) focus.copy(camera.position).setY(0);
  G.fx.ambient(sim, focus, G.env, G.world, G.state);
  G.fx.update(sim, camera, renderer);
  updateCamera(dt);
  G.ui.update(dt, I);

  if (P && (G.frameN = (G.frameN || 0) + 1) % 3 === 0) {
    const m = [{ x: POI.ramenSeat.x, z: POI.ramenSeat.z, color: '#ff7a3c', shape: G.story.phase === 'explore' ? 'diamond' : 'dot', r: 6 }];
    if (G.story.phase === 'omen' || G.story.phase === 'beacon') m.push({ x: POI.pagoda.x, z: G.story.phase === 'omen' ? POI.arena.z : POI.pagoda.z, color: G.story.phase === 'omen' ? '#ff4d5e' : '#ffd060', shape: 'diamond' });
    for (const r of G.rogues) if (r.alive) m.push({ x: r.pos.x, z: r.pos.z, color: '#d8ccff', r: 6 });
    G.ui.drawMap(P, m);
  }

  I.endFrame();
}

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
