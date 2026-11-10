// Keyboard, mouse and touch, folded into one set of named actions.
const KEYS = {
  jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], attack: ['KeyJ'], dash: ['KeyL', 'KeyQ'], special: ['KeyK', 'KeyR'],
  throw: ['KeyF'], interact: ['KeyE', 'Enter'], time: ['KeyT'], cine: ['KeyC'], hud: ['KeyH'], quality: ['KeyG'], sound: ['KeyM'],
  up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  camL: ['ArrowLeft'], camR: ['ArrowRight'], camU: ['ArrowUp'], camD: ['ArrowDown'],
};

export class Input {
  constructor(canvas, touchRoot) {
    this.canvas = canvas;
    this.keys = new Set(); this.pressed = new Set(); this.virtual = new Set(); this.vPressed = new Set();
    this.look = { x: 0, y: 0 }; this.zoom = 0;
    this.stick = { x: 0, y: 0, id: null };
    this.locked = false; this.touch = false; this.anyKey = false;
    this.codeToAction = {};
    for (const a in KEYS) for (const c of KEYS[a]) this.codeToAction[c] = a;

    addEventListener('keydown', (e) => {
      if (e.repeat) { if (this.codeToAction[e.code]) e.preventDefault(); return; }
      const a = this.codeToAction[e.code];
      this.anyKey = true;
      if (a) { this.keys.add(a); this.pressed.add(a); e.preventDefault(); }
    });
    addEventListener('keyup', (e) => { const a = this.codeToAction[e.code]; if (a) this.keys.delete(a); });
    addEventListener('blur', () => { this.keys.clear(); this.virtual.clear(); });

    // mouse: click to capture the pointer where the browser allows it, otherwise drag to look
    let dragging = false, lx = 0, ly = 0, moved = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (this.touch) return;
      dragging = true; lx = e.clientX; ly = e.clientY; moved = 0;
      if (!this.locked && this.wantLock) { try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* optional */ } }
      if (this.locked) { if (e.button === 0) this.pressed.add('attack'); if (e.button === 2) this.pressed.add('dash'); }
    });
    addEventListener('mouseup', (e) => {
      if (dragging && !this.locked && moved < 6 && !this.touch) { if (e.button === 0) this.pressed.add('attack'); if (e.button === 2) this.pressed.add('dash'); }
      dragging = false;
    });
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.look.x += e.movementX; this.look.y += e.movementY; }
      else if (dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy); this.look.x += dx * 1.6; this.look.y += dy * 1.6; }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    this.wantLock = true;

    // touch: left thumb moves, right thumb looks, buttons act
    const stickEl = touchRoot.querySelector('.stick'), knob = touchRoot.querySelector('.knob');
    const lookTouches = new Map();
    const enableTouch = () => { if (!this.touch) { this.touch = true; document.documentElement.classList.add('touch'); } };
    canvas.addEventListener('touchstart', (e) => {
      enableTouch();
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && this.stick.id === null) {
          this.stick.id = t.identifier; this.stick.ox = t.clientX; this.stick.oy = t.clientY;
          stickEl.style.left = t.clientX + 'px'; stickEl.style.top = t.clientY + 'px'; stickEl.classList.add('on');
        } else lookTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) {
          let dx = t.clientX - this.stick.ox, dy = t.clientY - this.stick.oy;
          const d = Math.hypot(dx, dy), m = 56;
          if (d > m) { dx *= m / d; dy *= m / d; }
          this.stick.x = dx / m; this.stick.y = dy / m;
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (lookTouches.has(t.identifier)) {
          const l = lookTouches.get(t.identifier);
          this.look.x += (t.clientX - l.x) * 2.4; this.look.y += (t.clientY - l.y) * 2.4;
          l.x = t.clientX; l.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) { this.stick.id = null; this.stick.x = this.stick.y = 0; knob.style.transform = ''; stickEl.classList.remove('on'); }
        lookTouches.delete(t.identifier);
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    for (const b of touchRoot.querySelectorAll('[data-act]')) {
      const a = b.dataset.act;
      b.addEventListener('touchstart', (e) => { enableTouch(); this.virtual.add(a); this.pressed.add(a); b.classList.add('on'); e.preventDefault(); e.stopPropagation(); }, { passive: false });
      const up = (e) => { this.virtual.delete(a); b.classList.remove('on'); e.preventDefault(); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
    }
  }

  down(a) { return this.keys.has(a) || this.virtual.has(a); }
  hit(a) { return this.pressed.has(a); }
  press(a) { this.pressed.add(a); }

  get moveX() { return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0) + this.stick.x; }
  get moveY() { return (this.down('up') ? 1 : 0) - (this.down('down') ? 1 : 0) - this.stick.y; }
  get sprinting() { return this.down('sprint') || Math.hypot(this.stick.x, this.stick.y) > 0.92; }

  endFrame() { this.pressed.clear(); this.look.x = this.look.y = 0; this.zoom = 0; }
  releasePointer() { if (this.locked) document.exitPointerLock?.(); }
}
