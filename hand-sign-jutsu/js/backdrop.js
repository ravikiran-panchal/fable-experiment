// The wall behind the allow-camera and library screens: a tilted collage of black-and-white comic
// panels. Every panel is drawn here from simple shapes (speed lines, halftone dots, ridges, bamboo,
// rooftops, a waterfall, the site's own hand signs). No image files, nothing copied from any series.
import { seeded, TAU } from './effects/util.js';

const INK = '#12100e';
const TONES = ['#ded7c8', '#cbc4b5', '#e9e2d2', '#b8b1a3', '#d2cbbc'];
const HANDS = [[1, 1, 1, 1], [0, 0, 0, 0], [1, 1, 0, 0], [1, 0, 0, 0], [1, 0, 0, 1]];

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }

// The same hand glyph as the sign icons, in a 48 x 56 box.
function hand(g, shape) {
  rr(g, 11, 27, 26, 23, 8);
  g.save(); g.translate(9, 42); g.rotate(-0.49); rr(g, -6, -13, 7, 15, 3.5); g.restore();
  const len = [21, 24, 21, 16];
  shape.forEach((up, i) => { const h = up ? len[i] : 6; rr(g, 11.5 + i * 6.5, 30 - h, 5.5, h + 4, 2.75); });
}

const MOTIFS = [
  function speed(g, w, h, r) { // lines rushing toward a point
    const fx = w * (0.25 + r() * 0.5), fy = h * (0.25 + r() * 0.5), R = Math.hypot(w, h);
    g.fillStyle = INK;
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU, wd = 0.006 + r() * 0.03, near = R * (0.16 + r() * 0.22);
      g.beginPath();
      g.moveTo(fx + Math.cos(a) * near, fy + Math.sin(a) * near);
      g.lineTo(fx + Math.cos(a - wd) * R, fy + Math.sin(a - wd) * R);
      g.lineTo(fx + Math.cos(a + wd) * R, fy + Math.sin(a + wd) * R);
      g.fill();
    }
  },
  function halftone(g, w, h, r) { // dots that swell across the panel
    const flip = r() < 0.5;
    g.fillStyle = INK;
    for (let y = 0; y < h + 9; y += 9) for (let x = (y / 9) % 2 ? 4.5 : 0; x < w + 9; x += 9) {
      const k = (flip ? 1 - x / w : x / w) * 0.6 + (y / h) * 0.4;
      if (k > 0.12) { g.beginPath(); g.arc(x, y, 4.6 * k, 0, TAU); g.fill(); }
    }
  },
  function ridges(g, w, h, r) { // sun over layered hills
    g.fillStyle = '#f6f1e6'; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.arc(w * (0.3 + r() * 0.4), h * 0.34, Math.min(w, h) * 0.17, 0, TAU); g.fill(); g.stroke();
    [['#8c867a', 0.55], ['#4b4741', 0.7], [INK, 0.86]].forEach(([c, base], n) => {
      const p = r() * 9;
      g.fillStyle = c;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, h * (base + 0.09 * Math.sin(x * 0.03 * (n + 1) + p) + 0.04 * Math.sin(x * 0.09 + p)));
      g.lineTo(w, h); g.fill();
    });
  },
  function clouds(g, w, h, r) { // puffs over ruled sky lines
    g.strokeStyle = INK; g.lineWidth = 1;
    for (let y = 8; y < h; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#f6f1e6'; g.lineWidth = 2;
    for (let c = 0; c < 3; c++) {
      const cx = w * r(), cy = h * (0.2 + r() * 0.6), s = Math.min(w, h) * (0.1 + r() * 0.08);
      g.beginPath();
      for (let i = -2; i <= 2; i++) { g.moveTo(cx + i * s * 0.8 + s, cy); g.arc(cx + i * s * 0.8, cy - (2 - Math.abs(i)) * s * 0.25, s * (1 - Math.abs(i) * 0.15), 0, TAU); }
      g.fill(); g.stroke();
      g.fillRect(cx - s * 2.2, cy - s * 0.2, s * 4.4, s * 0.9);
    }
  },
  function bamboo(g, w, h, r) { // stalks and leaves in silhouette
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const x = w * (0.08 + r() * 0.84), bw = 5 + r() * 9, seg = 26 + r() * 22;
      g.fillStyle = i % 2 ? INK : '#55514a';
      for (let y = h; y > -seg; y -= seg) {
        g.fillRect(x, y - seg + 3, bw, seg - 3);
        if (r() < 0.45) {
          const d = r() < 0.5 ? 1 : -1;
          for (let l = 0; l < 3; l++) {
            g.save(); g.translate(x + bw / 2, y - seg + 3); g.rotate(d * (0.3 + l * 0.45) - Math.PI / 2 + d * 1.2);
            g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(bw * 2.2, -bw * 0.7, bw * 4.6, 0); g.quadraticCurveTo(bw * 2.2, bw * 0.7, 0, 0); g.fill();
            g.restore();
          }
        }
      }
    }
  },
  function falls(g, w, h, r) { // a waterfall between two cliffs
    const a = w * (0.3 + r() * 0.08), b = w * (0.62 + r() * 0.08);
    g.fillStyle = '#f6f1e6'; g.fillRect(a, 0, b - a, h);
    g.strokeStyle = '#8c867a'; g.lineWidth = 1.2;
    for (let x = a + 4; x < b; x += 5 + r() * 5) { g.beginPath(); g.moveTo(x, r() * h * 0.3); g.lineTo(x, h * (0.6 + r() * 0.4)); g.stroke(); }
    g.fillStyle = INK;
    for (const [edge, from] of [[a, 0], [b, w]]) {
      g.beginPath(); g.moveTo(from, 0);
      for (let y = 0; y <= h; y += 14) g.lineTo(edge + (r() - 0.5) * 16, y);
      g.lineTo(from, h); g.fill();
    }
    g.fillStyle = '#f6f1e6';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(a + r() * (b - a), h - r() * 12, 6 + r() * 9, 0, TAU); g.fill(); }
  },
  function roofs(g, w, h, r) { // tiered rooftops against the sky
    g.strokeStyle = INK; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const cx = w * (0.12 + i * 0.26 + r() * 0.08), tiers = 2 + Math.floor(r() * 3);
      let y = h, bw = w * (0.2 + r() * 0.08);
      for (let t = 0; t < tiers; t++) {
        const bh = h * (0.13 + r() * 0.06);
        g.fillStyle = '#f6f1e6'; g.fillRect(cx - bw * 0.36, y - bh, bw * 0.72, bh); g.strokeRect(cx - bw * 0.36, y - bh, bw * 0.72, bh);
        g.fillStyle = INK;
        g.beginPath(); g.moveTo(cx - bw * 0.62, y - bh); g.quadraticCurveTo(cx, y - bh - bh * 0.9, cx + bw * 0.62, y - bh);
        g.lineTo(cx + bw * 0.5, y - bh - 4); g.lineTo(cx - bw * 0.5, y - bh - 4); g.fill();
        y -= bh + bh * 0.35; bw *= 0.74;
      }
    }
  },
  function orb(g, w, h, r) { // a ball of spinning energy
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
    g.strokeStyle = INK; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, d0 = R * (1.25 + r() * 0.3), d1 = d0 + R * (0.2 + r() * 0.6);
      g.lineWidth = 1 + r() * 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); g.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1); g.stroke();
    }
    g.fillStyle = '#f6f1e6'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); g.stroke();
    for (let i = 0; i < 6; i++) { g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.ellipse(cx, cy, R * (0.3 + i * 0.11), R * (0.12 + r() * 0.5), r() * TAU, 0, 2 + r() * 2.5); g.stroke(); }
  },
  function sign(g, w, h, r) { // one of the site's six hand signs, on a burst
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h);
    g.fillStyle = '#4b4741';
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a + 0.09) * R, cy + Math.sin(a + 0.09) * R); g.fill(); }
    const s = Math.min(w / 48, h / 56) * 0.72;
    g.save(); g.translate(cx - 24 * s, cy - 28 * s); g.scale(s, s);
    g.fillStyle = '#f6f1e6'; g.strokeStyle = INK;
    g.save(); g.translate(2.5, 2.5); g.fillStyle = INK; hand(g, HANDS[Math.floor(r() * HANDS.length)]); g.restore();
    g.restore();
  },
];

export function paintWall(canvas) {
  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = seeded(11);
  g.fillStyle = INK; g.fillRect(0, 0, W, H);

  g.save();
  g.translate(W / 2, H / 2); g.rotate(-0.07); g.translate(-W / 2, -H / 2);
  const pad = 90, gap = 7, cols = Math.max(3, Math.round(W / 210)), cw = (W + pad * 2) / cols;
  let last = -1;
  for (let c = 0; c < cols; c++) {
    for (let y = -pad - r() * 80; y < H + pad;) {
      const ph = 120 + r() * 150, x = -pad + c * cw;
      let m = Math.floor(r() * MOTIFS.length);
      if (m === last) m = (m + 1) % MOTIFS.length;
      last = m;
      g.save();
      g.beginPath(); g.rect(x + gap / 2, y + gap / 2, cw - gap, ph - gap); g.clip();
      g.fillStyle = TONES[Math.floor(r() * TONES.length)]; g.fillRect(x, y, cw, ph);
      g.translate(x + gap / 2, y + gap / 2);
      MOTIFS[m](g, cw - gap, ph - gap, r);
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x + gap / 2, y + gap / 2, cw - gap, ph - gap);
      y += ph;
    }
  }
  g.restore();

  // Push the wall back so the paper cards in front stay the loudest thing on screen.
  g.fillStyle = 'rgba(14,11,9,0.5)'; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, 'rgba(14,11,9,0)'); v.addColorStop(1, 'rgba(14,11,9,0.82)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}
