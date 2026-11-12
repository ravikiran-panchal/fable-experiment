// Sand guardian: thousands of grains rise into a dome with a watching eye. Open hands shove the sand,
// a fist gathers it, and grains left alone drift back into formation.
import { TAU, clamp, rand } from './util.js';

const SHADES = ['#f0d59a', '#d3ab66', '#a9803f'];
const PUSHERS = [0, 4, 8, 12, 16, 20, 9]; // wrist, fingertips, middle knuckle

export function create(env) {
  const N = env.low ? 1800 : 4200;
  const grain = 3;
  // Flat number arrays: much faster than thousands of small objects.
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const hx = new Float32Array(N), hy = new Float32Array(N), free = new Float32Array(N), phase = new Float32Array(N);
  let W = 0, H = 0, t = 0, rumble = 0;

  // Where every grain belongs: 78% in the dome arching over you, 22% in the guardian's eye.
  function layout(env) {
    W = env.W; H = env.H;
    const cx = W / 2, cy = H * 1.02, rx = W * 0.47, ry = H * 0.7;
    const ex = W / 2, ey = H * 0.17, ew = Math.min(W * 0.17, H * 0.2), eh = ew * 0.42;
    for (let i = 0; i < N; i++) {
      if (i < N * 0.78) {
        const a = Math.PI * rand(1.04, 1.96);
        const k = 1 - 0.11 * Math.random() ** 1.6; // denser at the outer rim
        hx[i] = cx + Math.cos(a) * rx * k;
        hy[i] = cy + Math.sin(a) * ry * k;
      } else if (i < N * 0.93) { // almond outline: two arcs
        const u = rand(-1, 1), top = Math.random() < 0.5 ? -1 : 1;
        hx[i] = ex + u * ew + rand(-2, 2);
        hy[i] = ey + top * eh * (1 - u * u) + rand(-2.5, 2.5);
      } else { // slit pupil
        const u = rand(-1, 1);
        hx[i] = ex + rand(-1, 1) * ew * 0.07 * (1 - u * u);
        hy[i] = ey + u * eh * 0.8;
      }
    }
  }

  layout(env);
  for (let i = 0; i < N; i++) { // start as a pile below the frame, so the sand visibly rises
    x[i] = rand(W); y[i] = H + rand(10, H * 0.5); phase[i] = rand(TAU);
  }
  env.sounds.play('sand', { volume: 1 });

  return {
    update(dt, env) {
      t += dt;
      if (env.W !== W || env.H !== H) layout(env);
      const push = [];
      for (const h of env.hands) {
        const fist = h.sign === 'fist';
        if (fist) push.push({ x: h.palm.x, y: h.palm.y, r: h.size * 3.2, fist, vx: h.vel.x, vy: h.vel.y });
        else for (const k of PUSHERS) push.push({ x: h.pts[k].x, y: h.pts[k].y, r: h.size * 0.75, fist, vx: h.vel.x, vy: h.vel.y });
      }
      let moved = 0;
      const damp = Math.exp(-2.6 * dt);
      for (let i = 0; i < N; i++) {
        for (const p of push) {
          const dx = x[i] - p.x, dy = y[i] - p.y, d2 = dx * dx + dy * dy;
          if (d2 > p.r * p.r) continue;
          const d = Math.sqrt(d2) || 1, f = 1 - d / p.r;
          if (p.fist) { // pull in and swirl around the fist
            vx[i] += ((-dx / d) * 2600 + (-dy / d) * 900) * f * dt + p.vx * f * dt * 3;
            vy[i] += ((-dy / d) * 2600 + (dx / d) * 900) * f * dt + p.vy * f * dt * 3;
          } else { // shove away, plus carry the hand's own motion
            vx[i] += (dx / d) * 5200 * f * dt + p.vx * f * dt * 9;
            vy[i] += (dy / d) * 5200 * f * dt + p.vy * f * dt * 9;
          }
          free[i] = 2.2;
          moved++;
        }
        if (free[i] > 0) { // loose sand: falls and rests on the floor for a moment
          free[i] -= dt;
          vy[i] += 520 * dt;
          vx[i] += (hx[i] - x[i]) * 0.25 * dt;
        } else { // formation: spring back home, with a slow breathing drift
          const wob = Math.sin(t * 1.3 + phase[i]) * 5;
          vx[i] += (hx[i] + wob - x[i]) * 7 * dt;
          vy[i] += (hy[i] + Math.cos(t * 1.1 + phase[i]) * 4 - y[i]) * 7 * dt;
        }
        vx[i] *= damp; vy[i] *= damp;
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        if (y[i] > H - 2 && free[i] > 0) { y[i] = H - 2; vy[i] *= -0.15; vx[i] *= 0.8; }
      }
      rumble -= dt;
      if (moved > N * 0.06 && rumble <= 0) { rumble = 0.9; env.sounds.play('sand', { volume: 0.45, rate: rand(0.8, 1.15) }); }
    },

    draw(g, env) {
      g.save();
      g.fillStyle = 'rgba(40,24,6,0.3)';
      g.fillRect(0, 0, env.W, env.H);
      const third = Math.ceil(N / 3);
      for (let s = 0; s < 3; s++) {
        g.fillStyle = SHADES[s];
        const end = Math.min(N, (s + 1) * third);
        for (let i = s * third; i < end; i++) g.fillRect(x[i], y[i], grain, grain);
      }
      g.restore();
    },
  };
}
