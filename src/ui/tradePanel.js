// Handelsfenster: Nachbarsiedlungen (Kaufen/Verkaufen) – braucht ein Handelskontor.
import { GOODS, fmt } from '../config/economy.js';
import { PROFILES, cityClass } from '../simulation/neighbors.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class TradePanel {
  // api: { state(), sites(), offersFor(id), conn(id), hasOffice(), buy(id,g,n), sell(id,g,n), focus(id), cheapest(g) }
  constructor(api) {
    this.api = api;
    this.dlg = $('trade');
    this.body = $('trade-body');
    this.tabs = $('trade-tabs');
    this.cur = null;
    $('trade-close').addEventListener('click', () => this.dlg.close());
    this.dlg.addEventListener('click', (e) => {
      if (e.target === this.dlg) { this.dlg.close(); return; }
      const t = e.target.closest('[data-tab]');
      if (t) { this.cur = t.dataset.tab; this.render(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const { act, g } = b.dataset, n = +b.dataset.n;
      if (act === 'buy') this.msg = this.api.buy(this.cur, g, n);
      else if (act === 'sell') this.msg = this.api.sell(this.cur, g, n);
      else if (act === 'focus') { this.dlg.close(); this.api.focus(this.cur); return; }
      this.render();
    });
  }

  open(id) {
    const sites = this.api.sites();
    this.cur = id || this.cur || (sites[0] && sites[0].id);
    this.msg = '';
    this.render();
    if (!this.dlg.open) this.dlg.showModal();
    requestAnimationFrame(() => { this.body.scrollTop = 0; });
  }

  render() {
    const sites = this.api.sites();
    this.tabs.innerHTML = sites.map((s) => `<button class="tab${s.id === this.cur ? ' active' : ''}" data-tab="${s.id}">${esc(s.name)}</button>`).join('');
    const s = sites.find((q) => q.id === this.cur);
    if (!s) { this.body.innerHTML = '<p class="muted">Keine Nachbarn gefunden.</p>'; return; }
    const st = this.api.state();
    const n = st.neighbors.find((q) => q.id === s.id);
    const conn = this.api.conn(s.id);
    const office = this.api.hasOffice();
    const off = this.api.offersFor(s.id);
    const head = `<div class="eco-food"><b>${esc(s.name)}</b> · ${esc(cityClass(n.size))} · ${esc(PROFILES[s.profile].name)} · etwa ${fmt(Math.round(n.size * 3))} Einwohner<br>
      ${conn.road ? `<span class="pos">Straße zur Handelsstation verbunden</span> (${fmt(conn.dist)} Felder) – Lkw liefern, kaum Aufschlag` : 'Keine Straßenverbindung – nur Luftfracht (Einkauf +35 %, Verkauf −35 %). Baue eine Straße bis zu ihrer Handelsstation.'}<br>
      Beziehung: ${Math.round(n.relation)} / 100${n.relation >= 30 ? ' – bessere Preise' : ''} · Entfernung ca. ${fmt(conn.air)} Felder</div>
      <div class="row wrap"><button class="btn small" data-act="focus">Auf der Karte zeigen</button></div>`;
    if (!office) {
      this.body.innerHTML = head + '<p class="warn">Für den Handel mit Nachbarn brauchst du ein fertiges Handelskontor (Baumenü → Logistik). Rohstoffe kaufen kannst du schon jetzt im Wirtschaftsfenster unter „Einkauf“ (Versorgungsflüge).</p>';
      return;
    }
    const row = (o, sell) => {
      const have = st.stock[o.g] || 0;
      const max = sell ? Math.min(o.qty, Math.floor(have)) : o.qty;
      const price = o.final;
      const btn = (k) => `<button class="btn small${sell ? '' : ' primary'}" data-act="${sell ? 'sell' : 'buy'}" data-g="${o.g}" data-n="${k}" ${max < 1 ? 'disabled' : ''}>${k === 9e9 ? 'Alles' : k}</button>`;
      return `<div class="eco-row"><div><div class="name">${esc(GOODS[o.g].name)}</div>
        <div class="sub">${fmt(price)} Cr je ${esc(GOODS[o.g].unit)} · ${sell ? `sucht ${fmt(o.qty)} · du hast ${fmt(have)}` : `bietet ${fmt(o.qty)}`}</div></div>
        <div class="sellbox">${btn(10)}${btn(100)}${btn(9e9)}</div></div>`;
    };
    this.body.innerHTML = head + (this.msg ? `<p class="muted">${esc(this.msg)}</p>` : '') +
      `<h3>Einkaufen – das bietet ${esc(s.name)} an</h3>${off.sell.map((o) => row(o, false)).join('')}` +
      `<h3>Verkaufen – das braucht ${esc(s.name)}</h3>${off.buy.map((o) => row(o, true)).join('')}`;
  }
}
