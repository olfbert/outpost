# Entscheidungen – Stufe B: Lager, Lkw, Logistik (v0.8.0)

Neues Dokument; bestehende Entscheidungs-Docs bleiben unverändert. Grundlage: Ausbauplan (16.11.2026),
Stufe B „Echte Logistik“, mit Flos Wahl „Echte Logistik“ und „Gebäude sind erst Baustellen“.
Ohne Treibstoff (Lkw kosten Geld im Unterhalt), Tankstelle entfällt vorerst.

## Waren haben einen Ort

- Waren liegen in **Lagern**: Landemodul (600 je Ware), Lagerhalle (1.200 je Ware), neu **Silo** (2.000 je Ware, nur Schüttgut).
  Schüttgut: Rundholz, Stein, Eisenerz, Kohle, Kalkstein, Ton, Sand, Getreide, Kartoffeln.
- Jeder Betrieb hat **Puffer**: Eingang ca. 1,5 Monate Bedarf (mind. 20), Ausgang 2 Monate Produktion (mind. 40);
  der Ackerhof fasst seine ganze Ernte. Voller Ausgang = „Wartet auf Abholung“, leerer Eingang = „Wartet auf Lieferung“.
- Die Lagerzahlen oben und in der Übersicht sind die Summe aller Lager; Waren in Betriebspuffern zählen erst nach der Abholung.
- **Baustellen** verbauen nur angeliefertes Material; das Geld wird weiter beim Setzen bezahlt.
- **Versorgung**: Häuser essen aus ihrem nächsten Versorgungspunkt. Das Landemodul aus seinem Lager, der Lebensmittelladen
  aus seinem Vorrat, den Lkw aus den Lagern auffüllen (1,5 Monate Bedarf, gleichmäßig auf die vorhandenen Sorten).
- Bezahlen und Erstatten von Material, Verkauf und Abriss laufen über die Lager. Beim Abriss wandern Bestand und Puffer
  in die übrigen Lager.
- Startfracht: Solange noch kein Landemodul steht, liegt sie als „Fracht“ bereit und kommt mit der Landung ins Modul.

## Lkw und Disposition

- Lkw: Landemodul 2, Spedition 2 und bis zu 6 weitere zum Kauf (5.000 Cr, 80 Cr Unterhalt je Monat).
- Gerechnet wird als Fluss: Jeder Lkw hat ein Zeitbudget. Eine Fuhre fasst 16 Einheiten; Fahrzeit = Hin- und Rückweg
  bei 2.200 Erdweg-Feldern je Monat, plus 0,004 Monate Laden und Entladen.
  Wegkosten: Erdweg 1, Schotter 0,7, Straße 0,45 je Feld; ohne Weganschluss querfeldein das Dreifache der Luftlinie.
- Reihenfolge je Schritt: (1) Bedarf decken – Baustellen, dann Versorgungspunkte, dann Betriebe mit dem leersten Eingang,
  jeweils aus der nächsten Quelle (andere Betriebe oder Lager), höchstens 70 % des Budgets; (2) Ausgänge ins nächste Lager mit Platz;
  (3) Rest für offenen Bedarf. Direkt von Betrieb zu Betrieb geht ohne Umweg übers Lager.
- Beispiel: Zwei Holzfäller und ein Sägewerk 58 Erdweg-Felder vom Lager lasten zwei Lkw zu etwa zwei Dritteln aus.
- Übersicht „Transport“: Lkw, Auslastung, wartende Betriebe, häufigste Fahrten, Tipp gegen Engpässe.

## Sichtbar

- Bis zu 12 Lkw fahren echte Strecken aus der Disposition: zur Quelle, laden (Ladung in Warenfarbe), zum Ziel, entladen.
  Rechtsverkehr, Tempo je Wegtyp. Pixelgrafik im Code (drei Kabinenfarben, 16 Ladungsfarben, vier Richtungen).
- Bewohner mit mehr als 18 Wegfeldern zur Arbeit fahren Auto (fünf Farben).
- Spedition und Silo: Higgsfield-Bilder (z_image); bis zur Einbindung Platzhalter.

## Spielstand

- Schema 7. Migration 6 → 7: das bisherige Gesamtlager kommt ins Landemodul (ohne Modul: als Fracht),
  Betriebspuffer starten leer, Baustellen bekommen ihr restliches Material per Lkw.
- Neu je Gebäude: `inv` (Lager), `inBuf`, `outBuf`, `trucks` (gekaufte Lkw), `site.have`; im Zustand `unstored` und `roadRev`.
