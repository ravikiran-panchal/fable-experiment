// Paid work in free roam. Read the job board north of the bridge, pick a notice, do it, get copper.
// To add a job: add an entry to JOBS and a matching case in start(), tick() and target().
import * as THREE from 'three';
import { POI } from './world.js';
import { makeRng, TAU } from './util.js';

export const JOBS = [
  { id: 'ramen', name: 'Ramen run', pay: 6, blurb: 'Hinode has three bowls going cold. Deliver them before the noodles go soft.' },
  { id: 'lanterns', name: 'Lost lanterns', pay: 8, blurb: 'Last night\'s wind put six festival lanterns on the rooftops. Fetch them down.' },
  { id: 'moths', name: 'Moth scouts', pay: 12, blurb: 'Pale Moth scouts were seen on the plaza. Send them home.' },
];
const DOORS = [[-30, 66], [38, 52], [-38, 10], [24, 4], [-38, -22], [30, 40], [-20, 40], [38, -8]]; // street corners that take deliveries
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export class Jobs {
  constructor(G) {
    this.G = G; this.active = null; this.count = 0; this.lamps = [];
    // a column of light that marks where to go
    this.marker = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 16, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 8;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.position.y = 0.12;
    this.marker.add(beam, ring); this.marker.visible = false; G.scene.add(this.marker);
    this.lampGeo = new THREE.SphereGeometry(0.42, 12, 9);
  }

  // The board: pick a job, or drop the one you are on.
  async offer() {
    const G = this.G, ui = G.ui;
    G.audio.play('paper');
    if (this.active) {
      const j = this.active.job;
      if ((await ui.choose('Job board', `You are on a job: ${j.name}.`, ['Keep going', 'Drop the job'])) === 1) this.end(false, 'Job dropped');
      return;
    }
    const i = await ui.choose('Job board', 'Three notices are pinned up. Pay is in copper.', [...JOBS.map((j) => `${j.name} · ${j.pay}`), 'Leave']);
    if (i >= JOBS.length) return;
    await ui.say('Notice', JOBS[i].blurb, 0xffd060);
    this.start(JOBS[i]);
  }

  start(job) {
    const G = this.G, a = (this.active = { job, stage: 0, t: 0, n: 0, said: -1 });
    this.count++;
    if (job.id === 'ramen') { const r = makeRng(77 + this.count * 13); a.drops = [...DOORS].sort(() => r() - 0.5).slice(0, 3); a.t = 85; }
    if (job.id === 'lanterns') {
      const r = makeRng(31 + this.count * 7), roofs = G.world.colliders.filter((c) => c.kind === 'house' && Math.hypot(c.cx, c.cz - 10) < 75);
      for (let k = 0; k < 6; k++) {
        const c = roofs.splice(Math.floor(r() * roofs.length), 1)[0], col = [0xff6a3a, 0xffd36a, 0xff5a8a][k % 3];
        const m = new THREE.Mesh(this.lampGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.7) }));
        m.position.set(c.cx, G.world.topAt(c, c.cx, c.cz) + 1.0, c.cz); m.userData.y = m.position.y; m.userData.col = col;
        G.scene.add(m); this.lamps.push(m);
      }
    }
    G.ui.toast(`Job taken: ${job.name}`, 3);
    this.say();
  }

  // Where the minimap diamond points while a job is on.
  target() {
    const a = this.active, P = this.G.player;
    if (!a) return null;
    if (a.job.id === 'ramen') return a.stage === 0 ? POI.ramenSeat : v3(a.drops[a.n][0], 0, a.drops[a.n][1]);
    if (a.job.id === 'moths') return POI.arena;
    let best = null, bd = 1e9;
    for (const m of this.lamps) { const d = m.position.distanceTo(P.pos); if (d < bd) { bd = d; best = m.position; } }
    return best;
  }

  say() {
    const a = this.active, id = a.job.id;
    const text = id === 'ramen' ? (a.stage === 0 ? 'Ramen run: collect the bowls from Ramen Hinode' : `Ramen run: deliver bowl ${a.n + 1} of 3 · ${Math.ceil(a.t)} s left`)
      : id === 'lanterns' ? `Lost lanterns: ${6 - this.lamps.length} of 6 found. They are on the rooftops`
      : a.stage === 0 ? 'Moth scouts: go to the plaza' : `Moth scouts: ${this.G.illusions.length} left`;
    this.G.ui.objective(text);
  }

  end(won, note) {
    const G = this.G, a = this.active;
    if (!a) return;
    for (const m of this.lamps) G.scene.remove(m);
    this.lamps.length = 0; this.marker.visible = false;
    if (a.job.id === 'moths') { G.clearIllusions(); G.player.inCombat = false; }
    this.active = null;
    if (won) {
      const pay = a.job.pay + (a.bonus || 0);
      G.state.coins += pay; G.ui.coins(G.state.coins);
      G.audio.play('job_done'); G.audio.play('coins');
      G.ui.card('JOB DONE', `${a.job.name}: +${pay} copper${a.bonus ? ' (fast delivery bonus)' : ''}`, 3);
    } else { G.audio.play('job_fail'); G.ui.toast(note, 3); }
    G.story.setPhase(G.story.phase);
  }

  update(dt) {
    const G = this.G, P = G.player, a = this.active;
    if (!a || !P || G.story.busy) return;
    const near = (x, z, r) => Math.hypot(P.pos.x - x, P.pos.z - z) < r, id = a.job.id;
    const tg = this.target();
    this.marker.visible = !!tg && id !== 'lanterns' && !(id === 'moths' && a.stage === 1);
    if (this.marker.visible) { this.marker.position.set(tg.x, 0, tg.z); this.marker.children[1].scale.setScalar(1 + Math.sin(G.time * 4) * 0.08); }

    if (id === 'ramen') {
      if (a.stage === 0) { if (near(POI.ramenSeat.x, POI.ramenSeat.z, 3.4)) { a.stage = 1; G.audio.play('pickup'); G.ui.toast('Three bowls, still hot. Run!', 2.5); } }
      else {
        a.t -= dt;
        const d = a.drops[a.n];
        if (near(d[0], d[1], 2.8) && P.pos.y < 1) {
          a.n++; G.audio.play('pickup'); G.fx.sparks(v3(d[0], 1.2, d[1]), 0xffd060, 18);
          if (a.n === 3) { a.bonus = a.t > 25 ? 2 : 0; return this.end(true); }
          G.ui.toast(`Delivered ${a.n} of 3`, 2);
        } else if (a.t <= 0) return this.end(false, 'The noodles went soft. No pay this time');
      }
    } else if (id === 'lanterns') {
      for (let i = this.lamps.length - 1; i >= 0; i--) {
        const m = this.lamps[i];
        m.position.y = m.userData.y + Math.sin(G.time * 2 + i) * 0.18;
        if (m.position.distanceTo(P.pos) < 2.1 || Math.hypot(m.position.x - P.pos.x, m.position.z - P.pos.z) < 1.5 && Math.abs(P.pos.y + 1 - m.position.y) < 2) {
          G.fx.sparks(m.position, m.userData.col, 20); G.audio.play('pickup');
          G.scene.remove(m); this.lamps.splice(i, 1);
          if (!this.lamps.length) return this.end(true);
          G.ui.toast(`Lantern ${6 - this.lamps.length} of 6`, 2);
        }
      }
    } else if (id === 'moths') {
      if (a.stage === 0) {
        if (near(POI.arena.x, POI.arena.z, 17)) {
          a.stage = 1; P.inCombat = true;
          for (let k = 0; k < 4; k++) { const ang = k / 4 * TAU + 0.6; G.spawnIllusion(v3(POI.arena.x + Math.cos(ang) * 9, 0, POI.arena.z + Math.sin(ang) * 9)); }
          G.ui.toast('Four scouts. One good hit each', 2.5);
        }
      } else if (!G.illusions.length) return this.end(true);
    }
    const key = id === 'ramen' ? a.stage * 1000 + a.n * 100 + Math.ceil(a.t) : id === 'lanterns' ? this.lamps.length : a.stage * 10 + G.illusions.length;
    if (key !== a.said) { a.said = key; this.say(); }
  }
}
