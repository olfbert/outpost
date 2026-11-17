// Baustellen: Ein neues Gebäude steht zuerst als Baustelle da. Das Geld wird
// beim Setzen bezahlt, das Material verbraucht der Bautrupp nach und nach aus
// dem Lager. Fehlt Material, ruht die Baustelle. Gleichzeitig wird nur an so
// vielen Baustellen gearbeitet, wie es Bautrupps gibt (Landemodul, Bauhöfe).

import { BUILDINGS } from '../config/buildings.js';

// Bauzeit in Spielmonaten (1 Monat = 1 echter Tag): kleine Häuser ca. 20 Minuten,
// große Werke ein bis zwei Stunden.
export function buildMonths(def) {
  const money = def.buildCost.money || 0;
  return 0.008 + money / 250000;
}

// Neue Baustelle für ein Gebäude anlegen
export function startSite(b, def) {
  const need = {};
  for (const [g, v] of Object.entries(def.buildCost)) if (g !== 'money' && v > 0) need[g] = v;
  b.site = { progress: 0, months: buildMonths(def), need, used: {}, status: 'queued' };
}

export function builderCapacity(state) {
  let n = 0;
  for (const b of state.buildings) if (!b.site) n += BUILDINGS[b.type]?.provides?.builders || 0;
  return n;
}

// Baustellen in Bau-Reihenfolge (ältere zuerst)
export function sites(state) {
  return state.buildings.filter((b) => b.site).sort((a, b) => (a.builtAt || 0) - (b.builtAt || 0) || (a.id < b.id ? -1 : 1));
}

// Fortschritt für step Monate. Fertige Gebäude kommen in res.completed.
export function advanceSites(state, step, res) {
  const list = sites(state);
  if (!list.length) return;
  const cap = builderCapacity(state);
  let crews = cap;
  for (const b of list) {
    const s = b.site;
    if (crews <= 0) { s.status = 'queued'; continue; }
    crews--;
    let dp = Math.min(1 - s.progress, step / s.months);
    // Verbaut wird nur, was auf der Baustelle angeliefert ist (s.have)
    s.have = s.have || {};
    let lack = '';
    for (const [g, v] of Object.entries(s.need)) {
      const want = v * (s.progress + dp) - (s.used[g] || 0);
      if (want <= 0) continue;
      const have = s.have[g] || 0;
      if (have < want) {
        const reach = ((s.used[g] || 0) + have) / v - s.progress;
        if (reach < dp) { dp = Math.max(0, reach); lack = g; }
      }
    }
    if (dp > 0) {
      for (const [g, v] of Object.entries(s.need)) {
        const want = Math.max(0, v * (s.progress + dp) - (s.used[g] || 0));
        const take = Math.min(want, s.have[g] || 0);
        s.have[g] = (s.have[g] || 0) - take;
        s.used[g] = (s.used[g] || 0) + take;
      }
      s.progress = Math.min(1, s.progress + dp);
    }
    s.status = lack ? 'material:' + lack : 'building';
    if (s.progress >= 1 - 1e-6) {
      delete b.site;
      b.completedAt = state.gameMonths;
      res.completed.push(b);
      crews++;    // der Trupp ist sofort für die nächste Baustelle frei
    }
  }
}

// Erstattung beim Abbruch einer Baustelle: Geld anteilig, verbautes Material zur Hälfte
export function siteRefund(b, paid) {
  const s = b.site, out = {};
  const m = Math.floor((paid.money || 0) * (1 - 0.5 * s.progress));
  if (m) out.money = m;
  for (const [g, v] of Object.entries(s.used)) { const r = Math.floor(v * 0.5); if (r) out[g] = r; }
  // angeliefertes, noch nicht verbautes Material kommt ganz zurück
  for (const [g, v] of Object.entries(s.have || {})) { const r = Math.floor(v); if (r) out[g] = (out[g] || 0) + r; }
  return out;
}

export function siteStatusText(b) {
  const s = b.site;
  if (!s) return '';
  if (s.status === 'queued') return 'Wartet auf einen freien Bautrupp';
  if (s.status.startsWith('material:')) return 'Wartet auf Material';
  return 'Wird gebaut';
}
