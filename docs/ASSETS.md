# Assets: Checkliste, Regeln, Higgsfield

Stand 16.11.2026. Alle Grafiken im Spiel sind derzeit **prozedurale Platzhalter**
(`src/rendering/sprites.js`). Echte Assets ersetzen sie einzeln über `assets/manifest.json`.

## Technische Vorgaben

- Isometrie 2:1, ein Feld = 64 × 32 px, Licht von links oben, transparenter Hintergrund
- Kein Boden, kein Text, kein Rahmen im Bild; Schatten höchstens dezent rechts unten
- Gebäude mit Grundfläche B × T Feldern: Bildbreite (B + T) × 32 + 16 px
  (1 × 1 → 80 px, 2 × 2 → 144 px), Höhe nach Bedarf, Vielfache von 4
- Ankerpunkt (`ax`, `ay` im Manifest): bei Gebäuden die **obere Ecke der Grundfläche am Boden**,
  bei Naturobjekten der **Fußpunkt**
- Generiert wird größer (z. B. 1024 px) und danach verkleinert; siehe „Nachbearbeitung“

Eintrag in `assets/manifest.json`:

```json
{ "sprites": { "house_small": { "file": "buildings/residential/house_small_01.png", "ax": 40, "ay": 45 } } }
```

Der Schlüssel ist die Sprite-ID aus der Tabelle unten.

## Checkliste

Status: fehlt / vorhanden / geprüft. „Platzhalter“ heißt: im Spiel sichtbar, aber prozedural.

### Gebäude

| Sprite-ID | Datei (unter `assets/`) | Größe (px) | Transparenz | Status |
|---|---|---|---|---|
| landing_module | buildings/landing/landing_module_01.png | 144 × 160 | ja | fehlt (Platzhalter) |
| shelter | buildings/residential/shelter_01.png | 80 × 80 | ja | fehlt (Platzhalter) |
| house_small | buildings/residential/house_small_01.png | 80 × 88 | ja | fehlt (Platzhalter) |
| warehouse | buildings/industrial/warehouse_01.png | 144 × 128 | ja | fehlt (Platzhalter) |
| lumber_camp | buildings/industrial/lumber_camp_01.png | 80 × 80 | ja | fehlt (Platzhalter) |
| sawmill | buildings/industrial/factory_sawmill_01.png | 144 × 112 | ja | fehlt (Platzhalter) |

### Natur

| Sprite-ID | Datei (unter `assets/`) | Größe (px) | Transparenz | Status |
|---|---|---|---|---|
| tree_deciduous_01 … 03 | nature/tree_deciduous_01.png … | 52 × 64 | ja | fehlt (Platzhalter) |
| tree_deciduous_group_01, 02 | nature/tree_deciduous_group_01.png … | 76 × 72 | ja | fehlt (Platzhalter) |
| tree_conifer_01 … 03 | nature/tree_conifer_01.png … | 44 × 68 | ja | fehlt (Platzhalter) |
| tree_conifer_group_01, 02 | nature/tree_conifer_group_01.png … | 64 × 76 | ja | fehlt (Platzhalter) |
| tree_swamp_01, 02 | nature/tree_swamp_01.png … | 32 × 44 | ja | fehlt (Platzhalter) |
| bush_01, 02 | nature/bush_01.png … | 28 × 24 | ja | fehlt (Platzhalter) |
| reeds_01, 02 | nature/reeds_01.png … | 28 × 20 | ja | fehlt (Platzhalter) |
| rock_small_01, 02 | nature/rock_small_01.png … | 24 × 20 | ja | fehlt (Platzhalter) |
| rock_large_01, 02 | nature/rock_large_01.png … | 44 × 36 | ja | fehlt (Platzhalter) |
| mountain_peak_01 … 03 | nature/mountain_peak_01.png … | 108 × 100 | ja | fehlt (Platzhalter) |

### Rohstoffvorkommen

| Sprite-ID | Datei (unter `assets/`) | Größe (px) | Transparenz | Status |
|---|---|---|---|---|
| deposit_stone_01, 02 | nature/deposit_stone_01.png … | 48 × 36 | ja | fehlt (Platzhalter) |
| deposit_iron_01, 02 | nature/deposit_iron_01.png … | 48 × 36 | ja | fehlt (Platzhalter) |
| deposit_coal_01, 02 | nature/deposit_coal_01.png … | 48 × 36 | ja | fehlt (Platzhalter) |
| deposit_limestone_01, 02 | nature/deposit_limestone_01.png … | 48 × 36 | ja | fehlt (Platzhalter) |
| deposit_clay_01, 02 | nature/deposit_clay_01.png … | 48 × 36 | ja | fehlt (Platzhalter) |
| deposit_sand_01, 02 | nature/deposit_sand_01.png … | 48 × 36 | ja | fehlt (Platzhalter) |

### Terrain

Der Boden wird nicht aus Kacheln zusammengesetzt, sondern pixelweise aus Farbpaletten
erzeugt (`src/config/terrain.js`, `src/rendering/groundBaker.js`). Dafür werden vorerst
**keine** Terrain-Assets gebraucht. Kachelbare Texturen (Gras, Erde, Sand, Schotter, Fels,
Wasser) können später als Quelle der Körnung dienen; das wäre eine eigene Entscheidung.

### Für Phase 2 als Nächstes benötigt

| Datei (unter `assets/`) | Zweck | Größe (px) | Status |
|---|---|---|---|
| roads/road_dirt_*.png | Erdweg: Gerade, Kurve, T-Stück, Kreuzung, Ende | 64 × 32 je Teil | fehlt |
| roads/road_gravel_*.png | Schotterweg, dieselben Teile | 64 × 32 je Teil | fehlt |
| nature/tree_stump_01.png | Baumstumpf nach Rodung | 24 × 20 | fehlt |
| nature/logs_01.png | Gefällte Stämme | 40 × 28 | fehlt |
| effects/construction_01 … 03.png | Baufortschritt in Stufen (1 × 1 und 2 × 2) | 80 / 144 breit | fehlt |

## Higgsfield-Testlauf vom 16.11.2026

Fünf Test-Assets, im Higgsfield-Verlauf zu finden:
Landemodul, kleines Wohnhaus, Sägewerk, Nadelbaum, Pick-up.

Was der Lauf gezeigt hat:

- **Tarif:** Auf dem kostenlosen Tarif lief nur das Modell `z_image` (0,15 Credits je Bild,
  zusammen 0,75 Credits). Das Standardmodell `gpt_image_2_6`, das transparenten Hintergrund
  direkt liefert (0,25–0,5 Credits je Bild), verlangt mindestens den Basic-Tarif.
- **Drosselung:** Auf dem kostenlosen Tarif wurde immer nur ein Auftrag gleichzeitig
  angenommen; die Assets mussten nacheinander laufen.
- **Hintergrund:** `z_image` kennt keine Transparenz. Die Bilder wurden deshalb auf
  einfarbigem Magenta angefordert, das sich sauber ausstanzen lässt.
- **Nicht geprüft:** Die Ergebnisse konnten aus der Arbeitsumgebung heraus nicht geöffnet
  werden (kein Zugriff auf den Bildserver). Ob Perspektive, Lichtrichtung und Stil über alle
  fünf Bilder zusammenpassen, ist also noch **nicht beurteilt** und nichts davon ist eingebaut.

### Nachbearbeitung (pro Bild)

1. Hintergrund entfernen (Magenta ausstanzen bzw. Transparenz übernehmen)
2. Auf das Motiv zuschneiden, auf Zielgröße verkleinern (ohne Weichzeichnen der Kanten)
3. Farben auf eine begrenzte, gedämpfte Palette reduzieren, damit alle Assets zusammenpassen
4. Halbtransparente Randpixel entfernen (harte Pixelkante)
5. Ankerpunkt bestimmen, Eintrag ins Manifest, Status hier auf „vorhanden“
6. Im Spiel neben den Platzhaltern prüfen, dann Status „geprüft“

## Prompt-Regeln

Gemeinsamer Stilblock (vor jedes Motiv setzen):

> Isometric 2:1 pixel art game asset, realistic handcrafted pixel art, viewed from a consistent
> elevated isometric camera angle (strict 2:1 dimetric projection, one corner of the object
> pointing to the bottom of the image), 1980s frontier-colony aesthetic, grounded industrial
> design, muted natural colors, carefully readable silhouette, subtle pixel-level texture,
> consistent top-left lighting, crisp pixel edges, isolated single object centered with margin,
> no ground plane, no text, no letters, no watermark, no UI, no perspective distortion.

Hintergrund je nach Modell: `transparent background` (mit Transparenz-Option) oder
`on a plain flat solid magenta background, no shadow on the background`.

Motive des Testlaufs:

- **landing_module:** a landing and command module of a late-1970s crewed space expedition,
  squat riveted steel and white-painted aluminium capsule body on four sturdy landing legs,
  small porthole windows, access ladder and hatch, a radio mast and small dish antenna on top,
  scorched heat-shield panels, a few supply crates beside it. Footprint 2x2 tiles.
- **house_small:** a small single-storey prefabricated colony house from around 1980, pale beige
  fibre-cement wall panels, shallow gabled corrugated metal roof in faded rust red, one door
  with a small concrete step, two simple windows with aluminium frames, a short brick chimney,
  a rain barrel at the corner. Footprint 1x1 tile, compact.
- **sawmill:** a small sawmill, open-sided timber shed with a corrugated sheet-metal roof on
  steel posts, a circular saw bench inside, a stack of round logs on one side and neat stacks
  of sawn planks on the other, a small sawdust pile, a thin metal exhaust pipe. Footprint 2x2 tiles.
- **tree_conifer:** a single tall conifer tree, spruce-like, layered dark blue-green branches
  with lighter top-left highlights, short brown trunk visible at the base, slightly irregular
  natural shape.
- **vehicle_pickup:** a boxy early-1980s utility pick-up truck, faded mustard-yellow paint, flat
  load bed with two wooden crates, steel bumper, round headlights, slightly dusty; aligned along
  the isometric grid axis, facing the bottom-right.

Noch vorzubereiten für Phase 1/2: shelter, warehouse, lumber_camp, Laubbäume, Büsche, Felsen,
Felsmassiv, die sechs Vorkommen.
