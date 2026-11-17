// Logistik (Stufe B): Lkw bringen Waren dorthin, wo sie gebraucht werden.
//
// Gerechnet wird als Fluss: Die Lkw haben zusammen ein Zeitbudget (Lkw-Monate je
// Schritt). Jede Fuhre kostet Zeit nach Strecke und Wegtyp. Reicht das Budget
// nicht, bleiben Waren liegen – Betriebe warten dann auf Abholung oder Lieferung.
//
// Reihenfolge je Schritt:
//   1. Bedarf decken (Baustellen, Versorgungspunkte, Betriebe): aus Ausgangspuffern
//      anderer Betriebe oder aus Lagern, nächste Quelle zuerst (max. 70 % des Budgets)
//   2. Ausgangspuffer der Betriebe ins nächste Lager mit Platz räumen
//   3. Restbudget: noch offenen Bedarf decken
// Die gefahrenen Strecken werden für die sichtbaren Lkw mitgeschrieben.

import { BUILDINGS } from '../config/buildings.js';
import { FOOD_IDS, FOOD_VARIETY, POP } from '../config/economy.js';
import { Network } from './network.js';
import { stores, storeRoom, inTarget } from './inventory.js';

export const TRUCK = {
  capacity: 16,        // Einheiten je Fuhre
  speed: 2200,         // Erdweg-Felder je Monat (Schotter und Straße entsprechend schneller)
  load: 0.004,         // Laden und Entladen je Fuhre, in Monaten
  price: 5000,         // Kaufpreis eines Lkw bei der Spedition
  upkeep: 80,          // Unterhalt je gekauftem Lkw und Monat
  perDepot: 8,         // Stellplätze je Spedition
};

export const unitCost = (d) => (2 * d / TRUCK.speed + TRUCK.load) / TRUCK.capacity;

export function truckCount(state) {
  let n = 0;
  for (const b of state.buildings) {
    if (b.site) continue;
    n += BUILDINGS[b.type]?.provides?.trucks || 0;
    n += b.trucks || 0;
  }
  return n;
}

export function truckUpkeep(state) {
  let n = 0;
  for (const b of state.buildings) if (!b.site) n += b.trucks || 0;
  return n * TRUCK.upkeep;
}

// Versorgungspunkt: Landemodul isst aus dem eigenen Lager, der Laden aus seinem Puffer
export function foodSource(b) {
  if (BUILDINGS[b.type].provides?.storage) { b.inv = b.inv || {}; return b.inv; }
  b.inBuf = b.inBuf || {};
  return b.inBuf;
}

export class Logistics {
  constructor(world, state) {
    this.world = world;
    this.state = state;
    this.net = new Network(world, state);
    this.routes = new Map();      // "von>nach" -> { from, to, good, w } (für die sichtbaren Lkw)
    this.stats = { trucks: 0, used: 0, budget: 0, moved: 0, waitingPickup: 0, waitingSupply: 0 };
    this._month = { used: 0, budget: 0, moved: 0 };
  }

  _record(from, to, g, amount) {
    const k = from.id + '>' + to.id;
    const r = this.routes.get(k);
    if (r) { r.w += amount; r.good = amount > r.last ? g : r.good; r.last = amount; }
    else this.routes.set(k, { from: from.id, to: to.id, good: g, w: amount, last: amount });
  }

  // Bedarfsliste: { b, g, need, buf, prio }
  _needs() {
    const st = this.state, out = [];
    const storeList = stores(st);
    for (const b of st.buildings) {
      const def = BUILDINGS[b.type];
      if (b.site) {
        if (b.site.status === 'queued' && b.site.progress <= 0) continue;
        b.site.have = b.site.have || {};
        for (const [g, v] of Object.entries(b.site.need)) {
          const need = v - (b.site.used[g] || 0) - (b.site.have[g] || 0);
          if (need > 1e-6) out.push({ b, g, need, buf: b.site.have, prio: 0 });
        }
        continue;
      }
      if (b.paused) continue;
      if (def.provides?.supplyRadius) {
        // Nahrung für den Versorgungspunkt: 1,5 Monate des Bedarfs seiner Häuser
        const buf = foodSource(b), demand = Math.max(8, b._demand || 0) * 1.5;
        const real = FOOD_VARIETY.filter((g) => storeList.some((s) => s !== b && (s.inv?.[g] || 0) > 1) || st.buildings.some((q) => (q.outBuf?.[g] || 0) > 1));
        const types = real.length ? real : ['rations'];
        for (const g of types) {
          const need = demand / types.length - (buf[g] || 0);
          if (need > 1e-6) out.push({ b, g, need, buf, prio: 1, self: def.provides.storage ? b : null });
        }
      }
      const inp = def.production?.inputs;
      if (inp) {
        b.inBuf = b.inBuf || {};
        for (const g of Object.keys(inp)) {
          const need = inTarget(def, g) - (b.inBuf[g] || 0);
          if (need > 1e-6) out.push({ b, g, need, buf: b.inBuf, prio: 2, ratio: (b.inBuf[g] || 0) / inTarget(def, g) });
        }
      }
    }
    out.sort((a, c) => a.prio - c.prio || (a.ratio || 0) - (c.ratio || 0));
    return out;
  }

  // Quellen für eine Ware: Ausgangspuffer von Betrieben und Lagerbestände
  _sources(g, exclude) {
    const src = [];
    for (const b of this.state.buildings) {
      if (b === exclude || b.site) continue;
      const o = b.outBuf?.[g];
      if (o > 1e-6) src.push({ b, buf: b.outBuf });
      const s = b.inv?.[g];
      if (s > 1e-6 && BUILDINGS[b.type].provides && (BUILDINGS[b.type].provides.storage || BUILDINGS[b.type].provides.bulkStorage)) src.push({ b, buf: b.inv });
    }
    return src;
  }

  _fill(needs, limit) {
    for (const n of needs) {
      if (this.used >= limit) return;
      if (n.need <= 1e-6) continue;
      const src = this._sources(n.g, n.self || n.b);
      if (!src.length) continue;
      for (const s of src) s.d = this.net.dist(s.b, n.b);
      src.sort((a, c) => a.d - c.d);
      for (const s of src) {
        if (n.need <= 1e-6 || this.used >= limit) break;
        const have = s.buf[n.g] || 0;
        const uc = unitCost(s.d);
        const amount = Math.min(n.need, have, (limit - this.used) / uc);
        if (amount <= 1e-6) continue;
        s.buf[n.g] = have - amount;
        n.buf[n.g] = (n.buf[n.g] || 0) + amount;
        n.need -= amount;
        this.used += amount * uc;
        this.moved += amount;
        this._record(s.b, n.b, n.g, amount);
      }
    }
  }

  _clear(limit) {
    const st = this.state;
    const list = stores(st);
    const prod = st.buildings.filter((b) => !b.site && b.outBuf && Object.values(b.outBuf).some((v) => v > 1e-6));
    // vollste Puffer zuerst
    prod.sort((a, c) => Object.values(c.outBuf).reduce((x, v) => x + v, 0) - Object.values(a.outBuf).reduce((x, v) => x + v, 0));
    for (const b of prod) {
      for (const [g, v0] of Object.entries(b.outBuf)) {
        if (v0 <= 1e-6 || this.used >= limit) continue;
        const dst = list.filter((s) => storeRoom(s, g) > 1e-6).map((s) => ({ s, d: this.net.dist(b, s) })).sort((a, c) => a.d - c.d);
        let v = v0;
        for (const { s, d } of dst) {
          if (v <= 1e-6 || this.used >= limit) break;
          const uc = unitCost(d);
          const amount = Math.min(v, storeRoom(s, g), (limit - this.used) / uc);
          if (amount <= 1e-6) continue;
          s.inv = s.inv || {};
          s.inv[g] = (s.inv[g] || 0) + amount;
          v -= amount;
          this.used += amount * uc;
          this.moved += amount;
          this._record(b, s, g, amount);
        }
        b.outBuf[g] = v;
      }
    }
  }

  step(step, res) {
    const st = this.state;
    const trucks = truckCount(st);
    const budget = trucks * step;
    this.used = 0; this.moved = 0;
    if (budget > 0) {
      const needs = this._needs();
      this._fill(needs, budget * 0.7);
      this._clear(budget);
      this._fill(needs, budget);
    }
    // Statistik (gleitend über den Monat)
    this._month.used += this.used; this._month.budget += budget; this._month.moved += this.moved;
    let wp = 0, ws = 0;
    for (const b of st.buildings) {
      if (typeof b.status !== 'string') continue;
      if (b.status.startsWith('full:')) wp++;
      else if (b.status.startsWith('input:')) ws++;
    }
    for (const b of st.buildings) if (b.site && b.site.status.startsWith('material:')) ws++;
    const m = this._month;
    this.stats = { trucks, used: this.used, budget, util: m.budget ? m.used / m.budget : 0, movedPerMonth: m.budget ? m.moved / (m.budget / Math.max(1, trucks)) : 0, waitingPickup: wp, waitingSupply: ws };
    if (m.budget > Math.max(1, trucks) * 1) { m.used *= 0.5; m.budget *= 0.5; m.moved *= 0.5; }
    // Strecken langsam vergessen
    if (Math.random() < 0.05) for (const [k, r] of this.routes) { r.w *= 0.7; if (r.w < 0.5) this.routes.delete(k); }
  }

  // Eine Strecke für einen sichtbaren Lkw auswählen (gewichtet nach Menge)
  pickRoute(rand) {
    let total = 0;
    for (const r of this.routes.values()) total += r.w;
    if (total <= 0) return null;
    let x = rand * total;
    for (const r of this.routes.values()) { x -= r.w; if (x <= 0) return r; }
    return null;
  }
}

export { POP, FOOD_IDS };
