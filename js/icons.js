// Original hand-sign icons, drawn as SVG from the same finger patterns the recogniser uses.

const SHAPES = { palm: [1, 1, 1, 1], fist: [0, 0, 0, 0], blade: [1, 1, 0, 0], spike: [1, 0, 0, 0], horns: [1, 0, 0, 1] };
const LENGTHS = [21, 24, 21, 16]; // index, middle, ring, little

function hand(shape, dx = 0, flip = false) {
  let s = `<g transform="translate(${dx} 0)${flip ? ' translate(48 0) scale(-1 1)' : ''}">`;
  s += '<rect x="11" y="27" width="26" height="23" rx="8"/>';
  s += '<rect x="3" y="29" width="7" height="15" rx="3.5" transform="rotate(-28 9 42)"/>'; // thumb
  shape.forEach((up, i) => {
    const h = up ? LENGTHS[i] : 6;
    s += `<rect x="${11.5 + i * 6.5}" y="${30 - h}" width="5.5" height="${h + 4}" rx="2.75"/>`;
  });
  return s + '</g>';
}

export function signIcon(sign) {
  if (sign === 'gate') {
    return `<svg viewBox="0 0 100 56" aria-hidden="true">${hand(SHAPES.palm, 0)}${hand(SHAPES.palm, 52, true)}</svg>`;
  }
  return `<svg viewBox="0 0 48 56" aria-hidden="true">${hand(SHAPES[sign] || SHAPES.fist)}</svg>`;
}

// Screen-space 21-point hand for the no-camera practice mode (same point order as the tracker).
// Units: 1 = distance from wrist to middle knuckle.
export function templateHand(sign) {
  const shape = SHAPES[sign] || SHAPES.palm;
  const pts = [[0, 0.95], [-0.45, 0.6], [-0.75, 0.35], [-0.95, 0.1], [-1.05, -0.15]];
  const bases = [[-0.36, 0.02], [-0.1, -0.05], [0.15, 0], [0.38, 0.12]];
  const lens = [1.0, 1.12, 1.0, 0.75];
  bases.forEach(([x, y], i) => {
    pts.push([x, y]);
    if (shape[i]) {
      const L = lens[i];
      const lean = (x - 0.02) * 0.18;
      pts.push([x + lean * 0.45, y - L * 0.45], [x + lean * 0.75, y - L * 0.75], [x + lean, y - L]);
    } else {
      pts.push([x, y - 0.24], [x, y - 0.08], [x, y + 0.12]);
    }
  });
  return pts;
}
