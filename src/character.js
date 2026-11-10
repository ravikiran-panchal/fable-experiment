import * as THREE from 'three';
import { toon, damp, clamp, lerp, TAU, RAMP } from './util.js';

// Procedural anime-style figure: built from primitives, animated by code. No rigs or model files.
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x15121a, side: THREE.BackSide });
const G = {
  capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 7),
};
const geoCache = {};
const cap = (r, len) => (geoCache[r + '_' + len] ||= G.capsule(r, len));

function part(geo, mat, outline = 0.035) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.userData.outline = true;
    geo.computeBoundingSphere();
    const k = 1 + outline / Math.max(0.08, geo.boundingSphere.radius);
    o.scale.setScalar(k);
    m.add(o);
  }
  return m;
}

function faceTexture(spec) {
  const S = 256, cv = document.createElement('canvas');
  cv.width = S * 2; cv.height = S;
  const g = cv.getContext('2d');
  const skin = '#' + new THREE.Color(spec.skin).getHexString();
  g.fillStyle = skin; g.fillRect(0, 0, S * 2, S);
  const cx = S; // u = 0.5 is the front of the head once the mesh is turned
  const eyeY = S * 0.55, dx = 44;
  if (spec.mask) { g.fillStyle = spec.mask; g.fillRect(0, eyeY + 20, S * 2, S); }
  for (const s of [-1, 1]) {
    const x = cx + s * dx;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, eyeY, 19, spec.stern ? 15 : 22, 0, 0, TAU); g.fill();
    g.fillStyle = spec.eye; g.beginPath(); g.ellipse(x + s * -2, eyeY + 2, 12, spec.stern ? 13 : 17, 0, 0, TAU); g.fill();
    g.fillStyle = '#16121c'; g.beginPath(); g.ellipse(x + s * -2, eyeY + 3, 6, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 6, eyeY - 7, 4.5, 0, TAU); g.fill();
    g.strokeStyle = '#16121c'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 21, eyeY - (spec.stern ? 10 : 15)); g.quadraticCurveTo(x, eyeY - (spec.stern ? 19 : 27), x + 21, eyeY - (spec.stern ? 10 : 15)); g.stroke();
    g.strokeStyle = spec.brow || '#2a2028'; g.lineWidth = 7;
    const tilt = spec.stern ? 9 : (spec.fierce ? 6 : -2);
    g.beginPath(); g.moveTo(x - s * 20, eyeY - 36 + tilt * 0.2); g.lineTo(x + s * 18, eyeY - 36 - tilt * -1); g.stroke();
  }
  if (!spec.mask) {
    g.strokeStyle = '#7a3b34'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath();
    if (spec.grin) { g.moveTo(cx - 16, eyeY + 46); g.quadraticCurveTo(cx, eyeY + 60, cx + 16, eyeY + 46); }
    else { g.moveTo(cx - 9, eyeY + 50); g.lineTo(cx + 9, eyeY + 50); }
    g.stroke();
    g.fillStyle = 'rgba(255,120,120,0.28)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 62, eyeY + 30, 14, 8, 0, 0, TAU); g.fill(); }
  }
  if (spec.mark) { g.strokeStyle = spec.mark; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 30, eyeY - 44); g.lineTo(cx + 52, eyeY + 44); g.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCharacter(spec) {
  const s = { skin: 0xf2c9a4, eye: '#3a6fd8', hair: 0x2a2028, top: 0x444444, pants: 0x222222, accent: 0xffffff, hairStyle: 'spiky', scale: 1, ...spec };
  const root = new THREE.Group();
  const mats = {
    skin: toon(s.skin), hair: toon(s.hair), top: toon(s.top), pants: toon(s.pants), accent: toon(s.accent),
    dark: toon(0x23202a), metal: toon(0xc9d2dc), face: new THREE.MeshToonMaterial({ map: faceTexture(s), gradientMap: RAMP }),
  };
  const J = {}; // joints
  const piv = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  J.body = piv(root, 0, 0.92, 0);         // hips
  J.spine = piv(J.body, 0, 0.08, 0);
  const torso = part(cap(0.2, 0.3), mats.top); torso.position.y = 0.27; torso.scale.set(1.08, 1, 0.8); J.spine.add(torso);
  const belt = part(cap(0.2, 0.02), mats.accent, 0); belt.position.y = 0.03; belt.scale.set(1.14, 0.5, 0.86); J.spine.add(belt);
  const hipsM = part(cap(0.19, 0.06), mats.pants); hipsM.position.y = -0.05; hipsM.scale.set(1.05, 0.8, 0.8); J.body.add(hipsM);

  J.head = piv(J.spine, 0, 0.66, 0); J.head.scale.setScalar(1.14);
  const head = part(G.sphere, mats.face, 0.03); head.scale.set(0.235, 0.25, 0.235); head.position.y = 0.2; head.rotation.y = -Math.PI / 2; J.head.add(head);
  const neck = part(cap(0.07, 0.06), mats.skin, 0); neck.position.y = 0.0; J.head.add(neck);

  // hair
  const hair = new THREE.Group(); hair.position.y = 0.2; J.head.add(hair);
  const capGeo = new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI * 0.52);
  const hc = part(capGeo, mats.hair, 0.02); hc.scale.set(0.252, 0.265, 0.252); hc.rotation.x = -0.32; hair.add(hc);
  const spike = (x, y, z, rx, rz, len, w = 0.07) => { const c = part(G.cone, mats.hair, 0.02); c.scale.set(w, len, w); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); hair.add(c); return c; };
  if (s.hairStyle === 'spiky') {
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; spike(Math.cos(a) * 0.17, 0.17, Math.sin(a) * 0.17 - 0.03, Math.sin(a) * 0.9 - 0.3, -Math.cos(a) * 0.9, 0.26, 0.085); }
    spike(0, 0.26, -0.02, -0.3, 0, 0.26, 0.09);
    for (const x of [-0.12, 0, 0.12]) spike(x, 0.1, 0.21, Math.PI - 0.5, x * -2, 0.15, 0.055);
  } else if (s.hairStyle === 'tail') {
    for (const x of [-0.14, -0.05, 0.05, 0.14]) spike(x, 0.09, 0.2, Math.PI - 0.35, x * -1.5, 0.18, 0.06);
    J.tail = piv(hair, 0, 0.2, -0.16);
    const t1 = part(cap(0.055, 0.42), mats.hair, 0.02); t1.position.y = -0.2; t1.position.z = -0.08; t1.rotation.x = 0.5; J.tail.add(t1);
    const tie = part(G.sphere, mats.accent, 0); tie.scale.setScalar(0.06); J.tail.add(tie);
  } else if (s.hairStyle === 'bun') {
    const bun = part(G.sphere, mats.hair, 0.02); bun.scale.setScalar(0.1); bun.position.set(0, 0.24, -0.1); hair.add(bun);
    for (const x of [-0.15, 0.15]) spike(x, 0.02, 0.17, Math.PI - 0.15, x * -0.6, 0.24, 0.045);
  } else if (s.hairStyle === 'long') {
    const back = part(cap(0.17, 0.3), mats.hair, 0.02); back.position.set(0, -0.14, -0.1); back.scale.set(1.1, 1, 0.6); hair.add(back);
    for (const x of [-0.16, 0.16]) spike(x, -0.02, 0.15, Math.PI - 0.1, x * -0.4, 0.34, 0.05);
    spike(0.05, 0.1, 0.22, Math.PI - 0.5, -0.3, 0.16, 0.06);
  } else if (s.hairStyle === 'wild') {
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; spike(Math.cos(a) * 0.2, 0.08 + (i % 2) * 0.07, Math.sin(a) * 0.2 - 0.04, Math.sin(a) * 1.3 - 0.2, -Math.cos(a) * 1.3, 0.34, 0.1); }
    spike(0, 0.26, 0, 0, 0, 0.3, 0.11);
  }
  if (s.headband) { const hb = part(new THREE.CylinderGeometry(0.243, 0.243, 0.07, 18, 1, true), mats.accent, 0); hb.position.y = 0.285; hb.material.side = THREE.DoubleSide; J.head.add(hb); }
  if (s.hat) { // wide travelling hood for the rogues
    const hood = part(new THREE.SphereGeometry(1, 14, 10, 0, TAU, 0, Math.PI * 0.6), mats.top, 0.02); hood.scale.set(0.3, 0.3, 0.3); hood.position.set(0, 0.2, -0.03); hood.rotation.x = -0.45; J.head.add(hood);
  }

  // arms
  const arm = (side) => {
    const sh = piv(J.spine, side * 0.27, 0.5, 0);
    const up = part(cap(0.068, 0.2), s.sleeve === false ? mats.skin : mats.top); up.position.y = -0.15; sh.add(up);
    const el = piv(sh, 0, -0.31, 0);
    const lo = part(cap(0.06, 0.18), s.bracer ? mats.accent : mats.skin); lo.position.y = -0.13; el.add(lo);
    const hand = part(G.sphere, mats.skin, 0.015); hand.scale.setScalar(0.068); hand.position.y = -0.29; el.add(hand);
    return [sh, el, hand];
  };
  [J.shL, J.elL, J.handL] = arm(1);
  [J.shR, J.elR, J.handR] = arm(-1);

  // legs
  const leg = (side) => {
    const hp = piv(J.body, side * 0.115, -0.06, 0);
    const th = part(cap(0.085, 0.24), mats.pants); th.position.y = -0.2; hp.add(th);
    const kn = piv(hp, 0, -0.42, 0);
    const shn = part(cap(0.07, 0.22), mats.pants); shn.position.y = -0.17; kn.add(shn);
    const wrap = part(cap(0.075, 0.06), mats.accent, 0); wrap.position.y = -0.27; kn.add(wrap);
    const foot = part(cap(0.065, 0.1), mats.dark); foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.4, 0.06); kn.add(foot);
    return [hp, kn];
  };
  [J.hipL, J.knL] = leg(1);
  [J.hipR, J.knR] = leg(-1);

  // extras
  if (s.scarf) {
    const sm = toon(s.scarf, { side: THREE.DoubleSide });
    const ring = part(new THREE.TorusGeometry(0.13, 0.055, 8, 14), sm, 0.02); ring.rotation.x = Math.PI / 2; ring.position.y = 0.63; J.spine.add(ring);
    J.scarf = [];
    let parent = piv(J.spine, 0.06, 0.62, -0.14);
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.15 - i * 0.015, 0.24).translate(0, -0.12, 0), sm);
      seg.castShadow = true;
      parent.add(seg); J.scarf.push(parent);
      const next = piv(parent, 0, -0.23, 0); parent = next;
    }
  }
  if (s.cloak) {
    const cm = toon(s.cloak, { side: THREE.DoubleSide });
    const cl = part(new THREE.CylinderGeometry(0.26, 0.5, 1.15, 14, 1, true), cm, 0.02); cl.position.y = 0.02; J.spine.add(cl);
    const col = part(new THREE.CylinderGeometry(0.2, 0.25, 0.22, 14, 1, true), cm, 0.02); col.position.y = 0.68; J.spine.add(col);
    const em = part(G.sphere, toon(s.emblem || 0xe8e2d0), 0); em.scale.set(0.09, 0.12, 0.02); em.position.set(0, 0.32, 0.3); em.rotation.x = -0.2; J.spine.add(em);
    for (const sx of [-1, 1]) { const w = part(G.sphere, toon(s.emblem || 0xe8e2d0), 0); w.scale.set(0.1, 0.06, 0.02); w.position.set(sx * 0.11, 0.36, 0.29); w.rotation.set(-0.2, 0, sx * 0.5); J.spine.add(w); }
  }
  if (s.weapon === 'katana' || s.weapon === 'cleaver') {
    J.weapon = piv(J.elR, 0, -0.3, 0);
    const big = s.weapon === 'cleaver';
    const grip = part(cap(0.025, big ? 0.34 : 0.2), mats.dark, 0.01); grip.rotation.x = Math.PI / 2; J.weapon.add(grip);
    const blade = part(G.box, big ? toon(0x8a93a6) : mats.metal, 0.02);
    if (big) { blade.scale.set(0.07, 0.34, 1.5); blade.position.set(0, 0.06, 1.0); }
    else { blade.scale.set(0.02, 0.07, 1.0); blade.position.z = 0.65; }
    J.weapon.add(blade);
    const guard = part(G.box, mats.accent, 0); guard.scale.set(0.16, 0.16, 0.03); guard.position.z = big ? 0.24 : 0.14; J.weapon.add(guard);
    J.blade = blade;
  }

  root.scale.setScalar(s.scale);

  // ---- animation ----
  const pose = {}; // target rotations
  const names = ['body', 'spine', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR'];
  for (const n of names) pose[n] = new THREE.Vector3();
  const st = { t: Math.random() * 10, bodyY: 0, scarfV: 0 };

  function set(n, x = 0, y = 0, z = 0) { pose[n].set(x, y, z); }

  // anim: {name, p (0..1 progress for one-shots), speed (ground speed), run (0..1), air (bool)}
  function update(dt, a) {
    st.t += dt;
    const t = st.t;
    let bodyY = 0, rate = 16;
    for (const n of names) pose[n].set(0, 0, 0);
    const name = a.name || 'idle';

    if (name === 'idle') {
      const b = Math.sin(t * 2.2);
      set('spine', 0.03 + b * 0.015); set('shL', 0.05 + b * 0.03, 0, 0.12); set('shR', 0.05 - b * 0.03, 0, -0.12);
      set('elL', -0.18); set('elR', -0.18); set('head', -0.02 + b * 0.01);
      if (a.guard) { set('shL', -0.7, 0, 0.3); set('elL', -1.5); set('shR', -0.5, 0, -0.3); set('elR', -1.2); set('hipL', -0.25); set('hipR', 0.25); set('knR', 0.35); set('knL', 0.2); bodyY = -0.05; set('body', 0, -0.5); }
    } else if (name === 'move') {
      const sprint = a.run || 0, f = lerp(9.5, 15, sprint), ph = t * f, sw = lerp(0.75, 1.15, sprint);
      const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
      const lean = lerp(0.12, 0.62, sprint) * 0.75;
      set('hipL', -sL * sw - lean); set('hipR', -sR * sw - lean);
      set('knL', Math.max(0, Math.cos(ph)) * 1.5 + 0.15); set('knR', Math.max(0, Math.cos(ph + Math.PI)) * 1.5 + 0.15);
      set('body', lerp(0.12, 0.62, sprint), Math.sin(ph) * 0.08);
      set('spine', lerp(0.05, 0.0, sprint)); set('head', lerp(-0.1, -0.5, sprint));
      if (sprint > 0.5) { // the classic arms-back shinobi sprint
        set('shL', 1.25 + Math.sin(ph * 2) * 0.05, 0, 0.32); set('shR', 1.25 - Math.sin(ph * 2) * 0.05, 0, -0.32);
        set('elL', -0.12); set('elR', -0.12);
      } else {
        set('shL', sL * 0.9, 0, 0.12); set('shR', sR * 0.9, 0, -0.12); set('elL', -0.9); set('elR', -0.9);
      }
      bodyY = Math.abs(Math.cos(ph)) * 0.06 - 0.04 - sprint * 0.06;
      rate = 26;
    } else if (name === 'air') {
      const up = clamp((a.vy || 0) / 12, -1, 1);
      set('hipL', -0.9 - up * 0.3); set('knL', 1.5); set('hipR', -0.2 + up * 0.4); set('knR', 0.9 - up * 0.4);
      set('shL', 0.4, 0, 1.2 - up * 0.5); set('shR', 0.4, 0, -1.2 + up * 0.5); set('elL', -0.5); set('elR', -0.5);
      set('body', 0.25 - up * 0.2); set('head', -0.1);
    } else if (name === 'flip') {
      set('hipL', -1.9); set('knL', 2.2); set('hipR', -1.9); set('knR', 2.2); set('shL', -1.0, 0, 0.5); set('shR', -1.0, 0, -0.5); set('elL', -1.6); set('elR', -1.6);
      set('spine', 0.5); rate = 30;
    } else if (name === 'attack1' || name === 'attack2' || name === 'attack3') {
      const p = a.p, w = smoothstep(0, 0.25, p), s2 = smoothstep(0.25, 0.55, p);
      rate = 34;
      if (name === 'attack1') { // right hook / slash right to left
        set('body', 0.18, lerp(-0.7, 0.9, s2)); set('shR', lerp(-0.4, -1.5, s2), 0, lerp(-1.3, 0.5, s2)); set('elR', lerp(-1.6, -0.2, s2));
        set('shL', -0.5, 0, 0.5); set('elL', -1.7); set('hipL', -0.5); set('knL', 0.5); set('hipR', 0.35); set('knR', 0.3);
      } else if (name === 'attack2') { // left backhand
        set('body', 0.18, lerp(0.8, -0.9, s2)); set('shL', lerp(-0.4, -1.5, s2), 0, lerp(1.3, -0.5, s2)); set('elL', lerp(-1.6, -0.2, s2));
        set('shR', -0.5, 0, -0.5); set('elR', -1.7); set('hipR', -0.5); set('knR', 0.5); set('hipL', 0.35); set('knL', 0.3);
      } else { // spinning kick finisher
        set('body', 0.0, lerp(0, TAU, smoothstep(0.1, 0.7, p)), 0.0); set('spine', -0.25);
        set('hipR', lerp(0, -1.7, w), 0, 0); set('knR', lerp(1.2, 0.05, s2)); set('hipL', 0.1); set('knL', 0.25);
        set('shL', -0.3, 0, 1.3); set('shR', -0.3, 0, -1.3);
        rate = 40;
      }
      bodyY = -0.05;
    } else if (name === 'throw') {
      const s2 = smoothstep(0.1, 0.5, a.p);
      set('body', 0.1, lerp(-0.6, 0.6, s2)); set('shR', lerp(0.6, -1.7, s2), 0, -0.3); set('elR', lerp(-1.9, -0.1, s2)); set('shL', -0.6, 0, 0.4); set('elL', -1.2);
      set('hipL', -0.3); set('hipR', 0.3); set('knR', 0.3); rate = 34;
    } else if (name === 'dash') {
      set('body', 0.85); set('head', -0.7); set('shL', 1.4, 0, 0.3); set('shR', 1.4, 0, -0.3); set('hipL', -1.1); set('knL', 1.4); set('hipR', 0.6); set('knR', 0.5); bodyY = -0.22; rate = 40;
    } else if (name === 'charge') { // gathering energy in the right palm
      const j = Math.sin(t * 40) * 0.02;
      set('body', 0.2, -0.5); set('shR', -0.9 + j, 0, -0.2); set('elR', -1.1); set('shL', -1.1, 0, -0.5 + j); set('elL', -1.0);
      set('hipL', -0.6); set('knL', 0.9); set('hipR', 0.5); set('knR', 0.7); bodyY = -0.2; rate = 24;
    } else if (name === 'thrust') {
      set('body', 0.5, 0.5); set('shR', -1.6, 0, 0.1); set('elR', -0.05); set('shL', 1.0, 0, 0.3); set('hipL', -0.9); set('knL', 0.9); set('hipR', 0.7); set('knR', 0.2); bodyY = -0.15; rate = 40;
    } else if (name === 'slam') { // heavy overhead, p: windup -> strike
      const up = smoothstep(0, 0.6, a.p), down = smoothstep(0.62, 0.74, a.p);
      const armX = lerp(lerp(-0.5, -3.0, up), -0.9, down);
      set('shR', armX, 0, -0.15); set('shL', armX, 0, 0.5); set('elR', lerp(-0.6, -0.1, down)); set('elL', -0.8);
      set('body', lerp(lerp(0, -0.3, up), 0.6, down)); set('hipL', -0.4); set('knL', 0.6); set('hipR', 0.3); set('knR', 0.5); bodyY = lerp(0, -0.2, down); rate = 30;
    } else if (name === 'cast') {
      const s2 = smoothstep(0.3, 0.6, a.p);
      set('shR', lerp(-0.3, -1.5, s2), 0, -0.3); set('elR', lerp(-1.8, -0.1, s2)); set('shL', lerp(-0.3, -1.4, s2), 0, 0.3); set('elL', lerp(-1.8, -0.2, s2)); set('body', 0.05); rate = 26;
    } else if (name === 'hit') {
      set('body', -0.5); set('head', 0.3); set('shL', -0.4, 0, 0.9); set('shR', -0.4, 0, -0.9); set('hipL', -0.3); set('knL', 0.6); set('hipR', 0.2); set('knR', 0.4); rate = 40;
    } else if (name === 'kneel') {
      set('body', 0.45); set('head', 0.5); set('hipL', -1.5); set('knL', 1.6); set('hipR', 0.15); set('knR', 1.7); set('shL', 0.2, 0, 0.3); set('shR', -0.6, 0, -0.1); set('elR', -0.9); bodyY = -0.42; rate = 8;
    } else if (name === 'down') {
      set('body', -1.5); set('shL', 0, 0, 1.3); set('shR', 0, 0, -1.3); set('hipL', -0.1); set('hipR', 0.15); set('knL', 0.2); bodyY = -0.72; rate = 9;
    } else if (name === 'sit') { // at the ramen counter; p drives the chopsticks
      const e = Math.sin(t * 5.5) * 0.5 + 0.5;
      set('hipL', -1.45); set('knL', 1.5); set('hipR', -1.45); set('knR', 1.5);
      set('spine', 0.22 + (a.eating ? e * 0.14 : 0)); set('head', a.eating ? 0.25 + e * 0.15 : 0.05);
      if (a.eating) { set('shR', -1.0 - e * 0.35, 0, 0.1); set('elR', -1.5 - e * 0.5); set('shL', -0.75, 0, -0.2); set('elL', -1.0); }
      else { set('shR', -0.7, 0, 0); set('elR', -1.0); set('shL', -0.7, 0, 0); set('elL', -1.0); }
      bodyY = -0.21; rate = 12;
    } else if (name === 'cheer') {
      const b = Math.abs(Math.sin(t * 7));
      set('shL', -2.9, 0, 0.4); set('shR', -2.9, 0, -0.4); set('elL', -0.3); set('elR', -0.3); set('head', -0.3); bodyY = b * 0.12;
      set('hipL', -0.2); set('knL', 0.4); set('hipR', -0.2); set('knR', 0.4);
    } else if (name === 'arms') { // folded arms, patient menace
      set('shL', -0.75, 0, -0.5); set('elL', -1.75); set('shR', -0.75, 0, 0.5); set('elR', -1.75); set('head', 0.08); set('spine', -0.05);
    } else if (name === 'point') {
      set('shR', -1.5, 0, 0.05); set('elR', -0.05); set('shL', 0.1, 0, 0.15); set('body', 0, 0.3);
    } else if (name === 'cook') {
      const e = Math.sin(t * 6);
      set('shR', -1.0 + e * 0.15, 0, -0.2); set('elR', -1.1 - e * 0.25); set('shL', -0.8, 0, 0.3); set('elL', -1.2); set('spine', 0.15); set('head', 0.2);
    }

    if (name !== 'attack3' && J.body.rotation.y > Math.PI) J.body.rotation.y -= TAU; // finish the spin, do not unwind it
    if (name !== 'flip' && J.body.rotation.x > Math.PI) J.body.rotation.x -= TAU;
    const k = 1 - Math.exp(-rate * dt);
    for (const n of names) {
      const r = J[n].rotation, p = pose[n];
      r.x += (p.x - r.x) * k; r.y += (p.y - r.y) * k; r.z += (p.z - r.z) * k;
    }
    st.bodyY += (bodyY - st.bodyY) * k;
    J.body.position.y = 0.92 + st.bodyY;

    // cloth follow-through
    const speed = a.speed || 0;
    if (J.scarf) {
      const lift = clamp(speed / 13, 0, 1);
      J.scarf.forEach((seg, i) => {
        const wave = Math.sin(t * (6 + lift * 10) - i * 0.9) * (0.12 + lift * 0.22);
        seg.rotation.x = damp(seg.rotation.x, (i === 0 ? 0.25 + lift * 1.25 - J.body.rotation.x : 0.08 * (1 - lift)) + wave, 10, dt);
        seg.rotation.z = Math.sin(t * 4 + i) * 0.1;
      });
    }
    if (J.tail) J.tail.rotation.x = damp(J.tail.rotation.x, clamp(speed / 13, 0, 1) * 1.1 + Math.sin(t * 7) * 0.08, 10, dt);
  }

  function smoothstep(a, b, x) { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }

  // White flash when struck.
  const flashMats = [mats.skin, mats.top, mats.pants, mats.hair, mats.accent, mats.face];
  function flash(v, color = 0xffffff) { for (const m of flashMats) { m.emissive.set(color); m.emissiveIntensity = v; } }

  return { root, J, mats, update, flash, spec: s };
}

// A translucent copy left behind during fast moves.
export function makeGhost(char, color, opacity = 0.55) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  char.root.updateMatrixWorld(true);
  const g = new THREE.Group();
  char.root.traverse((o) => {
    if (o.isMesh && !o.userData.outline) {
      const m = new THREE.Mesh(o.geometry, mat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(o.matrixWorld);
      g.add(m);
    }
  });
  g.userData.mat = mat;
  return g;
}
