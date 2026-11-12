import * as THREE from 'three';
import { clamp, lerp, damp, makeRng } from './util.js';

// Time-of-day looks. Each one is a full lighting grade.
const C = (h) => new THREE.Color(h);
export const LOOKS = {
  golden: { top: C(0x3f63c4), horizon: C(0xffb880), fog: C(0xf3b892), sun: C(0xffb36e), sunI: 2.7, hemiSky: C(0xbcd0ff), hemiGround: C(0x8a6a4a), hemiI: 1.15, elev: 0.30, azim: -2.2, glow: 1.35, stars: 0.0, fogNear: 90, fogFar: 460, water: C(0x4fa7c9) },
  day:    { top: C(0x2f86e6), horizon: C(0xbfe6ff), fog: C(0xc9e6fb), sun: C(0xfff3dc), sunI: 2.9, hemiSky: C(0xd4e9ff), hemiGround: C(0x6f8f5a), hemiI: 1.25, elev: 0.95, azim: -2.4, glow: 0.9, stars: 0.0, fogNear: 80, fogFar: 380, water: C(0x3fa2d8) },
  dusk:   { top: C(0x1d2459), horizon: C(0xd4667c), fog: C(0x7a5078), sun: C(0xff7a66), sunI: 1.5, hemiSky: C(0x8f88d8), hemiGround: C(0x5a3c50), hemiI: 1.0, elev: 0.10, azim: -1.9, glow: 2.2, stars: 0.45, fogNear: 50, fogFar: 300, water: C(0x5b5fa8) },
  night:  { top: C(0x050a20), horizon: C(0x1c2f66), fog: C(0x111b3c), sun: C(0x9db8ff), sunI: 1.15, hemiSky: C(0x5a74c8), hemiGround: C(0x1c2238), hemiI: 0.85, elev: 0.75, azim: 0.9, glow: 3.0, stars: 1.0, fogNear: 40, fogFar: 280, water: C(0x1d3a78) },
  omen:   { top: C(0x16071f), horizon: C(0x8a1f3c), fog: C(0x3d1430), sun: C(0xff8f9c), sunI: 1.7, hemiSky: C(0xa0508c), hemiGround: C(0x2a1024), hemiI: 0.95, elev: 0.22, azim: -2.9, glow: 2.6, stars: 0.3, fogNear: 35, fogFar: 240, water: C(0x5a2a5c) },
  // the two dream sets
  dream:  { top: C(0x2a78e0), horizon: C(0xdcefff), fog: C(0xeaf5ff), sun: C(0xffffff), sunI: 2.5, hemiSky: C(0xe6f2ff), hemiGround: C(0xbcd8f4), hemiI: 1.55, elev: 1.05, azim: -2.0, glow: 0.8, stars: 0.0, fogNear: 200, fogFar: 1100, water: C(0x9fd4ff) },
  valley: { top: C(0x2f6fd8), horizon: C(0xffd9b0), fog: C(0xd6e8e2), sun: C(0xffe2b4), sunI: 2.9, hemiSky: C(0xcfe4ff), hemiGround: C(0x7fa868), hemiI: 1.3, elev: 0.55, azim: -2.5, glow: 1.2, stars: 0.0, fogNear: 140, fogFar: 760, water: C(0x4fc0d8) },
};
export const CYCLE = ['golden', 'day', 'dusk', 'night'];

export class Env {
  constructor(scene, renderer) {
    this.scene = scene;
    this.cur = this._clone(LOOKS.golden);
    this.target = LOOKS.golden;
    this.lookName = 'golden';
    this.glow = 1.35;

    scene.fog = new THREE.Fog(0xffffff, 60, 330);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 260;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    scene.add(this.sun, this.sun.target);

    // Sky dome with a painted gradient and a sun/moon disc.
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
        disc: { value: 1.0 },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
      fragmentShader: `
        varying vec3 vDir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float disc;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -0.2, 1.0);
          vec3 col = mix(horizon, top, pow(smoothstep(-0.05, 0.75, h), 0.7));
          col = mix(col, horizon * 0.85, (1.0 - smoothstep(-0.2, 0.0, d.y)));
          float s = clamp(dot(d, normalize(sunDir)), 0.0, 1.0);
          col += sunCol * (pow(s, 6.0) * 0.22 + pow(s, 48.0) * 0.35);
          col += sunCol * smoothstep(0.9990, 0.9994, s) * 3.0 * disc;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    scene.add(this.sky);

    // Stars.
    const r = makeRng(7), n = 900, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, k = Math.sqrt(1 - y * y);
      sp[i * 3] = Math.cos(a) * k * 800; sp[i * 3 + 1] = y * 800; sp[i * 3 + 2] = Math.sin(a) * k * 800;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // Soft toon clouds.
    this.cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false, depthWrite: false });
    this.clouds = new THREE.Group();
    const puff = new THREE.SphereGeometry(1, 10, 6);
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const m = 3 + Math.floor(r() * 4);
      for (let j = 0; j < m; j++) {
        const s = new THREE.Mesh(puff, this.cloudMat);
        s.position.set((j - m / 2) * 16 + r() * 6, r() * 4, r() * 10);
        s.scale.set(16 + r() * 14, 5 + r() * 4, 10 + r() * 8);
        g.add(s);
      }
      const a = r() * Math.PI * 2, d = 320 + r() * 280;
      g.position.set(Math.cos(a) * d, 120 + r() * 90, Math.sin(a) * d);
      g.userData.speed = 1.5 + r() * 2.5;
      this.clouds.add(g);
    }
    scene.add(this.clouds);

    this.sunDir = new THREE.Vector3();
    this.apply(1);
  }

  _clone(l) { const o = {}; for (const k in l) o[k] = l[k].isColor ? l[k].clone() : l[k]; return o; }

  setLook(name, instant = false) {
    this.lookName = name;
    this.target = LOOKS[name];
    if (instant) { this.cur = this._clone(this.target); }
  }

  apply(k) {
    const c = this.cur, t = this.target;
    for (const key in t) {
      if (t[key].isColor) c[key].lerp(t[key], k);
      else c[key] = lerp(c[key], t[key], k);
    }
    const ce = Math.cos(c.elev), se = Math.sin(c.elev);
    this.sunDir.set(Math.cos(c.azim) * ce, se, Math.sin(c.azim) * ce).normalize();
    this.skyMat.uniforms.top.value.copy(c.top);
    this.skyMat.uniforms.horizon.value.copy(c.horizon);
    this.skyMat.uniforms.sunDir.value.copy(this.sunDir);
    this.skyMat.uniforms.sunCol.value.copy(c.sun);
    this.scene.fog.color.copy(c.fog);
    this.scene.fog.near = c.fogNear; this.scene.fog.far = c.fogFar;
    this.hemi.color.copy(c.hemiSky); this.hemi.groundColor.copy(c.hemiGround); this.hemi.intensity = c.hemiI;
    this.sun.color.copy(c.sun); this.sun.intensity = c.sunI;
    this.starMat.opacity = clamp(c.stars, 0, 1);
    this.cloudMat.color.copy(c.horizon).lerp(new THREE.Color(0xffffff), 0.45);
    this.cloudMat.opacity = 0.55 + 0.4 * (1 - c.stars);
    this.glow = c.glow;
  }

  update(dt, focus) {
    this.apply(1 - Math.exp(-1.6 * dt));
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 120);
    this.sky.position.copy(focus);
    this.stars.position.copy(focus);
    for (const g of this.clouds.children) {
      g.position.x += g.userData.speed * dt;
      if (g.position.x > 640) g.position.x = -640;
    }
  }
}
