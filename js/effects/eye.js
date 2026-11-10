// Eye awakening: an original four-blade crimson iris is drawn onto the visitor's real eyes, clipped
// to the eyelids so blinking hides it naturally. If no face is found it shows two large spirit eyes.
import { TAU, clamp, glowSprite, glow } from './util.js';

// Face-mesh point numbers. Iris: centre then four rim points. Lids: the outline of each eye opening.
const EYES = [
  { c: 468, rim: [469, 470, 471, 472], lid: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246] },
  { c: 473, rim: [474, 475, 476, 477], lid: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398] },
];

function iris(g, x, y, r, spin, open) {
  g.save();
  g.translate(x, y);
  const grad = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ff6a3d');
  grad.addColorStop(0.55, '#d8001f');
  grad.addColorStop(1, '#4a000c');
  g.globalAlpha = 0.9 * open;
  g.fillStyle = grad;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.globalAlpha = open;
  g.strokeStyle = 'rgba(20,0,4,0.9)';
  g.lineWidth = r * 0.09;
  g.beginPath(); g.arc(0, 0, r * 0.96, 0, TAU); g.stroke();
  g.lineWidth = r * 0.05;
  g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.stroke();
  g.fillStyle = '#12000a';
  const L = r * 0.34 * open, Wd = r * 0.11;
  for (let k = 0; k < 4; k++) { // four curved blades riding the inner ring
    g.save();
    g.rotate(spin + (k * TAU) / 4);
    g.translate(r * 0.6, 0);
    g.beginPath();
    g.moveTo(0, -L);
    g.quadraticCurveTo(Wd * 1.6, -L * 0.2, 0, L * 0.55);
    g.quadraticCurveTo(-Wd * 0.9, -L * 0.1, 0, -L);
    g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, r * 0.24, 0, TAU); g.fill();
  g.globalAlpha = 0.45 * open;
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(-r * 0.3, -r * 0.32, r * 0.09, 0, TAU); g.fill();
  g.restore();
}

export function create(env) {
  const red = glowSprite('255,30,30');
  let t = 0, spin = 0, seen = false;
  env.sounds.play('eye', { volume: 1 });

  const fx = {
    videoFilter: 'contrast(1.2) saturate(0.7) brightness(0.85)',
    hint: '',
    update(dt, env) {
      t += dt;
      spin += dt * (0.9 + 16 * Math.exp(-t * 1.8)); // whips round, then settles to a slow turn
      if (env.face) seen = true;
      fx.hint = env.face || env.sim ? '' : seen ? 'Face lost. Look at the camera.' : 'Looking for your face...';
    },
    draw(g, env) {
      const { W, H } = env;
      const open = clamp(t / 0.5);
      g.save();
      const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      vig.addColorStop(0, 'rgba(60,0,0,0)');
      vig.addColorStop(1, `rgba(90,0,0,${0.55 + 0.1 * Math.sin(t * 2.2)})`);
      g.fillStyle = vig;
      g.fillRect(0, 0, W, H);

      if (env.face) {
        for (const e of EYES) {
          const c = env.face[e.c];
          let r = 0;
          for (const i of e.rim) r += Math.hypot(env.face[i].x - c.x, env.face[i].y - c.y);
          r = (r / 4) * 1.08;
          g.save();
          g.globalCompositeOperation = 'lighter';
          glow(g, red, c.x, c.y, r * 4, 0.35 * open);
          g.restore();
          g.save();
          g.beginPath();
          e.lid.forEach((i, n) => (n ? g.lineTo(env.face[i].x, env.face[i].y) : g.moveTo(env.face[i].x, env.face[i].y)));
          g.closePath();
          g.clip();
          iris(g, c.x, c.y, r, spin, open);
          g.restore();
        }
      } else { // no face: two large eyes open in the dark
        const r = Math.min(W, H) * 0.085, gap = r * 2.7, y = H * 0.4;
        g.fillStyle = `rgba(0,0,0,${0.45 * open})`;
        g.fillRect(0, 0, W, H);
        for (const sx of [-1, 1]) {
          const x = W / 2 + sx * gap * 0.75;
          g.save();
          g.globalCompositeOperation = 'lighter';
          glow(g, red, x, y, r * 4.5, 0.4 * open);
          g.restore();
          g.save();
          g.beginPath();
          g.moveTo(x - r * 2, y);
          g.quadraticCurveTo(x, y - r * 1.9 * open, x + r * 2, y);
          g.quadraticCurveTo(x, y + r * 1.5 * open, x - r * 2, y);
          g.clip();
          g.fillStyle = '#efe6df';
          g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
          iris(g, x, y, r, spin * sx, open);
          g.restore();
        }
      }
      if (t < 0.35) { g.globalAlpha = 1 - t / 0.35; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
      g.restore();
    },
  };
  return fx;
}
