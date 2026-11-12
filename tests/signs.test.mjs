// Run with: npm test   (Node's built-in test runner, no extra packages)
// These tests use made-up 3D hands, so they prove the maths and the weave logic, not how well a real camera tracks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHand, classifyFrame, WeaveMatcher, SIGN_ORDER, SIGN_SHAPES } from '../src/signs.js';
import { JUTSU, ELEMENTS, SIGN_NAMES, SIGN_HINTS, AFFINITY, costFor } from '../src/jutsu-list.js';

// Build a 21-point hand in metres. fingers = [index, middle, ring, little], 1 straight / 0 folded.
function fakeHand(fingers, x0 = 0) {
  const pts = Array(21).fill(null);
  pts[0] = { x: x0, y: 0, z: 0 };
  [[-0.03, 0.02], [-0.05, 0.04], [-0.065, 0.06], [-0.075, 0.08]].forEach(([x, y], i) => (pts[1 + i] = { x: x0 + x, y, z: 0 }));
  [[-0.03, 0.09], [-0.01, 0.095], [0.01, 0.09], [0.03, 0.08]].forEach(([bx, by], f) => {
    const curl = 1 - fingers[f];
    let y = by, z = 0, ang = 0;
    pts[5 + f * 4] = { x: x0 + bx, y, z };
    [0.04, 0.025, 0.02].forEach((len, j) => { ang += curl * 1.5; y += Math.cos(ang) * len; z += Math.sin(ang) * len; pts[6 + f * 4 + j] = { x: x0 + bx, y, z }; });
  });
  return pts;
}
const frame = (...signs) => signs.map((s, i) => { const lm = fakeHand(SIGN_SHAPES[s], i * 0.4); return { lm, world: lm }; });

test('each one-hand sign is recognised', () => {
  for (const s of Object.keys(SIGN_SHAPES)) assert.equal(classifyHand(fakeHand(SIGN_SHAPES[s])), s);
  assert.equal(classifyHand(fakeHand([0.5, 0.5, 0.5, 0.5])), null, 'a half-bent hand is no sign');
});

test('two open hands apart make Gate', () => {
  assert.ok(classifyFrame(frame('palm', 'palm')).has('gate'));
  assert.ok(!classifyFrame(frame('palm', 'fist')).has('gate'));
  assert.ok(!classifyFrame(frame('palm')).has('gate'));
});

test('the jutsu list keeps its rules', () => {
  assert.equal(JUTSU.length, 9);
  for (const j of JUTSU) assert.ok(ELEMENTS[j.el], `${j.id} has an element`);
  const seen = new Set();
  for (const j of JUTSU) {
    assert.ok(j.sequence.length >= 2 && j.sequence.length <= 3, j.id);
    j.sequence.forEach((s, i) => { assert.ok(SIGN_ORDER.includes(s), `${j.id}: ${s}`); assert.notEqual(s, j.sequence[i - 1], `${j.id} repeats ${s}`); });
    assert.ok(j.cost > 0 && j.cost <= 100 && j.name && j.sub);
    seen.add(j.sequence.join('>'));
  }
  assert.equal(seen.size, JUTSU.length, 'every sequence is unique');
  for (const a of JUTSU) for (const b of JUTSU) if (a !== b) assert.ok(!b.sequence.join('>').startsWith(a.sequence.join('>') + '>'), `${a.id} is the start of ${b.id}`);
  for (const s of SIGN_ORDER) assert.ok(SIGN_NAMES[s] && SIGN_HINTS[s]);
});

test('the sign pad reaches every jutsu and rejects a wrong sign', () => {
  for (const j of JUTSU) {
    const m = new WeaveMatcher(JUTSU);
    j.sequence.forEach((s, i) => assert.equal(m.push(s, i), i === j.sequence.length - 1 ? 'done' : 'step'));
    assert.equal(m.result, j.id);
  }
  const m = new WeaveMatcher(JUTSU);
  assert.equal(m.push('horns', 0), 'step');
  assert.equal(m.push('gate', 1), 'miss');
  m.reset();
  assert.equal(m.push('palm', 0), 'step');
  assert.equal(m.push('blade', 1), 'miss');
  assert.deepEqual([...m.next()].sort(), ['fist', 'horns']);
});

// Feed the camera path: each sign held for `hold` ms at 30 fps.
function weave(m, steps, t0 = 0) {
  let t = t0, out = [];
  for (const [signs, ms, hands] of steps) for (let k = 0; k < ms / 33; k++) { const r = m.update(new Set(signs), t, hands ?? 1); if (r) out.push(r); t += 33; }
  return out;
}

test('camera signs must be held, and every jutsu can be woven', () => {
  for (const j of JUTSU) {
    const m = new WeaveMatcher(JUTSU);
    const steps = j.sequence.map((s) => (s === 'gate' ? [['palm', 'gate'], 400, 2] : [[s], 400, 1]));
    const out = weave(m, steps);
    assert.equal(out.at(-1), 'done', j.id);
    assert.equal(m.result, j.id);
  }
  const m = new WeaveMatcher(JUTSU);
  assert.deepEqual(weave(m, [[['palm'], 150]]), [], 'a flash of a sign does not lock');
});

test('a short tracking flicker does not lose the hold, a long gap does', () => {
  const a = new WeaveMatcher(JUTSU);
  assert.deepEqual(weave(a, [[['palm'], 150], [[], 99], [['palm'], 150]]), ['step']);
  const b = new WeaveMatcher(JUTSU);
  assert.deepEqual(weave(b, [[['palm'], 150], [[], 330], [['palm'], 150]]), []);
});

test('a half-formed Gate does not fire the palm jutsu', () => {
  const m = new WeaveMatcher(JUTSU);
  // Fist, then both hands come up but only one reads as open for a while, then Gate.
  const out = weave(m, [[['fist'], 400, 1], [['palm'], 500, 2], [['palm', 'gate'], 400, 2]]);
  assert.equal(m.result, 'ward');
  assert.deepEqual(out, ['step', 'done']);
});

test('waiting too long between signs resets the weave', () => {
  const m = new WeaveMatcher(JUTSU);
  assert.deepEqual(weave(m, [[['spike'], 400]]), ['step']);
  assert.equal(m.update(new Set(), 5000), 'timeout');
  assert.equal(m.path.length, 0);
});

test('born elements make a jutsu cheaper, and sealed Ether stays out of the weave', () => {
  const comet = JUTSU.find((j) => j.id === 'comet');
  assert.equal(costFor(comet, { id: 'kaze' }), 26, 'Kaze is born of fire');
  assert.equal(costFor(comet, { id: 'tsuki' }), 35);
  for (const id in AFFINITY) assert.ok(AFFINITY[id].length >= 1 && AFFINITY[id].length <= 2 && !AFFINITY[id].includes('ether'), id);
  const open = JUTSU.filter((j) => !j.sealed), m = new WeaveMatcher(open);
  assert.equal(m.push('gate', 0), 'miss', 'gate starts only Ether jutsu');
  assert.equal(JUTSU.filter((j) => j.el === 'ether').length, 2);
});
