// ETHER, the sixth element. Two effects, both drawn by code:
//   melt   - everything inside a circle turns to liquid for a few seconds, then goes back exactly as it was
//   unmake - the ground is pulled apart into dust, thrown as a spear, and a crater stays where it was taken
// The world's own materials are patched (etherPatch) so real geometry bends and real ground gets a hole.
import * as THREE from 'three';
import { TAU, lerp, smooth, toon } from './util.js';

const MAX_CRATERS = 6;
const UNI = {
  uEthC: { value: new THREE.Vector3() }, uEthR: { value: 1 }, uEthK: { value: 0 }, uEthT: { value: 0 },
  uCr: { value: Array.from({ length: MAX_CRATERS }, () => new THREE.Vector3(0, 0, 0)) }, // x, z, radius
};
const HEAD = 'uniform vec3 uEthC; uniform float uEthR; uniform float uEthK; uniform float uEthT; varying vec3 vEthW;';

// Call on any material that should melt. `ground: true` also lets craters cut holes in it.
export function etherPatch(mat, { ground = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, UNI);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${HEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ethW = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vEthW = ethW;
      float ethK = uEthK * (1.0 - smoothstep(uEthR * 0.7, uEthR, distance(ethW.xz, uEthC.xz)));
      if (ethK > 0.001) {
        float up = clamp(ethW.y * 0.6, 0.0, 1.0); // the ground itself stays put, tall things slump most
        float w = sin(ethW.x * 0.8 + uEthT * 2.6) * cos(ethW.z * 0.7 - uEthT * 2.1);
        transformed.y = mix(transformed.y, transformed.y * 0.5 + w * 0.7 * up, ethK);
        transformed.x += sin(ethW.y * 1.1 + uEthT * 3.0 + ethW.z * 0.6) * 0.6 * ethK * up;
        transformed.z += cos(ethW.y * 1.3 - uEthT * 2.4 + ethW.x * 0.6) * 0.6 * ethK * up;
      }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${HEAD}\nuniform vec3 uCr[${MAX_CRATERS}];`).replace('#include <color_fragment>', `#include <color_fragment>
      ${ground ? `for (int i = 0; i < ${MAX_CRATERS}; i++) { if (uCr[i].z > 0.0 && distance(vEthW.xz, uCr[i].xy) < uCr[i].z) discard; }` : ''}
      float ethD = distance(vEthW.xz, uEthC.xz);
      float ethF = uEthK * (1.0 - smoothstep(uEthR * 0.7, uEthR, ethD));
      if (ethF > 0.001) {
        float rip = sin(ethD * 2.4 - uEthT * 5.0) * 0.5 + 0.5;
        float sw = sin(vEthW.x * 1.7 + uEthT * 1.9 + vEthW.y) * sin(vEthW.z * 1.5 - uEthT * 1.4);
        vec3 liq = mix(vec3(0.24, 0.55, 0.94), vec3(0.86, 0.97, 1.0), smoothstep(0.25, 0.95, rip * 0.6 + sw * 0.45 + 0.2));
        diffuseColor.rgb = mix(diffuseColor.rgb, liq, ethF * 0.92);
      }`);
  };
  mat.customProgramCacheKey = () => 'ether' + (ground ? 'G' : '');
  return mat;
}

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const C = new THREE.Color();
const bowlGeo = new THREE.SphereGeometry(1, 22, 8, 0, TAU, Math.PI / 2, Math.PI / 2);
const rockGeo = new THREE.IcosahedronGeometry(0.5, 0);

export class Ether {
  constructor(G) {
    this.G = G; this.live = []; this.craters = []; this.slot = 0; this.t = 0;
    this.bowlMat = new THREE.MeshToonMaterial({ color: 0x6a5238, side: THREE.BackSide });
    this.rockMat = toon(0x8a7a66);
    this.spearMat = new THREE.MeshBasicMaterial({ color: 0xe8d6b0 });
  }

  // Liquid: grows to `radius` around `c`, holds, then drains away. Nothing is changed for good.
  melt(c, radius = 13, hold = 2.2) {
    const G = this.G, fx = G.fx;
    UNI.uEthC.value.copy(c); UNI.uEthR.value = radius;
    fx.orb(v3(c.x, c.y + 1.2, c.z), { color: 0xbfe6ff, r0: 0.3, r1: 3.2, life: 0.5, boost: 0.8 });
    fx.ring(v3(c.x, c.y + 0.2, c.z), { r0: 0.5, r1: radius, life: 0.8, color: 0xdff4ff, boost: 1.5 });
    const total = 0.8 + hold + 1.4;
    this.live = this.live.filter((it) => !it.melt);
    this.live.push({ t: 0, melt: true, tick: (dt, it) => {
      const t = it.t;
      UNI.uEthK.value = t < 0.8 ? smooth(t / 0.8) : t < 0.8 + hold ? 1 : 1 - smooth((t - 0.8 - hold) / 1.4);
      const n = Math.round(dt * 90 * UNI.uEthK.value);
      for (let i = 0; i < n; i++) { // droplets lifting off the liquid
        const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * radius * 0.85;
        C.set(Math.random() < 0.5 ? 0xbfe6ff : 0x6fb8ff);
        fx.add.emit({ x: c.x + Math.cos(a) * r, y: c.y + 0.2 + Math.random() * 2, z: c.z + Math.sin(a) * r, vy: 1.5 + Math.random() * 3, life: 0.9, size: 0.22, size1: 0, color: C, boost: 1.6, sway: 0.6 });
      }
      if (t < total) return true;
      UNI.uEthK.value = 0;
      return false;
    } });
    return total;
  }

  // A real hole: the ground materials stop drawing inside it and a bowl sits underneath.
  crater(x, z, r) {
    const G = this.G, i = this.slot;
    this.slot = (i + 1) % MAX_CRATERS;
    const old = this.craters[i];
    if (old) { G.scene.remove(old.group); G.world.craters.splice(G.world.craters.indexOf(old.hole), 1); }
    const group = new THREE.Group(), bowl = new THREE.Mesh(bowlGeo, this.bowlMat);
    bowl.position.set(x, 0.02, z); group.add(bowl);
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * TAU + Math.random() * 0.5, s = 0.35 + Math.random() * 0.55, m = new THREE.Mesh(rockGeo, this.rockMat);
      m.position.set(x + Math.cos(a) * (r + 0.25), 0.1, z + Math.sin(a) * (r + 0.25)); m.scale.set(s * 1.4, s * 0.8, s); m.rotation.set(Math.random(), Math.random() * 3, 0); m.castShadow = true;
      group.add(m);
    }
    G.scene.add(group);
    const hole = { x, z, r: 0.01, d: r * 0.36 };
    G.world.craters.push(hole);
    const c = { group, bowl, hole, uni: UNI.uCr.value[i], full: r };
    c.uni.set(x, z, 0.01);
    this.craters[i] = c;
    return c;
  }

  // Dust: dig at `src` (on the ground), gather above `from`, throw at `to`. onHit runs when the spear lands.
  unmake(from, src, to, onHit, r = 3.2) {
    const G = this.G, fx = G.fx, c = this.crater(src.x, src.z, r);
    const cloud = v3(from.x, from.y + 3.4, from.z);
    const spear = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.6, 7).rotateX(Math.PI / 2), this.spearMat);
    spear.visible = false; G.scene.add(spear);
    const dir = v3(0, 0, 0), start = v3(0, 0, 0);
    let done = false;
    fx.telegraph(v3(src.x, 0, src.z), r, 0.9, 0xe8d6b0);
    this.live.push({ t: 0, tick: (dt, it) => {
      const t = it.t;
      if (t < 0.95) { // the ground comes apart and streams up into a cloud
        const k = smooth(t / 0.95), rr = c.full * k;
        c.hole.r = rr; c.uni.z = rr; c.bowl.scale.set(rr, c.hole.d * k, rr);
        const n = Math.round(dt * 420);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * rr, x = src.x + Math.cos(a) * d, z = src.z + Math.sin(a) * d, life = 0.35 + Math.random() * 0.3;
          C.set(Math.random() < 0.5 ? 0xd8c49c : 0x9a8468);
          fx.norm.emit({ x, y: 0.1, z, vx: (cloud.x - x) / life, vy: (cloud.y - 0.1) / life + 3, vz: (cloud.z - z) / life, grav: 9, life, size: 0.34, size1: 0.12, color: C, shape: 2, alpha: 0.95 });
        }
        for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; C.set(0xe8d6b0); fx.norm.emit({ x: cloud.x + Math.cos(a) * 0.9, y: cloud.y + (Math.random() - 0.5) * 1.2, z: cloud.z + Math.sin(a) * 0.9, vx: -Math.sin(a) * 5, vz: Math.cos(a) * 5, life: 0.35, size: 0.7, size1: 0.3, color: C, shape: 2, alpha: 0.8 }); }
        if (Math.random() < dt * 14) fx.shake(0.18);
        return true;
      }
      if (!spear.visible) { spear.visible = true; start.copy(cloud); dir.copy(to).sub(cloud); c.hole.r = c.full; c.uni.z = c.full; c.bowl.scale.set(c.full, c.hole.d, c.full); fx.ring(cloud, { r0: 0.4, r1: 3.5, life: 0.3, color: 0xfff2d0 }); }
      const k = Math.min(1, (t - 0.95) / 0.32);
      spear.position.copy(start).addScaledVector(dir, k * k);
      spear.lookAt(to);
      for (let i = 0; i < 5; i++) { C.set(0xd8c49c); fx.norm.emit({ x: spear.position.x + (Math.random() - 0.5), y: spear.position.y + (Math.random() - 0.5), z: spear.position.z + (Math.random() - 0.5), life: 0.5, size: 0.6, size1: 1.4, color: C, shape: 2, alpha: 0.5 }); }
      if (k < 1) return true;
      if (!done) {
        done = true; G.scene.remove(spear);
        fx.burst(to, 90, { normal: true, color: 0xd8c49c, speed: 14, life: 0.9, size: 0.5, size1: 1.3, alpha: 0.7, shape: 2, drag: 2.2, up: 3 });
        fx.ring(v3(to.x, Math.max(0.15, to.y - 1), to.z), { r0: 0.6, r1: 9, life: 0.6, color: 0xfff2d0, boost: 1.4 });
        fx.dust(to, 30); fx.shake(1.1);
        onHit?.();
      }
      return false;
    } });
    return 1.3;
  }

  update(dt) {
    this.t += dt; UNI.uEthT.value = this.t;
    for (let i = this.live.length - 1; i >= 0; i--) { const it = this.live[i]; it.t += dt; if (it.tick(dt, it) === false) this.live.splice(i, 1); }
  }
}
