// Weltgenerator: Die Welt ist eine reine Funktion von (Feld, Seed).
// Es wird nichts vorab für die ganze Karte berechnet oder gespeichert –
// dadurch ist die Weltgröße nur ein Konfigurationswert.

import { hashStr, hash2, rand2, fbm, smooth, makeRng } from './noise.js';
import { T, O, isWater } from '../config/terrain.js';

const DEPOSIT_CELL = 36;      // Rastergröße für natürliche Vorkommen (Felder)
const CONTINENT_SCALE = 1800; // Größe der Landmassen (Felder)

export function createWorld(seedStr, cfg) {
  const W = cfg.worldSize;
  const base = hashStr(String(seedStr));
  const sd = (i) => (base + Math.imul(i, 0x9e3779b1)) | 0;
  const S = {
    cont: sd(1), hill: sd(2), range: sd(3), ridge: sd(4), warp: sd(5),
    river: sd(6), stream: sd(7), lake: sd(8), moist: sd(9), temp: sd(10),
    forest: sd(11), obj: sd(12), dep: sd(13), vari: sd(14), amount: sd(15),
    off: sd(16), start: sd(17),
  };

  // Ergebnisobjekt wird wiederverwendet (keine Allokation pro Feld).
  const tmp = { e: 0, m: 0, temp: 0, terrain: 0, forest: 0 };

  // Liefert Gelände und Kennwerte eines Feldes.
  // oct  = Detailgrad des Höhenrauschens (für weite Zoomstufen reduziert)
  // feat = Abtastweite in Feldern; verbreitert Flüsse, damit sie in der
  //        Übersicht als Linien sichtbar bleiben.
  function sample(x, y, o, oct = 5, feat = 0) {
    const nx = (x / W) * 2 - 1, ny = (y / W) * 2 - 1;
    let d = 1;
    if (nx > -1 && nx < 1 && ny > -1 && ny < 1) d = 1 - (1 - nx * nx) * (1 - ny * ny);
    const fall = smooth(0.62, 1.0, d);
    const cont = fbm(x / CONTINENT_SCALE, y / CONTINENT_SCALE, S.cont, 4);
    const c = (cont - 0.42) * 2.6 - fall * 1.5;
    const land = smooth(-0.04, 0.12, c);
    let e = c * 0.45;
    if (land > 0) {
      const hills = (fbm(x / 230, y / 230, S.hill, oct) - 0.5) * 0.42;
      const rangeMask = smooth(0.55, 0.69, fbm(x / 900, y / 900, S.range, 3));
      let mount = 0;
      if (rangeMask > 0) {
        const rn = fbm(x / 380, y / 380, S.ridge, oct);
        let ridge = 1 - Math.abs(rn * 2 - 1);
        ridge = ridge * ridge * ridge;
        mount = rangeMask * ridge * 0.95;
      }
      e += (hills + mount) * land;
    }
    o.e = e;
    o.forest = 0;
    if (e < 0) {
      o.terrain = e < -0.1 ? T.DEEP : T.SEA;
      o.m = 1; o.temp = 0.5;
      return o;
    }

    // --- Gewässer im Binnenland ---------------------------------------------
    const wxp = x + (fbm(x / 140, y / 140, S.warp, 2) - 0.5) * 120;
    const wyp = y + (fbm(x / 140 + 57.1, y / 140 - 23.4, S.warp + 7, 2) - 0.5) * 120;
    const rv = Math.abs(fbm(wxp / 620, wyp / 620, S.river, 3) - 0.5);
    const rw = (0.0042 + feat * 0.0006) * (1 + smooth(0.1, 0.0, e) * 1.2);
    const lk = fbm(x / 210, y / 210, S.lake, 3);
    const LAKE = 0.715;
    if (e < 0.4) {
      if (lk > LAKE) { o.terrain = T.LAKE; o.m = 1; o.temp = 0.5; return o; }
      if (rv < rw) { o.terrain = T.RIVER; o.m = 1; o.temp = 0.5; return o; }
      if (feat <= 1 && e < 0.34) {
        const sv = Math.abs(fbm(wxp / 240 + 11.3, wyp / 240 + 4.1, S.stream, 2) - 0.5);
        if (sv < 0.0034 && rv < 0.09) { o.terrain = T.RIVER; o.m = 1; o.temp = 0.5; return o; }
      }
    }

    // --- Klima -------------------------------------------------------------
    let m = (fbm(x / 650, y / 650, S.moist, 3) - 0.5) * 2.3 + 0.5;
    m += 0.3 * (1 - smooth(rw, rw * 9, rv));
    m += 0.25 * smooth(LAKE - 0.09, LAKE, lk);
    m += 0.1 * smooth(0.08, 0.0, e);
    const lat = (x + y) / (2 * W);
    const temp = 0.2 + 0.6 * lat + (fbm(x / 800, y / 800, S.temp, 2) - 0.5) * 0.5 - e * 0.5;
    o.m = m; o.temp = temp;

    // --- Geländeart -----------------------------------------------------------
    if (e > 0.62) { o.terrain = T.MOUNTAIN; return o; }
    if (e > 0.48) { o.terrain = T.ROCK; return o; }
    if (e < 0.016 && c < 0.06) { o.terrain = T.SAND; return o; }
    if (e > 0.43) { o.terrain = T.GRAVEL; return o; }
    if (m > 0.8 && e < 0.1) { o.terrain = T.SWAMP; return o; }
    if (m < 0.1) { o.terrain = temp > 0.6 ? T.SAND : T.GRAVEL; return o; }

    const f = fbm(x / 170, y / 170, S.forest, 4);
    const shift = (m - 0.5) * 0.3;
    const fd = smooth(0.5 - shift, 0.6 - shift, f);
    o.forest = fd;
    if (fd > 0.4) { o.terrain = (temp < 0.44 || e > 0.3) ? T.CONIFER : T.FOREST; return o; }
    o.terrain = m > 0.58 ? T.MEADOW : T.GRASS;
    return o;
  }

  // --- Rohstoffvorkommen -----------------------------------------------------
  const depCells = new Map();
  const extraDeposits = [];
  let extraBox = null;

  function pick(list, h) { return list[h % list.length]; }

  function depositCell(cx, cy) {
    const key = cx * 65536 + cy;
    let v = depCells.get(key);
    if (v !== undefined) return v;
    v = null;
    const h = hash2(cx, cy, S.dep);
    if ((h & 255) < 84) {
      const px = cx * DEPOSIT_CELL + 6 + (((h >>> 8) & 255) / 255) * (DEPOSIT_CELL - 12);
      const py = cy * DEPOSIT_CELL + 6 + (((h >>> 16) & 255) / 255) * (DEPOSIT_CELL - 12);
      const s = sample(px, py, { e: 0, m: 0, temp: 0, terrain: 0, forest: 0 });
      const h2 = hash2(cx, cy, S.dep + 3);
      let type = 0;
      switch (s.terrain) {
        case T.MOUNTAIN: case T.ROCK:
          type = pick([O.DEP_IRON, O.DEP_COAL, O.DEP_STONE, O.DEP_LIME, O.DEP_STONE, O.DEP_IRON], h2); break;
        case T.GRAVEL:
          type = pick([O.DEP_STONE, O.DEP_LIME, O.DEP_IRON, O.DEP_COAL, O.DEP_SAND], h2); break;
        case T.SAND:
          type = pick([O.DEP_SAND, O.DEP_SAND, O.DEP_CLAY], h2); break;
        case T.SWAMP:
          type = O.DEP_CLAY; break;
        case T.GRASS: case T.MEADOW: case T.FOREST: case T.CONIFER:
          type = s.e > 0.24
            ? pick([O.DEP_STONE, O.DEP_COAL, O.DEP_IRON, O.DEP_LIME], h2)
            : pick([O.DEP_CLAY, O.DEP_STONE, O.DEP_SAND, O.DEP_LIME, O.DEP_STONE], h2);
          break;
        default: type = 0;
      }
      if (type) v = { x: px, y: py, r: 2.2 + (((h >>> 24) & 255) / 255) * 2.6, type };
    }
    if (depCells.size > 60000) depCells.clear();
    depCells.set(key, v);
    return v;
  }

  function depositAt(x, y, terrain) {
    if (isWater(terrain)) return 0;
    if (extraBox && x >= extraBox.x0 && x <= extraBox.x1 && y >= extraBox.y0 && y <= extraBox.y1) {
      for (const d of extraDeposits) {
        const dx = x + 0.5 - d.x, dy = y + 0.5 - d.y;
        if (Math.sqrt(dx * dx + dy * dy) + rand2(x, y, S.dep + 1) * 1.3 < d.r) return d.type;
      }
    }
    const d = depositCell(Math.floor(x / DEPOSIT_CELL), Math.floor(y / DEPOSIT_CELL));
    if (!d) return 0;
    const dx = x + 0.5 - d.x, dy = y + 0.5 - d.y;
    if (Math.sqrt(dx * dx + dy * dy) + rand2(x, y, S.dep + 1) * 1.3 < d.r) return d.type;
    return 0;
  }

  // Menge eines Vorkommens auf einem Feld (endlich; Abbau folgt in Phase 3).
  function depositAmount(x, y) {
    return 300 + Math.floor(rand2(x, y, S.amount) * 1700);
  }

  // Naturobjekt auf einem Feld (Baum, Fels, Vorkommen ...).
  function objectAt(x, y, terrain, fd) {
    const dep = depositAt(x, y, terrain);
    if (dep) return dep;
    const r = rand2(x, y, S.obj);
    switch (terrain) {
      case T.FOREST:
        if (r < 0.3 + fd * 0.58) return rand2(x, y, S.vari + 5) < 0.82 ? O.TREE : O.CONIFER;
        return r > 0.95 ? O.BUSH : O.NONE;
      case T.CONIFER:
        if (r < 0.3 + fd * 0.58) return rand2(x, y, S.vari + 5) < 0.9 ? O.CONIFER : O.TREE;
        return r > 0.96 ? O.ROCK : O.NONE;
      case T.GRASS: {
        if (r < fd * 0.55) return rand2(x, y, S.vari + 5) < 0.62 ? O.TREE : O.BUSH;
        // Gehölzgruppen: Büsche häufen sich in Flecken
        const grove = fbm(x / 9, y / 9, S.forest + 3, 2);
        const gb = grove > 0.62 ? 0.16 : grove > 0.55 ? 0.06 : 0.02;
        if (r < fd * 0.55 + 0.012 + (grove > 0.64 ? 0.05 : 0)) return O.TREE;
        if (r < fd * 0.55 + 0.012 + gb + (grove > 0.64 ? 0.05 : 0)) return O.BUSH;
        if (r > 0.992) return O.ROCK;
        return O.NONE;
      }
      case T.MEADOW:
        if (r < 0.008) return O.TREE;
        if (r < 0.045) return O.BUSH;
        return O.NONE;
      case T.SWAMP:
        if (r < 0.16) return O.DEADTREE;
        if (r < 0.46) return O.REEDS;
        if (r > 0.97) return O.BUSH;
        return O.NONE;
      case T.SAND:
        if (r < 0.012) return O.ROCK;
        if (r > 0.985) return O.BUSH;
        return O.NONE;
      case T.GRAVEL:
        if (r < 0.07) return O.ROCK;
        if (r < 0.1) return O.BOULDER;
        if (r < 0.135) return O.BUSH;
        if (r > 0.975) return O.CONIFER;
        return O.NONE;
      case T.ROCK:
        if (r < 0.14) return O.BOULDER;
        if (r < 0.24) return O.ROCK;
        if (r < 0.3) return O.CONIFER;
        return O.NONE;
      case T.MOUNTAIN:
        if (r < 0.42) return O.PEAK;
        if (r < 0.62) return O.BOULDER;
        return O.NONE;
      default: return O.NONE;
    }
  }

  // Zufallswerte je Feld für Variante und Versatz der Darstellung.
  function variantAt(x, y) { return hash2(x, y, S.vari); }

  // --- Startbereich -----------------------------------------------------------
  // Sucht spiralförmig von der Weltmitte aus einen ebenen, bebaubaren Platz
  // mit Wald und Wasser in der Nähe.
  function scoreStart(x, y) {
    const o = tmp;
    let flat = 0, emin = 9, emax = -9;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      sample(x + i * 5, y + j * 5, o);
      if (o.terrain === T.GRASS || o.terrain === T.MEADOW) flat++;
      if (o.e < emin) emin = o.e;
      if (o.e > emax) emax = o.e;
    }
    if (flat < 23 || emax - emin > 0.09) return -1;
    let forest = 0, water = 0, rock = 0;
    for (const rad of [18, 30, 44]) {
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2 + rad;
        sample(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, o);
        if (o.terrain === T.FOREST || o.terrain === T.CONIFER) forest++;
        else if (o.terrain === T.LAKE || o.terrain === T.RIVER) water++;
        else if (o.terrain === T.SEA || o.terrain === T.DEEP) water += 0.5;
        else if (o.terrain === T.ROCK || o.terrain === T.GRAVEL) rock++;
      }
    }
    if (forest < 5 || forest > 26 || water < 1) return -1;
    return flat + Math.min(forest, 12) + Math.min(water, 6) * 2 + Math.min(rock, 4);
  }

  function findStart() {
    const c = Math.floor(W / 2);
    const step = 20;
    let best = null, bestScore = -1;
    const maxRing = Math.floor((W * 0.3) / step);
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let i = -ring; i <= ring; i++) {
        for (let j = -ring; j <= ring; j++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
          const x = c + i * step, y = c + j * step;
          const sc = scoreStart(x, y);
          if (sc > bestScore) { bestScore = sc; best = { x, y }; }
        }
      }
      if (bestScore >= 40 && ring >= 2) break;
      if (bestScore > 0 && ring > 40) break;
    }
    if (!best) {
      // Notfall: erstes Landfeld nahe der Mitte.
      best = { x: c, y: c };
      for (let r = 0; r < W / 2; r += 8) {
        const o = sample(c + r, c, tmp);
        if (!isWater(o.terrain)) { best = { x: c + r, y: c }; break; }
      }
    }
    return best;
  }

  // Garantierte Grundvorkommen rund um den Start, damit keine Startregion
  // unspielbar ist. Deterministisch aus dem Seed.
  function placeStartDeposits(start) {
    const rng = makeRng(S.start);
    const wanted = [
      [O.DEP_STONE, 13, 19], [O.DEP_CLAY, 17, 25], [O.DEP_IRON, 26, 34],
      [O.DEP_COAL, 31, 40], [O.DEP_LIME, 36, 46], [O.DEP_SAND, 22, 30],
    ];
    const o = { e: 0, m: 0, temp: 0, terrain: 0, forest: 0 };
    for (const [type, r0, r1] of wanted) {
      for (let tries = 0; tries < 40; tries++) {
        const ang = rng() * Math.PI * 2;
        const rad = r0 + rng() * (r1 - r0);
        const x = Math.round(start.x + Math.cos(ang) * rad) + 0.5;
        const y = Math.round(start.y + Math.sin(ang) * rad) + 0.5;
        sample(x, y, o);
        if (isWater(o.terrain) || o.terrain === T.SWAMP || o.terrain === T.MOUNTAIN) continue;
        let clash = false;
        for (const d of extraDeposits) {
          if (Math.hypot(d.x - x, d.y - y) < d.r + 6) { clash = true; break; }
        }
        if (clash) continue;
        extraDeposits.push({ x, y, r: 2.7 + rng() * 0.9, type });
        break;
      }
    }
    extraBox = { x0: start.x - 60, x1: start.x + 60, y0: start.y - 60, y1: start.y + 60 };
  }

  const start = findStart();
  placeStartDeposits(start);

  return {
    seedStr: String(seedStr),
    size: W,
    start,
    sample,
    objectAt,
    variantAt,
    depositAmount,
    extraDeposits,
    inBounds: (x, y) => x >= 0 && y >= 0 && x < W && y < W,
  };
}

export function randomSeed() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = new Uint32Array(8);
  (globalThis.crypto || { getRandomValues: (b) => { for (let i = 0; i < b.length; i++) b[i] = Math.random() * 2 ** 32; } }).getRandomValues(buf);
  for (let i = 0; i < 8; i++) s += chars[buf[i] % chars.length];
  return s;
}
