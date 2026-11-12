// Fire stream: flame pours out of the hand in the direction the fingers point.
import { clamp, rand, glowSprite, glow, pickHand } from './util.js';

export function create(env) {
  const hot = glowSprite('255,244,200', 0.3);
  const orange = glowSprite('255,140,30');
  const red = glowSprite('220,40,10');
  const MAX = env.low ? 220 : 480;
  const parts = [];
  const embers = [];
  let origin = null, aim = { x: 0, y: -1 }, size = Math.min(env.W, env.H) * 0.1, t = 0, roar = 0;
  env.sounds.play('fire', { volume: 1 });

  return {
    update(dt, env) {
      t += dt;
      const h = pickHand(env.hands, 'blade');
      if (h) {
        size = h.size;
        // Straight fingers give the best aim; otherwise use the direction the whole hand points.
        const tips = h.sign === 'spike' || h.sign === 'horns' ? [8] : [8, 12];
        let tx = 0, ty = 0;
        for (const i of tips) { tx += h.pts[i].x; ty += h.pts[i].y; }
        tx /= tips.length; ty /= tips.length;
        const folded = h.sign === 'fist' || !h.sign;
        origin = folded ? { x: h.palm.x + h.dir.x * size * 0.5, y: h.palm.y + h.dir.y * size * 0.5 } : { x: tx, y: ty };
        let ax = folded ? h.dir.x : tx - h.pts[5].x, ay = folded ? h.dir.y : ty - h.pts[5].y;
        const al = Math.hypot(ax, ay) || 1;
        aim = { x: ax / al, y: ay / al };
        const n = env.low ? 4 : 8;
        for (let i = 0; i < n && parts.length < MAX; i++) {
          const spread = rand(-0.22, 0.22), c = Math.cos(spread), s = Math.sin(spread);
          const sp = size * rand(7, 12);
          parts.push({
            x: origin.x + rand(-1, 1) * size * 0.1, y: origin.y + rand(-1, 1) * size * 0.1,
            vx: (aim.x * c - aim.y * s) * sp + h.vel.x * 0.3, vy: (aim.x * s + aim.y * c) * sp + h.vel.y * 0.3,
            life: 0, max: rand(0.45, 0.95), r: rand(0.35, 0.6),
          });
        }
        if (Math.random() < 0.5) embers.push({ x: origin.x, y: origin.y, vx: aim.x * size * rand(4, 9) + rand(-1, 1) * size * 3, vy: aim.y * size * rand(4, 9) + rand(-1, 1) * size * 3, life: rand(0.8, 1.6) });
        roar -= dt;
        if (roar <= 0) { roar = rand(1.3, 1.9); env.sounds.play('fire', { volume: 0.55, rate: rand(0.85, 1.1) }); }
      }
      for (const p of parts) {
        p.life += dt;
        p.vy -= size * 5 * dt; // flames rise
        p.vx *= 1 - 1.2 * dt; p.vy *= 1 - 1.2 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life >= parts[i].max) parts.splice(i, 1);
      for (const e of embers) { e.vy -= size * 3 * dt; e.x += e.vx * dt + Math.sin(t * 9 + e.life * 7) * size * 0.02; e.y += e.vy * dt; e.life -= dt; }
      for (let i = embers.length - 1; i >= 0; i--) if (embers[i].life <= 0) embers.splice(i, 1);
    },

    draw(g, env) {
      g.save();
      g.fillStyle = 'rgba(20,4,0,0.38)';
      g.fillRect(0, 0, env.W, env.H);
      g.globalCompositeOperation = 'lighter';
      if (origin && env.hands.length) glow(g, orange, origin.x, origin.y, size * 2.2, 0.5 + 0.15 * Math.sin(t * 30));
      for (const p of parts) { // old flame first (red, big), young flame last (white, small)
        const f = p.life / p.max;
        const r = size * p.r * (0.6 + f * 2.2);
        if (f > 0.45) glow(g, red, p.x, p.y, r, (1 - f) * 0.9);
        else if (f > 0.15) glow(g, orange, p.x, p.y, r, 0.6);
      }
      for (const p of parts) {
        const f = p.life / p.max;
        if (f <= 0.3) glow(g, hot, p.x, p.y, size * p.r * (0.5 + f * 1.6), 0.8 * (1 - f * 2));
      }
      for (const e of embers) glow(g, hot, e.x, e.y, size * 0.07, clamp(e.life));
      g.restore();
    },
  };
}
