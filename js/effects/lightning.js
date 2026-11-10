// Lightning blade: jagged bolts crackle from the palm and fingertips and trail behind a fast hand.
import { TAU, clamp, rand, glowSprite, glow, pickHand } from './util.js';

// A bolt is a line broken at its midpoint again and again, each break pushed sideways.
function bolt(x1, y1, x2, y2, jitter, depth = 5) {
  let pts = [[x1, y1], [x2, y2]];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const off = rand(-1, 1) * jitter;
      next.push([(ax + bx) / 2 + (-(by - ay) / len) * off, (ay + by) / 2 + ((bx - ax) / len) * off], pts[i]);
    }
    pts = next;
    jitter *= 0.55;
  }
  return pts;
}

export function create(env) {
  const blue = glowSprite('60,130,255');
  const white = glowSprite('230,245,255', 0.25);
  const bolts = [];
  const sparks = [];
  const trail = [];
  let flash = 0.9, pos = null, size = Math.min(env.W, env.H) * 0.1, crackle = 0, t = 0;
  env.sounds.play('lightning', { volume: 0.9 });

  function addBolt(x1, y1, x2, y2, width, life) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const pts = bolt(x1, y1, x2, y2, len * 0.22, env.low ? 4 : 5);
    bolts.push({ pts, width, life, max: life });
    if (Math.random() < 0.45) { // a fork
      const [fx, fy] = pts[Math.floor(pts.length * rand(0.3, 0.7))];
      const a = Math.atan2(y2 - y1, x2 - x1) + rand(-1, 1);
      const l = len * rand(0.3, 0.55);
      bolts.push({ pts: bolt(fx, fy, fx + Math.cos(a) * l, fy + Math.sin(a) * l, l * 0.25, 4), width: width * 0.6, life, max: life });
    }
  }

  return {
    update(dt, env) {
      t += dt;
      const h = pickHand(env.hands, 'palm');
      if (h) { pos = { ...h.palm }; size = h.size; }
      else if (!pos) pos = { x: env.W / 2, y: env.H / 2 };
      flash = Math.max(0, flash - dt * 3);
      for (const b of bolts) b.life -= dt;
      for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].life <= 0) bolts.splice(i, 1);

      crackle -= dt;
      if (crackle <= 0) {
        crackle = rand(0.025, 0.06);
        const n = env.low ? 2 : 3;
        for (let i = 0; i < n; i++) { // arcs leaping out of the palm
          const a = rand(TAU), r = size * rand(1.2, 2.8);
          addBolt(pos.x, pos.y, pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r, size * 0.05, rand(0.05, 0.11));
        }
        if (h) { // arcs running off the fingertips
          for (const tip of [4, 8, 12, 16, 20]) {
            if (Math.random() < 0.5) continue;
            const p = h.pts[tip];
            const dx = p.x - pos.x, dy = p.y - pos.y, d = Math.hypot(dx, dy) || 1;
            const r = size * rand(0.6, 1.5), a = Math.atan2(dy, dx) + rand(-0.6, 0.6);
            addBolt(p.x, p.y, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, size * 0.035, rand(0.04, 0.09));
            if (d > 0 && Math.random() < 0.3) addBolt(pos.x, pos.y, p.x, p.y, size * 0.04, 0.05);
          }
          const speed = Math.hypot(h.vel.x, h.vel.y);
          if (speed > size * 5 && trail.length) { // slash: lightning bridges the path the hand just took
            const old = trail[0];
            addBolt(old.x, old.y, pos.x, pos.y, size * 0.07, 0.14);
            flash = Math.max(flash, 0.25);
          }
        }
        if (Math.random() < 0.035) { // now and then a big strike to the edge of the frame
          const a = rand(TAU), r = Math.max(env.W, env.H);
          addBolt(pos.x, pos.y, pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r, size * 0.08, 0.16);
          flash = 0.5;
          env.sounds.play('lightning', { volume: 0.6, rate: rand(0.8, 1.2) });
        }
        for (let i = 0; i < 2; i++) sparks.push({ x: pos.x, y: pos.y, vx: rand(-1, 1) * size * 6, vy: rand(-1.2, 0.4) * size * 6, life: rand(0.25, 0.6) });
      }
      trail.push({ ...pos });
      if (trail.length > 7) trail.shift();
      for (const s of sparks) { s.vy += size * 22 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    },

    draw(g, env) {
      if (!pos) return;
      g.save();
      g.fillStyle = 'rgba(2,6,22,0.5)'; // darken the room so the light reads
      g.fillRect(0, 0, env.W, env.H);
      g.globalCompositeOperation = 'lighter';
      const pulse = 0.85 + 0.15 * Math.sin(t * 40);
      glow(g, blue, pos.x, pos.y, size * 3.4 * pulse, 0.75);
      glow(g, white, pos.x, pos.y, size * 1.1 * pulse, 0.9);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const b of bolts) {
        const a = clamp(b.life / b.max);
        g.beginPath();
        g.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 1; i < b.pts.length; i++) g.lineTo(b.pts[i][0], b.pts[i][1]);
        g.globalAlpha = a * 0.4; g.strokeStyle = 'rgb(60,130,255)'; g.lineWidth = b.width * 4.5; g.stroke();
        g.globalAlpha = a * 0.85; g.strokeStyle = 'rgb(160,210,255)'; g.lineWidth = b.width * 1.8; g.stroke();
        g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, b.width * 0.7); g.stroke();
      }
      for (const s of sparks) glow(g, white, s.x, s.y, size * 0.09, s.life * 2.5);
      if (flash > 0) { g.globalAlpha = flash * 0.5; g.fillStyle = 'rgb(190,220,255)'; g.fillRect(0, 0, env.W, env.H); }
      g.restore();
    },
  };
}
