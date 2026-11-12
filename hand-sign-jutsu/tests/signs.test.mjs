// Run with: npm test   (Node's built-in test runner, no extra packages)
// These tests use made-up 3D hands, so they prove the maths, not how well a real camera tracks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHand, classifyFrame, SequenceMatcher } from '../js/signs.js';
import { JUTSU_LIST } from '../js/sequences.js';
import { JUTSU, SIGNS } from '../js/names.js';

// Build a 21-point hand in metres. fingers = [index, middle, ring, little], 1 straight / 0 folded,
// or a number between for a partly bent finger (the angle of each joint as a fraction of a full curl).
function fakeHand(fingers, rot = [0, 0, 0]) {
  const pts = Array(21).fill(null);
  pts[0] = { x: 0, y: 0, z: 0 };
  const thumb = [[-0.03, 0.02], [-0.05, 0.04], [-0.065, 0.06], [-0.075, 0.08]];
  thumb.forEach(([x, y], i) => (pts[1 + i] = { x, y, z: 0 }));
  const bases = [[-0.03, 0.09], [-0.01, 0.095], [0.01, 0.09], [0.03, 0.08]];
  const segs = [0.04, 0.025, 0.02];
  bases.forEach(([bx, by], f) => {
    const curl = 1 - fingers[f]; // 0 straight .. 1 fully folded
    let x = bx, y = by, z = 0, ang = 0;
    pts[5 + f * 4] = { x, y, z };
    segs.forEach((len, j) => {
      ang += curl * 1.5; // radians per joint, bending toward the palm (+z)
      y += Math.cos(ang) * len;
      z += Math.sin(ang) * len;
      pts[6 + f * 4 + j] = { x, y, z };
    });
  });
  const [rx, ry, rz] = rot;
  return pts.map((p) => {
    let { x, y, z } = p;
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    return { x, y, z };
  });
}

const SHAPES = { palm: [1, 1, 1, 1], fist: [0, 0, 0, 0], blade: [1, 1, 0, 0], spike: [1, 0, 0, 0], horns: [1, 0, 0, 1] };

test('each sign is recognised at many hand rotations', () => {
  for (const [name, shape] of Object.entries(SHAPES)) {
    for (let i = 0; i < 60; i++) {
      const rot = [Math.sin(i) * 1.2, Math.cos(i * 1.7) * 1.2, i * 0.4];
      assert.equal(classifyHand(fakeHand(shape, rot)).sign, name, `${name} at rotation ${rot}`);
    }
  }
});

test('slightly relaxed fingers still count, half-bent fingers give no sign', () => {
  assert.equal(classifyHand(fakeHand([0.9, 0.9, 0.9, 0.9])).sign, 'palm');
  assert.equal(classifyHand(fakeHand([0.1, 0.1, 0.1, 0.1])).sign, 'fist');
  assert.equal(classifyHand(fakeHand([0.55, 0.55, 0.55, 0.55])).sign, null);
});

test('a shape that is not in the vocabulary gives no sign', () => {
  assert.equal(classifyHand(fakeHand([0, 1, 0, 0])).sign, null);
  assert.equal(classifyHand(fakeHand([1, 1, 1, 0])).sign, null);
});

test('gate needs two open hands that are apart', () => {
  const palm = fakeHand(SHAPES.palm);
  const at = (x) => Array.from({ length: 21 }, () => ({ x, y: 0.5, z: 0 }));
  assert.ok(classifyFrame([{ world: palm, lm: at(0.3) }, { world: palm, lm: at(0.7) }]).signs.has('gate'));
  assert.ok(!classifyFrame([{ world: palm, lm: at(0.5) }, { world: palm, lm: at(0.55) }]).signs.has('gate'));
  assert.ok(!classifyFrame([{ world: palm, lm: at(0.3) }, { world: fakeHand(SHAPES.fist), lm: at(0.7) }]).signs.has('gate'));
  assert.ok(!classifyFrame([{ world: palm, lm: at(0.3) }]).signs.has('gate'));
});

test('sequence: hold to lock, flicker tolerated, done at the end', () => {
  const m = new SequenceMatcher(['palm', 'fist', 'palm'], { holdMs: 300, gapMs: 150, timeoutMs: 5000 });
  const S = (...s) => new Set(s);
  let t = 0;
  assert.equal(m.update(S('palm'), t), null);
  assert.equal(m.update(S('palm'), (t += 200)), null);
  assert.equal(m.update(S(), (t += 50)), null); // one dropped frame
  assert.equal(m.update(S('palm'), (t += 60)), 'step');
  assert.equal(m.index, 1);
  assert.equal(m.update(S('palm'), (t += 100)), null); // still showing the old sign: nothing happens
  assert.equal(m.update(S('fist'), (t += 100)), null);
  assert.equal(m.update(S('fist'), (t += 310)), 'step');
  assert.equal(m.update(S('palm'), (t += 100)), null);
  assert.equal(m.update(S('palm'), (t += 310)), 'done');
  assert.equal(m.update(S('palm'), (t += 310)), null);
});

test('sequence: a short flash of a sign does not lock, and waiting too long resets', () => {
  const m = new SequenceMatcher(['spike', 'blade'], { holdMs: 300, gapMs: 150, timeoutMs: 2000 });
  const S = (...s) => new Set(s);
  m.update(S('spike'), 0);
  m.update(S(), 100);
  m.update(S(), 300); // gap too long: hold lost
  assert.equal(m.update(S('spike'), 350), null);
  assert.equal(m.update(S('spike'), 700), 'step');
  assert.equal(m.update(S(), 2800), 'timeout');
  assert.equal(m.index, 0);
});

test('the library is well formed', () => {
  assert.ok(JUTSU_LIST.length >= 5 && JUTSU_LIST.length <= 6);
  const seen = new Set();
  for (const j of JUTSU_LIST) {
    assert.ok(JUTSU[j.id], `${j.id} has a label in names.js`);
    assert.ok(j.sequence.length >= 2 && j.sequence.length <= 3, `${j.id} uses 2-3 signs`);
    j.sequence.forEach((s, i) => {
      assert.ok(SIGNS[s], `${s} is a known sign`);
      assert.notEqual(s, j.sequence[i - 1], `${j.id} never repeats a sign back to back`);
    });
    const key = j.sequence.join('>');
    assert.ok(!seen.has(key), `${j.id} has a unique sequence`);
    seen.add(key);
  }
});
