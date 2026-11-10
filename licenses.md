# Licences and assets

Project tag: **hand-sign-jutsu** (personal, public repository and public site).

| Asset | Source | Licence | Where used | Your action |
| --- | --- | --- | --- | --- |
| All visuals (effects, pandas, bamboo, eye pattern, sign icons, UI) | Drawn by code in `js/` and `css/` | Yours | Whole site | None |
| Jutsu names | Sound-alike labels in `js/names.js` | Yours to change | Library, callouts | Keep them as sound-alikes: do not swap in the original trademarked names |
| MediaPipe Tasks Vision 1.2.2 (`vendor/mediapipe/vision_bundle.mjs`, `wasm/`) | npm `@mediapipe/tasks-vision` (Google) | Apache 2.0 | Hand and face tracking | None. Keep this row as the notice |
| `hand_landmarker.task`, `face_landmarker.task` | `storage.googleapis.com/mediapipe-models/...` (Google) | Apache 2.0 | Tracking models | None |
| Sounds in `assets/audio/*.mp3` | Kenney.nl and OpenGameArt, listed file by file in `assets/audio/SOURCES.md` | CC0 1.0 | Sign ticks, casts, ambience | None (public domain) |
| Fonts | The device's own system fonts | n/a | All text | None |

Rules for this repository:

- Audio is CC0 only and is never synthesized. `scripts/build-audio.mjs` only trims, levels and converts recorded files.
- Nothing from Epidemic Sound or Envato Elements belongs here: those licences do not cover a public repository
  or a public website. Use them in the reel edit, not in this folder.
- Two sounds are stand-ins until better CC0 recordings are chosen: `lightning.mp3` (an interface glitch sound)
  and `sand.mp3` (stones). They are marked in `SOURCES.md`.
