import * as THREE from 'three';
import { clamp, lerp, TAU } from './util.js';

const VS = `
attribute vec4 aColor; attribute vec3 aMisc; // size, rotation, shape
uniform float uScale; varying vec4 vColor; varying vec2 vMisc;
void main(){
  vColor = aColor; vMisc = aMisc.yz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aMisc.x * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
varying vec4 vColor; varying vec2 vMisc;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vMisc.x), s = sin(vMisc.x);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  float a;
  if (vMisc.y < 0.5) a = 1.0 - smoothstep(0.05, 0.5, length(p));              // soft glow
  else if (vMisc.y < 1.5) a = step(length(p * vec2(1.0, 2.3)), 0.46);    // petal
  else a = 1.0 - smoothstep(0.42, 0.5, length(p));                             // flat toon dot
  if (a * vColor.a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

class Particles {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.misc = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.a0 = new Float32Array(n);
    this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.spin = new Float32Array(n); this.sway = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('aMisc', new THREE.BufferAttribute(this.misc, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, uniforms: { uScale: { value: 600 } },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 6 : 5;
    scene.add(this.points);
    this.geo = g;
  }

  emit(o) {
    const i = this.i; this.i = (i + 1) % this.n;
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = o.vx || 0; this.vel[i * 3 + 1] = o.vy || 0; this.vel[i * 3 + 2] = o.vz || 0;
    this.life[i] = this.max[i] = o.life || 1;
    this.s0[i] = o.size || 0.3; this.s1[i] = o.size1 ?? this.s0[i];
    this.a0[i] = o.alpha ?? 1;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag || 0; this.spin[i] = o.spin || 0; this.sway[i] = o.sway || 0;
    const c = o.color;
    this.col[i * 4] = c.r * (o.boost || 1); this.col[i * 4 + 1] = c.g * (o.boost || 1); this.col[i * 4 + 2] = c.b * (o.boost || 1); this.col[i * 4 + 3] = this.a0[i];
    this.misc[i * 3] = this.s0[i]; this.misc[i * 3 + 1] = o.rot || 0; this.misc[i * 3 + 2] = o.shape || 0;
  }

  update(dt, t) {
    const { pos, vel, life, max, n } = this;
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) { this.col[i * 4 + 3] = 0; this.misc[i * 3] = 0; continue; }
      const k = 1 - life[i] / max[i], d = Math.max(0, 1 - this.drag[i] * dt);
      vel[i * 3] *= d; vel[i * 3 + 1] = vel[i * 3 + 1] * d - this.grav[i] * dt; vel[i * 3 + 2] *= d;
      const sw = this.sway[i] ? Math.sin(t * 2 + i) * this.sway[i] : 0;
      pos[i * 3] += (vel[i * 3] + sw) * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += (vel[i * 3 + 2] + sw * 0.6) * dt;
      this.misc[i * 3] = lerp(this.s0[i], this.s1[i], k);
      this.misc[i * 3 + 1] += this.spin[i] * dt;
      this.col[i * 4 + 3] = this.a0[i] * Math.min(1, (1 - k) * 3) * Math.min(1, k * 12);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aMisc.needsUpdate = true;
  }
}

const tmpC = new THREE.Color(), V = new THREE.Vector3(), V2 = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.add = new Particles(scene, 3200, true);
    this.norm = new Particles(scene, 2600, false);
    this.shakeAmt = 0;
    this.t = 0;
    this.items = []; // timed objects: slashes, rings, ghosts, telegraphs

    // slash arcs
    const seg = 28, sp = [], sa = [];
    for (let i = 0; i <= seg; i++) for (const r of [0, 1]) {
      const a = (i / seg - 0.5) * Math.PI * 1.15;
      sp.push(Math.sin(a) * (0.55 + r * 0.45), 0, Math.cos(a) * (0.55 + r * 0.45)); sa.push(i / seg, r);
    }
    const idx = [];
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.slashGeo = new THREE.BufferGeometry();
    this.slashGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.slashGeo.setAttribute('uv', new THREE.Float32BufferAttribute(sa, 2));
    this.slashGeo.setIndex(idx);
    this.ringGeo = new THREE.RingGeometry(0.86, 1, 56).rotateX(-Math.PI / 2);
    this.discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
    this.sphereGeo = new THREE.SphereGeometry(1, 18, 12);

    // lightning segments
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.boltMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true).translate(0, 0.5, 0), this.boltMat, 160);
    this.boltMesh.frustumCulled = false; this.boltMesh.count = 0;
    this.boltMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(160 * 3), 3);
    scene.add(this.boltMesh);
    this.bolts = [];
    this._o = new THREE.Object3D();
  }

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

  // ---- particle helpers ----
  burst(p, n, o = {}) {
    const sys = o.normal ? this.norm : this.add;
    tmpC.set(o.color ?? 0xffffff);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, u = Math.random() * 2 - 1, k = Math.sqrt(1 - u * u), sp = (o.speed ?? 6) * (0.35 + Math.random() * 0.65);
      sys.emit({
        x: p.x + (Math.random() - 0.5) * (o.spread || 0), y: p.y + (Math.random() - 0.5) * (o.spread || 0), z: p.z + (Math.random() - 0.5) * (o.spread || 0),
        vx: Math.cos(a) * k * sp, vy: (o.flat ? Math.abs(u) * 0.25 : u) * sp + (o.up || 0), vz: Math.sin(a) * k * sp,
        life: (o.life ?? 0.5) * (0.6 + Math.random() * 0.6), size: (o.size ?? 0.3) * (0.6 + Math.random() * 0.8), size1: o.size1 ?? 0,
        color: tmpC, boost: o.boost || 1, alpha: o.alpha ?? 1, grav: o.grav ?? 0, drag: o.drag ?? 2, shape: o.shape || 0, spin: o.spin || 0, rot: Math.random() * 6,
      });
    }
  }

  dust(p, n = 6, color = 0xd9c9a8) { this.burst(p, n, { normal: true, color, speed: 2.6, flat: true, life: 0.55, size: 0.5, size1: 1.1, alpha: 0.5, shape: 2, drag: 3, up: 0.6 }); }
  sparks(p, color = 0xffe08a, n = 14) { this.burst(p, n, { color, speed: 10, life: 0.3, size: 0.28, boost: 2.2, drag: 3, grav: 8 }); this.burst(p, 4, { color: 0xffffff, speed: 2, life: 0.14, size: 1.5, size1: 0.2, boost: 2 }); }
  moths(p, n = 40) { this.burst(p, n, { normal: true, color: 0xe8e2d0, speed: 5, life: 1.1, size: 0.28, shape: 1, spin: 9, drag: 1.5, spread: 1.2, up: 1.5 }); this.burst(p, n / 2, { normal: true, color: 0x2a2030, speed: 4, life: 0.9, size: 0.5, size1: 1.4, alpha: 0.6, shape: 2, drag: 2, spread: 1 }); }
  ripple(p, color = 0xffffff) { this.ring(V.set(p.x, 0.09, p.z), { r0: 0.3, r1: 1.6, life: 0.6, color, opacity: 0.6, additive: false }); }

  // ---- timed meshes ----
  slash(pos, yaw, o = {}) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { col: { value: new THREE.Color(o.color ?? 0xffffff) }, k: { value: 0 }, boost: { value: o.boost ?? 2.2 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float k; uniform float boost;
        void main(){ float head = k * 1.5; float a = smoothstep(head - 0.75, head, vUv.x) * step(vUv.x, head) ;
          a *= smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.55, 1.0, k));
          gl_FragColor = vec4(mix(col, vec3(1.0), vUv.y * 0.7) * boost, a); }`,
    });
    const m = new THREE.Mesh(this.slashGeo, mat);
    m.position.copy(pos); m.rotation.order = 'YXZ';
    m.rotation.set(o.tilt || 0, yaw, o.roll || 0);
    m.scale.setScalar(o.size || 2.2); if (o.flip) m.scale.x *= -1;
    m.renderOrder = 7;
    this.scene.add(m);
    this.items.push({ m, life: o.life || 0.22, max: o.life || 0.22, tick: (it, k) => { mat.uniforms.k.value = k; } });
  }

  ring(pos, o = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: o.color ?? 0xffffff, transparent: true, opacity: o.opacity ?? 0.9, depthWrite: false, side: THREE.DoubleSide, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending });
    if (o.boost) mat.color.multiplyScalar(o.boost);
    const m = new THREE.Mesh(this.ringGeo, mat);
    m.position.copy(pos); m.renderOrder = 4;
    this.scene.add(m);
    const r0 = o.r0 ?? 0.5, r1 = o.r1 ?? 6, op = mat.opacity;
    const it = { m, life: o.life || 0.5, max: o.life || 0.5, radius: r0, tick: (it2, k) => { it2.radius = lerp(r0, r1, o.linear ? k : 1 - (1 - k) * (1 - k)); m.scale.setScalar(it2.radius); mat.opacity = op * (o.hold ? Math.min(1, (1 - k) * 4) : 1 - k); } };
    this.items.push(it);
    return it;
  }

  orb(pos, o = {}) { // expanding energy sphere
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? 0xffffff).multiplyScalar(o.boost ?? 1.6), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(this.sphereGeo, mat);
    m.position.copy(pos); this.scene.add(m);
    const r0 = o.r0 ?? 0.3, r1 = o.r1 ?? 4;
    this.items.push({ m, life: o.life || 0.35, max: o.life || 0.35, tick: (it, k) => { m.scale.setScalar(lerp(r0, r1, 1 - (1 - k) * (1 - k))); mat.opacity = 0.85 * (1 - k); } });
  }

  telegraph(pos, radius, life, color = 0xff3344) {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false }));
    const edge = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    edge.scale.setScalar(radius); g.add(fill, edge);
    g.position.set(pos.x, (pos.y || 0) + 0.1, pos.z); g.renderOrder = 3;
    this.scene.add(g);
    this.items.push({ m: g, life, max: life, tick: (it, k) => { fill.scale.setScalar(Math.max(0.01, radius * k)); fill.material.opacity = 0.18 + 0.3 * k; } });
  }

  ghost(g, life = 0.3) {
    this.scene.add(g);
    const op = g.userData.mat.opacity;
    this.items.push({ m: g, life, max: life, tick: (it, k) => { g.userData.mat.opacity = op * (1 - k); } });
  }

  bolt(a, b, o = {}) {
    this.bolts.push({ a: a.clone(), b: b.clone(), life: o.life || 0.25, color: new THREE.Color(o.color ?? 0xb48cff).multiplyScalar(o.boost ?? 2.5), width: o.width || 0.07, jag: o.jag ?? 0.7, segs: o.segs || 7, branch: o.branch ?? 0.3 });
  }

  _drawBolts() {
    let n = 0;
    const o = this._o, mesh = this.boltMesh;
    const put = (p, q, w, c) => {
      if (n >= 160) return;
      V2.subVectors(q, p); const len = V2.length(); if (len < 1e-4) return;
      o.position.copy(p); o.quaternion.setFromUnitVectors(UP, V2.divideScalar(len)); o.scale.set(w, len, w); o.updateMatrix();
      mesh.setMatrixAt(n, o.matrix); mesh.setColorAt(n, c); n++;
    };
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), br = new THREE.Vector3();
    for (const bt of this.bolts) {
      p0.copy(bt.a);
      for (let i = 1; i <= bt.segs; i++) {
        p1.lerpVectors(bt.a, bt.b, i / bt.segs);
        if (i < bt.segs) { p1.x += (Math.random() - 0.5) * bt.jag; p1.y += (Math.random() - 0.5) * bt.jag; p1.z += (Math.random() - 0.5) * bt.jag; }
        put(p0, p1, bt.width, bt.color);
        if (Math.random() < bt.branch) { br.copy(p1).add(V.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(bt.jag * 2.2)); put(p1, br, bt.width * 0.5, bt.color); }
        p0.copy(p1);
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // ---- ambient atmosphere ----
  ambient(dt, focus, env, world, state) {
    if (state.dream) return; // the dream has its own air
    const night = clamp(env.cur.stars * 1.2, 0, 1), omen = state.omen;
    // blossom petals drift across the whole village
    this._pet = (this._pet || 0) + dt * (omen ? 6 : 26);
    while (this._pet > 1) {
      this._pet -= 1;
      tmpC.set(Math.random() < 0.5 ? 0xffc2d6 : 0xff9fc0).multiplyScalar(lerp(1, 0.55, night));
      this.norm.emit({ x: focus.x + (Math.random() - 0.5) * 60, y: focus.y + 4 + Math.random() * 14, z: focus.z + (Math.random() - 0.5) * 60, vx: 1.6 + Math.random(), vy: -1.1 - Math.random() * 0.8, vz: 0.5, life: 7, size: 0.2 + Math.random() * 0.12, color: tmpC, shape: 1, spin: 2 + Math.random() * 4, rot: Math.random() * 6, sway: 1.4, alpha: 0.95 });
    }
    // ash and embers when the rogues arrive
    if (omen) {
      this._emb = (this._emb || 0) + dt * 30;
      while (this._emb > 1) {
        this._emb -= 1;
        tmpC.set(Math.random() < 0.6 ? 0xff5a4a : 0xffa860);
        this.add.emit({ x: focus.x + (Math.random() - 0.5) * 50, y: Math.random() * 3, z: focus.z + (Math.random() - 0.5) * 50, vx: 0.5, vy: 1.5 + Math.random() * 2.5, vz: 0, life: 4, size: 0.12 + Math.random() * 0.12, size1: 0, color: tmpC, boost: 2.2, sway: 1.2 });
      }
    }
    // fireflies after dark
    if (night > 0.3) {
      this._fly = (this._fly || 0) + dt * 14 * night;
      while (this._fly > 1) {
        this._fly -= 1;
        const c = Math.random() < 0.5 ? focus : world.fireflies[Math.floor(Math.random() * world.fireflies.length)];
        tmpC.set(0xd8ff7a);
        this.add.emit({ x: c.x + (Math.random() - 0.5) * 34, y: 0.6 + Math.random() * 3.5, z: c.z + (Math.random() - 0.5) * 34, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.8, life: 3.5, size: 0.16, color: tmpC, boost: 2.4, sway: 0.8 });
      }
    }
    // steam, chimney smoke, waterfall mist
    this._stm = (this._stm || 0) + dt * 10;
    while (this._stm > 1) {
      this._stm -= 1;
      const s = world.steam[Math.floor(Math.random() * world.steam.length)];
      tmpC.set(0xffffff);
      this.norm.emit({ x: s.x + (Math.random() - 0.5) * 0.5, y: s.y, z: s.z + (Math.random() - 0.5) * 0.5, vx: 0.2, vy: 1.3, vz: 0, life: 1.8, size: 0.5, size1: 1.6, color: tmpC, alpha: 0.32, shape: 0, sway: 0.4 });
      const m = world.mist;
      for (let i = 0; i < 2; i++) this.norm.emit({ x: m.x + (Math.random() - 0.5) * 9, y: 0.4, z: m.z + Math.random() * 2, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, vz: 1.5 + Math.random() * 2, life: 2.2, size: 1.6, size1: 4.5, color: tmpC, alpha: 0.3, shape: 0 });
    }
    if (state.beacon) {
      const b = world.beaconMesh.position;
      for (let i = 0; i < 2; i++) {
        tmpC.set(Math.random() < 0.5 ? 0xff6a1a : 0xffb040);
        this.add.emit({ x: b.x + (Math.random() - 0.5) * 1.0, y: b.y + 0.3, z: b.z + (Math.random() - 0.5) * 1.0, vx: (Math.random() - 0.5) * 1.2, vy: 4 + Math.random() * 5, vz: (Math.random() - 0.5) * 1.2, life: 0.8 + Math.random() * 0.6, size: 1.5, size1: 0.15, color: tmpC, boost: 0.9, alpha: 0.7 });
      }
    }
  }

  firework(p, color) {
    tmpC.set(color);
    for (let i = 0; i < 110; i++) {
      const a = Math.random() * TAU, u = Math.random() * 2 - 1, k = Math.sqrt(1 - u * u), sp = 15 + Math.random() * 3;
      this.add.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * k * sp, vy: u * sp, vz: Math.sin(a) * k * sp, life: 1.5 + Math.random() * 0.6, size: 1.3, size1: 0.1, color: tmpC, boost: 2.6, drag: 1.6, grav: 4 });
    }
    this.orb(p, { color, r0: 1, r1: 9, life: 0.4, boost: 1.2 });
  }

  update(dt, camera, renderer) {
    this.t += dt;
    const h = renderer.domElement.height;
    const scale = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    this.add.mat.uniforms.uScale.value = scale; this.norm.mat.uniforms.uScale.value = scale;
    this.add.update(dt, this.t); this.norm.update(dt, this.t);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0) {
        this.scene.remove(it.m);
        it.m.traverse?.((o) => { if (o.material && o.material !== this.boltMat && !o.userData.keepMat) o.material.dispose?.(); });
        this.items.splice(i, 1);
      } else it.tick(it, 1 - it.life / it.max);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].life -= dt; if (this.bolts[i].life <= 0) this.bolts.splice(i, 1); }
    this._drawBolts();
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.4 * (0.4 + this.shakeAmt));
  }
}
