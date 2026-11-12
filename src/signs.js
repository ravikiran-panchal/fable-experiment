// Hand-sign recognition for Sign Weaving. Pure maths, no browser APIs, so it is tested in Node
// (tests/signs.test.mjs). The finger maths is the same as the Hand Sign Jutsu project.
//
// A sign is decided from four fingers only (index, middle, ring, little): each is "straight" or "folded".
// The thumb is ignored because its tracking is the least reliable. No sign needs the hands to touch.

const FINGERS = [
  [5, 6, 7, 8], // index: knuckle, two joints, tip
  [9, 10, 11, 12], // middle
  [13, 14, 15, 16], // ring
  [17, 18, 19, 20], // little
];

const STRAIGHT = 0.86; // above this the finger counts as straight
const FOLDED = 0.68; // below this it counts as folded; in between is "unsure" and gives no sign

const POSES = { 1111: 'palm', '0000': 'fist', 1100: 'blade', 1000: 'spike', 1001: 'horns' };

// Order of the sign pad (keys 1 to 6).
export const SIGN_ORDER = ['palm', 'fist', 'blade', 'spike', 'horns', 'gate'];
export const SIGN_SHAPES = { palm: [1, 1, 1, 1], fist: [0, 0, 0, 0], blade: [1, 1, 0, 0], spike: [1, 0, 0, 0], horns: [1, 0, 0, 1] };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

// 1.0 = perfectly straight finger, about 0.3 to 0.5 = curled into a fist. Works at any hand rotation.
export function straightness(lm, [m, p, d, t]) {
  const len = dist(lm[m], lm[p]) + dist(lm[p], lm[d]) + dist(lm[d], lm[t]);
  return len > 0 ? dist(lm[m], lm[t]) / len : 0;
}

// lm: 21 landmarks {x,y,z}. Prefer the tracker's 3D "world" landmarks.
export function classifyHand(lm) {
  if (!lm || lm.length < 21) return null;
  let key = '';
  for (const f of FINGERS) {
    const s = straightness(lm, f);
    key += s > STRAIGHT ? 1 : s < FOLDED ? 0 : '?';
  }
  return POSES[key] || null;
}

// hands: [{ world, lm }] where lm are the normalized image landmarks (0..1).
// Returns the set of signs visible this frame.
export function classifyFrame(hands) {
  const per = hands.map((h) => classifyHand(h.world || h.lm));
  const signs = new Set();
  for (const s of per) if (s) signs.add(s);
  if (hands.length >= 2 && per[0] === 'palm' && per[1] === 'palm' && Math.abs(hands[0].lm[0].x - hands[1].lm[0].x) > 0.12) {
    signs.add('gate'); // two open hands, clearly apart
  }
  return signs;
}

// Follows every jutsu at once: you do not pick one first, the signs you weave decide which one comes out.
// list: [{ id, sequence }]. No sequence may be the start of another, and no sign repeats twice in a row.
export class WeaveMatcher {
  constructor(list, { holdMs = 260, gapMs = 140, timeoutMs = 3500 } = {}) {
    this.list = list;
    this.holdMs = holdMs; // how long a camera sign must be held to lock in
    this.gapMs = gapMs; // tracking may flicker this long without losing the hold
    this.timeoutMs = timeoutMs; // max wait between two signs
    this.reset();
  }

  reset() {
    this.path = []; // signs locked so far
    this.result = null; // id of the finished jutsu
    this.holdSign = null; this.heldSince = 0; this.lastSeen = 0; this.hold = 0; this.stepAt = 0;
  }

  // Jutsu that still fit the signs woven so far.
  options() { return this.list.filter((j) => this.path.every((s, i) => j.sequence[i] === s)); }
  // Signs that would continue at least one of them.
  next() { return new Set(this.options().map((j) => j.sequence[this.path.length]).filter(Boolean)); }

  #lock(sign, now) {
    this.path.push(sign);
    this.holdSign = null; this.hold = 0; this.stepAt = now;
    const hit = this.list.find((j) => j.sequence.length === this.path.length && j.sequence.every((s, i) => s === this.path[i]));
    if (hit) { this.result = hit.id; return 'done'; }
    return 'step';
  }

  // Sign pad: one press locks one sign. Returns 'step', 'done' or 'miss'.
  push(sign, now) {
    if (this.result) return null;
    return this.next().has(sign) ? this.#lock(sign, now) : 'miss';
  }

  // Camera: call every tracked frame with the visible signs. Returns 'step', 'done', 'timeout' or null.
  update(signs, now, handCount = 1) {
    if (this.result) return null;
    if (this.path.length && now - this.stepAt > this.timeoutMs) { this.reset(); return 'timeout'; }
    const want = this.next();
    let seen = null;
    if (want.has('gate') && signs.has('gate')) seen = 'gate';
    else {
      // With two hands up while Gate is possible, one open hand is probably a half-formed Gate: wait for it.
      const waitForGate = want.has('gate') && handCount >= 2;
      for (const s of signs) if (s !== 'gate' && want.has(s) && !(waitForGate && s === 'palm')) { seen = s; break; }
    }
    if (seen) {
      if (seen !== this.holdSign) { this.holdSign = seen; this.heldSince = now; }
      this.lastSeen = now;
    } else if (this.holdSign && now - this.lastSeen > this.gapMs) this.holdSign = null;
    this.hold = this.holdSign ? Math.min(1, (now - this.heldSince) / this.holdMs) : 0;
    return this.hold >= 1 && seen ? this.#lock(this.holdSign, now) : null; // never lock on a frame where the sign is not visible
  }
}
