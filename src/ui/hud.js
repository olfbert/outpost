// Obere Leiste, Hinweise, Meldungen und Leistungsanzeige.

import { zoomName } from '../config/gameConfig.js';
import { GOODS, HUD_GOODS, FOOD_IDS, fmt } from '../config/economy.js';

const $ = (id) => document.getElementById(id);
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export class Hud {
  constructor() {
    this.name = $('settlement-name');
    this.date = $('date');
    this.zoom = $('zoom-label');
    this.hint = $('hint');
    this.toastEl = $('toast');
    this.debug = $('debug');
    this._toastTimer = 0;
    this._zoomText = '';
    this.stock = $('stock');
    this._last = {};
  }

  // Geld und Material; geänderte Werte blitzen kurz auf.
  setStock(state, pop) {
    const vals = { money: state.money };
    for (const g of HUD_GOODS) vals[g] = state.stock[g] || 0;
    const food = FOOD_IDS.reduce((s, g) => s + (state.stock[g] || 0), 0);
    vals.food = food;
    const p = state.pop;
    const months = p && p.demand > 0 ? food / p.demand : Infinity;
    const foodWarn = p && p.residents && (months < 0.5 || p.hungry > 0);
    const html = `<span class="item money${vals.money < 0 ? ' neg' : ''}" data-k="money">${vals.money < 0 ? '−' : ''}${fmt(Math.abs(vals.money))} Cr</span>` +
      HUD_GOODS.map((g) => `<span class="item" data-k="${g}">${fmt(vals[g])}<span>${GOODS[g].name}</span></span>`).join('') +
      `<span class="item${foodWarn ? ' warn' : ''}" data-k="food" title="Nahrung im Lager">${fmt(food)}<span>Nahrung</span></span>` +
      (p && p.residents ? `<span class="item${p.hungry ? ' warn' : ''}" title="Einwohner (Arbeitsplätze ${p.jobs})">${fmt(p.residents)}<span>Einwohner</span></span>` : '');
    this.stock.innerHTML = html;
    for (const [k, v] of Object.entries(vals)) {
      if (this._last[k] !== undefined && Math.floor(this._last[k]) !== Math.floor(v)) this.stock.querySelector(`[data-k="${k}"]`)?.classList.add('flash');
    }
    this._last = vals;
  }

  setSettlement(name) { this.name.textContent = name; }

  setDate(d) { this.date.textContent = typeof d === 'string' ? d : `${MONTHS[d.month - 1]} · Jahr ${d.year}`; }

  setZoom(scale) {
    const t = zoomName(scale);
    if (t !== this._zoomText) { this._zoomText = t; this.zoom.textContent = t; }
  }

  setHint(text) {
    if (!text) { this.hint.hidden = true; return; }
    this.hint.textContent = text;
    this.hint.hidden = false;
  }

  toast(text, ms = 2600) {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { this.toastEl.hidden = true; }, ms);
  }

  setDebug(on, text) {
    this.debug.hidden = !on;
    if (on && text !== undefined) this.debug.textContent = text;
  }
}
