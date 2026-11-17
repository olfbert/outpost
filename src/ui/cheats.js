// Cheat-Modus: Geld, Waren, Zeitraffer, sofort/kostenlos bauen.
// Schalter liegen in state.settings.cheats und werden mit dem Spielstand gespeichert.

const $ = (id) => document.getElementById(id);

export const CHEAT_DEFAULTS = { on: false, instant: false, free: false, unlock: false, money: false, used: false };

export function cheat(state, key) {
  const c = state && state.settings && state.settings.cheats;
  return !!(c && c.on && c[key]);
}

export class CheatPanel {
  // api: { state(), save(), toast(t), setSpeed(v), getSpeed(), money(n), goods(n), fill(), food(n), finish(), skip(m), harvest(), trucks(), houses(), refresh() }
  constructor(api) {
    this.api = api;
    this.dlg = $('cheats');
    this.btn = $('btn-cheats');
    this.btn.addEventListener('click', () => this.open());
    $('cheat-close').addEventListener('click', () => this.dlg.close());
    this.dlg.addEventListener('click', (e) => { if (e.target === this.dlg) this.dlg.close(); });
    for (const box of this.dlg.querySelectorAll('[data-cheat]')) {
      box.addEventListener('change', () => {
        const c = this.cheats();
        c[box.dataset.cheat] = box.checked;
        c.used = true;
        this.api.save();
        this.api.refresh();
      });
    }
    for (const b of this.dlg.querySelectorAll('#cheat-speed [data-speed]')) {
      b.addEventListener('click', () => { this.api.setSpeed(+b.dataset.speed); this.mark(); this.cheats().used = true; });
    }
    this.dlg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const n = +b.dataset.n || 0;
      this.cheats().used = true;
      const msg = this.api[b.dataset.act] ? this.api[b.dataset.act](n) : '';
      $('cheat-msg').textContent = msg || '';
      this.api.save();
      this.api.refresh();
    });
  }

  cheats() {
    const st = this.api.state();
    st.settings.cheats = { ...CHEAT_DEFAULTS, ...(st.settings.cheats || {}) };
    return st.settings.cheats;
  }

  // Menü-Schalter: Cheat-Modus an/aus
  setOn(on) {
    const c = this.cheats();
    c.on = on;
    if (on) c.used = true;
    if (!on) this.api.setSpeed(1);
    this.sync();
    this.api.save();
    this.api.refresh();
  }

  sync() {
    const c = this.cheats();
    this.btn.hidden = !c.on;
    for (const box of this.dlg.querySelectorAll('[data-cheat]')) box.checked = !!c[box.dataset.cheat];
    this.mark();
  }

  mark() {
    const sp = this.api.getSpeed();
    for (const b of this.dlg.querySelectorAll('#cheat-speed [data-speed]')) b.classList.toggle('active', +b.dataset.speed === sp);
    this.btn.classList.toggle('fast', sp > 1);
  }

  open() {
    this.sync();
    $('cheat-msg').textContent = '';
    this.dlg.showModal();
    // Safari springt beim Öffnen sonst ans Ende (Fokus); immer oben beginnen
    const body = this.dlg.querySelector('.dialog-body');
    requestAnimationFrame(() => { body.scrollTop = 0; });
    window.scrollTo(0, 0);
  }
}
