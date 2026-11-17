// Export und Import von Spielständen: JSON-Datei und kompakter Share-Code.
// Ein exportierter Stand ist ein teilbarer Einzelspieler-Spielstand – kein
// Mehrspieler. Beim Import wird nichts still überschrieben (siehe main.js).

import { deserialize } from '../state/gameState.js';
import { SAVE_SCHEMA_VERSION, GAME_VERSION } from '../config/gameConfig.js';

const CODE_PREFIX = 'OUTPOST1:';

// --- Datei ----------------------------------------------------------------------
export function exportFileName(data) {
  const name = (data.settlements?.[0]?.name || 'siedlung').toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-|-$/g, '');
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `outpost-${name || 'siedlung'}-${stamp}.json`;
}

export function toJson(data) {
  return JSON.stringify({ format: 'outpost-save', exportedAt: new Date().toISOString(), ...data }, null, 1);
}

// Startet einen Download. Liefert false, wenn der Browser das nicht kann
// (z. B. in eingebetteten Ansichten, die Downloads sperren).
export function downloadJson(text, fileName) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch { return false; }
}

// --- Share-Code (deflate + Base64url) ------------------------------------------------
const b64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

// Felder als sortierte Abstände speichern – macht Rodungen und Wege viel kleiner
function compact(data) {
  const d = { ...data };
  const delta = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.map((v, i) => (i ? v - s[i - 1] : v)); };
  if (Array.isArray(d.cleared)) d.cleared = { d: delta(d.cleared) };
  if (Array.isArray(d.roads)) {
    const r = [...d.roads].sort((a, b) => a[0] - b[0]);
    d.roads = { d: r.map((e, i) => (i ? e[0] - r[i - 1][0] : e[0])), t: r.map((e) => e[1]) };
  }
  if (Array.isArray(d.felled)) {
    const f = [...d.felled].sort((a, b) => a[0] - b[0]);
    d.felled = { d: f.map((e, i) => (i ? e[0] - f[i - 1][0] : e[0])), m: f.map((e) => Math.round(e[1] * 100) / 100) };
  }
  delete d.history;                       // Verlauf wird nicht geteilt
  return d;
}
function expand(d) {
  const undelta = (a) => { let acc = 0; return a.map((v) => (acc += v)); };
  if (d.cleared && !Array.isArray(d.cleared)) d.cleared = undelta(d.cleared.d || []);
  if (d.roads && !Array.isArray(d.roads)) { const k = undelta(d.roads.d || []); d.roads = k.map((v, i) => [v, d.roads.t[i]]); }
  if (d.felled && !Array.isArray(d.felled)) { const k = undelta(d.felled.d || []); d.felled = k.map((v, i) => [v, d.felled.m[i]]); }
  return d;
}

export function shareCodeSupported() { return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'; }

export async function toShareCode(data) {
  const json = JSON.stringify(compact(data));
  const bytes = new TextEncoder().encode(json);
  const packed = shareCodeSupported() ? await pipe(bytes, new CompressionStream('deflate-raw')) : bytes;
  return CODE_PREFIX + (shareCodeSupported() ? 'z' : 'r') + b64(packed);
}

// --- Einlesen ----------------------------------------------------------------------------
// Liefert { data, preview } oder wirft einen verständlichen Fehler.
export async function parseInput(text, cfg) {
  text = String(text || '').trim();
  if (!text) throw new Error('Es wurde nichts eingefügt.');
  let data;
  if (text.startsWith(CODE_PREFIX)) {
    const mode = text[CODE_PREFIX.length], body = text.slice(CODE_PREFIX.length + 1).replace(/\s+/g, '');
    let bytes;
    try { bytes = unb64(body); } catch { throw new Error('Der Share-Code ist unvollständig oder beschädigt.'); }
    if (mode === 'z') {
      if (!shareCodeSupported()) throw new Error('Dieser Browser kann komprimierte Share-Codes nicht lesen.');
      try { bytes = await pipe(bytes, new DecompressionStream('deflate-raw')); } catch { throw new Error('Der Share-Code ist beschädigt (Entpacken fehlgeschlagen).'); }
    }
    try { data = expand(JSON.parse(new TextDecoder().decode(bytes))); } catch { throw new Error('Der Share-Code enthält keinen lesbaren Spielstand.'); }
  } else if (text.startsWith('{')) {
    try { data = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
    if (data.format && data.format !== 'outpost-save') throw new Error('Das ist kein OUTPOST-Spielstand.');
  } else {
    throw new Error('Unbekanntes Format. Erwartet wird eine OUTPOST-JSON-Datei oder ein Share-Code (beginnt mit OUTPOST1:).');
  }
  if (typeof data.schema !== 'number') throw new Error('Der Spielstand hat keine Versionsangabe.');
  if (data.schema > SAVE_SCHEMA_VERSION) throw new Error(`Der Spielstand stammt aus einer neueren Spielversion (${data.gameVersion || 'unbekannt'}). Bitte das Spiel aktualisieren.`);
  // Probelauf: wirft bei unbrauchbaren Daten
  const st = deserialize(JSON.parse(JSON.stringify(data)), cfg);
  const preview = {
    seed: st.seed,
    settlement: st.settlements[0]?.name || '–',
    gameMonths: st.gameMonths,
    version: data.gameVersion || '–',
    currentVersion: GAME_VERSION,
    schema: data.schema,
    buildings: st.buildings.length,
    roads: st.roads.size,
    money: st.money,
    exportedAt: data.exportedAt || null,
  };
  return { data, preview };
}
