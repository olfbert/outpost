// Platzierung von Gebäuden auf dem Raster: Prüfung (Gelände, Belegung,
// Ebenheit, Vorkommen, Weganschluss, Kosten), Setzen und Abreißen.
// Arbeitet nur auf Felddaten und Spielzustand – unabhängig vom Rendering.

import { BUILDINGS } from '../config/buildings.js';
import { T, isWater, isDeposit, isTree } from '../config/terrain.js';
import { GOODS, REFUND_RATE, fmt } from '../config/economy.js';
import { missingFor, pay } from '../state/gameState.js';
import { startSite, siteRefund } from '../simulation/construction.js';
import { fieldBox, findFieldTiles } from '../simulation/farming.js';
import { addGoods, storeUnstored, recomputeStock } from '../simulation/inventory.js';
import { cheat } from '../ui/cheats.js';

export class Placement {
  constructor(world, store, state) {
    this.world = world; this.store = store; this.state = state;
    this.production = null;   // wird von main.js gesetzt (für Vorkommen und Erstausstattung)
    this.occ = new Map();
    this.rebuild();
  }

  key(x, y) { return y * this.world.size + x; }

  rebuild() {
    this.occ.clear();
    for (const b of this.state.buildings) {
      const def = BUILDINGS[b.type];
      if (!def) continue;
      for (let j = 0; j < def.footprint.height; j++) for (let i = 0; i < def.footprint.width; i++) this.occ.set(this.key(b.x + i, b.y + j), b);
    }
    // Gebäude der Computer-Nachbarn blockieren ebenfalls
    for (const b of this.state.npcBuildings || []) {
      const def = BUILDINGS[b.type];
      for (let j = 0; j < def.footprint.height; j++) for (let i = 0; i < def.footprint.width; i++) this.occ.set(this.key(b.x + i, b.y + j), b);
    }
  }

  buildingAt(x, y) { return this.occ.get(this.key(x, y)) || null; }

  // Grenzt die Grundfläche an einen Weg? (Felder direkt neben den Kanten)
  hasRoadAccess(x, y, w, h) {
    const roads = this.state.roads;
    for (let i = 0; i < w; i++) {
      if (roads.has(this.key(x + i, y - 1)) || roads.has(this.key(x + i, y + h))) return true;
    }
    for (let j = 0; j < h; j++) {
      if (roads.has(this.key(x - 1, y + j)) || roads.has(this.key(x + w, y + j))) return true;
    }
    return false;
  }

  countTrees(cx, cy, r) {
    let n = 0;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r || !this.world.inBounds(cx + i, cy + j)) continue;
      if (isTree(this.store.tile(cx + i, cy + j).obj)) n++;
    }
    return n;
  }

  // Prüft einen Standort. (x, y) ist die obere Ecke der Grundfläche.
  validate(type, x, y) {
    const def = BUILDINGS[type];
    const w = def.footprint.width, h = def.footprint.height, req = def.requirements;
    const res = { ok: true, type, x, y, w, h, tiles: [], reasons: [], trees: 0, cost: def.buildCost, missing: [], roadOk: null, forest: null, reserve: null };
    const reasons = new Set();
    const hasLanding = this.state.buildings.some((b) => b.type === 'landing_module');
    if (def.unique && this.state.buildings.some((b) => b.type === type)) reasons.add(`${def.name} gibt es bereits`);
    if (!hasLanding && type !== 'landing_module') reasons.add('Zuerst das Landemodul setzen');
    const missingUnlock = cheat(this.state, 'unlock') ? [] : (def.unlock || []).filter((u) => !this.state.buildings.some((b) => b.type === u && !b.site));
    if (missingUnlock.length) reasons.add('Benötigt zuerst: ' + missingUnlock.map((u) => BUILDINGS[u].name).join(', '));
    let emin = Infinity, emax = -Infinity;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const tx = x + i, ty = y + j;
        let ok = true;
        if (!this.world.inBounds(tx, ty)) { ok = false; reasons.add('Außerhalb der Welt'); } else {
          const t = this.store.tile(tx, ty);
          if (t.elev < emin) emin = t.elev;
          if (t.elev > emax) emax = t.elev;
          if (this.occ.has(this.key(tx, ty))) { ok = false; reasons.add('Fläche ist belegt'); }
          else if (this.state.fieldTiles && this.state.fieldTiles.has(this.key(tx, ty))) { ok = false; reasons.add(this.state.fieldTiles.get(this.key(tx, ty)).kind === 'pasture' ? 'Hier liegt eine Weide' : 'Hier liegt ein Feld'); }
          else if (this.state.roads.has(this.key(tx, ty))) { ok = false; reasons.add('Auf dem Weg'); }
          else if (!req.terrain.includes(t.terrain)) {
            ok = false;
            reasons.add(isWater(t.terrain) ? 'Wasser' : t.terrain === T.SWAMP ? 'Sumpf trägt nicht' : 'Fels – nicht bebaubar');
          } else if (isDeposit(t.obj) && t.obj !== req.deposit) { ok = false; reasons.add(req.deposit ? 'Falsches Vorkommen' : 'Rohstoffvorkommen (für Abbau vorgesehen)'); }
          else if (isTree(t.obj)) res.trees++;
        }
        res.tiles.push({ x: tx, y: ty, ok });
        if (!ok) res.ok = false;
      }
    }
    if (emax - emin > req.maxSlope) { reasons.add('Gelände zu uneben'); res.ok = false; for (const t of res.tiles) t.ok = false; }
    if (req.roadAccess) {
      res.roadOk = this.hasRoadAccess(x, y, w, h);
      if (!res.roadOk) reasons.add('Kein Weganschluss');
    }
    if (req.nearTrees) {
      res.forest = this.countTrees(x + (w >> 1), y + (h >> 1), req.nearTrees.radius) - res.trees;
      if (res.forest < req.nearTrees.min) reasons.add(`Zu wenig Wald in der Nähe (${res.forest} von ${req.nearTrees.min} Bäumen)`);
    }
    if (def.farm && res.ok !== false) {
      res.fieldPreview = findFieldTiles(this.world, this.store, this.state, this, { type, x, y });
      if (res.fieldPreview.length < def.farm.max / 2) reasons.add(`Zu wenig freies Land (${res.fieldPreview.length} von ${def.farm.max} Feldern)`);
    }
    if (req.nearWater && this.production) {
      res.waterOk = this.production.waterNear(x, y, w, h, req.nearWater);
      if (!res.waterOk) reasons.add('Kein See oder Fluss in der Nähe');
    }
    if (req.deposit && this.production) {
      const tiles = this.production.depositTiles(req.deposit, x, y, w, h);
      res.depositTiles = tiles.length;
      res.reserve = this.production.reserveOf(tiles);
      const inside = tiles.filter((t) => t.x >= x && t.x < x + w && t.y >= y && t.y < y + h).length;
      if (!inside) reasons.add('Muss auf dem Vorkommen stehen');
    }
    // Bezahlt wird beim Setzen nur das Geld; Material holt sich die Baustelle nach und nach.
    res.missing = cheat(this.state, 'free') ? [] : missingFor(this.state, def.buildCost);
    for (const m of res.missing) if (m.good === 'money') reasons.add(`Geld fehlt (${fmt(m.have)} von ${fmt(m.need)} Cr)`);
    res.matShort = res.missing.filter((m) => m.good !== 'money');
    if (reasons.size) res.ok = false;
    res.reasons = [...reasons];
    return res;
  }

  place(type, x, y) {
    const v = this.validate(type, x, y);
    if (!v.ok) return null;
    const st = this.state, def = BUILDINGS[type];
    const instant = type === 'landing_module' || def.instant || cheat(st, 'instant');
    const free = cheat(st, 'free');
    if (!free) pay(st, type === 'landing_module' ? def.buildCost : { money: def.buildCost.money || 0 }, 1, `${def.name} ${type === 'landing_module' ? 'gelandet' : 'in Auftrag gegeben'}`);
    const b = { id: 'b' + st.nextId++, type, x, y, settlementId: st.settlements[0].id, builtAt: Date.now(), paid: free ? {} : { ...def.buildCost } };
    if (!instant) startSite(b, def);
    // sofort fertig, aber nicht kostenlos: Material wird gleich abgebucht (soweit vorhanden)
    if (instant && !free && type !== 'landing_module') { const mats = { ...def.buildCost }; delete mats.money; pay(st, mats, 1); }
    st.buildings.push(b);
    if (!st.settlements[0].foundedAt) st.settlements[0].foundedAt = b.builtAt;
    for (const t of v.tiles) {
      this.occ.set(this.key(t.x, t.y), b);
      st.cleared.add(this.key(t.x, t.y));
      st.felled.delete(this.key(t.x, t.y));
    }
    if (instant) storeUnstored(st);
    let box = null;
    if (this.production) box = this.production.initBuilding(b);
    this.store.invalidateArea(x, y, x + v.w - 1, y + v.h - 1);
    b._fieldBox = box;
    st.rev++;
    return b;
  }

  // Erstattung richtet sich nach dem tatsächlich bezahlten Preis (Preise können sich ändern)
  paidFor(b) { return b.paid || BUILDINGS[b.type].buildCost; }

  refundFor(b) {
    if (b.site) return siteRefund(b, this.paidFor(b));
    const out = {};
    for (const [k, v] of Object.entries(this.paidFor(b))) { const r = Math.floor(v * REFUND_RATE); if (r) out[k] = r; }
    return out;
  }

  remove(id) {
    const st = this.state;
    const i = st.buildings.findIndex((b) => b.id === id);
    if (i < 0) return null;
    const b = st.buildings[i];
    const refund = this.refundFor(b);
    st.buildings.splice(i, 1);
    // Bestände und Puffer des Gebäudes wandern in die übrigen Lager
    const left = {};
    for (const o of [b.inv, b.inBuf, b.outBuf]) for (const [g, v] of Object.entries(o || {})) if (v > 0) left[g] = (left[g] || 0) + v;
    if (Object.keys(left).length) addGoods(st, left);
    recomputeStock(st);
    pay(st, refund, -1, `${BUILDINGS[b.type].name} ${b.site ? 'Baustelle abgebrochen' : 'abgerissen'}`);
    b._refund = refund;
    b._fieldBox = fieldBox(b, this.world.size);
    this.rebuild();
    if (this.production) this.production.rebuildFields();
    if (b._fieldBox) this.store.invalidateArea(b._fieldBox.x0, b._fieldBox.y0, b._fieldBox.x1, b._fieldBox.y1);
    st.rev++;
    return b;
  }

  // Schwerpunkt der Siedlung (für Beschriftung und „Zur Siedlung“).
  settlementCenter() {
    const bs = this.state.buildings;
    if (!bs.length) return null;
    const lm = bs.find((b) => b.type === 'landing_module') || bs[0];
    return { x: lm.x + 1, y: lm.y + 1, name: this.state.settlements[0].name };
  }
}
