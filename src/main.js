// OUTPOST – Einstiegspunkt. Verdrahtet Welt, Spielzustand, Kamera, Renderer
// und Oberfläche. Gezeichnet wird nur bei Bedarf (Kamera bewegt, Zustand
// geändert, Inhalte laden nach) – das schont Akku und Gerät.

import { CONFIG } from './config/gameConfig.js';
import { BUILDINGS } from './config/buildings.js';
import { ROADS } from './config/roads.js';
import { costText, GOODS, fmt } from './config/economy.js';
import { Production, sell, ledgerFor } from './simulation/production.js';
import { dateText, monthLabel } from './simulation/gameClock.js';
import { EconomyPanel } from './ui/economyPanel.js';
import { createWorld, randomSeed } from './world/worldGenerator.js';
import { ChunkStore } from './world/chunks.js';
import { Camera } from './camera/camera.js';
import { Input } from './camera/input.js';
import { buildSprites } from './rendering/sprites.js';
import { loadAssets } from './rendering/assetLoader.js';
import { Renderer } from './rendering/renderer.js';
import { Placement } from './building/placement.js';
import { Roads } from './building/roads.js';
import { newState, serialize, deserialize, pay } from './state/gameState.js';
import { saveSlot, loadSlot, storageAvailable } from './save/indexedDb.js';
import { Hud } from './ui/hud.js';
import { BuildMenu } from './ui/buildMenu.js';
import { InfoPanel, MenuDialog } from './ui/panels.js';
import { Minimap } from './ui/minimap.js';
import { RenameDialog } from './ui/dialogs.js';
import { Life } from './life/life.js';
import { SaveUi } from './ui/saveUi.js';
import { fieldBox } from './simulation/farming.js';
import { updatePopulation } from './simulation/population.js';
import { TRUCK, truckCount } from './simulation/logistics.js';
import { addGoods, takeGoods, stores, storeCap } from './simulation/inventory.js';
import { CheatPanel, cheat } from './ui/cheats.js';
import { TradePanel } from './ui/tradePanel.js';
import { siteNeighbors, freshNeighbor, advanceNeighbor, offers, layoutNeighbor, TRADE } from './simulation/neighbors.js';
import { GOOD_IDS, FOOD_VARIETY } from './config/economy.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const params = new URLSearchParams(location.search);

const sprites = buildSprites();
const renderer = new Renderer(canvas, sprites, CONFIG);
const camera = new Camera(CONFIG, CONFIG.worldSize);
const hud = new Hud();

let world, store, state, placement, roads, production, life;
let lifeT = 0;
let speed = 1;               // Zeitraffer (nur Entwicklermodus)
let lastTick = Date.now();
let lastHud = 0;
let dirty = true;
let placing = null;          // Gebäudetyp im Platzierungsmodus
let ghostPos = null;         // obere Ecke der Vorschau
let roadTool = null;         // Weg-Werkzeug { type, start, end, plan }
let lastPointer = 'mouse';
let prevView = null;         // Ansicht vor dem Sprung in die Weltübersicht
let saveTimer = 0;
const overlay = { startZone: false, hover: null, selected: null, ghost: null, road: null, settlement: null };
const tmp = { x: 0, y: 0 };

// --- Speichern ----------------------------------------------------------------
function saveNow() {
  clearTimeout(saveTimer); saveTimer = 0;
  if (!state) return;
  state.camera = { x: camera.x, y: camera.y, scale: camera.scale };
  saveSlot('main', serialize(state));
}
function scheduleSave(ms = 1200) {
  if (saveTimer) return;
  saveTimer = setTimeout(saveNow, ms);
}

// --- Welt starten ---------------------------------------------------------------
// --- Computer-Nachbarn -----------------------------------------------------------------
let neighborSites = [];
const nbBucket = (n) => Math.floor(n.size / 30) * 30;
function setupNeighbors() {
  neighborSites = siteNeighbors(world, store);
  state.neighbors = state.neighbors || [];
  for (const site of neighborSites) if (!state.neighbors.find((n) => n.id === site.id)) state.neighbors.push(freshNeighbor(site));
  applyNeighborLayouts();
}
function applyNeighborLayouts() {
  state.npcBuildings = [];
  state.npcRoads = new Set();
  const W = world.size;
  for (const site of neighborSites) {
    const n = state.neighbors.find((q) => q.id === site.id);
    if (!n) continue;
    site.bucket = nbBucket(n);
    const lay = layoutNeighbor(world, store, site, site.bucket);
    site.station = lay.station;
    site.stationB = lay.buildings.find((b) => b.station) || null;
    for (const b of lay.buildings) {
      state.npcBuildings.push(b);
      // Bewuchs auf und direkt um die Gebäude räumen
      const d = BUILDINGS[b.type].footprint;
      for (let j = -1; j <= d.height; j++) for (let i = -1; i <= d.width; i++) state.cleared.add((b.y + j) * W + b.x + i);
    }
    for (const k of lay.roads) { if (!state.roads.has(k)) state.roads.set(k, 2); state.npcRoads.add(k); state.cleared.add(k); }
    store.invalidateArea(site.x - 24, site.y - 24, site.x + 24, site.y + 24);
    if (renderer.world === world) renderer.invalidateTiles(site.x - 24, site.y - 24, 49, 49, true);
  }
  state.roadRev = (state.roadRev || 0) + 1;
  placement.rebuild();
  overlay.neighbors = neighborSites.map((q) => ({ name: q.name, x: q.x, y: q.y - 2 }));
  state.rev++;
}
function neighborMonth(m) {
  let grew = false;
  for (const site of neighborSites) {
    const n = state.neighbors.find((q) => q.id === site.id);
    if (!n) continue;
    advanceNeighbor(n, site, m);
    if (nbBucket(n) !== site.bucket) grew = true;
  }
  if (grew) applyNeighborLayouts();
}
function tradeOffice() { return state.buildings.find((b) => b.type === 'trade_office' && !b.site); }
function neighborConn(id) {
  const site = neighborSites.find((q) => q.id === id);
  if (!site) return { road: false, air: 0 };
  const lm = state.buildings.find((b) => b.type === 'landing_module');
  const air = lm ? Math.round(Math.hypot(lm.x - site.x, lm.y - site.y)) : 0;
  const office = tradeOffice();
  if (!office) return { road: false, air };
  const net = production.logistics.net, d = net.door(office);
  const sk = site.station.y * world.size + site.station.x;
  const c = d != null ? net.costsFrom(d).get(sk) : undefined;
  return c !== undefined ? { road: true, dist: Math.round(c), air } : { road: false, air };
}
function neighborOffers(id) {
  const site = neighborSites.find((q) => q.id === id), n = state.neighbors.find((q) => q.id === id);
  const o = offers(n, site), conn = neighborConn(id);
  const mb = conn.road ? TRADE.roadMarkupBuy : TRADE.airMarkupBuy, ms = conn.road ? TRADE.roadMarkupSell : TRADE.airMarkupSell;
  for (const x of o.sell) x.final = Math.round(x.price * mb * 100) / 100;
  for (const x of o.buy) x.final = Math.round(x.price * ms * 100) / 100;
  return o;
}
function tradeTruck(id, g, qty) {
  // sichtbare Fahrt Kontor <-> Handelsstation, wenn per Straße verbunden
  const site = neighborSites.find((q) => q.id === id), office = tradeOffice();
  if (site && site.stationB && office && neighborConn(id).road) production.logistics._record(office, site.stationB, g, qty);
}

function startWorld(st) {
  state = st;
  const wcfg = { ...CONFIG, ...state.worldConfig };
  world = createWorld(state.seed, wcfg);
  store = new ChunkStore(world, state, wcfg);
  placement = new Placement(world, store, state);
  roads = new Roads(world, store, state, placement);
  setupNeighbors();
  production = new Production(world, store, state, placement, CONFIG);
  production.onMonth = (m) => neighborMonth(m);
  placement.production = production;
  life = new Life(world, store, state, placement, sprites);
  life.logistics = production.logistics;
  for (const b of state.buildings) {
    if (BUILDINGS[b.type]?.production && !b.stats) production.initBuilding(b);
    if (BUILDINGS[b.type]?.requirements?.nearTrees && b.target === undefined) production.initBuilding(b);
  }
  camera.setWorldSize(world.size);
  renderer.setWorld(world, store, state);
  minimap.setWorld(world, renderer.far);
  resize();
  if (state.camera) {
    camera.x = state.camera.x; camera.y = state.camera.y; camera.scale = state.camera.scale;
    camera.clamp();
  } else {
    camera.scale = CONFIG.startScale;
    camera.centerOnTile(world.start.x, world.start.y);
  }
  setTool(null);
  overlay.selected = null; overlay.hover = null;
  infoPanel.hide();
  // Zeit nachrechnen, in der das Spiel geschlossen war
  const away = (Date.now() - state.lastSimAt) / CONFIG.realMsPerGameMonth;
  if (away > 0) {
    const res = production.advance(away);
    afterSim(res, true);
    if (away > 0.02) hud.toast(`Willkommen zurück – ${away >= 1 ? away.toFixed(1).replace('.', ',') + ' Monate' : Math.round(away * 30) + ' Tage'} wurden nachgerechnet.`, 4500);
  }
  lastTick = Date.now();
  refreshState();
  dirty = true;
}

// Nach einem Simulationsschritt: Welt und Anzeigen auffrischen
function infoCtx() { return { gameMonths: state.gameMonths, variety: state.pop?.variety || 0, state }; }

function cheatTick() {
  if (cheat(state, 'money') && state.money < 9_999_999) state.money = 9_999_999;
  if (cheat(state, 'instant') && state.buildings.some((b) => b.site)) finishAllSites();
}

function afterSim(res, quiet = false) {
  for (const b of res.completed || []) {
    const def = BUILDINGS[b.type];
    renderer.invalidateTiles(b.x, b.y, def.footprint.width, def.footprint.height);
    if (!quiet) hud.toast(`${def.name} ist fertig`, 3000);
    if (b.id === overlay.selectedId) selectAt(b.x, b.y);
  }
  if ((res.completed && res.completed.length) || res.popChanged) { state.rev++; dirty = true; }
  if (res.season || res.winterChanged) {
    // Felder wechseln ihr Aussehen; im Winter liegt Schnee
    const W = world.size;
    for (const b of state.buildings) {
      const box = fieldBox(b, W);
      if (box) store.invalidateArea(box.x0, box.y0, box.x1, box.y1);
    }
    if (res.winterChanged) renderer.invalidateAll();
    else for (const b of state.buildings) { const box = fieldBox(b, W); if (box) renderer.invalidateTiles(box.x0, box.y0, box.x1 - box.x0 + 1, box.y1 - box.y0 + 1, true); }
    dirty = true;
  }
  if (state.buildings.some((b) => b.site)) dirty = true;
  if (res.felled.length) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of res.felled) { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y); }
    renderer.invalidateTiles(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    state.rev++;
    dirty = true;
  }
  if (res.months.length && !quiet) {
    const led = state.ledger.find((l) => l.month === res.months[res.months.length - 1]);
    if (led) hud.toast(`Monatsabschluss ${monthLabel(led.month, CONFIG)}: Einnahmen ${led.income.toLocaleString('de-DE')} Cr${led.tax ? ` (davon Steuern ${led.tax.toLocaleString('de-DE')})` : ''}, Betrieb −${led.upkeep.toLocaleString('de-DE')} Cr`, 4500);
    scheduleSave(500);
  }
}

// Alles aktualisieren, was vom Spielzustand abhängt.
function refreshState() {
  const has = state.buildings.length > 0;
  overlay.startZone = !has;
  overlay.settlement = placement.settlementCenter();
  hud.setSettlement(state.settlements[0].name);
  hud.setDate(dateText(state.gameMonths, CONFIG));
  if (life && state.rev !== life.rev) life.rebuild();
  hud.setStock(state, life ? life.stats : null);
  let hint = '';
  const p = state.pop;
  if (!has) hint = 'Wähle unten das Landemodul und setze es in die Landezone.';
  else if (!state.roads.size) hint = 'Lege einen Weg vom Landemodul aus an – die meisten Gebäude brauchen Weganschluss.';
  else if (p && p.residents && !state.buildings.some((b) => BUILDINGS[b.type].category === 'food')) hint = 'Die Notrationen reichen nur einige Monate – baue eine Fischerhütte oder einen Ackerhof.';
  else if (production.logistics.stats.util > 0.9) hint = 'Die Lkw sind voll ausgelastet – baue eine Spedition oder kaufe dort weitere Lkw. Schotterwege und nahe Lager sparen Fahrzeit.';
  else if (production.logistics.stats.waitingPickup > 0 && state.buildings.some((b) => typeof b.status === 'string' && b.status.startsWith('full:'))) hint = 'Ein Betrieb wartet auf Abholung – ist in den Lagern noch Platz? Ein Silo nimmt Schüttgut, eine Lagerhalle alles.';
  if (placing || roadTool || overlay.selected) hint = '';
  hud.setHint(hint);
  $('minimap').hidden = !state.settings.minimap;
  buildMenu.refresh();
  dirty = true;
}

// --- Platzierung ------------------------------------------------------------------
function lockReason(key) {
  const [kind, type] = key.split(':');
  const hasLanding = state.buildings.some((b) => b.type === 'landing_module');
  if (kind === 'r') return hasLanding ? '' : 'Zuerst das Landemodul setzen';
  const def = BUILDINGS[type];
  if (def.unique && state.buildings.some((b) => b.type === type)) return `${def.name} gibt es bereits`;
  if (cheat(state, 'unlock') && (type === 'landing_module' || hasLanding)) return '';
  if (type !== 'landing_module' && !hasLanding) return 'Zuerst das Landemodul setzen';
  const miss = (def.unlock || []).filter((u) => !state.buildings.some((b) => b.type === u && !b.site));
  if (miss.length) return 'Benötigt zuerst (fertig gebaut): ' + miss.map((u) => BUILDINGS[u].name).join(', ');
  return '';
}

function setGhost(x, y) {
  if (!placing) return;
  const def = BUILDINGS[placing];
  const gx = x - (def.footprint.width >> 1), gy = y - (def.footprint.height >> 1);
  if (ghostPos && ghostPos.x === gx && ghostPos.y === gy && overlay.ghost) return;
  ghostPos = { x: gx, y: gy };
  updateGhost();
}

function updateGhost() {
  if (!placing || !ghostPos) { overlay.ghost = null; return; }
  const v = placement.validate(placing, ghostPos.x, ghostPos.y);
  overlay.ghost = v;
  buildMenu.setStatus(v, lastPointer !== 'mouse');
  dirty = true;
}

// key: 'b:<gebäude>', 'r:<wegtyp>' oder null
function setTool(key) {
  const [kind, type] = key ? key.split(':') : [null, null];
  placing = kind === 'b' ? type : null;
  roadTool = kind === 'r' ? { type: +type, start: null, end: null, plan: null } : null;
  overlay.ghost = null; ghostPos = null; overlay.road = null;
  canvas.classList.toggle('placing', !!key);
  buildMenu.setActive(key);
  if (!key) { refreshState(); return; }
  overlay.selected = null;
  infoPanel.hide();
  hud.setHint('');
  if (roadTool) {
    if (camera.scale < CONFIG.lodDetail) camera.zoomTo(camera.vw / 2, camera.vh / 2, 1);
    buildMenu.setRoadStatus(roadTool.type, null, null, lastPointer !== 'mouse');
    dirty = true;
    return;
  }
  beginGhost();
}

// Für Tests/Kompatibilität: Gebäude-Werkzeug direkt wählen.
function setPlacing(type) { setTool(type ? 'b:' + type : null); }

function beginGhost() {
  // Zum Bauen nah genug heranzoomen
  if (camera.scale < CONFIG.lodDetail) camera.zoomTo(camera.vw / 2, camera.vh / 2, 1);
  const c = camera.centerTile(tmp);
  ghostPos = null;
  setGhost(Math.floor(c.x), Math.floor(c.y));
}

function tryPlace() {
  if (!placing || !ghostPos) return;
  const v = placement.validate(placing, ghostPos.x, ghostPos.y);
  if (!v.ok) { hud.toast(v.reasons[0] || 'Hier kann nicht gebaut werden'); updateGhost(); return; }
  const def = BUILDINGS[placing];
  const b = placement.place(placing, ghostPos.x, ghostPos.y);
  if (!b) return;
  renderer.invalidateTiles(b.x, b.y, def.footprint.width, def.footprint.height, def.category !== 'deco');
  if (b._fieldBox) { const f = b._fieldBox; renderer.invalidateTiles(f.x0, f.y0, f.x1 - f.x0 + 1, f.y1 - f.y0 + 1, true); }
  if (b.site) {
    const short = v.matShort && v.matShort.length ? ' · Material fehlt noch – die Baustelle wartet darauf' : '';
    hud.toast(`Baustelle ${def.name} · ${costText({ money: def.buildCost.money })} bezahlt${short}`, short ? 4000 : 2600);
  } else hud.toast(`${def.name} gebaut · ${costText(def.buildCost)}`);
  refreshState();
  saveNow();
  if (def.unique) {
    setTool(null);
    if (b.type === 'landing_module') renameDialog.open(state.settlements[0].name);
  } else updateGhost();
}

// --- Wege -----------------------------------------------------------------------------
function updateRoadPlan() {
  const t = roadTool;
  overlay.road = null;
  t.plan = t.start && t.end ? roads.plan(t.type, t.start, t.end) : null;
  if (t.plan) overlay.road = { tiles: t.plan.tiles, start: t.start };
  else if (t.start) overlay.road = { tiles: [], start: t.start };
  buildMenu.setRoadStatus(t.type, t.plan, t.start, lastPointer !== 'mouse');
  dirty = true;
}

function roadPoint(x, y, commitIfMouse) {
  const t = roadTool;
  if (!t.start) { t.start = { x, y }; t.end = lastPointer === 'mouse' ? null : { x, y }; updateRoadPlan(); return; }
  t.end = { x, y };
  updateRoadPlan();
  if (commitIfMouse) buildRoad();
}

function buildRoad() {
  const t = roadTool;
  if (!t || !t.plan) return;
  if (!t.plan.ok) { hud.toast(t.plan.reasons[0] || 'Hier kann kein Weg gebaut werden'); return; }
  const n = t.plan.newTiles, cost = t.plan.cost;
  const box = roads.build(t.plan);
  if (!box) return;
  renderer.invalidateTiles(box.x0, box.y0, box.x1 - box.x0 + 1, box.y1 - box.y0 + 1, true);
  hud.toast(`${n} Felder ${ROADS[t.type].name} · ${costText(cost)}`);
  // am Ende weiterbauen: neues Teilstück beginnt am Ziel
  t.start = lastPointer === 'mouse' ? null : t.end;
  t.end = lastPointer === 'mouse' ? null : t.end;
  updateRoadPlan();
  hud.setStock(state);
  buildMenu.refresh();
  saveNow();
}

// --- Auswahl ------------------------------------------------------------------------
function selectAt(x, y) {
  if (!world.inBounds(x, y)) { overlay.selected = null; infoPanel.hide(); dirty = true; return; }
  const b = placement.buildingAt(x, y);
  const r = roads.at(x, y);
  if (b && b.npc) {
    // Gebäude eines Nachbarn: Handelsfenster öffnen
    infoPanel.hide(); overlay.selected = null; dirty = true;
    trade.open(b.npc);
    return;
  }
  if (b) {
    const def = BUILDINGS[b.type];
    overlay.selected = { x: b.x, y: b.y, w: def.footprint.width, h: def.footprint.height };
    overlay.selectedId = b.id;
    infoPanel.showBuilding(b, placement.refundFor(b), state.settlements[0].name, infoCtx());
  } else if (r) {
    overlay.selectedId = null;
    overlay.selected = { x, y, w: 1, h: 1 };
    infoPanel.showRoad(x, y, r, roads.shapeName(x, y));
  } else {
    overlay.selected = { x, y, w: 1, h: 1 };
    infoPanel.showTile(x, y, store.tile(x, y), world, CONFIG);
  }
  hud.setHint('');
  dirty = true;
}

// --- Oberfläche -----------------------------------------------------------------------
const buildMenu = new BuildMenu(sprites, {
  select(key) {
    if (key) {
      const why = lockReason(key);
      if (why) { hud.toast(why); return; }
    }
    setTool(key);
  },
  confirm: () => (roadTool ? buildRoad() : tryPlace()),
  cancel: () => setTool(null),
  lockReason,
});

const economy = new EconomyPanel({
  state: () => state,
  capacity: () => production.capacity(),
  pop: () => life.stats,
  logistics: () => production.logistics,
  buy(good, n) {
    // Versorgungsflug: doppelter Grundpreis, Ware ins Landemodul
    const lm = state.buildings.find((b) => b.type === 'landing_module');
    if (!lm) return 'Zuerst das Landemodul setzen.';
    const price = GOODS[good].price * TRADE.flightBuy;
    let qty = n;
    if (!cheat(state, 'free')) qty = Math.min(n, Math.floor(state.money / price));
    if (qty < 1) return 'Nicht genug Geld.';
    const cost = Math.round(qty * price);
    if (!cheat(state, 'free')) pay(state, { money: cost }, 1, `${qty} ${GOODS[good].name} per Versorgungsflug gekauft`);
    addGoods(state, { [good]: qty }, lm);
    refreshState(); saveNow();
    return `${fmt(qty)} ${GOODS[good].name} gekauft für ${fmt(cost)} Cr.`;
  },
  cfg: CONFIG,
  sell(good, n) {
    const money = sell(state, good, n, GOODS[good].price, GOODS[good].name);
    if (money) hud.toast(`${n} ${GOODS[good].name} verkauft · +${money.toLocaleString('de-DE')} Cr`);
    refreshState();
    saveNow();
  },
  focus(id) {
    const b = state.buildings.find((q) => q.id === id);
    if (!b) return;
    camera.stop();
    camera.flyToTile(b.x + 1, b.y + 1, Math.max(camera.scale, 1));
    selectAt(b.x, b.y);
  },
});
$('stock').addEventListener('click', () => economy.open('stock'));

const renameDialog = new RenameDialog((name) => {
  state.settlements[0].name = name;
  refreshState();
  saveNow();
  hud.toast(`Siedlung heißt jetzt „${name}“`);
});
$('title-btn').addEventListener('click', () => renameDialog.open(state.settlements[0].name));
$('title-btn').addEventListener('keydown', (e) => { if (e.key === 'Enter') renameDialog.open(state.settlements[0].name); });

const infoPanel = new InfoPanel({
  close() { overlay.selected = null; infoPanel.hide(); dirty = true; },
  rename: () => renameDialog.open(state.settlements[0].name),
  togglePause(id) {
    const b = state.buildings.find((q) => q.id === id);
    if (!b) return;
    b.paused = !b.paused;
    b.status = b.paused ? 'paused' : 'idle';
    updatePopulation(state, 0, {});
    state.rev++;
    selectAt(b.x, b.y);
    saveNow();
  },
  togglePriority(id) {
    const b = state.buildings.find((q) => q.id === id);
    if (!b) return;
    b.priority = !b.priority;
    updatePopulation(state, 0, {});
    state.rev++;
    selectAt(b.x, b.y);
    hud.toast(b.priority ? `${BUILDINGS[b.type].name} bekommt zuerst Arbeiter` : 'Vorrang aufgehoben');
    saveNow();
  },
  setCrop(id, crop) {
    const b = state.buildings.find((q) => q.id === id);
    if (!b) return;
    b.crop = crop;
    const box = fieldBox(b, world.size);
    if (box) { store.invalidateArea(box.x0, box.y0, box.x1, box.y1); renderer.invalidateTiles(box.x0, box.y0, box.x1 - box.x0 + 1, box.y1 - box.y0 + 1, true); }
    selectAt(b.x, b.y);
    hud.toast(`Ab der nächsten Aussaat: ${GOODS[crop].name}`);
    saveNow();
  },
  reopen(b) { selectAt(b.x, b.y); },
  buyTruck(id) {
    const b = state.buildings.find((q) => q.id === id);
    if (!b) return;
    if (state.money < TRUCK.price) { hud.toast('Nicht genug Geld für einen Lkw'); return; }
    pay(state, { money: TRUCK.price }, 1, 'Lkw gekauft');
    b.trucks = (b.trucks || 0) + 1;
    selectAt(b.x, b.y);
    hud.toast(`Neuer Lkw · jetzt ${truckCount(state)} Lkw im Einsatz`);
    saveNow();
  },
  removeRoad(x, y) {
    const r = roads.remove(x, y);
    if (r) {
      renderer.invalidateTiles(x, y, 1, 1, true);
      hud.toast(`${ROADS[r].name} entfernt`);
    }
    overlay.selected = null;
    infoPanel.hide();
    refreshState();
    saveNow();
  },
  demolish(id) {
    const b = placement.remove(id);
    if (b) {
      const def = BUILDINGS[b.type];
      renderer.invalidateTiles(b.x, b.y, def.footprint.width, def.footprint.height, true);
      if (b._fieldBox) { const f = b._fieldBox; renderer.invalidateTiles(f.x0, f.y0, f.x1 - f.x0 + 1, f.y1 - f.y0 + 1, true); }
      updatePopulation(state, 0, {});
      hud.toast(`${def.name} ${b.site ? 'Baustelle abgebrochen' : 'abgerissen'} · Erstattung ${costText(b._refund)}`);
    }
    overlay.selected = null;
    infoPanel.hide();
    refreshState();
    saveNow();
  },
});

const minimap = new Minimap($('minimap'), camera, () => { dirty = true; scheduleSave(4000); });

const menu = new MenuDialog({
  getInfo: () => ({
    seed: state.seed, size: world.size, metersPerTile: CONFIG.metersPerTile,
    buildings: state.buildings.length, roads: state.roads.size, settings: state.settings, storage: storageAvailable,
  }),
  async newWorld(seed) {
    // Bestehenden Stand nie still überschreiben: vorher als Sicherung ablegen.
    if (state.buildings.length || state.roads.size) await saveSlot('backup', serialize(state));
    const st = newState(seed || randomSeed(), CONFIG);
    st.settings = { ...state.settings };
    startWorld(st);
    cheats.sync();
    saveNow();
    hud.toast(`Neue Welt · Seed ${st.seed}`);
  },
  setOption(key, value) {
    state.settings[key] = value;
    refreshState();
    scheduleSave();
  },
  setCheats(on) { cheats.setOn(on); },
});

// --- Handel ---------------------------------------------------------------------------
const trade = new TradePanel({
  state: () => state,
  sites: () => neighborSites,
  offersFor: (id) => neighborOffers(id),
  conn: (id) => neighborConn(id),
  hasOffice: () => !!tradeOffice(),
  focus(id) { const q = neighborSites.find((s) => s.id === id); if (q) { camera.scale = Math.max(camera.scale, 0.5); camera.centerOnTile(q.x, q.y); dirty = true; } },
  buy(id, g, want) {
    const o = neighborOffers(id).sell.find((x) => x.g === g), n = state.neighbors.find((q) => q.id === id);
    let qty = Math.min(want, o.qty);
    if (!cheat(state, 'free')) qty = Math.min(qty, Math.floor(state.money / o.final));
    if (qty < 1) return 'Nicht genug Geld oder kein Angebot.';
    const cost = Math.round(qty * o.final);
    if (!cheat(state, 'free')) pay(state, { money: cost }, 1, `${qty} ${GOODS[g].name} von ${neighborSites.find((q) => q.id === id).name} gekauft`);
    n.stock[g] -= qty; n.traded += cost; n.relation = Math.min(100, n.relation + cost / 1500);
    addGoods(state, { [g]: qty });
    tradeTruck(id, g, qty);
    refreshState(); saveNow();
    return `${fmt(qty)} ${GOODS[g].name} gekauft für ${fmt(cost)} Cr – liegt im Lager.`;
  },
  sell(id, g, want) {
    const o = neighborOffers(id).buy.find((x) => x.g === g), n = state.neighbors.find((q) => q.id === id);
    const qty = Math.floor(Math.min(want, o.qty, state.stock[g] || 0));
    if (qty < 1) return 'Nichts zu verkaufen.';
    takeGoods(state, { [g]: qty });
    const money = Math.round(qty * o.final);
    state.money += money;
    ledgerFor(state, Math.floor(state.gameMonths)).income += money;
    state.history.push({ t: Date.now(), gm: state.gameMonths, text: `${qty} ${GOODS[g].name} an ${neighborSites.find((q) => q.id === id).name} verkauft`, money });
    n.stock[g] = (n.stock[g] || 0) + qty; n.traded += money; n.relation = Math.min(100, n.relation + money / 1500);
    tradeTruck(id, g, qty);
    refreshState(); saveNow();
    return `${fmt(qty)} ${GOODS[g].name} verkauft für ${fmt(money)} Cr.`;
  },
});
$('btn-trade').addEventListener('click', () => trade.open());

// --- Cheat-Modus ---------------------------------------------------------------------
function finishAllSites() {
  const res = { completed: [], felled: [], months: [], popChanged: true };
  for (const b of state.buildings) {
    if (!b.site) continue;
    delete b.site;
    b.completedAt = state.gameMonths;
    res.completed.push(b);
  }
  if (res.completed.length) { afterSim(res, true); updatePopulation(state, 0, {}); }
  return res.completed.length;
}
function simulateMonths(m) {
  const r = production.advance(m);
  afterSim(r, true);
  return r;
}
const cheats = new CheatPanel({
  state: () => state,
  save: () => scheduleSave(2000),
  refresh: () => { refreshState(); buildMenu.refresh(); dirty = true; },
  setSpeed: (v) => { speed = v; },
  getSpeed: () => speed,
  money(n) { state.money += n; return `+${n.toLocaleString('de-DE')} Cr`; },
  goods(n) { const g = {}; for (const k of GOOD_IDS) g[k] = n; addGoods(state, g); return `+${n} von jeder Ware im Lager`; },
  fill() {
    for (const s of stores(state)) { s.inv = s.inv || {}; for (const k of GOOD_IDS) { const c = storeCap(s, k); if (c > (s.inv[k] || 0)) s.inv[k] = c; } }
    addGoods(state, {});
    return 'Alle Lager sind voll';
  },
  food(n) { const g = {}; for (const k of FOOD_VARIETY) g[k] = n / FOOD_VARIETY.length; addGoods(state, g); return `+${n} Nahrung (alle Sorten)`; },
  finish() { const n = finishAllSites(); return n ? `${n} Baustellen fertiggestellt` : 'Keine Baustellen'; },
  skip(m) { simulateMonths(m); return `${m === 12 ? 'Ein Jahr' : m + ' Monat'} vorgespult`; },
  harvest() {
    const mi = Math.floor(state.gameMonths) % 12;
    const m = ((7 - mi + 12) % 12 || 12) - (state.gameMonths % 1) + 0.6;
    simulateMonths(m);
    return 'Vorgespult bis in die Erntezeit';
  },
  trucks() {
    const b = state.buildings.find((q) => !q.site && q.type === 'haulage') || state.buildings.find((q) => q.type === 'landing_module');
    if (!b) return 'Zuerst das Landemodul setzen';
    b.trucks = (b.trucks || 0) + 5;
    return `Jetzt ${truckCount(state)} Lkw`;
  },
  houses() {
    let n = 0;
    for (const b of state.buildings) { const r = BUILDINGS[b.type].residents; if (r && !b.site) { b.pop = r; n++; } }
    updatePopulation(state, 0, {}); state.rev++;
    return `${n} Häuser voll belegt`;
  },
});

const saveUi = new SaveUi({
  cfg: CONFIG,
  serialize: () => { state.camera = { x: camera.x, y: camera.y, scale: camera.scale }; return serialize(state); },
  backup: () => loadSlot('backup'),
  closeMenu: () => $('menu').close(),
  async apply(data) {
    // Nie still überschreiben: aktuellen Stand sichern
    await saveSlot('backup', serialize(state));
    const st = deserialize(JSON.parse(JSON.stringify(data)), CONFIG);
    st.lastSimAt = Date.now();          // keine Nachrechnung der Zeit zwischen Export und Import
    st.settings = { ...st.settings, debug: state.settings.debug };
    startWorld(st);
    cheats.sync();
    saveNow();
    hud.toast(`Spielstand „${st.settlements[0].name}“ geladen · alter Stand gesichert`, 4000);
  },
});
menu.onOpen = () => saveUi.reset();

$('btn-zoom-in').addEventListener('click', () => { camera.zoomTo(camera.vw / 2, camera.vh / 2, (camera.target?.scale ?? camera.scale) * CONFIG.zoomStep); dirty = true; });
$('btn-zoom-out').addEventListener('click', () => { camera.zoomTo(camera.vw / 2, camera.vh / 2, (camera.target?.scale ?? camera.scale) / CONFIG.zoomStep); dirty = true; });
$('btn-home').addEventListener('click', () => {
  const c = placement.settlementCenter() || world.start;
  camera.stop();
  camera.flyToTile(c.x, c.y, 1);
  prevView = null;
  dirty = true;
});
$('btn-world').addEventListener('click', () => {
  camera.stop();
  if (prevView && camera.scale < camera.minScale * 1.6) {
    camera.fly = { x: prevView.x, y: prevView.y, scale: prevView.scale };
    prevView = null;
  } else {
    prevView = { x: camera.x, y: camera.y, scale: camera.scale };
    camera.flyToTile(world.size / 2, world.size / 2, camera.minScale);
  }
  dirty = true;
});

// --- Eingabe ----------------------------------------------------------------------------
const input = new Input(canvas, camera, {
  tap(sx, sy, type) {
    lastPointer = type;
    const t = camera.screenToTile(sx, sy, tmp);
    const x = Math.floor(t.x), y = Math.floor(t.y);
    if (roadTool) { roadPoint(x, y, type === 'mouse'); return; }
    if (placing) {
      setGhost(x, y);
      if (type === 'mouse') tryPlace();
      return;
    }
    selectAt(x, y);
    refreshState();
  },
  hover(sx, sy) {
    lastPointer = 'mouse';
    if (sx < 0) { if (overlay.hover) { overlay.hover = null; dirty = true; } return; }
    const t = camera.screenToTile(sx, sy, tmp);
    const x = Math.floor(t.x), y = Math.floor(t.y);
    if (roadTool) {
      if (roadTool.start && (!roadTool.end || roadTool.end.x !== x || roadTool.end.y !== y)) { roadTool.end = { x, y }; updateRoadPlan(); }
      if (!overlay.hover || overlay.hover.x !== x || overlay.hover.y !== y) { overlay.hover = { x, y }; dirty = true; }
      return;
    }
    if (placing) { setGhost(x, y); return; }
    if (!overlay.hover || overlay.hover.x !== x || overlay.hover.y !== y) { overlay.hover = { x, y }; dirty = true; }
  },
  change() { dirty = true; scheduleSave(4000); },
  cancel() {
    if (roadTool && roadTool.start && lastPointer === 'mouse') { roadTool.start = null; roadTool.end = null; updateRoadPlan(); }
    else if (placing || roadTool) setTool(null);
    else if (overlay.selected) { overlay.selected = null; infoPanel.hide(); dirty = true; }
  },
});

function resize() {
  // Größe des tatsächlich belegten Fensters (in der Claude-App kann das iframe höher sein als der Bildschirm)
  const r = document.body.getBoundingClientRect();
  const w = Math.round(r.width) || window.innerWidth, h = Math.round(r.height) || window.innerHeight;
  renderer.resize(w, h);
  camera.resize(w, h);
  dirty = true;
}
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(document.body);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// iOS-Homescreen-App: Nach dem ersten Öffnen der Tastatur (z. B. Siedlung benennen) bleibt die
// Ansicht um die Höhe der Statusleiste zu kurz – unten erscheint ein leerer Streifen.
// Abhilfe: nach dem Schließen der Tastatur das Layout neu vermessen lassen.
let maxViewH = window.innerHeight;
window.addEventListener('resize', () => { maxViewH = Math.max(maxViewH, window.innerHeight); });
function healViewport() {
  if (maxViewH - window.innerHeight <= 4) return;
  const el = document.body;
  el.style.display = 'none';
  void el.offsetHeight;
  el.style.display = '';
  window.scrollTo(0, 0);
  resize();
}
document.addEventListener('focusout', (e) => {
  if (!e.target || !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  setTimeout(healViewport, 140);
  setTimeout(healViewport, 600);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(healViewport, 300); });
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); else dirty = true; });
window.addEventListener('pagehide', saveNow);

// --- Hauptschleife ------------------------------------------------------------------------
let last = performance.now(), fpsT = last, frames = 0, fps = 0, lastTilt = -1;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (camera.update(dt)) dirty = true;
  if (input.update(dt)) { dirty = true; scheduleSave(4000); }
  // Simulation: fließend nach echter Zeit (im Entwicklermodus beschleunigt)
  const wall = Date.now(), gap = wall - lastTick;
  if (gap >= (speed > 1 ? 100 : 1000)) {
    const months = (gap > 5000 ? gap : gap * speed) / CONFIG.realMsPerGameMonth;
    lastTick = wall;
    afterSim(production.advance(months));
    cheatTick();
    if (wall - lastHud > (speed > 1 ? 250 : 1000)) {
      lastHud = wall;
      hud.setStock(state, life.stats);
      hud.setDate(dateText(state.gameMonths, CONFIG));
      buildMenu.refresh();
      if (infoPanel.current) { const b = state.buildings.find((q) => q.id === infoPanel.current); if (b) infoPanel.updateBuilding(b, infoCtx()); }
      if (economy.isOpen) economy.render(false);
      if (placing) updateGhost();
      scheduleSave(speed > 1 ? 5000 : 30000);
    }
  }
  // Menschen und Tiere (nur in der Nahansicht sichtbar, ca. 30 Bilder/s)
  if (camera.scale >= CONFIG.lodDetail) {
    lifeT += dt;
    if (lifeT >= 1 / 30) {
      const s = camera.scale, view = { x0: camera.x - camera.vw / 2 / s, y0: camera.y - camera.vh / 2 / s, x1: camera.x + camera.vw / 2 / s, y1: camera.y + camera.vh / 2 / s };
      life.update(Math.min(lifeT, 0.25), view);
      lifeT = 0;
      if (life.count) dirty = true;
    }
  } else if (state.rev !== life.rev) life.rebuild();
  if (dirty) {
    dirty = renderer.draw(camera, overlay, camera.scale >= CONFIG.lodDetail ? life : null);
    hud.setZoom(camera.scale);
    const tilt = state.settings.tilt === false ? 0 : Math.max(0, Math.min(1, (0.22 - camera.scale) / 0.16));
    if (tilt !== lastTilt) { document.documentElement.style.setProperty('--tilt', tilt.toFixed(3)); lastTilt = tilt; }
    minimap.draw(overlay.settlement);
    frames++;
  }
  if (now - fpsT > 500) {
    fps = Math.round((frames * 1000) / (now - fpsT)); frames = 0; fpsT = now;
    if (state.settings.debug) {
      const s = renderer.stats;
      hud.setDebug(true, `Bilder/s ${fps}  Frame ${s.ms.toFixed(1)} ms\nStufe ${s.level}  Zoom ${camera.scale.toFixed(4)}\nKacheln ${s.cells}  Chunks ${store.map.size}\nObjekte ${s.objects}  Figuren ${s.agents || 0}  Flächenbilder ${renderer.far.cache.size}`);
    } else hud.setDebug(false);
  }
  requestAnimationFrame(frame);
}

// --- Start ------------------------------------------------------------------------------------
async function boot() {
  await loadAssets(sprites);
  let st = null;
  const forced = params.get('seed');
  if (!forced) {
    try {
      const saved = await loadSlot('main');
      if (saved) st = deserialize(saved, CONFIG);
    } catch (err) {
      console.warn(err);
      hud.toast(`Spielstand konnte nicht geladen werden: ${err.message}`, 5000);
    }
  }
  if (!st) st = newState(forced || randomSeed(), CONFIG);
  if (params.get('debug') === '1') st.settings.debug = true;
  if (params.get('dev') === '1' || location.hash === '#dev') {   // Artifact-Seiten reichen nur #… durch
    const bar = $('devbar');
    bar.hidden = false;
    const mark = () => { for (const b of bar.querySelectorAll('button')) b.classList.toggle('active', +b.dataset.speed === speed); };
    for (const b of bar.querySelectorAll('button')) b.addEventListener('click', () => { speed = +b.dataset.speed; mark(); });
    mark();
  }
  startWorld(st);
  cheats.sync();
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 500);
  requestAnimationFrame(frame);
  // Für Tests und Fehlersuche
  window.__outpost = { camera, renderer, sprites, get world() { return world; }, get state() { return state; }, get store() { return store; }, get placement() { return placement; }, get roads() { return roads; }, setTool, setPlacing, tryPlace, buildRoad, roadPoint, get roadTool() { return roadTool; }, get production() { return production; }, get life() { return life; }, economy, setSpeed: (v) => { speed = v; }, setGhost, selectAt, isDirty: () => dirty,
    give(goods) { addGoods(state, goods); },
    simulate(months) { const r = production.advance(months); afterSim(r, true); refreshState(); return r; } };
}

boot().catch((err) => {
  console.error(err);
  $('loading').textContent = 'Start fehlgeschlagen: ' + err.message;
});
