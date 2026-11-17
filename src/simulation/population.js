// Bevölkerung: Belegung der Häuser, Nahrungsverbrauch, Versorgungsstufe,
// Arbeitskraft und Steuern. Bewohner ziehen nie weg – hungrige arbeiten nur
// langsamer und zahlen keine Steuern.
//
// Versorgungsstufe je Haus: 0 hungrig, 1 satt, 2 zufrieden (2 Sorten),
// 3 gut versorgt (3+ Sorten). Notrationen machen satt, zählen aber nicht als Sorte.

import { BUILDINGS } from '../config/buildings.js';
import { FOOD_IDS, FOOD_VARIETY, POP } from '../config/economy.js';
import { foodSource } from './logistics.js';

const center = (b) => {
  const d = BUILDINGS[b.type].footprint;
  return { x: b.x + d.width / 2, y: b.y + d.height / 2 };
};

export function suppliers(state) {
  const out = [];
  for (const b of state.buildings) {
    const r = BUILDINGS[b.type]?.provides?.supplyRadius;
    if (!r || b.site || b.paused) continue;
    const c = center(b);
    out.push({ x: c.x, y: c.y, r, id: b.id, b });
  }
  return out;
}

// nächster Versorgungspunkt in Reichweite (oder null)
export function supplierOf(b, sup) {
  const c = center(b);
  let best = null, bd = Infinity;
  for (const s of sup) { const d = Math.hypot(c.x - s.x, c.y - s.y); if (d <= s.r && d < bd) { bd = d; best = s; } }
  return best;
}
export function isSupplied(b, sup) { return !!supplierOf(b, sup); }

// Höchstbelegung unter den aktuellen Bedingungen
export function popLimit(b, variety) {
  const def = BUILDINGS[b.type];
  const cap = def.residents || 0;
  const nv = def.needsVariety;
  if (nv && variety < nv.min) return Math.min(cap, nv.below);
  return cap;
}

// Ein Schritt (step Monate). step = 0 berechnet nur die Kennzahlen neu.
export function updatePopulation(state, step, res) {
  const sup = suppliers(state);
  const houses = state.buildings.filter((b) => !b.site && BUILDINGS[b.type]?.residents);
  for (const s of sup) { s.eaters = 0; s.b._demand = 0; }
  for (const h of houses) {
    if (h.pop === undefined) h.pop = BUILDINGS[h.type].fullOnBuild ? BUILDINGS[h.type].residents : Math.min(POP.startPop, BUILDINGS[h.type].residents);
    const s = supplierOf(h, sup);
    h._sup = !!s;
    h._supId = s ? s.id : null;
    if (s) s.eaters += h.pop;
  }
  // Essen je Versorgungspunkt: erst gleichmäßig aus allen echten Sorten, dann Notrationen
  let demandAll = 0, eatenAll = 0, varietyMax = 0;
  for (const s of sup) {
    const buf = foodSource(s.b);
    s.b._demand = s.eaters * POP.eatPerMonth;
    const demand = s.eaters * POP.eatPerMonth * step;
    let eaten = 0;
    const avail = FOOD_VARIETY.filter((g) => (buf[g] || 0) > 1e-6);
    s.variety = avail.length;
    if (demand > 0) {
      let left = demand, open = avail.slice();
      while (left > 1e-9 && open.length) {
        const share = left / open.length;
        const next = [];
        for (const g of open) {
          const take = Math.min(share, buf[g]);
          buf[g] -= take; left -= take; eaten += take;
          if (buf[g] > 1e-6) next.push(g);
        }
        if (next.length === open.length) break;
        open = next;
      }
      if (left > 1e-9 && (buf.rations || 0) > 0) {
        const take = Math.min(left, buf.rations);
        buf.rations -= take; left -= take; eaten += take;
      }
    }
    const anyFood = FOOD_IDS.some((g) => (buf[g] || 0) > 1e-6);
    s.fed = demand > 0 ? eaten / demand : (anyFood ? 1 : 0);
    demandAll += demand; eatenAll += eaten;
    if (s.eaters > 0) varietyMax = Math.max(varietyMax, s.variety);
  }
  const fed = demandAll > 0 ? eatenAll / demandAll : 1;
  const variety = varietyMax;
  const supById = new Map(sup.map((s) => [s.id, s]));
  let eaters = 0;
  for (const s of sup) eaters += s.eaters;

  // Häuser: Stufe, Zuzug
  let residents = 0, fedPeople = 0, taxBase = 0, hungry = 0, unsupplied = 0;
  for (const h of houses) {
    const s = h._supId ? supById.get(h._supId) : null;
    const hf = s ? s.fed : 0, hv = s ? s.variety : 0;
    const lvl = !s ? 0 : hf < 0.5 ? 0 : hv >= 3 ? 3 : hv >= 2 ? 2 : 1;
    h.level = lvl;
    h.fed = hf;
    h.variety = hv;
    if (!s) unsupplied++;
    if (lvl === 0) hungry++;
    const lim = popLimit(h, hv);
    if (step > 0 && lvl >= 1 && h.pop < lim) {
      const before = Math.floor(h.pop);
      h.pop = Math.min(lim, h.pop + POP.growPerMonth * step);
      if (Math.floor(h.pop) !== before) res.popChanged = true;
    }
    const n = Math.floor(h.pop);
    residents += n;
    fedPeople += n * h.fed;
    taxBase += n * POP.taxFactor[lvl] * (BUILDINGS[h.type].taxMul || 1) * (1 + (lvl > 0 ? beautyOf(state, h) : 0));
  }
  const fedAll = residents ? fedPeople / residents : 1;
  const efficiency = POP.hungryWork + (1 - POP.hungryWork) * Math.min(1, fedAll);

  // Arbeitskraft verteilen: Vorrang zuerst, dann Betriebe, deren Ware gerade auf Baustellen
  // fehlt (z. B. das Sägewerk, wenn Häuser auf Bretter warten), dann nach Baureihenfolge.
  const siteNeed = new Set();
  for (const b of state.buildings) {
    const s = b.site;
    if (!s) continue;
    for (const [g, v] of Object.entries(s.need)) if (v - (s.used[g] || 0) - (s.have?.[g] || 0) > 1e-6 && (state.stock?.[g] || 0) < v) siteNeed.add(g);
  }
  const urgent = (b) => { const out = BUILDINGS[b.type].production?.outputs; return out && Object.keys(out).some((g) => siteNeed.has(g)) ? 1 : 0; };
  const jobs = state.buildings.filter((b) => !b.site && !b.paused && BUILDINGS[b.type]?.workers)
    .sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || urgent(b) - urgent(a) || (a.builtAt || 0) - (b.builtAt || 0));
  let free = residents, jobCount = 0;
  for (const b of jobs) {
    const need = BUILDINGS[b.type].workers;
    jobCount += need;
    b.staff = Math.min(need, free);
    free -= b.staff;
  }
  for (const b of state.buildings) if ((b.site || b.paused) && BUILDINGS[b.type]?.workers) b.staff = 0;

  if (step > 0) state.taxAcc = (state.taxAcc || 0) + taxBase * POP.taxPerMonth * step;

  state.pop = {
    residents, jobs: jobCount, employed: Math.min(residents, jobCount), free: Math.max(0, free),
    fed, variety, efficiency, hungry, unsupplied, houses: houses.length,
    demand: eaters * POP.eatPerMonth,
  };
}

// Arbeitsanteil eines Betriebs (0..1): Belegschaft und Ernährung
export function workFactor(state, b) {
  const need = BUILDINGS[b.type].workers;
  if (!need) return 1;
  const eff = state.pop ? state.pop.efficiency : 1;
  return ((b.staff ?? need) / need) * eff;
}

// Verschönerung: Deko im Umkreis von 5 Feldern bringt bis zu +30 % Steuern (zwischengespeichert je Bauzustand)
export function beautyOf(state, h) {
  if (h._beautyRev === state.rev) return h._beauty;
  let pts = 0;
  for (const b of state.buildings) {
    const v = BUILDINGS[b.type]?.beauty;
    if (!v || b.site) continue;
    if (Math.abs(b.x - h.x) <= 5 && Math.abs(b.y - h.y) <= 5) pts += v;
  }
  h._beauty = Math.min(0.3, pts * 0.05);
  h._beautyRev = state.rev;
  return h._beauty;
}

export const LEVEL_NAMES = ['Hungrig', 'Satt', 'Zufrieden', 'Gut versorgt'];
