// Computer-Nachbarn (Stufe D): andere Expeditionen mit eigenen Siedlungen.
//
// - Lage, Name, Profil und Bauplan folgen aus dem Seed (nicht gespeichert).
// - Gespeichert werden nur der veränderliche Zustand: Größe, Lager, Beziehung, Handelsumsatz.
// - Ihre Wirtschaft wird vereinfacht je Monat gerechnet (Produktion, Verbrauch, Wachstum),
//   offline genauso wie beim Nachrechnen der eigenen Siedlung.
// - Preise nach Angebot und Nachfrage; gute Beziehung gibt bis zu 10 % Rabatt.
// - Lieferung: ohne Wegverbindung nur per Luftfracht (teuer), mit Straße zur Handelsstation günstig.

import { GOODS } from '../config/economy.js';
import { T, isWater } from '../config/terrain.js';
import { rand2 } from '../world/noise.js';

export const PROFILES = {
  steel:  { name: 'Stahlstadt', makes: { iron_ore: 220, coal: 220, steel: 70 }, needs: { planks: 120, potatoes: 100, meat: 60, concrete: 40 },
            types: ['iron_mine', 'coal_mine', 'smelter'] },
  farm:   { name: 'Agrarkolonie', makes: { potatoes: 260, grain: 300, meat: 120, vegetables: 100 }, needs: { steel: 30, planks: 120, concrete: 50, glass: 20 },
            types: ['farm', 'ranch', 'greenhouse'] },
  timber: { name: 'Holzsiedlung', makes: { logs: 320, planks: 260 }, needs: { stone: 120, steel: 25, fish: 80, bread: 60 },
            types: ['lumber_camp', 'sawmill', 'lumber_camp'] },
  build:  { name: 'Baustoffwerk', makes: { stone: 300, sand: 240, cement: 110, concrete: 90 }, needs: { logs: 150, planks: 80, bread: 70, coal: 60 },
            types: ['quarry', 'cement_works', 'concrete_plant'] },
};
const NAMES = ['Nordstern', 'Kap Ferro', 'Meridian', 'Halvorsen', 'Neu-Brandt', 'Port Aurora', 'Kessling', 'Drei Eichen', 'Talheim', 'Vesta',
  'Lindqvist', 'Station Orion', 'Hohenfeld', 'Carver', 'Neu-Lübeck', 'Saltmarsh', 'Brückental', 'Kepler', 'Rotsand', 'Ostkamp',
  'Fairbanks', 'Tannau', 'Aldrin', 'Weißenhain', 'Marlow', 'Grauwacke', 'Svalby', 'Hollister', 'Felsbach', 'Eridanus', 'Morgenrot', 'Kalmar'];

// Wie viele Siedlungen es gibt und wann neue entstehen
export const CITY = {
  initial: 8,        // von Anfang an
  max: 24,           // höchstens
  firstNew: 4,       // die erste neue Siedlung entsteht etwa im 4. Spielmonat …
  every: 5,          // … danach etwa alle 5 Monate eine weitere
  minSize: 30, cap: 900,
  keepAway: 34,      // Abstand zu eigenen Gebäuden bei der Gründung (Felder)
};

// Größenklasse für Beschriftung und Handelsfenster
export function cityClass(size) {
  return size < 70 ? 'Außenposten' : size < 180 ? 'Siedlung' : size < 380 ? 'Dorf' : size < 650 ? 'Kleinstadt' : 'Stadt';
}
const COLORS = ['#b8462e', '#3f6aa0', '#4f8a3a', '#a07a2a', '#7a4f9a'];

export const TRADE = {
  airMarkupBuy: 1.35,     // Luftfracht: Einkauf teurer …
  airMarkupSell: 0.65,    // … und Verkauf billiger
  roadMarkupBuy: 1.05,
  roadMarkupSell: 0.95,
  flightBuy: 2.0,         // Einkauf bei den Versorgungsflügen: doppelter Grundpreis
};

// Lage der Nachbarn aus dem Seed bestimmen (auf festem, flachem Land)
export function siteNeighbors(world, store, count = 4) {
  const s = world.start, out = [];
  const seedN = (world.seedNum || 1) >>> 0;
  const o = {};
  const landOk = (x, y) => {
    if (!world.inBounds(x - 12, y - 12) || !world.inBounds(x + 12, y + 12)) return false;
    for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) {
      world.sample(x + dx, y + dy, o);
      const t = o.terrain;
      if (isWater(t) || t === T.MOUNTAIN || t === T.ROCK || t === T.SWAMP) return false;
    }
    return true;
  };
  const profKeys = Object.keys(PROFILES);
  for (let k = 0; k < count; k++) {
    const base = (k / count) * Math.PI * 2 + rand2(seedN, k, 501) * 0.9;
    let found = null;
    for (let tries = 0; tries < 60 && !found; tries++) {
      const a = base + (rand2(k, tries, 502) - 0.5) * 1.2;
      const r = 170 + rand2(tries, k, 503) * 300;
      const x = Math.round(s.x + Math.cos(a) * r), y = Math.round(s.y + Math.sin(a) * r);
      if (out.some((n) => Math.hypot(n.x - x, n.y - y) < 140)) continue;
      if (landOk(x, y)) found = { x, y };
    }
    if (!found) continue;
    const nameI = Math.floor(rand2(seedN, k, 504) * NAMES.length);
    let name = NAMES[nameI];
    if (out.some((n) => n.name === name)) name = NAMES[(nameI + k + 1) % NAMES.length];
    out.push({ id: 'n' + k, name, profile: profKeys[k % profKeys.length], color: COLORS[k % COLORS.length], x: found.x, y: found.y });
  }
  return out;
}

// Alle möglichen Siedlungsplätze: die ersten vier wie bisher (gleiche Lage für alte Spielstände),
// danach weitere in wachsendem Abstand. foundAt: Spielmonat, ab dem dort gegründet wird.
export function candidateSites(world, store) {
  const out = siteNeighbors(world, store, 4).map((q, k) => ({ ...q, foundAt: 0 }));
  const s = world.start, seedN = (world.seedNum || 1) >>> 0, o = {};
  const landOk = (x, y) => {
    if (!world.inBounds(x - 14, y - 14) || !world.inBounds(x + 14, y + 14)) return false;
    for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) {
      world.sample(x + dx, y + dy, o);
      const t = o.terrain;
      if (isWater(t) || t === T.MOUNTAIN || t === T.ROCK || t === T.SWAMP) return false;
    }
    return true;
  };
  const used = new Set(out.map((q) => q.name));
  const profKeys = Object.keys(PROFILES);
  for (let k = 4; k < CITY.max; k++) {
    let found = null;
    for (let tries = 0; tries < 80 && !found; tries++) {
      const a = k * 2.39996 + rand2(seedN, k * 7 + tries, 611) * 1.4;
      const r = 150 + ((k - 4) / (CITY.max - 4)) * 650 + rand2(k, tries, 612) * 160;
      const x = Math.round(s.x + Math.cos(a) * r), y = Math.round(s.y + Math.sin(a) * r);
      if (out.some((n) => Math.hypot(n.x - x, n.y - y) < 110)) continue;
      if (landOk(x, y)) found = { x, y };
    }
    if (!found) continue;
    let ni = Math.floor(rand2(seedN, k, 613) * NAMES.length);
    while (used.has(NAMES[ni])) ni = (ni + 1) % NAMES.length;
    used.add(NAMES[ni]);
    const foundAt = k < CITY.initial ? 0 : CITY.firstNew + (k - CITY.initial) * CITY.every + Math.floor(rand2(seedN, k, 614) * 3);
    out.push({ id: 'n' + k, name: NAMES[ni], profile: profKeys[Math.floor(rand2(seedN, k, 615) * profKeys.length)], color: COLORS[k % COLORS.length], x: found.x, y: found.y, foundAt });
  }
  // jede Siedlung wächst unterschiedlich schnell (0,6- bis 1,5-fach)
  for (const q of out) q.growth = 0.6 + rand2(seedN, +q.id.slice(1), 616) * 0.9;
  return out;
}

// Anfangszustand eines Nachbarn. late: Monate seit der geplanten Gründung (beim Nachrechnen),
// damit spät nachgeholte Siedlungen nicht alle winzig sind.
export function freshNeighbor(site, late = 0) {
  const p = PROFILES[site.profile];
  const stock = {};
  for (const [g, v] of Object.entries(p.makes)) stock[g] = v * 2;
  for (const [g, v] of Object.entries(p.needs)) stock[g] = v * 0.5;
  const size = site.foundAt ? Math.min(250, CITY.minSize * Math.pow(1.025, Math.max(0, late))) : 60;
  return { id: site.id, size, stock, relation: 10, traded: 0, founded: true };
}

// Monatsschritt: produzieren, verbrauchen, wachsen
export function advanceNeighbor(n, site, months) {
  const p = PROFILES[site.profile];
  const f = n.size / 100;
  for (const [g, v] of Object.entries(p.makes)) n.stock[g] = Math.min(v * 6 * f, (n.stock[g] || 0) + v * f * months);
  let short = 0;
  for (const [g, v] of Object.entries(p.needs)) {
    const want = v * f * months;
    // Grundversorgung durch andere Nachbarn und Versorgungsflüge (70 %); den Rest muss jemand liefern
    n.stock[g] = (n.stock[g] || 0) + want * 0.7;
    const have = n.stock[g] || 0;
    if (have < want) short += (want - have) / want;
    n.stock[g] = Math.max(0, have - want);
  }
  // Wachstum: versorgt wächst die Siedlung langsam, Mangel bremst
  const supply = 1 - short / Math.max(1, Object.keys(p.needs).length);
  const g = site.growth || 1;
  n.size = Math.max(CITY.minSize, Math.min(CITY.cap, n.size * (1 + (0.045 * g * supply - 0.005) * months)));
  // Beziehung verblasst langsam ohne Handel
  n.relation = Math.max(0, n.relation - 0.3 * months);
}

// Preis je Einheit, den der Nachbar verlangt (sell=false) bzw. zahlt (sell=true)
export function priceOf(n, site, g, playerSells) {
  const p = PROFILES[site.profile];
  const base = GOODS[g].price;
  const f = n.size / 100;
  const flow = (p.makes[g] || p.needs[g] || 50) * f;
  const target = flow * 3;
  const have = n.stock[g] || 0;
  const scarcity = Math.max(0, Math.min(2, 1 - (have - target) / Math.max(1, target)));   // 0 = Überfluss, 2 = leer
  const rel = 1 - Math.min(0.1, n.relation / 1000);
  if (playerSells) {
    // Was sie brauchen, kaufen sie teurer
    const need = p.needs[g] ? 1.25 : 0.8;
    return Math.max(1, Math.round(base * need * (0.8 + 0.4 * scarcity) * (2 - rel) * 100) / 100);
  }
  const make = p.makes[g] ? 1.05 : 1.6;
  return Math.max(1, Math.round(base * make * (0.75 + 0.35 * scarcity) * rel * 100) / 100);
}

// Was ein Nachbar anbietet (Menge zum Verkauf) und was er sucht (Menge zum Ankauf)
export function offers(n, site) {
  const p = PROFILES[site.profile];
  const f = n.size / 100;
  const sell = [], buy = [];
  for (const g of Object.keys(p.makes)) {
    const reserve = p.makes[g] * f * 0.5;
    const qty = Math.floor(Math.max(0, (n.stock[g] || 0) - reserve));
    sell.push({ g, qty, price: priceOf(n, site, g, false) });
  }
  for (const g of Object.keys(p.needs)) {
    const want = Math.floor(Math.max(0, p.needs[g] * f * 4 - (n.stock[g] || 0)));
    buy.push({ g, qty: want, price: priceOf(n, site, g, true) });
  }
  return { sell, buy };
}

// Bauplan der sichtbaren Siedlung: Hauptstraßenkreuz, mit der Größe Querstraßen,
// Häuser in mehreren Typen, Betriebe nach Profil. blocked(x, y): Feld gehört dem Spieler.
// Liefert Gebäude (für Darstellung und Belegung), Wegfelder und die Handelsstation.
export function layoutNeighbor(world, store, site, size, blocked = () => false) {
  const W = world.size;
  const o = {};
  const ok = (x, y) => { if (!world.inBounds(x, y) || blocked(x, y)) return false; world.sample(x, y, o); return !isWater(o.terrain) && ![T.MOUNTAIN, T.ROCK, T.SWAMP].includes(o.terrain); };
  const roads = new Map();   // Feld -> Wegtyp
  const arm = 6 + Math.min(12, Math.floor(size / 70));
  const main = size >= 380 ? 4 : size >= 180 ? 3 : 2;     // mit der Größe bessere Straßen
  let east = { x: site.x, y: site.y };
  const line = (x0, y0, dx, dy, len, type) => {
    for (let i = 0; i <= len; i++) {
      const x = x0 + dx * i, y = y0 + dy * i;
      if (!ok(x, y)) break;
      const k = y * W + x;
      if ((roads.get(k) || 0) < type) roads.set(k, type);
    }
  };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    line(site.x, site.y, dx, dy, arm, main);
  }
  for (let i = 0; i <= arm; i++) { const x = site.x + i; if (roads.has(site.y * W + x)) east = { x, y: site.y }; else break; }
  // Querstraßen im Abstand von 6 Feldern, je größer, desto mehr
  const rings = Math.min(3, Math.floor(size / 200));
  for (let r = 1; r <= rings; r++) {
    const off = r * 6, len = Math.max(4, Math.min(arm - r * 3, 4 + Math.floor(size / 70)));
    for (const sgn of [1, -1]) {
      line(site.x, site.y + off * sgn, 1, 0, len, 2); line(site.x, site.y + off * sgn, -1, 0, len, 2);
      line(site.x + off * sgn, site.y, 0, 1, len, 2); line(site.x + off * sgn, site.y, 0, -1, len, 2);
    }
  }
  const taken = new Set(roads.keys());
  const blds = [];
  const p = PROFILES[site.profile];
  const nHouses = 4 + Math.floor(size / 12), nWork = 2 + Math.floor(size / 60);
  const wanted = [];
  wanted.push({ type: 'warehouse', w: 2, h: 2, station: true });
  for (let i = 0; i < nWork; i++) { const t = p.types[i % p.types.length]; wanted.push({ type: t, w: 2, h: 2 }); }
  if (size >= 150) wanted.push({ type: 'food_store', w: 1, h: 1 });
  if (size >= 260) wanted.push({ type: 'depot', w: 2, h: 2 });
  for (let i = 0; i < nHouses; i++) {
    const r = rand2(site.x + i, site.y, 640);
    let type = 'house_small';
    if (size >= 320 && i % 6 === 5) type = 'apartment';
    else if (size >= 200 && i % 5 === 3) type = 'row_house';
    else if (size >= 100 && r < 0.4) type = 'brick_house';
    else if (r < 0.7) type = 'wood_house';
    const big = type === 'apartment' || type === 'row_house';
    wanted.push({ type, w: big ? 2 : 1, h: big ? 2 : 1 });
  }
  // Bauplätze entlang der Straßen (beidseitig), vom Zentrum nach außen
  const slots = [];
  for (const k of roads.keys()) {
    const x = k % W, y = (k - x) / W, d = Math.abs(x - site.x) + Math.abs(y - site.y);
    for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 1], [1, 0], [0, -1], [-1, 0]]) slots.push({ x: x + ox, y: y + oy, d });
  }
  slots.sort((a, b) => a.d - b.d || a.x - b.x || a.y - b.y);
  const fits = (x, y, w, h) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = x + i, yy = y + j; if (taken.has(yy * W + xx) || !ok(xx, yy)) return false; }
    return true;
  };
  const put = (wd, x, y) => {
    for (let j = 0; j < wd.h; j++) for (let i = 0; i < wd.w; i++) taken.add((y + j) * W + x + i);
    blds.push({ id: `${site.id}_${blds.length}`, type: wd.type, x, y, npc: site.id, station: !!wd.station });
  };
  // Station zuerst ans östliche Straßenende
  let station = null;
  const st = wanted.shift();
  for (const [ox, oy] of [[1, 0], [1, -1], [0, 1], [0, -2], [-1, 1]]) {
    if (fits(east.x + ox, east.y + oy, 2, 2)) { put(st, east.x + ox, east.y + oy); station = { x: east.x, y: east.y }; break; }
  }
  for (const wd of wanted) {
    for (let si = 0; si < slots.length; si++) {
      const s2 = slots[si];
      if (fits(s2.x, s2.y, wd.w, wd.h)) { put(wd, s2.x, s2.y); slots.splice(si, 1); break; }
    }
  }
  // Laternen an der Hauptstraße, Bäume zwischen den Häusern
  if (size >= 90) {
    for (const k of roads.keys()) {
      const x = k % W, y = (k - x) / W;
      if ((x + y) % 4 !== 0 || roads.get(k) !== main || (x !== site.x && y !== site.y)) continue;
      const lx = x === site.x ? x + 1 : x, ly = x === site.x ? y : y + 1;
      if (fits(lx, ly, 1, 1)) put({ type: 'lamp', w: 1, h: 1 }, lx, ly);
    }
  }
  return { buildings: blds, roads, station: station || { x: site.x, y: site.y } };
}
