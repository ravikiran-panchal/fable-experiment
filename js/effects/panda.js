// Genjutsu: the room is swallowed by a painted bamboo valley where pandas bow in waves.
// Raise an open palm and they all bow together. Everything is drawn from code: no images.
import { TAU, clamp, lerp, rand, smooth, seeded, glowSprite, glow } from './util.js';

function panda(g, x, y, s, bow, blink) {
  const K = '#1d1b1c', Wt = '#f6f2ea';
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath(); g.ellipse(0, s * 1.05, s * 1.25, s * 0.22, 0, 0, TAU); g.fill();
  g.fillStyle = K; // legs
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * s * 0.62, s * 0.78, s * 0.42, s * 0.32, 0, 0, TAU); g.fill(); }
  g.fillStyle = Wt; // body leans forward as it bows
  g.beginPath(); g.ellipse(0, s * 0.1 + bow * s * 0.12, s * 0.92, s * (0.95 - bow * 0.12), 0, 0, TAU); g.fill();
  g.fillStyle = '#5b5557'; // foot pads
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * s * 0.66, s * 0.84, s * 0.16, s * 0.12, 0, 0, TAU); g.fill(); }
  g.fillStyle = K; // arms come together in front for the bow
  for (const sx of [-1, 1]) {
    g.save();
    g.translate(sx * lerp(s * 0.82, s * 0.24, bow), lerp(s * 0.1, s * 0.5, bow));
    g.rotate(sx * lerp(0.35, -0.9, bow));
    g.beginPath(); g.ellipse(0, 0, s * 0.27, s * 0.52, 0, 0, TAU); g.fill();
    g.restore();
  }
  // head dips and tilts down
  const hy = -s * 0.95 + bow * s * 0.78, look = bow * s * 0.3, sq = 1 - bow * 0.22;
  g.translate(0, hy);
  g.fillStyle = K;
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.56, -s * (0.5 + bow * 0.1), s * 0.27, 0, TAU); g.fill(); }
  g.fillStyle = Wt;
  g.beginPath(); g.ellipse(0, 0, s * 0.76, s * 0.7 * sq, 0, 0, TAU); g.fill();
  g.fillStyle = K;
  for (const sx of [-1, 1]) { // eye patches
    g.save();
    g.translate(sx * s * 0.3, look - s * 0.02);
    g.rotate(sx * 0.4);
    g.beginPath(); g.ellipse(0, 0, s * 0.19, s * 0.25 * sq, 0, 0, TAU); g.fill();
    g.restore();
  }
  const shut = bow > 0.45 || blink;
  for (const sx of [-1, 1]) { // eyes close while bowing
    const ex = sx * s * 0.29, ey = look - s * 0.03;
    if (shut) {
      g.strokeStyle = '#d8d2c8'; g.lineWidth = s * 0.035; g.lineCap = 'round';
      g.beginPath(); g.arc(ex, ey - s * 0.03, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, s * 0.07, 0, TAU); g.fill();
      g.fillStyle = K; g.beginPath(); g.arc(ex, ey + s * 0.01, s * 0.04, 0, TAU); g.fill();
    }
  }
  g.fillStyle = K; // nose and mouth
  g.beginPath(); g.ellipse(0, look + s * 0.22 * sq, s * 0.1, s * 0.07, 0, 0, TAU); g.fill();
  g.strokeStyle = K; g.lineWidth = s * 0.03; g.lineCap = 'round';
  g.beginPath(); g.arc(-s * 0.08, look + s * 0.3 * sq, s * 0.08, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
  g.beginPath(); g.arc(s * 0.08, look + s * 0.3 * sq, s * 0.08, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
  g.restore();
}

export function create(env) {
  const gold = glowSprite('255,236,170', 0.3);
  let W = 0, H = 0, bg = null, stalks = [], herd = [], leaves = [], t = 0, respect = 0, amb = null;

  function build(env) {
    W = env.W; H = env.H;
    const rnd = seeded(7);
    // Sky, sun, hills and ground never move, so paint them once and reuse the picture every frame.
    bg = document.createElement('canvas');
    bg.width = Math.round(W); bg.height = Math.round(H);
    const b = bg.getContext('2d');
    const sky = b.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f6e2b8'); sky.addColorStop(0.45, '#cfe6c8'); sky.addColorStop(1, '#8fc09a');
    b.fillStyle = sky; b.fillRect(0, 0, W, H);
    const sun = b.createRadialGradient(W * 0.68, H * 0.2, 0, W * 0.68, H * 0.2, H * 0.45);
    sun.addColorStop(0, 'rgba(255,250,225,1)'); sun.addColorStop(0.12, 'rgba(255,244,205,0.9)'); sun.addColorStop(1, 'rgba(255,240,200,0)');
    b.fillStyle = sun; b.fillRect(0, 0, W, H);
    [['#a9cdb6', 0.4, 0.1], ['#86b89a', 0.5, 0.075], ['#63a07c', 0.58, 0.05]].forEach(([col, base, amp], n) => {
      b.fillStyle = col;
      b.beginPath(); b.moveTo(0, H);
      for (let px = 0; px <= W; px += 8) {
        const u = px / Math.max(W, H);
        b.lineTo(px, H * (base + amp * Math.sin(u * (5 + n * 2.3) + n * 2) + amp * 0.5 * Math.sin(u * (13 + n * 3) + n)));
      }
      b.lineTo(W, H); b.fill();
      const mist = b.createLinearGradient(0, H * (base + 0.02), 0, H * (base + 0.2));
      mist.addColorStop(0, 'rgba(240,250,240,0)'); mist.addColorStop(1, 'rgba(240,250,240,0.55)');
      b.fillStyle = mist; b.fillRect(0, H * base, W, H * 0.22);
    });
    const ground = b.createLinearGradient(0, H * 0.62, 0, H);
    ground.addColorStop(0, '#7fb77f'); ground.addColorStop(1, '#4f8f58');
    b.fillStyle = ground;
    b.beginPath(); b.moveTo(0, H * 0.66);
    b.quadraticCurveTo(W / 2, H * 0.58, W, H * 0.66); b.lineTo(W, H); b.lineTo(0, H); b.fill();

    // Bamboo: thin pale stalks far away, thick dark ones framing the sides.
    stalks = [];
    const far = env.low ? 9 : 16, near = W > H ? 7 : 5;
    for (let i = 0; i < far; i++) stalks.push({ x: rnd() * W, w: lerp(4, 9, rnd()) * (H / 800), col: '#7fb48a', dark: '#6aa277', seg: H * lerp(0.07, 0.1, rnd()), ph: rnd() * TAU, front: false, base: H * lerp(0.62, 0.7, rnd()) });
    for (let i = 0; i < near; i++) {
      const side = i % 2 ? 1 : -1;
      const off = rnd() * 0.2;
      stalks.push({ x: W * (side < 0 ? off : 1 - off), w: lerp(14, 26, rnd()) * (H / 800), col: '#3f8a4c', dark: '#2c6a39', seg: H * lerp(0.11, 0.15, rnd()), ph: rnd() * TAU, front: true, base: H * 1.05 });
    }
    // The herd: a back row and a front row, facing you.
    herd = [];
    const u = Math.min(W, H);
    const back = W > H ? 4 : 3, front = W > H ? 3 : 2;
    for (let i = 0; i < back; i++) herd.push({ x: W * lerp(0.2, 0.8, back === 1 ? 0.5 : i / (back - 1)), y: H * 0.6, s: u * (W > H ? 0.055 : 0.075), d: i * 0.22 });
    for (let i = 0; i < front; i++) herd.push({ x: W * lerp(0.3, 0.7, front === 1 ? 0.5 : i / (front - 1)), y: H * (W > H ? 0.73 : 0.71), s: u * (W > H ? 0.085 : 0.11), d: 0.9 + i * 0.25 });
    herd.forEach((p) => { p.bow = 0; p.blinkAt = rand(1, 5); });
    leaves = Array.from({ length: env.low ? 10 : 22 }, () => ({ x: rand(W), y: rand(H), a: rand(TAU), sp: rand(0.4, 1), s: rand(5, 10) * (u / 700) }));
  }

  function bamboo(g, s) {
    const sway = Math.sin(t * 0.7 + s.ph) * (s.front ? 10 : 5);
    g.lineCap = 'butt';
    let n = 0;
    for (let yy = s.base; yy > -s.seg; yy -= s.seg, n++) {
      const k0 = 1 - yy / H, k1 = 1 - (yy - s.seg) / H;
      const x0 = s.x + sway * k0 * k0, x1 = s.x + sway * k1 * k1;
      g.strokeStyle = s.col; g.lineWidth = s.w;
      g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy - s.seg + 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = s.w * 0.25;
      g.beginPath(); g.moveTo(x0 - s.w * 0.2, yy); g.lineTo(x1 - s.w * 0.2, yy - s.seg + 2); g.stroke();
      g.strokeStyle = s.dark; g.lineWidth = Math.max(1.5, s.w * 0.16);
      g.beginPath(); g.moveTo(x1 - s.w * 0.6, yy - s.seg + 1); g.lineTo(x1 + s.w * 0.6, yy - s.seg + 1); g.stroke();
      if (n % 2 === 1) { // a spray of leaves at every other joint
        const dir = (n + Math.round(s.ph * 3)) % 4 < 2 ? 1 : -1;
        g.fillStyle = s.dark;
        for (let l = 0; l < 3; l++) {
          const a = dir * (0.5 + l * 0.38) + Math.sin(t * 1.4 + s.ph + l) * 0.08;
          const L = s.w * (s.front ? 4.2 : 5);
          g.save();
          g.translate(x1, yy - s.seg + 1);
          g.rotate(a - Math.PI / 2 + dir * 0.9);
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -L * 0.16, L, 0); g.quadraticCurveTo(L * 0.5, L * 0.16, 0, 0); g.fill();
          g.restore();
        }
      }
    }
  }

  build(env);
  env.sounds.play('valley_gong', { volume: 0.9 });
  amb = env.sounds.play('valley_loop', { volume: 0.7, loop: true });

  return {
    hideVideo: true,
    update(dt, env) {
      t += dt;
      if (env.W !== W || env.H !== H) build(env);
      const palmUp = env.hands.some((h) => h.sign === 'palm');
      respect = lerp(respect, palmUp ? 1 : 0, clamp(dt * 5));
      for (const p of herd) {
        const c = (t - 1.6 - p.d + 60) % 5.5; // each panda bows in turn: down, hold, up
        const wave = c < 0.6 ? smooth(c / 0.6) : c < 1.9 ? 1 : c < 2.5 ? 1 - smooth((c - 1.9) / 0.6) : 0;
        p.bow = lerp(p.bow, Math.max(t > 1.6 ? wave : 0, respect), clamp(dt * 9));
        p.blinkAt -= dt;
        if (p.blinkAt < -0.14) p.blinkAt = rand(2, 6);
      }
      for (const l of leaves) {
        l.y += l.sp * H * 0.07 * dt; l.x += Math.sin(t * 1.2 + l.a) * 22 * dt; l.a += dt * l.sp;
        if (l.y > H + 12) { l.y = -12; l.x = rand(W); }
      }
    },
    draw(g, env) {
      const open = smooth(t / 1.5); // the valley irises open from the centre of the frame
      const maxR = Math.hypot(W, H) * 0.56;
      g.save();
      g.beginPath(); g.arc(W / 2, H / 2, maxR * open, 0, TAU); g.clip();
      g.drawImage(bg, 0, 0, W, H);
      for (const s of stalks) if (!s.front) bamboo(g, s);
      g.fillStyle = 'rgba(244,252,244,0.25)'; // drifting mist
      for (let i = 0; i < 3; i++) {
        const mx = ((t * (12 + i * 7) + i * W * 0.4) % (W * 1.6)) - W * 0.3;
        g.beginPath(); g.ellipse(mx, H * (0.6 + i * 0.03), W * 0.35, H * 0.035, 0, 0, TAU); g.fill();
      }
      for (const p of herd) panda(g, p.x, p.y, p.s, p.bow, p.blinkAt < 0);
      for (const s of stalks) if (s.front) bamboo(g, s);
      g.fillStyle = '#4c9a58';
      for (const l of leaves) {
        g.save(); g.translate(l.x, l.y); g.rotate(l.a);
        g.beginPath(); g.ellipse(0, 0, l.s, l.s * 0.3, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.globalCompositeOperation = 'lighter'; // your hands cross over as points of light
      for (const h of env.hands) for (const q of h.pts) glow(g, gold, q.x, q.y, h.size * 0.16, 0.8);
      g.restore();
      if (open < 1) { // bright rim of the opening
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = `rgba(255,240,190,${1 - open})`;
        g.lineWidth = 10 + 30 * (1 - open);
        g.beginPath(); g.arc(W / 2, H / 2, maxR * open, 0, TAU); g.stroke();
        g.restore();
      }
    },
    stop() { amb?.stop(0.6); },
  };
}
