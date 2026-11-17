// Bauleiste (Gebäude und Wege) und Platzierungsleiste (Bestätigen/Abbrechen).

import { BUILDINGS, BUILD_MENU, MENU_TABS, requirementText } from '../config/buildings.js';
import { ROADS, ROAD_MENU } from '../config/roads.js';
import { costText, GOODS } from '../config/economy.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Kleines Vorschaubild eines Wegstücks (Kreuzung auf Gras).
function roadThumb(def, size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2 + 4, hw = size * 0.46, hh = hw / 2;
  const dia = (k) => { g.beginPath(); g.moveTo(cx, cy - hh * k); g.lineTo(cx + hw * k, cy); g.lineTo(cx, cy + hh * k); g.lineTo(cx - hw * k, cy); g.closePath(); };
  dia(1); g.fillStyle = '#5f7f3f'; g.fill();
  const w = def.width * 2;
  // zwei Bänder entlang der Rasterachsen
  g.save();
  dia(1); g.clip();
  g.setTransform(1, 0.5, -1, 0.5, cx, cy - hh);           // Feldraster -> Bild
  const s = hw;                                          // Kantenlänge im Raster
  g.fillStyle = def.edge; g.fillRect(0, s * (0.5 - w / 2) - 1, s, s * w + 2); g.fillRect(s * (0.5 - w / 2) - 1, 0, s * w + 2, s);
  g.fillStyle = def.colors[1]; g.fillRect(0, s * (0.5 - w / 2) + 1, s, s * w - 2); g.fillRect(s * (0.5 - w / 2) + 1, 0, s * w - 2, s);
  g.restore();
  return c;
}

export class BuildMenu {
  // api: { select(key|null), confirm(), cancel(), lockReason(key) }
  // Schlüssel: 'b:<gebäude-id>' oder 'r:<wegtyp>'
  constructor(sprites, api) {
    this.api = api;
    this.bar = $('buildbar');
    this.placeBar = $('place-bar');
    this.placeText = $('place-text');
    this.okBtn = $('place-ok');
    this.cards = new Map();
    this.active = null;
    this.tab = 'all';
    const tabs = $('buildtabs');
    for (const t of MENU_TABS) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = t.name; btn.dataset.tab = t.id;
      btn.addEventListener('click', () => this.setTab(t.id));
      tabs.append(btn);
    }
    const addCard = (key, thumb, name, cost, title, cat) => {
      const card = document.createElement('button');
      card.className = 'build-card';
      card.type = 'button';
      card.title = title;
      card.dataset.cat = cat;
      const n = document.createElement('span'); n.className = 'name'; n.textContent = name;
      const k = document.createElement('span'); k.className = 'cost';
      const [first, ...rest] = cost.split(' · ');               // Geld oben, Material darunter
      k.textContent = first;
      if (rest.length) { k.append(document.createElement('br'), rest.join(' · ')); }
      card.append(thumb, n, k);
      card.addEventListener('click', () => this.api.select(this.active === key ? null : key));
      this.bar.append(card);
      this.cards.set(key, card);
    };
    for (const id of BUILD_MENU) {
      const def = BUILDINGS[id];
      addCard('b:' + id, sprites.thumb(id, 88), def.name, costText(def.buildCost), `${def.description}\nBenötigt: ${requirementText(def)}`, def.category);
    }
    const sep = document.createElement('div'); sep.className = 'sep'; this.bar.append(sep);
    for (const r of ROAD_MENU) {
      const def = ROADS[r];
      addCard('r:' + r, roadThumb(def, 88), def.name, costText(def.cost) + '/Feld', def.description, 'roads');
    }
    this.sep = sep;
    this.setTab('all');
    this.okBtn.addEventListener('click', () => this.api.confirm());
    $('place-cancel').addEventListener('click', () => this.api.cancel());
  }

  setTab(id) {
    this.tab = id;
    const t = MENU_TABS.find((x) => x.id === id);
    for (const b of document.querySelectorAll('#buildtabs button')) b.classList.toggle('active', b.dataset.tab === id);
    for (const card of this.cards.values()) {
      const c = card.dataset.cat;
      card.hidden = !(id === 'all' || (id === 'roads' ? c === 'roads' : t.cats?.includes(c)));
    }
    this.sep.hidden = id !== 'all';
    this.bar.scrollLeft = 0;
  }

  refresh() {
    for (const [key, card] of this.cards) {
      const why = this.api.lockReason(key);
      card.classList.toggle('locked', !!why);
      card.dataset.why = why || '';
    }
  }

  setActive(key) {
    this.active = key;
    for (const [k, card] of this.cards) card.classList.toggle('active', k === key);
    this.placeBar.hidden = !key;
    if (key) this.cards.get(key)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  _costLine(cost, missing) {
    const miss = new Set(missing.map((m) => m.good));
    const parts = Object.entries(cost).filter(([, v]) => v).map(([k, v]) => {
      const t = `${new Intl.NumberFormat('de-DE').format(v)} ${k === 'money' ? 'Cr' : GOODS[k].name}`;
      return miss.has(k) ? `<span class="bad">${t}</span>` : t;
    });
    return parts.length ? 'Kosten: ' + parts.join(' · ') : 'Kosten: keine';
  }

  // v = Ergebnis der Standortprüfung eines Gebäudes
  setStatus(v, isTouch) {
    if (!v) return;
    const def = BUILDINGS[v.type];
    const size = `${def.footprint.width} × ${def.footprint.height}`;
    let status;
    if (v.ok) {
      status = `<span class="ok">Standort gültig</span>`;
      if (v.trees) status += ` · ${v.trees} ${v.trees === 1 ? 'Feld wird' : 'Felder werden'} gerodet`;
    } else {
      status = `<span class="bad">${v.reasons.map(esc).join(' · ')}</span>`;
    }
    const extra = [];
    if (v.roadOk !== null) extra.push(v.roadOk ? '<span class="ok">Weganschluss</span>' : '<span class="bad">Weganschluss fehlt</span>');
    if (v.forest !== null) extra.push(`${v.forest} Bäume im Umkreis`);
    if (v.reserve !== null) extra.push(v.reserve > 0 ? `Vorrat ca. ${new Intl.NumberFormat('de-DE').format(Math.round(v.reserve / 10) * 10)} t` : '<span class="bad">kein Vorkommen</span>');
    if (def.production && !def.farm) {
      const io = (o) => Object.entries(o).map(([g, n]) => `${n} ${GOODS[g].name}`).join(' + ');
      extra.push(`${Object.keys(def.production.inputs).length ? io(def.production.inputs) + ' → ' : ''}${io(def.production.outputs)} je Monat`);
    }
    if (def.farm && v.fieldPreview) extra.push(`${v.fieldPreview.length} ${def.farm.kind === 'pasture' ? 'Weidefelder' : 'Felder'} werden abgesteckt`);
    if (def.residents) extra.push(`${def.residents} Bewohner`);
    if (def.workers) extra.push(`${def.workers} Arbeitsplätze`);
    if (v.ok && v.matShort && v.matShort.length) extra.push(`<span class="warn">Material fehlt noch (${v.matShort.map((m) => GOODS[m.good].name).join(', ')}) – die Baustelle wartet darauf</span>`);
    if (v.type !== 'landing_module') extra.push('Entsteht als Baustelle');
    const how = isTouch ? 'Auf die Karte tippen, um den Standort zu wählen.' : 'Klicken, um zu bauen.';
    this.placeText.innerHTML = `<b>${esc(def.name)}</b> (${size} Felder)<br>${this._costLine(v.cost, v.missing)}${extra.length ? '<br>' + extra.join(' · ') : ''}<br>${status}<br><span class="muted">${how}</span>`;
    this.okBtn.disabled = !v.ok;
  }

  // Weg-Werkzeug: p = Plan oder null, start = gewählter Startpunkt
  setRoadStatus(type, p, start, isTouch) {
    const def = ROADS[type];
    let body;
    if (!start) {
      body = `<span class="muted">${isTouch ? 'Startfeld antippen.' : 'Startfeld anklicken.'}</span>`;
    } else if (!p) {
      body = `<span class="muted">${isTouch ? 'Jetzt das Zielfeld antippen.' : 'Zielfeld anklicken (der Weg folgt der Maus).'}</span>`;
    } else {
      const status = p.ok ? `<span class="ok">${p.newTiles} neue Felder</span>${p.trees ? ` · ${p.trees} gerodet` : ''}` : `<span class="bad">${p.reasons.map(esc).join(' · ')}</span>`;
      body = `${this._costLine(p.cost, p.missing)}<br>${status}<br><span class="muted">${isTouch ? 'Anderes Zielfeld antippen oder bauen.' : 'Klicken, um zu bauen. Esc bricht ab.'}</span>`;
    }
    this.placeText.innerHTML = `<b>${esc(def.name)}</b> · ${costText(def.cost)} je Feld<br>${body}`;
    this.okBtn.disabled = !(p && p.ok);
  }
}
