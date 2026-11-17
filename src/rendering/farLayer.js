// Flächendarstellung für weite Zoomstufen (LOD): Die Welt wird in einer
// Bildpyramide im Feldraster abgetastet (Wälder als Flächen, Flüsse als
// Linien, Gebirge mit Schummerung) und über die isometrische Transformation
// gezeichnet. Die oberste Stufe zeigt die ganze Welt und dient auch als Minimap.

import { RAMP } from './groundBaker.js';
import { T, TERRAIN_RAMPS } from '../config/terrain.js';
import { rgba, hashI } from './pix.js';
import { fbm } from '../world/noise.js';

const SIZE = 256;
const hex3 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Kronendach: dunkle Lücken -> sonnige Kronen
const CANOPY_R = ['#162a1b', '#203824', '#2a462b', '#365432', '#46653a', '#58753f'].map(hex3);
const CONIFER_R = ['#122520', '#1a3029', '#223b30', '#2c4838', '#385643', '#46644c'].map(hex3);
const RAMP3 = TERRAIN_RAMPS.map((r) => r.map(hex3));
const pack = (r, g, b) => ((255 << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, r | 0))) >>> 0;
// Farbe aus einer Rampe, stufenlos interpoliert (v = 0..1)
function mix(ramp, v) {
  const L = ramp.length - 1;
  let f = v * L; f = f < 0 ? 0 : f > L ? L : f;
  const i = Math.min(L - 1, f | 0), k = f - i, a = ramp[i], b = ramp[i + 1];
  return pack(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
}

export class FarLayer {
  constructor(world) {
    this.world = world;
    this.W = world.size;
    this.J = Math.max(0, Math.ceil(Math.log2(this.W / 128)));
    this.cache = new Map();
    this.queue = [];
    this.tick = 0;
    this.maxEntries = 140;
    this._E = new Float32Array(SIZE + 2);
    this._Ep = new Float32Array(SIZE + 2);
    this._T = new Uint8Array(SIZE + 2);
    this._F = new Float32Array(SIZE + 2);
    this._o = { e: 0, m: 0, temp: 0, terrain: 0, forest: 0 };
    this.dseed = (world.start.x * 7919 + world.start.y) | 0;
    this.top = this._entry(this.J, 0, 0);
    while (!this.top.ready) this._row(this.top);
  }

  tpp(j) { return Math.pow(2, j - 1); }            // Felder pro Bildpunkt
  levelFor(scale) {
    const j = Math.ceil(Math.log2(1.8 / (64 * scale))) + 1;
    return j < 0 ? 0 : j > this.J ? this.J : j;
  }

  _entry(j, rx, ry) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    return { j, rx, ry, canvas, ctx, img: ctx.createImageData(SIZE, SIZE), row: 0, ready: false, used: 0, queued: false };
  }

  beginFrame() {
    for (const e of this.queue) e.queued = false;
    this.queue.length = 0;
    this.tick++;
  }

  request(j, rx, ry) {
    const key = j * 1048576 + rx * 1024 + ry;
    let en = this.cache.get(key);
    if (!en) {
      en = this._entry(j, rx, ry);
      this.cache.set(key, en);
      if (this.cache.size > this.maxEntries) this._evict();
    }
    en.used = this.tick;
    if (!en.ready && !en.queued) { en.queued = true; this.queue.push(en); }
    return en;
  }

  _evict() {
    const arr = [...this.cache.entries()].filter(([, e]) => e !== this.top && e.used < this.tick)
      .sort((a, b) => a[1].used - b[1].used);
    for (let i = 0; i < Math.min(arr.length, 20); i++) {
      arr[i][1].canvas.width = 0;
      this.cache.delete(arr[i][0]);
    }
  }

  // Arbeitet die Warteschlange bis zum Zeitlimit ab. true = es bleibt Arbeit übrig.
  work(deadline) {
    // gröbere Stufen zuerst – sie dienen als Platzhalter für feinere
    this.queue.sort((a, b) => b.j - a.j);
    while (this.queue.length) {
      const en = this.queue[0];
      while (!en.ready) {
        this._row(en);
        if (performance.now() > deadline) return true;
      }
      en.queued = false;
      this.queue.shift();
    }
    return false;
  }

  // Kleinräumige Hügel, die nur für Licht und Schatten zählen (wie Geländerelief).
  _detail(x, y, tpp) {
    if (tpp > 24) return 0;
    return (fbm(x / 70, y / 70, this.dseed, 3) - 0.5) * 0.09;
  }

  _row(en) {
    const { world } = this;
    const j = en.j, tpp = this.tpp(j), R = SIZE * tpp;
    const X0 = en.rx * R, Y0 = en.ry * R;
    let oct = 5 - Math.max(0, j - 1);
    if (oct < 2) oct = 2;
    const TT = this._T, F = this._F, o = this._o;
    const v = en.row, y = Y0 + (v + 0.5) * tpp;
    if (v === 0) {   // Zeile darüber für das Gefälle in y-Richtung
      for (let u = -1; u <= SIZE; u++) { const x = X0 + (u + 0.5) * tpp; world.sample(x, y - tpp, o, oct, tpp); this._E[u + 1] = o.e + (o.e > 0 ? this._detail(x, y - tpp, tpp) : 0); }
    }
    const Ep = this._E; this._E = this._Ep; this._Ep = Ep;      // vorherige Zeile behalten
    const E = this._E;
    for (let u = -1; u <= SIZE; u++) {
      const x = X0 + (u + 0.5) * tpp;
      world.sample(x, y, o, oct, tpp);
      E[u + 1] = o.e + (o.e > 0 ? this._detail(x, y, tpp) : 0); TT[u + 1] = o.terrain; F[u + 1] = o.forest;
    }
    const out = new Uint32Array(en.img.data.buffer);
    const K = 230;
    const px0 = Math.round(X0 / tpp), py = Math.round(Y0 / tpp) + v;
    for (let u = 0; u < SIZE; u++) {
      const t = TT[u + 1], e = E[u + 1];
      // Licht von links oben: Hänge, die nach -x (und etwas -y) zeigen, sind hell
      let sh = (((E[u + 2] - E[u]) * 0.5 + (E[u + 1] - Ep[u + 1]) * 0.45) / tpp) * K;
      sh = sh < -0.45 ? -0.45 : sh > 0.45 ? 0.45 : sh;
      const n = hashI(px0 + u, py, 77 + j);
      let col;
      if (t <= T.RIVER) {
        const vv = t === T.DEEP ? (e + 0.42) / 0.32 : t === T.SEA ? (e + 0.1) / 0.1 : 0.55;
        col = mix(RAMP3[t], vv + (n - 0.5) * 0.12);
      } else if (t === T.FOREST || t === T.CONIFER) {
        const clump = hashI((px0 + u) >> 1, py >> 1, 91 + j);
        let vv = 0.5 + sh * 1.5 + (n - 0.5) * 0.45 + (clump - 0.5) * 0.35;
        if (n < 0.1) vv -= 0.3;                                  // Schatten zwischen Kronen
        col = mix(t === T.FOREST ? CANOPY_R : CONIFER_R, vv);
      } else {
        let vv = 0.55 + sh * 1.25 + (n - 0.5) * 0.16;
        if (t === T.MOUNTAIN) vv += (e - 0.66) * 0.9;
        col = mix(RAMP3[t], vv);
        // einzelne Bäume und Gehölze im Grasland
        if ((t === T.GRASS || t === T.MEADOW) && tpp <= 8 && hashI(px0 + u, py, 93) < 0.02 + F[u + 1] * 0.5) col = mix(CANOPY_R, 0.35 + sh + n * 0.3);
      }
      out[v * SIZE + u] = col;
    }
    en.row++;
    if (en.row >= SIZE) {
      en.ctx.putImageData(en.img, 0, 0);
      en.img = null;
      en.ready = true;
    }
  }

  // Zeichnet die zur Zoomstufe passende Pyramidenebene; fehlende Regionen
  // werden vorübergehend durch gröbere ersetzt.
  draw(ctx, cam, dpr, view) {
    const s = cam.scale * dpr;
    const j = this.levelFor(cam.scale);
    const tpp = this.tpp(j), R = SIZE * tpp;
    const maxR = Math.ceil(this.W / R) - 1;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [wx, wy] of [[view.x0, view.y0], [view.x1, view.y0], [view.x0, view.y1], [view.x1, view.y1]]) {
      const fx = wx / 64 + wy / 32, fy = wy / 32 - wx / 64;
      if (fx < minX) minX = fx; if (fx > maxX) maxX = fx;
      if (fy < minY) minY = fy; if (fy > maxY) maxY = fy;
    }
    const rx0 = Math.max(0, Math.floor(minX / R)), rx1 = Math.min(maxR, Math.floor(maxX / R));
    const ry0 = Math.max(0, Math.floor(minY / R)), ry1 = Math.min(maxR, Math.floor(maxY / R));
    const ready = [], parents = new Map();
    for (let ry = ry0; ry <= ry1; ry++) {
      for (let rx = rx0; rx <= rx1; rx++) {
        // Raute der Region gegen den Bildausschnitt prüfen
        const X0 = rx * R, Y0 = ry * R;
        const bx0 = (X0 - Y0 - R) * 32, bx1 = (X0 - Y0 + R) * 32, by0 = (X0 + Y0) * 16, by1 = (X0 + Y0 + 2 * R) * 16;
        if (bx1 < view.x0 || bx0 > view.x1 || by1 < view.y0 || by0 > view.y1) continue;
        const en = this.request(j, rx, ry);
        if (en.ready) { ready.push(en); continue; }
        let pj = j, prx = rx, pry = ry;
        while (pj < this.J) {
          pj++; prx >>= 1; pry >>= 1;
          const pe = pj === this.J ? this.top : this.request(pj, prx, pry);
          if (pe.ready) { parents.set(pe, pj); break; }
        }
      }
    }
    ctx.imageSmoothingEnabled = 32 * tpp * s > 1.5;       // vergrößert: weich wie eine gemalte Karte
    ctx.imageSmoothingQuality = 'high';
    const list = [...parents.keys()].sort((a, b) => b.j - a.j).concat(ready);
    for (const en of list) this._drawEntry(ctx, en, cam, s);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _drawEntry(ctx, en, cam, s) {
    const tpp = this.tpp(en.j), R = SIZE * tpp;
    const X0 = en.rx * R, Y0 = en.ry * R;
    const ex = ((X0 - Y0) * 32 - cam.x) * s + ctx.canvas.width / 2;
    const ey = ((X0 + Y0) * 16 - cam.y) * s + ctx.canvas.height / 2;
    const a = 32 * tpp * s, b = 16 * tpp * s;
    ctx.setTransform(a, b, -a, b, ex, ey);
    const o = 0.6 / a;
    ctx.drawImage(en.canvas, -o, -o, SIZE + 2 * o, SIZE + 2 * o);
  }
}
