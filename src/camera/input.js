// Eingabe für Maus, Touch und Tastatur. Einheitlich über Pointer Events:
//   Ziehen = verschieben, Mausrad / zwei Finger = zoomen, kurzer Tipp = auswählen.

export class Input {
  constructor(canvas, camera, handlers) {
    this.canvas = canvas;
    this.cam = camera;
    this.h = handlers;               // { tap, hover, change, cancel }
    this.pointers = new Map();
    this.keys = new Set();
    this.dragging = false;
    this.pinch = null;
    this.samples = [];
    this._bind();
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      c.setPointerCapture?.(e.pointerId);
      const p = this._pos(e);
      this.pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), type: e.pointerType });
      this.cam.stop();
      this.cam.target = null;
      this.samples.length = 0;
      if (this.pointers.size === 1) { this.dragging = false; this.multi = false; }
      if (this.pointers.size === 2) { this.multi = true; this.pinch = this._pinchState(); }
      this.h.change();
    });
    c.addEventListener('pointermove', (e) => {
      const p = this._pos(e);
      const st = this.pointers.get(e.pointerId);
      if (!st) { if (e.pointerType === 'mouse') this.h.hover(p.x, p.y); return; }
      const dx = p.x - st.x, dy = p.y - st.y;
      st.x = p.x; st.y = p.y;
      if (this.pointers.size === 1) {
        if (!this.dragging && Math.hypot(p.x - st.sx, p.y - st.sy) > (st.type === 'mouse' ? 4 : 9)) this.dragging = true;
        if (this.dragging) {
          this.cam.panBy(dx, dy);
          const now = performance.now();
          this.samples.push({ t: now, dx, dy });
          while (this.samples.length && now - this.samples[0].t > 90) this.samples.shift();
          this.h.change();
        }
      } else if (this.pointers.size === 2 && this.pinch) {
        const n = this._pinchState();
        this.cam.panBy(n.cx - this.pinch.cx, n.cy - this.pinch.cy);
        if (this.pinch.d > 0) this.cam.zoomAt(n.cx, n.cy, this.cam.scale * (n.d / this.pinch.d));
        this.pinch = n;
        this.h.change();
      }
    });
    const up = (e) => {
      const st = this.pointers.get(e.pointerId);
      if (!st) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        if (!this.dragging && !this.multi && e.type === 'pointerup' && performance.now() - st.t < 600) {
          this.h.tap(st.x, st.y, st.type);
        } else if (this.dragging && this.samples.length > 1) {
          // Nachlauf aus der letzten Bewegung
          const now = performance.now();
          const span = Math.max(16, now - this.samples[0].t) / 1000;
          let sx = 0, sy = 0;
          for (const s of this.samples) { sx += s.dx; sy += s.dy; }
          if (now - this.samples[this.samples.length - 1].t < 60) {
            this.cam.vx = -(sx / span) / this.cam.scale;
            this.cam.vy = -(sy / span) / this.cam.scale;
          }
        }
        this.dragging = false;
      } else if (this.pointers.size === 1) {
        this.pinch = null;
        this.dragging = true;          // der verbleibende Finger verschiebt weiter
        this.samples.length = 0;
      }
      this.h.change();
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.pointers.size) this.h.hover(-1, -1); });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this._pos(e);
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32;
      const base = this.cam.target ? this.cam.target.scale : this.cam.scale;
      const f = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018));
      this.cam.stop();
      this.cam.zoomTo(p.x, p.y, base * f);
      this.h.change();
    }, { passive: false });

    // iOS: eigene Seitengesten unterbinden
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
      document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    }
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') { this.h.cancel(); return; }
      if (e.key === '+' || e.key === '=') { this.cam.zoomTo(this.cam.vw / 2, this.cam.vh / 2, this.cam.scale * this.cam.cfg.zoomStep); this.h.change(); return; }
      if (e.key === '-' || e.key === '_') { this.cam.zoomTo(this.cam.vw / 2, this.cam.vh / 2, this.cam.scale / this.cam.cfg.zoomStep); this.h.change(); return; }
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        this.keys.add(k); e.preventDefault(); this.h.change();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  // Tastatur-Verschieben; pro Frame aufrufen. true = Kamera wurde bewegt.
  update(dt) {
    if (!this.keys.size) return false;
    const sp = 900 * dt;
    let dx = 0, dy = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) dx += sp;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx -= sp;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy += sp;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy -= sp;
    if (dx || dy) { this.cam.panBy(dx, dy); return true; }
    return false;
  }
}
