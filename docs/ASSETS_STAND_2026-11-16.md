# Asset-Stand 16.11.2026 (Higgsfield-Testlauf eingebaut)

Fortschreibung von `docs/ASSETS.md` (dort unverändert: Vorgaben, Prompts, ursprüngliche Liste).

## Status

| Sprite-ID | Datei (unter `assets/`) | Größe (px) | Transparenz | Status |
|---|---|---|---|---|
| landing_module | buildings/landing/landing_module_01.png | 164 × 156 | ja | geprüft, im Spiel |
| house_small | buildings/residential/house_small_01.png | 92 × 64 | ja | geprüft, im Spiel |
| sawmill | buildings/industrial/factory_sawmill_01.png | 164 × 116 | ja | geprüft, im Spiel |
| tree_conifer_01 … 03 | nature/tree_conifer_01.png … | ca. 40–56 breit | ja | geprüft, im Spiel (aus einem Bild abgeleitet) |
| tree_conifer_group_01, 02 | nature/tree_conifer_group_01.png … | zusammengesetzt | ja | geprüft, im Spiel |
| vehicle_pickup_01 | vehicles/vehicle_pickup_01.png | 72 × 52 | ja | vorhanden, noch nicht im Spiel (Fahrzeuge: Phase 5) |
| shelter, warehouse, lumber_camp | – | – | – | fehlt (Platzhalter) |
| Laubbäume, Büsche, Felsen, Felsmassiv, Vorkommen | – | – | – | fehlt (Platzhalter) |

Die Bildbreiten enthalten den angefügten Bodenschatten (rechts/unten).
Originale (2048 px) liegen in `assets_src/higgsfield/` und werden nicht veröffentlicht.

## Nachbearbeitung: `tools/process_asset.py`

1. Hintergrund per Farbton-Schlüssel entfernen, nur vom Bildrand aus zusammenhängend
   (Lila im Motiv bleibt erhalten). Achtung: Bei roten Motiven den Bereich eng halten
   (`--hue 285,345`), sonst verschwindet z. B. ein rotes Dach.
2. Maske um `--erode` Pixel einziehen (dünne Teile wie Antennen: 2, sonst 3).
3. Randpixel bekommen die Farbe des nächsten Innenpixels (kein heller oder lila Saum).
4. Verkleinern per Flächenmittel, harte Alpha-Kante, lose Einzelpixel entfernen.
5. Farben auf 32 reduzieren, optional `--tone sättigung,helligkeit,farbton`.
6. Bodenschatten als Schlagschatten nach rechts unten (`--shadow`), Ankerpunkt automatisch.

Beispiel:

```
python3 -I tools/process_asset.py assets_src/higgsfield/<datei>.png assets/buildings/residential/house_small_01.png \
  --width 68 --footprint 1x1 --hue 285,345 --tone 0.85,0.95 --shadow 0.4
```

Die Ausgabe (JSON mit `ax`, `ay`) gehört in `assets/manifest.json`.

## Erkenntnisse aus dem Testlauf

- Perspektive und Lichtrichtung der fünf Bilder passen zueinander und zum Spiel.
- Der Hintergrund kam nicht als flaches Magenta, sondern als lila Verlauf mit Schatten.
  Der Schlüssel kommt damit zurecht; flacher wäre trotzdem besser.
- Das Sägewerk kam mit eigener Bodenplatte; die passt als Hof zur 2 × 2-Grundfläche.
- Der Nadelbaum war deutlich türkis; mit Farbton −38° passt er zur Landschaft.
- Die echten Assets sind detailreicher als die Platzhalter. Lagerhalle, Notunterkunft und
  Holzfällerlager sollten als Nächstes generiert werden, damit die Siedlung einheitlich wirkt.
