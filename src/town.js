// New places for chapter one: Inn Hotaru, the academy, the riverside fire pit and the job board.
// All of it is built from code into the village's own batches, like the rest of Kagaribi.
import * as THREE from 'three';
import { GEO, toon, TAU } from './util.js';
import { ELEMENTS } from './jutsu-list.js';

const WOOD = 0x6a442c, DARK = 0x3d281b, PLASTER = 0xefe4cc, STONE = 0x9a968c, RED = 0xb8322c;
const hexs = (c) => '#' + c.toString(16).padStart(6, '0');

// Lots that the random houses must leave empty: [x0, x1, z0, z1].
export const TOWN_LOTS = [[7.5, 28.5, 44.5, 61.5], [45, 75, -18.5, -1.5]];
export const FIRE_GAP = [11, 29]; // cherry trees are skipped here, on the south bank, for the bonfire

function board(text, w, h, o = {}) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
  const g = cv.getContext('2d');
  g.fillStyle = o.bg || '#2a1a12'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = o.edge || '#e0b040'; g.lineWidth = 6; g.strokeRect(8, 8, cv.width - 16, cv.height - 16);
  g.fillStyle = o.fg || '#f6e7c4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${o.size || 54}px "Dela Gothic One", "Arial Black", sans-serif`; g.fillText(text, 256, cv.height / 2 + 4);
  o.draw?.(g, cv);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

export function buildTown(w, POI) {
  const T = (w.town = {});
  // An axis-aligned wall with a thin collider.
  const wall = (xa, za, xb, zb, h, color = PLASTER) => {
    const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    w.b(color, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, Math.max(0.36, x1 - x0), h, Math.max(0.36, z1 - z0));
    w.b(WOOD, (x0 + x1) / 2, h - 0.15, (z0 + z1) / 2, Math.max(0.42, x1 - x0), 0.3, Math.max(0.42, z1 - z0));
    w.box(x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, h, { kind: 'inner', color });
  };
  const post = (x, z, h, r = 0.2) => { w.b(WOOD, x, h / 2, z, r * 2, h, r * 2); w.posts.push({ x, z, r: r + 0.1, h }); };

  // ------------------------------------------------------------ Inn Hotaru (open to the main street, west side)
  {
    const x0 = 8.5, x1 = 27, z0 = 45.5, z1 = 60.5, h = 4.2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    w.b(0x8a8478, cx, 0.02, cz, x1 - x0 + 0.8, 0.06, z1 - z0 + 0.8);
    w.b(0x9a7448, (x0 + 17) / 2, 0.05, cz, 17 - x0, 0.04, z1 - z0);       // lobby floorboards
    w.b(0xb9b47a, 22, 0.05, 49.75, 10, 0.04, 8.5);                         // tatami in the room
    w.b(0x7c7f86, 22, 0.05, 57.25, 10, 0.04, 6.5);                         // bath tiles
    wall(x1, z0, x1, z1, h); wall(x0, z0, x1, z0, h); wall(x0, z1, x1, z1, h);
    wall(17, z0, 17, 47, h); wall(17, 49.6, 17, z1, h);                    // lobby | rooms, with a doorway
    wall(17, 54, 19, 54, h); wall(21.6, 54, x1, 54, h);                    // room | bath, with a doorway
    for (const z of [z0, cz, z1]) post(x0, z, h, 0.22);
    w.b(WOOD, x0, h - 0.2, cz, 0.4, 0.4, z1 - z0);
    w.gableRoof(0x3a549a, cx, cz, x1 - x0, z1 - z0, h, 2.6, 1.5, 'x');
    w.box(x0, x1, z0, z1, h, { y0: h - 0.3, roof: 'gable', rh: 2.6, ov: 1.5, axis: 'x', kind: 'innroof', color: 0x3a549a });
    for (let i = 0; i < 6; i++) w.b(i % 2 ? 0x8a2f3a : 0x9a3a44, x0 - 0.05, h - 0.85, z0 + 1.9 + i * 2.25, 0.06, 0.9, 2.0); // noren
    w.lantern(x0 - 0.6, 2.6, z0 - 0.2, 0xffb45a, 1.5); w.lantern(x0 - 0.6, 2.6, z1 + 0.2, 0xffb45a, 1.5);
    const sign = board('INN HOTARU', 7.2, 1.7, { size: 60 });
    sign.position.set(x0 - 1.72, h + 1.15, cz); sign.rotation.y = -Math.PI / 2; w.group.add(sign);
    w.b(DARK, x0 - 1.64, h + 1.15, cz, 0.12, 1.9, 7.5);
    for (const z of [cz - 3.2, cz + 3.2]) w.b(DARK, x0 - 1.3, h + 0.35, z, 0.14, 1.6, 0.14);
    // reception
    w.b(0x9a6a40, 14.6, 0.55, 53, 0.9, 1.1, 5.2, 0, 0xb07c4c); w.b(0x5a3824, 14.6, 1.13, 53, 1.15, 0.1, 5.5);
    w.box(14.1, 15.1, 50.4, 55.6, 1.15, { kind: 'counter', color: 0x9a6a40 });
    w.b(DARK, 16.75, 2.2, 53, 0.1, 1.5, 3.2);
    for (let i = 0; i < 8; i++) w.LN.add(GEO.box, i === 2 ? 0x55504a : 0xe0b040, 16.68, 1.8 + Math.floor(i / 4) * 0.6, 51.9 + (i % 4) * 0.72, 0.06, 0.26, 0.12); // room keys
    w.b(0x7a5232, 10.4, 0.25, 47.2, 1.6, 0.5, 0.7); w.b(0x7a5232, 10.4, 0.25, 58.8, 1.6, 0.5, 0.7); // benches
    // the room
    w.b(0xf2ead8, 23.2, 0.14, 50, 1.4, 0.18, 2.5); w.b(0x2e4a8a, 23.2, 0.2, 50.45, 1.5, 0.16, 1.7); w.b(0xfdf6e3, 23.2, 0.28, 48.95, 0.7, 0.14, 0.36);
    w.b(0x6a442c, 19.6, 0.3, 46.8, 1.3, 0.1, 0.9); for (const sx of [-0.5, 0.5]) w.b(DARK, 19.6 + sx, 0.14, 46.8, 0.1, 0.28, 0.7);
    w.LN.add(GEO.box, 0xffd08a, 26.2, 0.55, 46.4, 0.5, 0.8, 0.5); w.b(DARK, 26.2, 0.08, 46.4, 0.6, 0.12, 0.6);
    w.onWall('w', 26.78, 49.75, 0, 0, 0, 2.2, 2.4, 1.5, 0.12, 0xfff0c8, w.GL);
    // the bath
    w.cyl(0x8a5a3a, 23.5, 0.48, 57.3, 1.55, 0.96, 0xa87448); w.cyl(0x3d281b, 23.5, 0.3, 57.3, 1.62, 0.1); w.cyl(0x3d281b, 23.5, 0.75, 57.3, 1.62, 0.1);
    w.posts.push({ x: 23.5, z: 57.3, r: 1.6, h: 0.96 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xa8e0f0, transparent: true, opacity: 0.8 }));
    water.position.set(23.5, 0.975, 57.3); w.group.add(water);
    w.steam.push(new THREE.Vector3(23.5, 1.2, 57.3), new THREE.Vector3(23.9, 1.2, 57.0));
    w.cyl(0x8a5a3a, 19.3, 0.2, 58.9, 0.3, 0.4); w.cyl(0x9a6f45, 20.2, 0.18, 59.3, 0.28, 0.36);
    T.innLight = new THREE.PointLight(0xffc27a, 16, 26, 1.6); T.innLight.position.set(19, 3.3, 53); w.group.add(T.innLight);
    POI.innDesk = new THREE.Vector3(13.2, 0, 53); POI.innkeeper = new THREE.Vector3(16, 0, 53);
    POI.futon = new THREE.Vector3(23.2, 0, 50); POI.bath = new THREE.Vector3(23.5, 0, 57.3); POI.inn = new THREE.Vector3(x0 - 2, 0, cz);
  }

  // ------------------------------------------------------------ The academy (open to the north, facing the training ground)
  {
    const x0 = 48, x1 = 72, z0 = -17, z1 = -5, h = 4.4, cx = 60, cz = -11;
    w.b(0x8a8478, cx, 0.02, cz, x1 - x0 + 0.8, 0.06, z1 - z0 + 0.8); w.b(0xa98558, cx, 0.05, cz, x1 - x0, 0.04, z1 - z0);
    wall(x0, z1, x1, z1, h); wall(x0, z0, x0, z1, h); wall(x1, z0, x1, z1, h);
    for (let x = x0; x <= x1; x += 6) post(x, z0, h, 0.22);
    w.b(WOOD, cx, h - 0.2, z0, x1 - x0, 0.4, 0.4);
    w.gableRoof(0x93344a, cx, cz, x1 - x0, z1 - z0, h, 2.8, 1.5, 'x');
    w.box(x0, x1, z0, z1, h, { y0: h - 0.3, roof: 'gable', rh: 2.8, ov: 1.5, axis: 'x', kind: 'innroof', color: 0x93344a });
    // the blackboard: the six elements, as every first-year learns them
    const bb = board('', 9.6, 3, { bg: '#1f3a30', edge: '#9a6a40', draw: (g, cv) => {
      const H = cv.height;
      g.font = '900 20px "Dela Gothic One", "Arial Black", sans-serif'; g.fillStyle = '#e8f0e4'; g.fillText('THE SIX ELEMENTS', 256, 26);
      const ids = ['water', 'earth', 'air', 'fire', 'space'];
      ids.forEach((id, i) => {
        const a = -Math.PI / 2 + i / 5 * TAU, x = 256 + Math.cos(a) * 150, y = H / 2 + 12 + Math.sin(a) * 50;
        g.strokeStyle = 'rgba(232,240,228,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(256, H / 2 + 12); g.lineTo(x, y); g.stroke();
        g.fillStyle = hexs(ELEMENTS[id].color); g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill();
        g.fillStyle = '#e8f0e4'; g.font = '700 15px "Zen Maru Gothic", sans-serif'; g.fillText(ELEMENTS[id].name, x + (Math.cos(a) > 0.3 ? 46 : Math.cos(a) < -0.3 ? -46 : 0), y + (Math.abs(Math.cos(a)) > 0.3 ? 0 : -24));
      });
      g.setLineDash([5, 4]); g.strokeStyle = '#f2ecff'; g.lineWidth = 3; g.beginPath(); g.arc(256, H / 2 + 12, 19, 0, TAU); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#f2ecff'; g.font = '700 14px "Zen Maru Gothic", sans-serif'; g.fillText('Ether ?', 256, H / 2 + 12);
    } });
    bb.position.set(cx, 2.5, z1 - 0.24); bb.rotation.y = Math.PI; w.group.add(bb);
    w.b(DARK, cx, 2.5, z1 - 0.2, 10, 3.3, 0.06); w.b(0x9a6a40, cx, 0.95, z1 - 0.45, 9.6, 0.08, 0.3);
    w.b(0x8a6a48, cx, 0.1, -7.2, 12, 0.16, 3.2);                           // teacher's step
    w.b(0x7a5232, cx + 3.4, 0.6, -7.4, 1.8, 0.9, 0.8);                    // teacher's desk
    w.posts.push({ x: cx + 3.4, z: -7.4, r: 0.9, h: 1.1 });
    T.desks = [];
    for (const z of [-9.8, -12, -14.2]) for (const x of [54, 58, 62, 66]) {
      w.b(0x9a6a40, x, 0.6, z, 1.5, 0.08, 0.7); for (const sx of [-0.62, 0.62]) w.b(DARK, x + sx, 0.3, z, 0.08, 0.6, 0.6);
      const mine = x === 66 && z === -14.2, sh = mine ? 0.69 : 0.44;
      w.cyl(DARK, x, sh / 2, z - 0.75, 0.06, sh); w.cyl(0x2f6f9a, x, sh + 0.03, z - 0.75, 0.26, 0.1);
      w.posts.push({ x, z, r: 0.62, h: 0.66 });
      T.desks.push({ x, z: z - 0.75 });
    }
    for (const x of [50.5, 69.5]) { w.cyl(WOOD, x, 2.6, z0 - 2.4, 0.1, 5.2); w.b(x < 60 ? 0x2e4a8a : RED, x + 0.55, 4.2, z0 - 2.4, 1.0, 1.9, 0.06); w.posts.push({ x, z: z0 - 2.4, r: 0.2, h: 5 }); }
    const gate = board('KAGARIBI ACADEMY', 8.4, 1.3, { size: 44 });
    gate.position.set(cx, 4.0, z0 - 2.36); gate.rotation.y = Math.PI; w.group.add(gate);
    w.b(DARK, cx, 4.0, z0 - 2.3, 8.7, 1.5, 0.08);
    for (const sx of [-4.2, 4.2]) { w.cyl(RED, cx + sx, 2.4, z0 - 2.3, 0.16, 4.8); w.posts.push({ x: cx + sx, z: z0 - 2.3, r: 0.25, h: 4.8 }); }
    POI.academy = new THREE.Vector3(cx, 0, z0 - 4); POI.seat = new THREE.Vector3(66, 0, -14.95); POI.teacher = new THREE.Vector3(cx, 0.16, -7.2);
  }

  // ------------------------------------------------------------ The fire pit on the south bank, and what the festival brings
  {
    const fx = 20, fz = 35.5;
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; w.B.add(GEO.ico, i % 2 ? 0x8f8b80 : 0x6f6d68, fx + Math.cos(a) * 1.35, 0.18, fz + Math.sin(a) * 1.35, 0.7, 0.5, 0.6, a, a * 2, 0); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; w.B.add(GEO.cyl6, i % 2 ? 0x5b3a2a : 0x4a2f22, fx + Math.cos(a) * 0.45, 0.8, fz + Math.sin(a) * 0.45, 0.3, 1.9, 0.3, Math.sin(a) * -0.5, 0, Math.cos(a) * 0.5); }
    w.cyl(0x2a2622, fx, 0.06, fz, 1.2, 0.1);
    w.posts.push({ x: fx, z: fz, r: 1.5, h: 1.2 });
    for (const z of [fz - 2.6, fz + 2.6]) w.b(0x6a4a30, 13.6, 0.24, z, 0.6, 0.48, 3.0, 0, 0x8a6a48);
    for (const [x, z] of [[12.4, 30.9], [27.6, 30.9], [12.4, 41.6], [27.6, 41.6]]) { w.cyl(DARK, x, 1.7, z, 0.09, 3.4); w.lantern(x, 3.5, z, 0xff8a3c, 1.1); w.posts.push({ x, z, r: 0.2, h: 3.4 }); }
    T.fireLight = new THREE.PointLight(0xff8a3a, 0, 46, 1.4); T.fireLight.position.set(fx, 2.4, fz); w.group.add(T.fireLight);
    // festival-only props
    const g = (T.festival = new THREE.Group()); g.visible = false; w.group.add(g);
    const mk = (geo, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, toon(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    mk(GEO.cyl, 0x8a3a2a, 25.4, 1.3, fz, 1.5, 1.1, 1.5, 0, 0, Math.PI / 2);                 // taiko body
    for (const s of [-1, 1]) mk(GEO.cyl, 0xf2e6cf, 25.4 + s * 0.56, 1.3, fz, 1.44, 0.04, 1.44, 0, 0, Math.PI / 2); // skins
    for (const s of [-1, 1]) { mk(GEO.box, DARK, 25.4, 0.35, fz + s * 0.6, 1.3, 0.7, 0.14); mk(GEO.box, DARK, 25.4, 0.72, fz + s * 0.6, 1.5, 0.12, 0.2); }
    for (const [x, z] of [[13.2, 40.2], [14.4, 40.9]]) { mk(GEO.cyl, 0x7a5232, x, 0.55, z, 1.0, 1.1, 1.0); mk(GEO.cyl, 0x3d281b, x, 0.3, z, 1.05, 0.1, 1.05); mk(GEO.cyl, 0x3d281b, x, 0.85, z, 1.05, 0.1, 1.05); }
    for (let i = 0; i < 4; i++) mk(GEO.cyl, 0x9a6f45, 13.0 + (i % 2) * 0.34, 1.19, 40.0 + Math.floor(i / 2) * 0.34, 0.2, 0.18, 0.2);
    POI.bonfire = new THREE.Vector3(fx, 0, fz);
  }

  // ------------------------------------------------------------ The job board, north of the bridge
  {
    const x = 5.9, z = -7.5;
    for (const s of [-1, 1]) { w.cyl(WOOD, x, 1.3, z + s * 1.2, 0.09, 2.6); w.posts.push({ x, z: z + s * 1.2, r: 0.2, h: 2.6 }); }
    w.b(0x8a6a48, x, 1.6, z, 0.1, 1.5, 2.6); w.B.add(GEO.box, 0x4a5a72, x, 2.55, z, 0.7, 0.12, 3.0, 0, 0, 0.2);
    const notes = board('WORK', 2.4, 1.35, { bg: '#b8946a', edge: '#6a442c', fg: '#3d281b', size: 40, draw: (g, cv) => {
      const cols = ['#f6ecd9', '#f2d9a0', '#e8f0e4', '#f6ecd9'];
      [[40, 96, 120, 110], [180, 130, 130, 120], [330, 100, 140, 150], [70, 220, 150, 50]].forEach(([nx, ny, nw, nh], i) => { g.fillStyle = cols[i]; g.fillRect(nx, ny, nw, nh); g.fillStyle = '#6a442c'; for (let k = 0; k < 4; k++) g.fillRect(nx + 12, ny + 18 + k * 20, nw - 24 - (k % 2) * 30, 5); });
    } });
    notes.position.set(x - 0.07, 1.6, z); notes.rotation.y = -Math.PI / 2; w.group.add(notes);
    POI.jobBoard = new THREE.Vector3(x - 1.6, 0, z);
  }
}

// Things a character can hold. Returns the meshes so they can be taken away again.
export function giveProp(char, kind) {
  const J = char.J, out = [];
  const add = (joint, geo, color, pos, scale, rot = [0, 0, 0]) => { const m = new THREE.Mesh(geo, toon(color)); m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot); m.castShadow = true; joint.add(m); out.push(m); return m; };
  if (kind === 'sticks') for (const el of [J.elL, J.elR]) add(el, GEO.cyl6, 0xe8d6b0, [0, -0.3, 0.2], [0.035, 0.46, 0.035], [Math.PI / 2, 0, 0]);
  else if (kind === 'shamisen') {
    const g = new THREE.Group(); g.position.set(-0.04, 0.2, 0.25); g.rotation.z = -0.95; J.spine.add(g); out.push(g);
    const p = (geo, color, y, s) => { const m = new THREE.Mesh(geo, toon(color)); m.position.y = y; m.scale.set(...s); g.add(m); };
    p(GEO.box, 0x3d281b, 0, [0.25, 0.25, 0.08]); p(GEO.box, 0xf6ecd9, 0, [0.2, 0.2, 0.09]); p(GEO.box, 0x3d281b, 0.5, [0.035, 0.8, 0.03]); p(GEO.box, 0xe0b040, 0.88, [0.11, 0.04, 0.03]);
  } else if (kind === 'flute') add(J.head, GEO.cyl6, 0xc9a86a, [0, -0.13, 0.3], [0.045, 0.56, 0.045], [-0.3, 0, 0]);
  else if (kind === 'mug') add(J.elR, GEO.cyl, 0x9a6f45, [0, -0.33, 0.07], [0.1, 0.11, 0.1]);
  char.props = (char.props || []).concat(out);
}
export function takeProps(char) { for (const m of char.props || []) m.parent?.remove(m); char.props = []; }
