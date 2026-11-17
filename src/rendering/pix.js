// Kleine Pixel-Malbibliothek für die prozeduralen Platzhalter-Sprites.
// Farben sind 32-Bit-Werte in der Byte-Reihenfolge von ImageData (ABGR).

export function rgba(hex, a = 255) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function ramp(list) { return list.map((h) => rgba(h)); }

// Farbe abdunkeln/aufhellen (f < 1 dunkler, f > 1 heller).
export function shade(c, f) {
  const r = Math.min(255, Math.round((c & 255) * f));
  const g = Math.min(255, Math.round(((c >>> 8) & 255) * f));
  const b = Math.min(255, Math.round(((c >>> 16) & 255) * f));
  return ((c & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
}

export function hashI(x, y, s) {
  let h = (s | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint32Array(w * h);
  }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  // Nur setzen, wenn dort noch nichts Deckendes liegt (für Schatten).
  under(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) {
      const i = y * this.w + x;
      if ((this.d[i] >>> 24) < 255) this.d[i] = c;
    }
  }
  get(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) return this.d[y * this.w + x];
    return 0;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // Gefülltes Polygon; fn(x, y) liefert die Farbe (0 = auslassen).
  poly(pts, fn) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const y0 = Math.max(0, Math.ceil(minY - 0.5)), y1 = Math.min(this.h - 1, Math.floor(maxY - 0.5));
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(this.w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
        for (let x = xa; x <= xb; x++) {
          const c = typeof fn === 'function' ? fn(x, y) : fn;
          if (c) this.d[y * this.w + x] = c;
        }
      }
    }
  }
  // Weicher Bodenschatten (Ellipse), liegt unter allem anderen.
  shadow(cx, cy, rx, ry, alpha = 60) {
    const c = ((alpha << 24) | 0x000a0a0a) >>> 0;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.under(x, y, c);
      }
    }
  }
  // Schattierter Klecks mit ausgefranstem Rand – Grundform für Kronen, Büsche, Felsen.
  blob(cx, cy, rx, ry, colors, seed, opt = {}) {
    const rag = opt.rag ?? 0.24, noise = opt.noise ?? 0.3, contrast = opt.contrast ?? 0.44;
    const L = colors.length;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1 - hashI(x, y, seed) * rag) continue;
        const light = -dx * 0.55 - dy * 0.75;
        const v = 0.5 + light * contrast + (hashI(x + 7, y + 3, seed) - 0.5) * noise;
        let idx = Math.floor(v * L);
        idx = idx < 0 ? 0 : idx >= L ? L - 1 : idx;
        this.set(x, y, colors[idx]);
      }
    }
  }
  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.d);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}
