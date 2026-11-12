// The six woven jutsu, played out in the 3D village. Everything is drawn by code, like the rest of the game.
import * as THREE from 'three';
import { TAU, lerp, damp, angDiff, toon } from './util.js';
import { JUTSU, costFor } from './jutsu-list.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const C = new THREE.Color();
const FIRE = [0xffb030, 0xff7a1a, 0xff4a10];

function makePanda() {
  const g = new THREE.Group();
  const white = toon(0xf4f1ea), black = toon(0x1c1a20);
  const ball = (mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
  ball(white, 0, 0.95, 0, 1.0, 0.95, 0.9); // body
  ball(white, 0, 1.95, 0.2, 0.66, 0.62, 0.62); // head
  for (const s of [-1, 1]) {
    ball(black, s * 0.46, 2.48, 0.12, 0.2, 0.2, 0.14); // ear
    ball(black, s * 0.25, 2.02, 0.74, 0.15, 0.19, 0.08).rotation.z = s * 0.5; // eye patch
    ball(white, s * 0.24, 2.05, 0.81, 0.045, 0.045, 0.03); // eye glint
    ball(black, s * 0.92, 1.15, 0.2, 0.3, 0.52, 0.32).rotation.z = s * 0.45; // arm
    ball(black, s * 0.52, 0.3, 0.42, 0.38, 0.32, 0.5); // leg
  }
  ball(black, 0, 1.84, 0.8, 0.09, 0.06, 0.06); // nose
  return g;
}

export class Jutsu {
  constructor(G) {
    this.G = G;
    this.live = []; // things that are still playing: { t, tick(dt, it) -> false when finished }
    this.eyeT = 0; this.wardT = 0; this.spin = 0;
    this.flash = new THREE.PointLight(0xffffff, 0, 18, 1.8);
    G.scene.add(this.flash);
  }

  after(delay, fn) { this.live.push({ t: 0, tick: (dt, it) => { if (it.t < delay) return true; fn(); return false; } }); }
  glow(pos, color, power) { this.flash.position.copy(pos); this.flash.color.set(color); this.flash.intensity = Math.max(this.flash.intensity, power); }

  // Damage everything inside a circle. Returns how many targets were hit.
  blast(p, radius, dmg, o = {}) {
    const G = this.G;
    let n = 0;
    for (const t of [...G.targets()]) {
      const dx = t.pos.x - p.x, dz = t.pos.z - p.z, d = Math.hypot(dx, dz);
      if (d > radius + t.radius || Math.abs(t.pos.y - p.y) > 4.5) continue;
      const dir = d > 0.05 ? v3(dx / d, 0, dz / d) : G.player.forward();
      if (t.takeHit(dmg, dir, o)) {
        n++;
        const hp = v3(t.pos.x, t.pos.y + (t.height || 1.7) * 0.6, t.pos.z);
        G.fx.sparks(hp, o.color ?? 0xffe9a8, o.heavy ? 26 : 12);
        G.ui.damage(hp, dmg, !!o.heavy);
      }
    }
    if (n) { G.hitstop(o.heavy ? 0.09 : 0.04); G.audio.play('hit'); }
    return n;
  }

  // Called when a sign sequence completes. Returns false when the player cannot pay for it.
  cast(id) {
    const G = this.G, P = G.player, j = JUTSU.find((x) => x.id === id);
    if (!j || !P) return false;
    const cost = costFor(j, P.hero); // cheaper when the jutsu is one of the hero's born elements
    if (P.ki < cost) { G.ui.toast(`Not enough ki for ${j.name}`); return false; }
    P.ki -= cost;
    const target = P.nearestTarget(26, 3.3);
    P.faceTarget(target);
    P.setState('cast', { breath: 1.65, melt: 0.9, unmake: 1.35 }[id] || 0.55);
    P.invuln = Math.max(P.invuln, 0.5);
    G.ui.callout(j.name, false, j.color);
    G.audio.play('cast'); G.audio.play('j_' + id);
    this[id](P, target, j);
    G.story.onCast?.(id);
    return true;
  }

  // ---- Ember Comet: a coal gathers at the palm, flies at the nearest foe and bursts
  comet(P, target, j) {
    const G = this.G, fx = G.fx;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(j.color).multiplyScalar(2.6) }));
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), new THREE.MeshBasicMaterial({ color: j.color, wireframe: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.add(shell); G.scene.add(core);
    const vel = v3(0, 0, 0), want = v3(0, 0, 0), col = new THREE.Color(j.color);
    const alive = (t) => t && t.alive !== false;
    this.live.push({ t: 0, tick: (dt, it) => {
      const p = core.position, f = P.forward();
      shell.rotation.x += dt * 14; shell.rotation.y += dt * 19;
      this.glow(p, j.color, 45);
      if (it.t < 0.3) { // gather at the hand
        p.set(P.pos.x + f.x * 0.8, P.pos.y + 1.25, P.pos.z + f.z * 0.8);
        core.scale.setScalar(0.2 + it.t * 2.7);
        vel.copy(f).multiplyScalar(24); vel.y = 1.5;
        return true;
      }
      if (alive(target)) {
        want.set(target.pos.x - p.x, target.pos.y + 1.0 - p.y, target.pos.z - p.z).normalize().multiplyScalar(26);
        vel.lerp(want, 1 - Math.exp(-7 * dt));
      }
      p.addScaledVector(vel, dt);
      for (let i = 0; i < 3; i++) fx.add.emit({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, life: 0.35, size: 0.6, size1: 0, color: col, boost: 2.2 });
      let hit = it.t > 2.3 || p.y < 0.15 || G.world.solidAt(p.x, p.y, p.z);
      for (const t of G.targets()) if (Math.hypot(t.pos.x - p.x, t.pos.z - p.z) < t.radius + 0.9 && p.y > t.pos.y - 0.4 && p.y < t.pos.y + (t.height || 1.8) + 0.6) hit = true;
      if (!hit) return true;
      G.scene.remove(core); core.material.dispose(); shell.material.dispose();
      fx.orb(p, { color: j.color, r0: 0.6, r1: 5, life: 0.45, boost: 1.8 });
      fx.ring(v3(p.x, Math.max(0.15, p.y - 1), p.z), { r0: 0.6, r1: 7.5, life: 0.55, color: j.color, boost: 1.5 });
      fx.burst(p, 70, { color: j.color, speed: 16, life: 0.6, size: 0.4, boost: 2.4, drag: 2.5 });
      fx.dust(p, 16); fx.shake(0.8);
      if (this.blast(p, 4.6, 38, { heavy: true, knock: 14, lift: 6, color: j.color })) G.slowmo(0.3, 0.22);
      return false;
    } });
  }

  // ---- Storm Thread: bolts drop on up to three foes, jumping from one to the next
  storm(P, target, j) {
    const G = this.G, fx = G.fx, f = P.forward();
    const hand = v3(P.pos.x + f.x * 0.6, P.pos.y + 1.4, P.pos.z + f.z * 0.6);
    const near = [...G.targets()].map((t) => ({ t, d: Math.hypot(t.pos.x - P.pos.x, t.pos.z - P.pos.z) })).filter((x) => x.d < 26).sort((a, b) => a.d - b.d).slice(0, 3);
    const strike = (to, from, tg) => {
      fx.bolt(v3(to.x + (Math.random() - 0.5) * 4, to.y + 17, to.z + (Math.random() - 0.5) * 4), to, { color: j.color, life: 0.3, width: 0.15, jag: 1.7, segs: 9 });
      fx.bolt(from, to, { color: j.color, life: 0.22, width: 0.06, jag: 0.8 });
      fx.ring(v3(to.x, Math.max(0.15, to.y - 1), to.z), { r0: 0.4, r1: 4.5, life: 0.4, color: j.color, boost: 1.6 });
      fx.sparks(to, j.color, 26); fx.shake(0.55); this.glow(v3(to.x, to.y + 1.5, to.z), j.color, 60);
      if (tg && tg.takeHit(26, v3(to.x - P.pos.x, 0, to.z - P.pos.z).normalize(), { heavy: true, knock: 6, lift: 4 })) { G.ui.damage(to, 26, true); G.audio.play('hit'); G.hitstop(0.07); }
    };
    this.glow(hand, j.color, 22);
    if (!near.length) { this.after(0.2, () => strike(v3(P.pos.x + f.x * 8, P.pos.y + 0.2, P.pos.z + f.z * 8), hand, null)); return; }
    let from = hand;
    near.forEach(({ t }, i) => {
      const prev = from, to = v3(t.pos.x, t.pos.y + 1.1, t.pos.z);
      from = to;
      this.after(0.2 + i * 0.15, () => strike(to.set(t.pos.x, t.pos.y + 1.1, t.pos.z), prev, t));
    });
  }

  // ---- Lantern Eye: the hero's eyes burn and every foe moves in slow motion
  eye(P, target, j) {
    const G = this.G;
    this.eyeT = 9; G.foeSlow = 0.6; // foes move at 60% speed
    P.char.eyes(true);
    G.cutIn(1.9); G.audio.play('eye_cut'); // the world stops for a close-up of the eyes, then the fight carries on
    this.after(0.02, () => { // game time is frozen during the close-up, so this runs the moment it ends
      G.ui.app.classList.add('eye');
      G.fx.ring(v3(P.pos.x, P.pos.y + 0.15, P.pos.z), { r0: 0.4, r1: 14, life: 0.8, color: j.color, boost: 1.4 });
      G.fx.burst(v3(P.pos.x, P.pos.y + 1.6, P.pos.z), 30, { color: j.color, speed: 6, life: 0.5, size: 0.3, boost: 2.4 });
      G.ui.toast('Lantern Eye: foes are slowed', 2.5);
    });
  }

  // ---- Dune Ward: sand circles the hero and eats the next three hits
  ward(P, target, j) {
    const G = this.G, p = v3(P.pos.x, P.pos.y + 0.15, P.pos.z);
    P.ward = 3; this.wardT = 14;
    G.fx.ring(p, { r0: 0.5, r1: 6, life: 0.5, color: j.color, additive: false, opacity: 0.8 });
    G.fx.burst(v3(p.x, p.y + 0.8, p.z), 50, { normal: true, color: j.color, speed: 9, flat: true, life: 0.6, size: 0.45, shape: 2, drag: 3, up: 2 });
    this.blast(P.pos, 4.2, 10, { heavy: true, knock: 13, color: j.color });
    G.ui.toast('Dune Ward: 3 hits blocked', 2.5);
  }

  // ---- Bamboo Guardian: a grove springs up and a giant panda drops on the target
  panda(P, target, j) {
    const G = this.G, fx = G.fx, f = P.forward();
    const at = target ? target.pos.clone() : v3(P.pos.x + f.x * 7, P.pos.y, P.pos.z + f.z * 7);
    fx.telegraph(at, 6.2, 0.62, j.color);
    const grove = new THREE.Group(), stalk = toon(0x5c9a4a), leaf = toon(0x86c060);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + Math.random() * 0.3, h = 5 + Math.random() * 3.5, r = 6.8 + Math.random() * 1.2;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, h, 7), stalk);
      s.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); s.rotation.z = (Math.random() - 0.5) * 0.12; s.castShadow = true;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.5, 6), leaf); tuft.position.y = h / 2 + 0.3; s.add(tuft);
      grove.add(s);
    }
    grove.position.set(at.x, at.y - 9, at.z); G.scene.add(grove);
    const bear = makePanda(); bear.scale.setScalar(2.5);
    bear.rotation.y = Math.atan2(P.pos.x - at.x, P.pos.z - at.z);
    bear.position.set(at.x, at.y + 36, at.z); G.scene.add(bear);
    let landed = false;
    this.live.push({ t: 0, tick: (dt, it) => {
      const t = it.t;
      grove.position.y = at.y - 9 * (t < 3.2 ? Math.max(0, 1 - t / 0.4) : Math.min(1, (t - 3.2) / 0.5));
      if (t < 0.62) { const k = t / 0.62; bear.position.y = at.y + 36 * (1 - k * k); return true; }
      if (!landed) {
        landed = true; bear.position.y = at.y;
        fx.dust(at, 34); fx.shake(1.3); this.glow(v3(at.x, at.y + 2, at.z), j.color, 60);
        fx.ring(v3(at.x, at.y + 0.15, at.z), { r0: 1, r1: 11, life: 0.6, color: 0xffffff });
        fx.burst(v3(at.x, at.y + 1, at.z), 40, { normal: true, color: 0x86c060, speed: 10, life: 1.1, size: 0.3, shape: 1, spin: 8, drag: 1.5, up: 3, grav: 6 });
        if (this.blast(at, 6.5, 45, { heavy: true, knock: 12, lift: 8, color: j.color })) G.slowmo(0.3, 0.35);
      }
      const sq = Math.max(0, 1 - (t - 0.62) / 0.35); // squash on landing, then settle
      bear.scale.set(2.5 * (1 + sq * 0.3), 2.5 * (1 - sq * 0.35), 2.5 * (1 + sq * 0.3));
      bear.rotation.x = t > 1.4 && t < 2.6 ? Math.sin((t - 1.4) / 1.2 * Math.PI) * 0.5 : 0; // one polite bow
      if (t < 3.0) return true;
      if (bear.parent) { fx.moths(v3(at.x, at.y + 2.4, at.z), 60); G.scene.remove(bear); }
      if (t < 3.7) return true;
      G.scene.remove(grove);
      return false;
    } });
  }

  // ---- Hearth Breath: a stream of fire in front of the hero
  breath(P, target, j) {
    const G = this.G, fx = G.fx;
    let tickT = 0.15;
    this.live.push({ t: 0, tick: (dt, it) => {
      if (it.t > 1.5 || P.state !== 'cast') return false;
      const aim = P.nearestTarget(13, 1.3);
      if (aim) P.yaw += angDiff(P.yaw, Math.atan2(aim.pos.x - P.pos.x, aim.pos.z - P.pos.z)) * Math.min(1, dt * 6);
      const f = P.forward(), mx = P.pos.x + f.x * 0.9, my = P.pos.y + 1.45, mz = P.pos.z + f.z * 0.9;
      const n = Math.max(1, Math.round(dt * 200));
      for (let i = 0; i < n; i++) {
        const a = P.yaw + (Math.random() - 0.5) * 0.44, sp = 14 + Math.random() * 5;
        C.set(FIRE[Math.floor(Math.random() * 3)]);
        fx.add.emit({ x: mx, y: my, z: mz, vx: Math.sin(a) * sp, vy: (Math.random() - 0.4) * 2.4, vz: Math.cos(a) * sp, life: 0.45 + Math.random() * 0.15, size: 0.22, size1: 1.15, color: C, boost: 0.8, drag: 1.1, alpha: 0.24 });
      }
      this.glow(v3(mx + f.x * 5, my + 0.6, mz + f.z * 5), 0xff7a2a, 8);
      tickT -= dt;
      if (tickT <= 0) {
        tickT = 0.21;
        let n2 = 0;
        for (const t of [...G.targets()]) {
          const dx = t.pos.x - P.pos.x, dz = t.pos.z - P.pos.z, d = Math.hypot(dx, dz);
          if (d > 10 + t.radius || Math.abs(t.pos.y - P.pos.y) > 3) continue;
          if (d > 1 && Math.abs(angDiff(P.yaw, Math.atan2(dx, dz))) > 0.42) continue;
          if (t.takeHit(7, f, { knock: 2 })) { n2++; const hp = v3(t.pos.x, t.pos.y + 1.1, t.pos.z); fx.sparks(hp, 0xff8a2a, 8); G.ui.damage(hp, 7); }
        }
        if (n2) G.audio.play('hit');
      }
      return true;
    } });
  }

  // ---- Tide Mend (Water): a cold wave heals the hero and shoves everything back
  tide(P, target, j) {
    const G = this.G, fx = G.fx, p = v3(P.pos.x, P.pos.y + 0.15, P.pos.z);
    const heal = Math.min(35, P.maxHp - P.hp);
    P.hp += heal;
    fx.ring(p, { r0: 0.5, r1: 7.5, life: 0.7, color: j.color, boost: 1.4 });
    fx.ring(p, { r0: 0.3, r1: 5, life: 0.9, color: 0xffffff, opacity: 0.6, additive: false });
    for (let i = 0; i < 46; i++) { const a = Math.random() * TAU, r = 0.5 + Math.random() * 1.4; C.set(Math.random() < 0.5 ? 0x4fb6e8 : 0xbfe6ff); fx.add.emit({ x: p.x + Math.cos(a) * r, y: p.y + Math.random() * 0.4, z: p.z + Math.sin(a) * r, vx: Math.cos(a) * 2, vy: 3 + Math.random() * 4, vz: Math.sin(a) * 2, life: 0.8, size: 0.3, size1: 0, color: C, boost: 1.6, grav: 5 }); }
    this.glow(v3(p.x, p.y + 1.2, p.z), j.color, 30);
    this.blast(P.pos, 6.5, 12, { heavy: true, knock: 15, lift: 3, color: j.color });
    G.ui.toast(heal > 0 ? `Tide Mend: +${Math.round(heal)} health` : 'Tide Mend: foes pushed back', 2.5);
  }

  // ---- Mirror Melt (Ether): the world in a wide circle turns to liquid, then remembers itself
  melt(P, target, j) {
    const G = this.G, c = P.pos.clone();
    G.ether.melt(c, 13);
    this.glow(v3(c.x, c.y + 2, c.z), j.color, 50);
    G.fx.shake(0.5);
    this.after(0.7, () => { if (this.blast(c, 13, 30, { heavy: true, knock: 4, lift: 10, color: j.color })) G.slowmo(0.35, 0.5); });
    this.after(2.2, () => this.blast(c, 13, 14, { knock: 3, lift: 6, color: j.color }));
  }

  // ---- Dust Verdict (Ether): the ground beside the hero is unmade and thrown. The crater stays
  unmake(P, target, j) {
    const G = this.G, f = P.forward(), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    let src = v3(P.pos.x + rx * 4.6 + f.x * 1.5, 0, P.pos.z + rz * 4.6 + f.z * 1.5);
    if (G.world.solidAt(src.x, 0.5, src.z)) src = v3(P.pos.x - rx * 4.6 + f.x * 1.5, 0, P.pos.z - rz * 4.6 + f.z * 1.5);
    const to = target ? v3(target.pos.x, target.pos.y + 1, target.pos.z) : v3(P.pos.x + f.x * 11, P.pos.y + 1, P.pos.z + f.z * 11);
    G.ether.unmake(P.pos, src, to, () => {
      this.glow(to, j.color, 60);
      if (this.blast(v3(to.x, to.y - 1, to.z), 5.5, 55, { heavy: true, knock: 16, lift: 7, color: j.color })) G.slowmo(0.3, 0.3);
    });
  }

  update(dt) {
    const G = this.G, P = G.player, fx = G.fx;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const it = this.live[i];
      it.t += dt;
      if (it.tick(dt, it) === false) this.live.splice(i, 1);
    }
    this.flash.intensity = damp(this.flash.intensity, 0, 9, dt);
    if (!P) return;
    if (this.eyeT > 0 && dt > 0) {
      this.eyeT -= dt;
      const f = P.forward(), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
      C.set(0xff3030);
      if (P.visible) for (const s of [-1, 1]) fx.add.emit({ x: P.pos.x + f.x * 0.2 + rx * s * 0.075, y: P.pos.y + 1.58, z: P.pos.z + f.z * 0.2 + rz * s * 0.075, life: 0.16, size: 0.17, size1: 0, color: C, boost: 2.6 });
      if (this.eyeT <= 0) { G.foeSlow = 1; P.char.eyes(false); G.ui.app.classList.remove('eye'); G.ui.toast('Lantern Eye fades'); }
    }
    if (P.ward > 0) {
      this.wardT -= dt; this.spin += dt * 5;
      C.set(0xe0b56a);
      for (let k = 0; k < P.ward; k++) {
        const a = this.spin + k * TAU / 3;
        fx.norm.emit({ x: P.pos.x + Math.cos(a) * 1.15, y: P.pos.y + lerp(0.5, 1.5, (Math.sin(this.spin * 0.7 + k) + 1) / 2), z: P.pos.z + Math.sin(a) * 1.15, vy: 0.4, life: 0.4, size: 0.34, size1: 0.05, color: C, shape: 2, alpha: 0.9 });
      }
      if (this.wardT <= 0) { P.ward = 0; G.ui.toast('Dune Ward blows away'); }
    }
  }
}
