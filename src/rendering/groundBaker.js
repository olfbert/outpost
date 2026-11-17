// Backt den Boden pixelweise in rechteckige Kacheln (Welt-Pixel-Raster).
// Statt harter Rauten werden die Feldgrenzen pro Pixel leicht verrauscht –
// so entstehen organische Übergänge zwischen Gras, Sand, Fels und Wasser.

import { TERRAIN_RAMPS, TERRAIN_COUNT, COLORS, T, DEPOSIT_GROUND } from '../config/terrain.js';
import { rgba, hashI } from './pix.js';
import { ROADS } from '../config/roads.js';
import { BUILDINGS } from '../config/buildings.js';

export const RAMP = new Uint32Array(TERRAIN_COUNT * 5);
TERRAIN_RAMPS.forEach((r, t) => r.forEach((h, i) => { RAMP[t * 5 + i] = rgba(h); }));

const FOAM = rgba(COLORS.foam), SHALLOW = rgba(COLORS.shallow);
const BANK = rgba(COLORS.bank), WETSAND = rgba(COLORS.wetSand);
const FLOWERS = [rgba('#d9cf7a'), rgba('#e6e2cf'), rgba('#c98a8a'), rgba('#b9a7d0')];
const PUDDLE = rgba('#33494a'), PEBBLE = rgba('#9c8f6c');
const SNOW = [rgba('#d9dfe2'), rgba('#e4e9eb'), rgba('#eef1f2')];
const FENCE = rgba('#5e4630'), FENCE_L = rgba('#86684a');
// Feldfarben je Phase und Sorte: [Furche, Reihe] – Sorte 0 Kartoffeln, 1 Getreide
const FIELD = [
  [['#5c4632', '#6d553d'], ['#5c4632', '#6d553d']],          // gepflügt
  [['#5f4a35', '#5e7a3a'], ['#5f4a35', '#6f8a42']],          // junge Saat
  [['#3e5f2f', '#4f7337'], ['#5c7f38', '#6c8f40']],          // grün
  [['#4b6531', '#6f7a3a'], ['#b8953f', '#cfae55']],          // reif
  [['#6a5a3e', '#7e6c4a'], ['#a08b58', '#b49f68']],          // Stoppeln
  [['#cfd6d9', '#e2e7e9'], ['#cfd6d9', '#e2e7e9']],          // Schnee
].map((ph) => ph.map((c) => c.map((h) => rgba(h))));
const PASTURE = rgba('#6d8f47');
// Ausgetretener Boden rund um Gebäude, damit die Grundplatten nicht wie aufgeklebt wirken
const YARD = [rgba('#7a6849'), rgba('#887657'), rgba('#6f6a48')];
const YARD_R = 0.7;

// Grundflächen der Gebäude, die diese Kachel berühren (Feldraster)
function yardRects(state, minX, maxX, minY, maxY) {
  const out = [];
  const add = (b) => {
    const def = BUILDINGS[b.type];
    if (!def || def.category === 'deco') return;
    const w = def.footprint.width, h = def.footprint.height;
    if (b.x - YARD_R > maxX || b.x + w + YARD_R < minX || b.y - YARD_R > maxY || b.y + h + YARD_R < minY) return;
    out.push(b.x, b.y, b.x + w, b.y + h);
  };
  for (const b of state.buildings || []) add(b);
  for (const b of state.npcBuildings || []) add(b);
  return out;
}

function mixCol(a, b, k) {
  const r = (a & 255) + ((b & 255) - (a & 255)) * k;
  const g = ((a >>> 8) & 255) + (((b >>> 8) & 255) - ((a >>> 8) & 255)) * k;
  const bl = ((a >>> 16) & 255) + (((b >>> 16) & 255) - ((a >>> 16) & 255)) * k;
  return ((255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
}

// Vorkommen: Bodenfarben je Typ
const DEP_COL = [];
for (const [k, v] of Object.entries(DEPOSIT_GROUND)) DEP_COL[k] = { cols: v.cols.map((h) => rgba(h)), speck: rgba(v.speck), cover: v.cover };

// Wegfarben: je Typ [Körper 0..2, Rand, Sprenkel, Fahrspur]
const ROAD_COL = ROADS.map((r) => r && [...r.colors.map((h) => rgba(h)), rgba(r.edge), rgba(r.speck), rgba(r.colors[0]) ]);
const ROAD_HW = ROADS.map((r) => (r ? r.width : 0));

// Farbe eines Weg-Pixels oder 0, wenn der Pixel neben dem Weg liegt.
// dx, dy: Lage im Feld relativ zur Mitte (-0.5..0.5); Nachbarn L/R/U/D.
function roadPixel(r, dx, dy, L, R, U, D, n, n2) {
  const h = ROAD_HW[r] + (n / 256 - 0.5) * 0.035;
  const adx = dx < 0 ? -dx : dx, ady = dy < 0 ? -dy : dy;
  let dist, perp;
  if (adx <= h && ady <= h) {
    const cx = (dx < 0 ? L : R) ? 9 : h - adx;
    const cy = (dy < 0 ? U : D) ? 9 : h - ady;
    dist = cx < cy ? cx : cy;
    perp = -1;
  } else if (ady <= h && ((dx < 0 && L) || (dx > 0 && R))) { dist = h - ady; perp = ady; }
  else if (adx <= h && ((dy < 0 && U) || (dy > 0 && D))) { dist = h - adx; perp = adx; }
  else return 0;
  const C = ROAD_COL[r];
  if (dist < 0.042) return C[3];
  if (n2 > 242) return C[4];
  if (r !== 3 && perp > 0 && perp > h * 0.42 && perp < h * 0.6 && n > 60) return C[5];  // Fahrspuren
  return C[n < 70 ? 0 : n < 200 ? 1 : 2];
}

// Brücke über Wasser: Bohlenbelag mit Geländer, Schatten aufs Wasser
const BRIDGE = [rgba('#7d6243'), rgba('#8a6d4b'), rgba('#977854'), rgba('#4f3d2a'), rgba('#a88a62')];
const BRIDGE_SHADOW = rgba('#1d3b48');
function bridgePixel(dx, dy, L, R, U, D, n, water) {
  const h = 0.26;
  const adx = dx < 0 ? -dx : dx, ady = dy < 0 ? -dy : dy;
  let dist, along;
  if (adx <= h && ady <= h) {
    const cx = (dx < 0 ? L : R) ? 9 : h - adx;
    const cy = (dy < 0 ? U : D) ? 9 : h - ady;
    dist = cx < cy ? cx : cy; along = (L || R) ? dx : dy;
  } else if (ady <= h && ((dx < 0 && L) || (dx > 0 && R))) { dist = h - ady; along = dx; }
  else if (adx <= h && ((dy < 0 && U) || (dy > 0 && D))) { dist = h - adx; along = dy; }
  else {
    // Schatten der Brücke unten rechts auf dem Wasser
    const sdx = dx - 0.05, sdy = dy - 0.05;
    const inX = Math.abs(sdy) <= h && ((sdx < 0 && L) || (sdx > 0 && R) || Math.abs(sdx) <= h);
    const inY = Math.abs(sdx) <= h && ((sdy < 0 && U) || (sdy > 0 && D) || Math.abs(sdy) <= h);
    return water && (inX || inY) ? BRIDGE_SHADOW : 0;
  }
  if (dist < 0.05) return BRIDGE[3];                     // Geländer
  if (((along + 2) * 9 | 0) % 2 === 0 && dist > 0.07) return BRIDGE[n < 120 ? 0 : 1];   // Bohlenfugen
  return BRIDGE[n < 60 ? 1 : n < 220 ? 2 : 4];
}

// Periodisches Rauschen (256 x 256) für Grenzversatz und Körnung.
function periodic(cell, seed) {
  const n = 256 / cell, out = new Float32Array(65536);
  for (let y = 0; y < 256; y++) {
    const gy = y / cell, yi = Math.floor(gy), fy = gy - yi, v = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < 256; x++) {
      const gx = x / cell, xi = Math.floor(gx), fx = gx - xi, u = fx * fx * (3 - 2 * fx);
      const a = hashI(xi % n, yi % n, seed), b = hashI((xi + 1) % n, yi % n, seed);
      const c = hashI(xi % n, (yi + 1) % n, seed), d = hashI((xi + 1) % n, (yi + 1) % n, seed);
      out[y * 256 + x] = a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
  }
  return out;
}

const JX = new Float32Array(65536), JY = new Float32Array(65536);
const TEX = new Uint8Array(65536), TEX2 = new Uint8Array(65536);
{
  const a = periodic(16, 11), b = periodic(4, 12), c = periodic(16, 13), d = periodic(4, 14);
  for (let i = 0; i < 65536; i++) {
    const x = i & 255, y = i >> 8;
    TEX[i] = Math.floor(hashI(x, y, 21) * 256);
    TEX2[i] = Math.floor(hashI(x, y, 22) * 256);
    const f1 = (hashI(x, y, 23) - 0.5) * 0.14, f2 = (hashI(x, y, 24) - 0.5) * 0.14;
    JX[i] = (a[i] - 0.5) * 0.8 + (b[i] - 0.5) * 0.26 + f1;
    JY[i] = (c[i] - 0.5) * 0.8 + (d[i] - 0.5) * 0.26 + f2;
  }
}

// Füllt img (size x size Pixel) für das Weltrechteck ab (wx0, wy0).
// res = Pixel pro Welt-Pixel (1, 0.5 oder 0.25).
export function bakeGround(store, wx0, wy0, size, res, img) {
  const out = new Uint32Array(img.data.buffer);
  const P = store.P, sh = store.shift, mask = store.mask;
  const span = size / res;
  // Feldbereich der Kachel (Raute im Feldraster) für das Chunk-Raster
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [wx, wy] of [[wx0, wy0], [wx0 + span, wy0], [wx0, wy0 + span], [wx0 + span, wy0 + span]]) {
    const fx = wx / 64 + wy / 32, fy = wy / 32 - wx / 64;
    if (fx < minX) minX = fx; if (fx > maxX) maxX = fx;
    if (fy < minY) minY = fy; if (fy > maxY) maxY = fy;
  }
  const cx0 = (Math.floor(minX) - 2) >> sh, cx1 = (Math.ceil(maxX) + 2) >> sh;
  const cy0 = (Math.floor(minY) - 2) >> sh, cy1 = (Math.ceil(maxY) + 2) >> sh;
  const gw = cx1 - cx0 + 1, gh = cy1 - cy0 + 1;
  const grid = new Array(gw * gh).fill(null);
  const inv = 1 / res;
  const DEEP = T.DEEP, SEA = T.SEA, RIVER = T.RIVER;
  const anyRoad = store.state.roads.size > 0;
  const gm = store.state.gameMonths || 0, mi = Math.floor(gm) % 12;
  const winter = mi === 11 || mi <= 1;
  const yards = yardRects(store.state, minX, maxX, minY, maxY), ny = yards.length;

  for (let py = 0; py < size; py++) {
    const wy = wy0 + (py + 0.5) * inv;
    const b = wy / 32;
    const jrow = (Math.floor(wy) & 255) << 8;
    let oi = py * size;
    for (let px = 0; px < size; px++, oi++) {
      const wx = wx0 + (px + 0.5) * inv;
      const a = wx / 64;
      const ji = jrow | (Math.floor(wx) & 255);
      const jfx = a + b + JX[ji], jfy = b - a + JY[ji];
      const tx = Math.floor(jfx), ty = Math.floor(jfy);
      const gi = ((ty >> sh) - cy0) * gw + ((tx >> sh) - cx0);
      let c = grid[gi];
      if (c === null) c = grid[gi] = store.get(tx >> sh, ty >> sh);
      const terr = c.terrain;
      const ti = ((ty & mask) + 2) * P + (tx & mask) + 2;
      const t = terr[ti];
      const n = TEX[ji];
      const ux = jfx - tx, uy = jfy - ty;
      let col;
      if (t <= RIVER) {
        let shore = 1;
        if (terr[ti - 1] > RIVER) shore = ux;
        if (terr[ti + 1] > RIVER && 1 - ux < shore) shore = 1 - ux;
        if (terr[ti - P] > RIVER && uy < shore) shore = uy;
        if (terr[ti + P] > RIVER && 1 - uy < shore) shore = 1 - uy;
        if (shore < 0.13 && n > 70) col = FOAM;
        else if (shore < 0.36 && n > shore * 520 - 40) col = SHALLOW;
        else {
          let v;
          if (t === DEEP) v = (c.elev[ti] + 0.42) / 0.32;
          else if (t === SEA) v = (c.elev[ti] + 0.1) / 0.1;
          else v = 0.45 + c.tint[ti];
          let idx = Math.floor(v * 4 + n / 256);
          idx = idx < 0 ? 0 : idx > 4 ? 4 : idx;
          col = RAMP[t * 5 + idx];
          if (TEX2[ji] > 252 && idx < 4) col = RAMP[t * 5 + idx + 1];
        }
      } else {
        let bank = 1;
        if (terr[ti - 1] <= RIVER) bank = ux;
        if (terr[ti + 1] <= RIVER && 1 - ux < bank) bank = 1 - ux;
        if (terr[ti - P] <= RIVER && uy < bank) bank = uy;
        if (terr[ti + P] <= RIVER && 1 - uy < bank) bank = 1 - uy;
        if (bank < 0.11 && n > 60) col = t === T.SAND ? WETSAND : BANK;
        else {
          const v = 0.5 + c.tint[ti] + (n - 128) * 0.0012;
          let idx = Math.floor(v * 5);
          idx = idx < 0 ? 0 : idx > 4 ? 4 : idx;
          col = RAMP[t * 5 + idx];
          const n2 = TEX2[ji];
          // Kleine Büschel/Steinchen: 2 x 2 Pixel große Tupfer, oben hell, unten dunkel
          const wyI = Math.floor(wy), n3 = TEX2[(((wyI >> 1) & 255) << 8) | ((Math.floor(wx) >> 1) & 255)];
          if (t === T.SWAMP && n3 > 226) {
            col = n3 > 236 ? PUDDLE : RAMP[t * 5];                 // Tümpel mit dunklem Rand
          } else if (n3 > 249 && t !== T.SAND) {
            col = RAMP[t * 5 + ((wyI & 1) ? (idx > 0 ? idx - 1 : 0) : (idx < 4 ? idx + 1 : 4))];
            if (t === T.MEADOW && n3 > 254 && n > 200 && !(wyI & 1)) col = FLOWERS[n & 3];
          } else if (n2 > 246 || n2 < 4) {
            switch (t) {
              case T.GRASS: col = n2 < 4 ? RAMP[t * 5] : (n2 > 252 ? RAMP[t * 5 + 4] : col); break;
              case T.MEADOW: col = n2 > 253 && n > 128 ? FLOWERS[n & 3] : (n2 < 4 ? RAMP[t * 5] : col); break;
              case T.SWAMP: col = n2 > 246 ? PUDDLE : col; break;
              case T.SAND: col = n2 > 252 ? PEBBLE : col; break;
              case T.FOREST: case T.CONIFER: col = n2 > 248 ? RAMP[t * 5] : col; break;
              default: col = n2 > 249 ? RAMP[t * 5] : (n2 < 4 ? RAMP[t * 5 + 4] : col);
            }
          }
        }
      }
      if (c.dep && t > RIVER) {
        const d = c.dep[ti];
        if (d) {
          // fleckige Bedeckung: Rand weich (Abstand zur Feldmitte) + großflächiges Rauschen
          const D = DEP_COL[d];
          const edge = Math.max(Math.abs(ux - 0.5), Math.abs(uy - 0.5));
          const cov = D.cover + JX[ji] * 0.9 + (JY[ji] + 0.5) * 0.25 - edge * 1.1;
          if (cov > 0.34) {
            const n2 = TEX2[ji];
            const dc = n2 > 240 ? D.speck : D.cols[n < 80 ? 0 : n < 190 ? 1 : 2];
            // mit dem Untergrund mischen, damit das Vorkommen eher durchscheint als aufliegt
            const k = cov > 0.5 ? 0.62 : 0.4;
            col = mixCol(col, dc, k);
          }
        }
      }
      // Hof: weicher Übergang aus festgetretener Erde rund um Gebäude
      if (ny && t > RIVER) {
        let dmin = YARD_R;
        for (let k = 0; k < ny; k += 4) {
          const dx = jfx < yards[k] ? yards[k] - jfx : jfx > yards[k + 2] ? jfx - yards[k + 2] : 0;
          const dy = jfy < yards[k + 1] ? yards[k + 1] - jfy : jfy > yards[k + 3] ? jfy - yards[k + 3] : 0;
          if (dx >= dmin || dy >= dmin) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < dmin) dmin = d;
        }
        if (dmin < YARD_R) {
          const f = 1 - dmin / YARD_R;
          const k = f * 0.95 + (n - 128) * 0.002;
          if (k > 0.12) col = mixCol(col, YARD[n < 90 ? 0 : n < 200 ? 1 : 2], k > 0.8 ? 0.8 : k);
        }
      }
      // Winter: Schnee auf dem Land (Wasser bleibt offen)
      if (winter && t > RIVER) {
        const sc = SNOW[n < 70 ? 0 : n < 200 ? 1 : 2];
        col = mixCol(col, sc, t === T.FOREST || t === T.CONIFER ? 0.62 : 0.8);
      }
      if (anyRoad || c.field) {
        // Wege und Felder liegen auf dem unverrauschten Raster, damit sie gerade bleiben
        const rfx = a + b, rfy = b - a;
        const rtx = Math.floor(rfx), rty = Math.floor(rfy);
        const rg = ((rty >> sh) - cy0) * gw + ((rtx >> sh) - cx0);
        let rc = grid[rg];
        if (rc === null) rc = grid[rg] = store.get(rtx >> sh, rty >> sh);
        const fd = rc.field;
        if (fd) {
          const fi = ((rty & mask) + 2) * P + (rtx & mask) + 2;
          const f = fd[fi];
          if (f) {
            const u = rfx - rtx, v = rfy - rty;
            if (f === 20) {
              // Weide: saftigeres Gras, Zaun an den Außenkanten
              if (!winter) col = mixCol(col, PASTURE, 0.3);
              const e = 0.05;
              const edge = (u < e && fd[fi - 1] !== 20) || (u > 1 - e && fd[fi + 1] !== 20) || (v < e && fd[fi - P] !== 20) || (v > 1 - e && fd[fi + P] !== 20);
              if (edge) {
                const along = (u < e || u > 1 - e) ? v : u;
                const post = (along * 4) % 1 < 0.14;
                if (post || (wy * 2 | 0) % 3 !== 0) col = post ? FENCE : FENCE_L;
              }
            } else {
              const ph = (f - 1) >> 1, crop = (f - 1) & 1;
              const inset = 0.045;
              if (u > inset && u < 1 - inset && v > inset && v < 1 - inset) {
                const row = Math.floor(v * 10 + (TEX[ji] > 235 ? 0.3 : 0)) & 1;
                const pal = FIELD[ph][crop];
                col = pal[row];
                if (TEX2[ji] > 238) col = mixCol(col, pal[row ^ 1], 0.5);
              } else col = mixCol(col, FIELD[ph][crop][0], 0.5);
            }
          }
        }
        const rd = rc.road;
        if (rd) {
          const ri = ((rty & mask) + 2) * P + (rtx & mask) + 2;
          const r = rd[ri];
          if (r) {
            const overWater = rc.terrain[ri] <= T.RIVER;
            const rcol = overWater
              ? bridgePixel(rfx - rtx - 0.5, rfy - rty - 0.5, rd[ri - 1], rd[ri + 1], rd[ri - P], rd[ri + P], n, true)
              : roadPixel(r, rfx - rtx - 0.5, rfy - rty - 0.5, rd[ri - 1], rd[ri + 1], rd[ri - P], rd[ri + P], n, TEX2[ji]);
            if (rcol) col = rcol;
          }
        }
      }
      out[oi] = col;
    }
  }
}
