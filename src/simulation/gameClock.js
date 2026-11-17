// Spielzeit. 1 echter Tag = 1 Ingame-Monat (CONFIG.realMsPerGameMonth).
// Die Zeit läuft fließend als Gleitkommazahl state.gameMonths; die Simulation
// rechnet in kleinen Schritten nach – auch für Zeit, in der das Spiel zu war.

export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function dateOf(gameMonths, cfg) {
  const m = Math.floor(gameMonths);
  const day = Math.min(30, Math.floor((gameMonths - m) * 30) + 1);
  return { day, month: (m % 12) + 1, year: cfg.startYear + Math.floor(m / 12), totalMonths: m };
}

export function dateText(gameMonths, cfg) {
  const d = dateOf(gameMonths, cfg);
  return `${d.day}. ${MONTHS[d.month - 1]} · Jahr ${d.year}`;
}

export function monthLabel(totalMonths, cfg) {
  return `${MONTHS[totalMonths % 12]} ${cfg.startYear + Math.floor(totalMonths / 12)}`;
}
