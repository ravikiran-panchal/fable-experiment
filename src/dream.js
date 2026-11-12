// THE DREAM. A cinematic the hero can choose to remember at the village gate.
// Two sets are built far away from the village (so far that the camera cannot see one from the other):
//   the mindscape - still water under a blue sky, where the nine-tailed fox speaks
//   the valley    - mountains, firebirds, impossible flora and fauna, and the Ether guru by a waterfall
// Everything is made from code. The sets are only built the first time the dream is played.
import * as THREE from 'three';
import { Batch, GEO, RAMP, toon, TAU, smooth, makeRng } from './util.js';
import { makeCharacter } from './character.js';
import { etherPatch } from './ether.js';

const MZ = 4000, VX = 4000; // where the two sets live
const FOX = 0xffc9a0;
const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const m = (x, y, z) => [x, y, MZ + z];  // a point in the mindscape
const w = (x, y, z) => [VX + x, y, z];  // a point in the valley
const C = new THREE.Color();
const SPH = new THREE.SphereGeometry(1, 20, 14), CONE = new THREE.ConeGeometry(1, 1, 10);
const glow = (color, k = 1.5, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), ...o });
const put = (parent, geo, mat, p, s, r = [0, 0, 0]) => { const x = new THREE.Mesh(geo, mat); x.position.set(...p); x.scale.set(...s); x.rotation.set(...r); x.castShadow = true; parent.add(x); return x; };

const LINES = {
  kaze: ['Whoa. Okay. Giant fox, nine tails. I definitely ate something bad.', 'Me? I set my own sleeve on fire last week.'],
  rei: ['Nine tails. No scent, no shadow. So I am asleep.', 'Then why have I never once felt it?'],
  tsuki: ['Thirty years of night watches and I have never dreamed. Until you.', 'At my age. You are sure.'],
};

// ---------------------------------------------------------------- the fox: cream and orange, nine tails, sitting
function makeFox() {
  const root = new THREE.Group();
  const cream = toon(0xfbe9cf), orange = toon(0xf39a4b), deep = toon(0xe2713a), white = toon(0xfffaf2), dark = toon(0x2a2028);
  put(root, SPH, cream, [0, 1.05, -0.25], [0.95, 1.0, 1.15]);                       // haunches
  put(root, SPH, orange, [0, 1.4, -0.72], [0.8, 0.85, 0.78]);                       // orange saddle
  put(root, SPH, cream, [0, 1.95, 0.35], [0.72, 1.05, 0.7], [0.25, 0, 0]);          // chest
  for (let i = 0; i < 5; i++) put(root, CONE, white, [(i - 2) * 0.2, 1.72 - Math.abs(i - 2) * 0.09, 0.9], [0.2, 0.62, 0.16], [Math.PI - 0.3, 0, (i - 2) * -0.12]); // chest ruff
  for (const s of [-1, 1]) {
    put(root, SPH, cream, [s * 0.34, 0.78, 0.72], [0.2, 0.78, 0.22]);               // front leg
    put(root, SPH, orange, [s * 0.34, 0.15, 0.84], [0.25, 0.15, 0.33]);             // paw
    put(root, SPH, orange, [s * 0.74, 0.17, 0.2], [0.27, 0.17, 0.52]);              // hind foot
  }
  put(root, SPH, cream, [0, 2.6, 0.5], [0.42, 0.62, 0.42], [0.3, 0, 0]);            // neck
  const head = new THREE.Group(); head.position.set(0, 3.02, 0.62); root.add(head);
  put(head, SPH, cream, [0, 0, 0], [0.62, 0.56, 0.6]);
  put(head, SPH, orange, [0, 0.2, -0.13], [0.6, 0.42, 0.5]);                        // orange crown
  put(head, CONE, white, [0, -0.13, 0.72], [0.3, 0.78, 0.25], [Math.PI / 2, 0, 0]); // muzzle
  put(head, SPH, dark, [0, -0.1, 1.11], [0.07, 0.06, 0.06]);
  put(head, SPH, deep, [0, 0.31, 0.5], [0.06, 0.14, 0.04]);                         // small flame mark on the brow
  const eye = glow(0xffb640, 1.3), ears = [];
  for (const s of [-1, 1]) {
    put(head, CONE, cream, [s * 0.6, -0.14, 0.1], [0.2, 0.62, 0.15], [0, 0, -s * 1.95]); // cheek ruff
    const ear = new THREE.Group(); ear.position.set(s * 0.36, 0.38, -0.05); ear.rotation.z = -s * 0.22; head.add(ear); ears.push(ear);
    put(ear, CONE, orange, [0, 0.4, 0], [0.22, 0.85, 0.14]); put(ear, CONE, cream, [0, 0.34, 0.06], [0.12, 0.56, 0.08]); put(ear, CONE, deep, [0, 0.72, 0], [0.085, 0.24, 0.06]);
    put(head, SPH, eye, [s * 0.27, 0.06, 0.5], [0.115, 0.075, 0.05], [0, s * 0.35, s * 0.28]);
    put(head, SPH, dark, [s * 0.278, 0.06, 0.548], [0.028, 0.068, 0.02]);
    put(head, SPH, white, [s * 0.25, 0.09, 0.555], [0.018, 0.018, 0.012]);
    put(head, CONE, dark, [s * 0.41, 0.15, 0.43], [0.028, 0.22, 0.02], [0, 0, -s * 1.15]); // long lash
  }
  const tails = [], R = [0.3, 0.4, 0.48, 0.5, 0.42, 0.26], M = [cream, cream, cream, orange, orange, white];
  for (let i = 0; i < 9; i++) {
    const a = (i - 4) / 4 * 1.2, base = new THREE.Group();
    base.rotation.order = 'YXZ'; base.position.set(Math.sin(a) * 0.4, 0.95, -1.05); base.rotation.set(-1.0 - Math.abs(a) * 0.12, a, 0);
    root.add(base);
    const chain = [base];
    let parent = base;
    for (let k = 0; k < 6; k++) {
      put(parent, SPH, M[k], [0, 0.42, 0], [R[k], 0.56, R[k]]);
      if (k < 5) { const next = new THREE.Group(); next.position.y = 0.72; parent.add(next); chain.push(next); parent = next; }
    }
    tails.push(chain);
  }
  root.scale.setScalar(1.7);
  const update = (t, talk) => {
    head.rotation.set(0.24 + Math.sin(t * 0.8) * 0.04 + (talk ? Math.sin(t * 7) * 0.025 : 0), Math.sin(t * 0.5) * 0.08, 0);
    ears.forEach((e, i) => { e.rotation.x = Math.max(0, Math.sin(t * 0.7 + i * 2.4) - 0.92) * 4; });
    tails.forEach((chain, i) => chain.forEach((g, k) => { if (k) g.rotation.set(0.26 + Math.sin(t * 1.2 + i * 0.7 - k * 0.5) * 0.09, 0, Math.sin(t * 0.9 + i + k * 0.4) * 0.07); }));
  };
  return { root, update };
}

// ---------------------------------------------------------------- valley life
function makePhoenix() {
  const root = new THREE.Group(), gold = glow(0xffc040, 1.5, { side: THREE.DoubleSide }), fire = glow(0xff6a20, 1.5, { side: THREE.DoubleSide }), red = glow(0xe03a2a, 1.4, { side: THREE.DoubleSide });
  put(root, SPH, gold, [0, 0, 0], [0.7, 0.6, 1.5]); put(root, SPH, gold, [0, 0.45, 1.5], [0.3, 0.3, 0.75], [-0.5, 0, 0]); put(root, SPH, gold, [0, 0.85, 2.05], [0.36, 0.34, 0.42]);
  put(root, CONE, fire, [0, 0.8, 2.6], [0.12, 0.5, 0.12], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) put(root, CONE, red, [0, 1.25, 1.9 - i * 0.22], [0.07, 0.7, 0.07], [-0.5 - i * 0.3, 0, 0]);
  const wings = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.scale.x = s; a.position.set(s * 0.4, 0.2, 0.3); root.add(a);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2).rotateX(-Math.PI / 2).translate(1.7, 0, -0.2), fire); a.add(inner);
    const b = new THREE.Group(); b.position.set(3.4, 0, 0); a.add(b);
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.9, 0, 0, -1.3, 4.2, 0, -1.9], 3)); tri.computeVertexNormals();
    b.add(new THREE.Mesh(tri, red));
    wings.push([a, b]);
  }
  const tail = [];
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 8).rotateX(-Math.PI / 2).translate(0, 0, -4), i % 2 ? fire : gold); r.position.set(0, 0, -1.2); r.rotation.y = (i - 2) * 0.16; root.add(r); tail.push(r); }
  root.scale.setScalar(1.9);
  const update = (t) => {
    for (const [a, b] of wings) { a.rotation.z = Math.sin(t * 4.2) * 0.65; b.rotation.z = Math.sin(t * 4.2 - 0.9) * 0.6; }
    tail.forEach((r, i) => { r.rotation.x = Math.sin(t * 3 + i) * 0.12; });
  };
  return { root, update };
}

function makeStag(color) {
  const root = new THREE.Group(), body = toon(color), belly = toon(0xf4ecd8), horn = glow(0xffe9a0, 1.6);
  put(root, SPH, body, [0, 1.7, 0], [0.55, 0.6, 1.25]); put(root, SPH, belly, [0, 1.48, 0.05], [0.46, 0.4, 1.0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(root, GEO.cyl, body, [sx * 0.3, 0.62, sz * 0.8], [0.14, 1.3, 0.14]);
  for (let i = 0; i < 6; i++) put(root, SPH, horn, [(i % 2 ? 0.4 : -0.4), 1.95 + (i % 3) * 0.08, 0.6 - i * 0.26], [0.07, 0.07, 0.07]); // glowing spots
  const neck = new THREE.Group(); neck.position.set(0, 2.0, 1.0); root.add(neck);
  put(neck, SPH, body, [0, 0.55, 0.2], [0.22, 0.75, 0.24], [0.4, 0, 0]); put(neck, SPH, body, [0, 1.15, 0.55], [0.22, 0.24, 0.42]);
  for (const s of [-1, 1]) { put(neck, GEO.cyl, horn, [s * 0.22, 1.75, 0.45], [0.05, 0.9, 0.05], [0, 0, -s * 0.35]); put(neck, GEO.cyl, horn, [s * 0.5, 2.0, 0.45], [0.04, 0.6, 0.04], [0, 0, -s * 1.0]); put(neck, SPH, horn, [s * 0.36, 2.22, 0.45], [0.09, 0.09, 0.09]); put(neck, SPH, horn, [s * 0.78, 2.16, 0.45], [0.09, 0.09, 0.09]); }
  for (let i = 0; i < 3; i++) put(root, new THREE.PlaneGeometry(0.16, 1.4), new THREE.MeshBasicMaterial({ color: 0xf4ecd8, side: THREE.DoubleSide }), [(i - 1) * 0.12, 1.35, -1.35], [1, 1, 1], [0.5, (i - 1) * 0.4, 0]);
  return { root, update: (t, ph) => { neck.rotation.x = Math.max(0, 0.55 + Math.sin(t * 0.6 + ph) * 0.7); } }; // lifts its head, then grazes
}

function makeJelly(color) {
  const root = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), mat); root.add(dome);
  put(root, SPH, glow(0xffffff, 1.4), [0, 0.3, 0], [0.3, 0.3, 0.3]);
  const arms = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, r = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 2.6).translate(0, -1.3, 0), mat); r.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); r.rotation.y = -a; root.add(r); arms.push(r); }
  return { root, update: (t, ph) => { const p = Math.sin(t * 1.6 + ph); dome.scale.set(1 + p * 0.12, 1 - p * 0.14, 1 + p * 0.12); arms.forEach((r, i) => { r.rotation.x = Math.sin(t * 1.6 + ph - 1 + i) * 0.25; }); } };
}

function makePuff(color) {
  const root = new THREE.Group(), fur = toon(color), dark = toon(0x2a2028);
  const body = put(root, SPH, fur, [0, 0.5, 0], [0.5, 0.48, 0.5]);
  for (const s of [-1, 1]) { put(body, CONE, fur, [s * 0.4, 1.2, 0], [0.22, 1.5, 0.12], [0, 0, -s * 0.25]); put(body, SPH, dark, [s * 0.34, 0.15, 0.88], [0.09, 0.12, 0.05]); }
  put(body, SPH, toon(0xfffaf2), [0, -0.1, -0.95], [0.3, 0.3, 0.3]);
  return { root, update: (t, ph) => { const h = Math.abs(Math.sin(t * 2.6 + ph)); body.position.y = 0.5 + h * 0.9; body.scale.set(0.5 + (1 - h) * 0.06, 0.48 - (1 - h) * 0.08, 0.5 + (1 - h) * 0.06); } };
}

// Beings that are part person, part something that is not an animal: tree, flower, mushroom, crystal.
function makeHybrid(kind) {
  const looks = {
    root: { skin: 0x9a7650, hair: 0x4f8a45, hairStyle: 'wild', top: 0x5c7a3c, pants: 0x4a3828, accent: 0xd8c070, eye: '#e0c050', scale: 1.22 },
    bloom: { skin: 0xcfe8b0, hair: 0xf58fb4, hairStyle: 'bun', top: 0xf7a8c8, pants: 0x6fa860, accent: 0xfff0a0, eye: '#d83a7a', grin: true, scale: 0.98 },
    cap: { skin: 0xf6ead8, hair: 0xf6ead8, hairStyle: 'bun', top: 0xe8dcc8, pants: 0xb8a890, accent: 0xd8452c, eye: '#5a3b28', grin: true, scale: 0.72 },
    shard: { skin: 0xa8d8f0, hair: 0xe8f6ff, hairStyle: 'long', top: 0x5a78c8, pants: 0x38487a, accent: 0xbff0ff, eye: '#ffffff', stern: true, scale: 1.08 },
  };
  const c = makeCharacter(looks[kind]), H = c.J.head;
  if (kind === 'root') { for (const s of [-1, 1]) { put(H, GEO.cyl, toon(0x6a4a30), [s * 0.2, 0.55, 0], [0.05, 0.5, 0.05], [0, 0, -s * 0.5]); put(H, GEO.cyl, toon(0x6a4a30), [s * 0.38, 0.72, 0], [0.035, 0.3, 0.035], [0, 0, -s * 1.2]); put(H, GEO.ico1, toon(0x7fc45a), [s * 0.34, 0.86, 0], [0.26, 0.2, 0.26]); } }
  if (kind === 'bloom') for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; put(H, SPH, toon(i % 2 ? 0xff7ab8 : 0xffc0dc), [Math.cos(a) * 0.3, 0.22 + Math.sin(a) * 0.3, -0.06], [0.14, 0.14, 0.04], [0, 0, a]); }
  if (kind === 'cap') { put(H, new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), toon(0xd8452c), [0, 0.3, 0], [0.5, 0.34, 0.5]); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; put(H, SPH, toon(0xfffaf2), [Math.cos(a) * 0.3, 0.52, Math.sin(a) * 0.3], [0.07, 0.04, 0.07]); } }
  if (kind === 'shard') { for (const [x, y, z, s] of [[0.1, 0.52, 0, 0.2], [-0.12, 0.48, -0.05, 0.14], [0, 0.44, 0.1, 0.1]]) put(H, GEO.ico, glow(0x9fe8ff, 1.5), [x, y, z], [s * 0.5, s * 1.6, s * 0.5], [0, 0, x * -2]); for (const s of [-1, 1]) put(c.J.spine, GEO.ico, glow(0x9fe8ff, 1.5), [s * 0.3, 0.6, 0], [0.1, 0.3, 0.1], [0, 0, -s * 0.5]); }
  return c;
}

export class Dream {
  constructor(G) { this.G = G; this.active = null; this.built = false; this.t = 0; this.cam = null; this.talk = false; }

  build() {
    if (this.built) return;
    this.built = true;
    const G = this.G, scene = G.scene, r = makeRng(9091);

    // ---------- mindscape
    const mind = (this.mind = new THREE.Group()); mind.position.set(0, 0, MZ); scene.add(mind);
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { t: { value: 0 }, c1: { value: new THREE.Vector2(0, MZ) }, c2: { value: new THREE.Vector2(0, MZ + 7.5) } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 p = modelMatrix * vec4(position,1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `
        varying vec3 vW; uniform float t; uniform vec2 c1; uniform vec2 c2;
        // rings that leave the centre one after another, evenly spaced
        float rip(vec2 c, float reach){ float d = distance(vW.xz, c); return smoothstep(0.9, 1.0, sin(d * 3.6 - t * 2.4)) * exp(-d / reach) * smoothstep(0.4, 1.4, d); }
        void main(){
          vec3 v = normalize(cameraPosition - vW);
          float f = pow(1.0 - clamp(v.y, 0.0, 1.0), 3.0);
          vec3 col = mix(vec3(0.56, 0.78, 1.0), vec3(0.97, 0.99, 1.0), f); // a sky-blue mirror that pales to white
          col += 0.025 * sin(vW.x * 0.07 + t * 0.3) * sin(vW.z * 0.09 - t * 0.2);
          float r = clamp(rip(c1, 9.0) + rip(c2, 4.5), 0.0, 1.0);
          gl_FragColor = vec4(mix(col, vec3(1.0), r * 0.95), mix(0.58, 0.92, f) + r * 0.3);
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800).rotateX(-Math.PI / 2), this.waterMat); water.renderOrder = 2; mind.add(water);
    const puff = new THREE.SphereGeometry(1, 10, 6), cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.95 });
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + r() * 0.3, d = 330 + r() * 260, g = new THREE.Group();
      for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(puff, cloud); s.position.set((j - 1.5) * 26 + r() * 10, r() * 8, r() * 12); s.scale.set(26 + r() * 20, 9 + r() * 7, 16 + r() * 10); g.add(s); }
      g.position.set(Math.cos(a) * d, 70 + r() * 110, Math.sin(a) * d); mind.add(g);
    }
    this.fox = makeFox(); this.foxMirror = makeFox(); this.foxMirror.root.scale.y *= -1;
    mind.add(this.fox.root, this.foxMirror.root);
    this.heroMirror = makeCharacter(G.player.hero.look); this.heroMirror.root.scale.y *= -1; mind.add(this.heroMirror.root);

    // ---------- valley
    const val = (this.valley = new THREE.Group()); val.position.set(VX, 0, 0); scene.add(val);
    const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
    const g = cv.getContext('2d'), P = (x) => (x + 450) / 900 * 1024;
    g.fillStyle = '#74bd5c'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1500; i++) { g.fillStyle = r.pick(['rgba(96,170,84,0.4)', 'rgba(140,206,100,0.35)', 'rgba(70,150,96,0.35)', 'rgba(180,220,110,0.25)']); g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 8 + r() * 30, 5 + r() * 16, r() * 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 90; i++) { g.fillStyle = r.pick(['rgba(255,122,184,0.4)', 'rgba(63,208,192,0.35)', 'rgba(242,197,61,0.4)', 'rgba(154,108,255,0.38)', 'rgba(255,255,255,0.3)']); g.beginPath(); g.ellipse(P((r() - 0.5) * 420), P(-110 + r() * 360), 10 + r() * 34, 6 + r() * 18, r() * 3, 0, TAU); g.fill(); }
    g.fillStyle = '#d9cfa0'; g.fillRect(P(-10), P(-130), P(10) - P(-10), P(300) - P(-130));
    g.beginPath(); g.arc(P(0), P(-128), (P(24) - P(0)), 0, TAU); g.fill();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), etherPatch(new THREE.MeshToonMaterial({ map: tex, gradientMap: RAMP }), { ground: true }));
    ground.receiveShadow = true; val.add(ground);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), etherPatch(toon(0x74bd5c), { ground: true })); far.position.y = -0.2; val.add(far);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(15, 430).rotateX(-Math.PI / 2), G.world.waterMat); river.position.set(0, 0.07, 85); val.add(river);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(21, 30).rotateX(-Math.PI / 2), G.world.waterMat); pool.position.set(0, 0.07, -128); val.add(pool);
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(13, 82), G.world.fallMat); fall.position.set(0, 41, -146.6); val.add(fall);

    const B = new Batch(), L = new Batch();
    const LEAF = [0xff7ab8, 0x3fd0c0, 0xf2c53d, 0x9a6cff, 0xe0483a, 0x9fe04a, 0xcfe8ff, 0xff9a4a];
    const light = (c) => C.set(c).lerp(new THREE.Color(0xffffff), 0.35).getHex();
    // cliff behind the waterfall, mountains all round, rock spires close in
    for (let x = -110; x <= 110; x += 10) { const h = 78 + r() * 26, wd = 13 + r() * 6; if (Math.abs(x) < 8) { B.add(GEO.box, 0x767c8c, x, 39, -158, 16, 80, 16, 0, 0, 0, 0xa8b0c0); continue; } B.add(GEO.box, 0x7a8092, x + r() * 3, h / 2 - 2, -156 - r() * 5, wd, h, 18 + r() * 6, 0, (r() - 0.5) * 0.4, (r() - 0.5) * 0.05, 0x9aa0b0); B.add(GEO.ico, 0x3f9a78, x, h - 2, -156, wd * 1.1, 5, 16, 0, r() * 3, 0, 0x8fe0a0); }
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * TAU + r() * 0.15, d = 250 + r() * 110, h = 150 + r() * 130, wd = 150 + r() * 100, x = Math.cos(a) * d, z = Math.sin(a) * d + 40;
      B.add(GEO.cone, r.pick([0x3f6a7a, 0x4a5a8a, 0x5a4a82, 0x3f7a6a]), x, h / 2 - 8, z, wd, h, wd, 0, r() * 3, 0, r.pick([0xa8b8d8, 0xc8b0e0, 0xa0d8c8]));
      B.add(GEO.cone, 0xf4f8fc, x, h - 8 - h * 0.1, z, wd * 0.2, h * 0.2, wd * 0.2, 0, r() * 3, 0);
    }
    for (let i = 0; i < 12; i++) { const a = -0.6 + i / 12 * (Math.PI + 1.2), d = 150 + r() * 50, h = 60 + r() * 70; B.add(GEO.cone, 0x6a6e80, Math.cos(a) * d * (i % 2 ? 1 : -1), h / 2 - 3, 60 - Math.sin(a) * d * 0.7 + r() * 30, 20 + r() * 14, h, 20 + r() * 14, 0, r() * 3, (r() - 0.5) * 0.12, 0xb8a8d0); }
    // flora
    const blob = (x, z, s, col) => { B.add(GEO.cyl, 0x5b3f4a, x, 1.4 * s, z, 0.5 * s, 2.8 * s, 0.5 * s, 0, 0, 0, 0x8a6a70); for (let k = 0; k < 4; k++) { const a = r() * TAU, bs = (2.2 + r() * 1.5) * s; B.add(GEO.ico1, col, x + Math.cos(a) * 1.1 * s, (3.2 + r() * 1.6) * s, z + Math.sin(a) * 1.1 * s, bs, bs * 0.8, bs, r(), r() * 3, 0, light(col)); } };
    const spire = (x, z, s, col) => { B.add(GEO.cyl, 0x4f3524, x, s, z, 0.4 * s, 2 * s, 0.4 * s); for (let k = 0; k < 4; k++) B.add(GEO.cone, col, x, (2.2 + k * 1.3) * s, z, (3.2 - k * 0.7) * s, 2.2 * s, (3.2 - k * 0.7) * s, 0, r() * 3, 0, light(col)); };
    const shroom = (x, z, s, col) => { B.add(GEO.cyl, 0xf4ecd8, x, 1.5 * s, z, 0.6 * s, 3 * s, 0.6 * s, 0, 0, (r() - 0.5) * 0.2); B.add(GEO.sphere, col, x, 3.1 * s, z, 3.6 * s, 1.5 * s, 3.6 * s, 0, 0, 0, light(col)); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; L.add(GEO.sphere, 0xfffaf2, x + Math.cos(a) * 1.1 * s, 3.62 * s, z + Math.sin(a) * 1.1 * s, 0.4 * s, 0.14 * s, 0.4 * s); } };
    const crystal = (x, z, s, col) => { for (let k = 0; k < 4; k++) L.add(GEO.ico, col, x + (r() - 0.5) * 1.6 * s, (0.8 + r() * 0.8) * s, z + (r() - 0.5) * 1.6 * s, 0.5 * s, (1.8 + r() * 2.4) * s, 0.5 * s, (r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); };
    const free = (x, z) => Math.abs(x) > 12 && Math.hypot(x - 20, z + 106) > 24 && Math.hypot(x + 24, z - 44) > 12 && !(Math.abs(x) < 34 && z > 140);
    for (let i = 0; i < 230; i++) {
      const x = (r() - 0.5) * 300, z = -118 + r() * 330, s = 0.8 + r() * 1.5, col = r.pick(LEAF), k = r();
      if (!free(x, z)) continue;
      if (k < 0.45) blob(x, z, s, col); else if (k < 0.7) spire(x, z, s, col); else if (k < 0.88) shroom(x, z, s * 0.9, col); else crystal(x, z, s, r.pick([0x8ff0ff, 0xff9ae0, 0xc0a0ff]));
    }
    for (let i = 0; i < 320; i++) { const x = (r() - 0.5) * 240, z = -110 + r() * 300; if (Math.abs(x) < 8) continue; const col = r.pick([0xfff0a0, 0xff9ae0, 0x8ff0ff, 0xffffff, 0xffb060]); B.add(GEO.cyl6, 0x4f9a4a, x, 0.35, z, 0.05, 0.7, 0.05); L.add(GEO.sphere, col, x, 0.8, z, 0.3, 0.3, 0.3); }
    for (let i = 0; i < 5; i++) { const x = -90 + i * 45 + r() * 14, z = 20 + r() * 120, y = 26 + r() * 22, s = 6 + r() * 5; B.add(GEO.cone, 0x6a6e80, x, y - s * 0.7, z, s * 2, s * 1.6, s * 2, Math.PI, r() * 3, 0, 0x8a8ea0); B.add(GEO.cyl, 0x74bd5c, x, y + 0.2, z, s * 2, 0.6, s * 2); B.add(GEO.ico1, r.pick(LEAF), x, y + 3.4, z, 5, 4, 5, 0, r() * 3, 0, 0xffffff); B.add(GEO.cyl, 0x5b3f4a, x, y + 1.4, z, 0.5, 2.6, 0.5); }
    // the guru's ledge, and things close by that will melt
    B.add(GEO.cyl, 0x9aa0a8, 14, 0.2, -112, 11, 0.5, 11, 0, 0, 0, 0xc8ccd4);
    blob(23, -119, 1.3, 0xff7ab8); spire(5, -104, 1.2, 0x3fd0c0); shroom(4, -113, 1.0, 0xf2c53d); crystal(9, -120, 1.4, 0x8ff0ff); blob(15, -123, 0.9, 0x9a6cff);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; B.add(GEO.ico, 0x8a8e98, Math.cos(a) * 21.5, 0.5, -128 + Math.sin(a) * 21.5, 3 + r() * 2, 1.6 + r(), 2.4, r(), r() * 3, 0); }
    // a small camp for the partly-people
    for (const [x, z, col] of [[-30, 50, 0xff7ab8], [-19, 52, 0x3fd0c0], [-26, 39, 0xf2c53d]]) { B.add(GEO.sphere, 0xe8dcc8, x, 0, z, 6.4, 6.6, 6.4); B.add(GEO.cone, col, x, 4.4, z, 7.4, 3.2, 7.4, 0, 0, 0, light(col)); B.add(GEO.box, 0x3d281b, x, 1.1, z - 3.15, 1.4, 2.2, 0.2); }
    B.add(GEO.cyl, 0x6a4a30, -21, 3, 49.6, 0.7, 6, 0.7); for (let k = 0; k < 3; k++) L.add(GEO.ico, [0x8ff0ff, 0xff9ae0, 0xfff0a0][k], -21, 2 + k * 1.8, 49.2, 0.6, 0.6, 0.2);
    const solid = B.build(etherPatch(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP })));
    solid.castShadow = true; solid.receiveShadow = true;
    val.add(solid, L.build(etherPatch(new THREE.MeshBasicMaterial({ vertexColors: true }))));

    this.life = [];
    const live = (o, at, yaw, tick) => { o.root.position.set(...at); o.root.rotation.y = yaw; val.add(o.root); this.life.push({ o, ph: r() * 6, tick }); return o; };
    this.birds = [[-60, 120, 105, 92, 0.2], [70, 40, 90, 120, -0.16], [0, -60, 60, 70, 0.25]].map(([cx, cz, rad, h, sp], i) => live(makePhoenix(), [0, 0, 0], 0, (o, t) => {
      const a = t * sp + i * 2.1, x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad, y = h + Math.sin(t * 0.4 + i) * 9;
      o.root.position.set(x, y, z); o.root.rotation.set(0, Math.atan2(-Math.sin(a) * sp, Math.cos(a) * sp), Math.sign(sp) * -0.3, 'YXZ');
      for (let k = 0; k < 2; k++) { C.set(Math.random() < 0.5 ? 0xff8a2a : 0xffd060); G.fx.add.emit({ x: VX + x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 2, z: z + (Math.random() - 0.5) * 3, vy: -1.5, life: 1.3, size: 2.2, size1: 0, color: C, boost: 1.5 }); }
    }));
    for (const [x, z, yaw, col] of [[16, 62, -1.9, 0x3fb0a8], [20, 70, -1.4, 0x6a8ae0], [-15, 66, 1.7, 0x3fb0a8], [18, 54, -2.4, 0xb08ae0]]) live(makeStag(col), [x, 0, z], yaw);
    for (let i = 0; i < 9; i++) { const x = -30 + r() * 60, z = 30 + r() * 70, y0 = 5 + r() * 9; live(makeJelly(r.pick([0xff9ae0, 0x8ff0ff, 0xfff0a0, 0xc0a0ff])), [x, y0, z], 0, (o, t, ph) => { o.root.position.y = y0 + Math.sin(t * 0.7 + ph) * 1.4; o.root.position.x = x + Math.sin(t * 0.2 + ph) * 3; }).root.scale.setScalar(1 + r() * 1.3); }
    for (let i = 0; i < 9; i++) { const cx = 30 + r() * 14, cz = 78 + r() * 14, rad = 2 + r() * 4, sp = (r() - 0.5) * 1.2; live(makePuff(r.pick([0xd8c0ff, 0xffd0e0, 0xc0f0e0, 0xfff0c0])), [cx, 0, cz], 0, (o, t, ph) => { const a = t * sp + ph; o.root.position.set(cx + Math.cos(a) * rad, 0, cz + Math.sin(a) * rad); o.root.rotation.y = Math.atan2(-Math.sin(a) * sp, Math.cos(a) * sp); }); }
    this.folk = [['root', -27, 45.5, 1.2, { name: 'arms' }], ['bloom', -22.5, 43.2, -0.4, { name: 'wave' }], ['cap', -21.6, 46.6, -1.2, { name: 'dance' }], ['shard', -25.5, 48.6, 2.5, { name: 'idle' }], ['cap', -23.4, 41.6, 0.2, { name: 'cheer' }]].map(([kind, x, z, yaw, anim]) => { const c = makeHybrid(kind); c.root.position.set(x, 0, z); c.root.rotation.y = yaw; val.add(c.root); return { c, anim }; });
    this.guru = makeCharacter({ hair: 0xf2f2f6, hairStyle: 'long', top: 0xfbfaf6, pants: 0xe8e6e0, accent: 0xe0c070, cloak: 0xfbfaf6, emblem: 0xe0c070, hat: true, mask: '#f4f2ee', eye: '#bfe6ff', stern: true, scale: 1.12 });
    this.guru.root.position.set(14, 0.45, -112); this.guru.root.rotation.y = -2.2; val.add(this.guru.root);
    this.guruAnim = { name: 'idle' };
    mind.visible = false; val.visible = false;
  }

  // A camera move: from a to b, looking from la to lb, over `dur` seconds, then it holds.
  shot(a, b, la, lb, fov, dur) { this.cam = { a: v(a), b: v(b), la: v(la), lb: v(lb), fov, dur, t: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() }; }

  update(dt) {
    if (!this.active) return;
    const G = this.G, P = G.player, t = (this.t += dt);
    if (this.active === 'mind') {
      this.waterMat.uniforms.t.value = t;
      this.fox.update(t, this.talk); this.foxMirror.update(t, this.talk);
      const hm = this.heroMirror;
      hm.update(dt, P.anim); hm.root.position.set(P.pos.x, 0, P.pos.z - MZ); hm.root.rotation.y = P.yaw;
      for (let i = 0; i < 2; i++) { // white and peach steam curling round the fox
        const a = Math.random() * TAU, d = 2.3 + Math.random() * 3.6;
        C.set(Math.random() < 0.5 ? 0xffffff : 0xffd2b4);
        G.fx.norm.emit({ x: Math.cos(a) * d, y: 0.2 + Math.random() * 1.6, z: MZ - 0.6 + Math.sin(a) * d, vx: -Math.sin(a) * 0.9, vy: 0.3 + Math.random() * 0.5, vz: Math.cos(a) * 0.9, life: 3.4, size: 1.3, size1: 4.2, color: C, alpha: 0.17, shape: 0 });
      }
    } else {
      for (const l of this.life) { l.o.update(t, l.ph); l.tick?.(l.o, t, l.ph); }
      for (const f of this.folk) f.c.update(dt, f.anim);
      if (this.guruAnim.dur) this.guruAnim.p = Math.min(1, (this.guruAnim.p || 0) + dt / this.guruAnim.dur);
      this.guru.update(dt, this.guruAnim);
      if (Math.random() < dt * 30) { C.set(0xffffff); G.fx.norm.emit({ x: VX + (Math.random() - 0.5) * 12, y: 0.6, z: -143 + Math.random() * 3, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, vz: 2 + Math.random() * 2, life: 2.4, size: 2, size1: 6, color: C, alpha: 0.3, shape: 0 }); }
    }
    const c = this.cam;
    if (c) {
      c.t += dt;
      const k = smooth(Math.min(1, c.t / c.dur)) * 0.85 + Math.min(1, c.t / c.dur) * 0.15;
      G.cam.override = { pos: c.pos.lerpVectors(c.a, c.b, k), look: c.look.lerpVectors(c.la, c.lb, k), fov: c.fov, snap: true };
    }
  }

  async play() {
    const G = this.G, P = G.player, ui = G.ui, id = P.hero.id;
    const fox = async (text, hold = 0) => { this.talk = true; await Promise.all([ui.say('The Fox', text, FOX), G.wait(hold)]); this.talk = false; };
    const me = (text) => ui.say(P.hero.name, text, P.hero.color);
    await ui.fade(true, true);
    this.build();
    const back = { pos: P.pos.clone(), yaw: P.yaw, look: G.env.lookName };
    G.audio.stop('music_village'); G.audio.stop('amb_village'); G.audio.play('music_dream');
    G.state.dream = true; this.active = 'mind'; this.t = 0;
    this.mind.visible = true; G.env.setLook('dream', true);
    P.pos.set(0, 0, MZ + 7.5); P.yaw = Math.PI; P.anim = { name: 'idle', look: -0.5 };

    // ---- the still water. It starts out of focus and settles.
    ui.blur(20, 0);
    this.shot(m(19, 2.4, 25), m(14, 3.6, 21), m(0, 3.4, 3), m(0, 3.2, 3), 38, 12);
    await G.wait(0.4);
    ui.fade(false, true); ui.blur(0, 4.5); G.audio.play('bell');
    await G.wait(5.2);
    this.shot(m(1.5, 1.35, 10.4), m(1.9, 1.5, 10.9), m(0, 4.5, 0), m(0, 4.7, 0), 46, 8);
    await fox('There you are, little ember. Lift your chin. I am up here.');
    this.shot(m(-1.5, 2.3, 4.6), m(-1.2, 2.2, 4.9), m(0, 1.55, 7.5), m(0, 1.55, 7.5), 30, 6);
    await me(LINES[id][0]);
    this.shot(m(5.4, 5.3, 8.2), m(4.6, 5.5, 7.4), m(0, 4.9, 0.9), m(0, 4.9, 0.9), 30, 9);
    await fox('Listen. Six elements move through this world. Water. Earth. Air. Fire. Space.');
    this.shot(m(0.5, 17, 5.5), m(0.5, 21, 5.5), m(0, 0, 4), m(0, 0, 4), 40, 10);
    await fox('Every child is born holding one of them, or two. You know yours. You always have.');
    this.shot(m(-21, 1.5, 9), m(-17, 1.9, 6), m(0, 3.0, 3.6), m(0, 3.0, 3.6), 34, 11);
    await fox('The sixth is Ether. It does not obey the world. It rewrites it. Stone into water. Mountains into dust.');
    this.shot(m(-4.4, 5.6, 6.6), m(-3.8, 5.5, 6.0), m(0, 5.0, 0.9), m(0, 5.0, 0.9), 27, 8);
    await fox('Almost no one is born able to hold it. You were.');
    this.shot(m(1.3, 1.75, 5.2), m(1.0, 1.7, 5.6), m(0, 1.55, 7.5), m(0, 1.55, 7.5), 26, 6);
    await me(LINES[id][1]);
    this.shot(m(12, 6.5, 19), m(9, 9, 24), m(0, 3.2, 2), m(0, 3.4, 2), 40, 10);
    await fox('It sleeps until someone teaches it to wake. So look. I will show you where to go.');

    // ---- the valley
    await ui.fade(true, true);
    this.active = 'valley'; this.mind.visible = false; this.valley.visible = true; G.env.setLook('valley', true);
    this.shot(w(-150, 96, 300), w(-60, 62, 215), w(0, 38, 60), w(0, 34, 0), 46, 15);
    await G.wait(0.3); ui.fade(false, true);
    await G.wait(1.6);
    await fox('North, past the last road, there is a valley that no map admits to.', 3.5);
    this.shot(w(60, 86, 110), w(22, 96, 60), w(-20, 92, 30), w(-70, 96, 110), 40, 14);
    await fox('Firebirds nest in its peaks.', 3.5);
    this.shot(w(46, 2.2, 6), w(38, 3.4, 24), w(20, 6, 30), w(6, 7, 60), 50, 13);
    await fox('Its leaves grow in every colour the world forgot.', 3.5);
    this.shot(w(27, 1.6, 50), w(33, 2.4, 60), w(17, 2.2, 63), w(24, 2.6, 76), 44, 13);
    await fox('Its beasts have never been given names.', 3.5);
    this.shot(w(-15, 1.7, 39.5), w(-17.5, 2.0, 42), w(-24, 1.5, 45.5), w(-24, 1.6, 45.5), 40, 11);
    await fox('And those who live there are only partly people.', 3.5);
    // the guru: out of focus on purpose, never fully shown
    await ui.fade(true, true);
    this.shot(w(35, 2.6, -90), w(31, 3.2, -95), w(13, 2.4, -113), w(12, 3.2, -114), 34, 14);
    ui.blur(5, 0);
    await G.wait(0.2); ui.fade(false, true);
    await G.wait(1.0);
    this.guruAnim = { name: 'cast', p: 0, dur: 0.9 };
    G.ether.melt(new THREE.Vector3(VX + 14, 0.45, -112), 13, 3.0);
    await fox('There is a place in that valley, beneath the falling water, where the Ether guru will teach you everything they know.', 5.6);
    this.shot(w(27, 2.2, -98), w(25, 2.6, -101), w(13, 2.2, -114), w(8, 2.8, -122), 38, 9);
    ui.blur(3.5, 0.6);
    this.guru.root.rotation.y = Math.atan2(2 - 14, -133 + 112);
    this.guruAnim = { name: 'slam', p: 0, dur: 1.35 };
    G.ether.unmake(new THREE.Vector3(VX + 14, 0.45, -112), new THREE.Vector3(VX + 20.5, 0, -107.5), new THREE.Vector3(VX + 2, 3, -133));
    await fox('Go. And master both jutsu.', 4.6);
    // a breath, then back to the village
    this.guruAnim = { name: 'arms' };
    this.shot(w(-20, 40, 150), w(-30, 58, 190), w(0, 30, 20), w(0, 34, 0), 44, 8);
    ui.blur(0, 1.2);
    await G.wait(2.6);
    ui.blur(12, 2.2);
    await G.wait(1.5);
    await ui.fade(true);
    this.active = null; this.cam = null; this.valley.visible = false; G.state.dream = false;
    G.env.setLook(back.look, true);
    P.pos.copy(back.pos); P.yaw = back.yaw; P.anim = { name: 'idle' };
    ui.blur(0, 0);
    G.audio.stop('music_dream'); G.audio.play('music_village'); G.audio.play('amb_village');
  }
}
