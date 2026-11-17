# Entscheidungen Phase 2 (Stand 16.11.2026)

Ergänzt `docs/ENTSCHEIDUNGEN.md` (Phase 1), ersetzt nichts davon.

## 1. Wirtschaftsgrundlage

- Startgeld 25.000 Cr, Startmaterial 80 Bretter und 40 Stein, kein Rundholz.
  Das reicht für Landemodul, Wege und etwa 4–6 Gebäude; mehr erst mit Produktion (Phase 3).
- Geld und Material sind getrennt: `state.money` und `state.stock`. Jede Buchung landet im
  Verlauf `state.history` (Grundlage für das Handelsfenster in Phase 3).
- Abriss erstattet 50 % (`REFUND_RATE` in `config/economy.js`).
- Noch keine Lagerkapazität; der Bestand gilt für die ganze Siedlung. Kapazität und
  Lagerorte kommen mit Phase 3.

## 2. Wege

- Drei Typen jetzt: Erdweg (8 Cr), Schotterweg (25 Cr), befestigte Straße (60 Cr) je Feld.
  Asphalt, Hauptstraße und mehrspurige Straßen folgen als weitere Einträge in `config/roads.js`.
- Gespeichert wird nur Feld → Wegtyp. Die Form entsteht beim Zeichnen aus den vier Nachbarn,
  daher stimmen Kreuzungen auch über Chunk-Grenzen.
- Wege werden pixelweise in den Boden gebacken (kein Sprite pro Stück). Darum brauchen Wege
  vorerst **keine** Higgsfield-Assets. Die in `docs/ASSETS.md` gelisteten Weg-Assets sind damit
  zurückgestellt.
- Bedienung: Start und Ziel wählen, der Weg läuft L-förmig; die Knickrichtung mit weniger
  Hindernissen wird automatisch gewählt. Ziehen bleibt fürs Verschieben der Karte reserviert,
  damit es auf dem Handy keinen Gestenkonflikt gibt.
- Nicht auf Wasser, Sumpf, Fels oder Vorkommen. Bäume auf der Strecke werden gerodet.

## 3. Bauvoraussetzungen

- Weganschluss: ein Wegfeld direkt an einer Kante der Grundfläche. Gilt für Wohnhaus,
  Lagerhalle, Holzfällerlager und Sägewerk; nicht für Landemodul und Notunterkunft.
- Holzfällerlager: mindestens 12 Bäume im Umkreis von 6 Feldern.
- Gebäude dürfen nicht auf Wegen stehen und umgekehrt.

## 4. Spielstand

- Schema-Version 2 (Bestand, Wege, Verlauf). `save/migrations.js` hebt Version-1-Stände an;
  sie bekommen das Startmaterial und keine Wege.

## 5. Bewusst verschoben

- Bauzeit/Baustellen: kommt mit dem fließenden Zeitmodell (Phase 3/4).
- Kosten für Wege in Material (Schotter, Asphalt): erst wenn diese Waren produziert werden.
