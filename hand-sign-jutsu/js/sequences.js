// Which signs trigger which jutsu, in library order. Labels live in names.js.
// Sign ids: palm, fist, blade, spike, horns (one hand) and gate (both hands open, apart).
// Rules kept by the tests: 2-3 signs each, no sign twice in a row, every sequence unique.

export const JUTSU_LIST = [
  { id: 'sphere', sequence: ['palm', 'fist', 'palm'], color: '#5ab8ff' },
  { id: 'lightning', sequence: ['spike', 'blade', 'palm'], color: '#9fd0ff' },
  { id: 'eye', sequence: ['horns', 'blade'], color: '#ff3b3b', needsFace: true },
  { id: 'sand', sequence: ['fist', 'gate'], color: '#e0b56a' },
  { id: 'panda', sequence: ['spike', 'horns', 'gate'], color: '#7fd08a' },
  { id: 'fire', sequence: ['palm', 'horns', 'blade'], color: '#ff8a3c' },
];
