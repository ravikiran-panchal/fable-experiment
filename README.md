# Hidden Ember

A playable 3D anime-style ninja village that runs in a browser tab. Every building, character,
animation, effect and cutscene is generated from code. There are no model files, no textures
downloaded, no game engine: one HTML file.

Built in one session with Claude (Fable 5.2) inside Claude Code.

## Play it

- **Online:** https://ravikiran-panchal.github.io/fable-experiment/ (GitHub Pages, served from this repo's `main` branch)
- **Offline:** double-click `play.html`. That is the whole install, on Windows and macOS.

Chrome or Edge gives the best frame rate. It also runs on Android Chrome with touch controls.

## What is in it

- **Kagaribi Village**: ~60 houses, lantern-strung main street, river with an arched bridge,
  ramen stall, market, training ground, cliff waterfall, a five-tier pagoda you can climb.
- **Three playable heroes**: Kaze (Gale Burst), Rei (Storm Lance), Tsuki (Moon Step).
- **Movement**: sprint, double jump, roof-hopping, running on water.
- **Story (about 5 minutes)**: eat at Ramen Hinode, two rogues arrive at the pagoda, a two-boss
  duel, then climb the pagoda and light the beacon for the fireworks finale.
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
| Interact / next line | E | USE |
| Time of day | T | |
| Cinematic camera | C | |
| Hide HUD | H | |
| Detail level | G | |
| Sound on/off | M | |

## Recording it for a reel

- `H` hides the HUD for clean plates. `C` runs the cinematic drone. `T` changes the light.
- Resize the browser window to 9:16 and the camera and HUD re-frame for vertical.
- Jump straight to a scene by adding a tag to the address: `play.html#roam` (skip the intro),
  `play.html#fight` (boss duel), `play.html#beacon` (finale on the pagoda roof).

## Sound

Nothing is synthesized. The game plays real audio files from `assets/audio/`, and because this
repository is public, only CC0 / public-domain audio goes in it. A slot with no file stays silent.
`ASSETS.md` lists every slot, its source and its licence. To add or swap a sound, put the file in
`assets/audio/` under the slot's name and run `npm run build`.

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

## Originality note

The world, names, characters and story are original. It is a love letter to shinobi anime as a
genre and deliberately does not use any existing series' characters, names, symbols or locations,
so it is safe to publish and monetise.
