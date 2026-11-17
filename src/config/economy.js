// Waren, Preise, Startbestand und Wirtschaftsregeln. Alle Werte zentral anpassbar.
// price = Verkaufspreis in Cr je Einheit (fest; ein Markt mit Nachfrage folgt später)

export const GOODS = {
  money:     { name: 'Geld', short: 'Cr', unit: 'Cr' },
  logs:      { name: 'Rundholz', short: 'RH', unit: 'fm', price: 9, bulk: true },
  planks:    { name: 'Bretter', short: 'Br', unit: 'Stk.', price: 16 },
  stone:     { name: 'Stein', short: 'St', unit: 't', price: 10, bulk: true },
  iron_ore:  { name: 'Eisenerz', short: 'Erz', unit: 't', price: 16, bulk: true },
  coal:      { name: 'Kohle', short: 'Ko', unit: 't', price: 14, bulk: true },
  limestone: { name: 'Kalkstein', short: 'Ka', unit: 't', price: 9, bulk: true },
  clay:      { name: 'Ton', short: 'Ton', unit: 't', price: 6, bulk: true },
  sand:      { name: 'Sand', short: 'Sa', unit: 't', price: 5, bulk: true },
  steel:     { name: 'Stahl', short: 'Sta', unit: 't', price: 85 },
  cement:    { name: 'Zement', short: 'Ze', unit: 't', price: 38 },
  concrete:  { name: 'Beton', short: 'Be', unit: 'm³', price: 32 },
  glass:     { name: 'Glas', short: 'Gl', unit: 't', price: 60 },
  // Nahrung
  rations:   { name: 'Notrationen', short: 'NR', unit: 'Port.', price: 2, food: true, basic: true },
  fish:      { name: 'Fisch', short: 'Fi', unit: 'Kisten', price: 7, food: true },
  potatoes:  { name: 'Kartoffeln', short: 'Kar', unit: 'Sack', price: 5, food: true, bulk: true },
  grain:     { name: 'Getreide', short: 'Ge', unit: 't', price: 4, bulk: true },
  flour:     { name: 'Mehl', short: 'Me', unit: 'Sack', price: 6 },
  bread:     { name: 'Brot', short: 'Bro', unit: 'Kisten', price: 9, food: true },
  cattle:    { name: 'Vieh', short: 'Vi', unit: 'Tiere', price: 14 },
  meat:      { name: 'Fleisch', short: 'Fl', unit: 'Kisten', price: 11, food: true },
  vegetables:{ name: 'Gemüse', short: 'Gm', unit: 'Kisten', price: 10, food: true },
};
export const GOOD_IDS = Object.keys(GOODS).filter((k) => k !== 'money');
// Nahrungssorten (Notrationen machen satt, zählen aber nicht zur Vielfalt)
export const FOOD_IDS = GOOD_IDS.filter((k) => GOODS[k].food);
export const FOOD_VARIETY = FOOD_IDS.filter((k) => !GOODS[k].basic);

// Diese Waren zeigt die obere Leiste immer an (Reihenfolge = Anzeige).
export const HUD_GOODS = ['planks', 'stone', 'logs'];

// Mitgebrachtes Material der Expedition. Das Geld kommt aus CONFIG.startBudget.
export const START_STOCK = { planks: 120, stone: 60, logs: 0, rations: 300 };

// Anteil der Baukosten, der beim Abriss zurückkommt.
export const REFUND_RATE = 0.5;

// Bevölkerung und Versorgung
export const POP = {
  eatPerMonth: 4,          // Nahrungseinheiten je Bewohner und Monat
  growPerMonth: 4,         // Zuzug je Haus und Monat, wenn versorgt
  startPop: 2,             // Belegung eines neu fertigen Hauses
  taxPerMonth: 15,         // Cr je versorgtem Bewohner und Monat (satt)
  taxFactor: [0, 1, 1.5, 2],   // nach Versorgungsstufe 0 hungrig, 1 satt, 2 zufrieden, 3 gut versorgt
  hungryWork: 0.5,         // Arbeitsleistung, wenn niemand satt ist (wird anteilig gemischt)
};

const nf = new Intl.NumberFormat('de-DE');
export const fmt = (n) => nf.format(Math.floor(n + 1e-9));

// Kosten als kurzer Text, z. B. "900 Cr · 12 Br · 6 St".
export function costText(cost, long = false) {
  const parts = [];
  for (const [k, v] of Object.entries(cost || {})) {
    if (!v) continue;
    const g = GOODS[k];
    parts.push(`${fmt(v)} ${long ? (k === 'money' ? 'Cr' : g.name) : g.short}`);
  }
  return parts.length ? parts.join(' · ') : 'kostenlos';
}
