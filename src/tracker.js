// Wraps the MediaPipe hand tracker for Sign Weaving. The library and its model load from vendor/mediapipe
// next to the page (no CDN), and only when the player turns the camera on, so the game itself stays one file.

export class HandTracker {
  constructor() { this.task = null; this.delegate = null; }

  async load(base) {
    const url = base + (window.EMBER_VISION || 'vision_bundle.mjs'); // the phone app ships it as .js so its built-in server gives it the right type
    const lib = await import(url);
    const fileset = await lib.FilesetResolver.forVisionTasks(base + 'wasm');
    // Try the graphics chip first, fall back to the processor if the browser refuses.
    for (const delegate of ['GPU', 'CPU']) {
      try {
        this.task = await lib.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: base + 'hand_landmarker.task', delegate },
          runningMode: 'VIDEO', numHands: 2,
          minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        });
        this.delegate = delegate;
        return;
      } catch (err) {
        console.warn(`Hand tracker: ${delegate} start failed`, err);
        if (delegate === 'CPU') throw err;
      }
    }
  }

  // Returns [{ lm, world }] : lm = 21 points in 0..1 image space, world = the same in metres.
  detect(video, now) {
    if (!this.task) return [];
    const r = this.task.detectForVideo(video, now);
    return (r.landmarks || []).map((lm, i) => ({ lm, world: r.worldLandmarks?.[i] }));
  }
}
