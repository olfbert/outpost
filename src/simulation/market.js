// Erdmarkt: Verkäufe an die Versorgungsflüge. Wer viel von einer Ware auf einmal verkauft,
// drückt den Preis (Sättigung). Die Sättigung baut sich mit der Zeit wieder ab.
// So lohnt sich Verarbeitung und Handel mit den Nachbarn mehr als reiner Rohstoffverkauf.

import { GOODS } from '../config/economy.js';

export const MARKET = {
  depthCr: 25000,     // ab so viel verkauftem Warenwert (Grundpreis) ist der Preis um die Hälfte gefallen
  floor: 0.35,        // tiefster Preis: 35 % des Grundpreises
  recover: 0.35,      // Abbau der Sättigung je Monat (Anteil, exponentiell)
};

const depth = (g) => MARKET.depthCr / Math.max(1, GOODS[g].price || 1);

// Preisfaktor bei gegebener Sättigung
function factorAt(g, sat) {
  return Math.max(MARKET.floor, 1 - 0.5 * sat / depth(g));
}

// Aktueller Preis je Einheit
export function marketPrice(state, g) {
  const sat = state.market?.[g] || 0;
  return Math.round(GOODS[g].price * factorAt(g, sat) * 100) / 100;
}

// Erlös für amount Einheiten (Preis fällt während des Verkaufs)
export function marketQuote(state, g, amount) {
  const sat = state.market?.[g] || 0;
  const f = (factorAt(g, sat) + factorAt(g, sat + amount)) / 2;
  return Math.floor(amount * GOODS[g].price * f);
}

export function marketSold(state, g, amount) {
  state.market = state.market || {};
  state.market[g] = (state.market[g] || 0) + amount;
}

export function marketRecover(state, months) {
  if (!state.market) return;
  const k = Math.exp(-MARKET.recover * months);
  for (const g of Object.keys(state.market)) {
    state.market[g] *= k;
    if (state.market[g] < 1) delete state.market[g];
  }
}
