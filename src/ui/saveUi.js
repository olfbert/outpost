// Oberfläche für Export, Import und Sicherung (im Menü).

import { toJson, downloadJson, exportFileName, toShareCode, parseInput, shareCodeSupported } from '../save/transfer.js';
import { dateText } from '../simulation/gameClock.js';
import { fmt } from '../config/economy.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class SaveUi {
  // api: { serialize(), apply(data), backup(), cfg, closeMenu() }
  constructor(api) {
    this.api = api;
    this.msg = $('save-msg');
    this.text = $('save-text');
    this.textRow = $('save-text-row');
    this.dlg = $('importdlg');
    this.pending = null;

    $('save-export').addEventListener('click', () => this.exportFile());
    $('save-code').addEventListener('click', () => this.exportCode());
    $('save-paste').addEventListener('click', () => this.showText('', 'import'));
    $('save-text-ok').addEventListener('click', () => this.check(this.text.value));
    $('save-text-copy').addEventListener('click', () => this.copy(this.text.value));
    $('save-file').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) { this.say('Die Datei ist zu groß für einen Spielstand.', true); return; }
      this.check(await f.text());
    });
    $('save-restore').addEventListener('click', async () => {
      const b = await this.api.backup();
      if (!b) { this.say('Es gibt noch keine Sicherung. Sie entsteht automatisch vor jedem Import und jeder neuen Welt.', true); return; }
      this.check(JSON.stringify(b), 'Sicherung');
    });
    $('import-cancel').addEventListener('click', () => { this.pending = null; this.dlg.close(); });
    $('import-ok').addEventListener('click', async () => {
      const p = this.pending;
      this.dlg.close();
      if (!p) return;
      await this.api.apply(p.data);
      this.pending = null;
      this.api.closeMenu();
    });
  }

  reset() { this.msg.hidden = true; this.text.hidden = true; this.textRow.hidden = true; }

  say(text, bad = false) {
    this.msg.textContent = text;
    this.msg.classList.toggle('ok', !bad);
    this.msg.hidden = false;
  }

  showText(value, mode) {
    this.text.value = value;
    this.text.hidden = false;
    this.textRow.hidden = false;
    $('save-text-ok').hidden = mode !== 'import';
    $('save-text-copy').hidden = mode === 'import';
    if (mode === 'import') this.text.focus();
  }

  async copy(value) {
    try { await navigator.clipboard.writeText(value); this.say('In die Zwischenablage kopiert.'); return true; }
    catch { this.text.select(); this.say('Kopieren nicht erlaubt – bitte den markierten Text von Hand kopieren.', true); return false; }
  }

  exportFile() {
    const data = this.api.serialize();
    const json = toJson(data);
    const ok = downloadJson(json, exportFileName(data));
    // In manchen Ansichten (z. B. eingebettet) sind Downloads gesperrt: Text zum Kopieren anbieten
    this.showText(json, 'export');
    this.say(ok ? `Datei „${exportFileName(data)}“ wird heruntergeladen. Falls nichts passiert: Text unten kopieren und als .json speichern.` : 'Download nicht möglich – Text unten kopieren und als .json speichern.');
  }

  async exportCode() {
    const code = await toShareCode(this.api.serialize());
    this.showText(code, 'export');
    const copied = await this.copy(code);
    if (copied) this.say(`Share-Code kopiert (${fmt(code.length)} Zeichen${shareCodeSupported() ? ', komprimiert' : ''}).`);
  }

  async check(text, label = 'Import') {
    try {
      const { data, preview } = await parseInput(text, this.api.cfg);
      this.pending = { data, preview };
      const rows = [
        ['Quelle', label],
        ['Siedlung', preview.settlement],
        ['Welt-Seed', preview.seed],
        ['Spielzeit', dateText(preview.gameMonths, this.api.cfg)],
        ['Gebäude / Wegfelder', `${fmt(preview.buildings)} / ${fmt(preview.roads)}`],
        ['Geld', `${fmt(preview.money)} Cr`],
        ['Version', preview.version === preview.currentVersion ? preview.version : `${preview.version} (wird auf ${preview.currentVersion} angehoben)`],
      ];
      if (preview.exportedAt) rows.push(['Exportiert', new Date(preview.exportedAt).toLocaleString('de-DE')]);
      $('import-preview').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
      $('import-note').textContent = 'Der aktuelle Spielstand wird vorher als Sicherung abgelegt und lässt sich über „Sicherung laden“ zurückholen. Die Spielzeit des importierten Stands läuft ab jetzt weiter.';
      if (this.dlg.showModal) this.dlg.showModal(); else this.dlg.setAttribute('open', '');
    } catch (err) {
      this.say(err.message || String(err), true);
    }
  }
}
