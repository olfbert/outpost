// Lesbare Betriebszustände für Produktionsgebäude.
import { GOODS } from '../config/economy.js';

export function statusInfo(status) {
  const [kind, good] = String(status || 'idle').split(':');
  const g = good ? GOODS[good]?.name : '';
  switch (kind) {
    case 'running': return { text: 'Läuft', cls: 'st-running' };
    case 'input': return { text: `Wartet auf Lieferung: ${g}`, cls: 'st-warn' };
    case 'full': return { text: `Wartet auf Abholung: ${g} (Lkw oder Lagerplatz fehlen)`, cls: 'st-warn' };
    case 'exhausted': return { text: 'Vorkommen erschöpft', cls: 'st-stop' };
    case 'notrees': return { text: 'Kein Wald mehr in Reichweite', cls: 'st-stop' };
    case 'paused': return { text: 'Pausiert', cls: 'st-paused' };
    case 'site': return { text: 'Im Bau', cls: 'st-paused' };
    case 'staff': return { text: 'Zu wenig Arbeiter', cls: 'st-warn' };
    case 'hungry': return { text: 'Arbeiter hungrig – langsamer', cls: 'st-warn' };
    case 'pasture': return { text: 'Weide zu klein – weniger Vieh', cls: 'st-warn' };
    case 'nopasture': return { text: 'Kein Platz für eine Weide', cls: 'st-stop' };
    case 'nofields': return { text: 'Kein Platz für Felder', cls: 'st-stop' };
    case 'nowater': return { text: 'Kein Wasser in der Nähe', cls: 'st-stop' };
    case 'growing': return { text: 'Felder wachsen', cls: 'st-running' };
    case 'harvest': return { text: 'Ernte läuft', cls: 'st-running' };
    case 'noharvest': return { text: 'Nichts zu ernten (zu spät gesät)', cls: 'st-warn' };
    case 'winter': return { text: 'Winterruhe', cls: 'st-paused' };
    case 'fallow': return { text: 'Felder abgeerntet – Aussaat im März', cls: 'st-paused' };
    default: return { text: 'Bereit', cls: 'st-paused' };
  }
}

export function recipeText(def) {
  const p = def.production;
  if (!p) return '';
  const io = (o) => Object.entries(o).map(([g, n]) => `${n} ${GOODS[g].name}`).join(' + ');
  return `${Object.keys(p.inputs).length ? io(p.inputs) + ' → ' : ''}${io(p.outputs)}`;
}
