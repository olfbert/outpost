# Optik nach Referenz (Stand 16.11.2026)

Grundlage: vier Screenshots, die Flo am 16.11.2026 als Stilreferenz geschickt hat
(Nahansicht einer Siedlung, Regions- und Großraumansicht). Die Bilder selbst liegen
bewusst **nicht** im Projekt: Sie stammen aus einem fremden Spiel und dürfen weder
eingebunden noch veröffentlicht werden. Übernommen wurden nur allgemeine Gestaltungsprinzipien.

## Umgesetzt (Version 0.2.1)

- Farben: Gras, Wiese, Wald und Sumpf dunkler und kühler; jede Rampe läuft von Blaugrün
  (Schatten) nach Gelbgrün (Licht). Bäume und Büsche entsprechend nachgezogen.
- Relief: Die Flächendarstellung schattiert in zwei Richtungen (Licht von links oben) und
  nutzt zusätzlich ein feines Relief, das nur für Licht und Schatten zählt.
- Weite Zoomstufen: stufenlose Farben, weich vergrößert, Waldflächen mit Kronenstruktur und
  Schattenlücken, einzelne Gehölze im Grasland, höhere Auflösung der Bildpyramide.
- Tiefenunschärfe an oberem und unterem Rand beim Herauszoomen (CSS `backdrop-filter`,
  im Menü abschaltbar).
- Wolken mit Schatten in Regions- und Großraumansicht (fest in der Welt, im Menü abschaltbar).
- Siedlungsnamen als helle Banner mit Serifenschrift, schon ab der Siedlungsansicht.
- Nahansicht: mehr Büsche in Gruppen, blühende und flache Sträucher, weniger Wüste
  (Sand nur noch bei sehr trockenem, warmem Klima).

## Bewusst später

- Felder, Hecken, Zäune, Gärten: kommen mit Landwirtschaft (Phase 3) und Infrastruktur.
- Echtes Höhenrelief im Raster (Gebäude auf Hängen): größerer Umbau, eigene Entscheidung.
- Wappen an den Ortsnamen: erst mit mehreren Siedlungen/Spielern sinnvoll.

## Hinweis

Weltinhalt hat sich durch die Vegetations- und Klimaänderung leicht verschoben: Derselbe Seed
erzeugt jetzt etwas andere Büsche und Sandflächen als in 0.2.0. Gebäude und Wege bestehender
Spielstände bleiben erhalten.
