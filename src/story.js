import * as THREE from 'three';
import { POI } from './world.js';
import { giveProp, takeProps } from './town.js';
import { TAU } from './util.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const PALE = 0xd8ccff, CHEF = 0xffb45a, SONG = 0xffd9a0;
const HERO_LINES = {
  kaze: 'Funny. I was about to say the same thing about you two leaving.',
  rei: 'You climbed every one of those stairs just to hear the word no.',
  tsuki: 'Thirty years of night watches. Not one flame lost. Tonight is not special.',
};

// The whole plot, written as plain async steps. The game keeps running while each line waits.
export class Story {
  constructor(G) { this.G = G; this.phase = 'title'; this.busy = false; this.shown = 0; this.cheerT = 0; }

  objectiveFor() {
    return {
      explore: 'Follow the lanterns up the main street and eat at Ramen Hinode',
      omen: 'Strangers at the Ember Pagoda. Go to the plaza',
      duel: 'Defeat the Pale Moths',
      beacon: 'Climb the Ember Pagoda and light the beacon',
      festival: 'Join the bonfire on the south bank of the river',
      inn: 'Book a room at Inn Hotaru, across the street from the ramen stall',
      bath: 'Go through to your room. The bath is past it',
      sleep: 'Sleep in the futon',
      morning: 'Find work: check the job board north of the bridge',
      academy: 'Go to the academy with Satoru and take your old seat (back row)',
      showcase: `Training ground: weave 3 jutsu on the posts with V (${this.shown}/3)`,
      free: 'Free roam. The job board north of the bridge pays copper. Z trains, T changes the time of day',
    }[this.phase] || '';
  }
  setPhase(p) { this.phase = p; this.G.ui.objective(this.objectiveFor()); if (this.G.player) this.G.save.add(p, this.G.player.hero.id, this.G.state.coins); }
  // Where the minimap diamond points.
  target() {
    return { explore: POI.ramenSeat, omen: POI.arena, beacon: POI.pagoda, festival: POI.bonfire, inn: POI.innDesk, bath: POI.bath, sleep: POI.futon, morning: POI.jobBoard, academy: POI.seat, showcase: POI.training }[this.phase] || null;
  }

  shot(pos, look, fov = 50, snap = false) { this.G.cam.override = { pos, look, fov, snap }; }
  hold() { const G = this.G; this.busy = true; G.player.locked = true; G.ui.prompt(null); G.ui.cine(true); }
  release() {
    const G = this.G;
    G.cam.override = null; G.ui.cine(false); G.player.locked = false; this.busy = false;
    G.cam.yaw = G.player.yaw + Math.PI; G.cam.pitch = 0.24;
  }

  // ------------------------------------------------------------ arrival, and the dream
  async intro() {
    const G = this.G, P = G.player, ui = G.ui;
    this.hold();
    ui.coins(G.state.coins);
    P.pos.set(0, 0, 96.2); P.yaw = Math.PI; P.anim = { name: 'move', run: 0, speed: 3.6 };
    this.shot(v(4.6, 1.7, 86.5), v(0, 1.4, 91), 40, true);
    G.audio.play('music_village'); G.audio.play('amb_village');
    await G.tween(3.4, (k) => { P.pos.z = 96.2 - 12.2 * k; this.shot(v(4.6, 1.7, 86.5), v(0, 1.35, P.pos.z - 0.6), 40, true); }); // the camera turns with the hero as they come through the gate
    P.anim = { name: 'idle' };
    this.shot(v(0, 13, 106), v(0, 9, -40), 50);
    ui.card('KAGARIBI', 'The village of the hidden ember', 3.6);
    await G.wait(3.8);
    this.shot(v(-3.5, 1.9, 79.5), v(0, 1.5, 84), 40);
    await ui.say('', 'Three weeks on the road, chasing a dream. Then the lanterns of Kagaribi came up over the hill.');
    await ui.say('', 'You know every roof of this village. You learned your signs at its academy, and you graduated from its desks.');
    await ui.say(P.hero.name, 'One night here. Then north, to find the one in the white cloak.', P.hero.color);
    await ui.say('', 'By old custom, a graduate who comes home carries the village flame up the Ember Pagoda at dusk. Tonight you are the Lamplighter.');
    const pick = await ui.choose('', 'The dream that put you on this road still burns behind your eyes. A fox. Nine tails. A valley.', ['Remember the dream', 'Not now']);
    if (pick === 0) { await G.dream.play(); this.shot(v(-3.5, 1.9, 79.5), v(0, 1.5, 84), 40, true); await ui.fade(false); await ui.say(P.hero.name, '(Both jutsu, she said. Fine. But first...)', P.hero.color); }
    await ui.say(P.hero.name, 'Nobody lights a beacon on an empty stomach.', P.hero.color);
    this.release();
    this.setPhase('explore');
  }

  async eat() {
    const G = this.G, P = G.player, ui = G.ui, W = G.world;
    this.busy = true; P.locked = true; ui.prompt(null);
    await ui.fade(true);
    P.pos.set(POI.ramenSeat.x, 0, POI.ramenSeat.z); P.yaw = -Math.PI / 2; P.anim = { name: 'sit' };
    W.bowl.visible = true; ui.cine(true);
    this.shot(v(-3.9, 2.0, 54.2), v(-8.4, 1.25, 51), 38, true);
    await ui.fade(false);
    await ui.say('Chef Hinode', 'Well, look what the road dragged home! Sit, sit. The usual? Extra egg. Graduates eat free on their first night back.', CHEF);
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
    this.hold();
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

  litBeacon() { // the beacon's lit look, also used by the jump links
    const G = this.G, W = G.world;
    G.state.beacon = true; W.beaconMat.color.setRGB(3.2, 1.3, 0.3); W.beaconLight.intensity = 70;
  }

  async lightBeacon() {
    const G = this.G, P = G.player, ui = G.ui, W = G.world;
    this.hold();
    P.anim = { name: 'point' };
    const b = W.beaconMesh.position;
    this.shot(v(b.x + 13, b.y + 2, b.z + 17), v(b.x, b.y - 1.5, b.z), 40, true);
    await G.wait(1.0);
    this.litBeacon();
    G.fx.orb(b, { color: 0xffa040, r0: 1, r1: 14, life: 0.8, boost: 2 });
    G.fx.shake(0.5); G.audio.play('bell');
    G.env.setLook('night'); ui.lookName('Night');
    P.anim = { name: 'cheer' };
    await G.wait(1.6);
    this.shot(v(46, 30, 34), v(0, 22, -60), 46);
    ui.card('THE LAST EMBER', 'The beacon is lit', 5);
    const cols = [0xff5a6a, 0xffd060, 0x5fd8ff, 0xb48cff, 0x7dffb0, 0xff9a4a];
    for (let i = 0; i < 12; i++) {
      G.fx.firework(v((Math.random() - 0.5) * 110, 44 + Math.random() * 26, -60 + (Math.random() - 0.5) * 70), cols[i % cols.length]);
      G.audio.play('firework');
      await G.wait(0.42 + Math.random() * 0.3);
    }
    // down by the river, the village answers with a fire of its own
    this.setFestival(true);
    this.shot(v(18, 8, 13), v(20, 1.4, 35.5), 40, true);
    await ui.say('', 'Down on the south bank someone has lit a second fire. The whole village is walking toward the river.');
    this.release();
    this.setPhase('festival');
  }

  // ------------------------------------------------------------ the bonfire
  // Puts the whole village round the fire (or sends everyone home again).
  setFestival(on) {
    const G = this.G, F = POI.bonfire, V = G.villagers, N = G.cast, side = -Math.PI / 2;
    G.state.bonfire = on; G.world.town.festival.visible = on;
    if (on) { if (G.audio.loops.music_festival) { G.audio.stop('music_village'); G.audio.play('music_festival'); } G.audio.play('amb_fire'); }
    else { G.audio.stop('music_festival'); G.audio.stop('amb_fire'); G.audio.play('music_village'); }
    const all = [...V, N.chef, N.teacher, N.satoru, ...N.kids];
    for (const a of all) { takeProps(a.char); a.stage = null; }
    if (!on) { N.chef.goHome(); return; }
    for (const n of V) { n.hidden = false; n.cheer = false; }
    for (const a of [N.teacher, N.satoru, ...N.kids]) { a.hidden = false; a.follow = null; }
    const play = (a, at, yaw, anim, prop) => { a.stage = { at, yaw, anim }; if (prop) giveProp(a.char, prop); };
    play(V[0], [26.75, 35.5], side, { name: 'drum' }, 'sticks');           // taiko
    play(V[1], [26.5, 38.4], side - 0.35, { name: 'strum' }, 'shamisen');  // shamisen
    play(V[2], [26.5, 32.6], side + 0.35, { name: 'flute' }, 'flute');     // shakuhachi
    [V[3], V[4], V[5], N.satoru, N.kids[0], N.kids[1]].forEach((a, i) => { a.stage = { orbit: { c: F, r: 4.4, w: 0.42, ph: i * TAU / 6 }, anim: { name: 'dance' } }; });
    play(N.chef, [13.9, 33.4], Math.PI / 2, { name: 'drink', seat: true, low: 0.2 }, 'mug');
    play(N.teacher, [13.9, 32.2], Math.PI / 2, { name: 'drink', seat: true, low: 0.2, ph: 2 }, 'mug');
    play(N.kids[2], [13.9, 37.0], Math.PI / 2, { name: 'sit' });
    play(N.kids[3], [13.9, 38.2], Math.PI / 2, { name: 'sit' });
    play(N.kids[4], [24.2, 31.6], 0.6, { name: 'cheer' });
  }

  async festival() {
    const G = this.G, P = G.player, ui = G.ui;
    this.hold();
    P.pos.set(16.6, 0, 40.6); P.yaw = Math.atan2(20 - 16.6, 35.5 - 40.6); P.anim = { name: 'idle' };
    this.shot(v(15, 4.6, 19.5), v(20, 1.6, 35.5), 44, true);
    this.shot(v(18, 5.4, 22), v(20, 1.6, 35.5), 44);
    await ui.say('', 'Taiko, shamisen and a bamboo flute. Kagaribi has played this song at every homecoming for two hundred years.');
    this.shot(v(23.6, 1.7, 33.2), v(26.4, 1.45, 35.6), 38, true);
    await ui.say('The village', '♪ Ember, ember, hold the night. Carry it up, and carry it bright ♪', SONG);
    this.shot(v(19.5, 2.1, 44.6), v(20, 1.5, 35.5), 46, true);
    P.anim = { name: 'dance' };
    await ui.say(P.hero.name, '(I had forgotten these steps. My feet had not.)', P.hero.color);
    this.shot(v(18.6, 1.7, 36.2), v(13.9, 1.0, 32.9), 40, true);
    await ui.say('Chef Hinode', 'Ale for the Lamplighter! The first cup is free. The second cup is also free. I am a terrible businessman.', CHEF);
    ui.toast('Kanpai!', 2);
    this.shot(v(18.0, 1.6, 34.6), v(13.9, 1.1, 33.2), 38);
    await ui.say('Chef Hinode', 'You are asleep on your feet. Sayo keeps Inn Hotaru, right across the street from my stall. Ten copper, a hot bath and a real futon. Go.', CHEF);
    P.anim = { name: 'idle' };
    this.release();
    this.setPhase('inn');
  }

  // ------------------------------------------------------------ the inn: book, bathe, sleep (all done by hand)
  async bookRoom() {
    const G = this.G, P = G.player, ui = G.ui, K = G.cast.keeper;
    this.hold();
    P.pos.set(13.2, 0, 53); P.yaw = Math.PI / 2; P.anim = { name: 'idle' };
    this.shot(v(11.0, 2.0, 49.6), v(15.2, 1.4, 53), 42, true);
    await ui.say(K.name, 'The one who sent the Moths running! You look worse than they did. One night is ten copper. The bath is hot and the futon is aired.', K.color);
    ui.wallet(G.state.coins - 10, G.state.coins); G.state.coins -= 10; G.audio.play('coins');
    await G.wait(2.8);
    ui.coins(G.state.coins);
    this.shot(v(14.6, 1.6, 51.4), v(13.2, 1.5, 53), 34, true);
    await ui.say(P.hero.name, 'Two copper. This will not even get me a ramen tomorrow. And ramen is the best and most affordable thing in the world.', P.hero.color);
    ui.walletClose();
    this.shot(v(11.0, 2.0, 49.6), v(15.2, 1.4, 53), 42, true);
    await ui.say(K.name, 'Your room is through the doorway past my counter. The bath is the next door along. Sleep well, Lamplighter.', K.color);
    this.release();
    this.setPhase('bath');
  }

  async bathe() {
    const G = this.G, P = G.player, ui = G.ui;
    this.busy = true; P.locked = true; ui.prompt(null);
    await ui.fade(true);
    ui.cine(true);
    P.pos.set(23.5, 0.1, 57.3); P.yaw = Math.atan2(20.4 - 23.5, 55.3 - 57.3); P.anim = { name: 'soak' };
    G.audio.play('splash');
    this.shot(v(20.6, 2.2, 55.4), v(23.5, 1.25, 57.3), 40, true);
    this.shot(v(20.2, 2.5, 55.9), v(23.5, 1.25, 57.3), 36);
    await ui.fade(false);
    for (let i = 0; i < 6; i++) { await G.wait(0.45); G.fx.burst(v(23.5 + (Math.random() - 0.5) * 2, 1.1, 57.3 + (Math.random() - 0.5) * 2), 3, { normal: true, color: 0xffffff, speed: 0.5, up: 1.1, life: 1.6, size: 0.4, size1: 1.2, alpha: 0.22 }); }
    await ui.say(P.hero.name, '(Three weeks of road, coming off in one bath.)', P.hero.color);
    P.hp = P.maxHp; P.ki = P.maxKi;
    await ui.fade(true);
    P.pos.set(21.2, 0, 56.2); P.yaw = Math.PI; P.anim = { name: 'idle' };
    this.setPhase('sleep');
    this.release();
    await ui.fade(false);
    ui.toast('Clean and rested: health and ki restored', 3);
  }

  async sleep() {
    const G = this.G, P = G.player, ui = G.ui;
    this.busy = true; P.locked = true; ui.prompt(null);
    await ui.fade(true);
    ui.cine(true);
    G.audio.play('door');
    P.pos.set(23.2, 0.14, 50.35); P.yaw = 0; P.anim = { name: 'down' };
    this.shot(v(25.6, 2.7, 52.9), v(23.2, 0.3, 50), 44, true);
    this.shot(v(25.3, 3.0, 52.6), v(23.2, 0.3, 50), 40);
    await ui.fade(false);
    await ui.say(P.hero.name, '(Go and master both jutsu, she said. Tomorrow. First I need work.)', P.hero.color);
    await G.wait(1.2);
    await ui.fade(true);
    this.morning();
    P.pos.set(21.4, 0, 50); P.yaw = -Math.PI / 2; P.anim = { name: 'idle' };
    this.shot(v(18.4, 2.0, 47.6), v(21.4, 1.4, 50), 40, true);
    ui.card('THE NEXT MORNING', 'Two copper to your name', 3.2);
    await ui.fade(false);
    await G.wait(2.6);
    this.release();
    this.setPhase('morning');
  }

  // Daylight, the festival packed away, the class at its desks.
  morning() {
    const G = this.G, N = G.cast, D = G.world.town.desks;
    this.setFestival(false);
    G.env.setLook('golden', true); G.ui.lookName('Morning');
    for (const n of G.villagers) { n.hidden = false; n.cheer = false; }
    N.teacher.hidden = false; N.teacher.stage = { at: [POI.teacher.x, POI.teacher.y, POI.teacher.z], yaw: Math.PI, anim: { name: 'idle' } };
    [0, 1, 2, 4, 6].forEach((d, i) => { const k = N.kids[i]; k.hidden = false; k.stage = { at: [D[d].x, D[d].z], yaw: 0, anim: { name: 'sit' } }; });
    N.satoru.hidden = true; N.satoru.stage = null;
  }

  async meetSatoru() {
    const G = this.G, P = G.player, ui = G.ui, S = G.cast.satoru;
    this.hold();
    P.anim = { name: 'idle' };
    S.hidden = false; S.stage = null; S.follow = null; S.pos.set(1.5, 0, P.pos.z - 17);
    P.yaw = Math.atan2(S.pos.x - P.pos.x, S.pos.z - P.pos.z);
    this.shot(v(P.pos.x + 3.6, 1.5, P.pos.z + 2.6), v(P.pos.x - 0.6, 1.1, P.pos.z - 2.5), 40, true);
    const run = S.walkTo(P.pos.x - 0.4, P.pos.z - 1.9, 11);
    await ui.say('???', 'Hey! HEY! Wait! Lamplighter!', S.color);
    await run;
    S.follow = P; S.anim = { name: 'wave' };
    await ui.say('Satoru', 'It IS you! You beat the Pale Moths! My big brother Ito says you two shared a desk at the academy.', S.color);
    this.shot(v(P.pos.x - 2.2, 1.5, P.pos.z - 3.6), v(P.pos.x, 1.45, P.pos.z), 34, true);
    await ui.say(P.hero.name, 'Ito\'s little brother. You were about this tall when I left.', P.hero.color);
    this.shot(v(P.pos.x + 2.0, 1.2, P.pos.z + 0.6), v(S.pos.x, 0.9, S.pos.z), 32, true);
    S.anim = { name: 'cheer' };
    await ui.say('Satoru', 'I am Satoru! Sensei says a graduate has to visit before they leave again. Come to the academy. Please! The whole class is waiting.', S.color);
    await ui.say(P.hero.name, '(Work can wait an hour. Two copper is not going to get any smaller.)', P.hero.color);
    S.anim = { name: 'idle' };
    this.release();
    this.setPhase('academy');
  }

  async lesson() {
    const G = this.G, P = G.player, ui = G.ui, N = G.cast, S = N.satoru, T = N.teacher, D = G.world.town.desks;
    this.busy = true; P.locked = true; ui.prompt(null);
    await ui.fade(true);
    ui.cine(true);
    S.hidden = false; S.follow = null; S.walk = null; S.stage = { at: [D[9].x, D[9].z], yaw: 0, anim: { name: 'sit' } };
    P.pos.set(POI.seat.x, 0, POI.seat.z); P.yaw = 0; P.anim = { name: 'sit' };
    const teach = (name) => { T.stage.anim = { name }; };
    this.shot(v(68.6, 2.7, -16.6), v(60, 2.0, -6.5), 46, true);
    this.shot(v(67.6, 2.5, -16.2), v(60, 2.0, -6.5), 44);
    await ui.fade(false);
    await ui.say(T.name, 'Sit, sit. Class, we have a graduate with us today. Five years at that very desk, with Ito beside them, passing notes.', T.color);
    teach('point');
    this.shot(v(64.2, 2.2, -12.4), v(61.2, 2.45, -5.3), 42, true);
    await ui.say(T.name, 'So we review what every first-year must know. Six elements move through the world.', T.color);
    await ui.say(T.name, 'Water mends, and wears stone away. Earth holds and shelters. Air moves first. Fire drives forward. Space is intuition: the blessing nobody can train for.', T.color);
    teach('idle');
    this.shot(v(62.6, 1.8, -9.4), v(60, 1.75, -7.2), 34, true);
    await ui.say(T.name, 'Each of you was born holding one of these, or two. Hand signs only shape what you already carry. That is why a jutsu of your own element always costs you less.', T.color);
    this.shot(v(55.6, 1.2, -11.6), v(58, 0.85, -14.9), 36, true);
    await ui.say('Satoru', 'Sensei, what about the sixth one? The circle in the middle?', S.color);
    this.shot(v(61.6, 1.75, -9.6), v(60, 1.75, -7.2), 30, true);
    await ui.say(T.name, 'Ether. It does not use the world. It rewrites it. Nobody in Kagaribi has ever held it. There are only stories: a white cloak, far to the north.', T.color);
    this.shot(v(64.4, 1.3, -12.9), v(66, 1.2, -14.95), 30, true);
    await ui.say(P.hero.name, '(A white cloak. So the fox was not only a dream.)', P.hero.color);
    this.shot(v(68.6, 2.7, -16.6), v(60, 2.0, -6.5), 46, true);
    await ui.say(T.name, 'Enough chalk. Graduate, the training ground is across the road. Show them what the signs are for.', T.color);
    await ui.fade(true);
    this.toGround();
    P.pos.set(60, 0, -39); P.yaw = Math.PI; P.anim = { name: 'idle' }; P.ki = P.maxKi;
    this.release();
    this.shown = 0;
    this.setPhase('showcase');
    await ui.fade(false);
    ui.toast('Press V and weave any three jutsu on the training posts', 4.5);
  }

  // The class lines up along the south edge of the training ground to watch.
  toGround() {
    const N = this.G.cast, watch = () => ({ name: this.cheerT > 0 ? 'cheer' : 'idle' });
    [...N.kids, N.satoru].forEach((k, i) => { k.hidden = false; k.stage = null; k.follow = null; k.pos.set(53.5 + i * 2.5, 0, -33.6); k.yaw = Math.PI; k.anim = watch; });
    N.teacher.stage = null; N.teacher.pos.set(69.5, 0, -34.2); N.teacher.yaw = Math.PI - 0.3; N.teacher.anim = { name: 'arms' };
  }

  // Called by the jutsu system every time a jutsu is cast.
  onCast() {
    if (this.phase !== 'showcase' || this.busy) return;
    this.shown++; this.cheerT = 2.6;
    this.G.ui.objective(this.objectiveFor());
    this.G.ui.toast(['', 'The class gasps', 'Satoru is yelling something about pandas', 'The whole class is on its feet'][Math.min(3, this.shown)], 2.4);
    if (this.shown === 3) { this.busy = true; this.G.wait(3.4).then(() => this.farewell()); }
  }

  async farewell() {
    const G = this.G, P = G.player, ui = G.ui, N = G.cast;
    this.hold(); this.cheerT = 30;
    if (G.weave.focus) G.weave.close();
    P.setState('free'); P.pos.set(60, 0, -37.6); P.yaw = 0; P.anim = { name: 'idle' };
    this.shot(v(63.6, 1.6, -40.6), v(60, 1.0, -34.6), 46, true);
    await ui.say(N.teacher.name, 'That, children, is five years of homework.', N.teacher.color);
    this.shot(v(59.2, 1.0, -36.2), v(N.satoru.pos.x, 0.9, N.satoru.pos.z), 34, true);
    await ui.say('Satoru', 'Teach me the panda one! Please! I will tell Ito I learned it first!', N.satoru.color);
    this.shot(v(58.4, 1.5, -35.4), v(60, 1.5, -37.6), 32, true);
    await ui.say(P.hero.name, 'Ask me again when you can reach your own headband.', P.hero.color);
    await ui.say(P.hero.name, 'I have a long road north and two copper to walk it on. First, I need work.', P.hero.color);
    this.cheerT = 0;
    this.shot(v(63.6, 1.6, -40.6), v(66, 1.3, -34.6), 40, true);
    await ui.say(N.teacher.name, 'The job board by the bridge always wants hands. And this door is always open to you.', N.teacher.color);
    this.shot(v(60, 9, -58), v(60, 1, -30), 46);
    ui.card('CHAPTER ONE', 'The road to the Ether valley begins', 4.6);
    await G.wait(4.8);
    this.release();
    this.setPhase('free');
  }

  // Load a saved checkpoint: put the world in the state that story step starts from.
  restore(cp) {
    const G = this.G, P = G.player, ui = G.ui, ph = cp.phase;
    G.audio.play('music_village'); G.audio.play('amb_village');
    G.state.coins = cp.coins; G.save.paused = true;
    if (ph === 'explore') this.setPhase('explore');
    else if (ph === 'omen') {
      G.env.setLook('omen', true); G.state.omen = true; ui.lookName('Ill omen');
      for (const n of G.villagers) n.hidden = true;
      G.placeRogues(); for (const r of G.rogues) r.char.root.visible = true;
      P.pos.set(0, 0, -8); this.setPhase('omen');
    } else if (ph === 'beacon') { G.env.setLook('dusk', true); ui.lookName('Dusk'); P.pos.set(0, 0, -30); this.setPhase('beacon'); }
    else if (ph === 'bath' || ph === 'sleep') { this.jump('inn'); P.pos.set(13, 0, 49.5); this.setPhase(ph); }
    else if (ph === 'free') { this.jump('morning'); this.setPhase('free'); }
    else this.jump(ph);
    G.state.coins = cp.coins; ui.coins(cp.coins);
    G.save.paused = false; G.save.add(ph, P.hero.id, cp.coins);
    G.cam.yaw = P.yaw + Math.PI;
    ui.toast('Loaded: ' + ui.checkpointName(ph), 3);
  }

  // Jump links (play.html#festival and so on), for testing and for filming one scene.
  jump(name) {
    const G = this.G, P = G.player, ui = G.ui;
    const night = () => { G.env.setLook('night', true); ui.lookName('Night'); this.litBeacon(); this.setFestival(true); };
    ui.coins(G.state.coins);
    if (name === 'dream') { this.hold(); G.dream.play().then(async () => { await ui.fade(false); this.release(); this.setPhase('explore'); }); }
    else if (name === 'festival') { night(); P.pos.set(6, 0, 46); this.setPhase('festival'); }
    else if (name === 'inn') { night(); P.pos.set(4, 0, 53); P.yaw = Math.PI / 2; this.setPhase('inn'); }
    else if (name === 'morning' || name === 'academy' || name === 'showcase') {
      this.litBeacon(); this.morning(); G.state.coins = 2; ui.coins(2);
      if (name === 'morning') { P.pos.set(4, 0, 53); this.setPhase('morning'); }
      else if (name === 'academy') { const S = G.cast.satoru; S.hidden = false; S.pos.set(58, 0, -24); S.follow = P; P.pos.set(60, 0, -24); P.yaw = 0; this.setPhase('academy'); }
      else { this.toGround(); P.pos.set(60, 0, -39); this.shown = 0; this.setPhase('showcase'); }
    } else return false;
    G.cam.yaw = P.yaw + Math.PI;
    return true;
  }

  // Called every frame: decides what the E key does right now.
  update(dt = 0) {
    const G = this.G, P = G.player, ui = G.ui;
    this.cheerT -= dt;
    if (this.busy || !P || this.phase === 'title') return;
    if (this.training) { P.ki = P.maxKi; ui.prompt(null); return; } // nothing in the story moves while you train
    let prompt = null, act = null;
    const near = (p, r) => Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < r;
    const low = P.grounded && P.pos.y < 0.5, ph = this.phase;

    if (ph === 'omen' && near(POI.arena, 16)) { this.duel(); return; }
    if (ph === 'duel') { ui.prompt(null); return; }
    if (ph === 'festival' && near(POI.bonfire, 10.5) && low) { this.festival(); return; }
    if (ph === 'morning' && near(POI.jobBoard, 13) && low) { this.meetSatoru(); return; }

    if (ph === 'inn' && near(POI.innDesk, 2.4) && low) { prompt = 'Book a room (10 copper)'; act = () => this.bookRoom(); }
    else if ((ph === 'bath' || ph === 'sleep') && near(POI.bath, 3.3) && low) { prompt = ph === 'bath' ? 'Take a bath' : null; act = ph === 'bath' ? () => this.bathe() : null; }
    else if ((ph === 'bath' || ph === 'sleep') && near(POI.futon, 2.5) && low) { prompt = ph === 'bath' ? 'Sleep (bath first)' : 'Sleep'; act = ph === 'bath' ? () => this.think('(Not like this. Bath first.)') : () => this.sleep(); }
    else if (ph === 'free' && near(POI.jobBoard, 3) && low) { prompt = G.jobs.active ? 'Job board (you are on a job)' : 'Read the job board'; act = () => this.board(); }
    else if (ph === 'free' && near(POI.innDesk, 2.4) && low) { prompt = G.state.coins >= 10 ? 'Book a room for the night (10 copper)' : 'Talk'; act = () => (G.state.coins >= 10 ? this.restNight() : this.think('Ten copper a night, whenever you have it. The job board is always hiring.', G.cast.keeper.name, G.cast.keeper.color)); }
    else if (ph === 'academy' && near(POI.seat, 2.3) && low) { prompt = 'Take your seat for the class'; act = () => this.lesson(); }
    else if ((ph === 'explore' || ph === 'free' || ph === 'beacon') && near(POI.ramenSeat, 2.6) && low) {
      prompt = ph === 'explore' ? 'Sit down and eat' : 'Another bowl'; act = () => (ph === 'explore' ? this.eat() : this.snack());
    } else if (ph === 'beacon' && P.pos.y > G.world.beaconTopY - 0.5 && near(POI.beacon, 5)) {
      prompt = 'Light the beacon'; act = () => this.lightBeacon();
    } else {
      for (const n of G.npcs) if (n.line && !n.hidden && !n.stage?.orbit && near(n.pos, 2.6) && Math.abs(P.pos.y - n.pos.y) < 1.5) { prompt = 'Talk'; act = () => this.think(typeof n.line === 'function' ? n.line(ph) : n.line, n.name, n.color); break; }
      if (!prompt) for (const n of G.villagers) if (!n.hidden && !n.stage?.orbit && near(n.pos, 2.6) && Math.abs(P.pos.y - n.pos.y) < 1.5) { prompt = 'Talk'; act = () => this.talk(n); break; }
    }
    ui.prompt(prompt);
    if (act && G.input.hit('interact')) act();
  }

  // ------------------------------------------------------------ free roam: training, the job board, a paid night
  // Z, at any quiet moment: jump to the training ground and back. Ki never runs out while training.
  async train() {
    const G = this.G, P = G.player, ui = G.ui;
    if (this.busy) return;
    if (!this.training && (G.arena.active || ['duel', 'showcase', 'title'].includes(this.phase) || G.isCine())) { ui.toast('Not now. Training is closed during a fight or a showcase'); return; }
    if (!this.training && G.jobs.active) { ui.toast('Finish the job first, or drop it at the job board'); return; }
    this.busy = true; P.locked = true; ui.prompt(null);
    if (G.weave.focus) G.weave.close();
    await ui.fade(true);
    G.audio.play('door');
    if (!this.training) {
      this.trainBack = { pos: P.pos.clone(), yaw: P.yaw };
      P.pos.set(POI.training.x, 0, POI.training.z + 8); P.yaw = Math.PI;
      this.training = true;
      ui.objective(G.input.touch ? 'Training ground. Ki never runs out here. Tap Leave training (top) to go back' : 'Training ground. Ki never runs out here. V weaves a jutsu, Z goes back');
    } else {
      P.pos.copy(this.trainBack.pos); P.yaw = this.trainBack.yaw;
      this.training = false;
      this.setPhase(this.phase);
    }
    P.vel.set(0, 0, 0); P.setState('free'); P.anim = { name: 'idle' }; P.hp = P.maxHp; P.ki = P.maxKi;
    P.locked = false; this.busy = false; G.cam.yaw = P.yaw + Math.PI;
    await ui.fade(false);
    if (this.training) ui.toast('Training: every jutsu you know, as often as you like', 3.5);
  }

  async board() {
    const G = this.G, P = G.player;
    this.busy = true; P.locked = true; P.anim = { name: 'idle' }; G.ui.prompt(null);
    await G.jobs.offer();
    P.locked = false; this.busy = false;
  }

  // Paying for a night once you have coin again: sleep, wake up rested in the morning.
  async restNight() {
    const G = this.G, P = G.player, ui = G.ui;
    this.hold();
    G.state.coins -= 10; ui.coins(G.state.coins); G.audio.play('coins');
    await ui.say(G.cast.keeper.name, 'Ten copper, thank you. Same room. The futon missed you.', G.cast.keeper.color);
    await ui.fade(true);
    G.audio.play('door');
    P.pos.set(23.2, 0.14, 50.35); P.yaw = 0; P.anim = { name: 'down' };
    this.shot(v(25.6, 2.7, 52.9), v(23.2, 0.3, 50), 44, true);
    G.env.setLook('night', true);
    await ui.fade(false);
    await G.wait(2.2);
    await ui.fade(true);
    G.env.setLook('golden', true); ui.lookName('Morning');
    P.pos.set(21.4, 0, 50); P.yaw = -Math.PI / 2; P.anim = { name: 'idle' }; P.hp = P.maxHp; P.ki = P.maxKi; P.fed = 120;
    this.shot(v(18.4, 2.0, 47.6), v(21.4, 1.4, 50), 40, true);
    await ui.fade(false);
    ui.toast('Rested: health restored, ki recovers faster', 3);
    await G.wait(1.2);
    this.release();
  }

  // One line of dialogue with no camera change (the hero thinking, or a short chat).
  async think(text, who, color) {
    const G = this.G, P = G.player;
    this.busy = true; P.locked = true; P.anim = { name: 'idle' }; G.ui.prompt(null);
    await G.ui.say(who || P.hero.name, text, color ?? P.hero.color);
    P.locked = false; this.busy = false;
  }

  talk(n) {
    const ph = this.phase;
    const line = ph === 'beacon' ? 'You sent them running! Go on, the beacon. The whole village is watching the pagoda.'
      : ph === 'festival' || ph === 'inn' || ph === 'bath' || ph === 'sleep' ? (n.stage ? 'Two hundred years we have played this one. Stay for the next verse!' : 'Best beacon in years. Are you coming down to the fire?')
      : ph === 'morning' || ph === 'academy' || ph === 'showcase' ? 'My head. Whose idea was the third barrel? ...It was mine.'
      : ph === 'free' ? 'Best beacon in years. And the fireworks! Who paid for the fireworks?' : n.line;
    return this.think(line, 'Villager', 0xf6ecd9);
  }

  async snack() {
    const G = this.G, P = G.player;
    this.busy = true; P.locked = true; G.ui.prompt(null);
    const pays = this.phase === 'free' && G.state.coins >= 3;
    if (pays) { G.state.coins -= 3; G.ui.coins(G.state.coins); G.audio.play('coins'); }
    await G.ui.say('Chef Hinode', pays ? 'Three copper. Extra egg, because you earned it.' : this.phase === 'free' ? 'No coin? Put that purse away, you are embarrassing both of us. This one is on the house.' : 'Back already? Good. Heroes are bad for business unless they are hungry.', CHEF);
    G.audio.play('slurp');
    P.hp = P.maxHp; P.ki = P.maxKi; P.fed = 120;
    G.ui.toast('Well fed: health restored, ki recovers faster', 3);
    P.locked = false; this.busy = false;
  }
}
