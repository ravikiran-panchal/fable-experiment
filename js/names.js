// THE NAMES FILE.
// Every label a visitor reads lives here: app title, jutsu names, sign names, hints.
// The jutsu names are deliberate sound-alikes, not the originals. Change a label here and it changes everywhere.
// The keys (sphere, lightning, ...) are internal ids used by the code: do not rename those.

export const APP = {
  title: 'Hand Sign Jutsu',
  tagline: 'Weave real hand signs in front of your camera. Cast the jutsu.',
};

export const JUTSU = {
  sphere: {
    label: 'Rensengon',
    sub: 'Spiral energy sphere',
    tip: 'Hold your open palm up. Close your fist to compress it, open to burst.',
  },
  lightning: {
    label: 'Chidoree',
    sub: 'Lightning blade',
    tip: 'Move your hand fast to slash. The lightning follows your fingers.',
  },
  eye: {
    label: 'Sharingon',
    sub: 'Eye awakening',
    tip: 'Look straight into the camera, face well lit.',
  },
  sand: {
    label: 'Suna no Tatte',
    sub: 'Sand guardian',
    tip: 'Open palms push the sand. A fist gathers it. Let go and the guardian re-forms.',
  },
  panda: {
    label: 'Panda Tsukiyomo',
    sub: 'Genjutsu: the bowing valley',
    tip: 'Raise an open palm and the whole valley bows to you.',
  },
  fire: {
    label: 'Gokakyo',
    sub: 'Fire stream',
    tip: 'The fire shoots where your fingers point. Sweep it around.',
  },
};

export const SIGNS = {
  palm: { label: 'Palm', hint: 'Open hand, four fingers straight, facing the camera' },
  fist: { label: 'Fist', hint: 'Closed fist, knuckles to the camera' },
  blade: { label: 'Blade', hint: 'Index and middle finger up, the rest folded' },
  spike: { label: 'Spike', hint: 'Only the index finger up' },
  horns: { label: 'Horns', hint: 'Index and little finger up, middle two folded' },
  gate: { label: 'Gate', hint: 'Both hands open, side by side, not touching' },
};

export const TEXT = {
  gateTitle: 'Allow your camera',
  gateBody: 'This site watches your hands through the camera to read the signs. The video stays on this device. Nothing is recorded or uploaded.',
  gateButton: 'Allow camera',
  gateSim: 'No camera? Try it with taps instead',
  libraryTitle: 'Jutsu library',
  libraryHint: 'Pick a jutsu, then weave its signs.',
  signingHint: 'Weave the signs in order. Hold each one until it locks.',
  timeout: 'Too slow. Start the sequence again.',
  release: 'Release',
  again: 'Cast again',
  back: 'Library',
  noHand: 'Show your hand to the camera',
  simPad: 'Tap a sign. Drag to move the hand.',
};
