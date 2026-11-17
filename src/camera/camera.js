// Kamera: Mittelpunkt in Welt-Px, Zoomfaktor, weiche Zoom-Animation um einen
// festen Bildschirmpunkt (Mauszeiger bzw. Mitte der Finger).

import { HALF_W, HALF_H, worldToTile } from './isoProjection.js';

export class Camera {
  constructor(cfg, worldSize) {
    this.cfg = cfg;
    this.x = 0; this.y = 0;
    this.scale = cfg.startScale;
    this.vw = 800; this.vh = 600;       // Größe des Sichtfensters in CSS-Pixeln
    this.setWorldSize(worldSize);
    this.target = null;                 // { scale, sx, sy }
    this.vx = 0; this.vy = 0;           // Nachlauf beim Verschieben (Welt-Px/s)
  }

  setWorldSize(W) {
    this.W = W;
    this.boundX = W * HALF_W;           // Welt reicht von -boundX bis +boundX
    this.boundY = W * HALF_H * 2;       // und von 0 bis boundY
    this.updateLimits();
  }

  resize(vw, vh) { this.vw = vw; this.vh = vh; this.updateLimits(); this.clamp(); }

  updateLimits() {
    this.minScale = Math.min(this.vw / (this.boundX * 2), this.vh / this.boundY) * 0.85;
    this.maxScale = this.cfg.maxScale;
  }

  clamp() {
    if (this.scale < this.minScale) this.scale = this.minScale;
    if (this.scale > this.maxScale) this.scale = this.maxScale;
    if (this.x < -this.boundX) this.x = -this.boundX;
    if (this.x > this.boundX) this.x = this.boundX;
    if (this.y < 0) this.y = 0;
    if (this.y > this.boundY) this.y = this.boundY;
  }

  screenToWorld(sx, sy, out) {
    out.x = (sx - this.vw / 2) / this.scale + this.x;
    out.y = (sy - this.vh / 2) / this.scale + this.y;
    return out;
  }

  worldToScreen(wx, wy, out) {
    out.x = (wx - this.x) * this.scale + this.vw / 2;
    out.y = (wy - this.y) * this.scale + this.vh / 2;
    return out;
  }

  screenToTile(sx, sy, out) {
    this.screenToWorld(sx, sy, out);
    return worldToTile(out.x, out.y, out);
  }

  centerOnTile(x, y) {
    this.x = (x - y) * HALF_W;
    this.y = (x + y) * HALF_H;
    this.clamp();
  }

  centerTile(out) { return worldToTile(this.x, this.y, out); }

  panBy(dsx, dsy) {
    this.x -= dsx / this.scale;
    this.y -= dsy / this.scale;
    this.clamp();
  }

  // Sofortiger Zoom, der Weltpunkt unter (sx, sy) bleibt an Ort und Stelle.
  zoomAt(sx, sy, newScale) {
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    const wx = (sx - this.vw / 2) / this.scale + this.x;
    const wy = (sy - this.vh / 2) / this.scale + this.y;
    this.scale = newScale;
    this.x = wx - (sx - this.vw / 2) / newScale;
    this.y = wy - (sy - this.vh / 2) / newScale;
    this.clamp();
  }

  // Weicher Zoom (Mausrad, Schaltflächen).
  zoomTo(sx, sy, newScale) {
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.target = { scale: newScale, sx, sy };
  }

  // Weiche Fahrt zu einem Feld (z. B. „Zur Siedlung“).
  flyToTile(x, y, scale) {
    this.fly = { x: (x - y) * HALF_W, y: (x + y) * HALF_H, scale: scale ?? this.scale };
    this.target = null;
  }

  // Pro Frame aufrufen; liefert true, solange sich die Kamera noch bewegt.
  update(dt) {
    let moving = false;
    if (this.target) {
      const t = this.target;
      const k = 1 - Math.exp(-dt * 14);
      const ls = Math.log(this.scale) + (Math.log(t.scale) - Math.log(this.scale)) * k;
      let ns = Math.exp(ls);
      if (Math.abs(ns - t.scale) / t.scale < 0.002) { ns = t.scale; this.target = null; }
      this.zoomAt(t.sx, t.sy, ns);
      moving = true;
    }
    if (this.fly) {
      const f = this.fly, k = 1 - Math.exp(-dt * 6);
      this.x += (f.x - this.x) * k; this.y += (f.y - this.y) * k;
      this.scale = Math.exp(Math.log(this.scale) + (Math.log(f.scale) - Math.log(this.scale)) * k);
      if (Math.abs(f.x - this.x) * this.scale < 0.5 && Math.abs(f.y - this.y) * this.scale < 0.5 && Math.abs(f.scale - this.scale) / f.scale < 0.003) {
        this.x = f.x; this.y = f.y; this.scale = f.scale; this.fly = null;
      }
      this.clamp();
      moving = true;
    }
    if (Math.abs(this.vx) > 4 || Math.abs(this.vy) > 4) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      const d = Math.exp(-dt * 5);
      this.vx *= d; this.vy *= d;
      this.clamp();
      moving = true;
    } else { this.vx = 0; this.vy = 0; }
    return moving;
  }

  stop() { this.vx = 0; this.vy = 0; this.fly = null; }
}
