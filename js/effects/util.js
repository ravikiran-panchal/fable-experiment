// Shared helpers for the effects. All drawing is plain Canvas 2D so it runs on any phone.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOutBack = (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

// A soft round glow, pre-rendered once per colour. Drawing a cached image is far cheaper on phones
// than building a gradient for every particle.
const sprites = new Map();
export function glowSprite(rgb, core = 0.12) {
  const key = rgb + core;
  if (sprites.has(key)) return sprites.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(core, `rgba(${rgb},0.85)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.22)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprites.set(key, c);
  return c;
}

export function glow(g, sprite, x, y, r, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  g.globalAlpha = Math.min(1, alpha);
  g.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

// The hand an effect should attach to: one showing the wanted sign, else the biggest (closest) hand.
export function pickHand(hands, prefer) {
  let best = null;
  for (const h of hands) {
    if (prefer && h.sign === prefer && (!best || best.sign !== prefer || h.size > best.size)) best = h;
    else if (!best || (best.sign !== prefer && h.size > best.size)) best = h;
  }
  return best;
}

// Repeatable random numbers, so a scene looks the same every time it is built.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export function drawSkeleton(g, hand, color, alpha = 0.9) {
  const p = hand.pts;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.5, hand.size * 0.035);
  g.lineCap = 'round';
  g.beginPath();
  for (const [a, b] of BONES) { g.moveTo(p[a].x, p[a].y); g.lineTo(p[b].x, p[b].y); }
  g.stroke();
  g.fillStyle = '#fff';
  for (const q of p) { g.beginPath(); g.arc(q.x, q.y, Math.max(1.5, hand.size * 0.03), 0, TAU); g.fill(); }
  g.restore();
}
