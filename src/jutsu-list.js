// THE JUTSU LIST. Names, elements, sign sequences, ki cost and colour of every woven jutsu.
// Rename or rebalance a jutsu here. The ids are used by the code: do not rename those.
// Sign ids: palm, fist, blade, spike, horns (one hand) and gate (both hands open, apart).
// Rules kept by the tests: 2 to 3 signs each, no sign twice in a row, no sequence is the start of another.
// The names are original to Kagaribi on purpose (see the originality note in the README).

// THE SIX ELEMENTS. Every person is born holding one or two of the first five.
// Ether is the sixth: almost nobody can hold it, and it rewrites the world instead of obeying it.
export const ELEMENTS = {
  water: { name: 'Water', color: 0x4fb6e8, note: 'flows, mends and wears stone away' },
  earth: { name: 'Earth', color: 0xd9b068, note: 'holds, shelters and endures' },
  air: { name: 'Air', color: 0x9fd0ff, note: 'moves first and carries the storm' },
  fire: { name: 'Fire', color: 0xff7a2a, note: 'consumes, warms and drives forward' },
  space: { name: 'Space', color: 0xc9a0ff, note: 'intuition, the divine blessing' },
  ether: { name: 'Ether', color: 0xf2ecff, note: 'the sixth. It reshapes reality itself' },
};
// The elements each hero was born with. A jutsu of a born element costs less ki.
export const AFFINITY = { kaze: ['air', 'fire'], rei: ['space', 'air'], tsuki: ['water', 'earth'] };
export const AFFINITY_DISCOUNT = 0.25;
export const costFor = (j, hero) => Math.round(j.cost * (hero && (AFFINITY[hero.id] || []).includes(j.el) ? 1 - AFFINITY_DISCOUNT : 1));

export const JUTSU = [
  { id: 'comet', el: 'fire', name: 'Ember Comet', sub: 'A spinning coal that hunts its target', sequence: ['palm', 'fist', 'palm'], cost: 35, color: 0xff8a3c },
  { id: 'storm', el: 'air', name: 'Storm Thread', sub: 'Lightning stitches up to three foes', sequence: ['spike', 'blade', 'palm'], cost: 40, color: 0x9fd0ff },
  { id: 'eye', el: 'space', name: 'Lantern Eye', sub: 'Foes drag at 60% speed for 9 seconds', sequence: ['horns', 'blade'], cost: 30, color: 0xff4a4a },
  { id: 'ward', el: 'earth', name: 'Dune Ward', sub: 'Sand swallows the next three hits', sequence: ['fist', 'gate'], cost: 30, color: 0xe0b56a },
  { id: 'panda', el: 'earth', name: 'Bamboo Guardian', sub: 'Something heavy answers from the grove', sequence: ['spike', 'horns', 'gate'], cost: 60, color: 0x7fd08a },
  { id: 'breath', el: 'fire', name: 'Hearth Breath', sub: 'A river of fire wherever you face', sequence: ['palm', 'horns', 'blade'], cost: 40, color: 0xff6a2a },
  { id: 'tide', el: 'water', name: 'Tide Mend', sub: 'A cold wave heals you and shoves foes back', sequence: ['blade', 'palm'], cost: 35, color: 0x4fb6e8 },
  // Ether. Sealed until the hero finds the guru (the practice link play.html#ether opens them early).
  { id: 'melt', el: 'ether', sealed: true, name: 'Mirror Melt', sub: 'The world around you turns to liquid, then remembers itself', sequence: ['gate', 'fist'], cost: 70, color: 0xbfe6ff },
  { id: 'unmake', el: 'ether', sealed: true, name: 'Dust Verdict', sub: 'The ground comes apart into a spear of dust. A crater stays', sequence: ['gate', 'spike', 'fist'], cost: 70, color: 0xe8d6b0 },
];

export const SIGN_NAMES = { palm: 'Palm', fist: 'Fist', blade: 'Blade', spike: 'Spike', horns: 'Horns', gate: 'Gate' };
export const SIGN_HINTS = {
  palm: 'Open hand, four fingers straight',
  fist: 'Closed fist',
  blade: 'Index and middle finger up',
  spike: 'Only the index finger up',
  horns: 'Index and little finger up',
  gate: 'Both hands open, apart',
};
