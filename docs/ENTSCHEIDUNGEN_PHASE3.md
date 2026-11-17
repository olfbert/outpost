# Entscheidungen Phase 3 (Stand 16.11.2026)

Ergänzt die bisherigen Entscheidungsdokumente, ersetzt nichts davon.

## 1. Zeit und Simulation

- Fließendes Zeitmodell wie entschieden: 1 echter Tag = 1 Ingame-Monat. Die Spielzeit läuft als
  Gleitkommazahl (`state.gameMonths`), angezeigt mit Tag und Monat.
- Produktion läuft anteilig in Schritten von höchstens 0,02 Monaten (ca. 29 echte Minuten).
- Betriebskosten werden am Monatsende abgerechnet und in der Monatsbilanz verbucht.
- Offline-Zeit wird beim Laden in einem Rutsch nachgerechnet (bereits Teil von Phase 4);
  das Spiel meldet, wie viel Zeit nachgerechnet wurde.
- Entwicklermodus mit Zeitraffer: Seite mit `?dev=1` oder `#dev` öffnen (auf der Artifact-Seite nur `#dev`). Stufen 1×, 1 Std = 1 Monat,
  1 Min = 1 Monat, 2 s = 1 Monat. Der Zeitraffer wird nicht gespeichert; Pausen von mehr
  als 5 Sekunden (Tab im Hintergrund) zählen immer in Echtzeit.

## 2. Produktionsketten (Werte in `config/buildings.js`, je Monat)

| Gebäude | Eingang | Ausgang | Betrieb (Cr) | Freischaltung |
|---|---|---|---|---|
| Holzfällerlager | Bäume im Umkreis von 8 Feldern | 40 Rundholz | 120 | Landemodul |
| Sägewerk | 40 Rundholz | 60 Bretter | 200 | Landemodul |
| Steinbruch | Steinvorkommen | 50 Stein | 180 | Landemodul |
| Tongrube | Tonvorkommen | 40 Ton | 120 | Sägewerk |
| Sandgrube | Sandvorkommen | 50 Sand | 120 | Sägewerk |
| Kalksteinbruch | Kalksteinvorkommen | 40 Kalkstein | 180 | Sägewerk |
| Eisenerzmine | Eisenerzvorkommen | 30 Eisenerz | 260 | Sägewerk |
| Kohlemine | Kohlevorkommen | 30 Kohle | 260 | Sägewerk |
| Schmelzofen | 20 Eisenerz + 20 Kohle | 10 Stahl | 520 | Eisenerz- und Kohlemine |
| Zementwerk | 30 Kalkstein + 10 Ton | 20 Zement | 420 | Kalksteinbruch und Tongrube |
| Betonwerk | 10 Zement + 20 Sand + 10 Stein | 30 Beton | 380 | Zementwerk und Sandgrube |

- Abbaugebäude stehen auf dem Vorkommen. Ihr Vorrat ist die Summe der passenden Felder unter
  und bis zu 2 Felder um die Grundfläche; Felder können nur einem Gebäude gehören.
- Holzfäller fällen pro 8 fm einen Baum (der nächste zuerst); der Wald verschwindet sichtbar.
  Ohne Bäume in Reichweite steht das Lager still. Nachpflanzen (Förster) folgt später.
- Kein Personal und kein Transport simuliert: Ein Gebäude mit Weganschluss liefert direkt ins
  gemeinsame Lager der Siedlung. Beides kommt mit Bewohnern (Phase 5) bzw. Verkehr.

## 3. Lager

- Ein gemeinsamer Bestand; Kapazität **je Ware** = Summe aller Lager
  (Landemodul 200, jede Lagerhalle 400). Ist eine Ware voll, stoppen ihre Erzeuger („Lager voll“).

## 4. Handel und Bilanz

- Verkauf zu Festpreisen (`config/economy.js`) im Wirtschaftsfenster (Tipp auf die Bestandsleiste).
  Nachfrage, schwankende Preise und Lieferverträge folgen später.
- Monatsbilanz: Einnahmen, Bauausgaben, Betriebskosten, Saldo (letzte 24 Monate).
- Geld darf durch Betriebskosten ins Minus gehen; bauen geht dann nicht mehr. Betriebe lassen
  sich pausieren (keine Betriebskosten, keine Produktion).

## 5. Spielstand

- Schema-Version 3 (Spielzeit, Bilanzen, Produktionsdaten je Gebäude). Ältere Stände werden
  migriert; ihre Spielzeit ergibt sich aus der bisher vergangenen echten Zeit.

## 6. Grafik

- Die neuen Gebäude sind Platzhalter (mit Halden, Fördertürmen, Schornsteinen, Silos).
- Notunterkunft, Lagerhalle und Holzfällerlager wurden am 16.11. bei Higgsfield generiert und
  werden eingebaut, sobald die Bilder vorliegen (der Bildserver ist aus der Arbeitsumgebung
  nicht erreichbar).
