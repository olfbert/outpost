// Landwirtschaft: Felder und Weiden rund um Höfe, Jahreszeiten und Ernte.
// Felder und Weiden werden beim Setzen des Hofs automatisch auf freiem Land
// im Umkreis abgesteckt (nächste Felder zuerst). Sie sind Teil des Spielstands
// (b.fields); die Darstellung liest state.fieldTiles.

import { BUILDINGS } from '../config/buildings.js';
import { T, O, isWater, isDeposit, isTree } from '../config/terrain.js';

// Bodengüte je Gelände
export const SOIL = { [T.MEADOW]: 1.2, [T.GRASS]: 1.0, [T.FOREST]: 0.9, [T.CONIFER]: 0.85, [T.SAND]: 0.6, [T.GRAVEL]: 0.5 };

// Jahreslauf (Monatsindex 0 = Januar)
// Phasen der Felder: 0 gepflügt, 1 junge Saat, 2 grün, 3 reif, 4 Stoppeln, 5 Schnee
export function fieldPhase(mi) {
  if (mi === 11 || mi <= 1) return 5;
  if (mi <= 3) return 0;
  if (mi <= 5) return 1;
  if (mi === 6) return 2;
  if (mi <= 8) return 3;
  return 4;
}
export const PHASE_NAMES = ['Gepflügt', 'Junge Saat', 'Wächst', 'Reif – Ernte', 'Abgeerntet', 'Winterruhe'];
export const isWinter = (mi) => mi === 11 || mi <= 1;
export const monthIndex = (gm) => Math.floor(gm) % 12;
export const GROW_MONTHS = [2, 3, 4, 5, 6];     // März bis Juli
export const HARVEST_MONTHS = [7, 8];           // August, September

// Laufzeit-Karte aller Feld- und Weidefelder: Schlüssel -> { b, kind }
export function rebuildFieldTiles(state) {
  const m = new Map();
  for (const b of state.buildings) {
    if (!b.fields) continue;
    const kind = BUILDINGS[b.type]?.farm?.kind;
    for (const k of b.fields) m.set(k, { b, kind });
  }
  state.fieldTiles = m;
  return m;
}

// Freie Felder um einen Hof suchen (ohne abzustecken) – auch für die Vorschau beim Bauen
export function findFieldTiles(world, store, state, placement, b) {
  const def = BUILDINGS[b.type], f = def.farm;
  const W = world.size, w = def.footprint.width, h = def.footprint.height;
  const cx = b.x + w / 2, cy = b.y + h / 2;
  const taken = state.fieldTiles || rebuildFieldTiles(state);
  const cand = [];
  for (let j = -f.radius; j < h + f.radius; j++) for (let i = -f.radius; i < w + f.radius; i++) {
    const x = b.x + i, y = b.y + j;
    if (i >= 0 && i < w && j >= 0 && j < h) continue;
    if (!world.inBounds(x, y)) continue;
    const k = y * W + x;
    if (taken.has(k) || state.roads.has(k) || placement.buildingAt(x, y)) continue;
    const t = store.tile(x, y);
    if (isWater(t.terrain) || SOIL[t.terrain] === undefined) continue;
    if (isDeposit(t.obj) || t.obj === O.ROCK || t.obj === O.BOULDER || t.obj === O.PEAK) continue;
    cand.push({ x, y, k, d: Math.hypot(x + 0.5 - cx, y + 0.5 - cy), soil: SOIL[t.terrain], tree: isTree(t.obj) || t.obj === O.STUMP || t.obj === O.SAPLING || t.obj === O.SAPLING_C });
  }
  cand.sort((a, c) => a.d - c.d || a.k - c.k);
  return cand.slice(0, f.max);
}

// Freie Felder um einen Hof suchen und abstecken
export function claimFields(world, store, state, placement, b) {
  const f = BUILDINGS[b.type].farm;
  const taken = state.fieldTiles || rebuildFieldTiles(state);
  const pick = findFieldTiles(world, store, state, placement, b);
  b.fields = pick.map((c) => c.k);
  b.soil = pick.reduce((s, c) => s + c.soil, 0);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of pick) {
    taken.set(c.k, { b, kind: f.kind });
    if (c.tree || store.tile(c.x, c.y).obj) state.cleared.add(c.k);     // Bewuchs weicht dem Acker
    state.felled.delete(c.k);
    x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y);
  }
  if (pick.length) store.invalidateArea(x0, y0, x1, y1);
  if (f.kind === 'field' && !b.crop) b.crop = 'potatoes';
  b.growth = b.growth || 0;
  return pick.length ? { x0, y0, x1, y1 } : null;
}

// Erwarteter Jahresertrag eines Ackerhofs bei voller Belegschaft
export function yearlyYield(b) {
  const f = BUILDINGS[b.type].farm;
  return Math.round((b.soil || 0) * (f.crops[b.crop] || 0));
}

// Umriss aller Felder eines Hofs (für das Auffrischen der Darstellung)
export function fieldBox(b, W) {
  if (!b.fields || !b.fields.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k of b.fields) { const x = k % W, y = (k - x) / W; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}
