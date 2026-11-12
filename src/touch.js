// Phone controls around the game: the MENU, the Leave training button, landscape/full screen,
// and the editor that lets a player drag every button where their thumbs want it.
const $ = (s) => document.querySelector(s);
const KEY = 'will-of-fire-touch-v1';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class TouchUI {
  constructor(G) {
    this.G = G;
    this.root = $('#touch'); this.menu = $('#t-menu'); this.box = $('#t-menu-box'); this.bar = $('#t-edit'); this.leave = $('#t-leave');
    this.items = [...this.root.querySelectorAll('[data-key]')];
    this.layout = this.read(); this.sel = null; this.editing = false;

    this.menu.addEventListener('click', () => { if (!this.editing) this.box.hidden = !this.box.hidden; });
    this.box.addEventListener('click', (e) => {
      const m = e.target.closest('button')?.dataset.m;
      if (!m) return;
      this.box.hidden = true;
      if (m === 'edit') this.edit(true); else if (m === 'full') this.fullscreen(true); else G.input.press(m);
    });
    this.bar.addEventListener('click', (e) => {
      const a = e.target.closest('button')?.dataset.e;
      if (a === 'done') this.edit(false);
      else if (a === 'reset') { this.layout = {}; this.write(); this.apply(); }
      else if ((a === 'smaller' || a === 'bigger') && this.sel) { const k = this.sel.dataset.key, c = this.layout[k] || this.capture(this.sel); c.s = clamp(c.s + (a === 'bigger' ? 0.15 : -0.15), 0.6, 1.9); this.layout[k] = c; this.write(); this.apply(); }
    });
    this.leave.addEventListener('click', () => G.input.press('train'));
    $('#rotate-skip').addEventListener('click', () => $('#rotate').classList.add('skip'));
    // Starting the game is a tap, which is the only moment a browser lets a page go full screen and lock sideways.
    $('#title').addEventListener('click', (e) => { if (e.target.closest('#start, #saves .go, #saves .cp-list button') && matchMedia('(pointer: coarse)').matches) this.fullscreen(false); });

    // dragging, in edit mode only
    let drag = null;
    this.root.addEventListener('pointerdown', (e) => {
      if (!this.editing) return;
      const el = e.target.closest('[data-key]');
      if (!el) return;
      this.select(el);
      const r = el.getBoundingClientRect();
      drag = { el, id: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
      try { el.setPointerCapture(e.pointerId); } catch { /* optional */ }
      e.preventDefault();
    });
    this.root.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const k = drag.el.dataset.key, c = this.layout[k] || this.capture(drag.el);
      c.x = clamp((e.clientX - drag.dx) / innerWidth, 0.04, 0.96); c.y = clamp((e.clientY - drag.dy) / innerHeight, 0.06, 0.94);
      this.layout[k] = c; this.place(drag.el, c);
    });
    const up = (e) => { if (drag && e.pointerId === drag.id) { drag = null; this.write(); } };
    this.root.addEventListener('pointerup', up); this.root.addEventListener('pointercancel', up);
    addEventListener('resize', () => this.apply());
    this.apply();
  }

  read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.layout)); } catch { /* private mode: the layout lasts until the page closes */ } }
  // where a button sits right now, as a share of the screen (so it survives a different phone or a rotation)
  capture(el) { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, s: this.layout[el.dataset.key]?.s || 1 }; }
  place(el, c) {
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = (c.x * innerWidth - w / 2) + 'px'; el.style.top = (c.y * innerHeight - h / 2) + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.scale = c.s;
  }
  apply() {
    for (const el of this.items) {
      const c = this.layout[el.dataset.key];
      if (c) this.place(el, c); else { for (const p of ['left', 'top', 'right', 'bottom', 'scale']) el.style[p] = ''; }
    }
  }
  select(el) { this.sel?.classList.remove('sel'); this.sel = el; el?.classList.add('sel'); }

  edit(on) {
    const G = this.G;
    if (on && (G.story.busy || G.weave.focus || !G.player)) { G.ui.toast('Not now. Try again when you can walk around'); return; }
    this.editing = on; G.input.editing = on;
    G.ui.app.classList.toggle('editing', on);
    this.bar.hidden = !on; this.box.hidden = true;
    if (!on) this.select(null);
    if (G.player) G.player.locked = on; // nothing can hit a player who is arranging buttons mid-village
    G.input.virtual.clear();
  }

  async fullscreen(toggle) {
    if (window.Capacitor) return; // the Android app is already full screen and sideways
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement) { if (toggle) await d.exitFullscreen(); return; }
      await el.requestFullscreen({ navigationUI: 'hide' });
      await screen.orientation.lock('landscape');
    } catch { if (toggle && !d.fullscreenElement) this.G.ui.toast('This browser will not go full screen. Turn the phone sideways instead'); }
  }

  update() {
    const G = this.G, s = G.story, show = !!s.training && !s.busy;
    if (this.leave.hidden === show) this.leave.hidden = !show;
    const t = this.box.querySelector('[data-m="train"]'), label = s.training ? 'Leave training' : 'Training ground';
    if (t.textContent !== label) t.textContent = label;
    if (this.editing && G.player) G.player.locked = true;
  }
}
