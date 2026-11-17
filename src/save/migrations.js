// Migrationen alter Spielstände. Jede Funktion hebt einen Stand um genau eine
// Schema-Version an. Neue Versionen: Funktion ergänzen, SAVE_SCHEMA_VERSION erhöhen.

import { START_STOCK } from '../config/economy.js';

// Baukosten bis Version 0.6.0 (für die Erstattung beim Abriss alter Gebäude)
const COSTS_V060 = {
  landing_module: { money: 0 }, shelter: { money: 300, planks: 4 }, house_small: { money: 900, planks: 12, stone: 6 },
  warehouse: { money: 1200, planks: 20, stone: 10 }, lumber_camp: { money: 500, planks: 6 }, sawmill: { money: 1500, planks: 10, stone: 10 },
  quarry: { money: 1200, planks: 15 }, iron_mine: { money: 2500, planks: 25, stone: 20 }, coal_mine: { money: 2500, planks: 25, stone: 20 },
  lime_quarry: { money: 1400, planks: 15, stone: 5 }, clay_pit: { money: 900, planks: 10 }, sand_pit: { money: 900, planks: 10 },
  smelter: { money: 6000, planks: 30, stone: 60 }, cement_works: { money: 5000, planks: 25, stone: 40, steel: 5 },
  concrete_plant: { money: 4500, planks: 20, stone: 30, steel: 10 },
};

const RESIDENTS_V061 = { shelter: 2, house_small: 4 };

const MIGRATIONS = {
  // 6 -> 7: Stufe B – Waren liegen in Lagern. Bisheriges Gesamtlager ins Landemodul
  // (bzw. als Fracht, falls noch keins steht); Puffer der Betriebe starten leer.
  6: (d) => {
    const blds = (d.buildings || []).map((b) => ({ ...b }));
    const lm = blds.find((b) => b && b.type === 'landing_module');
    const stock = {};
    for (const [k, v] of Object.entries(d.stock || {})) if (Number.isFinite(v) && v > 0) stock[k] = v;
    if (lm) lm.inv = { ...(lm.inv || {}), ...stock };
    for (const b of blds) if (b && b.site) b.site.have = b.site.have || {};
    return { ...d, schema: 7, buildings: blds, unstored: lm ? {} : stock };
  },
  // 1 -> 2: Phase 2 bringt Materialbestand und Wege.
  1: (d) => ({ ...d, schema: 2, stock: { ...START_STOCK }, roads: [] }),
  // 2 -> 3: Phase 3 bringt fließende Spielzeit und Monatsbilanzen.
  // 3 -> 4: gefällte Bäume wachsen nach (eigene Liste statt dauerhaft geräumt)
  3: (d) => ({ ...d, schema: 4, felled: [] }),
  // 4 -> 5: neue Preise (v0.6.1) – bestehende Gebäude behalten ihren alten Kaufpreis
  // 5 -> 6: Stufe A – Bevölkerung, Nahrung, Baustellen. Bestehende Gebäude gelten als fertig,
  // Häuser als voll belegt; Notrationen als Überbrückung bis zur ersten eigenen Nahrung.
  5: (d) => ({ ...d, schema: 6, stock: { ...(d.stock || {}), rations: (d.stock?.rations || 0) + 300 }, taxAcc: 0,
    buildings: (d.buildings || []).map((b) => (b && RESIDENTS_V061[b.type] && b.pop === undefined ? { ...b, pop: RESIDENTS_V061[b.type] } : b)) }),
  4: (d) => ({ ...d, schema: 5, buildings: (d.buildings || []).map((b) => (b && !b.paid && COSTS_V060[b.type] ? { ...b, paid: { ...COSTS_V060[b.type] } } : b)) }),
  2: (d) => ({ ...d, schema: 3, gameMonths: Math.max(0, ((d.lastSimAt || Date.now()) - (d.createdAt || Date.now())) / 86400000), ledger: [] }),
};

export function migrate(data, target) {
  let d = data;
  while (d.schema < target) {
    const m = MIGRATIONS[d.schema];
    if (!m) throw new Error(`Keine Migration für Spielstand-Version ${d.schema}.`);
    d = m(d);
  }
  return d;
}
