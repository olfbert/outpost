// Wegenetz für die Logistik: Eingänge der Gebäude, Fahrkosten je Wegtyp und
// kürzeste Wege (Dijkstra über Wegfelder). Ergebnisse werden zwischengespeichert,
// bis sich das Wegenetz ändert (state.roadRev).
//
// Kosten in „Erdweg-Feldern“: Erdweg 1, Schotter 0,7, Straße 0,45, Hauptstraße 0,3.
// Ohne Weganschluss wird querfeldein gerechnet – dreimal so teuer wie ein Erdweg.

import { BUILDINGS } from '../config/buildings.js';

export const ROAD_COST = [0, 1, 0.7, 0.45, 0.3];
const OFFROAD = 3;

export class Network {
  constructor(world, state) {
    this.world = world;
    this.state = state;
    this.rev = -1;
    this.doors = new Map();
    this.dij = new Map();
  }

  _check() {
    const r = this.state.roadRev || 0;
    if (r !== this.rev) { this.rev = r; this.doors.clear(); this.dij.clear(); }
  }

  key(x, y) { return y * this.world.size + x; }

  center(b) { const d = BUILDINGS[b.type].footprint; return { x: b.x + d.width / 2, y: b.y + d.height / 2 }; }

  // Wegfeld am Gebäude (null = kein Anschluss)
  door(b) {
    this._check();
    if (this.doors.has(b.id)) return this.doors.get(b.id);
    const def = BUILDINGS[b.type], w = def.footprint.width, h = def.footprint.height;
    const cand = [];
    for (let i = 0; i < w; i++) cand.push([b.x + i, b.y + h], [b.x + i, b.y - 1]);
    for (let j = 0; j < h; j++) cand.push([b.x + w, b.y + j], [b.x - 1, b.y + j]);
    let d = null;
    for (const [x, y] of cand) if (this.state.roads.has(this.key(x, y))) { d = this.key(x, y); break; }
    this.doors.set(b.id, d);
    return d;
  }

  // Alle Kosten ab einem Wegfeld (Zwischenspeicher je Startfeld)
  costsFrom(k) {
    this._check();
    let m = this.dij.get(k);
    if (m) return m;
    const W = this.world.size, roads = this.state.roads;
    m = new Map([[k, 0]]);
    // einfache Prioritätsliste (binärer Heap)
    const heap = [[0, k]];
    const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    let n = 0;
    while (heap.length && n++ < 60000) {
      const [c, u] = pop();
      if (c > m.get(u)) continue;
      const x = u % W, y = (u - x) / W;
      for (const v of [u + 1, u - 1, u + W, u - W]) {
        const t = roads.get(v);
        if (!t) continue;
        if ((v === u + 1 && x === W - 1) || (v === u - 1 && x === 0)) continue;
        const nc = c + (ROAD_COST[t] + ROAD_COST[roads.get(u)]) / 2;
        if (nc < (m.get(v) ?? Infinity)) { m.set(v, nc); push([nc, v]); }
      }
    }
    if (this.dij.size > 400) this.dij.clear();
    this.dij.set(k, m);
    return m;
  }

  // Fahrkosten zwischen zwei Gebäuden (Infinity = nicht erreichbar)
  dist(a, b) {
    if (a === b) return 0;
    const da = this.door(a), db = this.door(b);
    if (da != null && db != null) {
      const c = this.costsFrom(da).get(db);
      if (c !== undefined) return c + 1;
    }
    // querfeldein (z. B. ohne Weganschluss oder in getrennten Netzen) – teuer
    const ca = this.center(a), cb = this.center(b);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y) * OFFROAD + 2;
  }

  connected(a, b) {
    const da = this.door(a), db = this.door(b);
    return da != null && db != null && this.costsFrom(da).has(db);
  }
}
