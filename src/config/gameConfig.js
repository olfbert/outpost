// Zentrale Spielkonfiguration. Alle Werte hier sind bewusst leicht anpassbar.

export const GAME_VERSION = '0.8.1';
export const SAVE_SCHEMA_VERSION = 7;

export const CONFIG = {
  // --- Welt ---------------------------------------------------------------
  worldSize: 8192,        // Kantenlänge der Welt in Feldern (Config-Wert, nach oben offen)
  chunkSize: 16,          // Felder pro Chunk-Kante
  tileW: 64,              // Breite eines Feldes in Welt-Pixeln (2:1-Isometrie)
  tileH: 32,
  metersPerTile: 10,      // nur für Anzeige/Maßstab

  // --- Kamera -------------------------------------------------------------
  maxScale: 3,            // Nahansicht
  startScale: 1,
  zoomStep: 1.35,         // Faktor pro Zoom-Schaltfläche

  // --- Detailstufen (LOD) -------------------------------------------------
  // scale >= lodDetail  : volle Auflösung, Objekte einzeln und tiefensortiert
  // scale >= lodHalf    : Chunks in halber Auflösung, Objekte eingebacken
  // scale >= lodQuarter : Chunks in Viertelauflösung
  // darunter            : Flächendarstellung (Wälder als Flächen, Flüsse als Linien)
  lodDetail: 0.5,
  lodHalf: 0.25,
  lodQuarter: 0.125,
  lodFadeEnd: 0.16,       // bis hier wird die Flächendarstellung übergeblendet

  // --- Leistung -----------------------------------------------------------
  frameBudgetMs: 9,       // Zeitbudget pro Frame für Chunk-Erzeugung
  maxDevicePixelRatio: 2,

  // --- Zeit (Phase 4 baut darauf auf) --------------------------------------
  realMsPerGameMonth: 24 * 60 * 60 * 1000, // 1 echter Tag = 1 Ingame-Monat
  startYear: 1,
  regrowSaplingMonths: 4,  // gefällter Baum: nach 4 Monaten junger Baum
  regrowTreeMonths: 12,    // nach 12 Monaten wieder ausgewachsen

  // --- Wirtschaft -----------------------------------------------------------
  startBudget: 25000,     // Startgeld in Cr; Startmaterial in config/economy.js
};

export const ZOOM_NAMES = [
  { min: 0.75, name: 'Nahansicht' },
  { min: 0.2, name: 'Siedlungsansicht' },
  { min: 0.03, name: 'Regionsansicht' },
  { min: 0.004, name: 'Großraumansicht' },
  { min: 0, name: 'Weltübersicht' },
];

export function zoomName(scale) {
  for (const z of ZOOM_NAMES) if (scale >= z.min) return z.name;
  return ZOOM_NAMES[ZOOM_NAMES.length - 1].name;
}
