import * as THREE from 'three';
import { Batch, GEO, PRISM, RAMP, toon, makeRng, clamp, TAU } from './util.js';
import { etherPatch } from './ether.js';
import { buildTown, TOWN_LOTS, FIRE_GAP } from './town.js';

// Kagaribi Village. North is -Z. Everything here is generated from code: no model files.
export const POI = {
  spawn: new THREE.Vector3(0, 0, 84),
  ramenSeat: new THREE.Vector3(-7.15, 0, 51),
  ramenChef: new THREE.Vector3(-11.2, 0, 51),
  arena: new THREE.Vector3(0, 0, -38),
  arenaR: 21,
  stairsTop: new THREE.Vector3(0, 2.4, -66.5),
  pagoda: new THREE.Vector3(0, 0, -76),
  beacon: new THREE.Vector3(0, 0, -76), // y is filled in when the pagoda is built
  training: new THREE.Vector3(60, 0, -44),
  pond: new THREE.Vector3(-50, 0, -74),
};

const WALLS = [0xf2e6cf, 0xe8d8b8, 0xf6efe2, 0xd9c7a3, 0xe3cfae, 0xefe0d0];
const ROOFS = [0x2f7391, 0xb4553a, 0x4a5a72, 0x5c8250, 0x93344a, 0x3a549a, 0x2f7391, 0xb4553a];
const WOOD = 0x6a442c, DARKWOOD = 0x3d281b, STONE = 0x9a968c, RED = 0xb8322c;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];   // boxes with optional sloped tops
    this.posts = [];       // thin cylinders (trees, poles)
    this.dummies = [];     // training posts you can hit
    this.steam = [];       // points that emit steam / smoke
    this.fireflies = [];
    this.craters = [];     // holes left by Dust Verdict: { x, z, r, d }
    this.B = new Batch();        // lit, shadow-casting geometry
    this.GL = new Batch();       // glowing windows
    this.LN = new Batch();       // glowing lanterns
    this.r = makeRng(20261110);
    this.group = new THREE.Group();
    scene.add(this.group);

    this._ground();
    this._river();
    this._bridge();
    this._walls();
    this._cliff();
    this._pagoda();
    this._plaza();
    this._ramen();
    this._training();
    this._houses();
    this._streetLanterns();
    this._nature();
    buildTown(this, POI);
    this._backdrop();

    const solid = this.B.build(etherPatch(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP })));
    solid.castShadow = true; solid.receiveShadow = true;
    this.windowMat = etherPatch(new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.lanternMat = etherPatch(new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.group.add(solid, this.GL.build(this.windowMat), this.LN.build(this.lanternMat));
  }

  // ---------- collision ----------
  box(minX, maxX, minZ, maxZ, h, o = {}) {
    const c = { minX, maxX, minZ, maxZ, h, y0: o.y0 || 0, roof: o.roof || 'flat', rh: o.rh || 0, ov: o.ov || 0, axis: o.axis || 'x', kind: o.kind || 'house', color: o.color || 0x888888 };
    c.cx = (minX + maxX) / 2; c.cz = (minZ + maxZ) / 2; c.hw = (maxX - minX) / 2; c.hd = (maxZ - minZ) / 2;
    this.colliders.push(c);
    return c;
  }

  topAt(c, x, z) {
    switch (c.roof) {
      case 'gable': return c.axis === 'x' ? c.h + c.rh * (1 - Math.abs(z - c.cz) / c.hd) : c.h + c.rh * (1 - Math.abs(x - c.cx) / c.hw);
      case 'hip': return c.h + c.rh * (1 - Math.max(Math.abs(x - c.cx) / c.hw, Math.abs(z - c.cz) / c.hd));
      case 'arch': { const t = (z - c.cz) / c.hd; return c.h * Math.max(0, 1 - t * t); }
      case 'ramp': return c.h * clamp((c.maxZ - z) / (c.maxZ - c.minZ), 0, 1);
      default: return c.h;
    }
  }

  // Pushes a body out of walls and returns the height of whatever it can stand on.
  resolve(pos, radius, height = 1.7) {
    let support = 0;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const ex = c.hw + c.ov + radius, ez = c.hd + c.ov + radius;
      const dx = pos.x - c.cx, dz = pos.z - c.cz;
      if (Math.abs(dx) > ex || Math.abs(dz) > ez) continue;
      const inRoof = Math.abs(dx) <= c.hw + c.ov && Math.abs(dz) <= c.hd + c.ov;
      const top = this.topAt(c, clamp(pos.x, c.minX - c.ov, c.maxX + c.ov), clamp(pos.z, c.minZ - c.ov, c.maxZ + c.ov));
      if (inRoof && pos.y >= top - 0.75) { if (top > support) support = top; continue; }
      if (pos.y + height < c.y0) continue;
      const px = c.hw + radius - Math.abs(dx), pz = c.hd + radius - Math.abs(dz);
      if (px <= 0 || pz <= 0) continue;
      if (pos.y >= top - 0.75) continue;
      if (px < pz) pos.x = c.cx + Math.sign(dx || 1) * (c.hw + radius);
      else pos.z = c.cz + Math.sign(dz || 1) * (c.hd + radius);
    }
    for (let i = 0; i < this.posts.length; i++) {
      const p = this.posts[i];
      if (pos.y > p.h) continue;
      const dx = pos.x - p.x, dz = pos.z - p.z, rr = p.r + radius, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = p.x + dx / d * rr; pos.z = p.z + dz / d * rr; }
    }
    pos.x = clamp(pos.x, -97.5, 97.5);
    pos.z = clamp(pos.z, -93, 97.5);
    if (support === 0) for (const c of this.craters) { // step down into a crater
      const d = Math.hypot(pos.x - c.x, pos.z - c.z) / c.r;
      if (d < 1) support = Math.min(support, -c.d * (1 - d * d));
    }
    return support;
  }

  // True if a point is inside something solid (used to keep the camera out of buildings).
  solidAt(x, y, z) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) continue;
      if (y > c.y0 - 0.2 && y < this.topAt(c, x, z) + 0.3) return true;
    }
    return false;
  }

  // Builds into throwaway batches so the random numbers are still used up but nothing appears.
  // This keeps every other house exactly where it was when a lot is cleared for a new building.
  _dry(on, keep) {
    if (on) { const k = { B: this.B, GL: this.GL, LN: this.LN, nc: this.colliders.length, np: this.posts.length }; this.B = new Batch(); this.GL = new Batch(); this.LN = new Batch(); return k; }
    this.B = keep.B; this.GL = keep.GL; this.LN = keep.LN; this.colliders.length = keep.nc; this.posts.length = keep.np;
  }

  // ---------- little builders ----------
  b(color, x, y, z, w, h, d, ry = 0, top = null) { this.B.add(GEO.box, color, x, y, z, w, h, d, 0, ry, 0, top); }
  cyl(color, x, y, z, r, h, top = null, geo = GEO.cyl) { this.B.add(geo, color, x, y, z, r * 2, h, r * 2, 0, 0, 0, top); }

  gableRoof(color, cx, cz, w, d, h, rh, ov, axis) {
    const span = axis === 'x' ? d : w, len = (axis === 'x' ? w : d) + 1.3;
    const drop = rh * ov / (span / 2);
    const ry = axis === 'x' ? 0 : Math.PI / 2;
    this.B.add(PRISM, color, cx, h - drop, cz, len, rh + drop, span + ov * 2, 0, ry, 0);
    this.B.add(PRISM, 0x2a2a30, cx, h - drop - 0.14, cz, len - 0.05, rh + drop, span + ov * 2 + 0.25, 0, ry, 0); // dark underside edge
    const c = new THREE.Color(color).multiplyScalar(0.72).getHex();
    if (axis === 'x') this.b(c, cx, h + rh + 0.05, cz, len + 0.3, 0.3, 0.45); else this.b(c, cx, h + rh + 0.05, cz, 0.45, 0.3, len + 0.3);
  }

  // Place something flat against one wall of a rectangle.
  onWall(side, cx, cz, w, d, u, y, ww, hh, thick, color, batch = this.B) {
    const e = thick / 2;
    if (side === 'e') batch.add(GEO.box, color, cx + w / 2 + e * 0.6, y, cz + u, thick, hh, ww);
    else if (side === 'w') batch.add(GEO.box, color, cx - w / 2 - e * 0.6, y, cz + u, thick, hh, ww);
    else if (side === 's') batch.add(GEO.box, color, cx + u, y, cz + d / 2 + e * 0.6, ww, hh, thick);
    else batch.add(GEO.box, color, cx + u, y, cz - d / 2 - e * 0.6, ww, hh, thick);
  }

  window(side, cx, cz, w, d, u, y, lit) {
    this.onWall(side, cx, cz, w, d, u, y, 1.5, 1.3, 0.14, DARKWOOD);
    if (lit) this.onWall(side, cx, cz, w, d, u, y, 1.25, 1.05, 0.2, 0xffd48a, this.GL);
    else this.onWall(side, cx, cz, w, d, u, y, 1.25, 1.05, 0.2, 0x7d8ea8);
    this.onWall(side, cx, cz, w, d, u, y, 0.07, 1.05, 0.26, DARKWOOD);
    this.onWall(side, cx, cz, w, d, u, y, 1.25, 0.07, 0.26, DARKWOOD);
  }

  lantern(x, y, z, color = 0xff8a3c, s = 1) {
    this.LN.add(GEO.sphere, color, x, y, z, 0.55 * s, 0.7 * s, 0.55 * s);
    this.b(0x2a1d16, x, y + 0.38 * s, z, 0.3 * s, 0.08 * s, 0.3 * s);
    this.b(0x2a1d16, x, y - 0.38 * s, z, 0.3 * s, 0.08 * s, 0.3 * s);
  }

  house(cx, cz, w, d, face) {
    const r = this.r;
    const stories = r.chance(0.42) ? 2 : 1, sh = 3.3, h = stories * sh + 0.3;
    const wall = r.pick(WALLS), roof = r.pick(ROOFS);
    this.b(STONE, cx, 0.25, cz, w + 0.35, 0.5, d + 0.35);
    this.b(wall, cx, h / 2 + 0.2, cz, w, h - 0.4, d);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.b(WOOD, cx + sx * (w / 2), h / 2, cz + sz * (d / 2), 0.34, h, 0.34);
    this.b(WOOD, cx, h - 0.16, cz, w + 0.3, 0.32, d + 0.3);
    if (stories === 2) this.b(WOOD, cx, sh + 0.1, cz, w + 0.3, 0.26, d + 0.3);
    const axis = w >= d ? 'x' : 'z', span = axis === 'x' ? d : w, rh = span * 0.3, ov = 0.95;
    this.gableRoof(roof, cx, cz, w, d, h, rh, ov, axis);
    this.box(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h, { roof: 'gable', rh, ov, axis, color: roof });

    const sides = ['n', 's', 'e', 'w'];
    for (const s of sides) {
      const len = (s === 'n' || s === 's') ? w : d, n = Math.max(1, Math.floor(len / 3.6));
      for (let st = 0; st < stories; st++) for (let i = 0; i < n; i++) {
        const u = (i - (n - 1) / 2) * (len / n);
        if (s === face && st === 0 && Math.abs(u) < 1.2) continue;
        if (r.chance(0.2)) continue;
        this.window(s, cx, cz, w, d, u, st * sh + 2.0, r.chance(0.6));
      }
    }
    // door, cloth sign and a porch light
    this.onWall(face, cx, cz, w, d, 0, 1.3, 1.4, 2.2, 0.16, DARKWOOD);
    this.onWall(face, cx, cz, w, d, 0, 2.55, 1.9, 0.55, 0.22, r.pick([0x2e4a8a, 0x9a2f3a, 0x2f6f5c, 0xd08a2c]));
    const sgn = (face === 'e' || face === 's') ? 1 : -1;
    const lx = (face === 'e' || face === 'w') ? cx + sgn * (w / 2 + 0.45) : cx + 1.5;
    const lz = (face === 'e' || face === 'w') ? cz + 1.5 : cz + sgn * (d / 2 + 0.45);
    if (r.chance(0.7)) this.lantern(lx, 2.3, lz, r.pick([0xff8a3c, 0xffb45a, 0xff6a4a]), 0.8);
    // clutter
    if (r.chance(0.6)) {
      const bx = (face === 'e' || face === 'w') ? cx + sgn * (w / 2 + 0.7) : cx - 2.2;
      const bz = (face === 'e' || face === 'w') ? cz - 2.2 : cz + sgn * (d / 2 + 0.7);
      this.cyl(0x7a5232, bx, 0.55, bz, 0.45, 1.1, 0x8f6540);
      if (r.chance(0.5)) this.b(0x9a7448, bx + 0.2, 0.4, bz + 1.0, 0.8, 0.8, 0.8, r() * 1);
    }
    if (r.chance(0.3)) { // roof water barrel
      const t = this.topAt(this.colliders[this.colliders.length - 1], cx, cz);
      this.cyl(0x6f5338, cx + (axis === 'x' ? w * 0.25 : 0), t + 0.5, cz + (axis === 'z' ? d * 0.25 : 0), 0.55, 1.0);
    }
  }

  tree(kind, x, z, s = 1) {
    const r = this.r;
    if (kind === 'cherry') {
      this.cyl(0x5b3a2a, x, 1.4 * s, z, 0.28 * s, 2.8 * s, 0x6f4a36);
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * TAU, d = r() * 1.5 * s, bs = (2.0 + r() * 1.4) * s;
        this.B.add(GEO.ico1, 0xf58fb4, x + Math.cos(a) * d, (3.2 + r() * 1.4) * s, z + Math.sin(a) * d, bs, bs * 0.8, bs, r(), r() * 3, 0, 0xffd0e0);
      }
      this.posts.push({ x, z, r: 0.4 * s, h: 2.6 * s });
    } else if (kind === 'pine') {
      this.cyl(0x4f3524, x, 1.0 * s, z, 0.22 * s, 2.0 * s);
      for (let i = 0; i < 3; i++) this.B.add(GEO.cone, 0x2c5a3c, x, (2.3 + i * 1.5) * s, z, (3.4 - i * 0.8) * s, 2.4 * s, (3.4 - i * 0.8) * s, 0, r() * 3, 0, 0x4d8a55);
      this.posts.push({ x, z, r: 0.35 * s, h: 5 * s });
    } else if (kind === 'round') {
      this.cyl(0x5b3f2a, x, 1.2 * s, z, 0.26 * s, 2.4 * s);
      for (let i = 0; i < 3; i++) {
        const a = r() * TAU, bs = (2.2 + r() * 1.3) * s;
        this.B.add(GEO.ico1, 0x3f7a3f, x + Math.cos(a) * 0.8 * s, (3.0 + r() * 1.2) * s, z + Math.sin(a) * 0.8 * s, bs, bs * 0.85, bs, r(), r() * 3, 0, 0x8fc45a);
      }
      this.posts.push({ x, z, r: 0.4 * s, h: 2.4 * s });
    } else { // bamboo
      for (let i = 0; i < 6; i++) {
        const bx = x + (r() - 0.5) * 2.2, bz = z + (r() - 0.5) * 2.2, bh = 5 + r() * 3;
        this.cyl(0x6fa84f, bx, bh / 2, bz, 0.09, bh, 0x9fd06a, GEO.cyl6);
        this.B.add(GEO.cone, 0x7fbf55, bx, bh + 0.3, bz, 1.2, 1.6, 1.2, 0.2, r() * 3, 0);
      }
      this.posts.push({ x, z, r: 1.0, h: 5 });
    }
  }

  stoneLantern(x, z) {
    this.b(STONE, x, 0.2, z, 0.9, 0.4, 0.9);
    this.cyl(STONE, x, 0.9, z, 0.18, 1.1);
    this.b(STONE, x, 1.5, z, 0.7, 0.14, 0.7);
    this.LN.add(GEO.box, 0xffc068, x, 1.82, z, 0.42, 0.5, 0.42);
    this.B.add(GEO.pyramid, 0x77736a, x, 2.1, z, 1.0, 0.45, 1.0);
    this.posts.push({ x, z, r: 0.45, h: 2.3 });
  }

  torii(x, z, s = 1) {
    for (const sx of [-1, 1]) {
      this.cyl(RED, x + sx * 3.2 * s, 2.8 * s, z, 0.3 * s, 5.6 * s);
      this.cyl(0x2a2a2a, x + sx * 3.2 * s, 0.25, z, 0.42 * s, 0.5);
      this.posts.push({ x: x + sx * 3.2 * s, z, r: 0.4 * s, h: 5.6 * s });
    }
    this.b(RED, x, 4.5 * s, z, 7.4 * s, 0.36 * s, 0.36 * s);
    this.b(RED, x, 5.5 * s, z, 8.6 * s, 0.42 * s, 0.5 * s);
    this.b(0x23232a, x, 5.85 * s, z, 9.2 * s, 0.3 * s, 0.7 * s);
  }

  // ---------- ground ----------
  _ground() {
    const S = 1024, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d'), r = makeRng(99);
    const P = (v) => (v + 128) * 4; // world -> pixel
    g.fillStyle = '#7fae58'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r.pick(['rgba(110,160,80,0.35)', 'rgba(140,186,96,0.3)', 'rgba(96,146,74,0.3)', 'rgba(160,196,108,0.22)']);
      const x = 40 + r() * (S - 80), y = 40 + r() * (S - 80), w = 6 + r() * 26;
      g.beginPath(); g.ellipse(x, y, w, w * (0.4 + r() * 0.5), r() * 3, 0, TAU); g.fill();
    }
    const path = (x0, z0, x1, z1, w, col = '#dcc79a', edge = '#bfa878') => {
      g.lineCap = 'round';
      g.strokeStyle = edge; g.lineWidth = (w + 1.2) * 4; g.beginPath(); g.moveTo(P(x0), P(z0)); g.lineTo(P(x1), P(z1)); g.stroke();
      g.strokeStyle = col; g.lineWidth = w * 4; g.beginPath(); g.moveTo(P(x0), P(z0)); g.lineTo(P(x1), P(z1)); g.stroke();
    };
    path(0, 100, 0, -58, 10);
    for (const x of [-38, 38]) path(x, 86, x, -80, 5.5);
    for (const z of [66, 40, 4, -22]) path(-86, z, 86, z, 5.5);
    path(38, -44, 60, -44, 5);
    // river bed tint under the water
    g.fillStyle = '#5f8f8f'; g.fillRect(0, P(16.4), S, (27.6 - 16.4) * 4);
    // plaza: pale stone rings
    const cx = P(0), cz = P(-38);
    g.fillStyle = '#b7ad98'; g.beginPath(); g.arc(cx, cz, 25 * 4, 0, TAU); g.fill();
    g.fillStyle = '#d6cdb8'; g.beginPath(); g.arc(cx, cz, 24 * 4, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,108,90,0.55)'; g.lineWidth = 2;
    for (let rr = 4; rr <= 24; rr += 4) { g.beginPath(); g.arc(cx, cz, rr * 4, 0, TAU); g.stroke(); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 16, cz + Math.sin(a) * 16); g.lineTo(cx + Math.cos(a) * 96, cz + Math.sin(a) * 96); g.stroke(); }
    g.fillStyle = '#c0553f'; g.beginPath(); g.arc(cx, cz, 3.2 * 4, 0, TAU); g.fill();
    g.fillStyle = '#f0c36a'; g.beginPath(); g.arc(cx, cz, 1.8 * 4, 0, TAU); g.fill();
    // training ground dirt, ramen forecourt, pond shore
    g.fillStyle = '#cdb489'; g.beginPath(); g.ellipse(P(60), P(-44), 15 * 4, 13 * 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#d2c3a4'; g.fillRect(P(-8), P(45), 3.4 * 4, 12 * 4);
    g.fillStyle = '#a9a58f'; g.beginPath(); g.arc(P(-50), P(-74), 14.5 * 4, 0, TAU); g.fill();
    // speckle
    for (let i = 0; i < 5000; i++) { g.fillStyle = r.chance(0.5) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; g.fillRect(r() * S, r() * S, 2, 2); }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(256, 256).rotateX(-Math.PI / 2), etherPatch(new THREE.MeshToonMaterial({ map: tex, gradientMap: RAMP }), { ground: true }));
    inner.receiveShadow = true;
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), etherPatch(new THREE.MeshToonMaterial({ color: 0x7fae58, gradientMap: RAMP }), { ground: true }));
    outer.position.y = -0.05;
    this.group.add(inner, outer);
    this.groundCanvas = cv;
  }

  _river() {
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { t: { value: 0 }, col: { value: new THREE.Color(0x4fa7c9) }, flow: { value: new THREE.Vector2(1, 0) } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        varying vec3 vW; uniform float t; uniform vec3 col; uniform vec2 flow;
        void main(){
          vec2 p = vW.xz - flow * t * 2.2;
          float a = sin(p.x * 0.55 + sin(p.y * 0.9 + t * 0.8) * 1.6) * sin(p.y * 1.7 + sin(p.x * 0.3 - t * 0.5) * 2.0);
          float b = sin(p.x * 1.3 - t * 1.4 + p.y * 2.1);
          float foam = smoothstep(0.82, 0.9, a) + smoothstep(0.93, 0.97, b) * 0.6;
          vec3 c = mix(col, col * 1.35 + 0.08, smoothstep(-0.2, 0.7, a));
          c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
          gl_FragColor = vec4(c, 0.88);
        }`,
    });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(260, 10).rotateX(-Math.PI / 2), this.waterMat);
    river.position.set(0, 0.06, 22);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(12.5, 28).rotateX(-Math.PI / 2), this.waterMat);
    pond.position.set(POI.pond.x, 0.06, POI.pond.z);
    this.group.add(river, pond);
    const r = this.r;
    for (let x = -96; x < 96; x += 2.6) for (const z of [16.6, 27.4]) {
      if (Math.abs(x) < 5.6) continue;
      const s = 0.7 + r() * 0.9;
      this.B.add(GEO.ico, r.pick([0x8f8b80, 0xa39f92, 0x7d7a72]), x + r(), 0.12, z + (r() - 0.5) * 0.8, s * 1.4, s * 0.7, s, r(), r() * 3, 0);
    }
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU, s = 1.2 + r() * 1.4;
      this.B.add(GEO.ico, r.pick([0x8f8b80, 0x6f6d68]), POI.pond.x + Math.cos(a) * 13, 0.3, POI.pond.z + Math.sin(a) * 13, s * 1.3, s, s, r(), r() * 3, 0);
    }
  }

  _bridge() {
    const d = 8, cz = 22, n = 12;
    for (let i = 0; i < n; i++) {
      const t0 = -1 + (i / n) * 2, t1 = -1 + ((i + 1) / n) * 2, tm = (t0 + t1) / 2;
      const y = 1.5 * (1 - tm * tm), slope = Math.atan2(1.5 * ((1 - t1 * t1) - (1 - t0 * t0)), (t1 - t0) * d);
      this.B.add(GEO.box, 0x8a5a3a, 0, y - 0.12, cz + tm * d, 10, 0.3, (2 * d / n) + 0.25, -slope, 0, 0);
      for (const sx of [-1, 1]) {
        this.B.add(GEO.box, RED, sx * 4.9, y + 1.0, cz + tm * d, 0.22, 0.2, (2 * d / n) + 0.25, -slope, 0, 0);
        if (i % 3 === 0) this.b(RED, sx * 4.9, y + 0.5, cz + tm * d, 0.3, 1.3, 0.3);
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this.b(RED, sx * 4.9, 0.9, cz + sz * d, 0.5, 1.8, 0.5);
      this.B.add(GEO.pyramid, 0x23232a, sx * 4.9, 1.8, cz + sz * d, 0.8, 0.4, 0.8);
      this.posts.push({ x: sx * 4.9, z: cz + sz * d, r: 0.3, h: 1.8 });
    }
    this.box(-5, 5, cz - d, cz + d, 1.5, { roof: 'arch', kind: 'bridge', color: 0x8a5a3a });
  }

  _walls() {
    const H = 7, cap = 0x3a4250, plaster = 0xe9e2d2;
    const seg = (x0, z0, x1, z1) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = Math.abs(x1 - x0) + 1.6, d = Math.abs(z1 - z0) + 1.6;
      this.b(STONE, cx, 0.6, cz, w + 0.3, 1.2, d + 0.3);
      this.b(plaster, cx, H / 2 + 0.6, cz, w, H - 1.2, d);
      this.b(cap, cx, H + 0.15, cz, w + 0.9, 0.4, d + 0.9);
      this.box(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, H + 0.35, { kind: 'wall', color: 0xbfb8a8 });
    };
    seg(-99, -92, -99, 99); seg(99, -92, 99, 99);
    seg(-99, 99, -9, 99); seg(9, 99, 99, 99);
    // great gate
    for (const sx of [-1, 1]) {
      this.b(RED, sx * 8.2, 5.5, 99, 2.2, 11, 2.6);
      this.b(0x2a2a30, sx * 8.2, 0.5, 99, 2.6, 1.0, 3.0);
    }
    this.b(RED, 0, 9.6, 99, 20, 1.1, 2.2);
    this.gableRoof(0x2f7391, 0, 99, 22, 4.2, 10.6, 2.0, 1.4, 'x');
    this.b(0x2a2018, 0, 8.3, 99.9, 6.4, 1.6, 0.3);
    this.LN.add(GEO.cyl, 0xff9a4a, 0, 8.3, 100.1, 1.0, 0.12, 1.0, Math.PI / 2, 0, 0);
    this.lantern(-5.4, 7.6, 98, 0xff7a3c, 1.5); this.lantern(5.4, 7.6, 98, 0xff7a3c, 1.5);
    this.box(-9, 9, 97.8, 100.4, 30, { y0: 0, kind: 'gate', color: 0xb8322c }); // you can look out, not walk out
    // watch towers either side of the gate
    for (const sx of [-1, 1]) {
      const x = sx * 22, z = 90;
      for (const ax of [-1, 1]) for (const az of [-1, 1]) this.cyl(WOOD, x + ax * 1.6, 5, z + az * 1.6, 0.2, 10);
      this.b(0x8a6a48, x, 9.8, z, 4.6, 0.3, 4.6);
      for (const ax of [-1, 1]) { this.b(WOOD, x + ax * 2.2, 10.5, z, 0.16, 0.9, 4.6); this.b(WOOD, x, 10.5, z + ax * 2.2, 4.6, 0.9, 0.16); }
      for (const ax of [-1, 1]) for (const az of [-1, 1]) this.cyl(WOOD, x + ax * 2.1, 11.4, z + az * 2.1, 0.12, 2.6);
      this.B.add(GEO.pyramid, 0x93344a, x, 12.6, z, 6.4, 1.8, 6.4);
      this.lantern(x, 12.0, z, 0xffb45a, 1.0);
      this.box(x - 2.3, x + 2.3, z - 2.3, z + 2.3, 9.95, { y0: 9.5, kind: 'tower', color: 0x8a6a48 });
      this.posts.push({ x: x - 1.6, z: z - 1.6, r: 0.3, h: 9 }, { x: x + 1.6, z: z - 1.6, r: 0.3, h: 9 }, { x: x - 1.6, z: z + 1.6, r: 0.3, h: 9 }, { x: x + 1.6, z: z + 1.6, r: 0.3, h: 9 });
    }
  }

  _cliff() {
    const r = this.r;
    for (let x = -118; x <= 118; x += 8) {
      const h = 34 + r() * 20, w = 11 + r() * 5, d = 16 + r() * 8;
      this.B.add(GEO.box, 0x5f5a58, x + r() * 3, h / 2 - 2, -106 - r() * 4, w, h, d, 0, (r() - 0.5) * 0.5, (r() - 0.5) * 0.06, 0xa39a8c);
      this.B.add(GEO.ico, 0x4f7a45, x + r() * 3, h - 2, -106, w * 1.1, 4, d * 0.9, 0, r() * 3, 0, 0x7fb45a);
      if (r.chance(0.6)) this.B.add(GEO.ico, 0x6a6562, x + r() * 4, 2 + r() * 3, -95.5 - r() * 2, 5 + r() * 4, 5 + r() * 5, 5, r(), r() * 3, 0, 0x8f877c);
    }
    this.box(-125, 125, -125, -95, 80, { kind: 'cliff', color: 0x6a6562 });
    // waterfall
    this.fallMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide,
      uniforms: { t: { value: 0 }, col: { value: new THREE.Color(0x8fd0ee) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec2 vUv; uniform float t; uniform vec3 col;
        void main(){
          float s = sin(vUv.x * 46.0 + sin(vUv.y * 9.0 + t * 3.0) * 1.5) * 0.5 + 0.5;
          float f = sin((vUv.y + t * 0.55) * 34.0 + vUv.x * 11.0) * 0.5 + 0.5;
          float w = smoothstep(0.35, 0.9, s * 0.6 + f * 0.6);
          float edge = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
          gl_FragColor = vec4(mix(col, vec3(1.0), w), (0.72 + 0.28 * w) * edge);
        }`,
    });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(9, 46), this.fallMat);
    fall.position.set(POI.pond.x, 22, -94.6);
    this.group.add(fall);
    this.mist = new THREE.Vector3(POI.pond.x, 0.5, -92);
  }

  _pagoda() {
    const px = POI.pagoda.x, pz = POI.pagoda.z;
    // podium + stairs
    this.b(0xa7a294, px, 1.2, pz, 34, 2.4, 24, 0, 0xbdb8aa);
    this.b(0x8d887c, px, 2.3, pz, 34.6, 0.3, 24.6);
    this.box(px - 17, px + 17, pz - 12, pz + 12, 2.4, { kind: 'podium', color: 0xa7a294 });
    for (let i = 0; i < 8; i++) this.b(0xb3ae9f, 0, 0.15 + i * 0.3, -57.4 - i * 0.82, 12, 0.3 + 0.001, 0.86);
    this.box(-6, 6, -64, -57, 2.4, { roof: 'ramp', kind: 'stairs', color: 0xb3ae9f });
    for (const sx of [-1, 1]) { this.b(RED, sx * 6.3, 1.6, -60.5, 0.4, 3.2, 7.2); this.posts.push({ x: sx * 6.3, z: -59, r: 0.4, h: 3 }, { x: sx * 6.3, z: -62, r: 0.4, h: 3 }); }
    // balustrade
    for (let x = -16; x <= 16; x += 4) { if (Math.abs(x) < 6) continue; this.b(RED, x, 2.9, -64.3, 0.3, 1.0, 0.3); }
    for (const sx of [-1, 1]) this.b(RED, sx * 11.2, 3.3, -64.3, 10, 0.2, 0.2);
    this.torii(0, -55, 1.15);

    let y0 = 2.4;
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const s = 13 - i * 1.7, wallH = 3.4, h = y0 + wallH, last = i === tiers - 1;
      const rh = last ? 4.4 : 1.3, ov = last ? 1.9 : 2.4;
      this.b(0xa8322c, px, y0 + wallH / 2, pz, s, wallH, s);
      for (const side of ['n', 's', 'e', 'w']) {
        this.onWall(side, px, pz, s, s, 0, y0 + wallH / 2, s * 0.62, wallH * 0.62, 0.12, 0xf3ead8);
        this.onWall(side, px, pz, s, s, 0, y0 + wallH / 2, s * 0.3, wallH * 0.5, 0.2, 0xffd48a, this.GL);
        this.onWall(side, px, pz, s, s, 0, y0 + wallH / 2, 0.09, wallH * 0.5, 0.26, DARKWOOD);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.b(DARKWOOD, px + sx * s / 2, y0 + wallH / 2, pz + sz * s / 2, 0.4, wallH, 0.4);
      const full = s + ov * 2, drop = rh * ov / (s / 2);
      this.B.add(GEO.pyramid, 0x2c4f66, px, h - drop + (rh + drop) / 2, pz, full, rh + drop, full, 0, 0, 0, 0x3f7391);
      this.B.add(GEO.pyramid, 0x1c1c22, px, h - drop + (rh + drop) / 2 - 0.16, pz, full + 0.3, rh + drop, full + 0.3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        this.B.add(GEO.cone, 0xe0b040, px + sx * full / 2, h - drop + 0.3, pz + sz * full / 2, 0.4, 1.1, 0.4, sz * 0.5, 0, -sx * 0.5);
        this.lantern(px + sx * (full / 2 - 0.4), h - drop - 0.5, pz + sz * (full / 2 - 0.4), 0xff8a3c, 0.7);
      }
      this.box(px - s / 2, px + s / 2, pz - s / 2, pz + s / 2, h, { y0, roof: 'hip', rh, ov, kind: 'pagoda', color: 0x2c4f66 });
      y0 = h;
      if (last) {
        const top = h + rh;
        this.cyl(0xe0b040, px, top + 1.4, pz, 0.14, 4.2);
        for (let k = 0; k < 4; k++) this.cyl(0xe0b040, px, top + 0.6 + k * 0.55, pz, 0.5 - k * 0.08, 0.14);
        POI.beacon.set(px, top, pz);
        this.beaconTopY = h;
      }
    }
    // the beacon bowl (lit by the story)
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0x3a2a20 });
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), this.beaconMat);
    bowl.position.set(px, POI.beacon.y + 3.9, pz);
    this.group.add(bowl);
    this.beaconMesh = bowl;
    this.beaconLight = new THREE.PointLight(0xffa040, 0, 120, 1.4);
    this.beaconLight.position.copy(bowl.position);
    this.group.add(this.beaconLight);
  }

  _plaza() {
    const c = POI.arena;
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) / 12 * TAU, x = c.x + Math.cos(a) * 25.6, z = c.z + Math.sin(a) * 25.6;
      if (Math.abs(x) < 7) continue;
      this.stoneLantern(x, z);
    }
    // market stalls on the plaza's east and west approaches
    const stall = (x, z, c1, c2) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { this.cyl(WOOD, x + sx * 1.9, 1.4, z + sz * 1.3, 0.09, 2.8); }
      for (let i = 0; i < 6; i++) this.B.add(GEO.box, i % 2 ? c1 : c2, x - 1.75 + i * 0.7, 2.95, z, 0.7, 0.1, 3.4, 0, 0, 0.0);
      this.b(0x8a6a48, x, 0.95, z, 3.6, 0.14, 2.0);
      this.b(0x6a4a30, x, 0.45, z, 3.4, 0.9, 1.8);
      const r = this.r;
      for (let i = 0; i < 9; i++) this.B.add(GEO.sphere, r.pick([0xe8502c, 0xf2a530, 0x7fbf3f, 0xd83a6a, 0xf2d43a]), x - 1.3 + (i % 3) * 0.9 + r() * 0.3, 1.2, z - 0.5 + Math.floor(i / 3) * 0.5, 0.42, 0.42, 0.42);
      this.box(x - 1.8, x + 1.8, z - 1.0, z + 1.0, 1.05, { kind: 'stall', color: c1 });
    };
    stall(-30, -30, 0xd8452c, 0xf4ecd8); stall(-30, -46, 0x2f6f9a, 0xf4ecd8);
    stall(30, -30, 0xe0a030, 0xf4ecd8); stall(30, -48, 0x4f8f4a, 0xf4ecd8);
  }

  _ramen() {
    // Open-fronted stall on the west side of the main street, facing east.
    const x0 = -17, x1 = -7.6, z0 = 45.5, z1 = 56.5, cx = (x0 + x1) / 2, cz = 51, h = 3.4;
    this.b(0x8a8478, cx, 0.12, cz, x1 - x0 + 0.6, 0.24, z1 - z0 + 0.6);
    this.b(0xe8d8b8, x0, h / 2, cz, 0.35, h, z1 - z0);               // back wall
    this.b(0xe8d8b8, cx, h / 2, z0, x1 - x0, h, 0.35);               // side walls
    this.b(0xe8d8b8, cx, h / 2, z1, x1 - x0, h, 0.35);
    for (const z of [z0, z1]) this.b(WOOD, x1, h / 2, z, 0.4, h, 0.4);
    this.b(WOOD, x1, h - 0.2, cz, 0.36, 0.4, z1 - z0);               // front beam
    this.box(x0 - 0.2, x0 + 0.2, z0, z1, h, { kind: 'ramen', color: 0xd8452c });
    this.box(x0, x1, z0 - 0.2, z0 + 0.2, h, { kind: 'ramen', color: 0xd8452c });
    this.box(x0, x1, z1 - 0.2, z1 + 0.2, h, { kind: 'ramen', color: 0xd8452c });
    this.gableRoof(0xb4402c, cx, cz, x1 - x0, z1 - z0, h, 2.2, 1.6, 'z');
    this.box(x0, x1, z0, z1, h, { y0: h - 0.3, roof: 'gable', rh: 2.2, ov: 1.6, axis: 'z', kind: 'ramenroof', color: 0xb4402c });
    // counter + stools
    this.b(0x9a6a40, -8.4, 0.55, cz, 1.0, 1.1, 8.6, 0, 0xb07c4c);
    this.b(0x5a3824, -8.4, 1.13, cz, 1.3, 0.1, 9.0);
    this.box(-8.95, -7.85, cz - 4.4, cz + 4.4, 1.15, { kind: 'counter', color: 0x9a6a40 });
    this.stools = [];
    for (let i = 0; i < 4; i++) {
      const z = cz - 3 + i * 2;
      this.cyl(0x3d281b, -7.15, 0.3, z, 0.07, 0.6); this.cyl(0xc0392b, -7.15, 0.63, z, 0.34, 0.12);
      this.stools.push(new THREE.Vector3(-7.15, 0.69, z));
    }
    // kitchen: pots, shelves, bottles
    this.b(0x55504a, -15.6, 0.6, cz, 1.6, 1.2, 8.4);
    for (const z of [49, 51.6, 54]) { this.cyl(0x8e9499, -15.5, 1.55, z, 0.62, 0.7, 0xb5bcc2); this.steam.push(new THREE.Vector3(-15.5, 2.0, z)); }
    this.b(0x6a442c, -16.6, 2.4, cz, 0.3, 0.1, 8.0);
    const r = this.r;
    for (let i = 0; i < 9; i++) this.cyl(r.pick([0x2f6f5c, 0xd8a43c, 0x8a2f2f, 0xf2ead8]), -16.55, 2.7, 47.6 + i * 0.85, 0.13, 0.5);
    // noren curtain, sign board, lanterns
    for (let i = 0; i < 5; i++) this.b(0x26407f, x1 + 0.05, h - 0.78, cz - 3.6 + i * 1.8, 0.06, 0.8, 1.62);
    this.lantern(x1 + 0.6, 2.5, z0 - 0.3, 0xff5a3a, 1.5);
    this.lantern(x1 + 0.6, 2.5, z1 + 0.3, 0xff5a3a, 1.5);
    const sign = document.createElement('canvas'); sign.width = 512; sign.height = 128;
    const g = sign.getContext('2d');
    g.fillStyle = '#2a1a12'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#e0b040'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
    g.fillStyle = '#f6e7c4'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 60px "Dela Gothic One", "Arial Black", sans-serif'; g.fillText('RAMEN HINODE', 256, 68);
    const tex = new THREE.CanvasTexture(sign); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(x1 + 1.75, h + 1.25, cz); board.rotation.y = Math.PI / 2;
    this.group.add(board);
    this.b(DARKWOOD, x1 + 1.68, h + 1.25, cz, 0.12, 2.1, 7.9);
    for (const z of [cz - 3.4, cz + 3.4]) this.b(DARKWOOD, x1 + 1.4, h + 0.4, z, 0.14, 1.9, 0.14);
    this.ramenLight = new THREE.PointLight(0xffb060, 30, 26, 1.6);
    this.ramenLight.position.set(-10.5, 3.0, cz);
    this.group.add(this.ramenLight);
    // the bowl that appears when you sit down
    const bowl = new THREE.Group();
    const mk = (geo, color, y, s) => { const m = new THREE.Mesh(geo, toon(color)); m.position.y = y; m.scale.set(...s); bowl.add(m); return m; };
    mk(new THREE.CylinderGeometry(0.5, 0.3, 0.5, 14), 0xc0392b, 0.25, [0.62, 0.5, 0.62]);
    mk(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 14), 0xf2c66a, 0.26, [0.62, 0.5, 0.62]);
    mk(GEO.sphere, 0xfdf6e3, 0.29, [0.16, 0.06, 0.16]).position.x = 0.1;
    mk(GEO.box, 0x2f5a3a, 0.29, [0.12, 0.02, 0.16]).position.set(-0.12, 0.29, 0.05);
    mk(GEO.cyl, 0xf58fb4, 0.29, [0.14, 0.03, 0.14]).position.set(0.0, 0.29, -0.14);
    bowl.position.set(-8.1, 1.18, 51); bowl.visible = false;
    this.group.add(bowl);
    this.bowl = bowl;
  }

  _training() {
    const c = POI.training;
    const postMat = toon(0x9a6f45), strawMat = toon(0xe0c27a);
    const pg = new THREE.CylinderGeometry(0.32, 0.36, 2.6, 10).translate(0, 1.3, 0);
    const sg = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 10).translate(0, 1.7, 0);
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const p = new THREE.Mesh(pg, postMat), s = new THREE.Mesh(sg, strawMat);
      p.castShadow = s.castShadow = true;
      g.add(p, s);
      g.position.set(c.x - 5 + i * 5, 0, c.z - 2);
      this.group.add(g);
      this.dummies.push({ pos: g.position, group: g, wob: 0, wobV: 0, dir: new THREE.Vector2(1, 0), radius: 0.5, height: 2.6 });
      this.posts.push({ x: g.position.x, z: g.position.z, r: 0.38, h: 2.6 });
    }
    // target boards on the fence
    for (let i = 0; i < 4; i++) {
      const x = c.x - 7.5 + i * 5;
      this.cyl(WOOD, x, 1.0, c.z - 12, 0.1, 2.0);
      this.B.add(GEO.cyl, 0xf4ecd8, x, 2.2, c.z - 12, 1.5, 0.12, 1.5, Math.PI / 2, 0, 0);
      this.B.add(GEO.cyl, 0xc0392b, x, 2.2, c.z - 11.93, 0.9, 0.12, 0.9, Math.PI / 2, 0, 0);
      this.B.add(GEO.cyl, 0xf4ecd8, x, 2.2, c.z - 11.88, 0.4, 0.12, 0.4, Math.PI / 2, 0, 0);
    }
    for (let x = c.x - 14; x <= c.x + 14; x += 3.5) { this.cyl(WOOD, x, 0.6, c.z - 13.5, 0.12, 1.2); }
    this.b(WOOD, c.x, 0.95, c.z - 13.5, 28, 0.14, 0.14); this.b(WOOD, c.x, 0.5, c.z - 13.5, 28, 0.14, 0.14);
  }

  _houses() {
    const r = this.r;
    const reserved = (x0, x1, z0, z1) => {
      const hit = (a0, a1, b0, b1) => x0 < a1 && x1 > a0 && z0 < b1 && z1 > b0;
      if (hit(-19.5, -4, 43, 59)) return true;                 // ramen
      if (hit(42, 78, -62, -28)) return true;                  // training ground
      if (hit(-66, -34, -90, -58)) return true;                // pond
      if (hit(-22, 22, -92, -54)) return true;                 // pagoda
      if (hit(-30, -12, 86, 99) || hit(12, 30, 86, 99)) return true; // watch towers
      const nx = clamp(0, x0, x1), nz = clamp(POI.arena.z, z0, z1);
      if (Math.hypot(nx, nz - POI.arena.z) < 27.5) return true; // plaza
      return false;
    };
    const blockX = [[-92, -42], [-34, -6.5], [6.5, 34], [42, 92]];
    const blockZ = [[70, 93], [44, 62], [8, 13.5], [30.5, 36], [-18, 0], [-50, -26], [-88, -54]];
    for (const [bx0, bx1] of blockX) for (const [bz0, bz1] of blockZ) {
      const depth = bz1 - bz0;
      if (depth < 7) { // river bank strips: blossom trees and benches
        for (let x = bx0 + 3; x < bx1 - 2; x += 7 + r() * 4) {
          const keep = bz0 === 30.5 && bx0 === 6.5 && x > FIRE_GAP[0] && x < FIRE_GAP[1] ? this._dry(true) : null; // room for the bonfire
          this.tree('cherry', x, (bz0 + bz1) / 2 + (r() - 0.5) * 2, 0.9 + r() * 0.4);
          if (keep) this._dry(false, keep);
        }
        continue;
      }
      const rows = depth >= 17 ? 2 : 1, rd = depth / rows;
      for (let row = 0; row < rows; row++) {
        const zc = bz0 + rd * (row + 0.5);
        let x = bx0 + 0.8;
        while (x < bx1 - 6.5) {
          const w = Math.min(7 + r() * 5.5, bx1 - 0.8 - x), d = Math.min(rd - 2.6, 6.5 + r() * 3.2);
          const cx = x + w / 2, cz = zc + (r() - 0.5) * 0.8;
          const face = rows === 2 ? (row === 0 ? 'n' : 's') : (r.chance(0.5) ? 'n' : 's');
          if (!reserved(cx - w / 2 - 0.5, cx + w / 2 + 0.5, cz - d / 2 - 0.5, cz + d / 2 + 0.5)) {
            const keep = TOWN_LOTS.some(([a0, a1, b0, b1]) => cx - w / 2 - 0.5 < a1 && cx + w / 2 + 0.5 > a0 && cz - d / 2 - 0.5 < b1 && cz + d / 2 + 0.5 > b0) ? this._dry(true) : null;
            if (r.chance(0.1)) { this.tree(r.pick(['round', 'cherry', 'bamboo']), cx, cz, 1.1); this.stoneLantern(cx + 2.5, cz + 1.5); }
            else this.house(cx, cz, w, d, face);
            if (keep) this._dry(false, keep);
          }
          x += w + 1.4 + r() * 2.2;
        }
      }
    }
  }

  _streetLanterns() {
    const cols = [0xff6a3a, 0xffa23c, 0xffd36a, 0xff5a5a, 0xffa23c];
    for (const z of [78, 67, 56, 45, 35, 9, -3, -12]) {
      for (const sx of [-1, 1]) { this.cyl(DARKWOOD, sx * 6.2, 2.9, z, 0.12, 5.8); this.posts.push({ x: sx * 6.2, z, r: 0.25, h: 5.8 }); }
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = -6.2 + t * 12.4, y = 5.6 - Math.sin(t * Math.PI) * 1.0;
        if (i < n) {
          const t2 = (i + 1) / n, x2 = -6.2 + t2 * 12.4, y2 = 5.6 - Math.sin(t2 * Math.PI) * 1.0;
          this.B.add(GEO.box, 0x1f1a18, (x + x2) / 2, (y + y2) / 2, z, Math.hypot(x2 - x, y2 - y), 0.04, 0.04, 0, 0, Math.atan2(y2 - y, x2 - x));
        }
        if (i > 0 && i < n) this.LN.add(GEO.sphere, cols[i % cols.length], x, y - 0.38, z, 0.46, 0.58, 0.46);
      }
    }
  }

  _nature() {
    const r = this.r;
    for (let i = 0; i < 9; i++) this.tree('cherry', POI.pond.x + Math.cos(i * 0.7 + 0.3) * 17.5, POI.pond.z + Math.sin(i * 0.7 + 0.3) * 15 + 2, 1 + r() * 0.5);
    for (const [x, z] of [[-9, 88], [9, 88], [-8, 31.5], [8, 31.5], [-8, 12.5], [8, 12.5]]) this.tree('cherry', x, z, 1.1);
    for (const [x, z] of [[74, -30], [80, -40], [78, -56], [44, -58], [46, -30]]) this.tree(r.pick(['pine', 'round']), x, z, 1.2);
    for (const [x, z] of [[-70, -62], [-30, -70], [26, -70], [30, -84], [-26, -86]]) this.tree('bamboo', x, z);
    this.fireflies.push(POI.pond.clone().setY(1.5), new THREE.Vector3(0, 1.5, 22), new THREE.Vector3(60, 1.5, -44));
  }

  _backdrop() {
    const r = makeRng(4242), M = new Batch();
    // mountain ring
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + r() * 0.2, d = 250 + r() * 170, h = 80 + r() * 150, w = 150 + r() * 130;
      const x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
      M.add(GEO.cone, 0x3f6a55, x, h / 2 - 6, z, w, h, w, 0, r() * 3, 0, 0x93a8c4);
      if (h > 150) M.add(GEO.cone, 0xe9f0f6, x, h - 6 - h * 0.11, z, w * 0.22, h * 0.22, w * 0.22, 0, r() * 3, 0);
    }
    const m = M.build(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP }));
    this.group.add(m);
    // forest outside the walls (instanced)
    const T = new Batch();
    T.add(GEO.cyl6, 0x4f3524, 0, 1.2, 0, 0.5, 2.4, 0.5);
    T.add(GEO.cone, 0x2c5a3c, 0, 4.0, 0, 4.4, 4.2, 4.4, 0, 0, 0, 0x4d8a55);
    T.add(GEO.cone, 0x2c5a3c, 0, 6.4, 0, 3.2, 3.6, 3.2, 0, 0.5, 0, 0x5d9a5d);
    const proto = T.build(null);
    const n = 620, inst = new THREE.InstancedMesh(proto.geometry, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP }), n);
    const o = new THREE.Object3D();
    let k = 0;
    while (k < n) {
      const x = (r() - 0.5) * 520, z = (r() - 0.5) * 520;
      if (Math.abs(x) < 106 && z < 106 && z > -128) continue;
      if (Math.abs(x) < 8 && z > 0) continue; // road out of the gate
      o.position.set(x, 0, z); o.rotation.y = r() * TAU;
      const s = 1.2 + r() * 1.6; o.scale.set(s, s * (0.9 + r() * 0.5), s);
      o.updateMatrix(); inst.setMatrixAt(k++, o.matrix);
    }
    // trees along the cliff top
    this.group.add(inst);
  }

  update(t, env) {
    this.waterMat.uniforms.t.value = t;
    this.waterMat.uniforms.col.value.copy(env.cur.water);
    this.fallMat.uniforms.t.value = t;
    this.fallMat.uniforms.col.value.copy(env.cur.water).lerp(new THREE.Color(0xffffff), 0.45);
    const gl = env.glow;
    this.lanternMat.color.setScalar(0.75 + gl * 0.75);
    this.windowMat.color.setScalar(0.5 + gl * 0.42);
    this.ramenLight.intensity = 8 + gl * 16;
    for (const d of this.dummies) {
      d.wobV += (-d.wob * 90 - d.wobV * 5) * 0.016;
      d.wob += d.wobV * 0.016;
      d.group.rotation.x = d.dir.y * d.wob; d.group.rotation.z = -d.dir.x * d.wob;
    }
  }
}
