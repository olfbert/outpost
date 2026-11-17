// Leben in der Siedlung: Bewohner, die über Wege zur Arbeit gehen, Wildtiere
// auf den Wiesen und Hühner an den Häusern. Alles läuft in Echtzeit und ist
// reine Darstellung (kein Spielstand) – die Figuren entstehen beim Laden neu.
// Die Simulation (Produktion) bleibt davon unberührt.

import { BUILDINGS } from '../config/buildings.js';
import { cargoIndex } from '../rendering/lifeSprites.js';
import { T, isWater } from '../config/terrain.js';
import { rand2 } from '../world/noise.js';

const WALK = 1.15;            // Felder je Sekunde (Menschen)
const GRAZER_WALK = 0.7;
const HERD_CHANCE = 0.12;     // Anteil der Wiesen-Chunks mit einer Herde
const HERD_DIST = 22;         // Mindestabstand der Herden zur Siedlung (Felder)

function dirOf(dx, dy) {
  // Bildschirmrichtung der Bewegung im Feldraster: +x = SO, +y = SW, -x = NW, -y = NO
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 0 : 3;
  return dy >= 0 ? 1 : 2;
}

export class Life {
  constructor(world, store, state, placement, sprites) {
    this.world = world; this.store = store; this.state = state; this.placement = placement;
    this.sp = sprites.life;
    this.people = []; this.animals = []; this.herds = new Map();
    this.trucks = [];
    this.logistics = null;     // wird von main gesetzt (Strecken der Disposition)
    this.rev = -1;
    this.time = 0;
    this.stats = { residents: 0, jobs: 0, employed: 0 };
  }

  key(x, y) { return y * this.world.size + x; }

  // --- Felder ------------------------------------------------------------------
  free(x, y) {           // für Tiere und Bummler: Land, kein Weg, kein Gebäude, kein Sumpf
    x = Math.floor(x); y = Math.floor(y);
    if (!this.world.inBounds(x, y)) return false;
    if (this.state.roads.has(this.key(x, y)) || this.placement.buildingAt(x, y)) return false;
    const t = this.store.tile(x, y).terrain;
    return !isWater(t) && t !== T.SWAMP && t !== T.MOUNTAIN && t !== T.ROCK;
  }

  // für Menschen begehbar: Land oder Weg, kein fremdes Gebäude (allow = erlaubte Gebäude-IDs)
  walkable(x, y, allow) {
    x = Math.floor(x); y = Math.floor(y);
    if (!this.world.inBounds(x, y)) return false;
    const b = this.placement.buildingAt(x, y);
    if (b) return !!(allow && allow.has(b.id));
    if (this.state.roads.has(this.key(x, y))) return true;
    const t = this.store.tile(x, y).terrain;
    return !isWater(t) && t !== T.SWAMP && t !== T.MOUNTAIN && t !== T.ROCK;
  }

  // Gerade Strecke frei? (in kleinen Schritten abgetastet)
  clear(ax, ay, bx, by, allow, test) {
    const m = 0.14;   // Abstand zu Hauswänden
    const ok = test || ((x, y) => this.walkable(x - m, y - m, allow) && this.walkable(x + m, y - m, allow) && this.walkable(x - m, y + m, allow) && this.walkable(x + m, y + m, allow));
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.2);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!ok(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }

  // Weg abseits der Straßen um Gebäude herum (Breitensuche, 8 Richtungen, ohne Ecken
  // abzuschneiden), danach geglättet. Liefert Punkte ab (nicht inkl.) dem Start.
  offroad(from, to, allow) {
    if (this.clear(from.x, from.y, to.x, to.y, allow)) return [to];
    const W = this.world.size;
    const sx = Math.floor(from.x), sy = Math.floor(from.y), gx = Math.floor(to.x), gy = Math.floor(to.y);
    const start = this.key(sx, sy), goal = this.key(gx, gy);
    const prev = new Map([[start, -1]]), q = [start];
    const ok = (x, y) => this.walkable(x, y, allow);
    let found = start === goal;
    for (let qi = 0; qi < q.length && qi < 5000 && !found; qi++) {
      const k = q[qi], x = k % W, y = (k - x) / W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy, n = this.key(nx, ny);
        if (prev.has(n) || !ok(nx, ny)) continue;
        if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
        prev.set(n, k); q.push(n);
        if (n === goal) { found = true; break; }
      }
    }
    if (!found) return null;
    const tiles = [];
    for (let k = goal; k !== -1; k = prev.get(k)) { const x = k % W; tiles.push({ x: x + 0.5, y: (k - x) / W + 0.5 }); }
    tiles.reverse();
    tiles[0] = { x: from.x, y: from.y }; tiles[tiles.length - 1] = { x: to.x, y: to.y };
    // Glätten: so weit wie möglich geradeaus
    const out = [];
    let cur = tiles[0], i = 0;
    while (i < tiles.length - 1) {
      let j = tiles.length - 1;
      while (j > i + 1 && !this.clear(cur.x, cur.y, tiles[j].x, tiles[j].y, allow)) j--;
      out.push(tiles[j]); cur = tiles[j]; i = j;
    }
    return out;
  }

  _center(b) { const d = BUILDINGS[b.type]; return { x: b.x + d.footprint.width / 2, y: b.y + d.footprint.height / 2 }; }

  // Weg aus einem Gebäude hinaus zu einem Punkt (bzw. hinein, wenn toB gesetzt)
  _walkPath(p, to, fromB, toB) {
    const allow = new Set();
    if (fromB) allow.add(fromB.id);
    if (toB) allow.add(toB.id);
    const pts = this.offroad({ x: p.x, y: p.y }, to, allow);
    if (!pts) return null;
    return [{ x: p.x, y: p.y }, ...pts];
  }

  // Wegfeld neben einem Gebäude (Eingang)
  door(b) {
    const def = BUILDINGS[b.type], w = def.footprint.width, h = def.footprint.height;
    const cand = [];
    for (let i = 0; i < w; i++) cand.push([b.x + i, b.y + h], [b.x + i, b.y - 1]);
    for (let j = 0; j < h; j++) cand.push([b.x + w, b.y + j], [b.x - 1, b.y + j]);
    for (const [x, y] of cand) if (this.state.roads.has(this.key(x, y))) return { x, y };
    return null;
  }

  // Kürzester Weg über Wegfelder (Breitensuche, begrenzt)
  route(a, b) {
    if (!a || !b) return null;
    const W = this.world.size, roads = this.state.roads;
    const start = this.key(a.x, a.y), goal = this.key(b.x, b.y);
    if (start === goal) return [a];
    const prev = new Map([[start, -1]]);
    const q = [start];
    for (let qi = 0; qi < q.length && qi < 8000; qi++) {
      const k = q[qi];
      if (k === goal) break;
      const x = k % W, y = (k - x) / W;
      for (const n of [k + 1, k - 1, k + W, k - W]) {
        if (prev.has(n) || !roads.has(n)) continue;
        const nx = n % W;
        if (Math.abs(nx - x) > 1) continue;
        prev.set(n, k); q.push(n);
      }
    }
    if (!prev.has(goal)) return null;
    const path = [];
    for (let k = goal; k !== -1; k = prev.get(k)) { const x = k % W; path.push({ x, y: (k - x) / W }); }
    return path.reverse();
  }

  // --- Bewohner ------------------------------------------------------------------
  // Nach Bau/Abriss: Bewohner neu verteilen (vorhandene Figuren bleiben, wo möglich)
  rebuild() {
    this.rev = this.state.rev;
    const bs = this.state.buildings;
    const homes = [], jobs = [];
    for (const b of bs) {
      const def = BUILDINGS[b.type];
      if (b.site) continue;
      const n = def.residents ? Math.floor(b.pop ?? def.residents) : 0;
      for (let i = 0; i < n; i++) homes.push(b);
      if (!b.paused) for (let i = 0; i < (b.staff ?? def.workers ?? 0); i++) jobs.push(b);
    }
    const old = this.people;
    this.people = [];
    this._routes = new Map();
    homes.forEach((home, i) => {
      const work = i < jobs.length ? jobs[i] : null;
      const h = Math.floor(rand2(home.x * 7 + i, home.y, 41) * 1e6);
      const prevP = old.find((p) => !p.builder && p.home === home.id && p.slot === i);
      const p = prevP || {
        home: home.id, slot: i, look: work && work.type === 'lumber_camp' ? 0 : h % 6, skin: (h >> 3) % 4,
        x: home.x + 0.5, y: home.y + 0.5, state: 'inside', timer: 1 + (h % 900) / 60, path: null, dir: 0, phase: (h % 100) / 100,
      };
      p.work = work ? work.id : null;
      this.people.push(p);
    });
    // Bautrupps: je Baustelle mit Trupp zwei Arbeiter vom Landemodul bzw. Bauhof
    const bases = bs.filter((b) => !b.site && BUILDINGS[b.type]?.provides?.builders);
    for (const site of bs) {
      if (!site.site || site.site.status === 'queued' || !bases.length) continue;
      let base = bases[0], bd = Infinity;
      for (const q of bases) { const d = Math.abs(q.x - site.x) + Math.abs(q.y - site.y); if (d < bd) { bd = d; base = q; } }
      for (let k = 0; k < 2; k++) {
        const prevP = old.find((p) => p.builder && p.site === site.id && p.slot === k);
        const c = this._center(base);
        this.people.push(prevP || { builder: true, site: site.id, base: base.id, home: base.id, slot: k, look: 1 + k * 2, skin: (site.x + k) % 4,
          x: c.x, y: c.y, state: 'inside', timer: 0.5 + k, path: null, dir: 0, phase: k * 0.4, at: base.id });
      }
    }
    // Bauarbeiter auf dem Heimweg nicht verschwinden lassen
    for (const p of old) if (p.builder && p.state === 'walk' && p.dest === p.base && !this.people.includes(p)) this.people.push(p);
    const pop = this.state.pop;
    this.stats = pop ? { residents: pop.residents, jobs: pop.jobs, employed: pop.employed } : { residents: homes.length, jobs: jobs.length, employed: Math.min(homes.length, jobs.length) };
    this._rebuildChickens();
  }

  _building(id) { return this.state.buildings.find((b) => b.id === id) || (this.state.npcBuildings || []).find((b) => b.id === id); }

  _planTrip(p, fromB, toB) {
    const a = this.door(fromB), b = this.door(toB);
    const ck = fromB.id + '>' + toB.id;
    let r = this._routes.get(ck);
    if (r === undefined) { r = this.route(a, b); this._routes.set(ck, r); }
    if (!r) return false;
    // Pfad: Gebäudemitte -> Eingang -> Weg -> Eingang -> Gebäudemitte, leicht seitlich versetzt
    const off = (p.slot % 3 - 1) * 0.16;
    let pts = [{ x: p.x, y: p.y }];
    const first = { x: r[0].x + 0.5 + off, y: r[0].y + 0.5 - off };
    const lead = this._walkPath(p, first, fromB, null);
    if (!lead) return false;
    pts = lead;
    // weiter Weg: mit dem Auto (Rechtsverkehr), sonst zu Fuß
    p.car = r.length > 18 && !p.builder ? 1 + ((p.slot + (p.skin || 0)) % 5) : 0;
    if (p.car) { const rp = this._roadPoints(r); pts.push(...rp.slice(1)); }
    else for (const t of r.slice(1)) pts.push({ x: t.x + 0.5 + off, y: t.y + 0.5 - off });
    const def = BUILDINGS[toB.type];
    pts.push({ x: toB.x + def.footprint.width / 2, y: toB.y + def.footprint.height / 2 });
    p.path = pts; p.pi = 1; p.dest = toB.id;
    return true;
  }

  // Arbeit draußen: Holzfäller am Baum, Bauern auf dem Feld, Bauarbeiter an der Baustelle
  _workSpot(p, work) {
    if (p.builder) {
      const site = this._building(p.site);
      if (!site || !site.site) return null;
      const def = BUILDINGS[site.type], w = def.footprint.width, h = def.footprint.height;
      // an der vorderen Kante der Baustelle
      return p.slot ? { x: site.x + w + 0.35, y: site.y + h * 0.5, tx: site.x + w - 1, ty: site.y } : { x: site.x + w * 0.5, y: site.y + h + 0.35, tx: site.x, ty: site.y + h - 1 };
    }
    if (work.type === 'lumber_camp') {
      const t = work.target;
      if (!t) return null;
      const side = (p.slot % 2 ? 1 : -1);
      return { x: t.x + 0.5 + side * 0.38, y: t.y + 0.5 - side * 0.12, tx: t.x, ty: t.y };
    }
    if (work.fields && work.fields.length) {
      const mi = Math.floor(this.state.gameMonths || 0) % 12;
      if (work.type === 'farm' && (mi === 11 || mi <= 1)) return null;      // Winterruhe
      const k = work.fields[Math.floor(rand2(p.slot, Math.floor(this.time / 40), 77) * work.fields.length)];
      const W = this.world.size, x = k % W, y = (k - x) / W;
      return { x: x + 0.3 + rand2(x, y, p.slot) * 0.4, y: y + 0.3 + rand2(y, x, p.slot) * 0.4, tx: x, ty: y };
    }
    return null;
  }

  _lumberTrip(p, work) {
    const spot = this._workSpot(p, work);
    if (!spot) return false;
    const from = p.builder ? this._building(p.at) : work;
    const path = this._walkPath(p, { x: spot.x, y: spot.y }, from, p.builder ? this._building(p.site) : null);
    if (!path) return false;
    p.path = path; p.pi = 1;
    p.state = 'toTree'; p.tree = { x: spot.tx, y: spot.ty }; p.visibleIdle = false;
    return true;
  }

  _updatePerson(p, dt) {
    if (p.state === 'chop') {
      p.timer -= dt;
      if (p.builder) {
        const site = this._building(p.site);
        if (site && site.site) return;          // arbeiten, bis die Baustelle fertig ist
        const base = this._building(p.base);
        const path = base ? this._walkPath(p, this._center(base), null, base) : null;
        if (path) { p.path = path; p.pi = 1; p.state = 'walk'; p.dest = base.id; }
        else { p.state = 'inside'; p.timer = 1e9; }
        return;
      }
      const work = this._building(p.work);
      const felled = !work || (work.type === 'lumber_camp' && (!work.target || work.target.x !== p.tree.x || work.target.y !== p.tree.y));
      if (felled || p.timer <= 0) {
        // zurück zum Lager
        const to = work ? this._center(work) : { x: p.x, y: p.y };
        const path = work ? this._walkPath(p, to, null, work) : null;
        p.path = path || [{ x: p.x, y: p.y }, to]; p.pi = 1; p.state = 'walk'; p.dest = p.work; p.trips = (p.trips || 0) + 1;
      }
      return;
    }
    if (p.builder && p.state === 'inside') {
      p.timer -= dt;
      if (p.timer > 0) return;
      const site = this._building(p.site);
      if (site && site.site && this._lumberTrip(p, null)) return;
      p.timer = site && site.site ? 3 : 1e9;
      return;
    }
    if (p.state === 'inside') {
      p.timer -= dt;
      if (p.timer > 0) return;
      const home = this._building(p.home), work = p.work ? this._building(p.work) : null;
      if (work && p.at === work.id && (work.type === 'lumber_camp' || work.fields) && (p.trips || 0) < 4 && this._lumberTrip(p, work)) return;
      if (work && p.at === work.id) p.trips = 0;
      if (!home) return;
      const at = p.at || home.id;
      const target = at === home.id ? work : home;
      if (target && target.id !== at && this._planTrip(p, this._building(at) || home, target)) { p.state = 'walk'; p.visibleIdle = false; return; }
      // kein Weg: ums Haus bummeln
      for (let k = 0; k < 6; k++) {
        const tx = home.x + 0.5 + (rand2(k, Math.floor(this.time), p.slot + 3) - 0.5) * 6;
        const ty = home.y + 0.5 + (rand2(k + 9, Math.floor(this.time), p.slot + 5) - 0.5) * 6;
        if (!this.free(tx, ty)) continue;
        const path = this._walkPath(p, { x: tx, y: ty }, this._building(p.at || p.home) || home, null);
        if (path && path.length <= 6) { p.path = path; p.pi = 1; p.dest = null; p.state = 'stroll'; return; }
      }
      p.timer = 5;
      return;
    }
    if (p.state === 'idle') {
      p.timer -= dt;
      if (p.timer <= 0) {
        // nach dem Bummeln zurück ins Haus (um andere Gebäude herum)
        const back = this._building(p.at || p.home) || this._building(p.home);
        const path = back ? this._walkPath(p, this._center(back), null, back) : null;
        if (path) { p.path = path; p.pi = 1; p.dest = back.id; p.state = 'walk'; return; }
        p.state = 'inside'; p.timer = 0; p.at = p.at || p.home; p.visibleIdle = true;
      }
      return;
    }
    const tgt = p.path[p.pi];
    const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy);
    const onRoad = p.car && this.state.roads.has(this.key(Math.floor(p.x), Math.floor(p.y)));
    const step = (p.state === 'stroll' ? 0.6 : p.state === 'toTree' ? 0.8 : onRoad ? 1.3 : WALK) * dt;
    if (d > 1e-3) p.dir = dirOf(dx, dy);
    if (d <= step) {
      p.x = tgt.x; p.y = tgt.y; p.pi++;
      if (p.pi >= p.path.length) {
        if (p.state === 'toTree') {
          p.state = 'chop'; p.timer = 25 + rand2(p.slot, Math.floor(this.time), 13) * 35; p.path = null;
          const t = p.tree; p.dir = dirOf(t.x + 0.5 - p.x, t.y + 0.5 - p.y);
          return;
        }
        if (p.state === 'stroll') { p.state = 'idle'; p.timer = 2 + rand2(p.slot, Math.floor(this.time), 7) * 4; }
        else { p.state = 'inside'; p.at = p.dest; const dst = this._building(p.dest); const outdoor = dst && (dst.type === 'lumber_camp' || dst.fields); p.timer = p.builder ? 1e9 : outdoor ? 3 + rand2(p.slot, Math.floor(this.time), 9) * 4 : 10 + rand2(p.slot, Math.floor(this.time), 9) * 25; }
        p.path = null;
      }
    } else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
  }

  // --- Tiere ---------------------------------------------------------------------
  _rebuildChickens() {
    this.animals = this.animals.filter((a) => a.kind !== 'chicken' && a.kind !== 'cattle');
    const W = this.world.size;
    for (const b of this.state.buildings) {
      if (b.type !== 'ranch' || b.site || !b.fields || !b.fields.length) continue;
      const set = new Set(b.fields);
      const n = Math.min(10, Math.ceil(b.fields.length / 2.5));
      for (let i = 0; i < n; i++) {
        const k = b.fields[Math.floor(rand2(b.x + i, b.y, 71) * b.fields.length)];
        const x = k % W + 0.2 + rand2(i, b.x, 73) * 0.6, y = (k - (k % W)) / W + 0.2 + rand2(b.y, i, 74) * 0.6;
        this.animals.push({ kind: 'cattle', home: b.id, pasture: set, fields: b.fields, hx: x, hy: y, x, y, tx: x, ty: y, dir: i % 4, state: 'graze', timer: rand2(i, b.x, 75) * 5, phase: i * 0.29 });
      }
    }
    for (const b of this.state.buildings) {
      if (!['house_small', 'wood_house'].includes(b.type) || b.site) continue;
      for (let i = 0; i < 3; i++) {
        let x = b.x + 0.5, y = b.y + 1.4;
        for (let k = 0; k < 8; k++) {
          const tx = b.x + 0.5 + (rand2(b.x + k, b.y + i, 61) - 0.5) * 3, ty = b.y + 0.5 + (rand2(b.x, b.y + k + i, 63) - 0.5) * 3;
          if (this.free(tx, ty)) { x = tx; y = ty; break; }
        }
        if (!this.free(x, y)) continue;
        this.animals.push({ kind: 'chicken', home: b.id, hx: b.x + 0.5, hy: b.y + 0.5, x, y, tx: x, ty: y, dir: i % 4, state: 'idle', timer: rand2(i, b.x, 3) * 3, phase: i * 0.3 });
      }
    }
  }

  // Herden für sichtbare Chunks erzeugen (deterministisch je Chunk)
  _ensureHerds(view) {
    const N = this.store.N, sh = this.store.shift;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [wx, wy] of [[view.x0, view.y0], [view.x1, view.y0], [view.x0, view.y1], [view.x1, view.y1]]) {
      const fx = wx / 64 + wy / 32, fy = wy / 32 - wx / 64;
      minX = Math.min(minX, fx); maxX = Math.max(maxX, fx); minY = Math.min(minY, fy); maxY = Math.max(maxY, fy);
    }
    const cx0 = Math.floor(minX) >> sh, cx1 = Math.floor(maxX) >> sh, cy0 = Math.floor(minY) >> sh, cy1 = Math.floor(maxY) >> sh;
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 400) return;
    const center = this.placement.settlementCenter() || this.world.start;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cx * 65536 + cy;
      if (this.herds.has(k)) continue;
      this.herds.set(k, true);
      if (rand2(cx, cy, 5151) > HERD_CHANCE) continue;
      const hx = cx * N + 3 + rand2(cx, cy, 5153) * (N - 6), hy = cy * N + 3 + rand2(cx, cy, 5155) * (N - 6);
      if (Math.hypot(hx - center.x, hy - center.y) < HERD_DIST) continue;
      const t = this.store.tile(Math.floor(hx), Math.floor(hy)).terrain;
      if (t !== T.GRASS && t !== T.MEADOW) continue;
      const n = 3 + Math.floor(rand2(cx, cy, 5157) * 4);
      for (let i = 0; i < n; i++) {
        const x = hx + (rand2(i, cx, cy) - 0.5) * 4, y = hy + (rand2(cx, i, cy) - 0.5) * 4;
        if (!this.free(x, y)) continue;
        this.animals.push({ kind: 'grazer', herd: k, hx, hy, x, y, tx: x, ty: y, dir: i % 4, state: 'graze', timer: rand2(i, cx, 7) * 6, phase: i * 0.37 });
      }
    }
  }

  _onPasture(a, x, y) { return a.pasture.has(Math.floor(y) * this.world.size + Math.floor(x)); }

  _updateAnimal(a, dt) {
    a.timer -= dt;
    if (a.kind === 'cattle') {
      if (a.state === 'walk') {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), step = 0.45 * dt;
        if (d <= step) { a.x = a.tx; a.y = a.ty; a.state = 'graze'; a.timer = 3 + rand2(a.x * 7, a.y * 7, 13) * 8; }
        else { a.x += (dx / d) * step; a.y += (dy / d) * step; a.dir = dirOf(dx, dy); }
        return;
      }
      if (a.timer > 0) return;
      for (let k = 0; k < 6; k++) {
        const tx = a.x + (rand2(a.x * 11 + k, a.y * 11, 17) - 0.5) * 3, ty = a.y + (rand2(a.y * 11 + k, a.x * 11, 19) - 0.5) * 3;
        if (this._onPasture(a, tx, ty) && this.clear(a.x, a.y, tx, ty, null, (x, y) => this._onPasture(a, x, y))) { a.tx = tx; a.ty = ty; a.state = 'walk'; return; }
      }
      a.timer = 2;
      return;
    }
    if (a.state === 'walk') {
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      const step = (a.kind === 'chicken' ? 0.5 : GRAZER_WALK) * dt;
      if (d <= step) { a.x = a.tx; a.y = a.ty; a.state = a.kind === 'chicken' ? 'idle' : 'graze'; a.timer = 2 + rand2(a.x * 9, a.y * 9, 11) * 6; }
      else { a.x += (dx / d) * step; a.y += (dy / d) * step; a.dir = dirOf(dx, dy); }
      // Weg oder Gebäude im Weg (z. B. neu gebaut): umkehren
      if (!this.free(a.x, a.y)) { a.x = a.px ?? a.x; a.y = a.py ?? a.y; a.tx = a.x; a.ty = a.y; a.state = a.kind === 'chicken' ? 'idle' : 'graze'; a.timer = 1; }
      else { a.px = a.x; a.py = a.y; }
      return;
    }
    if (a.timer > 0) return;
    const r = a.kind === 'chicken' ? 1.4 : 3.5;
    for (let k = 0; k < 5; k++) {
      const tx = a.hx + (rand2(a.x * 13 + k, a.y * 13, 17) - 0.5) * 2 * r, ty = a.hy + (rand2(a.y * 13 + k, a.x * 13, 19) - 0.5) * 2 * r;
      if (this.free(tx, ty) && this.clear(a.x, a.y, tx, ty, null, (x, y) => this.free(x, y))) { a.px = a.x; a.py = a.y; a.tx = tx; a.ty = ty; a.state = 'walk'; return; }
    }
    a.timer = 3;
  }

  // --- Pro Frame -----------------------------------------------------------------
  // --- Lkw ------------------------------------------------------------------------
  _truckHome() {
    return this.state.buildings.find((b) => !b.site && b.type === 'haulage') || this.state.buildings.find((b) => b.type === 'landing_module');
  }

  _syncTrucks() {
    const want = Math.min(12, this.logistics ? this.logistics.stats.trucks || 0 : 0);
    while (this.trucks.length > want) this.trucks.pop();
    while (this.trucks.length < want) {
      const home = this._truckHome();
      if (!home) break;
      const d = this.door(home);
      if (!d) break;
      const i = this.trucks.length;
      this.trucks.push({ i, cab: i % 3, x: d.x + 0.5, y: d.y + 0.5, dir: 0, path: null, pi: 0, state: 'garage', wait: 1 + i * 3, cargo: 0, next: null });
    }
  }

  // Wegpunkte entlang der Felder, rechts versetzt (Rechtsverkehr)
  _roadPoints(tiles) {
    const pts = [];
    for (let i = 0; i < tiles.length; i++) {
      const a = tiles[Math.max(0, i - 1)], b = tiles[Math.min(tiles.length - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      const lane = this.state.roads.get(this.key(tiles[i].x, tiles[i].y)) === 4 ? 0.22 : 0.15;   // Hauptstraße: eigene Fahrspur
      pts.push({ x: tiles[i].x + 0.5 - dy * lane, y: tiles[i].y + 0.5 + dx * lane });
    }
    return pts;
  }

  // Steht ein anderer Lkw (oder ein Auto) kurz vor uns in derselben Spur?
  _heading(v) {
    const t = v.state === 'drive' && v.path ? v.path[v.pi] : null;
    if (!t) return null;
    const hx = t.x - v.x, hy = t.y - v.y, n = Math.hypot(hx, hy);
    return n < 1e-4 ? null : { x: hx / n, y: hy / n };
  }

  // Steht o vor v (in der Spur oder im Nahbereich vor der Haube)?
  _infront(v, h, o) {
    const dx = o.x - v.x, dy = o.y - v.y, d = Math.hypot(dx, dy);
    if (d > 0.7) return false;
    const ahead = dx * h.x + dy * h.y, side = Math.abs(-dx * h.y + dy * h.x);
    if (ahead > 0.05 && ahead < 0.62 && side < 0.2) return true;
    return d < 0.4 && ahead > 0;
  }

  // Muss v warten? Gegenverkehr blockiert nie; sehen sich zwei gegenseitig vor sich,
  // fährt der mit der kleineren Nummer, der andere wartet.
  _blocked(v) {
    const h = this._heading(v);
    if (!h) return false;
    for (const o of this.trucks) {
      if (o === v || o.state === 'garage') continue;
      const d = Math.hypot(o.x - v.x, o.y - v.y);
      if (d < 0.12) { if (o.i < v.i) return true; continue; }
      if (!this._infront(v, h, o)) continue;
      const oh = this._heading(o);
      if (oh) {
        if (oh.x * h.x + oh.y * h.y < -0.3) continue;              // Gegenverkehr: fährt in seiner Spur vorbei
        if (this._infront(o, oh, v) && v.i < o.i) continue;       // gegenseitig: kleinere Nummer hat Vorfahrt
      }
      return true;
    }
    return false;
  }

  _updateTruck(v, dt) {
    if (v.state === 'garage') {
      v.wait -= dt;
      if (v.wait > 0) return;
      // erst ausfahren, wenn die Ausfahrt frei ist
      if (this.trucks.some((o) => o !== v && o.state !== 'garage' && Math.hypot(o.x - v.x, o.y - v.y) < 0.7)) { v.wait = 1; return; }
      v.state = 'wait'; v.wait = 0;
    }
    if (v.state === 'drive') {
      if (this._blocked(v) && (v.stuck = (v.stuck || 0) + dt) < 8) return;
      v.stuck = 0;
      let left = dt * this._truckSpeed(v);
      while (left > 0 && v.pi < v.path.length) {
        const t = v.path[v.pi], dx = t.x - v.x, dy = t.y - v.y, d = Math.hypot(dx, dy);
        if (d > 1e-3) v.dir = dirOf(dx, dy);
        if (d <= left) { v.x = t.x; v.y = t.y; v.pi++; left -= d; }
        else { v.x += (dx / d) * left; v.y += (dy / d) * left; left = 0; }
      }
      if (v.pi >= v.path.length) {
        v.state = 'wait'; v.wait = 2.5;
        if (v.leg === 'pickup') { v.cargo = cargoIndex(v.next.good); }
        else if (v.leg === 'deliver') { v.cargo = 0; v.next = null; }
        else if (v.leg === 'home') { v.state = 'garage'; v.wait = 4 + rand2(v.i, Math.floor(this.time), 95) * 6; v.leg = null; }
      }
      return;
    }
    v.wait -= dt;
    if (v.wait > 0) return;
    const here = { x: Math.floor(v.x), y: Math.floor(v.y) };
    if (v.next && v.leg === 'pickup') {
      // beladen: zum Ziel
      const to = this._building(v.next.to);
      const r = to ? this.route(here, this.door(to)) : null;
      if (r && r.length > 1) { v.path = this._roadPoints(r); v.pi = 0; v.state = 'drive'; v.leg = 'deliver'; return; }
      v.cargo = 0; v.next = null;
    }
    // neue Fuhre aus den Strecken der Disposition
    const rt = this.logistics && this.logistics.pickRoute(rand2(v.i, Math.floor(this.time * 3), 91));
    const from = rt && this._building(rt.from), to = rt && this._building(rt.to);
    const df = from && this.door(from), dt2 = to && this.door(to);
    if (df && dt2) {
      const r = this.route(here, df);
      if (r) {
        v.next = rt;
        if (r.length > 1) { v.path = this._roadPoints(r); v.pi = 0; v.state = 'drive'; v.leg = 'pickup'; }
        else { v.leg = 'pickup'; v.state = 'wait'; v.wait = 1.2; v.cargo = cargoIndex(rt.good); }
        return;
      }
    }
    // nichts zu tun: zurück zur Spedition bzw. zum Landemodul und dort abstellen
    const home = this._truckHome(), hd = home && this.door(home);
    if (hd && (here.x !== hd.x || here.y !== hd.y)) {
      const r = this.route(here, hd);
      if (r && r.length > 1) { v.path = this._roadPoints(r); v.pi = 0; v.state = 'drive'; v.leg = 'home'; v.next = null; v.cargo = 0; return; }
    }
    v.state = 'garage'; v.wait = 4 + rand2(v.i, Math.floor(this.time), 93) * 6;
  }

  // --- Drohnen ----------------------------------------------------------------------
  _syncDrones() {
    const ports = this.state.buildings.filter((b) => !b.site && BUILDINGS[b.type]?.provides?.drones);
    const want = Math.min(10, ports.reduce((n, b) => n + BUILDINGS[b.type].provides.drones, 0));
    this.drones = this.drones || [];
    while (this.drones.length > want) this.drones.pop();
    while (this.drones.length < want) {
      const i = this.drones.length, port = ports[i % ports.length];
      const d = BUILDINGS[port.type].footprint;
      const pad = { x: port.x + 0.5 + (i % 2) * (d.width - 1), y: port.y + 0.5 + ((i >> 1) % 2) * (d.height - 1) };
      this.drones.push({ i, port: port.id, pad, x: pad.x, y: pad.y, state: 'landed', wait: 1 + i * 2.2, cargo: 0, leg: null, to: null, route: null });
    }
  }

  _updateDrone(v, dt) {
    if (v.state === 'fly') {
      const dx = v.to.x - v.x, dy = v.to.y - v.y, d = Math.hypot(dx, dy), step = 2.4 * dt;
      if (d <= step) {
        v.x = v.to.x; v.y = v.to.y;
        if (v.leg === 'pickup') { v.cargo = cargoIndex(v.route.good); v.state = 'hover'; v.wait = 1.2; v.leg = 'deliver'; }
        else if (v.leg === 'deliver') { v.cargo = 0; v.state = 'hover'; v.wait = 1.2; v.leg = 'home'; }
        else { v.state = 'landed'; v.wait = 3 + rand2(v.i, Math.floor(this.time), 97) * 5; v.leg = null; }
      } else { v.x += (dx / d) * step; v.y += (dy / d) * step; }
      return;
    }
    v.wait -= dt;
    if (v.wait > 0) return;
    if (v.state === 'hover') {
      const nxt = v.leg === 'deliver' ? this._building(v.route.to) : null;
      v.to = nxt ? this._center(nxt) : v.pad;
      if (!nxt) v.leg = 'home';
      v.state = 'fly';
      return;
    }
    // gelandet: neuen Flug aus den Drohnen-Strecken der Disposition wählen
    const rt = this.logistics && this.logistics.pickRoute(rand2(v.i, Math.floor(this.time * 3), 99), true);
    const from = rt && this._building(rt.from);
    if (!from) { v.wait = 3; return; }
    v.route = rt; v.to = this._center(from); v.leg = 'pickup'; v.state = 'fly';
  }

  _truckSpeed(v) {
    const t = this.state.roads.get(this.key(Math.floor(v.x), Math.floor(v.y))) || 1;
    return [0, 0.8, 1.1, 1.5, 1.9][t] || 0.8;     // Felder je Sekunde (Darstellung)
  }

  update(dt, view) {
    if (this.state.rev !== this.rev) this.rebuild();
    this.time += dt;
    if (view) this._ensureHerds(view);
    this._syncTrucks();
    for (const v of this.trucks) this._updateTruck(v, dt);
    this._syncDrones();
    for (const v of this.drones) this._updateDrone(v, dt);
    for (const p of this.people) this._updatePerson(p, dt);
    for (const a of this.animals) this._updateAnimal(a, dt);
    // Tiere weit außerhalb wieder vergessen
    if (this.animals.length > 300 && view) {
      const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
      this.animals = this.animals.filter((a) => a.kind === 'chicken' || a.kind === 'cattle' || Math.hypot((a.x - a.y) * 32 - cx, (a.x + a.y) * 16 - cy) < 6000);
      this.herds.clear();
    }
  }

  // Sichtbare Figuren als Zeichenliste (nach Tiefe sortiert)
  collect(view, out) {
    out.length = 0;
    const t = this.time, L = this.sp;
    const push = (x, y, s) => {
      const wx = (x - y) * 32, wy = (x + y) * 16;
      if (wx < view.x0 - 20 || wx > view.x1 + 20 || wy < view.y0 - 20 || wy > view.y1 + 30) return;
      out.push({ wx, wy, s });
    };
    for (const p of this.people) {
      if (p.state === 'inside' && !(p.visibleIdle && p.timer <= 0)) continue;
      if (this.placement.buildingAt(Math.floor(p.x), Math.floor(p.y))) continue;
      if (p.car && p.state === 'walk') { push(p.x, p.y, L.cars[p.car - 1][p.dir]); continue; }
      const moving = p.state === 'walk' || p.state === 'stroll' || p.state === 'toTree';
      const f = p.state === 'chop' ? 3 + (Math.floor((t + p.phase) * 2.4) & 1) : moving ? (Math.floor((t + p.phase) * 6) & 1) : 2;
      push(p.x, p.y, L.people[p.look][p.skin][p.dir][f]);
    }
    for (const a of this.animals) {
      if (a.kind === 'grazer' || a.kind === 'cattle') {
        const f = a.state === 'walk' ? (Math.floor((t + a.phase) * 4) & 1) : ((Math.floor((t + a.phase) * 0.7) % 3) ? 2 : 0);
        push(a.x, a.y, L.grazers[a.dir][f]);
      } else {
        const f = a.state === 'walk' ? 0 : (Math.floor((t + a.phase) * 2.5) & 1);
        push(a.x, a.y, L.chickens[a.dir][f]);
      }
    }
    for (const v of this.trucks) {
      if (v.state === 'garage' || v.state === 'park') continue;
      push(v.x, v.y, L.trucks[v.cab][v.cargo][v.dir]);
    }
    for (const v of this.drones || []) {
      const f = v.state === 'landed' ? 2 : (Math.floor(t * 12 + v.i) & 1);
      push(v.x, v.y, L.drones[v.cargo][f]);
    }
    out.sort((a, b) => a.wy - b.wy);
    return out;
  }

  get count() { return this.people.length + this.animals.length + this.trucks.length; }
}
