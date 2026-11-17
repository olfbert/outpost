// Wirtschaftsfenster: Lager und Verkauf, Monatsbilanz, Betriebe.

import { GOODS, GOOD_IDS, FOOD_IDS, fmt } from '../config/economy.js';
import { totalCap } from '../simulation/inventory.js';
import { BUILDINGS } from '../config/buildings.js';
import { monthLabel } from '../simulation/gameClock.js';
import { statusInfo, recipeText } from './status.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class EconomyPanel {
  // api: { state(), capacity(), sell(good, amount), cfg, focus(building) }
  constructor(api) {
    this.api = api;
    this.dlg = $('economy');
    this.body = $('eco-body');
    this.tab = 'stock';
    $('eco-close').addEventListener('click', () => this.dlg.close());
    this.dlg.addEventListener('click', (e) => { if (e.target === this.dlg) this.dlg.close(); });
    for (const t of this.dlg.querySelectorAll('.tab')) {
      t.addEventListener('click', () => { this.tab = t.dataset.tab; this.render(true); });
    }
    this.body.addEventListener('click', (e) => this._click(e));
  }

  get isOpen() { return this.dlg.open; }

  open(tab) {
    if (tab) this.tab = tab;
    this.render(true);
    if (this.dlg.showModal) this.dlg.showModal(); else this.dlg.setAttribute('open', '');
  }

  _click(e) {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const good = b.dataset.good, st = this.api.state();
    const input = this.body.querySelector(`input[data-good="${good}"]`);
    if (b.dataset.act === 'set') { input.value = b.dataset.n === 'all' ? Math.floor(st.stock[good] || 0) : Math.min(Math.floor(st.stock[good] || 0), +b.dataset.n); return; }
    if (b.dataset.act === 'sell') {
      const n = Math.floor(+input.value || 0);
      if (n > 0) this.api.sell(good, n);
      this.render(true);
    }
    if (b.dataset.act === 'focus') { this.dlg.close(); this.api.focus(b.dataset.id); }
    if (b.dataset.act === 'buy') { this.msg = this.api.buy ? this.api.buy(good, +b.dataset.n) : ''; const top = this.body.scrollTop; this.render(true); this.body.scrollTop = top; }
  }

  // full = auch Eingabefelder neu aufbauen (sonst nur Zahlen aktualisieren)
  render(full = false) {
    for (const t of this.dlg.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.tab === this.tab);
    const st = this.api.state();
    if (this.tab === 'stock') {
      const cap = this.api.capacity();
      const shown = GOOD_IDS.filter((g) => (st.stock[g] || 0) >= 1 || ['planks', 'stone', 'logs'].includes(g));
      const key = shown.join(',');
      if (full || !this.body.querySelector('.eco-row') || key !== this._shownKey) {
        this._shownKey = key;
        const rows = shown.map((g) => {
          const G = GOODS[g];
          return `<div class="eco-row" data-row="${g}">
            <div><div class="name">${esc(G.name)}</div><div class="sub" data-sub="${g}"></div></div>
            <div class="sub" style="text-align:right">${fmt(G.price)} Cr / ${esc(G.unit)}</div>
            <div class="bar"><i data-bar="${g}"></i></div>
            <div class="sellbox">
              <input type="number" min="0" step="1" inputmode="numeric" data-good="${g}" value="0" aria-label="Menge ${esc(G.name)}">
              <button class="btn small" data-act="set" data-good="${g}" data-n="10">10</button>
              <button class="btn small" data-act="set" data-good="${g}" data-n="100">100</button>
              <button class="btn small" data-act="set" data-good="${g}" data-n="all">Alles</button>
              <button class="btn small primary" data-act="sell" data-good="${g}">Verkaufen</button>
            </div></div>`;
        }).join('');
        const hist = st.history.slice(-12).reverse().map((h) => `<li><span>${esc(h.text)}</span><span>${h.money ? (h.money > 0 ? '+' : '') + fmt(h.money) + ' Cr' : ''}</span></li>`).join('');
        this.body.innerHTML = `<div id="eco-food"></div><p class="muted">Bestände aller Lager zusammen (Landemodul, Lagerhallen, Silos). Waren in den Betrieben, die noch auf Abholung warten, zählen erst, wenn ein Lkw sie ins Lager gebracht hat. Verkauf zum Festpreis an die Versorgungsflüge. Leere Waren sind ausgeblendet.</p>${rows}
          <h3>Verlauf</h3><ul class="hist">${hist || '<li>Noch keine Buchungen</li>'}</ul>`;
      }
      const food = this.body.querySelector('#eco-food');
      const p = st.pop;
      if (food && p) {
        const total = FOOD_IDS.reduce((n, g) => n + (st.stock[g] || 0), 0);
        const months = p.demand > 0 ? total / p.demand : Infinity;
        const sorts = FOOD_IDS.filter((g) => !GOODS[g].basic && (st.stock[g] || 0) >= 1).map((g) => GOODS[g].name);
        food.innerHTML = `<div class="eco-food"><b>Versorgung</b> · ${fmt(p.residents)} Einwohner essen ${fmt(p.demand)} Einheiten im Monat ·
          Nahrung reicht ${months === Infinity ? 'unbegrenzt' : months >= 12 ? 'über ein Jahr' : months < 1 ? `nur noch ${Math.max(0, Math.round(months * 30))} Tage` : `ca. ${months.toFixed(1).replace('.', ',')} Monate`}<br>
          Sorten: ${sorts.length ? esc(sorts.join(', ')) : 'nur Notrationen'}${p.unsupplied ? ` · <span class="neg">${p.unsupplied} Häuser ohne Laden in Reichweite</span>` : ''}${p.hungry ? ` · <span class="neg">${p.hungry} Häuser hungrig</span>` : ''}</div>`;
      }
      for (const g of shown) {
        const have = st.stock[g] || 0;
        const sub = this.body.querySelector(`[data-sub="${g}"]`);
        const capG = totalCap(st, g);
        if (sub) sub.textContent = `${fmt(have)} von ${fmt(capG)} ${GOODS[g].unit} in den Lagern · Wert ${fmt(have * GOODS[g].price)} Cr`;
        const bar = this.body.querySelector(`[data-bar="${g}"]`);
        if (bar) bar.style.width = `${Math.min(100, (have / Math.max(1, capG)) * 100)}%`;
      }
    } else if (this.tab === 'ledger') {
      const cur = Math.floor(st.gameMonths);
      const rows = st.ledger.slice().reverse().map((l) => {
        const net = l.income - l.build - l.upkeep;
        return `<tr><td>${monthLabel(l.month, this.api.cfg)}${l.month === cur ? ' (laufend)' : ''}</td><td class="pos">${fmt(l.income)}</td><td class="neg">${fmt(l.build)}</td><td class="neg">${fmt(l.upkeep)}</td><td class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</td></tr>`;
      }).join('');
      let upkeep = 0;
      for (const b of st.buildings) if (!b.paused && !b.site) upkeep += BUILDINGS[b.type]?.upkeep || 0;
      for (const b of st.buildings) if (!b.site) upkeep += (b.trucks || 0) * 80;
      const pop = st.pop;
      const popText = pop ? ` Einwohner: ${fmt(pop.residents)} · Arbeitsplätze: ${fmt(pop.jobs)}${pop.jobs > pop.residents ? ` – es fehlen ${fmt(pop.jobs - pop.residents)} Arbeiter, Betriebe laufen langsamer` : ''}.` : '';
      this.body.innerHTML = `<p class="muted">Betriebskosten werden am Monatsende abgebucht, ebenso kommen dann die Steuern der versorgten Bewohner herein (in den Einnahmen enthalten). Laufend: ${fmt(upkeep)} Cr je Monat. Kontostand: ${fmt(st.money)} Cr.${popText}</p>
        <table class="ledger"><thead><tr><th>Monat</th><th>Einnahmen</th><th>Bau</th><th>Betrieb</th><th>Saldo</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Noch keine Buchungen</td></tr>'}</tbody></table>`;
    } else if (this.tab === 'buy') {
      const rows = GOOD_IDS.map((g) => {
        const G = GOODS[g], price = Math.round(G.price * 2 * 100) / 100;
        return `<div class="eco-row"><div><div class="name">${esc(G.name)}</div><div class="sub">${fmt(price)} Cr je ${esc(G.unit)} · im Lager ${fmt(st.stock[g] || 0)}</div></div>
          <div class="sellbox"><button class="btn small" data-act="buy" data-good="${g}" data-n="10">+10</button><button class="btn small" data-act="buy" data-good="${g}" data-n="100">+100</button><button class="btn small primary" data-act="buy" data-good="${g}" data-n="500">+500</button></div></div>`;
      }).join('');
      this.body.innerHTML = `<p class="muted">Einkauf bei den Versorgungsflügen der Erde: jederzeit möglich, aber zum doppelten Grundpreis. Die Ware landet im Landemodul. Günstiger kaufst du bei den Nachbarn (Handelskontor, Knopf mit den Pfeilen am rechten Rand).</p>${this.msg ? `<p class="muted">${esc(this.msg)}</p>` : ''}${rows}`;
    } else if (this.tab === 'transport') {
      const L = this.api.logistics ? this.api.logistics() : null;
      const ls = L ? L.stats : {};
      const util = Math.round((ls.util || 0) * 100);
      const routes = L ? [...L.routes.values()].sort((a, c) => c.w - a.w).slice(0, 8) : [];
      const name = (id) => { const b = st.buildings.find((q) => q.id === id); return b ? BUILDINGS[b.type].name : '–'; };
      const tip = util > 85 ? 'Die Lkw sind fast voll ausgelastet – eine Spedition oder weitere Lkw helfen, ebenso Schotterwege und Lager näher an den Betrieben.'
        : (ls.waitingPickup || 0) > 0 ? 'Einige Betriebe warten auf Abholung: Prüfe, ob in den Lagern noch Platz für diese Ware ist (Silo für Schüttgut, Lagerhalle für alles).'
        : 'Der Transport läuft rund.';
      this.body.innerHTML = `<div class="eco-food"><b>${fmt(ls.trucks || 0)} Lkw</b> im Einsatz · Auslastung ${util} %<br>
        Warten auf Abholung: ${fmt(ls.waitingPickup || 0)} · Warten auf Lieferung: ${fmt(ls.waitingSupply || 0)}</div>
        <div class="bar"><span style="width:${Math.min(100, util)}%;background:${util > 85 ? 'var(--bad)' : 'var(--ok)'}"></span></div>
        <p class="muted">${esc(tip)}</p>
        <p class="muted">Häufigste Fahrten zuletzt:</p>
        ${routes.map((r) => `<div class="eco-row"><div><div class="name">${esc(name(r.from))} → ${esc(name(r.to))}</div><div class="sub">${esc(GOODS[r.good]?.name || '')}</div></div></div>`).join('') || '<p class="muted">Noch keine Fahrten.</p>'}`;
    } else {
      const prod = st.buildings.filter((b) => BUILDINGS[b.type].production || BUILDINGS[b.type].farm);
      const rows = prod.map((b) => {
        const def = BUILDINGS[b.type], s = statusInfo(b.status);
        const last = b.stats?.last ? ` · Vormonat ${fmt(b.stats.last.out)}` : '';
        const what = def.production ? recipeText(def) + ' je Monat' : `Ernte ${GOODS[b.crop]?.name || ''} im Spätsommer`;
        return `<div class="eco-row"><div><div class="name"><span class="status-dot ${s.cls}"></span>${esc(def.name)}${b.site ? ' (Baustelle)' : ''}</div>
          <div class="sub">${esc(s.text)} · ${esc(what)}${def.workers ? ` · Arbeiter ${b.staff ?? 0}/${def.workers}` : ''}</div>
          <div class="sub">Diesen Monat ${fmt(b.stats?.out || 0)} hergestellt${last}</div></div>
          <button class="btn small" data-act="focus" data-id="${b.id}">Zeigen</button></div>`;
      }).join('');
      this.body.innerHTML = rows || '<p class="muted">Noch keine Betriebe. Holzfäller, Steinbruch und Sägewerk sind ein guter Anfang.</p>';
    }
  }
}
