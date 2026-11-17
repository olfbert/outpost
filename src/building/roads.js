// Wege und Straßen: Planung (Start -> Ziel als L-förmiger Pfad), Prüfung,
// Bauen und Entfernen. Gespeichert wird nur Feld -> Wegtyp; die Form jedes
// Stücks ergibt sich beim Zeichnen aus den Nachbarn.

import { ROADS } from '../config/roads.js';
import { T, isWater, isDeposit, isTree } from '../config/terrain.js';
import { GOODS, REFUND_RATE, fmt } from '../config/economy.js';
import { missingFor, pay } from '../state/gameState.js';

export class Roads {
  constructor(world, store, state, placement) {
    this.world = world; this.store = store; this.state = state; this.placement = placement;
  }

  key(x, y) { return y * this.world.size + x; }
  at(x, y) { return this.state.roads.get(this.key(x, y)) || 0; }

  _line(a, b, xFirst) {
    const out = [];
    let x = a.x, y = a.y;
    out.push({ x, y });
    const stepX = () => { while (x !== b.x) { x += Math.sign(b.x - x); out.push({ x, y }); } };
    const stepY = () => { while (y !== b.y) { y += Math.sign(b.y - y); out.push({ x, y }); } };
    if (xFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    return out;
  }

  tileProblem(x, y, type) {
    if (!this.world.inBounds(x, y)) return 'Außerhalb der Welt';
    if (this.placement.buildingAt(x, y)) return 'Gebäude im Weg';
    const ft = this.state.fieldTiles && this.state.fieldTiles.get(this.key(x, y));
    if (ft) return ft.kind === 'pasture' ? 'Weide im Weg' : 'Feld im Weg';
    const t = this.store.tile(x, y);
    if (isWater(t.terrain)) return 'Wasser (Brücken folgen später)';
    if (t.terrain === T.SWAMP) return 'Sumpf';
    if (!ROADS[type].terrain.includes(t.terrain)) return 'Fels';
    if (isDeposit(t.obj)) return 'Rohstoffvorkommen';
    return '';
  }

  // Plant einen Weg von a nach b und prüft ihn. Wählt die Knickrichtung mit
  // weniger Problemen.
  plan(type, a, b) {
    const variants = [this._line(a, b, true)];
    if (a.x !== b.x && a.y !== b.y) variants.push(this._line(a, b, false));
    let best = null;
    for (const path of variants) {
      const r = this._check(type, path);
      if (!best || r.bad < best.bad || (r.bad === best.bad && r.cost.money < best.cost.money)) best = r;
    }
    return best;
  }

  _check(type, path) {
    const def = ROADS[type];
    const tiles = [], reasons = new Set();
    let bad = 0, newTiles = 0, trees = 0;
    for (const p of path) {
      const why = this.tileProblem(p.x, p.y, type);
      const existing = why ? 0 : this.at(p.x, p.y);
      const same = existing === type;
      if (why) { bad++; reasons.add(why); }
      else if (!same) { newTiles++; if (isTree(this.store.tile(p.x, p.y).obj)) trees++; }
      tiles.push({ x: p.x, y: p.y, ok: !why, same });
    }
    const cost = {};
    for (const [k, v] of Object.entries(def.cost)) cost[k] = v * newTiles;
    const missing = missingFor(this.state, cost);
    for (const m of missing) reasons.add(`${GOODS[m.good].name} fehlt (${fmt(m.have)} von ${fmt(m.need)})`);
    if (!newTiles && !bad) reasons.add('Weg besteht schon');
    return { kind: 'road', type, tiles, newTiles, trees, bad, cost, missing, reasons: [...reasons], ok: bad === 0 && newTiles > 0 && !missing.length };
  }

  build(plan) {
    if (!plan.ok) return null;
    const st = this.state;
    pay(st, plan.cost, 1, `${plan.newTiles} Felder ${ROADS[plan.type].name}`);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of plan.tiles) {
      if (t.same) continue;
      const k = this.key(t.x, t.y);
      st.roads.set(k, plan.type);
      st.cleared.add(k);
      st.felled.delete(k);
      x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y);
    }
    this.store.invalidateArea(x0 - 1, y0 - 1, x1 + 1, y1 + 1);
    st.rev++; st.roadRev = (st.roadRev || 0) + 1;
    return { x0, y0, x1, y1 };
  }

  remove(x, y) {
    const type = this.at(x, y);
    if (!type) return 0;
    this.state.roads.delete(this.key(x, y));
    pay(this.state, ROADS[type].cost, -REFUND_RATE, `${ROADS[type].name} entfernt`);
    this.store.invalidateArea(x - 1, y - 1, x + 1, y + 1);
    this.state.rev++; this.state.roadRev = (this.state.roadRev || 0) + 1;
    return type;
  }

  // Form eines Wegstücks als lesbarer Name (für das Infofenster).
  shapeName(x, y) {
    const n = [this.at(x, y - 1), this.at(x + 1, y), this.at(x, y + 1), this.at(x - 1, y)].map(Boolean);
    const c = n.filter(Boolean).length;
    if (c === 4) return 'Kreuzung';
    if (c === 3) return 'T-Kreuzung';
    if (c === 2) return (n[0] && n[2]) || (n[1] && n[3]) ? 'Gerade' : 'Kurve';
    if (c === 1) return 'Sackgasse';
    return 'Einzelstück';
  }
}
