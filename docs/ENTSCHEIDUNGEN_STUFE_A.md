# Entscheidungen – Stufe A: Versorgung, Landwirtschaft, Baustellen (v0.7.0)

Neues Dokument; bestehende Entscheidungs-Docs bleiben unverändert. Grundlage ist das Doc
„OUTPOST – Ausbauplan: Landwirtschaft, Logistik, Bahn, Nachbarn“ (16.11.2026) mit Flos Antworten:
Gebäude entstehen als Baustellen, Bewohner ziehen nicht weg. Übrige Fragen nach Vorschlag:
kein Treibstoff, milder Winter mit Schnee, vier Nachbarn (Stufe D), vorhandenes Higgsfield-Guthaben.

## Baustellen

- Jedes Gebäude außer dem Landemodul entsteht als Baustelle. Beim Setzen wird nur das Geld bezahlt.
- Material holt sich die Baustelle nach Baufortschritt aus dem Lager; fehlt es, ruht sie („Wartet auf Material“).
  Man darf also schon bauen, wenn noch Bretter fehlen.
- Bautrupps: Landemodul 2, jeder Bauhof +2. Weitere Baustellen warten auf einen freien Trupp.
- Bauzeit = 0,008 + Geldkosten / 250.000 Monate (1 Monat = 1 echter Tag):
  Wohnhaus ca. 25 Minuten, Sägewerk ca. 33 Minuten, Schmelzofen ca. 1,6 Stunden, Wohnblock ca. 1,3 Stunden.
- Sichtbar: Betonplatte mit Material, Gerüst, das Gebäude wächst von unten nach oben; zwei Bauarbeiter je Baustelle
  kommen vom Landemodul bzw. Bauhof und arbeiten an der Vorderkante.
- Abbruch einer Baustelle: Geld anteilig (100 % bei 0 %, 50 % bei fertig), verbautes Material zur Hälfte.
- Freischaltungen zählen nur fertige Gebäude.

## Bevölkerung und Versorgung

- Häuser starten mit 2 Bewohnern (Notunterkunft gleich voll) und wachsen um 4 je Monat, solange sie versorgt sind.
  **Bewohner ziehen nie weg.**
- Versorgt ist ein Haus im Umkreis eines Versorgungspunkts: Landemodul 12 Felder, Lebensmittelladen 14 Felder.
- Jeder Bewohner isst 4 Einheiten Nahrung im Monat, gleichmäßig aus allen vorhandenen Sorten, Notrationen zuletzt.
- Stufen: hungrig (weniger als halb satt oder kein Laden) · satt · zufrieden (2 Sorten) · gut versorgt (3+ Sorten).
  Notrationen machen satt, zählen aber nicht als Sorte.
- Hunger: keine Steuern, Betriebe arbeiten bis auf 50 % langsamer (anteilig nach Anteil satter Bewohner).
- Steuern am Monatsende: 15 Cr je Bewohner, ×1,5 zufrieden, ×2 gut versorgt; in den Einnahmen enthalten.
- Arbeitskraft: Arbeitsplätze werden aus den Bewohnern besetzt, Gebäude mit Vorrang zuerst, sonst nach Baureihenfolge.
  Halbe Belegschaft = halbe Leistung.
- Wohnblock (12 Bewohner) füllt sich über 4 Bewohner nur mit drei Nahrungssorten.
- Start: 300 Notrationen (neue und alte Spielstände).

## Landwirtschaft

- Ackerhof steckt beim Setzen bis zu 16 Felder im Umkreis von 3 Feldern ab (nächste zuerst, Bäume weichen,
  Felsen und Vorkommen bleiben). Die Vorschau zeigt die Felder schon beim Platzieren.
- Auf Feldern und Weiden kann nichts gebaut und kein Weg gelegt werden.
- Bodengüte: Fruchtbare Ebene 1,2 · Grasland 1,0 · Wald 0,9 · Nadelwald 0,85 · Sand 0,6 · Geröll 0,5.
- Ertrag je Feld und Jahr: Kartoffeln 60, Getreide 80. Wachstum März bis Juli (nach Belegschaft),
  Ernte gleichmäßig über August und September; was nicht ins Lager passt, verdirbt.
  Sorte im Infofenster wählbar, gilt ab der nächsten Ernte.
- Jahreslauf der Felder: gepflügt (März/April), junge Saat (Mai/Juni), grün (Juli), reif (Aug./Sep.),
  Stoppeln (Okt./Nov.), Schnee (Dez.–Feb.).
- Viehhof: Weide mit bis zu 20 Feldern, eingezäunt; liefert bis 40 Vieh/Monat anteilig zur Weidegröße.
  Bis zu 10 Tiere grasen sichtbar auf der Weide.
- Fischerhütte braucht Wasser im Umkreis von 2 Feldern, liefert ganzjährig 120 Fisch.
- Neue Spiele beginnen am 1. März (Aussaat).

## Winter

- Dezember bis Februar liegt Schnee auf dem Land (Wasser bleibt offen, Wege bleiben frei).
  Die Weltübersicht (fernste Zoomstufe) zeigt weiter die Sommerkarte.

## Neue Gebäude und Waren

| Gebäude | Rezept je Monat | Kosten | Arbeiter |
|---|---|---|---|
| Fischerhütte | → 120 Fisch | 1.500 Cr · 20 Br | 2 |
| Ackerhof | Felder → Kartoffeln/Getreide (Ernte) | 4.000 Cr · 40 Br · 10 St | 4 |
| Viehhof | Weide → 40 Vieh | 4.500 Cr · 50 Br · 10 St | 3 |
| Mühle | 120 Getreide → 120 Mehl | 5.000 Cr · 30 Br · 30 St | 2 |
| Bäckerei | 120 Mehl → 180 Brot | 4.000 Cr · 30 Br · 20 St | 3 |
| Schlachterei | 40 Vieh → 120 Fleisch | 4.000 Cr · 25 Br · 25 St | 3 |
| Glashütte | 80 Sand + 20 Kohle → 40 Glas | 9.000 Cr · 40 Br · 60 St | 4 |
| Gewächshaus | → 160 Gemüse (ganzjährig) | 10.000 Cr · 20 Br · 10 Sta · 40 Gl | 3 |
| Lebensmittelladen | versorgt 14 Felder Umkreis | 2.500 Cr · 20 Br · 10 St | 2 |
| Wohnblock | 12 Bewohner | 12.000 Cr · 40 Br · 40 St · 60 Be · 20 Gl | – |
| Bauhof | +2 Bautrupps | 3.000 Cr · 40 Br · 20 St | 4 |

Neue Waren: Glas, Notrationen, Fisch, Kartoffeln, Getreide, Mehl, Brot, Vieh, Fleisch, Gemüse.

## Spielstand

- Schema 6. Migration 5 → 6: bestehende Gebäude gelten als fertig, Häuser voll belegt, +300 Notrationen.
- Neu gespeichert je Gebäude: `site` (Baustelle), `pop`, `fields`, `crop`, `growth`, `priority`; im Zustand `taxAcc`.
- Hinweis für bestehende Siedlungen: Häuser außerhalb von 12 Feldern ums Landemodul sind bis zum ersten
  Lebensmittelladen unversorgt; Betriebe ohne genug Bewohner laufen langsamer.

## Grafik

- 11 neue Gebäudebilder per Higgsfield (z_image), Zuordnung in `tools/asset_batch_stufe_a.json`.
- Die Hintergründe kamen teils als Farbverlauf (Magenta → Grün/Pfirsich). Das Freistellwerkzeug kann dafür
  den glatten Hintergrund zusätzlich vom Rand aus wachsen lassen (`--grow`) und dünne Reste entfernen (`--open`).
- Baustellen-Platte und Gerüst sowie Felder, Weidezäune und Schnee sind Pixelgrafik aus dem Code.
