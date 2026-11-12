// Wraps the MediaPipe hand and face trackers. Everything loads from ./vendor (no CDN), so the site
// works on GitHub Pages under any sub-path and offline once cached.

const base = new URL('../vendor/mediapipe/', import.meta.url).href;

export class Tracker {
  constructor() {
    this.hands = null;
    this.face = null;
    this.facePromise = null;
    this.delegate = null;
  }

  async #lib() {
    if (!this.lib) {
      this.lib = await import(base + 'vision_bundle.mjs');
      this.fileset = await this.lib.FilesetResolver.forVisionTasks(base + 'wasm');
    }
    return this.lib;
  }

  // Try the graphics chip first, fall back to the processor if the phone or browser refuses.
  async #create(Task, options) {
    for (const delegate of ['GPU', 'CPU']) {
      try {
        const task = await Task.createFromOptions(this.fileset, {
          ...options,
          baseOptions: { modelAssetPath: options.model, delegate },
          runningMode: 'VIDEO',
        });
        this.delegate = this.delegate || delegate;
        return task;
      } catch (err) {
        console.warn(`Tracker: ${delegate} start failed`, err);
        if (delegate === 'CPU') throw err;
      }
    }
  }

  async loadHands() {
    const lib = await this.#lib();
    this.hands = await this.#create(lib.HandLandmarker, {
      model: base + 'hand_landmarker.task',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  // Only the eye jutsu needs the face model, so it loads the first time that jutsu is picked.
  loadFace() {
    if (!this.facePromise) {
      this.facePromise = this.#lib()
        .then((lib) => this.#create(lib.FaceLandmarker, { model: base + 'face_landmarker.task', numFaces: 1 }))
        .then((f) => (this.face = f))
        .catch((err) => console.warn('Face tracker unavailable', err));
    }
    return this.facePromise;
  }

  // Returns [{ lm, world }] : lm = 21 points in 0..1 image space, world = the same in metres.
  detectHands(video, now) {
    if (!this.hands) return [];
    const r = this.hands.detectForVideo(video, now);
    return (r.landmarks || []).map((lm, i) => ({ lm, world: r.worldLandmarks?.[i] }));
  }

  // Returns 478 face points in 0..1 image space, or null.
  detectFace(video, now) {
    if (!this.face) return null;
    const r = this.face.detectForVideo(video, now);
    return r.faceLandmarks?.[0] || null;
  }
}
