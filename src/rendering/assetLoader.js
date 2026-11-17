// Lädt echte Assets (z. B. aus Higgsfield) und ersetzt damit Platzhalter.
// Es werden ausschließlich Dateien geladen, die in assets/manifest.json
// eingetragen sind – keine erfundenen Pfade.
//
// Format von assets/manifest.json:
//   { "sprites": { "house_small": { "file": "buildings/residential/house_small_01.png", "ax": 40, "ay": 45 } } }
// ax/ay = Ankerpunkt im Bild: bei Gebäuden die obere Ecke der Grundfläche am
// Boden, bei Naturobjekten der Fußpunkt.

export async function loadAssets(sprites, base = 'assets/') {
  let manifest;
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (!res.ok) return { loaded: 0, failed: [] };
    manifest = await res.json();
  } catch { return { loaded: 0, failed: [] }; }
  const entries = Object.entries(manifest.sprites || {});
  const failed = [];
  let loaded = 0;
  await Promise.all(entries.map(([id, e]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { if (sprites.override(id, img, e.ax, e.ay)) loaded++; else failed.push(id); resolve(); };
    img.onerror = () => { failed.push(id); resolve(); };
    img.src = base + e.file;
  })));
  return { loaded, failed };
}
