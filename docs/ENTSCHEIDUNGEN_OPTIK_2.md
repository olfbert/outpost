# Entscheidungen – Optik 2 (Version 0.10.2)

Stand: 17.11.2026. Neues Dokument; ENTSCHEIDUNGEN_OPTIK.md bleibt unverändert.

## Gebäude stehen auf dem Boden statt auf einem Sockel
**Problem:** Viele Higgsfield-Bilder zeigen das Gebäude auf einer dicken Platte mit sichtbaren Seitenflächen. Im Spiel wirkte das, als würde der Boden des Gebäudes sich abheben.

**Lösung:**
- `tools/flatten_plinth.py` schneidet pro Spalte die untersten N Pixel ab. N steht pro Sprite in `tools/plinth_table.json`.
- Auf der Schattenseite (rechts) tritt Schlagschatten an die Stelle des Sockels.
- Der Ankerpunkt wird um N nach oben verschoben. Die Oberkante der Platte liegt damit genau auf der Grundfläche.
- Das Manifest markiert bearbeitete Sprites mit `plinthCut`, damit nichts doppelt geschnitten wird.
- Die Werte wurden von Hand an Nahaufnahmen der Kanten bestimmt.
  - Die meisten Sprites haben 1–4 px.
  - Der Drohnenflugplatz hat 8 px.
- **Wichtig:** `asset_batch.py` erzeugt die Bilder neu, mit Sockel. Danach muss `flatten_plinth.py` erneut laufen.

## Hof um Gebäude
- Der Bodenbacker mischt rund um jede Gebäudegrundfläche festgetretene Erde ein.
- Die Breite ist 0,7 Feld, der Rand ist verrauscht und läuft weich aus.
- Die Grundplatten wirken dadurch nicht mehr aufgeklebt.
- Deko-Objekte bekommen keinen Hof.
- Beim Bauen wird deshalb auch der Boden neu gebacken.

## Neues Speditionsbild
- Flo hat ein neues Bild geliefert: Halle mit drei Rolltoren, drei Transportern, Zapfsäule und Reifenstapeln.
- Datei: `assets/buildings/logistics/haulage_02.png`. Das alte Bild `haulage_01.png` bleibt liegen, wird aber nicht mehr benutzt.

## iPhone-Homescreen: blauer Streifen unten
**Ursache:** Ein bekannter iOS-Fehler in Homescreen-Web-Apps. Nach dem ersten Öffnen der Tastatur, etwa beim Benennen der Siedlung, bleibt die Ansicht um die Höhe der Statusleiste (etwa 59 pt) zu kurz.

**Abhilfe:**
- Nach dem Schließen der Tastatur und beim Zurückkehren in die App wird das Layout neu vermessen.
- Dazu wird `body` kurz ausgeblendet und eine Neuberechnung erzwungen. Das geschieht nur, wenn die Höhe unter dem bisher gemessenen Maximum liegt.
- Auf einem echten Gerät ist das noch nicht geprüft.
