// Kontextfenster (Feld/Gebäude) und Menüdialog (Seed, neue Welt, Darstellung).

import { BUILDINGS, CATEGORY_NAMES } from '../config/buildings.js';
import { TERRAIN_INFO, OBJECT_INFO, isWater, isDeposit } from '../config/terrain.js';
import { GAME_VERSION } from '../config/gameConfig.js';
import { ROADS } from '../config/roads.js';
import { costText, fmt, GOODS } from '../config/economy.js';
import { statusInfo, recipeText } from './status.js';
import { siteStatusText } from '../simulation/construction.js';
import { LEVEL_NAMES, popLimit } from '../simulation/population.js';
import { yearlyYield, PHASE_NAMES, fieldPhase } from '../simulation/farming.js';
import { inTarget, outCap, storeCap } from '../simulation/inventory.js';
import { TRUCK } from '../simulation/logistics.js';

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('de-DE');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class InfoPanel {
  // api: { close(), demolish(id), removeRoad(x, y), rename(), togglePause(id) }
  constructor(api) {
    this.api = api;
    this.el = $('info-panel');
    this.body = $('info-body');
    $('info-close').addEventListener('click', () => this.api.close());
  }

  hide() { this.el.hidden = true; this.current = null; }

  showTile(x, y, tile, world, cfg) {
    const info = TERRAIN_INFO[tile.terrain];
    const rows = [];
    const ob = OBJECT_INFO[tile.obj];
    if (ob) {
      if (isDeposit(tile.obj)) {
        rows.push(['Vorkommen', ob.name]);
        rows.push(['Geschätzte Menge', `ca. ${nf.format(Math.round(world.depositAmount(x, y) / 10) * 10)} ${ob.unit}`]);
      } else {
        rows.push(['Bewuchs', ob.name]);
        if (ob.resource) rows.push(['Rohstoff', ob.resource]);
      }
    }
    const h = Math.round(tile.elev * 1500);
    rows.push([isWater(tile.terrain) ? 'Tiefe' : 'Höhe', `${nf.format(Math.abs(h))} m`]);
    rows.push(['Bebaubar', info.buildable && !isDeposit(tile.obj) ? 'Ja' : 'Nein']);
    rows.push(['Feld', `${nf.format(x)} / ${nf.format(y)}`]);
    this.body.innerHTML = `<h3>${esc(info.name)}</h3><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    this.el.hidden = false;
  }

  _armed(btn, label, fn) {
    let armed = false;
    btn.addEventListener('click', () => {
      if (!armed) { armed = true; btn.textContent = label; return; }
      fn();
    });
  }

  showRoad(x, y, type, shape) {
    const def = ROADS[type];
    const refund = {};
    for (const [k, v] of Object.entries(def.cost)) refund[k] = Math.floor(v / 2);
    this.body.innerHTML = `<h3>${esc(def.name)}</h3><p>${esc(def.description)}</p>
      <dl><dt>Form</dt><dd>${esc(shape)}</dd><dt>Feld</dt><dd>${nf.format(x)} / ${nf.format(y)}</dd>
      <dt>Erstattung</dt><dd>${esc(costText(refund))}</dd></dl>
      <button class="btn danger" id="info-remove">Wegstück entfernen</button>`;
    this._armed($('info-remove'), 'Wirklich entfernen?', () => this.api.removeRoad(x, y));
    this.el.hidden = false;
  }

  // Nur die Zahlen eines offenen Gebäudefensters aktualisieren
  updateBuilding(b, ctx) {
    if (this.el.hidden || this.current !== b.id) return;
    if (ctx) this.ctx = ctx;
    // Baustelle fertig geworden: ganzes Fenster neu aufbauen
    if (this._wasSite && !b.site && this.api.reopen) { this._wasSite = false; this.api.reopen(b); return; }
    this._wasSite = !!b.site;
    const box = $('info-prod');
    if (box) box.innerHTML = this._prodHtml(b);
  }

  _rows(rows) { return `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`; }

  _prodHtml(b) {
    const def = BUILDINGS[b.type];
    if (b.site) {
      const st = b.site;
      const mats = Object.entries(st.need).map(([g, v]) => `${fmt((st.used[g] || 0) + (st.have?.[g] || 0))} / ${fmt(v)} ${GOODS[g].name}`);
      const lack = st.status.startsWith('material:') ? st.status.split(':')[1] : '';
      const rows = [['Fortschritt', `${Math.floor(st.progress * 100)} %`], ['Bauzeit gesamt', `ca. ${Math.max(1, Math.round(st.months * 24 * 60))} Minuten`]];
      if (mats.length) rows.push(['Material angeliefert', mats.join(' · ')]);
      return `<p><span class="status-dot ${st.status === 'building' ? 'st-running' : 'st-warn'}"></span>${esc(siteStatusText(b))}${lack ? ` (${esc(GOODS[lack].name)} fehlt)` : ''}</p>
        <div class="progress"><span style="width:${Math.floor(st.progress * 100)}%"></span></div>${this._rows(rows)}`;
    }
    let html = '';
    if (def.residents) {
      const lvl = b.level ?? 1;
      const lim = popLimit(b, this.ctx?.variety ?? 0);
      const rows = [['Bewohner', `${Math.floor(b.pop || 0)} von ${def.residents}${lim < def.residents ? ` (mehr erst mit ${def.needsVariety.min} Nahrungssorten)` : ''}`],
        ['Versorgung', b._sup === false ? 'Kein Laden in Reichweite' : LEVEL_NAMES[lvl]]];
      if (def.upkeep) rows.push(['Betriebskosten', `${fmt(def.upkeep)} Cr / Monat`]);
      html += `<p><span class="status-dot ${lvl >= 2 ? 'st-running' : lvl === 1 ? 'st-paused' : 'st-warn'}"></span>${esc(b._sup === false ? 'Unversorgt – Lebensmittelladen bauen' : LEVEL_NAMES[lvl])}</p>${this._rows(rows)}`;
    }
    if (def.farm && def.farm.kind === 'field') {
      const s = statusInfo(b.status);
      const mi = Math.floor((this.ctx?.gameMonths || 0)) % 12;
      const rows = [['Felder', `${b.fields?.length || 0} von ${def.farm.max}`], ['Sorte', GOODS[b.crop]?.name || '–'],
        ['Felder jetzt', PHASE_NAMES[fieldPhase(mi)]], ['Wachstum', `${Math.floor((b.growth || 0) * 100)} %`],
        ['Ertrag pro Jahr', `bis ${fmt(yearlyYield(b))} ${GOODS[b.crop]?.name || ''}`]];
      if (b.harvested) rows.push(['Letzte Ernte', `${fmt(b.harvested)} ${GOODS[b.harvestCrop || b.crop]?.name || ''}`]);
      rows.push(['Arbeiter', `${b.staff ?? 0} von ${def.workers}`], ['Betriebskosten', `${fmt(def.upkeep || 0)} Cr / Monat`]);
      return `<p><span class="status-dot ${s.cls}"></span>${esc(s.text)}</p>${this._rows(rows)}`;
    }
    if (!def.production) {
      const rows = [];
      const pv = def.provides || {};
      if (pv.storage || pv.bulkStorage) {
        const inv = Object.entries(b.inv || {}).filter(([, v]) => v >= 1).sort((a, c) => c[1] - a[1]);
        rows.push(['Platz je Ware', pv.storage ? fmt(pv.storage) : `${fmt(pv.bulkStorage)} (nur Schüttgut)`]);
        rows.push(['Bestand', inv.length ? inv.map(([g, v]) => `${fmt(v)} ${GOODS[g].name}`).join(' · ') : 'leer']);
      }
      if (pv.supplyRadius && !pv.storage) {
        const food = Object.entries(b.inBuf || {}).filter(([, v]) => v >= 1);
        rows.push(['Vorrat', food.length ? food.map(([g, v]) => `${fmt(v)} ${GOODS[g].name}`).join(' · ') : 'leer – Lkw bringen Nahrung aus dem Lager']);
        rows.push(['Versorgt', `${fmt(b._demand ? b._demand / 4 : 0)} Bewohner im Umkreis von ${pv.supplyRadius} Feldern`]);
      }
      if (pv.trucks || b.trucks) rows.push(['Lkw', `${(pv.trucks || 0) + (b.trucks || 0)}${b.type === 'haulage' ? ` von ${pv.trucks + TRUCK.perDepot - 2}` : ''}`]);
      if (def.workers) rows.push(['Arbeiter', `${b.staff ?? 0} von ${def.workers}`]);
      if (def.upkeep || b.trucks) rows.push(['Betriebskosten', `${fmt((def.upkeep || 0) + (b.trucks || 0) * TRUCK.upkeep)} Cr / Monat`]);
      if (rows.length) html += this._rows(rows);
      return html;
    }
    const s = statusInfo(b.status);
    const rows = [['Rezept', recipeText(def) + ' je Monat'], ['Diesen Monat', fmt(b.stats?.out || 0) + ' hergestellt']];
    const inp = Object.keys(def.production.inputs || {});
    if (inp.length) rows.push(['Eingang', inp.map((g) => `${fmt(b.inBuf?.[g] || 0)} / ${fmt(inTarget(def, g))} ${GOODS[g].name}`).join(' · ')]);
    rows.push(['Abholbereit', Object.keys(def.production.outputs).map((g) => `${fmt(b.outBuf?.[g] || 0)} / ${fmt(outCap(b, def, g))} ${GOODS[g].name}`).join(' · ')]);
    if (def.workers) rows.push(['Arbeiter', `${b.staff ?? 0} von ${def.workers}`]);
    if (def.farm && def.farm.kind === 'pasture') rows.push(['Weide', `${b.fields?.length || 0} von ${def.farm.max} Feldern`]);
    if (b.stats?.last) rows.push(['Vormonat', fmt(b.stats.last.out) + ' hergestellt']);
    if (b.reserve !== undefined) rows.push(['Restvorrat', `${fmt(Math.max(0, b.reserve - b.extracted))} von ${fmt(b.reserve)}`]);
    if (b.treesLeft !== undefined) rows.push(['Bäume in Reichweite', fmt(b.treesLeft)]);
    rows.push(['Betriebskosten', `${fmt(def.upkeep || 0)} Cr / Monat`]);
    return `<p><span class="status-dot ${s.cls}"></span>${esc(s.text)}</p><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  }

  showBuilding(b, refund, settlementName, ctx) {
    const def = BUILDINGS[b.type];
    this.current = b.id;
    this.ctx = ctx;
    this._wasSite = !!b.site;
    const actions = [];
    if (!b.site && def.farm && def.farm.kind === 'field') actions.push(`<button class="btn" id="info-crop">Sorte wechseln zu ${b.crop === 'grain' ? 'Kartoffeln' : 'Getreide'}</button>`);
    if (!b.site && def.workers) actions.push(`<button class="btn" id="info-prio">${b.priority ? 'Vorrang aufheben' : 'Vorrang bei Arbeitern'}</button>`);
    if (!b.site && b.type === 'haulage' && (b.trucks || 0) < TRUCK.perDepot - 2) actions.push(`<button class="btn" id="info-truck">Lkw kaufen (${fmt(TRUCK.price)} Cr, ${TRUCK.upkeep} Cr / Monat)</button>`);
    this.body.innerHTML = `<h3>${esc(def.name)}${b.site ? ' <small>(Baustelle)</small>' : ''}</h3><p>${esc(def.description)}</p>
      <dl><dt>Kategorie</dt><dd>${esc(CATEGORY_NAMES[def.category] || def.category)}</dd>
      <dt>Größe</dt><dd>${def.footprint.width} × ${def.footprint.height} Felder</dd>
      <dt>Siedlung</dt><dd>${esc(settlementName)}</dd>
      <dt>Baukosten</dt><dd>${esc(costText(def.buildCost))}</dd>
      <dt>Standort</dt><dd>${nf.format(b.x)} / ${nf.format(b.y)}</dd></dl>
      <div id="info-prod">${this._prodHtml(b)}</div>
      ${actions.join('')}
      ${(def.production || def.farm) && !b.site ? `<button class="btn" id="info-pause">${b.paused ? 'Betrieb fortsetzen' : 'Betrieb pausieren'}</button>` : ''}
      ${b.type === 'landing_module' ? '<button class="btn" id="info-rename">Siedlung umbenennen</button>' : ''}
      <button class="btn danger" id="info-demolish">${b.site ? 'Baustelle abbrechen' : 'Abreißen'} (Erstattung ${esc(costText(refund))})</button>`;
    if ($('info-crop')) $('info-crop').addEventListener('click', () => this.api.setCrop(b.id, b.crop === 'grain' ? 'potatoes' : 'grain'));
    if ($('info-prio')) $('info-prio').addEventListener('click', () => this.api.togglePriority(b.id));
    if ($('info-truck')) $('info-truck').addEventListener('click', () => this.api.buyTruck(b.id));
    if ($('info-rename')) $('info-rename').addEventListener('click', () => this.api.rename());
    if ($('info-pause')) $('info-pause').addEventListener('click', () => this.api.togglePause(b.id));
    this._armed($('info-demolish'), b.site ? 'Wirklich abbrechen?' : 'Wirklich abreißen?', () => this.api.demolish(b.id));
    this.el.hidden = false;
  }
}

export class MenuDialog {
  // api: { getInfo(), newWorld(seed), setOption(key, value) }
  constructor(api) {
    this.api = api;
    this.dlg = $('menu');
    this.warn = $('menu-warn');
    this.armed = false;
    $('btn-menu').addEventListener('click', () => this.open());
    $('menu-copy').addEventListener('click', async () => {
      const seed = $('menu-seed').textContent;
      try { await navigator.clipboard.writeText(seed); $('menu-copy').textContent = 'Kopiert'; } catch { $('menu-copy').textContent = 'Nicht möglich'; }
      setTimeout(() => { $('menu-copy').textContent = 'Kopieren'; }, 1500);
    });
    $('menu-generate').addEventListener('click', () => {
      const info = this.api.getInfo();
      if ((info.buildings > 0 || info.roads > 0) && !this.armed) {
        this.armed = true;
        this.warn.textContent = `Die aktuelle Siedlung (${info.buildings} Gebäude) wird ersetzt. Der bisherige Stand bleibt als Sicherung erhalten. Zum Bestätigen erneut tippen.`;
        this.warn.hidden = false;
        return;
      }
      const seed = $('menu-newseed').value.trim().toUpperCase();
      this.dlg.close();
      this.api.newWorld(seed);
    });
    $('opt-minimap').addEventListener('change', (e) => this.api.setOption('minimap', e.target.checked));
    $('opt-debug').addEventListener('change', (e) => this.api.setOption('debug', e.target.checked));
    $('opt-tilt').addEventListener('change', (e) => this.api.setOption('tilt', e.target.checked));
    $('opt-clouds').addEventListener('change', (e) => this.api.setOption('clouds', e.target.checked));
    $('opt-cheats').addEventListener('change', (e) => this.api.setCheats && this.api.setCheats(e.target.checked));
    this.dlg.addEventListener('click', (e) => { if (e.target === this.dlg) this.dlg.close(); });
  }

  open() {
    const info = this.api.getInfo();
    if (this.onOpen) this.onOpen();
    this.armed = false;
    this.warn.hidden = true;
    $('menu-seed').textContent = info.seed;
    $('menu-size').textContent = `${nf.format(info.size)} × ${nf.format(info.size)} Felder (ca. ${nf.format(Math.round(info.size * info.metersPerTile / 1000))} km Kantenlänge)`;
    $('menu-buildings').textContent = `${nf.format(info.buildings)} · Wegfelder ${nf.format(info.roads)}`;
    $('menu-newseed').value = '';
    $('opt-minimap').checked = info.settings.minimap;
    $('opt-debug').checked = info.settings.debug;
    $('opt-tilt').checked = info.settings.tilt !== false;
    $('opt-cheats').checked = !!(info.settings.cheats && info.settings.cheats.on);
    $('opt-clouds').checked = info.settings.clouds !== false;
    $('menu-version').textContent = `Version ${GAME_VERSION} · Stufe B+D (Logistik, Brücken, Nachbarn, Handel)${info.settings.cheats && info.settings.cheats.used ? ' · Spielstand mit Cheats' : ''}` + (info.storage ? '' : ' · Speichern in dieser Ansicht nicht verfügbar');
    if (this.dlg.showModal) this.dlg.showModal(); else this.dlg.setAttribute('open', '');
  }
}
