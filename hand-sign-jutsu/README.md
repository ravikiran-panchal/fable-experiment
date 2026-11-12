# Hand Sign Jutsu

A website that reads real hand signs through your camera and plays an original jutsu effect.
Runs in Chrome on Android, and in Chrome / Edge / Safari on Windows and Mac. The video never leaves the device.

## Run it on this computer

```
npm install        # only needed once, and only for the tests and `npm run vendor`
npm start          # http://localhost:8766
```

`npm start` is plain Node (`scripts/serve.mjs`), so it is the same command on Windows and macOS.
There is no build step: the files in this folder are the website.

- `http://localhost:8766/?sim=1` opens practice mode (no camera: tap the signs, the pointer is the hand).
- Add `?debug=1`, or press `d`, for a readout of frame rate, tracking time and the signs being seen.

## Test it

```
npm test
```

Checks the sign maths and the sequence logic with made-up 3D hands. It does not prove how well a real
camera tracks: that needs a person in front of a camera.

## The jutsu

| Name (label) | What it is | Signs |
| --- | --- | --- |
| Windball | Spiral energy sphere | Palm, Fist, Palm |
| Lightning Burst | Lightning blade | Spike, Blade, Palm |
| Eyes of the Mystic | Eye awakening (drawn on your real eyes) | Horns, Blade |
| Suna no Tatte | Sand guardian, sand you can push | Fist, Gate |
| Panda Tsukiyomo | Genjutsu: bamboo valley of bowing pandas | Spike, Horns, Gate |
| Gokakyo | Fire stream | Palm, Horns, Blade |

Signs: **Palm** (open hand), **Fist**, **Blade** (index + middle up), **Spike** (index up),
**Horns** (index + little finger up), **Gate** (both hands open, apart). None of them needs the hands to
touch or the fingers to interlock, because the tracker loses hands that overlap.

## Where things live

| Path | What |
| --- | --- |
| `js/names.js` | **The names file.** Every label a visitor reads. Rename a jutsu here. |
| `js/sequences.js` | Which signs trigger which jutsu, and the library order. |
| `js/signs.js` | Sign recognition (pure maths, covered by the tests). |
| `js/effects/` | One file per effect. All visuals are drawn by code: no image files. |
| `js/main.js`, `js/tracker.js`, `js/audio.js` | App flow, camera tracking, sound playback. |
| `assets/audio/` | CC0 sound files and `SOURCES.md`, their licensing record. |
| `vendor/mediapipe/` | The hand and face tracking library and models (see `licenses.md`). |
| `scripts/` | `serve.mjs` local server, `vendor.mjs` refreshes `vendor/`, `build-audio.mjs` rebuilds the sounds. |

## Online

Lives in the `fable-experiment` repo since 12 Nov 2026 (folder `hand-sign-jutsu/`), so it is published with the game's
GitHub Pages site: https://ravikiran-panchal.github.io/fable-experiment/hand-sign-jutsu/
Every path in the site is relative, so nothing else is needed. The camera only works over https or on localhost.
