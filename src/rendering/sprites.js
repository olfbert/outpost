// Prozedurale Platzhalter-Sprites im Zielstil (isometrische 2:1-Pixelart,
// Licht von links oben, gedämpfte Farben). Sie werden beim Start einmal
// gemalt und in einen Atlas gepackt. Echte Assets ersetzen einzelne Sprites
// über assets/manifest.json (siehe assetLoader.js).

import { Pix, rgba, ramp, shade, hashI } from './pix.js';
import { O } from '../config/terrain.js';
import { BUILDINGS } from '../config/buildings.js';
import { lifeSpriteDefs } from './lifeSprites.js';

const LEAF = ramp(['#213d22', '#2c4c28', '#385d2f', '#476f37', '#5a8141']);
const LEAF_B = ramp(['#29441f', '#355425', '#42652b', '#527733', '#668a3d']);
const NEEDLE = ramp(['#19322a', '#213e32', '#2a4b3b', '#355945', '#436a51']);
const BUSH = ramp(['#203b22', '#2b4a29', '#375a30', '#466b38', '#587c41']);
const STONE = ramp(['#55554f', '#67675f', '#7b7b72', '#909086', '#a6a69b']);
const MTN = ramp(['#55555b', '#69696f', '#7f7f84', '#97979b', '#b3b3b5', '#d0d0d0']);
const IRON = ramp(['#4c3528', '#5c4030', '#6c4c39', '#7c5842', '#8c644b']);
const COAL = ramp(['#1c1c1d', '#252526', '#2f2f30', '#3a3a3b', '#474748']);
const LIME = ramp(['#8e8a79', '#9e9a88', '#aeaa97', '#bdb9a6', '#cac6b3']);
const CLAY = ramp(['#62452f', '#6f4f36', '#7c593d', '#896344', '#966d4b']);
const SANDR = ramp(['#9a8b63', '#a6976d', '#b2a377', '#bdae81', '#c8b98b']);
const HULL = ramp(['#f0eee4', '#dedcd1', '#c4c2b8', '#a3a29a', '#84837d']);
const TRUNK = rgba('#4a3a28'), TRUNK_L = rgba('#66523b');
const STEEL = rgba('#3c4144'), STEEL_L = rgba('#6b7175');

const clampI = (v, n) => (v < 0 ? 0 : v >= n ? n - 1 : v);

// ---------------------------------------------------------------------------
// Natur
// ---------------------------------------------------------------------------
function paintTree(p, bx, by, seed, cols, s) {
  p.shadow(bx + 6, by, 14 * s, 5 * s, 62);
  const th = Math.round(13 * s);
  p.rect(bx - 1, by - th, 3, th, TRUNK);
  p.rect(bx - 1, by - th, 1, th, TRUNK_L);
  const cy = by - th - 9 * s;
  const j = (k) => hashI(k, seed, 77) - 0.5;
  p.blob(bx + 2 + j(1) * 4, cy + 6 * s, 14 * s, 10 * s, cols.slice(0, 3), seed + 1);
  p.blob(bx - 7 * s + j(2) * 3, cy + 3 * s, 9 * s, 8 * s, cols, seed + 2);
  p.blob(bx + 8 * s + j(3) * 3, cy + 2 * s, 9 * s, 8 * s, cols, seed + 3);
  p.blob(bx + j(4) * 3, cy - 5 * s, 11 * s, 10 * s, cols, seed + 4);
}

function paintConifer(p, bx, by, seed, s) {
  const H = Math.round(44 * s), tiers = 5;
  p.shadow(bx + 5, by, 10 * s, 4 * s, 62);
  p.rect(bx - 1, by - 6, 2, 6, TRUNK);
  const top = by - 5 - H;
  for (let r = 0; r < H; r++) {
    const t = r / H, fr = (t * tiers) % 1;
    const hw = (1.2 + t * 12 * s) * (0.5 + 0.5 * fr) + 0.6;
    const y = top + r;
    for (let x = Math.floor(-hw); x <= hw; x++) {
      const n = hashI(bx + x, y, seed);
      if (Math.abs(x) > hw - n * 1.5) continue;
      const v = 0.5 - (x / (hw + 1)) * 0.42 + (fr - 0.55) * 0.5 + (n - 0.5) * 0.3;
      p.set(bx + x, y, NEEDLE[clampI(Math.floor(v * 5), 5)]);
    }
  }
}

function sprTree(seed, cols, s) {
  const p = new Pix(52, 64);
  paintTree(p, 24, 58, seed, cols, s);
  return { pix: p, ax: 24, ay: 58 };
}
function sprTreeGroup(seed, cols) {
  const p = new Pix(76, 72);
  paintTree(p, 24, 58, seed, cols, 0.8);
  paintTree(p, 48, 66, seed + 9, cols, 1);
  return { pix: p, ax: 36, ay: 63 };
}
function sprConifer(seed, s) {
  const p = new Pix(44, 68);
  paintConifer(p, 20, 62, seed, s);
  return { pix: p, ax: 20, ay: 62 };
}
function sprConiferGroup(seed) {
  const p = new Pix(64, 76);
  paintConifer(p, 20, 60, seed, 0.82);
  paintConifer(p, 40, 70, seed + 5, 1);
  return { pix: p, ax: 30, ay: 66 };
}
function sprBush(seed, flower) {
  const p = new Pix(28, 24);
  p.shadow(16, 19, 10, 4, 70);
  p.blob(10, 14, 7, 6, BUSH, seed);
  p.blob(17, 13, 8, 7, BUSH, seed + 1);
  if (flower) {
    const c = rgba(flower), d = shade(c, 0.75);
    for (let k = 0; k < 14; k++) {
      const x = 4 + hashI(k, 1, seed) * 21, y = 7 + hashI(k, 2, seed) * 11;
      if ((p.get(x, y) >>> 24) === 255) { p.set(x, y, hashI(k, 3, seed) < 0.6 ? c : d); }
    }
  }
  return { pix: p, ax: 14, ay: 19 };
}
function sprBushLow(seed) {
  const p = new Pix(36, 20);
  p.shadow(19, 15, 15, 4, 70);
  p.blob(10, 12, 8, 5, BUSH, seed);
  p.blob(19, 11, 9, 6, BUSH, seed + 1);
  p.blob(27, 12, 7, 5, BUSH, seed + 2);
  return { pix: p, ax: 18, ay: 15 };
}
function sprRock(seed, big) {
  const p = new Pix(big ? 44 : 24, big ? 36 : 20);
  if (big) {
    p.shadow(25, 30, 17, 6, 58);
    p.blob(14, 23, 10, 8, STONE, seed, { rag: 0.12, noise: 0.2, contrast: 0.6 });
    p.blob(27, 20, 13, 12, STONE, seed + 1, { rag: 0.12, noise: 0.2, contrast: 0.6 });
    return { pix: p, ax: 22, ay: 30 };
  }
  p.shadow(14, 16, 9, 3, 55);
  p.blob(11, 12, 7, 5, STONE, seed, { rag: 0.12, noise: 0.2, contrast: 0.6 });
  p.blob(16, 14, 4, 3, STONE, seed + 1, { rag: 0.1, noise: 0.2, contrast: 0.6 });
  return { pix: p, ax: 12, ay: 16 };
}
function sprPeak(seed) {
  const w = 108, h = 100, p = new Pix(w, h), bx = 54, by = 86;
  const r = (k) => hashI(k, seed, 5);
  const peaks = [
    { c: (r(1) - 0.5) * 14, H: 60 + r(2) * 16, hw: 34 },
    { c: -25 + (r(3) - 0.5) * 8, H: 34 + r(4) * 12, hw: 22 },
    { c: 23 + (r(5) - 0.5) * 8, H: 40 + r(6) * 12, hw: 24 },
  ];
  p.shadow(bx + 12, by + 3, 42, 12, 58);
  for (let x = -46; x <= 46; x++) {
    let top = 0, own = null;
    for (const pk of peaks) {
      const d = Math.abs(x - pk.c) / pk.hw;
      if (d < 1) { const hh = pk.H * Math.pow(1 - d, 0.9); if (hh > top) { top = hh; own = pk; } }
    }
    if (!own) continue;
    top += (hashI(x, 3, seed) - 0.5) * 3;
    const baseY = by + Math.sqrt(Math.max(0, 1 - (x / 47) ** 2)) * 9 - 3;
    for (let y = Math.floor(by - top); y <= baseY; y++) {
      const hgt = by - y;
      const lit = x < own.c + (hashI(seed, y >> 2, 9) - 0.5) * 7;
      let v = lit ? 0.6 : 0.26;
      v += (hgt / own.H) * 0.28 + (hashI(x, y, seed) - 0.5) * 0.16;
      if (hashI((x - y * 0.5) | 0, y >> 3, seed + 3) < 0.1) v -= 0.14;
      p.set(bx + x, y, MTN[clampI(Math.floor(v * 6), 6)]);
    }
  }
  return { pix: p, ax: bx, ay: by };
}
function sprDeadTree(seed) {
  const p = new Pix(32, 44), bx = 14, by = 38;
  const c = rgba('#5a5244'), cl = rgba('#7a715f'), leaf = rgba('#4a5632');
  p.shadow(bx + 4, by, 8, 3, 50);
  p.rect(bx - 1, by - 22, 2, 22, c); p.rect(bx - 1, by - 22, 1, 22, cl);
  p.line(bx, by - 14, bx + 7, by - 21, c); p.line(bx, by - 18, bx - 6, by - 25, c);
  p.line(bx, by - 21, bx + 4, by - 29, c); p.line(bx + 7, by - 21, bx + 9, by - 26, c);
  for (let k = 0; k < 16; k++) {
    const x = bx - 8 + hashI(k, 1, seed) * 18, y = by - 31 + hashI(k, 2, seed) * 12;
    p.set(x, y, leaf); if (k % 3 === 0) p.set(x + 1, y, leaf);
  }
  return { pix: p, ax: bx, ay: by };
}
function sprReeds(seed) {
  const p = new Pix(28, 20), by = 17;
  const cols = [rgba('#6f7a45'), rgba('#87904f'), rgba('#5d683c')], tip = rgba('#6b4f33');
  for (let k = 0; k < 11; k++) {
    const x = 3 + hashI(k, 1, seed) * 21, hgt = 6 + hashI(k, 2, seed) * 8, yb = by - hashI(k, 3, seed) * 4;
    const c = cols[k % 3];
    for (let v = 0; v < hgt; v++) p.set(x + (v > hgt * 0.6 ? 1 : 0) * (k & 1), yb - v, c);
    if (k % 2 === 0) { p.set(x, yb - hgt, tip); p.set(x, yb - hgt - 1, tip); }
  }
  return { pix: p, ax: 14, ay: 15 };
}
// Dezente Hinweise auf Vorkommen: ein paar flache Steine/Klumpen, kaum höher als der Boden
function sprDeposit(seed, cols, speck, n = 4, size = 3) {
  const p = new Pix(28, 16), bx = 14, by = 11;
  for (let k = 0; k < n; k++) {
    const x = 5 + hashI(k, 1, seed) * 18, y = 6 + hashI(k, 2, seed) * 6;
    const rx = size * (0.6 + hashI(k, 3, seed) * 0.7), ry = rx * 0.6;
    p.shadow(x + 1.2, y + 1, rx + 0.6, ry * 0.8, 45);
    p.blob(x, y, rx, ry, cols, seed + k * 7, { rag: 0.08, noise: 0.18, contrast: 0.7 });
  }
  if (speck) {
    for (let k = 0; k < 6; k++) {
      const x = 3 + hashI(k, 5, seed) * 22, y = 5 + hashI(k, 6, seed) * 8;
      if ((p.get(x, y) >>> 24) === 255) p.set(x, y, speck);
    }
  }
  return { pix: p, ax: bx, ay: by };
}

function sprStump(seed) {
  const p = new Pix(28, 16), bx = 12, by = 11;
  const bark = rgba('#4e3d2b'), barkL = rgba('#6a543c'), ring = rgba('#b8955f'), ringD = rgba('#8e6f45');
  p.shadow(bx + 2, by, 6, 2, 60);
  p.rect(bx - 2, by - 4, 5, 4, bark); p.rect(bx - 2, by - 4, 2, 4, barkL);
  for (let x = -2; x <= 2; x++) p.set(bx + x, by - 5, x === 0 ? ringD : ring);
  p.set(bx - 1, by - 6, ring); p.set(bx, by - 6, ring); p.set(bx + 1, by - 6, ring);
  // liegender Stamm daneben
  const lx = bx + 4, ly = by + 1;
  for (let u = 0; u < 10; u++) { p.set(lx + u, ly - (u >> 1), bark); p.set(lx + u, ly - 1 - (u >> 1), barkL); }
  p.set(lx + 10, ly - 5, ring); p.set(lx + 10, ly - 6, ringD);
  for (let k = 0; k < 4; k++) p.set(bx - 4 + hashI(k, 1, seed) * 8, by + 1 + hashI(k, 2, seed) * 2, rgba('#c8a874'));   // Späne
  return { pix: p, ax: bx, ay: by };
}
function sprSapling(seed, conifer) {
  if (conifer) { const p = new Pix(24, 32); paintConifer(p, 11, 28, seed, 0.45); return { pix: p, ax: 11, ay: 28 }; }
  const p = new Pix(28, 32);
  paintTree(p, 13, 28, seed, LEAF_B, 0.45);
  return { pix: p, ax: 13, ay: 28 };
}

// ---------------------------------------------------------------------------
// Gebäude (Platzhalter)
// ---------------------------------------------------------------------------
function boxGeom(w, h, top, M) {
  const cw = (w + h) * 32 + M * 2, ch = (w + h) * 16 + top + 10;
  const ox = h * 32 + M, oy = top;
  return { cw, ch, ox, oy, cx: ox + (w - h) * 16, cy: oy + (w + h) * 8 };
}

function smallCrate(p, x, y, col) {
  const lit = rgba(col), sh = shade(lit, 0.72), tp = shade(lit, 1.15);
  for (let u = 0; u < 8; u++) for (let v = 0; v < 6; v++) {
    p.set(x + u, y + (u >> 1) - v, lit);
    p.set(x + 8 + u, y + 4 - (u >> 1) - v, sh);
  }
  p.poly([[x, y - 5.5], [x + 8, y - 9.5], [x + 16, y - 5.5], [x + 8, y - 1.5]], tp);
}

function paintBox(def) {
  const a = def.art, w = def.footprint.width, h = def.footprint.height;
  const Hh = a.wallH, G = a.gable || 0, M = 8;
  const g = boxGeom(w, h, Hh + G + 18 + (a.headframe || a.stacks || a.silo ? 30 : 0), M);
  const p = new Pix(g.cw, g.ch);
  const k = w + h > 2 ? 0.88 : 0.84; // etwas Abstand zum Feldrand
  const sc = (pt) => [Math.round(g.cx + (pt[0] - g.cx) * k), Math.round(g.cy + (pt[1] - g.cy) * k)];
  const T0 = sc([g.ox, g.oy]), R = sc([g.ox + w * 32, g.oy + w * 16]);
  const L = sc([g.ox - h * 32, g.oy + h * 16]), F = sc([g.ox + (w - h) * 32, g.oy + (w + h) * 16]);
  const up = (pt, d) => [pt[0], pt[1] - d];
  const wallLit = rgba(a.wall), wallSh = shade(wallLit, 0.7);
  const roofLit = rgba(a.roof), roofSh = shade(roofLit, 0.76);
  const baseLit = rgba('#8c8c85'), baseSh = rgba('#66665f');
  const dark = rgba('#2a2622'), glass = rgba('#3b5560'), glint = rgba('#9dbcc2');
  const lenL = F[0] - L[0], lenR = R[0] - F[0];

  // Bodenschatten nach rechts unten
  const so = Hh * 0.75;
  p.poly([R, F, [F[0] + so, F[1] + so * 0.5], [R[0] + so, R[1] + so * 0.5]], rgba('#0a0a0a', 62));

  const wallColor = (u, v, len, lit) => {
    let c = lit ? wallLit : wallSh;
    if (v < 2) return lit ? baseLit : baseSh;
    if (a.siding && v % a.siding === a.siding - 1) c = shade(c, 0.9);
    if (a.stripes && u % 3 === 0) c = shade(c, 0.93);
    if (v >= Hh - 2) c = shade(c, 0.82);                     // Schatten unter der Traufe
    if (lit) {
      if (a.opening && u > len * 0.12 && u < len * 0.88 && v < Hh - 5) {
        return (u - Math.round(len * 0.12)) % 15 < 2 ? shade(wallLit, 0.8) : dark;
      }
      if (a.gate && u > len * 0.3 && u < len * 0.7 && v < Hh - 5) return v % 3 === 0 ? rgba('#4f5955') : rgba('#5f6a66');
      if (a.door && u >= Math.round(len * 0.42) && u < Math.round(len * 0.42) + 6 && v < 10) return v === 9 || u === Math.round(len * 0.42) ? rgba('#3a2e22') : rgba('#5a4633');
      if (a.windows && v >= 6 && v < 11) {
        for (const f of [0.12, 0.74]) {
          const u0 = Math.round(len * f);
          if (u >= u0 && u < u0 + 6) return (v === 10 && u < u0 + 3) ? glint : glass;
        }
      }
    } else if (a.windows && v >= 6 && v < 11 && u >= Math.round(len * 0.4) && u < Math.round(len * 0.4) + 6) {
      return v === 10 && u < Math.round(len * 0.4) + 2 ? shade(glint, 0.8) : shade(glass, 0.8);
    }
    return c;
  };
  // Rechte Wand (Schattenseite) F -> R
  for (let u = 0; u < lenR; u++) {
    const yb = F[1] - ((u + 1) >> 1);
    for (let v = 0; v < Hh; v++) p.set(F[0] + u, yb - v, wallColor(u, v, lenR, false));
  }
  // Linke Wand (Lichtseite) L -> F
  for (let u = 0; u < lenL; u++) {
    const yb = L[1] + (u >> 1);
    for (let v = 0; v < Hh; v++) p.set(L[0] + u, yb - v, wallColor(u, v, lenL, true));
  }

  const Tr = up(T0, Hh), Rr = up(R, Hh), Lr = up(L, Hh), Fr = up(F, Hh);
  const grain = (x, y, c) => (hashI(x, y, 31) < 0.12 ? shade(c, 0.93) : c);
  let ridgeA = null, ridgeB = null;
  if (G > 0) {
    const M1 = [(T0[0] + L[0]) / 2, (T0[1] + L[1]) / 2 - Hh - G];
    const M2 = [(R[0] + F[0]) / 2, (R[1] + F[1]) / 2 - Hh - G];
    ridgeA = M1; ridgeB = M2;
    p.poly([Tr, Rr, M2, M1], (x, y) => grain(x, y, shade(roofSh, 0.9)));
    p.poly([Fr, Rr, M2], (x, y) => (a.siding && (Fr[1] - y) % a.siding === 0 ? shade(wallSh, 0.9) : wallSh));
    p.poly([Lr, Fr, M2, M1], (x, y) => grain(x, y, ((x + 2 * y) % 4 === 0) ? shade(roofLit, 0.9) : roofLit));
    p.line(M1[0], M1[1], M2[0] - 1, M2[1], shade(roofLit, 1.18));
    p.line(Lr[0], Lr[1], Fr[0] - 1, Fr[1] - 1, shade(roofLit, 0.8));
  } else {
    p.poly([Tr, Rr, Fr, Lr], (x, y) => grain(x, y, (((x - 2 * y) >> 1) % 3 === 0) ? shade(roofLit, 0.9) : roofLit));
    p.line(Lr[0], Lr[1], Fr[0] - 1, Fr[1] - 1, shade(roofLit, 1.15));
    p.line(Fr[0], Fr[1] - 1, Rr[0] - 1, Rr[1], roofSh);
  }

  // Details
  if (a.chimney && ridgeA) {
    const x = Math.round(ridgeA[0] + (ridgeB[0] - ridgeA[0]) * 0.3), y = Math.round(ridgeA[1] + (ridgeB[1] - ridgeA[1]) * 0.3);
    p.rect(x, y - 6, 2, 8, rgba('#8a5444')); p.rect(x + 2, y - 6, 2, 8, rgba('#663c30'));
    p.rect(x, y - 7, 4, 1, rgba('#4a4a46'));
  }
  if (a.pipe) {
    const x = Math.round(g.cx + 8), y = Math.round(g.cy - Hh - 6);
    p.rect(x, y - 15, 1, 16, rgba('#7a8082')); p.rect(x + 1, y - 15, 1, 16, rgba('#4f5456'));
    p.rect(x - 1, y - 16, 4, 1, rgba('#3c4042'));
  }
  if (a.logs) {
    const x = L[0] + 3, y = L[1] + 4;
    const end = rgba('#b89462'), ring = rgba('#6a4a2e'), bark = rgba('#5a4230');
    for (const [dx, dy] of [[0, 0], [5, 2], [10, 5], [3, -3], [8, -1]]) {
      p.rect(x + dx, y + dy - 3, 4, 4, ring); p.rect(x + dx + 1, y + dy - 2, 2, 2, end);
      p.line(x + dx + 4, y + dy - 3, x + dx + 11, y + dy - 6, bark);
      p.line(x + dx + 4, y + dy - 1, x + dx + 11, y + dy - 4, shade(bark, 0.8));
    }
  }
  if (a.planks) {
    smallCrate(p, F[0] + 6, F[1] - 1, '#c9a56b');
    smallCrate(p, L[0] + 2, L[1] + 3, '#b08a58');
  }
  if (a.silo) {   // Rundsilo an der rechten Seite
    const sx = Math.round(R[0] - 14), sy = Math.round(R[1] - 2), sh = Hh + 16;
    for (let x = -6; x <= 6; x++) {
      const ey = Math.round(Math.sqrt(36 - x * x) / 2);
      const c = x < 0 ? rgba('#b9b8b0') : x < 3 ? rgba('#9d9c95') : rgba('#7e7d77');
      for (let y = 0; y < sh; y++) p.set(sx + x, sy - y + ey, (y % 7 === 0) ? shade(c, 0.9) : c);
      p.set(sx + x, sy - sh + ey, rgba('#cfcec6')); p.set(sx + x, sy - sh - ey, rgba('#cfcec6'));
    }
    p.rect(sx - 1, sy - sh - 4, 2, 4, rgba('#6b6a65'));
  }
  if (a.stacks) {   // gemauerte Schornsteine
    for (let k = 0; k < a.stacks; k++) {
      const x = Math.round(g.cx - 10 + k * 14), y = Math.round(g.cy - Hh - 2 - k * 4), sh = 30 - k * 4;
      p.rect(x, y - sh, 3, sh, rgba('#8f5646')); p.rect(x + 3, y - sh, 2, sh, rgba('#64392e'));
      for (let yy = y - sh; yy < y; yy += 4) p.rect(x, yy, 5, 1, rgba('#5a352b'));
      p.rect(x - 1, y - sh - 2, 7, 2, rgba('#3d3a37'));
    }
  }
  if (a.headframe) {   // Förderturm aus Stahl
    const x = Math.round(g.cx + 12), y = Math.round(g.cy - 4), H = 40;
    const st = rgba('#3c4144'), lt = rgba('#6b7175');
    p.line(x - 9, y, x - 1, y - H, st); p.line(x + 9, y + 2, x + 1, y - H, st);
    p.line(x - 8, y, x, y - H, lt);
    for (let k = 1; k < 5; k++) { const yy = y - k * 8; const w = 9 - k * 2; p.line(x - w, yy, x + w, yy + 1, st); }
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (Math.abs(i * i + j * j - 9) < 3) p.set(x + i, y - H - 2 + j, rgba('#555a5d'));
  }
  if (a.piles) {   // Halden vor dem Gebäude
    const cols = a.piles.map((h) => rgba(h));
    p.blob(F[0] - 6, F[1] + 2, 9, 5, cols, 301, { rag: 0.2, noise: 0.35, contrast: 0.55 });
    p.blob(F[0] + 8, F[1] - 1, 7, 4, cols, 307, { rag: 0.2, noise: 0.35, contrast: 0.55 });
  }
  return { pix: p, ax: g.ox, ay: g.oy };
}

// Baustelle: Betonplatte mit Material und Gerüst (eigene Sprites, je Größe)
function paintSiteSlab(w, h) {
  const g = boxGeom(w, h, 8, 8);
  const p = new Pix(g.cw, g.ch);
  const k = 0.9;
  const sc = (pt) => [Math.round(g.cx + (pt[0] - g.cx) * k), Math.round(g.cy + (pt[1] - g.cy) * k)];
  const T0 = sc([g.ox, g.oy]), R = sc([g.ox + w * 32, g.oy + w * 16]);
  const L = sc([g.ox - h * 32, g.oy + h * 16]), F = sc([g.ox + (w - h) * 32, g.oy + (w + h) * 16]);
  p.poly([T0, R, F, L], (x, y) => (hashI(x, y, 41) < 0.15 ? rgba('#7a7870') : hashI(x, y, 43) < 0.05 ? rgba('#6b5a44') : rgba('#8f8d85')));
  p.line(L[0], L[1], F[0], F[1], rgba('#6a6862')); p.line(F[0], F[1], R[0], R[1], rgba('#5c5a55'));
  // Bretterstapel und Kiste
  smallCrate(p, Math.round(L[0] + (F[0] - L[0]) * 0.3), Math.round(L[1] + (F[1] - L[1]) * 0.3) - 2, '#b8935e');
  smallCrate(p, Math.round(F[0] + (R[0] - F[0]) * 0.45), Math.round(F[1] + (R[1] - F[1]) * 0.45) - 2, '#7d7f74');
  return { pix: p, ax: g.ox, ay: g.oy };
}
function paintSiteScaffold(w, h) {
  const H = w + h > 2 ? 40 : 28;
  const g = boxGeom(w, h, H + 10, 8);
  const p = new Pix(g.cw, g.ch);
  const k = 0.94;
  const sc = (pt) => [Math.round(g.cx + (pt[0] - g.cx) * k), Math.round(g.cy + (pt[1] - g.cy) * k)];
  const T0 = sc([g.ox, g.oy]), R = sc([g.ox + w * 32, g.oy + w * 16]);
  const L = sc([g.ox - h * 32, g.oy + h * 16]), F = sc([g.ox + (w - h) * 32, g.oy + (w + h) * 16]);
  const pole = rgba('#8a6a44'), poleL = rgba('#b08c5e'), rail = rgba('#9a7a50');
  // Riegel entlang der vorderen Kanten in zwei Höhen
  for (const hh of [Math.round(H * 0.45), H - 2]) {
    p.line(L[0], L[1] - hh, F[0], F[1] - hh, rail);
    p.line(F[0], F[1] - hh, R[0], R[1] - hh, shade(rail, 0.8));
    p.line(L[0], L[1] - hh, T0[0], T0[1] - hh, shade(rail, 0.9));
    p.line(T0[0], T0[1] - hh, R[0], R[1] - hh, shade(rail, 0.85));
  }
  // Diagonale Strebe vorne links
  p.line(L[0], L[1], Math.round((L[0] + F[0]) / 2), Math.round((L[1] + F[1]) / 2) - Math.round(H * 0.45), shade(rail, 0.9));
  for (const c of [T0, L, R, F]) { p.rect(c[0], c[1] - H, 1, H + 1, pole); p.rect(c[0] - 1, c[1] - H, 1, H + 1, poleL); }
  return { pix: p, ax: g.ox, ay: g.oy };
}

function paintLander(def) {
  const w = def.footprint.width, h = def.footprint.height;
  const g = boxGeom(w, h, 84, 8);
  const p = new Pix(g.cw, g.ch);
  const cx = g.cx, cy = g.cy;
  p.shadow(cx + 10, cy + 5, 46, 20, 62);

  // Landebeine
  const by0 = cy - 12;
  const legs = [[cx - 20, by0 + 4, cx - 42, cy + 3], [cx + 20, by0 + 4, cx + 42, cy + 3], [cx, by0 + 12, cx, cy + 23]];
  for (const [x0, y0, x1, y1] of legs) {
    p.line(x0, y0, x1, y1, STEEL); p.line(x0 + 1, y0, x1 + 1, y1, STEEL); p.line(x0, y0 - 1, x1, y1 - 1, STEEL_L);
    p.line(x0, y0 - 9, (x0 + x1) / 2, (y0 + y1) / 2, STEEL);
    for (let i = -4; i <= 4; i++) { p.set(x1 + i, y1 + 1, STEEL); if (Math.abs(i) < 4) p.set(x1 + i, y1 + 2, rgba('#2a2d30')); if (Math.abs(i) < 3) p.set(x1 + i, y1, STEEL_L); }
  }

  // Rumpf (Zylinder)
  const rx = 28, ry = 14, bodyH = 32;
  const band = rgba('#b3663a'), bandSh = rgba('#8a4c2c');
  for (let x = -rx; x <= rx; x++) {
    const ex = Math.sqrt(1 - (x / rx) ** 2) * ry;
    const yb = Math.round(by0 + ex), yt = Math.round(by0 - bodyH + ex);
    const t = (x + rx) / (2 * rx);
    for (let y = yt; y <= yb; y++) {
      let c = HULL[clampI(Math.floor(t * 4.4 + hashI(x, y, 3) * 0.6), 5)];
      if ((x + rx) % 9 === 4) c = shade(c, 0.9);
      if (yb - y < 6) c = t < 0.5 ? rgba('#4c4945') : rgba('#35322f');     // Hitzeschild
      else if (y - yt >= 9 && y - yt < 12) c = t < 0.55 ? band : bandSh;
      else if ((y - yt) === 20) c = shade(c, 0.9);
      p.set(cx + x, y, c);
    }
  }
  // Deckfläche
  const ty0 = by0 - bodyH;
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) p.set(cx + x, ty0 + y, hashI(x, y, 5) < 0.1 ? rgba('#d2d0c6') : rgba('#e3e1d7'));
  }
  // Oberer Konus
  let topY = ty0;
  for (let k = 0; k < 15; k++) {
    const r = 21 - k * 0.85, yy = ty0 - k;
    for (let x = -Math.floor(r); x <= r; x++) {
      const ex = Math.sqrt(Math.max(0, 1 - (x / r) ** 2)) * (r / 2);
      const t = (x + r) / (2 * r);
      p.set(cx + x, Math.round(yy + ex), HULL[clampI(Math.floor(t * 4.6 + 0.2), 5)]);
      if (k === 14) for (let e = -ex; e <= ex; e++) p.set(cx + x, Math.round(yy + e), rgba('#d6d4ca'));
    }
    topY = yy;
  }
  for (let x = -5; x <= 5; x++) p.set(cx + x, topY, rgba('#55585a'));

  // Luke und Leiter
  const hx = cx - 18, hyb = Math.round(by0 + Math.sqrt(1 - (18 / rx) ** 2) * ry) - 7;
  p.rect(hx - 1, hyb - 14, 9, 15, rgba('#7c7b75'));
  p.rect(hx, hyb - 13, 7, 13, rgba('#39424a'));
  p.set(hx + 5, hyb - 6, rgba('#c8c6bc'));
  p.line(hx, hyb + 1, hx - 6, cy + 9, STEEL_L); p.line(hx + 6, hyb + 1, hx, cy + 12, STEEL_L);
  for (let r = 1; r <= 4; r++) p.line(hx - r * 1.4, hyb + 1 + r * 4, hx + 6 - r * 1.4, hyb + 2 + r * 4, STEEL);
  // Bullaugen
  for (const dx of [2, 12, 21]) {
    const yy = Math.round(by0 - bodyH + Math.sqrt(1 - (dx / rx) ** 2) * ry) + 15;
    p.rect(cx + dx - 1, yy - 1, 4, 4, rgba('#6f6e69')); p.rect(cx + dx, yy, 2, 2, rgba('#2f4652')); p.set(cx + dx, yy, rgba('#8fb0b8'));
  }
  // Antennenmast und Schüssel
  p.line(cx + 3, topY, cx + 3, topY - 22, STEEL);
  p.line(cx, topY - 14, cx + 6, topY - 14, STEEL); p.line(cx + 1, topY - 18, cx + 5, topY - 18, STEEL);
  p.set(cx + 3, topY - 23, rgba('#c04a3a'));
  for (let x = -5; x <= 5; x++) {
    const yy = topY - 6 + Math.round((x * x) / 9);
    p.set(cx - 9 + x, yy, rgba('#c9c7bd')); p.set(cx - 9 + x, yy + 1, rgba('#8e8d86'));
  }
  p.line(cx - 9, topY - 5, cx - 9, topY + 1, STEEL);
  // Vorratskisten
  smallCrate(p, cx + 26, cy + 18, '#6f734c');
  smallCrate(p, cx + 38, cy + 12, '#9a7a4e');
  return { pix: p, ax: g.ox, ay: g.oy };
}

// ---------------------------------------------------------------------------
// Atlas
// ---------------------------------------------------------------------------
function makeMips(canvas) {
  const out = [canvas];
  for (let f = 2; f <= 4; f *= 2) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(canvas.width / f));
    c.height = Math.max(1, Math.ceil(canvas.height / f));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width / f, canvas.height / f);
    out.push(c);
  }
  return out;
}

export function buildSprites() {
  const defs = [];   // { id, pix, ax, ay }
  const objectSprites = {};
  const add = (id, s) => { defs.push({ id, ...s }); return defs.length - 1; };
  const addObj = (o, id, s) => { (objectSprites[o] ||= []).push(add(id, s)); };

  addObj(O.TREE, 'tree_deciduous_01', sprTree(11, LEAF, 1));
  addObj(O.TREE, 'tree_deciduous_02', sprTree(23, LEAF_B, 0.9));
  addObj(O.TREE, 'tree_deciduous_03', sprTree(37, LEAF, 0.76));
  addObj(O.TREE, 'tree_deciduous_group_01', sprTreeGroup(41, LEAF));
  addObj(O.TREE, 'tree_deciduous_group_02', sprTreeGroup(53, LEAF_B));
  addObj(O.CONIFER, 'tree_conifer_01', sprConifer(61, 1));
  addObj(O.CONIFER, 'tree_conifer_02', sprConifer(67, 0.84));
  addObj(O.CONIFER, 'tree_conifer_03', sprConifer(71, 1.1));
  addObj(O.CONIFER, 'tree_conifer_group_01', sprConiferGroup(79));
  addObj(O.CONIFER, 'tree_conifer_group_02', sprConiferGroup(83));
  addObj(O.BUSH, 'bush_01', sprBush(91));
  addObj(O.BUSH, 'bush_02', sprBush(97));
  addObj(O.BUSH, 'bush_flower_white_01', sprBush(93, '#e8e6d8'));
  addObj(O.BUSH, 'bush_flower_red_01', sprBush(95, '#b8423a'));
  addObj(O.BUSH, 'bush_low_01', sprBushLow(99));
  addObj(O.BUSH, 'bush_low_02', sprBushLow(103));
  addObj(O.ROCK, 'rock_small_01', sprRock(101, false));
  addObj(O.ROCK, 'rock_small_02', sprRock(107, false));
  addObj(O.BOULDER, 'rock_large_01', sprRock(113, true));
  addObj(O.BOULDER, 'rock_large_02', sprRock(127, true));
  addObj(O.PEAK, 'mountain_peak_01', sprPeak(131));
  addObj(O.PEAK, 'mountain_peak_02', sprPeak(149));
  addObj(O.PEAK, 'mountain_peak_03', sprPeak(163));
  addObj(O.DEADTREE, 'tree_swamp_01', sprDeadTree(171));
  addObj(O.DEADTREE, 'tree_swamp_02', sprDeadTree(181));
  addObj(O.REEDS, 'reeds_01', sprReeds(191));
  addObj(O.REEDS, 'reeds_02', sprReeds(197));
  addObj(O.DEP_STONE, 'deposit_stone_01', sprDeposit(201, STONE, 0, 4, 3));
  addObj(O.DEP_STONE, 'deposit_stone_02', sprDeposit(202, STONE, 0, 3, 3.6));
  addObj(O.DEP_IRON, 'deposit_iron_01', sprDeposit(211, IRON, rgba('#a8693e'), 3, 3));
  addObj(O.DEP_IRON, 'deposit_iron_02', sprDeposit(212, IRON, rgba('#a8693e'), 4, 2.6));
  addObj(O.DEP_COAL, 'deposit_coal_01', sprDeposit(221, COAL, rgba('#5d5d66'), 4, 2.6));
  addObj(O.DEP_COAL, 'deposit_coal_02', sprDeposit(222, COAL, rgba('#5d5d66'), 3, 3));
  addObj(O.DEP_LIME, 'deposit_limestone_01', sprDeposit(231, LIME, 0, 3, 3.2));
  addObj(O.DEP_LIME, 'deposit_limestone_02', sprDeposit(232, LIME, 0, 4, 2.6));
  addObj(O.DEP_CLAY, 'deposit_clay_01', sprDeposit(241, CLAY, 0, 2, 3.4));
  addObj(O.DEP_CLAY, 'deposit_clay_02', sprDeposit(242, CLAY, 0, 3, 2.6));
  addObj(O.DEP_SAND, 'deposit_sand_01', sprDeposit(251, SANDR, 0, 2, 3.6));
  addObj(O.DEP_SAND, 'deposit_sand_02', sprDeposit(252, SANDR, 0, 2, 2.8));
  addObj(O.STUMP, 'tree_stump_01', sprStump(261));
  addObj(O.STUMP, 'tree_stump_02', sprStump(263));
  addObj(O.SAPLING, 'tree_sapling_01', sprSapling(271, false));
  addObj(O.SAPLING, 'tree_sapling_02', sprSapling(273, false));
  addObj(O.SAPLING_C, 'tree_sapling_conifer_01', sprSapling(281, true));
  addObj(O.SAPLING_C, 'tree_sapling_conifer_02', sprSapling(283, true));
  const building = {};
  for (const def of Object.values(BUILDINGS)) {
    building[def.id] = add(def.id, def.art.kind === 'lander' ? paintLander(def) : paintBox(def));
  }

  for (const [w, h] of [[1, 1], [2, 2]]) {
    add(`site_slab_${w}x${h}`, paintSiteSlab(w, h));
    add(`site_scaffold_${w}x${h}`, paintSiteScaffold(w, h));
  }

  // Menschen und Tiere: Indizes relativ zu defs merken
  const lifeBase = defs.length;
  const L = lifeSpriteDefs();
  for (const d of L.defs) defs.push(d);
  const shift = (a) => (Array.isArray(a) ? a.map(shift) : a + lifeBase);
  const life = { people: shift(L.people), grazers: shift(L.grazers), chickens: shift(L.chickens), trucks: shift(L.trucks), cars: shift(L.cars) };

  // Regalpackung; alle Positionen auf Vielfache von 4, damit die Mips exakt passen.
  const AW = 1024, PAD = 4;
  let x = PAD, y = PAD, rowH = 0;
  const pos = defs.map((d) => {
    const w = Math.ceil(d.pix.w / 4) * 4, h = Math.ceil(d.pix.h / 4) * 4;
    if (x + w + PAD > AW) { x = PAD; y += rowH + PAD; rowH = 0; }
    const r = { x, y, w, h };
    x += w + PAD; if (h > rowH) rowH = h;
    return r;
  });
  const atlas = document.createElement('canvas');
  atlas.width = AW; atlas.height = Math.ceil((y + rowH + PAD) / 4) * 4;
  const actx = atlas.getContext('2d');
  defs.forEach((d, i) => actx.drawImage(d.pix.toCanvas(), pos[i].x, pos[i].y));
  const mips = makeMips(atlas);

  const list = defs.map((d, i) => ({
    id: d.id, src: mips, x: pos[i].x, y: pos[i].y, w: pos[i].w, h: pos[i].h, ax: d.ax, ay: d.ay, placeholder: true,
  }));
  const byId = {};
  list.forEach((s, i) => { byId[s.id] = i; });

  return {
    list, byId, objectSprites, building, atlas, life,
    // Ersetzt einen Platzhalter durch ein echtes Asset (Bild muss geladen sein).
    override(id, img, ax, ay) {
      const i = byId[id];
      if (i === undefined) return false;
      const c = document.createElement('canvas');
      c.width = Math.ceil(img.width / 4) * 4; c.height = Math.ceil(img.height / 4) * 4;
      c.getContext('2d').drawImage(img, 0, 0);
      Object.assign(list[i], { src: makeMips(c), x: 0, y: 0, w: c.width, h: c.height, ax, ay, placeholder: false });
      return true;
    },
    forObject(obj, h) {
      const arr = objectSprites[obj];
      return arr ? arr[h % arr.length] : -1;
    },
    // Kleines Vorschaubild für Menüs.
    thumb(id, size) {
      const s = list[byId[id]];
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const f = Math.min(size / s.w, size / s.h);
      const dw = s.w * f, dh = s.h * f;
      ctx.drawImage(s.src[0], s.x, s.y, s.w, s.h, (size - dw) / 2, (size - dh) / 2, dw, dh);
      return c;
    },
  };
}
