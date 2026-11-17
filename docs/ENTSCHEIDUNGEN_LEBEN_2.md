# Entscheidungen – „Mehr Leben“ (Version 0.10.0)

Stand: 17.11.2026. Neues Dokument; ältere Entscheidungsdokumente bleiben unverändert.

## Umfang dieses Schritts
- Verschiedene Wohnhäuser
- Deko: Laternen, Bänke, Mülleimer, Blumenbeete, Bäume pflanzen, Brunnen
- Tag und Nacht
- Drohnenflugplatz mit sichtbar fliegenden Lastdrohnen

Die Eisenbahn kommt als eigener nächster Schritt (Stufe C).

## Wohnhäuser
| Gebäude | Größe | Bewohner | Bedingung |
|---|---|---|---|
| Holzhaus (`wood_house`) | 1×1 | 3 | keine |
| Backsteinhaus (`brick_house`) | 1×1 | 6 | ab 4 Bewohnern mindestens 2 Nahrungsarten |
| Reihenhaus (`row_house`) | 2×2 | 10 | ab 6 Bewohnern mindestens 2 Nahrungsarten |

Bis die Higgsfield-Bilder eingebunden sind, werden die Häuser prozedural gezeichnet.

## Deko und Umgebung
- Deko-Objekte haben die Kategorie `deco` und das Flag `instant: true`. Sie sind also sofort fertig und keine Baustelle.
- Jedes Deko-Objekt hat einen `beauty`-Wert. Häuser im Umkreis erhalten pro Punkt +5 % Steuern, höchstens +30 %.
- Den Bonus zeigt die Hausinfo unter „Umgebung“.
- Die Berechnung wird pro `state.rev` zwischengespeichert, damit sie günstig bleibt.

## Tag und Nacht
- Die Helligkeit folgt der echten Ortszeit des Geräts, höchstens 58 % Abdunklung.
- Laternen, Fenster und das Landemodul leuchten additiv.
- Im Menü lässt sich „Tag und Nacht“ auf automatisch, immer Tag oder immer Nacht stellen.
- Das ist reine Darstellung; die Simulation ändert sich dadurch nicht.

## Drohnenflugplatz
**Gebäude `drone_port`:**
- Größe 2×2, Kosten 12.000 Cr, 30 Bretter, 40 Stein, 15 Stahl.
- Unterhalt 250 Cr, 3 Arbeiter. Wird nach der Spedition freigeschaltet.
- Stellt 4 Drohnen.

**Drohnen in der Disposition:**
- Kapazität 4, schnell, Reichweite 40 Felder um einen Flugplatz.
- Ein Auftrag fliegt nur, wenn beide Enden im Umkreis desselben Flugplatzes liegen.
- Gemessen wird die Luftlinie, also auch über Wasser und ohne Wege.
- Die Drohne wird genommen, wenn sie höchstens das 1,5-fache des Lkw-Aufwands kostet und noch Drohnenkapazität frei ist. Sonst fährt der Lkw.
- Folge: Drohnen übernehmen kurze, kleine Lieferungen und Strecken ohne Straße. Lkw bleiben für Massengut wichtig.

**Sichtbare Drohnen:**
- Höchstens 10 Drohnen sind zu sehen. Sie stehen auf dem Landefeld.
- Sie fliegen echte Drohnen-Strecken der Disposition nach: Flugplatz → Quelle → Ziel → zurück.
- Fliegend erscheinen sie etwa 22 px über ihrem Bodenschatten, mit drehenden Rotoren und farbiger Ladung.

**Anzeige:**
- Der Transport-Reiter zeigt die Zahl der Drohnen und ihre Auslastung.
- Drohnenstrecken sind in der Fahrtenliste mit „Drohne“ markiert.

## Speicherstand
- Kein neues Schema; es bleibt Version 7.
- Drohnen sind abgeleiteter Zustand und werden nicht gespeichert.

## Assets
Generiert und noch einzubinden:
- `wood_house`
- `brick_house`
- `row_house`
- `drone_port`

Bis dahin werden diese Gebäude prozedural gezeichnet.
