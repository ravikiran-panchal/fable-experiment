// Spiral energy sphere: sits on the open palm, compresses in a fist, bursts when the hand reopens.
import { TAU, clamp, lerp, rand, easeOutBack, glowSprite, glow, pickHand } from './util.js';

export function create(env) {
  const deep = glowSprite('40,100,255');
  const cyan = glowSprite('110,200,255');
  const white = glowSprite('255,255,255', 0.3);
  const wisps = Array.from({ length: env.low ? 36 : 80 }, () => ({ a: rand(TAU), r: rand(0.2, 2.2), w: rand(3, 7), s: rand(0.5, 1.2) }));
  let pos = null, baseR = Math.min(env.W, env.H) * 0.1, R = 0, grow = 0, power = 1, spin = 0, burst = 0, wasFist = false;
  env.sounds.play('sphere', { volume: 0.9 });

  return {
    update(dt, env) {
      const h = pickHand(env.hands, 'palm');
      if (h) {
        const target = { x: h.palm.x + h.dir.x * h.size * 0.2, y: h.palm.y + h.dir.y * h.size * 0.2 };
        pos = pos ? { x: lerp(pos.x, target.x, clamp(dt * 18)), y: lerp(pos.y, target.y, clamp(dt * 18)) } : target;
        baseR = lerp(baseR, h.size * 0.9, clamp(dt * 6));
        const fist = h.sign === 'fist';
        if (wasFist && h.sign === 'palm') { burst = 1; env.sounds.play('cast', { volume: 0.7, rate: 0.8 }); }
        if (h.sign === 'fist' || h.sign === 'palm') wasFist = fist;
        power = lerp(power, fist ? 0.4 : 1, clamp(dt * 7));
      } else if (!pos) pos = { x: env.W / 2, y: env.H / 2 };
      grow = Math.min(1, grow + dt / 0.9);
      R = baseR * easeOutBack(grow) * power * (1 + burst * 0.35);
      spin += dt * (5 + 5 * power);
      burst = Math.max(0, burst - dt * 1.5);
      for (const w of wisps) {
        w.a += w.w * dt;
        w.r -= w.s * dt * 1.4;
        if (w.r < 0.15) { w.r = rand(1.5, 2.3); w.a = rand(TAU); }
      }
    },

    draw(g) {
      if (!pos || R <= 0) return;
      g.save();
      g.globalCompositeOperation = 'lighter';
      glow(g, deep, pos.x, pos.y, R * 3.4, 0.55);
      glow(g, cyan, pos.x, pos.y, R * 1.9, 0.9);
      // air being dragged into the sphere
      for (const w of wisps) {
        const x = pos.x + Math.cos(w.a) * R * w.r, y = pos.y + Math.sin(w.a) * R * w.r * 0.92;
        glow(g, cyan, x, y, R * 0.11 * (2.4 - w.r), 0.7 * clamp(2.3 - w.r));
      }
      glow(g, white, pos.x, pos.y, R * 1.05, 0.95);
      // spinning shells: ellipses at changing tilt read as a rotating ball
      g.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const dir = k % 2 ? 1 : -0.8;
        g.save();
        g.translate(pos.x, pos.y);
        g.rotate(spin * dir * (0.6 + k * 0.12) + k * 1.3);
        g.scale(1, 0.3 + 0.65 * Math.abs(Math.sin(spin * 0.35 + k * 0.9)));
        g.beginPath();
        g.arc(0, 0, R * (0.42 + 0.08 * k), 0, 1.6 + (k % 3) * 0.7);
        g.globalAlpha = 0.75;
        g.strokeStyle = k % 3 ? 'rgba(190,230,255,1)' : 'rgba(255,255,255,1)';
        g.lineWidth = R * (0.035 + (k % 3) * 0.018);
        g.stroke();
        g.restore();
      }
      if (burst > 0) {
        g.globalAlpha = burst;
        g.strokeStyle = 'rgba(170,220,255,1)';
        g.lineWidth = R * 0.12 * burst;
        g.beginPath();
        g.arc(pos.x, pos.y, R * (1 + (1 - burst) * 3.2), 0, TAU);
        g.stroke();
      }
      g.restore();
    },
  };
}
