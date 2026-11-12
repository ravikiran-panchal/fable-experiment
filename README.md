# Hidden Ember

(Briefly renamed "Will of Fire: The Last Ember" on 12 Nov 2026, then renamed back to Hidden Ember the same day to keep clear of anime-franchise IP.)

A playable 3D anime-style ninja village that runs in a browser tab. Every building, character,
animation, effect and cutscene is generated from code. There are no model files, no textures
downloaded, no game engine: one HTML file.

Built in one session with Claude (Fable 5.2) inside Claude Code.

## Play it

- **Online:** https://ravikiran-panchal.github.io/fable-experiment/ (GitHub Pages, served from this repo's `main` branch)
- **Offline:** double-click `play.html`. That is the whole install, on Windows and macOS.

Chrome or Edge gives the best frame rate. It also runs on Android Chrome with touch controls.

## Also in this repo: Hand Sign Jutsu (`hand-sign-jutsu/`)

The standalone webcam hand-sign website that Sign Weaving grew out of. Merged in from its own repo on
12 Nov 2026 with full history; that repo is retired.

- **Online:** https://ravikiran-panchal.github.io/fable-experiment/hand-sign-jutsu/ (same Pages site as the game)
- **Locally:** `cd hand-sign-jutsu && npm start`, then http://localhost:8766. See `hand-sign-jutsu/README.md`.

## What is in it

- **Kagaribi Village**: ~60 houses, lantern-strung main street, river with an arched bridge,
  ramen stall, market, training ground, cliff waterfall, a five-tier pagoda you can climb.
- **Three playable heroes**: Kaze (Gale Burst), Rei (Storm Lance), Tsuki (Moon Step).
- **Movement**: sprint, double jump, roof-hopping, running on water.
- **Sign Weaving (v2)**: chain hand signs to cast jutsu, with your real hands on camera or a sign pad. See below.
- **Chapter One (v3)**: six elements, the fox's dream, a riverside bonfire, Inn Hotaru, the academy and two Ether jutsu. See below.
- **Story**: come home, remember the dream, eat at Ramen Hinode, duel two rogues at the pagoda, light the
  beacon, join the bonfire, sleep at the inn, then a morning at your old academy.
- **Time of day**: golden hour, midday, dusk, night.
- **Cinematic camera**: a built-in drone reel of the village for B-roll.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD | left thumb |
| Look | mouse (click the view to capture the pointer) or arrow keys | drag right side |
| Sprint | Shift | push the stick fully |
| Jump / double jump | Space | JUMP |
| Strike (3-hit combo) | J or left click | HIT |
| Special (costs ki) | K or R | KI |
| Dash (dodges damage) | L, Q or right click | DASH |
| Throw star | F | STAR |
| Open / close the sign weave | V | SIGN |
| Signs, while the weave is open | 1 to 6 | tap the sign |
| Camera signs on / off | B | button in the weave |
| Interact / next line | E | USE |
| Time of day | T | |
| Cinematic camera | C | |
| Camera near / far | X | |
| Training ground and back | Z | |
| Hide HUD | H | |
| Detail level | G | |
| Sound on/off | M | |

## Chapter One (v3): the Ether dream

v3 turns the village into the first chapter of a longer story.

**The world rule: six elements.** Every person is born holding one or two of Water, Earth, Air, Fire and
Space (intuition, the divine blessing). The sixth, Ether, is almost never held. It does not use the world,
it rewrites it. Each hero has born elements (Kaze: Air and Fire, Rei: Space and Air, Tsuki: Water and Earth)
and a jutsu of a born element costs 25% less ki (marked ★ in the weave panel). The table is in
`src/jutsu-list.js`.

**The story, in order.**
1. Arrival. You come home to Kagaribi, where you graduated from the academy, while travelling north to find
   the Ether guru. The game asks whether you want to remember the dream that sent you.
2. The dream (a cinematic). It opens out of focus on still water under a blue sky. A cream and orange
   nine-tailed fox, wrapped in white and peach steam, tells you about the six elements and that you can
   hold Ether. Then it shows the valley: firebirds over the peaks, leaves in every colour, unnamed beasts,
   people who are only partly people, and a white-cloaked guru (kept out of focus) practising both Ether
   jutsu by a waterfall.
3. Ramen, the Pale Moths, the duel and the beacon, as before.
4. The bonfire. The village gathers on the south bank with taiko, shamisen and shakuhachi, a circle dance
   and ale.
5. Inn Hotaru. You book the room, walk to it, take the bath and sleep, all by hand. The room costs 10 of
   your 12 copper; the frog purse shows what is left.
6. Next morning. On the way to the job board, Susake (your classmate Tachi's little brother) drags you to the
   academy. You sit through a lesson on the six elements, then show three jutsu at the training ground.
   Free roam starts there.

**Ether jutsu.** Mirror Melt (Gate, Fist) turns everything in a 13 m circle to liquid, then it goes back
exactly as it was. Dust Verdict (Gate, Spike, Fist) pulls the ground apart into a spear of dust and leaves a
real crater you can walk into. Both are sealed in the story (you have not found the guru yet).
`play.html#ether` opens them at the training ground for practice and filming. Tide Mend (Blade, Palm) is the
new Water jutsu and is open from the start.

**Jump links** (add to the address, handy for filming one scene): `#dream`, `#festival`, `#inn`, `#morning`,
`#academy`, `#showcase`, `#ether`, plus the older `#dojo`, `#fight`, `#beacon`, `#roam`.

**Free roam.** The job board north of the bridge has three paid jobs: Ramen run (timed deliveries, 6 copper
plus 2 for speed), Lost lanterns (six lanterns on the rooftops, 8) and Moth scouts (four scouts on the plaza,
12). Copper buys ramen (3) and a night at the inn (10). Jobs live in `src/jobs.js`.

**Training at will.** Press `Z` at any quiet moment to jump to the training ground, and `Z` again to go back
to where you were. Ki never runs out there. It is closed during the duel, the class showcase and a job.

**Camera.** The default view is now close, over the right shoulder. `X` switches between close and far, and
the mouse wheel still zooms.

**Lantern Eye close-up.** Casting Lantern Eye freezes the game for about two seconds: a shot of the hero where
they stand, then a push in on the eyes, then the fight carries on with no time lost. The eye is an original
design (a flame pupil inside a lantern frame), not a copy of any series' eye.

**Not done yet, said plainly.** The bonfire plays a Japanese town tune because no CC0
taiko, shamisen or flute recording was found. Dust Verdict takes material from the ground only; it does not
knock buildings down. Training and the camera switch have no touch buttons yet.

## Sign Weaving (v2)

The Hand Sign Jutsu project, built into the game. Press `V`: time slows to a quarter of normal speed and the weave opens.
Chain two or three signs and the matching jutsu is cast in the village. You do not pick a jutsu first: the
signs you weave decide which one comes out. Each costs ki. The weave slips after 15 seconds.

| Jutsu | What it does | Signs | Ki |
| --- | --- | --- | --- |
| Ember Comet | A spinning coal that homes in and bursts | Palm, Fist, Palm | 35 |
| Storm Thread | Lightning strikes up to three foes | Spike, Blade, Palm | 40 |
| Lantern Eye | Foes move at 60% speed for 9 seconds | Horns, Blade | 30 |
| Dune Ward | Sand blocks the next three hits (14 seconds) | Fist, Gate | 30 |
| Bamboo Guardian | A grove rises and a giant panda drops on the target | Spike, Horns, Gate | 60 |
| Hearth Breath | A stream of fire in front of you | Palm, Horns, Blade | 40 |

Signs: **Palm** (open hand), **Fist**, **Blade** (index + middle up), **Spike** (index up), **Horns**
(index + little finger up), **Gate** (both hands open, apart).

Two ways to make the signs:

- **Sign pad** (works everywhere, including the double-clicked `play.html`): keys `1` to `6`, or tap the signs.
- **Your camera** (`B`): hold each sign for a quarter of a second. With the camera on you do not even need
  `V`: hold the first sign of any jutsu and the weave opens by itself. The video never leaves the device.
  The camera needs the online link or `npm start` (http://localhost:8765/play.html), because browsers will
  not load the hand tracker from a double-clicked file. Face a window or lamp, hand at arm's length.

`play.html#dojo` starts you at the training ground with three dummies to practise on.

`npm test` checks the sign maths and the weave logic with made-up 3D hands. It does not prove how well a
real camera tracks: that needs a person in front of a camera.

## Recording it for a reel

- `H` hides the HUD for clean plates. `C` runs the cinematic drone. `T` changes the light.
- Resize the browser window to 9:16 and the camera and HUD re-frame for vertical.
- Jump straight to a scene by adding a tag to the address: `play.html#roam` (skip the intro),
  `play.html#fight` (boss duel), `play.html#beacon` (finale on the pagoda roof), `play.html#dojo` (training
  ground, for filming the jutsu).

## Sound

Nothing is synthesized. The game plays real audio files from `assets/audio/`, and because this
repository is public, only CC0 / public-domain audio goes in it. A slot with no file stays silent.

Every slot is filled from CC0 packs on OpenGameArt and Kenney.nl (no account or key needed). The
sources are listed in `scripts/audio-sources.mjs` and the picks per slot in `scripts/audio-slots.mjs`.
To re-create the files on a new machine (needs ffmpeg: `brew install ffmpeg` on Mac, `winget install ffmpeg` on Windows):

```bash
npm run audio:fetch
```

Listen with `play.html`. If a sound is wrong, switch that slot to its next candidate:

```bash
npm run audio:next -- sfx_hit
```

`npm run audio:list` shows every slot and its alternatives; `npm run audio:next -- sfx_hit 3` jumps
straight to candidate 3. `assets/audio/SOURCES.md` is the licensing record of every file. To use a
file of your own instead, save it in `assets/audio/` under the slot's name (for example
`music_battle.mp3`) and run `npm run build`. `node scripts/serve.mjs` serves the game on
http://localhost:8765/play.html if a browser refuses to play sound from a double-clicked file.

## Change it and rebuild

Needs Node.js 20 or newer. Same commands on Windows and macOS.

```bash
npm install
```

```bash
npm run build
```

`npm run build` rewrites `play.html`, `index.html` (the same file, for the public link) and
`dist/hidden-ember.artifact.html` (the silent copy used for the Claude artifact link). Source lives in `src/`:

| File | What it holds |
| --- | --- |
| `world.js` | the village, collision, water |
| `character.js` | procedural characters and all animation |
| `actors.js` | heroes, the two rogues, villagers, projectiles |
| `story.js` | the plot, as plain readable steps |
| `fx.js` | particles, slashes, lightning, fireworks |
| `env.js` | sky, sun, the four lighting looks |
| `main.js` | camera, main loop, quality settings |
| `ui.js`, `input.js`, `audio.js` | HUD, controls, sound hooks |
| `jutsu-list.js` | **the jutsu list**: names, sign sequences, ki cost. Rename or rebalance here |
| `jutsu.js` | the six jutsu effects in 3D |
| `weave.js`, `signs.js`, `tracker.js` | the weave screen, sign recognition, camera hand tracker |

`vendor/mediapipe/` holds the hand-tracking library and model (22 MB). It is only loaded when the camera is
turned on. `npm run vendor` refreshes it after `npm install`.

## Saved progress

The game saves a checkpoint each time the story reaches a new step (11 steps, from arriving home to free
roam), plus your coins. The title screen then shows **Continue** and a **Checkpoints** list for going back to
any earlier step. **New game** clears the list. Saves live in the browser's or app's own storage on that
device (`src/save.js`); nothing is sent anywhere. Not saved: the time of day and a half-finished job.

## Store apps (Google Play and Mac App Store)

The same game is wrapped twice. Both wrappers carry the game, sounds, typefaces and hand tracker inside them
and make no outside requests.

| Command | What it does |
| --- | --- |
| `npm run app` | Rebuilds the game, packs it into `app/www`, copies it into the `android` project |
| `npm run android:setup` | Re-applies the app settings after `npx cap add android` |
| `npm run desktop` | Packs the game into `desktop/www` for the Mac app |
| `npm run desktop:test` | Starts the Mac app with no window and prints what works |
| `npm run shots` | Takes the store screenshots and banners from the real game into `store/graphics` |
| `npm run icons` | Remakes launcher icons, splash screens and the store icon (needs ffmpeg) |

- Android: Capacitor project in `android/`. Compiling needs Android Studio.
- Mac: Electron project in `desktop/` (`npm install` there first; `npm run mas` builds the App Store package
  once your Apple certificate, profile and Team ID are in place). No Xcode needed.
- Everything you do yourself, step by step, is in `store/LAUNCH-GUIDE.md`. Store texts and form answers are
  next to it.

## Originality note

The world, characters and story are original. It is a love letter to shinobi anime as a
genre and deliberately does not use any existing series' characters, names, symbols or locations,
so it is safe to publish and monetise. The woven jutsu follow the same rule: the Hand Sign Jutsu site uses
sound-alike names, this game uses its own (Ember Comet, Storm Thread and so on). Keep it that way.

Two v3 details to know about. The nine-tailed fox is the kitsune of Japanese folklore and is drawn here as
its own design. The frog coin purse is a gamaguchi ("toad mouth"), a real traditional purse, also drawn fresh.
The names Tachi and Susake were chosen by the author and deliberately echo a famous pair of brothers; the
characters themselves are original. If the game is ever sold, rename them in `src/main.js` and `src/story.js`.
