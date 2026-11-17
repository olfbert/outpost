// Produktion und Monatsabrechnung. Reine Datenlogik: kennt weder Rendering
// noch Oberfläche. Änderungen an der Welt (gefällte Bäume) meldet sie über
// den Rückgabewert, damit main.js die Darstellung auffrischen kann.

import { BUILDINGS } from '../config/buildings.js';
import { GOOD_IDS } from '../config/economy.js';
import { isTree, isDeposit, isWater } from '../config/terrain.js';
import { advanceSites } from './construction.js';
import { updatePopulation, workFactor } from './population.js';
import { recomputeStock, takeGoods, outCap } from './inventory.js';
import { Logistics, truckUpkeep } from './logistics.js';
import { claimFields, rebuildFieldTiles, monthIndex, fieldPhase, isWinter, yearlyYield, GROW_MONTHS, HARVEST_MONTHS } from './farming.js';

const STEP = 0.02;          // größter Simulationsschritt in Monaten (ca. 29 echte Minuten)

// Reihenfolge: erst Rohstoffe, dann Weiterverarbeitung (Tiefe der Kette)
function tier(def) {
  if (!def.production) return 9;
  return Object.keys(def.production.inputs).length ? 1 + Object.keys(def.production.inputs).length : 0;
}

export class Production {
  constructor(world, store, state, placement, cfg) {
    this.world = world; this.store = store; this.state = state; this.placement = placement;
    this.cfg = cfg || { regrowSaplingMonths: 6, regrowTreeMonths: 18 };
    rebuildFieldTiles(state);
    this.logistics = new Logistics(world, state);
    recomputeStock(state);
    updatePopulation(state, 0, {});
  }

  rebuildFields() { rebuildFieldTiles(this.state); }

  key(x, y) { return y * this.world.size + x; }

  // Lagerkapazität je Ware (Summe aller Lager)
  capacity() {
    let cap = 0;
    for (const b of this.state.buildings) if (!b.site) cap += BUILDINGS[b.type]?.provides?.storage || 0;
    return cap;
  }

  // --- Vorkommen und Wald ----------------------------------------------------------
  // Felder des passenden Vorkommens unter und rund um die Grundfläche (2 Felder Rand),
  // die noch kein anderes Abbaugebäude beansprucht.
  depositTiles(type, x, y, w, h, ignoreId = null) {
    const claimed = new Set();
    for (const b of this.state.buildings) {
      if (b.id === ignoreId || !b.claim) continue;
      for (const k of b.claim) claimed.add(k);
    }
    const out = [];
    for (let j = -2; j < h + 2; j++) for (let i = -2; i < w + 2; i++) {
      const tx = x + i, ty = y + j;
      if (!this.world.inBounds(tx, ty)) continue;
      const k = this.key(tx, ty);
      if (claimed.has(k)) continue;
      const t = this.store.tile(tx, ty);
      // unter der Grundfläche ist das Objekt evtl. schon geräumt – dann direkt beim Generator fragen
      const obj = t.obj || (this.state.cleared.has(k) ? this.world.objectAt(tx, ty, t.terrain, 0) : 0);
      if (obj === type) out.push({ x: tx, y: ty, k });
    }
    return out;
  }

  reserveOf(tiles) {
    let r = 0;
    for (const t of tiles) r += this.world.depositAmount(t.x, t.y);
    return r;
  }

  treesAround(cx, cy, r) {
    const out = [];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = i * i + j * j;
      if (d > r * r || !this.world.inBounds(cx + i, cy + j)) continue;
      if (isTree(this.store.tile(cx + i, cy + j).obj)) out.push({ x: cx + i, y: cy + j, d });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  // Beim Bauen: Daten für Abbau/Holzernte festhalten
  initBuilding(b) {
    const def = BUILDINGS[b.type];
    b.stats = { month: -1, out: 0, in: 0 };
    b.status = 'idle';
    if (def.requirements.deposit) {
      const tiles = this.depositTiles(def.requirements.deposit, b.x, b.y, def.footprint.width, def.footprint.height, b.id);
      b.claim = tiles.map((t) => t.k);
      b.reserve = this.reserveOf(tiles);
      b.extracted = 0;
    }
    if (def.requirements.nearTrees) {
      b.fell = 0;
      const list = this.treesAround(b.x, b.y, def.requirements.nearTrees.radius);
      b.treesLeft = list.length;
      b.target = list.length ? { x: list[0].x, y: list[0].y } : null;   // der nächste Baum (sichtbar bearbeitet)
    }
    if (def.farm && !b.fields) return claimFields(this.world, this.store, this.state, this.placement, b);
    return null;
  }

  // Wasser im Umkreis (Fischerhütte)
  waterNear(x, y, w, h, r) {
    for (let j = -r; j < h + r; j++) for (let i = -r; i < w + r; i++) {
      if (!this.world.inBounds(x + i, y + j)) continue;
      if (isWater(this.store.tile(x + i, y + j).terrain)) return true;
    }
    return false;
  }

  // Einen Baum nahe dem Lager fällen. Liefert das Feld oder null.
  _fellTree(b, def) {
    const list = this.treesAround(b.x, b.y, def.requirements.nearTrees.radius);
    if (!list.length) { b.treesLeft = 0; b.target = null; return null; }
    // bevorzugt den Baum, an dem die Arbeiter schon stehen
    let t = list[0];
    if (b.target) { const m = list.find((q) => q.x === b.target.x && q.y === b.target.y); if (m) t = m; }
    this.state.felled.set(this.key(t.x, t.y), this.state.gameMonths);
    this.store.invalidateTile(t.x, t.y);
    const rest = list.filter((q) => q !== t);
    b.treesLeft = rest.length;
    b.target = rest.length ? { x: rest[0].x, y: rest[0].y } : null;
    return t;
  }

  // Nachwachsen: Stumpf -> junger Baum -> Baum. Liefert geänderte Felder.
  _regrow(res) {
    const st = this.state, W = this.world.size, now = st.gameMonths;
    for (const [k, at] of st.felled) {
      const age = now - at;
      const x = k % W, y = (k - x) / W;
      if (age >= this.cfg.regrowTreeMonths) { st.felled.delete(k); this.store.invalidateTile(x, y); res.felled.push({ x, y }); }
      else if (age >= this.cfg.regrowSaplingMonths && age < this.cfg.regrowSaplingMonths + 1) { this.store.invalidateTile(x, y); res.felled.push({ x, y }); }
    }
    // Holzfäller, denen der Wald ausgegangen war, finden nachgewachsene Bäume
    for (const b of st.buildings) {
      const def = BUILDINGS[b.type];
      if (!def.requirements?.nearTrees) continue;
      const list = this.treesAround(b.x, b.y, def.requirements.nearTrees.radius);
      b.treesLeft = list.length;
      if (!b.target && list.length) b.target = { x: list[0].x, y: list[0].y };
    }
  }

  // --- Simulation ------------------------------------------------------------------------
  // Rechnet dt Monate nach. Liefert { felled: [Felder], months: [abgerechnete Monate] }.
  advance(dtMonths) {
    const st = this.state, res = { felled: [], months: [], completed: [], popChanged: false, season: false, winterChanged: false };
    if (!(dtMonths > 0)) return res;
    const sortOrder = () => st.buildings.filter((b) => BUILDINGS[b.type]?.production || BUILDINGS[b.type]?.farm)
      .sort((a, b) => tier(BUILDINGS[a.type]) - tier(BUILDINGS[b.type]));
    let order = sortOrder();
    let cap = this.capacity();
    let left = dtMonths;
    while (left > 1e-9) {
      const nextMonth = Math.floor(st.gameMonths) + 1;
      const step = Math.min(left, STEP, nextMonth - st.gameMonths);
      const done = res.completed.length;
      advanceSites(st, step, res);
      if (res.completed.length > done) { order = sortOrder(); cap = this.capacity(); res.popChanged = true; }
      updatePopulation(st, step, res);
      for (const b of order) this._produce(b, step, cap, res);
      this.logistics.step(step, res);
      recomputeStock(st);
      st.gameMonths += step;
      left -= step;
      if (st.gameMonths >= nextMonth - 1e-9) {
        st.gameMonths = nextMonth;
        res.months.push(this._closeMonth(nextMonth - 1));
        if (this.onMonth) this.onMonth(1, res);
        this._regrow(res);
        const a = monthIndex(nextMonth - 1), b2 = monthIndex(nextMonth);
        if (fieldPhase(a) !== fieldPhase(b2)) res.season = true;
        if (isWinter(a) !== isWinter(b2)) res.winterChanged = true;
      }
    }
    st.lastSimAt = Date.now();
    return res;
  }

  _produce(b, step, cap, res) {
    const def = BUILDINGS[b.type], p = def.production;
    b.inBuf = b.inBuf || {}; b.outBuf = b.outBuf || {};
    const inB = b.inBuf, outB = b.outBuf;
    const m = Math.floor(this.state.gameMonths);
    if (!b.stats || b.stats.month !== m) {
      const prev = b.stats && b.stats.month === m - 1 ? { out: b.stats.out, in: b.stats.in } : null;
      b.stats = { month: m, out: 0, in: 0, last: prev };
    }
    if (b.site) { b.status = 'site'; return; }
    if (b.paused) { b.status = 'paused'; return; }
    if (def.farm && def.farm.kind === 'field') return this._farm(b, def, step, cap);
    let f = workFactor(this.state, b);   // Anteil der vollen Leistung in diesem Schritt
    let reason = f < 0.999 ? ((b.staff ?? 1) < (def.workers || 0) ? 'staff' : 'hungry') : '';
    if (def.farm && def.farm.kind === 'pasture') {
      const share = (b.fields?.length || 0) / def.farm.max;
      if (share < f) { f = share; reason = share ? 'pasture' : 'nopasture'; }
    }
    if (def.requirements.nearWater && b.water === undefined) b.water = this.waterNear(b.x, b.y, def.footprint.width, def.footprint.height, def.requirements.nearWater);
    if (def.requirements.nearWater && !b.water) { f = 0; reason = 'nowater'; }
    if (f <= 1e-6) { b.status = reason || 'staff'; return; }
    const workF = f;
    for (const [g, v] of Object.entries(p.inputs)) {
      const can = (inB[g] || 0) / (v * step);
      if (can < f) { f = can; reason = 'input:' + g; }
    }
    for (const [g, v] of Object.entries(p.outputs)) {
      const can = Math.max(0, outCap(b, def, g) - (outB[g] || 0)) / (v * step);
      if (can < f) { f = can; reason = 'full:' + g; }
    }
    if (def.requirements.deposit) {
      const out = Object.values(p.outputs)[0];
      const can = Math.max(0, b.reserve - b.extracted) / (out * step);
      if (can < f) { f = can; reason = 'exhausted'; }
    }
    if (def.requirements.nearTrees && b.treesLeft <= 0) { f = 0; reason = 'notrees'; }
    if (f <= 1e-6) { b.status = reason || 'idle'; return; }
    for (const [g, v] of Object.entries(p.inputs)) { inB[g] = Math.max(0, (inB[g] || 0) - v * step * f); b.stats.in += v * step * f; }
    for (const [g, v] of Object.entries(p.outputs)) { outB[g] = (outB[g] || 0) + v * step * f; b.stats.out += v * step * f; }
    if (def.requirements.deposit) b.extracted += Object.values(p.outputs)[0] * step * f;
    if (def.requirements.nearTrees) {
      b.fell = (b.fell || 0) + Object.values(p.outputs)[0] * step * f;
      while (b.fell >= def.logsPerTree) {
        b.fell -= def.logsPerTree;
        const t = this._fellTree(b, def);
        if (t) res.felled.push(t); else { b.treesLeft = 0; break; }
      }
    }
    b.status = f >= 0.999 ? 'running' : (f >= workF - 1e-6 && workF < 0.999 ? (reason || 'staff') : reason);
  }

  // Ackerhof: Wachstum März bis Juli, Ernte August/September in die gewählte Sorte
  _farm(b, def, step, cap) {
    const st = this.state;
    b.outBuf = b.outBuf || {};
    const gm = st.gameMonths, mi = monthIndex(gm), year = Math.floor(gm / 12);
    const work = workFactor(st, b);
    if (!b.fields || !b.fields.length) { b.status = 'nofields'; return; }
    if (GROW_MONTHS.includes(mi)) {
      b.growth = Math.min(1, (b.growth || 0) + (step / GROW_MONTHS.length) * work);
      b.status = work < 0.999 ? 'staff' : 'growing';
      b.harvestTotal = 0;
      return;
    }
    if (HARVEST_MONTHS.includes(mi)) {
      if (b.harvestYear !== year) {
        b.harvestYear = year;
        b.harvestTotal = yearlyYield(b) * Math.min(1, b.growth || 0);
        b.harvestCrop = b.crop;
        b.harvested = 0;
        b.growth = 0;
      }
      const g = b.harvestCrop || b.crop;
      let amount = (b.harvestTotal / HARVEST_MONTHS.length) * step;
      const room = Math.max(0, outCap(b, def, g) - (b.outBuf[g] || 0));
      const lost = Math.max(0, amount - room);
      amount = Math.min(amount, room);
      b.outBuf[g] = (b.outBuf[g] || 0) + amount;
      b.harvested = (b.harvested || 0) + amount;
      b.stats.out += amount;
      b.status = lost > 1e-6 ? 'full:' + g : b.harvestTotal > 0 ? 'harvest' : 'noharvest';
      return;
    }
    b.status = isWinter(mi) ? 'winter' : 'fallow';
  }

  // Monatsende: Betriebskosten abrechnen, Bilanz festhalten
  _closeMonth(month) {
    const st = this.state;
    let upkeep = 0;
    for (const b of st.buildings) if (!b.paused && !b.site) upkeep += BUILDINGS[b.type]?.upkeep || 0;
    upkeep += truckUpkeep(st);
    const led = ledgerFor(st, month);         // Kosten gehören in den abgeschlossenen Monat
    if (upkeep) {
      st.money -= upkeep;
      led.upkeep += upkeep;
      st.history.push({ t: Date.now(), gm: month + 1, text: `Betriebskosten ${upkeep} Cr`, money: -upkeep });
      if (st.history.length > 50) st.history.shift();
    }
    const tax = Math.floor(st.taxAcc || 0);
    if (tax > 0) {
      st.money += tax;
      led.income += tax;
      led.tax = (led.tax || 0) + tax;
      st.taxAcc -= tax;
      st.history.push({ t: Date.now(), gm: month + 1, text: `Steuern ${tax} Cr`, money: tax });
      if (st.history.length > 50) st.history.shift();
    }
    led.closed = true;
    return month;
  }

  // Leistung je Monat bei vollem Betrieb (für Anzeigen)
  static rateText(def) {
    return def.production;
  }
}

// Bilanz eines Monats (wird bei Bedarf angelegt)
export function ledgerFor(state, month) {
  let led = state.ledger.find((l) => l.month === month);
  if (!led) {
    led = { month, income: 0, build: 0, upkeep: 0, closed: false };
    state.ledger.push(led);
    state.ledger.sort((a, b) => a.month - b.month);
    while (state.ledger.length > 24) state.ledger.shift();
  }
  return led;
}

// Verkauf einer Ware zum festen Preis
export function sell(state, good, amount, price, label) {
  amount = Math.floor(Math.min(amount, state.stock[good] || 0));
  if (amount <= 0) return 0;
  takeGoods(state, { [good]: amount });
  const money = amount * price;
  state.money += money;
  ledgerFor(state, Math.floor(state.gameMonths)).income += money;
  state.history.push({ t: Date.now(), gm: state.gameMonths, text: `${amount} ${label} verkauft`, money });
  if (state.history.length > 50) state.history.shift();
  return money;
}

export { GOOD_IDS, isDeposit };
