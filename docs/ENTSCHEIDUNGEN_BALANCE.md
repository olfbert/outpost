# Entscheidungen – Balance und Laufwege (v0.6.1)

Neues Dokument; die bisherigen Entscheidungs-Docs bleiben unverändert.
Stand 16.11.2026, Wunsch von Flo: „Einwohner laufen durch Häuser – das soll nicht sein.
Der Abbau soll schneller gehen, aber dafür die Bauten teurer.“

## Laufwege

- Einwohner, Holzfäller und Bummler suchen abseits der Straßen einen Weg um Gebäude herum
  (Breitensuche über Felder, 8 Richtungen, keine abgeschnittenen Ecken, danach geglättet).
- Dabei halten sie etwa 0,14 Felder Abstand zu Hauswänden.
- Nur das eigene Start- und Zielgebäude darf betreten werden. Sobald eine Figur auf einem
  Gebäudefeld steht, ist sie „drinnen“ und wird nicht gezeichnet – sie verschwindet an der Tür.
- Nach dem Bummeln gehen Einwohner zurück ins Haus, statt sichtbar mitten im Gebäude zu stehen.
- Hühner und Herdentiere prüfen die Strecke vor dem Loslaufen; versperrt ein neues Gebäude den Weg,
  bleiben sie stehen, statt durchs Haus zum Mittelpunkt zu laufen.

## Produktion ×4

Alle Abbau- und Verarbeitungsmengen sind vervierfacht, damit die Ketten im Gleichgewicht bleiben.

| Gebäude | vorher je Monat | jetzt je Monat |
|---|---|---|
| Holzfällerlager | 40 Rundholz | 160 Rundholz |
| Sägewerk | 40 Rundholz → 60 Bretter | 160 → 240 |
| Steinbruch | 50 Stein | 200 |
| Eisenerz-/Kohlemine | je 30 | je 120 |
| Kalksteinbruch, Tongrube | je 40 | je 160 |
| Sandgrube | 50 | 200 |
| Schmelzofen | 20 Erz + 20 Kohle → 10 Stahl | 80 + 80 → 40 |
| Zementwerk | 30 Kalkstein + 10 Ton → 20 Zement | 120 + 40 → 80 |
| Betonwerk | 10 Zement + 20 Sand + 10 Stein → 30 Beton | 40 + 80 + 40 → 120 |

Betriebskosten bleiben gleich – die Bauten werden also teurer in der Anschaffung, rechnen sich aber schneller.

## Baukosten

Geld ×2,5, Material ×2 (z. B. Kleines Wohnhaus 900 Cr · 12 Br · 6 St → 2.250 Cr · 24 Br · 12 St;
Schmelzofen 6.000 Cr → 15.000 Cr · 60 Br · 120 St).

## Begleitende Anpassungen

- Lager: Landemodul 200 → 600 je Ware, Lagerhalle 400 → 1.200 je Ware (sonst wäre das Lager nach gut einem Monat voll).
- Startmaterial: 80 → 120 Bretter, 40 → 60 Stein (Startgeld bleibt 25.000 Cr).
- Holz je Baum: 8 → 20 Festmeter, also rund 8 Bäume je Monat statt 5 – sichtbar mehr Fällarbeit,
  der Wald ist aber nicht in zwei Tagen kahl.
- Nachwachsen schneller: junger Baum nach 4 statt 6 Monaten, ausgewachsen nach 12 statt 18.

## Alte Spielstände

- Spielstand-Schema 5. Jedes Gebäude merkt sich seinen Kaufpreis (`paid`).
- Die Migration 4 → 5 trägt bei bestehenden Gebäuden die alten Preise ein, damit ein Abriss
  nicht mehr erstattet, als damals bezahlt wurde.
- Laufende Betriebe produzieren sofort mit den neuen Mengen; Vorkommen leeren sich entsprechend schneller.
