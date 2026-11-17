// Lagerbestände (Stufe B): Waren liegen in Lagergebäuden (Landemodul, Lagerhallen,
// Silos) und in den Puffern der Betriebe. state.stock ist nur noch die Summe aller
// Lager – für Anzeige, Markt und Prüfungen. Geschrieben wird immer in b.inv.

import { BUILDINGS } from '../config/buildings.js';
import { GOODS } from '../config/economy.js';

export const isStore = (b) => !b.site && !!BUILDINGS[b.type]?.provides && (BUILDINGS[b.type].provides.storage || BUILDINGS[b.type].provides.bulkStorage);

export function stores(state) { return state.buildings.filter(isStore); }

// Platz je Ware in einem Lager
export function storeCap(b, g) {
  const p = BUILDINGS[b.type].provides || {};
  let c = p.storage || 0;
  if (GOODS[g]?.bulk) c += p.bulkStorage || 0;
  return c;
}

export function storeRoom(b, g) { return Math.max(0, storeCap(b, g) - ((b.inv && b.inv[g]) || 0)); }

// Gesamter Lagerplatz je Ware (für die Anzeige)
export function totalCap(state, g) {
  let c = 0;
  for (const b of stores(state)) c += storeCap(b, g);
  return c;
}

// state.stock aus den Lagern neu summieren
export function recomputeStock(state) {
  const s = {};
  for (const [g, v] of Object.entries(state.unstored || {})) if (v > 1e-9) s[g] = v;
  for (const b of state.buildings) {
    if (!b.inv || b.site) continue;
    for (const [g, v] of Object.entries(b.inv)) if (v > 1e-9) s[g] = (s[g] || 0) + v;
  }
  state.stock = s;
  return s;
}

// Waren einlagern: bevorzugt das angegebene Lager, dann das Landemodul, dann die übrigen.
// Passt etwas nirgends hin, landet es trotzdem im ersten Lager (nichts geht verloren).
export function addGoods(state, goods, prefer) {
  const list = stores(state);
  if (!list.length) {
    state.unstored = state.unstored || {};
    for (const [g, v] of Object.entries(goods)) if (g !== 'money' && v > 0) state.unstored[g] = (state.unstored[g] || 0) + v;
    recomputeStock(state);
    return;
  }
  list.sort((a, b) => (b === prefer) - (a === prefer) || (b.type === 'landing_module') - (a.type === 'landing_module'));
  for (const [g, v0] of Object.entries(goods)) {
    if (g === 'money' || !(v0 > 0)) continue;
    let v = v0;
    for (const b of list) {
      if (v <= 1e-9) break;
      const put = Math.min(v, storeRoom(b, g));
      if (put > 0) { b.inv = b.inv || {}; b.inv[g] = (b.inv[g] || 0) + put; v -= put; }
    }
    if (v > 1e-9) { const b = list[0]; b.inv = b.inv || {}; b.inv[g] = (b.inv[g] || 0) + v; }
  }
  recomputeStock(state);
}

// Waren entnehmen (aus den vollsten Lagern zuerst). Gibt die tatsächlich entnommene Menge je Ware zurück.
export function takeGoods(state, goods) {
  const list = stores(state);
  const got = {};
  const un = state.unstored || {};
  for (const [g, v0] of Object.entries(goods)) {
    if (g === 'money' || !(v0 > 0)) continue;
    let v = v0;
    if (un[g] > 0) { const t = Math.min(v, un[g]); un[g] -= t; v -= t; got[g] = t; }
    list.sort((a, b) => ((b.inv && b.inv[g]) || 0) - ((a.inv && a.inv[g]) || 0));
    for (const b of list) {
      if (v <= 1e-9) break;
      const have = (b.inv && b.inv[g]) || 0;
      const t = Math.min(v, have);
      if (t > 0) { b.inv[g] = have - t; v -= t; got[g] = (got[g] || 0) + t; }
    }
  }
  recomputeStock(state);
  return got;
}

// Puffergrößen eines Betriebs: Eingang ca. 1,5 Monate, Ausgang 2 Monate (mindestens 40)
export function inTarget(def, g) { return Math.max(20, (def.production?.inputs?.[g] || 0) * 1.5); }
export function outCap(b, def, g) {
  if (def.farm && def.farm.kind === 'field') return Math.max(200, b.harvestTotal || 0);
  return Math.max(40, (def.production?.outputs?.[g] || 0) * 2);
}

// Fracht ohne Lager (Start) ins erste Lager räumen
export function storeUnstored(state) {
  const un = state.unstored;
  if (!un || !Object.values(un).some((v) => v > 0) || !stores(state).length) return;
  state.unstored = {};
  addGoods(state, un);
}

export const sum = (o) => Object.values(o || {}).reduce((a, v) => a + v, 0);
