# Entscheidungen – Gebäudeschatten (Version 0.10.3)

Stand: 17.11.2026. Neues Dokument; ENTSCHEIDUNGEN_OPTIK_2.md bleibt unverändert.

## Problem
Bisher berechnete `process_asset.py` die Schatten so: Jeder Bildpunkt fiel von der Unterkante seiner Bildspalte aus um seinen Abstand zu dieser Kante zur Seite. Bei Gebäuden auf großen Platten zählte damit die ganze Tiefe der Platte als Höhe. Das hatte zwei Folgen:
- Die Schatten waren viel zu lang.
- Sie lagen als große graue Flächen unterhalb der Platte, teils mit senkrechten Kanten.

Nach dem Abschneiden der Sockel (v0.10.2) passten sie außerdem nicht mehr zur neuen Lage.

## Lösung: `tools/reshadow.py`
1. Der alte Schatten wird entfernt, also alle halbtransparenten Pixel.
2. Die Grundfläche ist die Raute aus Ankerpunkt und Footprint (`tools/footprints.json`, erzeugt aus `src/config/buildings.js`).
3. Die Höhe je Bildspalte ist der Abstand von der Oberkante der Silhouette zur hinteren Kante der Grundfläche.
4. Das Objekt steht auf einer kleineren Raute über seiner tatsächlichen Breite.
5. Bei Bildern mit Grundplatte sucht das Werkzeug den Fußpunkt des Objekts per Farbwechsel gegenüber der Platte. Nur von dort fällt Schatten, nicht von der leeren Platte.
6. **Licht:** von links oben. Der Schatten fällt nach rechts unten, entlang der Welt-x-Achse.
   - Länge: 0,42 × Höhe, höchstens 18 px.
7. Auf der Platte selbst wird nur der Fuß hoher Objekte leicht abgedunkelt.

## Reihenfolge der Asset-Werkzeuge
1. `python3 -I tools/asset_batch.py tools/<batch>.json`
2. `python3 -I tools/flatten_plinth.py`
3. `python3 -I tools/reshadow.py` (wiederholbar)

## Nicht betroffen
- Bäume behalten ihre Schatten aus `process_asset.py`.
- Die prozeduralen Sprites (Deko, Platzhalter) behalten ihre kleinen Kontaktschatten.
