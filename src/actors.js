import * as THREE from 'three';
import { makeCharacter, makeGhost } from './character.js';
import { clamp, lerp, damp, dampAngle, angDiff, TAU, toon, makeRng } from './util.js';
import { POI } from './world.js';

export const HEROES = [
  {
    id: 'kaze', name: 'KAZE', title: 'The Gale', color: 0x2fd0b0, special: 'Gale Burst',
    blurb: 'Reckless, fast, loud. Hits first and thinks on the way down.',
    stats: { power: 3, speed: 5, reach: 2 },
    look: { hair: 0x6a2c22, hairStyle: 'spiky', top: 0xd9483a, pants: 0xe9dcc0, accent: 0x2fd0b0, scarf: 0x2fd0b0, eye: '#1f9fb8', grin: true, bracer: true, sleeve: false },
  },
  {
    id: 'rei', name: 'REI', title: 'The Bolt', color: 0xb48cff, special: 'Storm Lance',
    blurb: 'A blade that arrives before its own thunder.',
    stats: { power: 4, speed: 4, reach: 4 },
    look: { hair: 0x1c2140, hairStyle: 'tail', top: 0x5a3aa8, pants: 0x1e1e2c, accent: 0xe8d27a, eye: '#a070ff', weapon: 'katana', fierce: true, bracer: true },
  },
  {
    id: 'tsuki', name: 'TSUKI', title: 'The Quiet Moon', color: 0x9fc4ff, special: 'Moon Step',
    blurb: 'Thirty years on the night watch. Has never once been late.',
    stats: { power: 5, speed: 3, reach: 3 },
    look: { hair: 0x4a5462, hairStyle: 'bun', top: 0x26365c, pants: 0x20242e, accent: 0xcfd8e6, eye: '#8fb4d8', mask: '#2a3350', stern: true, weapon: 'katana', headband: true },
  },
];

const ROGUES = {
  gouma: { name: 'GOUMA', title: 'The Undertow', hp: 230, look: { scale: 1.36, skin: 0xc99a76, hair: 0xb8c0c8, hairStyle: 'wild', top: 0x1f1c2e, pants: 0x16141f, accent: 0x8a8fa0, cloak: 0x1f1c2e, emblem: 0xe8e2d0, eye: '#e8c95a', fierce: true, grin: true, weapon: 'cleaver', mark: '#7a3b34' } },
  yoru: { name: 'YORU', title: 'The Hush', hp: 170, look: { scale: 1.06, skin: 0xf0dccc, hair: 0xe4e4ee, hairStyle: 'long', top: 0x1f1c2e, pants: 0x16141f, accent: 0xe8e2d0, cloak: 0x1f1c2e, emblem: 0xe8e2d0, eye: '#d8a53a', stern: true } },
};

const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const hdist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// ===================================================================================== Player
export class Player {
  constructor(G, hero) {
    this.G = G; this.hero = hero;
    this.char = makeCharacter(hero.look);
    G.scene.add(this.char.root);
    this.pos = POI.spawn.clone(); this.vel = new THREE.Vector3();
    this.yaw = Math.PI; this.radius = 0.42; this.height = 1.7;
    this.hp = this.maxHp = 100; this.ki = this.maxKi = 100;
    this.state = 'free'; this.t = 0; this.dur = 0; this.combo = 0; this.queued = false; this.hitDone = false;
    this.grounded = true; this.jumps = 0; this.coyote = 0; this.flipT = 0; this.airDash = false;
    this.dashCd = 0; this.throwCd = 0; this.invuln = 0; this.flashT = 0; this.locked = false; this.anim = { name: 'idle' };
    this.fed = 0; this.rippleT = 0; this.ghostT = 0; this.visible = true; this.inCombat = false;
    this.color = new THREE.Color(hero.color);
    // glowing orb used by specials
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: this.color.clone().multiplyScalar(2.2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.orb.visible = false; G.scene.add(this.orb);
    this.light = new THREE.PointLight(hero.color, 0, 14, 1.8); G.scene.add(this.light);
  }

  get center() { return V.set(this.pos.x, this.pos.y + 1.0, this.pos.z).clone(); }
  forward(out = new THREE.Vector3()) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  nearestTarget(maxD = 9, arc = 2.0) {
    let best = null, bd = maxD;
    for (const t of this.G.targets()) {
      const d = hdist(t.pos, this.pos);
      if (d > bd) continue;
      const a = Math.abs(angDiff(this.yaw, Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z)));
      if (a > arc && d > 2.2) continue;
      bd = d; best = t;
    }
    return best;
  }
  faceTarget(t) { if (t) this.yaw = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); }

  strike(range, arc, dmg, o = {}) {
    const G = this.G, f = this.forward();
    let n = 0;
    for (const t of G.targets()) {
      const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > range + t.radius) continue;
      if (Math.abs(t.pos.y - this.pos.y) > 2.6) continue;
      if (d > 0.8 && Math.abs(angDiff(this.yaw, Math.atan2(dx, dz))) > arc) continue;
      const dir = o.radial ? V2.set(dx, 0, dz).normalize() : f;
      if (t.takeHit(dmg, dir, o)) {
        n++;
        const hp = V.set(t.pos.x - dir.x * 0.3, t.pos.y + (t.height || 1.7) * 0.6, t.pos.z - dir.z * 0.3);
        G.fx.sparks(hp, o.color ?? 0xffe9a8, o.heavy ? 26 : 14);
        G.ui.damage(hp, dmg, o.heavy);
      }
    }
    if (n) { G.hitstop(o.heavy ? 0.11 : 0.055); G.fx.shake(o.heavy ? 0.55 : 0.22); G.audio.play('hit'); this.ki = Math.min(this.maxKi, this.ki + 3 * n); }
    return n;
  }

  takeHit(dmg, dir, heavy) {
    if (this.invuln > 0 || this.state === 'dash' || this.state === 'down' || this.locked || !this.visible) return false;
    const G = this.G;
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.75; this.flashT = 0.18;
    this.vel.set(dir.x * (heavy ? 13 : 8), heavy ? 7 : 3.5, dir.z * (heavy ? 13 : 8));
    this.grounded = false; this.orb.visible = false; this.light.intensity = 0;
    G.fx.sparks(this.center, 0xff6a6a, 16); G.fx.shake(heavy ? 0.7 : 0.4); G.ui.hurt(); G.audio.play('hurt');
    G.ui.damage(this.center, dmg, false, true);
    if (this.hp <= 0) { this.setState('down', 1.9); G.slowmo(0.3, 0.9); }
    else this.setState('hit', heavy ? 0.5 : 0.32);
    return true;
  }

  setState(s, dur = 0) { this.state = s; this.t = 0; this.dur = dur; this.hitDone = false; }

  startAttack() {
    this.combo = this.state === 'attack' ? (this.combo % 3) + 1 : 1;
    this.setState('attack', [0, 0.3, 0.3, 0.5][this.combo]);
    this.queued = false;
    const t = this.nearestTarget(7, 1.9);
    if (t) this.faceTarget(t);
    const f = this.forward();
    const far = t ? clamp(hdist(t.pos, this.pos) - 1.5, 0, 4) : 1.2;
    this.vel.x = f.x * (4 + far * 5); this.vel.z = f.z * (4 + far * 5);
    this.G.audio.play('slash');
  }

  startSpecial() {
    if (this.ki < 40) { this.G.ui.toast('Not enough ki'); return; }
    this.ki -= 40;
    const id = this.hero.id;
    this.faceTarget(this.nearestTarget(16, 2.4));
    this.setState('special', id === 'kaze' ? 0.95 : id === 'rei' ? 0.62 : 0.7);
    this.invuln = Math.max(this.invuln, this.dur);
    this.spTarget = this.nearestTarget(16, 2.6);
    this.G.ui.callout(this.hero.special);
    this.G.audio.play('special');
  }

  update(dt) {
    const G = this.G, I = G.input, fx = G.fx, c = this.char;
    this.t += dt;
    this.dashCd -= dt; this.throwCd -= dt; this.invuln -= dt; this.flashT -= dt; this.flipT -= dt; this.coyote -= dt;
    this.ki = Math.min(this.maxKi, this.ki + (this.fed > 0 ? 11 : 6) * dt);
    this.fed -= dt;
    c.flash(this.flashT > 0 ? 0.9 : 0, 0xff5a5a);
    c.root.visible = this.visible && !(this.invuln > 0 && this.state !== 'special' && this.state !== 'dash' && Math.floor(this.invuln * 20) % 2 === 0);

    if (this.locked) { // cutscene / seated
      c.update(dt, this.anim);
      c.root.position.copy(this.pos); c.root.rotation.y = this.yaw;
      this.vel.set(0, 0, 0);
      return;
    }

    // --- intent, relative to the camera ---
    let mx = I.moveX, my = I.moveY;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    const cy = G.cam.yaw, dirX = Math.cos(cy) * mx - Math.sin(cy) * my, dirZ = -Math.sin(cy) * mx - Math.cos(cy) * my;
    const moving = ml > 0.12, sprint = moving && I.sprinting;
    let anim = { name: 'idle', guard: this.inCombat };
    let control = 0; // how much the stick steers this frame

    if (this.state === 'free') {
      control = 1;
      if (I.hit('attack')) this.startAttack();
      else if (I.hit('special')) this.startSpecial();
      else if (I.hit('dash') && this.dashCd <= 0 && (this.grounded || !this.airDash)) {
        this.setState('dash', 0.2); this.dashCd = 0.5; this.airDash = !this.grounded;
        if (moving) this.yaw = Math.atan2(dirX, dirZ);
        fx.dust(this.pos, 8); G.audio.play('dash');
      } else if (I.hit('throw') && this.throwCd <= 0) { this.setState('throw', 0.3); this.throwCd = 0.45; this.faceTarget(this.nearestTarget(26, 1.2)); }
    }

    if (this.state === 'attack') {
      const p = this.t / this.dur;
      anim = { name: 'attack' + this.combo, p };
      if (I.hit('attack')) this.queued = true;
      if (I.hit('special')) this.bufSpecial = true;
      if (I.hit('dash')) this.bufDash = true;
      if (!this.hitDone && p >= 0.36) {
        this.hitDone = true;
        const fin = this.combo === 3, sword = !!this.hero.look.weapon;
        const range = (sword ? 3.1 : 2.5) + (fin ? 0.5 : 0);
        this.strike(range, fin ? 2.6 : 1.5, fin ? 12 : 7, { heavy: fin, color: this.hero.color, knock: fin ? 9 : 3 });
        const f = this.forward();
        fx.slash(V.set(this.pos.x + f.x * 0.5, this.pos.y + (fin ? 0.9 : 1.2), this.pos.z + f.z * 0.5), this.yaw, { color: this.hero.color, size: range * 0.92, flip: this.combo === 2, roll: fin ? 0 : (this.combo === 1 ? 0.35 : -0.35), life: fin ? 0.3 : 0.2 });
      }
      this.vel.x = damp(this.vel.x, 0, 9, dt); this.vel.z = damp(this.vel.z, 0, 9, dt);
      if (p > 0.5 && this.bufDash && this.dashCd <= 0) { this.bufDash = false; this.setState('dash', 0.2); this.dashCd = 0.5; if (moving) this.yaw = Math.atan2(dirX, dirZ); }
      else if (p > 0.5 && this.bufSpecial) { this.bufSpecial = false; this.startSpecial(); }
      else if (this.t >= this.dur) { this.bufDash = this.bufSpecial = false; if (this.queued) this.startAttack(); else { this.setState('free'); } }
    } else if (this.state === 'dash') {
      anim = { name: 'dash' };
      const f = this.forward();
      this.vel.x = f.x * 27; this.vel.z = f.z * 27; if (this.vel.y < 0) this.vel.y = 0;
      this.ghostT -= dt;
      if (this.ghostT <= 0) { this.ghostT = 0.035; fx.ghost(makeGhost(c, this.hero.color, 0.5), 0.28); }
      if (this.t >= this.dur) { this.setState('free'); this.vel.x *= 0.4; this.vel.z *= 0.4; }
    } else if (this.state === 'throw') {
      anim = { name: 'throw', p: this.t / this.dur };
      if (!this.hitDone && this.t > 0.12) {
        this.hitDone = true;
        const f = this.forward(), t = this.nearestTarget(26, 1.2);
        V.set(this.pos.x + f.x * 0.6, this.pos.y + 1.25, this.pos.z + f.z * 0.6);
        const dir = t ? V2.set(t.pos.x - V.x, t.pos.y + 1.0 - V.y, t.pos.z - V.z).normalize() : V2.copy(f);
        G.shoot({ kind: 'star', from: 'player', pos: V, vel: dir.multiplyScalar(38), dmg: 4, color: this.hero.color, life: 1.2 });
        G.audio.play('slash');
      }
      control = 0.5;
      if (this.t >= this.dur) this.setState('free');
    } else if (this.state === 'special') {
      anim = this.special(dt);
    } else if (this.state === 'hit') {
      anim = { name: 'hit' };
      if (this.t >= this.dur) this.setState('free');
    } else if (this.state === 'down') {
      anim = { name: 'down' };
      this.vel.x = damp(this.vel.x, 0, 4, dt); this.vel.z = damp(this.vel.z, 0, 4, dt);
      if (this.t >= this.dur) { this.setState('free'); G.onPlayerDown(); }
    }

    // --- locomotion ---
    if (control > 0) {
      const top = (sprint ? 13.5 : 7.6) * control * (this.fed > 0 ? 1.06 : 1);
      const k = this.grounded ? 13 : 8;
      this.vel.x = damp(this.vel.x, moving ? dirX * top : 0, k, dt);
      this.vel.z = damp(this.vel.z, moving ? dirZ * top : 0, k, dt);
      if (moving && this.state === 'free') this.yaw = dampAngle(this.yaw, Math.atan2(dirX, dirZ), 16, dt);
      if (I.hit('jump') && this.state === 'free' && (this.grounded || this.coyote > 0 || this.jumps < 2)) {
        const first = this.grounded || this.coyote > 0;
        this.vel.y = first ? 14.2 : 12.8; this.jumps = first ? 1 : 2; this.grounded = false; this.coyote = 0;
        if (!first) { this.flipT = 0.42; fx.ring(V.set(this.pos.x, this.pos.y + 0.1, this.pos.z), { r0: 0.3, r1: 2.2, life: 0.35, color: this.hero.color, opacity: 0.8 }); }
        else fx.dust(this.pos, 5);
        G.audio.play('jump');
      }
      if (this.state === 'free') {
        const sp = Math.hypot(this.vel.x, this.vel.z);
        if (!this.grounded) anim = { name: this.flipT > 0 ? 'flip' : 'air', vy: this.vel.y };
        else if (sp > 0.8) anim = { name: 'move', run: clamp((sp - 7.6) / 4, 0, 1) };
      }
    }

    this.physics(dt);
    anim.speed = Math.hypot(this.vel.x, this.vel.z);
    this.anim = anim;
    c.update(dt, anim);
    c.root.position.copy(this.pos);
    c.root.rotation.y = this.yaw;
    if (anim.name === 'flip') c.J.body.rotation.x = (1 - this.flipT / 0.42) * TAU;
  }

  physics(dt) {
    const G = this.G, was = this.grounded;
    this.vel.y -= 36 * dt;
    if (this.vel.y < -40) this.vel.y = -40;
    const vy = this.vel.y;
    this.pos.addScaledVector(this.vel, dt);
    if (G.arena.active) { // stay in the ring during the duel
      const dx = this.pos.x - POI.arena.x, dz = this.pos.z - POI.arena.z, d = Math.hypot(dx, dz);
      if (d > POI.arenaR) { this.pos.x = POI.arena.x + dx / d * POI.arenaR; this.pos.z = POI.arena.z + dz / d * POI.arenaR; }
    }
    const support = G.world.resolve(this.pos, this.radius, this.height);
    if (this.pos.y <= support) {
      this.pos.y = support; this.vel.y = 0;
      if (!was) { if (vy < -12) { G.fx.dust(this.pos, 10); if (vy < -22) G.fx.shake(0.2); } this.airDash = false; }
      this.grounded = true; this.jumps = 0;
    } else if (was && vy <= 0 && this.pos.y - support < 0.55) {
      this.pos.y = support; this.vel.y = 0; this.grounded = true;
    } else {
      if (was) this.coyote = 0.12;
      this.grounded = false;
    }
    // running on water
    if (this.grounded && this.pos.y < 0.05) {
      const onRiver = this.pos.z > 17 && this.pos.z < 27 && Math.abs(this.pos.x) > 5;
      const onPond = hdist(this.pos, POI.pond) < 12.3;
      if (onRiver || onPond) {
        this.rippleT -= dt * (0.4 + Math.hypot(this.vel.x, this.vel.z) * 0.25);
        if (this.rippleT <= 0) { this.rippleT = 0.3; G.fx.ripple(this.pos); if (Math.hypot(this.vel.x, this.vel.z) > 9) G.fx.burst(this.pos, 4, { normal: true, color: 0xffffff, speed: 3, up: 3, grav: 12, life: 0.4, size: 0.18, shape: 2 }); }
      }
    }
  }

  // Each hero's signature move. Returns the animation to play.
  special() {
    const G = this.G, fx = G.fx, id = this.hero.id, f = this.forward(), t = this.t, col = this.hero.color;
    const hand = V.set(this.pos.x + f.x * 0.7, this.pos.y + 1.15, this.pos.z + f.z * 0.7).clone();
    this.vel.x = damp(this.vel.x, 0, 12, 0.016); this.vel.z = damp(this.vel.z, 0, 12, 0.016);
    if (id === 'kaze') { // Gale Burst: wind gathers in the palm, then a lunge and a blast
      if (t < 0.5) {
        this.orb.visible = true; this.orb.position.copy(hand); this.orb.scale.setScalar(0.12 + t * 0.9 + Math.sin(t * 60) * 0.03);
        this.light.position.copy(hand); this.light.intensity = 30 + t * 120;
        for (let i = 0; i < 3; i++) { const a = Math.random() * TAU, r = 2.2; fx.add.emit({ x: hand.x + Math.cos(a) * r, y: hand.y + (Math.random() - 0.5) * 2, z: hand.z + Math.sin(a) * r, vx: -Math.cos(a) * 7 - Math.sin(a) * 5, vy: 0, vz: -Math.sin(a) * 7 + Math.cos(a) * 5, life: 0.3, size: 0.25, size1: 0, color: this.color, boost: 2.4 }); }
        if (this.spTarget) this.faceTarget(this.spTarget);
        return { name: 'charge' };
      }
      if (t < 0.72) {
        this.vel.x = f.x * 24; this.vel.z = f.z * 24;
        this.orb.position.copy(hand); this.orb.scale.setScalar(0.75);
        this.light.position.copy(hand);
        const near = this.nearestTarget(2.4, 1.2);
        if (near && !this.hitDone) this.t = 0.72; // connect early
        return { name: 'thrust' };
      }
      if (!this.hitDone) {
        this.hitDone = true; this.orb.visible = false;
        const p = V.set(this.pos.x + f.x * 1.4, this.pos.y + 1.1, this.pos.z + f.z * 1.4).clone();
        fx.orb(p, { color: col, r0: 0.6, r1: 5.2, life: 0.45, boost: 1.8 });
        fx.ring(V.set(p.x, this.pos.y + 0.15, p.z), { r0: 0.6, r1: 8, life: 0.55, color: col, boost: 1.5 });
        fx.burst(p, 70, { color: col, speed: 17, life: 0.6, size: 0.4, boost: 2.4, drag: 2.5 });
        fx.dust(p, 18);
        const keepYaw = this.yaw;
        const save = this.pos.clone(); this.pos.set(p.x, this.pos.y, p.z);
        this.strike(5.0, 4, 34, { heavy: true, radial: true, color: col, knock: 16, lift: 7 });
        this.pos.copy(save); this.yaw = keepYaw;
        G.fx.shake(0.9); G.slowmo(0.25, 0.28);
      }
      this.light.intensity = damp(this.light.intensity, 0, 8, 0.016);
      if (t >= this.dur) { this.setState('free'); this.light.intensity = 0; }
      return { name: 'thrust' };
    }
    if (id === 'rei') { // Storm Lance: lightning wraps the blade, then a piercing line dash
      if (t < 0.3) {
        this.light.position.copy(hand); this.light.intensity = 60;
        if (Math.random() < 0.6) fx.bolt(V.set(hand.x + (Math.random() - 0.5) * 2.5, hand.y + 1 + Math.random() * 2, hand.z + (Math.random() - 0.5) * 2.5), hand, { color: col, life: 0.08, width: 0.04, jag: 0.5 });
        fx.burst(hand, 2, { color: col, speed: 3, life: 0.2, size: 0.2, boost: 2.5 });
        if (this.spTarget) this.faceTarget(this.spTarget);
        return { name: 'charge' };
      }
      if (!this.hitDone) {
        this.hitDone = true;
        const start = this.pos.clone();
        const L = 12;
        // find how far we can travel before a wall
        let step = 0;
        for (; step < L; step += 0.5) { if (G.world.solidAt(start.x + f.x * (step + 0.8), start.y + 0.9, start.z + f.z * (step + 0.8))) break; }
        fx.ghost(makeGhost(this.char, col, 0.7), 0.5);
        for (const tg of G.targets()) {
          const rx = tg.pos.x - start.x, rz = tg.pos.z - start.z, along = rx * f.x + rz * f.z, side = Math.abs(rx * f.z - rz * f.x);
          if (along > -0.5 && along < step + 1.5 && side < 2.0 + tg.radius && Math.abs(tg.pos.y - start.y) < 2.6) {
            if (tg.takeHit(30, f, { heavy: true, knock: 8, lift: 4 })) { const hp = V.set(tg.pos.x, tg.pos.y + 1.2, tg.pos.z); fx.sparks(hp, col, 28); G.ui.damage(hp, 30, true); fx.bolt(V2.set(tg.pos.x, tg.pos.y + 9, tg.pos.z), hp, { color: col, life: 0.3, width: 0.12, jag: 1.4 }); }
          }
        }
        this.pos.addScaledVector(f, step);
        const a = V.set(start.x, start.y + 1.1, start.z).clone(), b = V2.set(this.pos.x, this.pos.y + 1.1, this.pos.z).clone();
        for (let i = 0; i < 4; i++) fx.bolt(a, b, { color: col, life: 0.32, width: 0.1 - i * 0.015, jag: 1.0 + i * 0.4, segs: 10 });
        fx.slash(V.lerpVectors(a, b, 0.5), this.yaw, { color: col, size: 4, life: 0.3 });
        fx.shake(0.8); G.hitstop(0.09); G.slowmo(0.3, 0.22);
      }
      this.light.position.set(this.pos.x, this.pos.y + 1.2, this.pos.z); this.light.intensity = damp(this.light.intensity, 0, 6, 0.016);
      if (t >= this.dur) { this.setState('free'); this.light.intensity = 0; }
      return { name: 'thrust' };
    }
    // Tsuki: Moon Step. Vanish, arrive behind the target, one crescent cut.
    if (t < 0.22) {
      if (this.visible) { this.visible = false; fx.ghost(makeGhost(this.char, col, 0.8), 0.45); fx.burst(this.center, 20, { color: col, speed: 4, life: 0.5, size: 0.25, boost: 2.2 }); }
      return { name: 'dash' };
    }
    if (!this.hitDone) {
      this.hitDone = true; this.visible = true;
      const tg = this.spTarget;
      if (tg) {
        const ty = tg.yaw ?? this.yaw;
        const bx = tg.pos.x - Math.sin(ty) * 2.2, bz = tg.pos.z - Math.cos(ty) * 2.2;
        if (!G.world.solidAt(bx, tg.pos.y + 0.9, bz)) { this.pos.set(bx, tg.pos.y, bz); }
        this.faceTarget(tg);
      } else { let s = 0; for (; s < 8; s += 0.5) if (G.world.solidAt(this.pos.x + f.x * (s + 0.8), this.pos.y + 0.9, this.pos.z + f.z * (s + 0.8))) break; this.pos.addScaledVector(f, s); }
      const p = V.set(this.pos.x, this.pos.y + 1.1, this.pos.z).clone();
      fx.slash(p, this.yaw, { color: col, size: 5.2, life: 0.4, roll: 0.5, boost: 3 });
      fx.slash(p, this.yaw, { color: 0xffffff, size: 4.2, life: 0.3, roll: 0.5 });
      fx.burst(p, 40, { color: col, speed: 9, life: 0.6, size: 0.3, boost: 2.2 });
      this.strike(5.0, 2.2, 36, { heavy: true, color: col, knock: 12, lift: 5 });
      this.light.position.copy(p); this.light.intensity = 90;
      fx.shake(0.7); G.slowmo(0.2, 0.3);
    }
    this.light.intensity = damp(this.light.intensity, 0, 7, 0.016);
    if (t >= this.dur) { this.setState('free'); this.light.intensity = 0; }
    return { name: 'attack1', p: clamp((t - 0.22) / 0.3, 0, 1) };
  }
}

// ===================================================================================== Rogues
class Rogue {
  constructor(G, key) {
    const d = ROGUES[key];
    this.G = G; this.key = key; this.name = d.name; this.title = d.title;
    this.char = makeCharacter(d.look);
    this.scale = d.look.scale;
    G.scene.add(this.char.root);
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.yaw = 0;
    this.hp = this.maxHp = d.hp; this.radius = 0.5 * this.scale; this.height = 1.75 * this.scale;
    this.state = 'idle'; this.t = 0; this.dur = 0; this.flashT = 0; this.active = false; this.down = false; this.armor = false;
    this.anim = { name: 'arms' }; this.visible = true; this.did = false;
    this.char.root.visible = false;
  }
  get alive() { return this.active && !this.down; }
  set(s, dur = 0) { this.state = s; this.t = 0; this.dur = dur; this.did = false; }
  toPlayer() { const p = this.G.player.pos; return V2.set(p.x - this.pos.x, 0, p.z - this.pos.z); }
  face(k, dt) { const d = this.toPlayer(); this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), k, dt); }

  takeHit(dmg, dir, o = {}) {
    if (!this.alive || !this.visible) return false;
    this.hp = Math.max(0, this.hp - dmg); this.flashT = 0.12;
    this.onHurt?.(dmg);
    if (this.hp <= 0) {
      this.down = true; this.set('down'); this.armor = false;
      this.vel.set(dir.x * 9, 6, dir.z * 9);
      this.G.onRogueDown(this);
      return true;
    }
    if (!this.armor) { this.vel.x += dir.x * (o.knock || 3); this.vel.z += dir.z * (o.knock || 3); if (o.lift) this.vel.y = o.lift; if (o.heavy || this.state === 'idle' || this.state === 'move') this.set('stagger', o.heavy ? 0.5 : 0.2); }
    else { this.vel.x += dir.x * 1; this.vel.z += dir.z * 1; }
    return true;
  }

  base(dt) {
    this.t += dt; this.flashT -= dt;
    this.char.flash(this.flashT > 0 ? 1 : 0);
    this.vel.y -= 34 * dt;
    this.pos.addScaledVector(this.vel, dt);
    const dx = this.pos.x - POI.arena.x, dz = this.pos.z - POI.arena.z, d = Math.hypot(dx, dz);
    if (this.active && d > POI.arenaR - 0.5) { this.pos.x = POI.arena.x + dx / d * (POI.arenaR - 0.5); this.pos.z = POI.arena.z + dz / d * (POI.arenaR - 0.5); }
    const s = this.G.world.resolve(this.pos, this.radius, this.height);
    if (this.pos.y <= s) { this.pos.y = s; this.vel.y = 0; this.vel.x = damp(this.vel.x, 0, 7, dt); this.vel.z = damp(this.vel.z, 0, 7, dt); }
  }

  finish(dt) {
    this.anim.speed = Math.hypot(this.vel.x, this.vel.z);
    this.char.update(dt, this.anim);
    this.char.root.position.copy(this.pos);
    this.char.root.rotation.y = this.yaw;
    this.char.root.visible = this.visible;
  }
}

// The big one: slow, armoured wind-ups, punishes standing still.
export class Gouma extends Rogue {
  constructor(G) { super(G, 'gouma'); this.waveCd = 7; this.chargeCd = 4; this.waves = []; this.restT = 0; }

  update(dt) {
    const G = this.G, P = G.player, fx = G.fx;
    this.base(dt);
    this.waveCd -= dt; this.chargeCd -= dt;
    const rage = this.hp < this.maxHp * 0.5;
    const d = hdist(this.pos, P.pos);
    this.armor = false;

    if (!this.active) { this.finish(dt); return; }
    if (this.state === 'down') { this.anim = { name: this.t > 0.6 ? 'kneel' : 'hit' }; this.finish(dt); this.tickWaves(dt); return; }

    if (this.state === 'idle') {
      this.anim = { name: 'idle', guard: true }; this.face(6, dt);
      if (this.t > this.restT) {
        if (this.waveCd <= 0 && d < 17) { this.set('wave', 1.5); this.waveCd = rage ? 8 : 12; }
        else if (d > 8.5 && this.chargeCd <= 0) { this.set('charge', 1.45); this.chargeCd = rage ? 5 : 8; }
        else if (d < 3.6) { this.set('slam', rage ? 1.05 : 1.25); }
        else this.set('move');
      }
    } else if (this.state === 'move') {
      this.face(7, dt);
      const f = this.toPlayer().normalize(), sp = rage ? 6.2 : 4.8;
      this.vel.x = damp(this.vel.x, f.x * sp, 8, dt); this.vel.z = damp(this.vel.z, f.z * sp, 8, dt);
      this.anim = { name: 'move', run: 0.1 };
      if (d < 3.4 || this.t > 2.2) { this.set('idle'); this.restT = 0.05; }
    } else if (this.state === 'slam') {
      this.armor = true;
      const p = this.t / this.dur;
      this.anim = { name: 'slam', p };
      if (p < 0.5) this.face(5, dt);
      if (!this.did) {
        this.did = true;
        this.slamAt = new THREE.Vector3(this.pos.x + Math.sin(this.yaw) * 2.6, this.pos.y, this.pos.z + Math.cos(this.yaw) * 2.6);
        fx.telegraph(this.slamAt, 4.4, this.dur * 0.68);
        this.struck = false;
      }
      if (p < 0.5) { this.slamAt.set(this.pos.x + Math.sin(this.yaw) * 2.6, this.pos.y, this.pos.z + Math.cos(this.yaw) * 2.6); }
      if (!this.struck && p >= 0.7) {
        this.struck = true;
        fx.ring(V.set(this.slamAt.x, this.pos.y + 0.15, this.slamAt.z), { r0: 0.8, r1: 6.5, life: 0.5, color: 0xff7a5a, boost: 1.6 });
        fx.dust(this.slamAt, 26, 0xcfc6b4); fx.burst(V.set(this.slamAt.x, 0.3, this.slamAt.z), 30, { color: 0xffb080, speed: 11, life: 0.5, size: 0.3, boost: 2, grav: 14, up: 5 });
        fx.shake(0.9); G.audio.play('hit');
        if (hdist(P.pos, this.slamAt) < 4.4 && P.pos.y - this.pos.y < 2.2) P.takeHit(18, V2.set(P.pos.x - this.pos.x, 0, P.pos.z - this.pos.z).normalize(), true);
      }
      if (this.t >= this.dur) { this.set('idle'); this.restT = rage ? 0.45 : 0.8; }
    } else if (this.state === 'charge') {
      const wind = 0.6, run = 0.72;
      if (this.t < wind) {
        this.armor = true; this.face(9, dt); this.anim = { name: 'charge' };
        if (!this.did) { this.did = true; fx.ring(V.set(this.pos.x, this.pos.y + 0.15, this.pos.z), { r0: 3, r1: 0.6, life: wind, color: 0xff5a4a, opacity: 0.8, hold: true }); this.struck = false; }
        this.dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      } else if (this.t < wind + run) {
        this.armor = true; this.anim = { name: 'dash' };
        this.vel.x = this.dir.x * 22; this.vel.z = this.dir.z * 22;
        if (Math.random() < 0.6) fx.dust(this.pos, 2, 0xcfc6b4);
        if (!this.struck && d < 2.0 * this.scale && Math.abs(P.pos.y - this.pos.y) < 2) { this.struck = P.takeHit(14, this.dir, true) || this.struck; }
      } else {
        this.anim = { name: 'hit' };
        if (this.t >= this.dur) { this.set('idle'); this.restT = 0.3; }
      }
    } else if (this.state === 'wave') {
      this.armor = true;
      const p = this.t / this.dur;
      this.anim = { name: 'slam', p: clamp(p * 1.25, 0, 1) };
      if (!this.did && p >= 0.56) {
        this.did = true;
        const vis = fx.ring(V.set(this.pos.x, this.pos.y + 0.3, this.pos.z), { r0: 1, r1: 30, life: 1.7, color: 0x5fc8ff, boost: 1.7, linear: true, hold: true });
        const vis2 = fx.ring(V.set(this.pos.x, this.pos.y + 0.7, this.pos.z), { r0: 0.6, r1: 29.6, life: 1.7, color: 0xffffff, linear: true, hold: true, opacity: 0.5 });
        this.waves.push({ vis, x: this.pos.x, z: this.pos.z, y: this.pos.y, hit: false, vis2 });
        fx.shake(0.7); fx.dust(this.pos, 20, 0xbfe0f0);
      }
      if (this.t >= this.dur) { this.set('idle'); this.restT = 0.5; }
    } else if (this.state === 'stagger') {
      this.anim = { name: 'hit' };
      if (this.t >= this.dur) { this.set('idle'); this.restT = 0.1; }
    }
    this.tickWaves(dt);
    this.finish(dt);
  }

  tickWaves() {
    const P = this.G.player;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      if (w.vis.life <= 0) { this.waves.splice(i, 1); continue; }
      const r = w.vis.radius, d = Math.hypot(P.pos.x - w.x, P.pos.z - w.z);
      if (Math.random() < 0.5) { const a = Math.random() * TAU; this.G.fx.burst(V.set(w.x + Math.cos(a) * r, w.y + 0.3, w.z + Math.sin(a) * r), 1, { color: 0x9fe0ff, speed: 2, up: 4, life: 0.4, size: 0.35, boost: 2, grav: 10 }); }
      if (!w.hit && Math.abs(d - r) < 0.9 && P.pos.y - w.y < 0.95) { w.hit = P.takeHit(12, V2.set(P.pos.x - w.x, 0, P.pos.z - w.z).normalize(), true); }
    }
  }
}

// The quiet one: keeps range, sets traps, is never where you swing.
export class Yoru extends Rogue {
  constructor(G, illusion = false) {
    super(G, 'yoru');
    this.illusion = illusion; this.next = 1.6; this.strafe = 1; this.hurtRecent = 0; this.madeClones = false; this.binds = [];
    if (illusion) { this.hp = this.maxHp = 1; this.name = ''; }
  }
  onHurt() { this.hurtRecent += 1; }

  blink(to) {
    const fx = this.G.fx;
    fx.moths(V.set(this.pos.x, this.pos.y + 1.1, this.pos.z));
    fx.ghost(makeGhost(this.char, 0xe8e2d0, 0.5), 0.4);
    this.pos.copy(to); this.vel.set(0, 0, 0);
    fx.moths(V.set(this.pos.x, this.pos.y + 1.1, this.pos.z), 24);
  }

  farSpot(min = 11) {
    const P = this.G.player.pos;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, r = Math.random() * (POI.arenaR - 3);
      V.set(POI.arena.x + Math.cos(a) * r, 0, POI.arena.z + Math.sin(a) * r);
      if (hdist(V, P) > min) break;
    }
    return V.clone();
  }

  update(dt) {
    const G = this.G, P = G.player, fx = G.fx;
    this.base(dt);
    this.hurtRecent = Math.max(0, this.hurtRecent - dt * 0.7);
    const d = hdist(this.pos, P.pos), rage = this.hp < this.maxHp * 0.55;
    if (!this.active) { this.finish(dt); return; }
    if (this.state === 'down') { this.anim = { name: this.t > 0.6 ? 'kneel' : 'hit' }; this.finish(dt); this.tickBinds(dt); return; }

    if (this.state === 'idle') {
      this.face(8, dt);
      // drift: hold a ring around the player
      const to = this.toPlayer().normalize();
      const want = d < 7.5 ? -1 : d > 13.5 ? 1 : 0;
      const sx = -to.z * this.strafe, sz = to.x * this.strafe, sp = this.illusion ? 4.2 : 5.6;
      this.vel.x = damp(this.vel.x, (to.x * want + sx * 0.8) * sp, 6, dt); this.vel.z = damp(this.vel.z, (to.z * want + sz * 0.8) * sp, 6, dt);
      this.anim = { name: Math.hypot(this.vel.x, this.vel.z) > 1 ? 'move' : 'idle', run: 0.1 };
      if (Math.random() < dt * 0.3) this.strafe *= -1;
      if (!this.illusion && (d < 3.8 && this.t > 0.35 || this.hurtRecent >= 2)) { this.hurtRecent = 0; this.blink(this.farSpot()); this.set('idle'); this.next = 0.7; }
      else if (this.t > this.next) {
        if (!this.illusion && rage && !this.madeClones) { this.madeClones = true; this.set('clones', 0.9); }
        else if (!this.illusion && Math.random() < 0.42) this.set('bind', 0.8);
        else this.set('cast', 0.75);
      }
    } else if (this.state === 'cast') {
      this.face(10, dt);
      this.vel.x = damp(this.vel.x, 0, 8, dt); this.vel.z = damp(this.vel.z, 0, 8, dt);
      const p = this.t / this.dur;
      this.anim = { name: 'cast', p };
      const hand = V.set(this.pos.x + Math.sin(this.yaw) * 0.6, this.pos.y + 1.3 * this.scale, this.pos.z + Math.cos(this.yaw) * 0.6);
      if (p < 0.5) fx.burst(hand, 1, { color: 0xffb060, speed: 1.5, life: 0.25, size: 0.3, boost: 2.4 });
      if (!this.did && p >= 0.5) {
        this.did = true;
        const n = this.illusion ? 1 : rage ? 5 : 3;
        const base = Math.atan2(P.pos.x - hand.x, P.pos.z - hand.z);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.2;
          G.shoot({ kind: 'ember', from: 'enemy', pos: hand, vel: V2.set(Math.sin(a) * 17, (P.pos.y + 1 - hand.y) * 1.2, Math.cos(a) * 17), dmg: this.illusion ? 5 : 8, color: 0xff8a3c, life: 2.4 });
        }
      }
      if (this.t >= this.dur) { this.set('idle'); this.next = this.illusion ? 2.5 + Math.random() * 2 : (rage ? 0.9 : 1.5) + Math.random() * 0.7; }
    } else if (this.state === 'bind') {
      this.face(10, dt);
      this.vel.x = damp(this.vel.x, 0, 8, dt); this.vel.z = damp(this.vel.z, 0, 8, dt);
      this.anim = { name: 'point' };
      if (!this.did && this.t > 0.25) {
        this.did = true;
        const n = rage ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const at = new THREE.Vector3(P.pos.x + P.vel.x * 0.35 * i + (i ? (Math.random() - 0.5) * 7 : 0), P.pos.y < 1 ? 0 : P.pos.y, P.pos.z + P.vel.z * 0.35 * i + (i ? (Math.random() - 0.5) * 7 : 0));
          fx.telegraph(at, 3.2, 1.05, 0xe8e2ff);
          this.binds.push({ at, t: 1.05 });
        }
      }
      if (this.t >= this.dur) { this.set('idle'); this.next = (rage ? 0.8 : 1.3) + Math.random() * 0.6; }
    } else if (this.state === 'clones') {
      this.anim = { name: 'cast', p: this.t / this.dur };
      if (!this.did && this.t > 0.4) {
        this.did = true;
        G.ui.callout('Hush of Wings', true);
        this.blink(this.farSpot(8));
        for (let i = 0; i < 2; i++) G.spawnIllusion(this.farSpot(6));
      }
      if (this.t >= this.dur) { this.set('idle'); this.next = 1.0; }
    } else if (this.state === 'stagger') {
      this.anim = { name: 'hit' };
      if (this.t >= this.dur) { this.set('idle'); this.next = 0.5; }
    }
    this.tickBinds(dt);
    this.finish(dt);
  }

  tickBinds(dt) {
    const G = this.G, P = G.player, fx = G.fx;
    for (let i = this.binds.length - 1; i >= 0; i--) {
      const b = this.binds[i];
      b.t -= dt;
      if (b.t > 0) continue;
      this.binds.splice(i, 1);
      for (let k = 0; k < 46; k++) fx.add.emit({ x: b.at.x + (Math.random() - 0.5) * 5, y: b.at.y + Math.random() * 0.5, z: b.at.z + (Math.random() - 0.5) * 5, vx: 0, vy: 9 + Math.random() * 12, vz: 0, life: 0.6, size: 1.0, size1: 0.1, color: new THREE.Color(0xd8ccff), boost: 2.2 });
      fx.ring(V.set(b.at.x, b.at.y + 0.15, b.at.z), { r0: 3.2, r1: 4.4, life: 0.4, color: 0xd8ccff, boost: 1.5 });
      fx.shake(0.35);
      if (hdist(P.pos, b.at) < 3.2 && Math.abs(P.pos.y - b.at.y) < 3) P.takeHit(15, V2.set(P.pos.x - b.at.x, 0, P.pos.z - b.at.z).normalize(), true);
    }
  }
}

// ===================================================================================== Villagers
const VILLAGER_LINES = [
  'The blossoms are late this year. The elders say that means visitors.',
  'Hinode puts a whole egg in the bowl now. Go. Trust me.',
  'You can run on the river, you know. Lamplighters always could.',
  'My roof is not a road! ...Fine. It is a little bit a road.',
  'Light the beacon early tonight, would you? The fog comes in off the cliff.',
  'Double jump, then catch the eave. That is how my grandmother did it.',
  'The training posts by the east wall have never once hit back.',
];
const ROUTES = [
  [[-3, 70], [-3, 44], [-3, 34]], [[3, 60], [36, 66], [38, 42]], [[-36, 40], [-38, 8], [-10, 4]],
  [[36, 4], [38, -20], [26, -22]], [[-30, -22], [-38, -40], [-38, -20]], [[3, 12], [3, 0], [20, 4]],
];

export class Villager {
  constructor(G, i) {
    const r = makeRng(500 + i * 17);
    this.G = G;
    this.char = makeCharacter({
      hair: r.pick([0x2a2028, 0x5a3b28, 0x8a5a3a, 0x1c2140, 0x6a6a72]), hairStyle: r.pick(['bun', 'long', 'spiky', 'tail']),
      top: r.pick([0x4f7fa8, 0xa8554a, 0x5f8f5a, 0xc99a3c, 0x7a5a9a, 0xd8d0c0]), pants: r.pick([0x3a3a48, 0x5a4a3a, 0x2c3550]),
      accent: r.pick([0xf2ead8, 0xd9483a, 0x2fd0b0]), eye: r.pick(['#5a3b28', '#3a6fd8', '#3a8a5a']), skin: r.pick([0xf2c9a4, 0xe0b088, 0xc99a76, 0xf6d8bc]),
      scale: 0.9 + r() * 0.14, grin: r.chance(0.5),
    });
    G.scene.add(this.char.root);
    this.route = ROUTES[i % ROUTES.length]; this.k = 0; this.dirn = 1;
    this.pos = new THREE.Vector3(this.route[0][0], 0, this.route[0][1]);
    this.yaw = 0; this.wait = r() * 3; this.line = VILLAGER_LINES[i % VILLAGER_LINES.length]; this.cheer = false; this.hidden = false;
  }
  update(dt) {
    const c = this.char;
    c.root.visible = !this.hidden;
    if (this.hidden) return;
    let anim = { name: this.cheer ? 'cheer' : 'idle' };
    const P = this.G.player.pos, near = hdist(P, this.pos) < 4;
    if (near || this.cheer) { this.yaw = dampAngle(this.yaw, Math.atan2(P.x - this.pos.x, P.z - this.pos.z), 6, dt); }
    else if (this.wait > 0) this.wait -= dt;
    else {
      const w = this.route[this.k], dx = w[0] - this.pos.x, dz = w[1] - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { this.k += this.dirn; if (this.k >= this.route.length || this.k < 0) { this.dirn *= -1; this.k += this.dirn * 2; } this.wait = 1 + Math.random() * 3; }
      else { this.pos.x += dx / d * 2.3 * dt; this.pos.z += dz / d * 2.3 * dt; this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 8, dt); anim = { name: 'move', run: 0, speed: 2.3 }; }
      this.pos.y = this.G.world.resolve(this.pos, 0.35);
    }
    c.update(dt * (anim.name === 'move' ? 0.62 : 1), anim);
    c.root.position.copy(this.pos); c.root.rotation.y = this.yaw;
  }
}

// ===================================================================================== Projectiles
const starGeo = (() => { const s = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 0.09 : 0.3; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }).rotateX(Math.PI / 2); })();
const emberGeo = new THREE.SphereGeometry(0.26, 10, 8);

export class Projectiles {
  constructor(G) { this.G = G; this.list = []; }
  shoot(o) {
    const mat = o.kind === 'star' ? toon(0xdfe6ee, { emissive: o.color, emissiveIntensity: 0.6 }) : new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color).multiplyScalar(2.6) });
    const m = new THREE.Mesh(o.kind === 'star' ? starGeo : emberGeo, mat);
    m.position.copy(o.pos); this.G.scene.add(m);
    this.list.push({ m, vel: o.vel.clone(), life: o.life, dmg: o.dmg, from: o.from, kind: o.kind, color: new THREE.Color(o.color) });
  }
  clear() { for (const p of this.list) this.G.scene.remove(p.m); this.list.length = 0; }
  update(dt) {
    const G = this.G, fx = G.fx, P = G.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.m.position.addScaledVector(p.vel, dt);
      const q = p.m.position;
      let dead = p.life <= 0 || q.y < 0.05 || G.world.solidAt(q.x, q.y, q.z);
      if (p.kind === 'star') { p.m.rotation.y += dt * 30; if (Math.random() < 0.5) fx.add.emit({ x: q.x, y: q.y, z: q.z, life: 0.18, size: 0.18, size1: 0, color: p.color, boost: 2 }); }
      else fx.add.emit({ x: q.x, y: q.y, z: q.z, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 1.5, life: 0.35, size: 0.6, size1: 0, color: p.color, boost: 2.2 });
      if (!dead && p.from === 'enemy') {
        if (Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < 0.8 && q.y > P.pos.y - 0.2 && q.y < P.pos.y + 1.9) { dead = true; P.takeHit(p.dmg, V.copy(p.vel).setY(0).normalize(), false); }
      } else if (!dead) {
        for (const t of G.targets()) {
          if (Math.hypot(q.x - t.pos.x, q.z - t.pos.z) < t.radius + 0.5 && q.y > t.pos.y - 0.2 && q.y < t.pos.y + (t.height || 1.8) + 0.3) {
            if (t.takeHit(p.dmg, V.copy(p.vel).setY(0).normalize(), { knock: 1 })) { G.ui.damage(q, p.dmg); G.audio.play('hit'); }
            dead = true; break;
          }
        }
      }
      if (dead) { fx.sparks(q, p.color.getHex(), 8); G.scene.remove(p.m); p.m.material.dispose(); this.list.splice(i, 1); }
    }
  }
}
