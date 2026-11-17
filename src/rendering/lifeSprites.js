// Prozedurale Pixel-Sprites für Menschen und Tiere (Platzhalter im Zielstil).
// Jede Figur gibt es in vier Blickrichtungen (SO, SW, NO, NW) und mehreren
// Bildern. Gespiegelte Richtungen werden fertig gemalt, damit beim Zeichnen
// keine Transformation nötig ist.

import { Pix, rgba, shade } from './pix.js';

// Kleidungsvarianten der Siedler (Jacke, Hose, Kopf: Haar oder Helm)
export const LOOKS = [
  { name: 'Arbeiter', shirt: '#c9772f', pants: '#3d4a5c', head: 'helmet', hat: '#e2c13a' },     // orange Weste, gelber Helm
  { name: 'Siedlerin', shirt: '#8a3b34', pants: '#4a4036', head: 'hair', hat: '#4a2f1e' },
  { name: 'Techniker', shirt: '#5a6f86', pants: '#2f3640', head: 'hair', hat: '#2a2420' },
  { name: 'Bauarbeiter', shirt: '#d8d2bf', pants: '#4a5a3a', head: 'helmet', hat: '#e9e5da' },
  { name: 'Fahrer', shirt: '#6b6d3a', pants: '#3a3a36', head: 'cap', hat: '#2f4a6b' },
  { name: 'Siedler', shirt: '#3f6a7a', pants: '#5a4a38', head: 'hair', hat: '#c8b48a' },
];
const SKIN = ['#e0b48f', '#c99474', '#a06f4f', '#7a4f36'];

const DARK = rgba('#1e1c1a');

// dir: 0 = SO (vorn, rechts), 1 = SW (vorn, links), 2 = NO (hinten, rechts), 3 = NW (hinten, links)
function person(look, skin, dir, frame) {
  const p = new Pix(16, 22), back = dir >= 2, left = dir === 1 || dir === 3;
  const cx = 8, foot = 20;
  const sh = rgba(look.shirt), shD = shade(sh, 0.72), pa = rgba(look.pants), paD = shade(pa, 0.75);
  const sk = rgba(skin), skD = shade(sk, 0.82), hat = rgba(look.hat), hatD = shade(hat, 0.78);
  p.shadow(cx + 1, foot + 0.5, 3.6, 1.4, 70);
  // Beine (Schrittbild: 0 = auseinander, 1 = zusammen, 2 = stehen)
  const chop = frame >= 3;
  const spread = frame === 0 ? 1 : chop ? 1 : 0;
  const lx = cx - 1 - spread, rx = cx + spread;
  for (let y = foot - 4; y <= foot; y++) {
    p.set(lx, y, pa); p.set(rx, y, paD);
  }
  p.set(lx, foot, DARK); p.set(rx, foot, DARK);
  // Körper
  for (let y = foot - 9; y <= foot - 5; y++) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      const lit = left ? x >= cx : x <= cx;           // Licht von links oben
      p.set(x, y, lit ? sh : shD);
    }
  }
  p.set(cx - 2, foot - 5, shD); p.set(cx + 2, foot - 5, shD);
  if (chop) {   // Axt: Bild 3 ausgeholt, Bild 4 Schlag
    const s = left ? -1 : 1, handle = rgba('#7a5a36'), blade = rgba('#9aa3a8'), bladeD = rgba('#5f676c');
    p.set(cx - 3 * s, foot - 7, shD); p.set(cx - 3 * s, foot - 6, shD);          // hinterer Arm
    if (frame === 3) {
      p.set(cx + 2 * s, foot - 10, shD); p.set(cx + 2 * s, foot - 11, sk);     // Arm hoch
      for (let k = 0; k < 5; k++) p.set(cx + (2 - (k >> 1)) * s, foot - 12 - k, handle);
      p.set(cx, foot - 17, blade); p.set(cx - s, foot - 17, blade); p.set(cx - s, foot - 16, bladeD);
    } else {
      p.set(cx + 3 * s, foot - 8, shD); p.set(cx + 4 * s, foot - 7, sk);       // Arm vor
      for (let k = 0; k < 4; k++) p.set(cx + (5 + k) * s, foot - 6 + k, handle);
      p.set(cx + 9 * s, foot - 2, blade); p.set(cx + 9 * s, foot - 1, blade); p.set(cx + 8 * s, foot - 1, bladeD);
    }
  }
  // Arme (schwingen gegengleich zu den Beinen)
  const sw = frame === 0 ? 1 : 0;
  if (!chop) {
    for (let y = foot - 8; y <= foot - 5 + sw; y++) p.set(cx - 3, y, shD);
    for (let y = foot - 8; y <= foot - 5 + (1 - sw); y++) p.set(cx + 3, y, shD);
    p.set(cx - 3, foot - 4 + sw, sk); p.set(cx + 3, foot - 4 + (1 - sw), skD);
  }
  // Kopf
  const hy = foot - 13;
  for (let y = hy; y < hy + 3; y++) for (let x = cx - 1; x <= cx + 1; x++) p.set(x, y, (left ? x > cx - 1 : x < cx + 1) ? sk : skD);
  p.set(cx, hy + 3, skD);                                // Hals
  if (back) for (let x = cx - 1; x <= cx + 1; x++) { p.set(x, hy, hat); p.set(x, hy + 1, look.head === 'hair' ? hat : sk); }
  if (look.head === 'helmet') {
    for (let x = cx - 2; x <= cx + 2; x++) p.set(x, hy, hatD);
    for (let x = cx - 1; x <= cx + 1; x++) p.set(x, hy - 1, hat);
  } else if (look.head === 'cap') {
    for (let x = cx - 1; x <= cx + 1; x++) p.set(x, hy - 1, hat);
    p.set(left ? cx - 2 : cx + 2, hy, hatD);
  } else {
    for (let x = cx - 1; x <= cx + 1; x++) p.set(x, hy - 1, hat);
    p.set(cx - 2, hy, hatD); p.set(cx + 2, hy, hatD);
  }
  if (!back) { p.set(left ? cx - 1 : cx + 1, hy + 1, DARK); }   // Auge (Blickrichtung)
  return { pix: p, ax: cx, ay: foot };
}

// Grasläufer: genügsamer Pflanzenfresser des Planeten (hochbeinig, langer Hals)
function grazer(dir, frame) {
  const p = new Pix(20, 18), left = dir === 1 || dir === 3, back = dir >= 2;
  const fx = (x) => (left ? 19 - x : x);
  const body = rgba('#a58b5a'), bodyD = rgba('#7d6743'), belly = rgba('#c9b285'), stripe = rgba('#5e4a30'), leg = rgba('#5a4834');
  p.shadow(10, 15.5, 7, 1.8, 70);
  // Beine
  const off = frame === 1 ? 1 : 0;
  for (const [x, o] of [[6, off], [8, -off], [12, -off], [14, off]]) for (let y = 11; y <= 15; y++) p.set(fx(x + (y > 13 ? o : 0)), y, leg);
  // Körper
  for (let y = 7; y <= 11; y++) for (let x = 5; x <= 15; x++) {
    if ((y === 7 || y === 11) && (x === 5 || x === 15)) continue;
    let c = y <= 8 ? bodyD : y >= 11 ? belly : body;
    if (y === 8 && x % 3 === 0) c = stripe;
    p.set(fx(x), y, c);
  }
  // Hals und Kopf: frame 2 = grasen (Kopf unten)
  if (frame === 2) {
    for (let k = 0; k < 5; k++) p.set(fx(15 + (k > 2 ? 1 : 0) + (k >> 1)), 8 + k, bodyD);
    p.set(fx(17), 13, body); p.set(fx(18), 13, body); p.set(fx(18), 14, bodyD);
  } else {
    for (let k = 0; k < 5; k++) p.set(fx(15 + (k >> 1)), 7 - k, k < 2 ? body : bodyD);
    p.set(fx(17), 2, body); p.set(fx(18), 2, body); p.set(fx(18), 3, bodyD);
    p.set(fx(16), 1, stripe);                              // Ohr
    if (!back) p.set(fx(17), 2, DARK);
  }
  p.set(fx(4), 8, stripe); p.set(fx(3), 9, stripe);          // Schwanz
  return { pix: p, ax: 10, ay: 15 };
}

function chicken(dir, frame) {
  const p = new Pix(8, 8), left = dir === 1 || dir === 3;
  const fx = (x) => (left ? 7 - x : x);
  const w = rgba('#ece8dc'), wD = rgba('#bdb7a6'), red = rgba('#b8382e'), beak = rgba('#d9a43a');
  p.shadow(4, 6.5, 2.6, 1, 60);
  for (let y = 3; y <= 5; y++) for (let x = 2; x <= 5; x++) p.set(fx(x), y, y === 5 ? wD : w);
  const hy = frame === 1 ? 4 : 2;                           // Bild 1: pickt
  p.set(fx(5), hy, w); p.set(fx(6), hy, w); p.set(fx(6), hy - 1, red); p.set(fx(7), hy, beak);
  p.set(fx(1), 3, wD);
  p.set(fx(3), 6, beak); p.set(fx(4), 6, beak);
  return { pix: p, ax: 4, ay: 6 };
}

// --- Fahrzeuge -----------------------------------------------------------------------
// Isometrische Kästen: Bildschirm = (ox + x - y, oy + (x + y) / 2 - z). Sichtbar sind
// Oberseite, +x-Seite (rechts unten, dunkler) und +y-Seite (links unten, mittel).
// Richtung 0 = fährt nach +x (SO), 3 = nach -x (NW); 1 und 2 sind die Spiegelbilder.

// Ladungsfarben (Index = cargoIndex(Ware)); 0 = leer
export const CARGO = [
  null, '#7a5a3a', '#c9a46a', '#9a968c', '#8a4f3a', '#2e2c2a', '#d8d2c0', '#a8633e', '#d9c48a',
  '#7f8a92', '#bfbdb5', '#a5a39b', '#9fc4c8', '#6f8a4a', '#d6b75a', '#9a7a4a', '#a58b5a',
];
const CARGO_OF = { logs: 1, planks: 2, stone: 3, iron_ore: 4, coal: 5, limestone: 6, clay: 7, sand: 8, steel: 9, cement: 10, concrete: 11, glass: 12, grain: 14, potatoes: 15, cattle: 16 };
export function cargoIndex(g) { return g ? (CARGO_OF[g] || 13) : 0; }
const CABS = ['#c9692c', '#e3e0d6', '#3f6a8e'];
const CARS = ['#9b2f2a', '#3e5f7d', '#d7c58a', '#4f6b45', '#d9d6cf'];

function isoBox(p, ox, oy, x0, y0, z0, x1, y1, z1, top, sideY, sideX) {
  const S = (x, y, z) => [ox + x - y, oy + (x + y) / 2 - z];
  p.poly([S(x1, y0, z0), S(x1, y1, z0), S(x1, y1, z1), S(x1, y0, z1)], sideX);
  p.poly([S(x0, y1, z0), S(x1, y1, z0), S(x1, y1, z1), S(x0, y1, z1)], sideY);
  p.poly([S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], top);
}

function mirror(pix) {
  const q = new Pix(pix.w, pix.h);
  for (let y = 0; y < pix.h; y++) for (let x = 0; x < pix.w; x++) q.d[y * q.w + (pix.w - 1 - x)] = pix.d[y * pix.w + x];
  return q;
}

function truck(cab, cargo, dir) {
  const p = new Pix(30, 26), ox = 11, oy = 12, L = 16, W = 8;
  const back = dir === 2 || dir === 3;
  p.shadow(15, 19, 10, 4, 70);
  const c = rgba(cab), cT = shade(c, 1.12), cY = shade(c, 0.9), cX = shade(c, 0.7);
  const bed = rgba('#5d5a52'), bedT = rgba('#77736a'), bedX = rgba('#4a4741');
  const tire = rgba('#1f1d1b'), glass = rgba('#9cc3d2'), glassD = rgba('#6f97a8');
  const cg = cargo ? rgba(CARGO[cargo]) : 0;
  const wheels = () => { for (const wx of [2, 11.5]) isoBox(p, ox, oy, wx, W - 0.6, 0, wx + 3, W, 3, tire, tire, tire); };
  const drawBed = (x0, x1) => {
    isoBox(p, ox, oy, x0, 0, 2, x1, W, 4.5, bedT, bed, bedX);
    if (cg) isoBox(p, ox, oy, x0 + 0.6, 0.6, 4.5, x1 - 0.6, W - 0.6, 8.5, shade(cg, 1.15), cg, shade(cg, 0.75));
  };
  const drawCab = (x0, x1, frontX) => {
    isoBox(p, ox, oy, x0, 0, 2, x1, W, 10, cT, cY, cX);
    // Seitenfenster (+y-Seite) und Frontscheibe (+x-Seite) bzw. Rückwand
    const S = (x, y, z) => [ox + x - y, oy + (x + y) / 2 - z];
    p.poly([S(x0 + 1, W, 6), S(x1 - 1, W, 6), S(x1 - 1, W, 9), S(x0 + 1, W, 9)], glass);
    if (frontX) p.poly([S(x1, 1, 6), S(x1, W - 1, 6), S(x1, W - 1, 9), S(x1, 1, 9)], glassD);
  };
  wheels();
  if (!back) { drawBed(0, 11); drawCab(11, L, true); }
  else { drawCab(0, 5, false); drawBed(5, L); }
  const pix = (dir === 1 || dir === 2) ? mirror(p) : p;
  return { pix, ax: 15, ay: 19 };
}

function car(color, dir) {
  const p = new Pix(30, 26), ox = 12, oy = 14, L = 11, W = 6;
  const back = dir === 2 || dir === 3;
  p.shadow(15, 19, 7, 3, 70);
  const c = rgba(color), cT = shade(c, 1.12), cY = shade(c, 0.9), cX = shade(c, 0.7);
  const tire = rgba('#1f1d1b'), glass = rgba('#8fb4c4'), glassD = rgba('#63879a');
  for (const wx of [1.5, 7.5]) isoBox(p, ox, oy, wx, W - 0.5, 0, wx + 2, W, 2, tire, tire, tire);
  isoBox(p, ox, oy, 0, 0, 1, L, W, 4, cT, cY, cX);
  const c0 = back ? 3 : 2.5, c1 = back ? 8.5 : 8;
  isoBox(p, ox, oy, c0, 0.5, 4, c1, W - 0.5, 6.5, cT, glass, glassD);
  const pix = (dir === 1 || dir === 2) ? mirror(p) : p;
  return { pix, ax: 15, ay: 19 };
}

// Liefert die Sprite-Definitionen für den Atlas und eine Nachschlagefunktion.
export function lifeSpriteDefs() {
  const defs = [];
  const people = [];   // people[look][skin][dir][frame]
  LOOKS.forEach((look, li) => {
    people[li] = [];
    SKIN.forEach((skin, si) => {
      people[li][si] = [];
      for (let d = 0; d < 4; d++) {
        people[li][si][d] = [];
        for (let f = 0; f < 5; f++) {     // 0/1 laufen, 2 stehen, 3/4 Axt
          people[li][si][d][f] = defs.length;
          defs.push({ id: `person_${li}_${si}_${d}_${f}`, ...person(look, skin, d, f) });
        }
      }
    });
  });
  const grazers = [], chickens = [];
  for (let d = 0; d < 4; d++) {
    grazers[d] = []; chickens[d] = [];
    for (let f = 0; f < 3; f++) { grazers[d][f] = defs.length; defs.push({ id: `animal_grazer_${d}_${f}`, ...grazer(d, f) }); }
    for (let f = 0; f < 2; f++) { chickens[d][f] = defs.length; defs.push({ id: `animal_chicken_${d}_${f}`, ...chicken(d, f) }); }
  }
  const trucks = [], cars = [];   // trucks[kabine][ladung][richtung], cars[farbe][richtung]
  CABS.forEach((cab, ci) => {
    trucks[ci] = [];
    CARGO.forEach((_, gi) => {
      trucks[ci][gi] = [];
      for (let d = 0; d < 4; d++) { trucks[ci][gi][d] = defs.length; defs.push({ id: `truck_${ci}_${gi}_${d}`, ...truck(cab, gi, d) }); }
    });
  });
  CARS.forEach((col, ci) => {
    cars[ci] = [];
    for (let d = 0; d < 4; d++) { cars[ci][d] = defs.length; defs.push({ id: `car_${ci}_${d}`, ...car(col, d) }); }
  });
  return { defs, people, grazers, chickens, trucks, cars };
}
