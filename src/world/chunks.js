// Chunk-Speicher: erzeugt Felddaten bei Bedarf aus dem Weltgenerator und
// hält nur eine begrenzte Zahl im Speicher. Gespeichert wird davon nichts –
// persistent sind ausschließlich die Änderungen des Spielers (state).

import { O, T, isDeposit } from '../config/terrain.js';
import { vnoise } from './noise.js';
import { fieldPhase, monthIndex } from '../simulation/farming.js';

export class ChunkStore {
  constructor(world, state, cfg) {
    this.cfg = cfg;
    this.world = world;
    this.state = state;
    this.N = cfg.chunkSize;
    this.P = this.N + 4;          // 2 Felder Rand je Seite für Übergänge
    this.shift = Math.log2(this.N) | 0;
    this.mask = this.N - 1;
    this.map = new Map();
    this.maxChunks = 2400;
    this.tick = 0;
    this._o = { e: 0, m: 0, temp: 0, terrain: 0, forest: 0 };
  }

  key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }

  peek(cx, cy) { return this.map.get(this.key(cx, cy)); }

  get(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.map.get(k);
    if (c) { c.used = ++this.tick; return c; }
    c = this._generate(cx, cy);
    c.used = ++this.tick;
    this.map.set(k, c);
    if (this.map.size > this.maxChunks) this._evict();
    return c;
  }

  _generate(cx, cy) {
    const { N, P, world } = this;
    const W = world.size;
    const X0 = cx * N, Y0 = cy * N;
    const terrain = new Uint8Array(P * P);
    const elev = new Float32Array(P * P);
    const tint = new Float32Array(P * P);
    const obj = new Uint8Array(N * N);
    const vari = new Uint32Array(N * N);
    // Wege inkl. Rand (für die automatische Form an Chunk-Grenzen)
    const roads = this.state.roads;
    let road = null;
    if (roads.size) {
      for (let ty = -2; ty < N + 2; ty++) for (let tx = -2; tx < N + 2; tx++) {
        const x = X0 + tx, y = Y0 + ty;
        if (x < 0 || y < 0 || x >= W || y >= W) continue;
        const r = roads.get(y * W + x);
        if (r) { if (!road) road = new Uint8Array(P * P); road[(ty + 2) * P + tx + 2] = r; }
      }
    }
    const o = this._o;
    const cleared = this.state.cleared, felled = this.state.felled;
    let dep = null;
    let objCount = 0;
    for (let ty = -2; ty < N + 2; ty++) {
      for (let tx = -2; tx < N + 2; tx++) {
        const x = X0 + tx, y = Y0 + ty;
        world.sample(x, y, o);
        const i = (ty + 2) * P + tx + 2;
        terrain[i] = o.terrain;
        elev[i] = o.e;
        if (tx >= 0 && ty >= 0 && tx < N && ty < N && x >= 0 && y >= 0 && x < W && y < W) {
          const j = ty * N + tx;
          const v = world.variantAt(x, y);
          vari[j] = v;
          const k = y * W + x;
          if (!cleared.has(k)) {
            let ob = world.objectAt(x, y, o.terrain, o.forest);
            const fAt = felled.get(k);
            if (fAt !== undefined) {   // gefällt: Stumpf, dann junger Baum
              const age = this.state.gameMonths - fAt;
              ob = age < this.cfg.regrowSaplingMonths ? O.STUMP : (ob === O.CONIFER ? O.SAPLING_C : O.SAPLING);
            }
            if (ob !== O.NONE) { obj[j] = ob; objCount++; }
          }
        }
      }
    }
    // Felder und Weiden (inkl. Rand, für Zäune an Chunk-Grenzen)
    let field = null;
    const ft = this.state.fieldTiles;
    if (ft && ft.size) {
      const phase = fieldPhase(monthIndex(this.state.gameMonths || 0));
      for (let ty = -2; ty < N + 2; ty++) for (let tx = -2; tx < N + 2; tx++) {
        const x = X0 + tx, y = Y0 + ty;
        if (x < 0 || y < 0 || x >= W || y >= W) continue;
        const f = ft.get(y * W + x);
        if (!f) continue;
        if (!field) field = new Uint8Array(P * P);
        field[(ty + 2) * P + tx + 2] = f.kind === 'pasture' ? 20 : 1 + phase * 2 + (f.b.crop === 'grain' ? 1 : 0);
      }
    }
    // Vorkommen als Bodenschicht (inkl. Rand, für weiche Übergänge an Chunk-Grenzen)
    for (let ty = -2; ty < N + 2; ty++) for (let tx = -2; tx < N + 2; tx++) {
      const x = X0 + tx, y = Y0 + ty;
      if (x < 0 || y < 0 || x >= W || y >= W) continue;
      const i = (ty + 2) * P + tx + 2;
      const d = world.objectAt(x, y, terrain[i], 0);
      if (isDeposit(d)) { if (!dep) dep = new Uint8Array(P * P); dep[i] = d; }
    }
    // Schattierung aus dem Gefälle (Licht von links oben) plus leichte Variation je Feld.
    for (let ty = 0; ty < P; ty++) {
      for (let tx = 0; tx < P; tx++) {
        const i = ty * P + tx;
        const a = elev[ty * P + Math.max(0, tx - 1)];
        const b = elev[ty * P + Math.min(P - 1, tx + 1)];
        let s = (b - a) * 40 + (elev[Math.min(P - 1, ty + 1) * P + tx] - elev[Math.max(0, ty - 1) * P + tx]) * 18;
        s = s < -0.22 ? -0.22 : s > 0.22 ? 0.22 : s;
        const h = world.variantAt(X0 + tx - 2, Y0 + ty - 2);
        const gx = X0 + tx - 2, gy = Y0 + ty - 2;
        const blotch = vnoise(gx / 3.3, gy / 3.3, 9173) - 0.5 + (vnoise(gx / 9.5, gy / 9.5, 9181) - 0.5) * 0.8;
        tint[i] = s + blotch * 0.3 + (((h >>> 20) & 255) / 255 - 0.5) * 0.08;
      }
    }
    return { cx, cy, X0, Y0, terrain, elev, tint, obj, vari, road, dep, field, objCount, draw: null, used: 0 };
  }

  _evict() {
    const arr = [...this.map.entries()].sort((a, b) => a[1].used - b[1].used);
    const drop = Math.floor(arr.length * 0.25);
    for (let i = 0; i < drop; i++) this.map.delete(arr[i][0]);
  }

  // Feld-Abfrage für UI und Platzierung.
  tile(x, y) {
    const cx = x >> this.shift, cy = y >> this.shift;
    const c = this.get(cx, cy);
    const tx = x & this.mask, ty = y & this.mask;
    const i = (ty + 2) * this.P + tx + 2;
    return { terrain: c.terrain[i], elev: c.elev[i], obj: c.obj[ty * this.N + tx], chunk: c };
  }

  // Nach einer Änderung (Rodung, Bau, Weg) betroffene Chunks neu erzeugen.
  // Wegen des 2-Felder-Randes zählen auch Nachbar-Chunks dazu.
  invalidateArea(x0, y0, x1, y1) {
    const s = this.shift;
    for (let cy = (y0 - 2) >> s; cy <= (y1 + 2) >> s; cy++) {
      for (let cx = (x0 - 2) >> s; cx <= (x1 + 2) >> s; cx++) this.map.delete(this.key(cx, cy));
    }
  }

  invalidateTile(x, y) { this.invalidateArea(x, y, x, y); }

  clear() { this.map.clear(); }
}
