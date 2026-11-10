import * as THREE from 'three';
import { POI } from './world.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const PALE = 0xd8ccff, CHEF = 0xffb45a;
const HERO_LINES = {
  kaze: 'Funny. I was about to say the same thing about you two leaving.',
  rei: 'You climbed every one of those stairs just to hear the word no.',
  tsuki: 'Thirty years. Not one beacon missed. Tonight is not special.',
};

// The whole plot, written as plain async steps. The game keeps running while each line waits.
export class Story {
  constructor(G) { this.G = G; this.phase = 'title'; this.busy = false; }

  objectiveFor() {
    return {
      explore: 'Follow the lanterns up the main street and eat at Ramen Hinode',
      omen: 'Strangers at the Ember Pagoda. Go to the plaza',
      duel: 'Defeat the Pale Moths',
      beacon: 'Climb the Ember Pagoda and light the beacon',
      free: 'Free roam. T changes the time of day, C is the cinematic camera',
    }[this.phase] || '';
  }
  setPhase(p) { this.phase = p; this.G.ui.objective(this.objectiveFor()); }

  shot(pos, look, fov = 50, snap = false) { this.G.cam.override = { pos, look, fov, snap }; }

  async intro() {
    const G = this.G, P = G.player, ui = G.ui;
    this.busy = true; P.locked = true; P.anim = { name: 'idle' };
    ui.cine(true);
    this.shot(v(5, 2.2, 90), v(0, 1.4, 84), 42, true);
    await G.wait(0.4);
    this.shot(v(0, 13, 106), v(0, 9, -40), 50);
    ui.card('KAGARIBI', 'The village of the hidden ember', 3.6);
    G.audio.play('music_village'); G.audio.play('amb_village');
    await G.wait(3.8);
    this.shot(v(-3.5, 1.9, 79.5), v(0, 1.5, 84), 40);
    await ui.say('', 'Every dusk, one shinobi carries the village flame to the top of the Ember Pagoda. Tonight that is you, Lamplighter.');
    await ui.say(P.hero.name, 'Nobody lights a beacon on an empty stomach.', P.hero.color);
    this.release();
    this.setPhase('explore');
  }

  release() {
    const G = this.G;
    G.cam.override = null; G.ui.cine(false); G.player.locked = false; this.busy = false;
    G.cam.yaw = G.player.yaw + Math.PI; G.cam.pitch = 0.24;
  }

  async eat() {
    const G = this.G, P = G.player, ui = G.ui, W = G.world;
    this.busy = true; P.locked = true; ui.prompt(null);
    await ui.fade(true);
    P.pos.set(POI.ramenSeat.x, 0, POI.ramenSeat.z); P.yaw = -Math.PI / 2; P.anim = { name: 'sit' };
    W.bowl.visible = true; ui.cine(true);
    this.shot(v(-3.9, 2.0, 54.2), v(-8.4, 1.25, 51), 38, true);
    await ui.fade(false);
    await ui.say('Chef Hinode', 'Lamplighter! Sit, sit. The usual? Extra egg. I know, I know.', CHEF);
    P.anim = { name: 'sit', eating: true };
    this.shot(v(-6.0, 1.75, 48.6), v(-7.6, 1.25, 51), 32);
    G.audio.play('slurp');
    for (let i = 0; i < 8; i++) { await G.wait(0.4); G.fx.burst(v(-8.1, 1.5, 51), 3, { normal: true, color: 0xffffff, speed: 0.6, up: 1.2, life: 1.2, size: 0.4, size1: 1.0, alpha: 0.4 }); }
    P.anim = { name: 'sit' };
    P.hp = P.maxHp; P.ki = P.maxKi; P.fed = 120;
    ui.toast('Well fed: health restored, ki recovers faster', 3);
    this.shot(v(-4.4, 2.0, 49.0), v(-10.6, 1.6, 51), 36);
    await ui.say('Chef Hinode', 'Eat fast. Two travellers in grey cloaks went up toward the pagoda an hour ago. They did not look hungry. They looked like they were counting.', CHEF);
    // the sky turns
    G.env.setLook('omen'); G.state.omen = true; ui.lookName('Ill omen');
    G.audio.play('bell'); G.fx.shake(0.35);
    this.shot(v(0, 9, 30), v(0, 16, -76), 34, true);
    for (const r of G.rogues) { r.char.root.visible = true; r.visible = true; }
    G.placeRogues();
    for (const n of G.villagers) n.hidden = true;
    ui.card('STRANGERS AT THE PAGODA', 'The lanterns gutter', 3.4);
    await G.wait(3.6);
    W.bowl.visible = false;
    P.pos.set(-5.2, 0, 51); P.yaw = Math.PI;
    this.release();
    this.setPhase('omen');
  }

  async duel() {
    const G = this.G, P = G.player, ui = G.ui, [gouma, yoru] = G.rogues;
    this.busy = true; P.locked = true; ui.prompt(null); ui.cine(true);
    G.audio.stop('music_village'); G.audio.play('music_battle');
    P.pos.set(0, 0, -25); P.yaw = Math.PI; P.vel.set(0, 0, 0); P.anim = { name: 'idle' };
    G.placeRogues();
    this.shot(v(2.6, 1.3, -20.5), v(0, 4.6, -66), 36, true);
    await G.wait(1.4);
    this.shot(v(4.6, 4.6, -62.2), v(2.2, 4.25, -66.5), 30, true);
    yoru.anim = { name: 'arms' };
    await ui.say('Yoru', 'There you are. The one who carries the flame.', PALE);
    this.shot(v(-5.4, 4.2, -62), v(-2.4, 4.75, -66.5), 32, true);
    gouma.anim = { name: 'idle', guard: true };
    await ui.say('Gouma', 'That one? I have pulled fish out of the river with more fight in them.', PALE);
    this.shot(v(0, 5.4, -60.5), v(0, 4.3, -66.5), 44, true);
    yoru.anim = { name: 'point' };
    await ui.say('Yoru', 'The Pale Moths have come for the Ember. Hand it over, Lamplighter, and your village sleeps soundly tonight.', PALE);
    this.shot(v(1.5, 1.45, -28.2), v(0, 1.5, -25), 34, true);
    P.anim = { name: 'idle', guard: true };
    await ui.say(P.hero.name, HERO_LINES[P.hero.id], P.hero.color);
    // they leap down into the ring
    this.shot(v(9, 3.2, -22), v(0, 2.2, -44), 48, true);
    const T = 0.95;
    const leap = (r, x, z) => { r.vel.set((x - r.pos.x) / T, 34 * T / 2 - r.pos.y / T, (z - r.pos.z) / T); r.anim = { name: 'air', vy: 5 }; };
    leap(gouma, -4.5, -42); leap(yoru, 5.5, -46);
    await G.wait(T + 0.05);
    for (const r of G.rogues) { G.fx.dust(r.pos, 20, 0xcfc6b4); G.fx.ring(v(r.pos.x, 0.15, r.pos.z), { r0: 0.5, r1: 5, life: 0.5, color: PALE }); }
    G.fx.shake(0.8);
    gouma.anim = { name: 'idle', guard: true }; yoru.anim = { name: 'arms' };
    ui.card('GOUMA × YORU', 'The Pale Moths', 2.4);
    await G.wait(2.3);
    G.startDuel();
    this.release();
    P.inCombat = true;
    this.setPhase('duel');
  }

  async victory() {
    const G = this.G, P = G.player, ui = G.ui, [gouma, yoru] = G.rogues;
    this.busy = true;
    await G.wait(1.3);
    P.locked = true; P.anim = { name: 'idle', guard: true }; ui.cine(true); ui.foes(null);
    G.arena.active = false; G.projectiles.clear(); G.clearIllusions();
    const mid = v((gouma.pos.x + yoru.pos.x) / 2, 1.4, (gouma.pos.z + yoru.pos.z) / 2);
    this.shot(v(mid.x + 5, 2.0, mid.z + 7.5), mid, 40, true);
    await ui.say('Gouma', 'Hah. The little flame bites.', PALE);
    await ui.say('Yoru', 'Enough. We have seen what we came to see. Another night, Lamplighter.', PALE);
    for (const r of G.rogues) { G.fx.moths(v(r.pos.x, r.pos.y + 1.2, r.pos.z), 70); r.visible = false; r.active = false; }
    G.audio.stop('music_battle'); G.audio.play('victory');
    await G.wait(1.2);
    G.env.setLook('dusk'); G.state.omen = false; ui.lookName('Dusk');
    for (const n of G.villagers) { n.hidden = false; n.cheer = true; }
    this.shot(v(P.pos.x + 2.4, 1.3, P.pos.z + 3.4), v(P.pos.x, 1.5, P.pos.z), 36, true);
    P.anim = { name: 'cheer' };
    ui.card('THE EMBER HOLDS', 'Kagaribi stands', 3.2);
    await G.wait(3.4);
    P.hp = P.maxHp; P.inCombat = false;
    G.audio.play('music_village');
    this.release();
    this.setPhase('beacon');
    setTimeout(() => { for (const n of G.villagers) n.cheer = false; }, 12000);
  }

  async lightBeacon() {
    const G = this.G, P = G.player, ui = G.ui, W = G.world;
    this.busy = true; P.locked = true; ui.prompt(null); ui.cine(true);
    P.anim = { name: 'point' };
    const b = W.beaconMesh.position;
    this.shot(v(b.x + 13, b.y + 2, b.z + 17), v(b.x, b.y - 1.5, b.z), 40, true);
    await G.wait(1.0);
    G.state.beacon = true;
    W.beaconMat.color.setRGB(3.2, 1.3, 0.3);
    W.beaconLight.intensity = 70;
    G.fx.orb(b, { color: 0xffa040, r0: 1, r1: 14, life: 0.8, boost: 2 });
    G.fx.shake(0.5); G.audio.play('bell');
    G.env.setLook('night'); ui.lookName('Night');
    P.anim = { name: 'cheer' };
    await G.wait(1.6);
    this.shot(v(46, 30, 34), v(0, 22, -60), 46);
    ui.card('HIDDEN EMBER', 'The beacon is lit. The village sleeps', 6);
    const cols = [0xff5a6a, 0xffd060, 0x5fd8ff, 0xb48cff, 0x7dffb0, 0xff9a4a];
    for (let i = 0; i < 16; i++) {
      G.fx.firework(v((Math.random() - 0.5) * 110, 44 + Math.random() * 26, -60 + (Math.random() - 0.5) * 70), cols[i % cols.length]);
      G.audio.play('firework');
      await G.wait(0.42 + Math.random() * 0.3);
    }
    await G.wait(1.2);
    this.release();
    this.setPhase('free');
  }

  // Called every frame: decides what the E key does right now.
  update() {
    const G = this.G, P = G.player, ui = G.ui;
    if (this.busy || !P || this.phase === 'title') return;
    let prompt = null, act = null;
    const near = (p, r) => Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < r;

    if (this.phase === 'omen' && near(POI.arena, 16)) { this.duel(); return; }
    if (this.phase === 'duel') { ui.prompt(null); return; }

    if ((this.phase === 'explore' || this.phase === 'free' || this.phase === 'beacon') && near(POI.ramenSeat, 2.6) && P.grounded && P.pos.y < 0.5) {
      prompt = this.phase === 'explore' ? 'Sit down and eat' : 'Another bowl'; act = () => (this.phase === 'explore' ? this.eat() : this.snack());
    } else if (this.phase === 'beacon' && P.pos.y > G.world.beaconTopY - 0.5 && near(POI.beacon, 5)) {
      prompt = 'Light the beacon'; act = () => this.lightBeacon();
    } else {
      for (const n of G.villagers) if (!n.hidden && near(n.pos, 2.6) && Math.abs(P.pos.y - n.pos.y) < 1.5) { prompt = 'Talk'; act = () => this.talk(n); break; }
    }
    ui.prompt(prompt);
    if (act && G.input.hit('interact')) act();
  }

  async talk(n) {
    const G = this.G;
    this.busy = true; G.player.locked = true; G.player.anim = { name: 'idle' }; G.ui.prompt(null);
    const line = this.phase === 'beacon' ? 'You sent them running! Go on, the beacon. The whole village is watching the pagoda.' : this.phase === 'free' ? 'Best beacon in years. And the fireworks! Who paid for the fireworks?' : n.line;
    await G.ui.say('Villager', line, 0xf6ecd9);
    G.player.locked = false; this.busy = false;
  }

  async snack() {
    const G = this.G, P = G.player;
    this.busy = true; P.locked = true; G.ui.prompt(null);
    await G.ui.say('Chef Hinode', 'Back already? Good. Heroes are bad for business unless they are hungry.', CHEF);
    P.hp = P.maxHp; P.ki = P.maxKi; P.fed = 120;
    G.ui.toast('Well fed: health restored, ki recovers faster', 3);
    P.locked = false; this.busy = false;
  }
}
