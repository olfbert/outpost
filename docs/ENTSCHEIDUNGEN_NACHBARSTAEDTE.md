# Entscheidungen – Mehr Computer-Städte, Wachstum, Neugründungen (Version 0.12.0)

Stand: 17.11.2026. Neues Dokument; ENTSCHEIDUNGEN_STUFE_D.md bleibt unverändert.

## Anzahl und Gründungen
- **Zu Beginn:** 8 Siedlungen statt 4.
  - Die ersten vier liegen genau wie bisher, damit alte Spielstände ihre Nachbarn behalten.
  - Die übrigen Plätze verteilen sich spiralförmig, 150 bis 960 Felder vom Start entfernt.
  - Alle Plätze liegen auf festem, flachem Land und mindestens 110 Felder voneinander entfernt.
- **Höchstens 24 Siedlungen.** Plätze, Namen, Profile und Gründungszeitpunkt folgen aus dem Seed.
- **Neue Siedlungen:** Die erste entsteht etwa im 4. Spielmonat, danach etwa alle 5 Monate eine weitere (± 2 Monate).
  - Gegründet wird nur, wenn im Umkreis von 34 Feldern kein eigenes Gebäude steht. Sonst wartet der Platz.
  - Bei einer Gründung erscheinen eine Meldung und ein Eintrag im Verlauf.
- **Nachrechnen offline:** Spät nachgeholte Gründungen starten etwas größer, mit 2,5 % pro verpasstem Monat, höchstens Größe 250.
- Ein alter Spielstand bekommt beim Laden alle Siedlungen, deren Gründungszeit schon vorbei ist.

## Wachstum
- **Größe 30 bis 900:** Etwa 3 Einwohner je Größenpunkt, also bis rund 2700.
- **Monatliches Wachstum:** 4,5 % × Wachstumsfaktor × Versorgung, minus 0,5 %.
  - Jede Siedlung hat einen eigenen Faktor zwischen 0,6 und 1,5 aus dem Seed. Dadurch wachsen sie unterschiedlich schnell.
- **Größenklassen** (für Beschriftung und Handelsfenster): Außenposten < 70, Siedlung < 180, Dorf < 380, Kleinstadt < 650, darüber Stadt.

## Wie die Städte aussehen
- Ein Hauptstraßenkreuz, das mit der Größe länger wird.
  - Bis Größe 180 ist es ein Schotterweg, ab 180 eine befestigte Straße, ab 380 eine Hauptstraße.
- Ab Größe 200 kommen Querstraßen im Abstand von 6 Feldern dazu, bis zu drei Ringe.
- Gebäude:
  - Häuser: 4 + Größe/12, gemischt aus kleinen Wohnhäusern, Holzhäusern und Backsteinhäusern; ab 200 Reihenhäuser, ab 320 Wohnblöcke.
  - Betriebe nach Profil: 2 + Größe/60.
  - Ab 150 ein Lebensmittelladen, ab 260 ein Fuhrhof.
  - Ab 90 Laternen an der Hauptstraße, die nachts leuchten.
- Die Bauplätze füllen sich von der Mitte nach außen. Äußere Querstraßen sind zunächst leer und werden mit dem Wachstum bebaut.
- Städte bauen nie auf eigenen Gebäuden.
  - Ihre Straßen enden davor.
  - Eigene Wege bleiben unverändert.

## Speicherung
- Die Wege der Nachbarn werden nicht mehr im Spielstand gespeichert, sondern aus dem Seed neu angelegt. So können sie beim Wachsen ausgebaut werden.
- Ältere Spielstände enthielten Nachbarwege als Schotter. Diese werden beim ersten Laden als Nachbarwege übernommen.
- Gespeichert wird je Siedlung weiter nur der veränderliche Zustand: Größe, Lager, Beziehung, Umsatz.
