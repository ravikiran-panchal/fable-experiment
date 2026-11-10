// Hand-sign recognition. Pure maths, no browser APIs, so it is unit-tested in Node (tests/signs.test.mjs).
//
// A sign is decided from four fingers only (index, middle, ring, little): each is "straight" or "folded".
// The thumb is ignored on purpose because its tracking is the least reliable. No sign needs the hands to
// touch or the fingers to interlock, since the tracker loses hands that overlap.

const FINGERS = [
  [5, 6, 7, 8], // index: knuckle, two joints, tip
  [9, 10, 11, 12], // middle
  [13, 14, 15, 16], // ring
  [17, 18, 19, 20], // little
];

const STRAIGHT = 0.86; // above this the finger counts as straight
const FOLDED = 0.68; // below this it counts as folded; in between is "unsure" and gives no sign

const POSES = { 1111: 'palm', '0000': 'fist', 1100: 'blade', 1000: 'spike', 1001: 'horns' };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

// 1.0 = perfectly straight finger, about 0.3 to 0.5 = curled into a fist. Works at any hand rotation
// because it compares the knuckle-to-tip distance with the finger's own length.
export function straightness(lm, [m, p, d, t]) {
  const len = dist(lm[m], lm[p]) + dist(lm[p], lm[d]) + dist(lm[d], lm[t]);
  return len > 0 ? dist(lm[m], lm[t]) / len : 0;
}

// lm: 21 landmarks {x,y,z}. Prefer the tracker's 3D "world" landmarks.
export function classifyHand(lm) {
  if (!lm || lm.length < 21) return { sign: null, fingers: [] };
  let key = '';
  const fingers = FINGERS.map((f) => {
    const s = straightness(lm, f);
    const state = s > STRAIGHT ? 1 : s < FOLDED ? 0 : null;
    key += state === null ? '?' : state;
    return state;
  });
  return { sign: POSES[key] || null, fingers };
}

// hands: [{ world, lm }] where lm are the normalized image landmarks (0..1).
// Returns the set of signs visible this frame, plus the per-hand result.
export function classifyFrame(hands) {
  const per = hands.map((h) => classifyHand(h.world || h.lm));
  const signs = new Set();
  for (const p of per) if (p.sign) signs.add(p.sign);
  if (hands.length >= 2 && per[0].sign === 'palm' && per[1].sign === 'palm') {
    const a = hands[0].lm[0];
    const b = hands[1].lm[0];
    if (Math.abs(a.x - b.x) > 0.12) signs.add('gate'); // two open hands, clearly apart
  }
  return { signs, per };
}

// Walks through a sign sequence. Each sign must be held for holdMs to lock in.
export class SequenceMatcher {
  constructor(sequence, { holdMs = 280, gapMs = 140, timeoutMs = 6000 } = {}) {
    this.sequence = sequence;
    this.holdMs = holdMs;
    this.gapMs = gapMs; // tracking may flicker this long without losing the hold
    this.timeoutMs = timeoutMs; // max wait between two signs
    this.reset();
  }

  reset() {
    this.index = 0;
    this.hold = 0; // 0..1 progress of the sign being held
    this.heldSince = null;
    this.lastSeen = 0;
    this.stepAt = 0;
  }

  // Returns 'step' when a sign locks, 'done' when the last one locks, 'timeout' on reset, else null.
  update(signs, now) {
    if (this.index >= this.sequence.length) return null;
    if (this.index > 0 && now - this.stepAt > this.timeoutMs) {
      this.reset();
      return 'timeout';
    }
    if (signs.has(this.sequence[this.index])) {
      if (this.heldSince === null) this.heldSince = now;
      this.lastSeen = now;
    } else if (this.heldSince !== null && now - this.lastSeen > this.gapMs) {
      this.heldSince = null;
    }
    this.hold = this.heldSince === null ? 0 : Math.min(1, (now - this.heldSince) / this.holdMs);
    if (this.hold >= 1) {
      this.index++;
      this.heldSince = null;
      this.hold = 0;
      this.stepAt = now;
      return this.index >= this.sequence.length ? 'done' : 'step';
    }
    return null;
  }
}
