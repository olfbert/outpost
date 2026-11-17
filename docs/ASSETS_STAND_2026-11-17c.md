# Asset-Stand 17.11.2026, zweiter Nachtrag (v0.13.2)

Neues Dokument. Die älteren Stände bleiben unverändert.

## Neue Fassungen
**Doppelhaus** (`duplex_01.png`, 152×104)
- Neues Bild mit vollständigem Grundstück.
- Die Grundfläche ist jetzt 2×2 statt 2×1, passend zum quadratischen Garten.
- Dafür 10 statt 8 Bewohner, Unterhalt 32 Cr. Über 6 Bewohner braucht es zwei Nahrungssorten.

**Stadtvilla** (`villa_01.png`, 148×84)
- Neues Bild: Der Pool liegt innerhalb des Grundstücks mit Hecke.

## Verarbeitung
1. `python3 -I tools/asset_batch.py tools/asset_batch_wohnen_3b.json`
   - Ohne `--grow`, weil glatte Flächen wie der Pool sonst verschwinden.
   - Mit 64 bzw. 200 Farben, weil das Poolblau bei 32 Farben zu Grün wurde.
2. `python3 -I tools/flatten_plinth.py` (Sockel: Doppelhaus 8 px, Villa 3 px)
3. `python3 -I tools/grass_match.py duplex villa`
   - Neues Werkzeug: zieht knallgrünen Rasen auf das gedämpfte Spielgras.
4. `python3 -I tools/reshadow.py duplex villa`

## Werkzeug-Änderungen
- **`reshadow.py`:**
  - Neu: Man kann einzelne Sprites angeben.
  - Die Abdunklung auf der Platte ist abgeschaltet. Sie erzeugte Streifen und wirkte bei jedem Lauf erneut.
- **`asset_batch.py`:** Neues Feld `colors` für die Farbanzahl.
