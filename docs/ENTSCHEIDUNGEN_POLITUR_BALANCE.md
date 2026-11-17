# Entscheidungen – Neue Wohnhäuser, Politur und Balance (Version 0.13.0)

Stand: 17.11.2026. Neues Dokument; ENTSCHEIDUNGEN_BALANCE.md und die übrigen Dokumente bleiben unverändert.

## Fünf neue Wohngebäude
| Gebäude | Größe | Bewohner | Kosten | Besonderheit |
|---|---|---|---|---|
| Containerhaus | 1×1 | 3 | 1.300 Cr · 12 Br · 10 St | billigster Wohnraum für den Anfang |
| Doppelhaus | 2×1 | 8 | 5.400 Cr · 36 Br · 40 St | über 5 Bewohner 2 Nahrungssorten |
| Arbeiterwohnheim | 2×2 | 18 | 8.800 Cr · 50 Br · 60 St · 12 Sta | viele Arbeitskräfte, nur 70 % Steuern; über 8 Bewohner 2 Sorten |
| Stadtvilla | 2×2 | 8 | 14.000 Cr · 40 Br · 70 St · 15 Gl | doppelte Steuern, verschönert die Umgebung (+2); über 4 Bewohner 3 Sorten; braucht Glashütte |
| Hochhaus | 2×2 | 40 | 26.000 Cr · 40 Br · 160 Be · 45 Sta · 40 Gl | über 12 Bewohner 3 Sorten; braucht Wohnblock |

- Neues Gebäudefeld `taxMul` (Steuerfaktor), genutzt von Wohnheim (0,7) und Villa (2).
- Die Computer-Städte bauen die neuen Typen ebenfalls, passend zu ihrer Größe:
  - Containerhäuser in kleinen Außenposten,
  - Wohnheime in Industriestädten,
  - Villen und Hochhäuser in großen Städten.
- Grafik: Die fünf Higgsfield-Bilder sind erzeugt (Jobs in `tools/asset_batch_wohnen_3.json`). Bis Flo sie schickt, werden die Häuser vereinfacht gezeichnet.

## Politur
- **Schornsteinrauch:**
  - Schmelzofen, Glashütte, Zementwerk, Betonwerk und Bäckerei qualmen dunkel, solange sie laufen.
  - Bewohnte Häuser mit Kamin rauchen leicht, im Winter stärker.
  - Computer-Städte rauchen immer.
  - Als Rauchquelle dient die oberste Spitze der Gebäudegrafik.
- **Vögel:** Ab und zu zieht ein kleiner Vogelschwarm mit Flügelschlag über die Nahansicht.

## Balance – mit einem Spiel-Bot geprüft
Für die Balance gibt es einen Test-Bot (`tests/j_balance.py`). Er baut ohne Cheats nach einer üblichen Reihenfolge und spielt 3–4 Spieljahre auf zwei Welten. Dabei kamen diese Probleme heraus:

1. **Verklemmung beim Start.** Wer früh viele Häuser setzt, verbraucht alle Bretter. Das Sägewerk brauchte selbst Bretter und kam nie dran, das Spiel stand.
   - Holzfällerlager kostet jetzt nur Geld (1.500 Cr).
   - Sägewerk kostet 3.750 Cr und 60 Rundholz statt Bretter und Stein.
   - Steinbruch kostet 3.000 Cr, 20 Bretter und 20 Rundholz statt 30 Bretter.
   - Holzfäller, Sägewerk und Steinbruch sind Grundbetriebe. Ihre Baustellen bekommen zuerst einen Bautrupp und Material.
   - Baustellen, deren Material vorhanden ist, kommen vor Baustellen, die ohnehin warten müssten.
2. **Verklemmung bei Arbeitern.** Die wenigen Siedler arbeiteten beim Holzfäller, das Sägewerk stand leer, Häuser warteten auf Bretter.
   - Betriebe, deren Ware gerade auf Baustellen fehlt, bekommen jetzt zuerst Arbeiter. Danach gilt wieder die Baureihenfolge.
3. **Holzfäller ohne Wald.** Die Mindestmenge zum Bauen steigt von 20 auf 30 Bäume.
   - Wird der Wald knapp, verweist der Hinweis auf Pflanz- und Fällgebiet.
4. **Geld wurde später bedeutungslos.** Rohstoffverkauf zum Festpreis brachte nach drei Jahren über 150.000 Cr. Neu gilt eine Marktsättigung (`src/simulation/market.js`):
   - Je mehr Warenwert man verkauft, desto tiefer fällt der Preis. Bei 25.000 Cr Grundwert liegt er bei der Hälfte, nie unter 35 %.
   - Die Sättigung baut sich mit 35 % pro Monat wieder ab.
   - Das Wirtschaftsfenster zeigt den aktuellen Preis mit Prozentangabe.
   - Ergebnis: Verarbeitung und Handel mit den Nachbarn lohnen mehr.
5. **Startgeld:** 25.000 → 30.000 Cr. Im Bot-Lauf blieb der Kontostand damit in den ersten Monaten knapp positiv statt im Minus.
6. **Mühle ohne Getreide:** Der Status erklärt jetzt, dass ein Ackerhof auf Getreide umgestellt werden muss. Ebenso für Mehl und Vieh.

**Ergebnis im Bot-Lauf** (Welt TEST):
- Monat 10: 12 Einwohner, Kontostand positiv.
- Monat 18: 33 Einwohner.
- Monat 26: 45 Einwohner und gut 30.000 Cr.
- Danach wächst das Geld um 6.000–9.000 Cr im Monat. Der Bot baut selbst nicht weiter aus. Für einen Spieler ist das das Kapital für Schwerindustrie und Hochhäuser.
