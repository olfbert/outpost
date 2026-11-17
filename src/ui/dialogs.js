// Kleine Dialoge: Siedlung benennen.

const $ = (id) => document.getElementById(id);

export class RenameDialog {
  constructor(onSave) {
    this.dlg = $('rename');
    this.input = $('rename-input');
    this.dlg.addEventListener('close', () => {
      if (this.dlg.returnValue !== 'ok') return;
      const name = this.input.value.replace(/\s+/g, ' ').trim().slice(0, 32);
      if (name) onSave(name);
    });
    this.dlg.addEventListener('click', (e) => { if (e.target === this.dlg) this.dlg.close('cancel'); });
  }

  open(current) {
    this.input.value = current;
    this.dlg.returnValue = '';
    if (this.dlg.showModal) this.dlg.showModal(); else this.dlg.setAttribute('open', '');
    setTimeout(() => { this.input.focus(); this.input.select(); }, 50);
  }
}
