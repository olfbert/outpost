// Spielzustand: alles, was der Spieler verändert hat. Die Welt selbst wird
// aus dem Seed neu erzeugt und steht deshalb nicht im Spielstand.
// Siedlungen sind eigenständige Datenobjekte mit (späterem) Besitzerfeld –
// Gebäude verweisen nur per settlementId darauf.

import { SAVE_SCHEMA_VERSION, GAME_VERSION } from '../config/gameConfig.js';
import { START_STOCK } from '../config/economy.js';
import { ROADS } from '../config/roads.js';
import { migrate } from '../save/migrations.js';
import { addGoods, takeGoods, recomputeStock } from '../simulation/inventory.js';

export function newState(seed, cfg) {
  const now = Date.now();
  return {
    schema: SAVE_SCHEMA_VERSION,
    gameVersion: GAME_VERSION,
    seed: String(seed),
    worldConfig: { worldSize: cfg.worldSize, chunkSize: cfg.chunkSize },
    createdAt: now,          // Beginn der Spielzeit (1 echter Tag = 1 Ingame-Monat)
    lastSimAt: now,          // letzter Simulationszeitpunkt (ab Phase 4 maßgeblich)
    money: cfg.startBudget,
    stock: { ...START_STOCK }, // Summe aller Lager (wird berechnet)
    unstored: { ...START_STOCK }, // Fracht des Landemoduls, solange noch kein Lager steht
    neighbors: [],             // veränderlicher Zustand der Computer-Nachbarn (Lage folgt aus dem Seed)
    roads: new Map(),        // Feldschlüssel -> Wegtyp (Index in ROADS)
    history: [],             // letzte Ausgaben/Einnahmen { t, gm, text, money }
    gameMonths: 2,           // Spielzeit in Monaten (fließend); Start am 1. März zur Aussaat
    ledger: [],              // Monatsbilanzen { month, income, build, upkeep }
    settlements: [{ id: 's1', name: 'Landezone', ownerId: null, foundedAt: null }],
    buildings: [],           // { id, type, x, y, settlementId, builtAt }
    nextId: 1,
    cleared: new Set(),      // dauerhaft geräumte Felder (Bau, Weg) – Schlüssel y * Weltgröße + x
    planted: new Map(),      // gepflanzte Bäume: Feld -> Spielmonat des Pflanzens
    felled: new Map(),       // gefällte Bäume: Feld -> Spielmonat des Fällens (wachsen nach)
    camera: null,
    settings: { minimap: true, debug: false, tilt: true, clouds: true, cheats: { on: false } },
    rev: 0,                  // zählt Änderungen (für Caches), wird nicht gespeichert
  };
}

export function serialize(state) {
  return {
    schema: state.schema,
    gameVersion: state.gameVersion,
    seed: state.seed,
    worldConfig: state.worldConfig,
    createdAt: state.createdAt,
    lastSimAt: state.lastSimAt,
    money: state.money,
    stock: state.stock,
    unstored: state.unstored || {},
    roads: [...state.roads],
    history: state.history.slice(-50),
    gameMonths: state.gameMonths,
    taxAcc: state.taxAcc || 0,
    neighbors: state.neighbors || [],
    ledger: state.ledger,
    settlements: state.settlements,
    buildings: state.buildings.map((b) => {
      const o = {};
      for (const [k, v] of Object.entries(b)) if (k[0] !== '_') o[k] = v;   // _… = nur Laufzeit-Caches
      return o;
    }),
    nextId: state.nextId,
    cleared: [...state.cleared],
    felled: [...state.felled],
    planted: [...(state.planted || [])],
    camera: state.camera,
    settings: state.settings,
  };
}

// Prüft und lädt einen gespeicherten Stand. Wirft bei unbrauchbaren Daten.
export function deserialize(data, cfg) {
  if (!data || typeof data !== 'object') throw new Error('Spielstand ist leer oder beschädigt.');
  if (typeof data.schema !== 'number') throw new Error('Spielstand ohne Versionsangabe.');
  if (data.schema > SAVE_SCHEMA_VERSION) throw new Error('Spielstand stammt aus einer neueren Spielversion.');
  if (typeof data.seed !== 'string' || !data.seed) throw new Error('Spielstand ohne Welt-Seed.');
  data = migrate(data, SAVE_SCHEMA_VERSION);
  const s = newState(data.seed, cfg);
  s.createdAt = Number(data.createdAt) || s.createdAt;
  s.lastSimAt = Number(data.lastSimAt) || s.lastSimAt;
  s.money = Number.isFinite(data.money) ? data.money : s.money;
  if (data.worldConfig && data.worldConfig.worldSize) s.worldConfig = data.worldConfig;
  if (Array.isArray(data.settlements) && data.settlements.length) s.settlements = data.settlements;
  if (Array.isArray(data.buildings)) {
    s.buildings = data.buildings.filter((b) => b && typeof b.type === 'string' && Number.isInteger(b.x) && Number.isInteger(b.y));
  }
  s.nextId = Number(data.nextId) || s.buildings.length + 1;
  s.unstored = {};
  if (data.unstored && typeof data.unstored === 'object') {
    for (const [k, v] of Object.entries(data.unstored)) if (Number.isFinite(v) && v > 0) s.unstored[k] = v;
  }
  if (Array.isArray(data.roads)) {
    s.roads = new Map(data.roads.filter((r) => Array.isArray(r) && Number.isInteger(r[0]) && ROADS[r[1]]));
  }
  if (Array.isArray(data.history)) s.history = data.history.slice(-50);
  s.gameMonths = Number.isFinite(data.gameMonths) ? data.gameMonths : 0;
  s.taxAcc = Number.isFinite(data.taxAcc) ? data.taxAcc : 0;
  s.neighbors = Array.isArray(data.neighbors) ? data.neighbors.filter((n) => n && n.id && n.stock) : [];
  if (Array.isArray(data.ledger)) s.ledger = data.ledger.slice(-24);
  s.cleared = new Set(Array.isArray(data.cleared) ? data.cleared : []);
  s.planted = new Map(Array.isArray(data.planted) ? data.planted.filter((e) => Array.isArray(e) && Number.isInteger(e[0]) && Number.isFinite(e[1])) : []);
  s.felled = new Map(Array.isArray(data.felled) ? data.felled.filter((e) => Array.isArray(e) && Number.isFinite(e[1])) : []);
  s.camera = data.camera || null;
  recomputeStock(s);
  s.settings = { ...s.settings, ...(data.settings || {}) };
  return s;
}

// Kann sich der Spieler die Kosten leisten? Liefert fehlende Posten.
export function missingFor(state, cost) {
  const out = [];
  for (const [k, v] of Object.entries(cost || {})) {
    const have = k === 'money' ? state.money : (state.stock[k] || 0);
    if (have < v) out.push({ good: k, need: v, have });
  }
  return out;
}

// Kosten abbuchen (factor -1 erstattet). Vorher missingFor prüfen.
export function pay(state, cost, factor = 1, text = '', kind = 'build') {
  let money = 0;
  const take = {}, give = {};
  for (const [k, v] of Object.entries(cost || {})) {
    const amount = Math.floor(v * Math.abs(factor)) * Math.sign(factor);
    if (k === 'money') { state.money -= amount; money -= amount; } else if (amount > 0) take[k] = amount; else if (amount < 0) give[k] = -amount;
  }
  if (Object.keys(take).length) takeGoods(state, take);
  if (Object.keys(give).length) addGoods(state, give);
  if (money) {
    const month = Math.floor(state.gameMonths || 0);
    let led = state.ledger.find((l) => l.month === month);
    if (!led) { led = { month, income: 0, build: 0, upkeep: 0, closed: false }; state.ledger.push(led); state.ledger.sort((a, b) => a.month - b.month); while (state.ledger.length > 24) state.ledger.shift(); }
    if (money < 0) led[kind] += -money; else led.build -= money;   // Erstattung mindert die Bauausgaben
  }
  if (text) {
    state.history.push({ t: Date.now(), gm: state.gameMonths, text, money });
    if (state.history.length > 50) state.history.shift();
  }
}

// Ingame-Datum (Kompatibilität: aus der fließenden Spielzeit)
export function gameDate(state, cfg) {
  const months = Math.floor(state.gameMonths || 0);
  return { month: (months % 12) + 1, year: cfg.startYear + Math.floor(months / 12), totalMonths: months };
}
