# Entscheidungen – Aufgeräumtes HUD (Version 0.13.3)

Stand: 17.11.2026. Neues Dokument; ältere Dokumente bleiben unverändert.

## Baumenü ausblendbar
- Rechts neben den Reitern sitzt ein Pfeil (▾), der das Baumenü ausblendet. Unten links erscheint dann ein kleiner Knopf „Bauen“, der es wieder einblendet.
- Am Desktop schaltet die Taste **B** um.
- Der Zustand wird im Browser gemerkt (`localStorage` „outpost.buildHidden“). Er gehört nicht zum Spielstand.
- Bei ausgeblendetem Menü rutschen die Knöpfe rechts, das Infofenster und die Platzierungsleiste nach unten. Ein laufender Platzierungsmodus wird beendet.

## Kleineres HUD
- Knöpfe 40 statt 44 px, Abstände kleiner.
- Siedlungsname und Datum in einer kompakten Karte.
- Bestandsleiste kleiner.
  - Auf dem Handy einzeilig mit Kurzformen: Br, St, Nahr., Ew.
  - Rundholz entfällt auf schmalen Handys; es steht im Wirtschaftsfenster.
- Die Minimap sitzt oben rechts in der ersten Reihe und ist kleiner: 132×66 px, Handy 108×54 px, Desktop 200×100 px.
- Die Zoomstufe („Nahansicht“ usw.) ist nicht mehr dauerhaft zu sehen. Sie erscheint nur kurz oben in der Mitte, wenn sie wechselt.
- Auf Touch-Geräten sind die Knöpfe Hinein- und Herauszoomen ausgeblendet; dort zoomt man mit zwei Fingern. Am Desktop bleiben sie.
