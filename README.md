# OUTPOST

Isometrisches Endlos-Aufbauspiel auf einem neu besiedelten Planeten.
Stand: **Stufe B – Lager, Lkw, Logistik** (Version 0.8.0), aufbauend auf Phase 1–4 und Stufe A.

Der vollständige Arbeitsauftrag steht unverändert in `CLAUDE.md`.
Entscheidungen, die davon abweichen oder ihn konkretisieren, stehen in `docs/ENTSCHEIDUNGEN.md` (Phase 1)
und `docs/ENTSCHEIDUNGEN_PHASE2.md`; die Optik-Anpassung nach Referenz in `docs/ENTSCHEIDUNGEN_OPTIK.md`; Phase 3 in `docs/ENTSCHEIDUNGEN_PHASE3.md`; Menschen und Tiere in `docs/ENTSCHEIDUNGEN_LEBEN.md`; Phase 4 in `docs/ENTSCHEIDUNGEN_PHASE4.md`; Holzernte, Nachwachsen und Vorkommen in `docs/ENTSCHEIDUNGEN_NATUR.md`; neue Preise, schnellerer Abbau und Laufwege um Gebäude in `docs/ENTSCHEIDUNGEN_BALANCE.md`; Stufe A (Baustellen, Bevölkerung, Nahrung, Felder, Winter) in `docs/ENTSCHEIDUNGEN_STUFE_A.md`; Stufe B (Lager, Puffer, Lkw, Disposition) in `docs/ENTSCHEIDUNGEN_STUFE_B.md`.

## Starten

Das Spiel besteht aus ES-Modulen ohne Build-Schritt. Browser laden Module nicht
per Doppelklick von der Festplatte, deshalb braucht es einen einfachen Webserver:

```
cd outpost
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Auf GitHub Pages läuft der Ordner so, wie er ist
(alle Pfade sind relativ). Fürs iPhone: Seite in Safari öffnen, „Zum Home-Bildschirm“.

Hilfen für Tests:

- `?seed=ABC` startet eine frische Welt mit diesem Seed (ohne den Spielstand zu laden)
- `?debug=1` blendet die Leistungsanzeige ein (auch im Menü schaltbar)
- `?dev=1` oder `#dev` zeigt den Entwicklermodus mit Zeitraffer (bis 2 Sekunden = 1 Monat)
- `node tools/preview-map.mjs SEED` rendert eine Übersichtskarte nach `/tmp` und gibt Biom-Anteile aus

## Bedienung

| | Desktop | Touch |
|---|---|---|
| Verschieben | Ziehen, Pfeiltasten/WASD | Ein Finger |
| Zoomen | Mausrad (um den Mauszeiger), `+`/`-` | Zwei Finger (um die Fingermitte), Schaltflächen |
| Auswählen | Klick | Tippen |
| Bauen | Gebäude wählen, Klick auf die Karte | Gebäude wählen, Standort antippen, „Bauen“ |
| Weg bauen | Wegtyp wählen, Start anklicken, Ziel anklicken | Wegtyp wählen, Start und Ziel antippen, „Bauen“ |
| Umbenennen | Klick auf den Siedlungsnamen | Siedlungsnamen antippen |
| Abbrechen | `Esc` | „Abbrechen“ |

## Neu in 0.6.0

- Holzfäller gehen zum Baum und hacken; gefällte Bäume werden zu Stümpfen und wachsen nach
  (junger Baum nach 6, ausgewachsen nach 18 Monaten)
- Rohstoffvorkommen dezent als Bodenfärbung mit vereinzelten Steinen statt großer Haufen
- Alle Industriegebäude als Higgsfield-Assets

## Was Phase 4 dazu bringt (0.5.0)

- Export als JSON-Datei und als kompakter Share-Code (Menü → Spielstand)
- Import aus Datei oder Code mit Vorschau (Siedlung, Seed, Spielzeit, Version) und Fehlerprüfung
- Automatische Sicherung vor jedem Import und jeder neuen Welt, „Sicherung laden“
- Ein exportierter Stand ist ein teilbarer Einzelspieler-Spielstand, **kein** Mehrspieler

## Menschen und Tiere (0.4.0)

- Bewohner in Unterkünften und Wohnhäusern gehen über die Wege zur Arbeit und zurück
- Herden von Grasläufern (Wildtier des Planeten) auf Wiesen, Hühner an den Wohnhäusern
- Einwohnerzahl in der oberen Leiste und im Wirtschaftsfenster
- Lagerhalle, Notunterkunft und Holzfällerlager jetzt als Higgsfield-Assets

## Was Phase 3 dazu bringt

- Fließende Spielzeit (1 echter Tag = 1 Monat) mit Tagesdatum, Nachrechnen der Offline-Zeit
- Abbau auf Vorkommen: Steinbruch, Ton-, Sand-, Kalkstein-Gruben, Eisenerz- und Kohlemine
- Holzfäller fällen Bäume im Umkreis, der Wald wird sichtbar weniger
- Weiterverarbeitung: Sägewerk, Schmelzofen (Stahl), Zementwerk, Betonwerk
- Freischaltung in sinnvoller Reihenfolge, Bauleiste mit Reitern (Wohnen, Rohstoffe, Industrie, Wege)
- Gemeinsames Lager mit Kapazität je Ware, Lagerhallen erweitern sie
- Wirtschaftsfenster: Lager & Verkauf, Monatsbilanz, Betriebsübersicht
- Betriebskosten am Monatsende, Produktionsstatus je Gebäude, Betrieb pausieren
- Entwicklermodus mit Zeitraffer

## Was Phase 2 dazu bringt

- Startbudget (25.000 Cr) und mitgebrachtes Material (80 Bretter, 40 Stein); Werte in
  `src/config/gameConfig.js` und `src/config/economy.js`
- Baukosten werden abgebucht; die Vorschau zeigt Kosten und fehlendes Material rot an
- Abriss erstattet 50 % der Kosten
- Wege: Erdweg, Schotterweg, befestigte Straße. Start und Ziel wählen, der Weg läuft
  L-förmig; Gerade, Kurve, T-Kreuzung, Kreuzung und Sackgasse entstehen automatisch,
  auch über Chunk-Grenzen. Wegstücke lassen sich einzeln entfernen
- Bauvoraussetzungen: Weganschluss (Wohnhaus, Lager, Holzfäller, Sägewerk),
  Wald in der Nähe (Holzfäller), ebener fester Boden
- Siedlung benennen (nach dem Landemodul und jederzeit über den Namen oben)
- Geld und Material in der oberen Leiste, Kosten auf jeder Baukarte
- Spielstand-Version 2 mit automatischer Migration alter Stände

## Was Phase 1 kann

- Zufällige, unbesiedelte Welt aus einem Seed (8.192 × 8.192 Felder, ca. 82 km Kantenlänge);
  derselbe Seed ergibt dieselbe Welt
- Biome: Grasland, fruchtbare Ebene, Misch- und Nadelwald, Sumpf, Sand- und Geröllflächen,
  felsige Hügel, Gebirge, Flüsse, Bäche, Seen, Küste
- Endliche Rohstoffvorkommen im Gelände: Stein, Eisenerz, Kohle, Kalkstein, Ton, Sand;
  Holz in den Wäldern
- Fairer Startbereich: ebene Fläche mit Wald und Wasser in der Nähe, Grundvorkommen garantiert
- Kamera mit stufenlosem Zoom von der Nahansicht bis zur ganzen Welt, ohne Ladebildschirm
- Vier Detailstufen (LOD): Einzelobjekte → eingebackene Kacheln → Flächendarstellung
- Gebäude platzieren mit Vorschau und Standortprüfung (Gelände, Ebenheit, Belegung, Vorkommen),
  auswählen und abreißen; Bäume auf der Grundfläche werden gerodet
- Minimap, Sprung zur Siedlung, Sprung in die Weltübersicht
- Automatisches Speichern in IndexedDB (Seed, Gebäude, Rodungen, Kamera, Einstellungen)
- Oberfläche für Desktop und iPhone-Format

Noch **nicht** enthalten (laut Plan spätere Phasen): Bewohner, Fahrzeuge, Asphalt- und Hauptstraßen,
Brücken, Multiplayer.

## Technik in Kürze

**Rendering: Canvas 2D.** Der Boden wird pixelweise in 512-px-Kacheln gebacken und danach nur
noch als Bild gezeichnet; pro Frame fallen wenige Dutzend `drawImage`-Aufrufe für den Boden an,
dazu die sichtbaren Objekte. Das läuft auf dem iPhone ohne WebGL-Besonderheiten, bleibt gut
lesbar und hat keine Abhängigkeiten. Der Renderer liest nur Welt und Spielzustand; ein späterer
Wechsel auf WebGL beträfe allein `src/rendering/`.

**Welt als Funktion.** `worldGenerator.js` berechnet jedes Feld direkt aus (Koordinate, Seed).
Es gibt keine gespeicherte Karte; gespeichert werden nur Änderungen des Spielers.
Die Weltgröße ist deshalb ein Konfigurationswert (`src/config/gameConfig.js`).

**Drei Koordinatenräume**, strikt getrennt: Feld → Welt-Pixel (`isoProjection.js`) → Bildschirm (`camera.js`).

**Zeichnen nur bei Bedarf.** Steht die Kamera still und lädt nichts nach, wird nicht neu gezeichnet.

## Projektstruktur

```
index.html              Seite, Oberfläche (HTML)
manifest.webmanifest    Homescreen-Web-App
styles/main.css         Oberfläche (CSS)
CLAUDE.md               Arbeitsauftrag (unverändert)
docs/
  ENTSCHEIDUNGEN.md     Festgelegte Entscheidungen
  ASSETS.md             Asset-Checkliste und Higgsfield-Prompts
tools/preview-map.mjs   Entwicklerwerkzeug: Übersichtskarte, Biom-Statistik
tools/process_asset.py  Nachbearbeitung generierter Assets (Python, Pillow, NumPy, SciPy)
assets_src/             Originale der Assets (nicht veröffentlicht)
assets/                 Asset-Ordner nach Kategorie, manifest.json listet vorhandene Dateien
src/
  main.js               Einstieg, verdrahtet alle Teile, Hauptschleife
  config/
    gameConfig.js       Weltgröße, Zoom, LOD-Schwellen, Zeit, Startbudget
    terrain.js          Geländearten, Naturobjekte, Vorkommen, Farbpaletten
    buildings.js        Gebäudedaten (Grundfläche, Kosten, Anforderungen, Produktion)
    economy.js          Waren, Startmaterial, Erstattungsquote
    roads.js            Wegtypen (Breite, Kosten, Farben, Untergrund)
  world/
    noise.js            Hash, Rauschen, Zufallsgenerator
    worldGenerator.js   Höhen, Klima, Gewässer, Biome, Vorkommen, Startbereich
    chunks.js           Chunk-Speicher (Felddaten bei Bedarf)
  camera/
    isoProjection.js    2:1-Projektion
    camera.js           Position, Zoom, weiche Fahrten
    input.js            Maus, Touch, Tastatur
  rendering/
    renderer.js         Detailstufen, Kacheln, Tiefensortierung, Overlays
    groundBaker.js      Bodenkacheln pixelweise backen
    farLayer.js         Flächendarstellung für weite Zoomstufen
    sprites.js          Platzhalter-Sprites (prozedural), Atlas
    pix.js              Pixel-Malwerkzeuge
    assetLoader.js      Echte Assets über assets/manifest.json einbinden
  building/placement.js Standortprüfung, Kosten, Bauen, Abreißen
  building/roads.js     Wegplanung, Prüfung, Bauen, Entfernen, Formnamen
  state/gameState.js    Spielzustand, Serialisierung, Ingame-Datum
  save/indexedDb.js     Lokaler Speicher
  save/migrations.js    Spielstand-Migrationen
  save/transfer.js      Export/Import: JSON-Datei, Share-Code, Prüfung, Vorschau
  ui/saveUi.js          Spielstand-Bereich im Menü, Import-Vorschau
  simulation/gameClock.js   Spielzeit und Datum
  simulation/production.js  Produktion, Vorkommen, Holzernte, Monatsabschluss, Verkauf
  life/life.js          Bewohner, Wildtiere, Hühner (Echtzeit, nur Darstellung)
  rendering/lifeSprites.js  Pixel-Figuren für Menschen und Tiere
  ui/                   hud.js, buildMenu.js, panels.js, minimap.js, dialogs.js, economyPanel.js, status.js
```

## Getestet

Automatisiert in Chromium (Desktop 1280 × 800 und iPhone-Format 390 × 844 mit Touch):
Start, alle Zoomstufen, Wischen, Zwei-Finger-Zoom, Bauen per Klick und per Tippen,
Standortprüfung, Auswahl, Neuladen mit Spielstand, neue Welt, Konsole ohne Fehler.
Phase 2 zusätzlich: Umbenennen, alle drei Wegtypen, automatische Formen, Weganschluss,
Waldprüfung, Kostenabzug, fehlendes Material, Abriss mit Erstattung, Wegstück entfernen,
Migration eines Schema-1-Spielstands.
Phase 3 zusätzlich: Kette Holz → Bretter, Steinbruch, Gruben und Minen im Zeitraffer, Lager voll,
Holzernte mit verschwindenden Bäumen, Verkauf, Monatsbilanz, Nachrechnen von 3 Tagen Offline-Zeit;
Schmelz-, Zement- und Betonkette einzeln geprüft.
Phase 4 zusätzlich: Datei-Export (Download), Share-Code, Import aus Code und Datei mit Vorschau,
ungültige/abgeschnittene/zu neue Stände abgelehnt, Sicherung wiederhergestellt, Neuladen.
**Nicht** getestet: echtes iPhone und Safari – das steht noch aus.

## Offene Punkte

- Test auf echtem iPhone (Leistung, Speicherbedarf der Kacheln, Safari-Eigenheiten)
- Flüsse folgen einem Rauschmuster, noch keinem echten Gefälle
- Kein Höhenrelief im Raster: Gebirge sind Felsmassive auf ebenem Raster, Hänge nur schattiert
- Rodungen erscheinen in der Flächendarstellung (weit herausgezoomt) noch nicht
- Kein Personal, kein Transport: Betriebe liefern direkt ins gemeinsame Lager
- Feste Verkaufspreise ohne Nachfrage
- Ein Weg kostet beim Bauen in Stufe 0 einen kurzen Ruckler (ca. 45 ms am Desktop), weil die
  betroffenen Bodenkacheln sofort neu gebacken werden; auf dem iPhone noch messen
- Wege laufen nur L-förmig; Brücken über Wasser fehlen
- Offline-Betrieb (Service Worker) ist vorbereitet, aber noch nicht eingebaut
- Landemodul, Unterkunft, Wohnhaus, Lagerhalle, Holzfällerlager, Sägewerk und Nadelbäume sind
  echte Assets (Higgsfield), alles andere noch Platzhalter; siehe `docs/ASSETS_STAND_2026-11-16.md` und `tools/process_asset.py`
