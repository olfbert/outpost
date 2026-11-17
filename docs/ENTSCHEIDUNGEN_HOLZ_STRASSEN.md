# Entscheidungen – Holzfäller-Gebiete und Hauptstraße (Version 0.11.0)

Stand: 17.11.2026. Neues Dokument; ältere Entscheidungsdokumente bleiben unverändert.

## Holzfäller: Fällgebiet und Pflanzgebiet
**Bedienung:** Im Infofenster des Holzfällerlagers gibt es die Knöpfe „Fällgebiet festlegen“, „Pflanzgebiet festlegen“ und „Gebiete zurücksetzen“.
- Man tippt zuerst die eine Ecke an, dann die gegenüberliegende. Mit der Maus zeigt eine Vorschau das Rechteck.
- Escape oder ein Tippen auf leere Fläche bricht ab.
- Grenzen: höchstens 16 × 16 Felder, höchstens 14 Felder vom Lager entfernt. Größere Rechtecke werden zugeschnitten.
- Ist ein Holzfäller gewählt, zeigt die Karte seine Gebiete: Fällgebiet orange, Pflanzgebiet grün. Ohne eigenes Fällgebiet erscheint der Standard-Umkreis gestrichelt.

**Fällen:**
- Ohne Fällgebiet fällt das Lager wie bisher im Umkreis von 8 Feldern.
- Mit Fällgebiet fällt es nur dort, die Bäume nahe am Lager zuerst.

**Pflanzen:**
- Mit Pflanzgebiet setzen die Arbeiter 8 junge Bäume pro Monat. Das hängt von der Zahl der Arbeiter ab, nicht vom Fällen, und kostet nichts.
- Gepflanzt wird auf freiem Gras-, Wiesen- oder Waldboden. Ausgenommen sind Wege, Gebäude, Felder, Weiden und gerodete Bauflächen.
- Nach 12 Monaten ist ein Baum ausgewachsen, wie beim natürlichen Nachwachsen. Es gibt Laub- und Nadelbäume; auf Nadelwaldboden nur Nadelbäume.
- Ein Wald, der gefällt werden soll, braucht ein Fällgebiet, das über dem Pflanzgebiet liegt oder es überdeckt.

**Speicherung:**
- `state.planted` (Feld → Pflanzmonat) wird gespeichert.
- Das Lager speichert `fellArea` und `plantArea` als Rechtecke im Feldraster.
- Kein neues Schema: Alte Spielstände laden mit leerer Pflanzliste.

## Hauptstraße (zweispurig)
- Neuer Wegtyp `avenue` „Hauptstraße“. Kosten: 140 Cr pro Feld.
- Fast feldbreit (halbe Breite 0,44), dunkler Asphalt, gestrichelte Mittellinie, durchgezogene Randlinien.
- Netzkosten 0,3. Zum Vergleich: befestigte Straße 0,45, Schotter 0,7, Erdweg 1.
- Lkw fahren dort mit 1,9 Feldern pro Sekunde und deutlich weiter rechts (Spurversatz 0,22 statt 0,15). Gegenverkehr fährt sichtbar auf der eigenen Spur aneinander vorbei.
- Bestehende Wege lassen sich durch Überbauen zur Hauptstraße ausbauen.
- Die Hauptstraße belegt wie alle Wege ein Feld pro Rasterfeld. Eine Straße über zwei Felder Breite wäre ein größerer Umbau des Wegenetzes und ist bewusst nicht Teil dieses Schritts.
