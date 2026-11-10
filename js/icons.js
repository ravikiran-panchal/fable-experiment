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

// A small original emblem for each jutsu card.
const GLYPHS = {
  sphere: '<circle cx="24" cy="24" r="17"/><path d="M12 24a12 7 0 0 1 24 0M17 14a9 14 30 0 1 15 20M15 31a13 6 -30 0 0 20-12" fill="none"/>',
  lightning: '<path d="M28 3 9 27h12l-4 18 22-27H26z"/>',
  eye: '<path d="M3 24Q24 4 45 24 24 44 3 24z"/><circle cx="24" cy="24" r="8" fill="#12100e"/>',
  sand: '<path d="M4 40Q24-6 44 40z"/><path d="M12 40q12-14 24 0" fill="none"/>',
  panda: '<circle cx="11" cy="11" r="7" fill="#12100e"/><circle cx="37" cy="11" r="7" fill="#12100e"/><circle cx="24" cy="26" r="18"/><ellipse cx="17" cy="24" rx="4" ry="5.5" fill="#12100e"/><ellipse cx="31" cy="24" rx="4" ry="5.5" fill="#12100e"/>',
  fire: '<path d="M24 3c3 9 14 14 14 26a14 14 0 0 1-28 0c0-7 4-10 6-15 2 4 3 6 5 6 2-4 1-10 3-17z"/>',
};
export function jutsuGlyph(id) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${GLYPHS[id] || ''}</svg>`;
}
