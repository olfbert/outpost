# Entscheidungen (Stand 16.11.2026)

Ergänzt `CLAUDE.md`, ersetzt sie nicht. Neue oder geänderte Entscheidungen kommen in ein
neues Dokument bzw. einen neuen datierten Abschnitt; bestehende Texte werden nicht überschrieben.

## 1. Weltgröße und Maßstab

- 1 Feld ≈ 10 m. Deutschland-Maßstab wären rund 64.000 × 88.000 Felder (über 5 Milliarden).
- Deshalb ist das Gelände eine reine Funktion aus (Feld, Seed). Gespeichert werden nur
  Änderungen des Spielers. Die Weltgröße ist ein Konfigurationswert.
- Start mit 8.192 × 8.192 Feldern (ca. 82 km). Größere Welten sind technisch möglich;
  vor dem Hochsetzen auf dem iPhone messen.
- Nebenwirkung: Flüsse entstehen aus einem Rauschmuster, nicht aus simuliertem Gefälle.
  Eine grobe Hydrologie auf einem Regionsraster wäre der nächste Schritt, falls gewünscht.

## 2. Rendering

- Canvas 2D mit gebackenen Bodenkacheln (512 px), vier Detailstufen, Zeichnen nur bei Bedarf.
- Schwellen: ab Zoom 0,5 Einzelobjekte; 0,25–0,5 halbe Auflösung; 0,125–0,25 Viertelauflösung;
  darunter Flächendarstellung als Bildpyramide. Alle Werte in `gameConfig.js`.
- Gebäude werden in senkrechte Streifen zerlegt und mit den Naturobjekten nach Tiefe sortiert,
  damit Bäume vor und hinter Gebäuden richtig liegen.

## 3. Projektstruktur

- ES-Module ohne Build-Schritt, keine externen Bibliotheken, keine CDNs.
- Läuft auf GitHub Pages; lokal über einen einfachen Webserver.

## 4. Zeitmodell (wirkt ab Phase 3/4)

Entschieden: **fließend**. 1 echter Tag bleibt 1 Ingame-Monat, aber

- Produktion läuft anteilig über den Tag (Lager füllen sich stetig),
- Bauzeiten zählen in echten Stunden,
- Löhne, Unterhalt und Nachfrage werden einmal pro Ingame-Monat abgerechnet,
- Offline-Zeit wird beim Laden in einem Schritt nachgerechnet (kein Sekundentakt).

In Phase 1 wird nur das Ingame-Datum aus der echten Zeit seit Weltbeginn angezeigt.

## 5. Assets

- Phase 1 nutzt prozedurale Platzhalter im Zielstil (`src/rendering/sprites.js`).
- Echte Assets werden über `assets/manifest.json` eingebunden und ersetzen Platzhalter
  einzeln. Es werden keine Pfade verwendet, die nicht im Manifest stehen.
- Higgsfield-Testlauf und Folgerungen: siehe `docs/ASSETS.md`.

## 6. Spielablauf in Phase 1

- Die Welt startet leer. Das Landemodul setzt der Spieler selbst; erst danach sind weitere
  Gebäude wählbar. Die empfohlene Landezone ist markiert, aber nicht bindend.
- Vorkommen sind für den späteren Abbau reserviert und nicht überbaubar.
- Beim Erzeugen einer neuen Welt wird der bisherige Stand als Sicherung (`backup`) abgelegt.

## 7. Vorbereitung auf später

- Siedlungen sind eigene Datenobjekte mit `ownerId`; Gebäude verweisen per `settlementId`.
- Spielstand hat eine Schema-Version; `deserialize` lehnt neuere Versionen verständlich ab.
- Simulation, Zustand und Rendering sind getrennt, damit eine Server-Simulation möglich bleibt.
