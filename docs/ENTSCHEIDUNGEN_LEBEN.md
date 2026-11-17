# Menschen und Tiere (Stand 16.11.2026, Version 0.4.0)

Vorgezogen aus Phase 5 auf Wunsch. Ergänzt die bisherigen Dokumente.

## Bewohner

- Wohnplätze: Provisorische Unterkunft 2, Kleines Wohnhaus 4 (`residents` in `config/buildings.js`).
- Arbeitsplätze je Betrieb (`workers`): z. B. Holzfäller 2, Sägewerk 3, Minen 3, Schmelzofen 4.
- Bewohner werden der Reihe nach Arbeitsplätzen zugeteilt. Sie gehen über die Wege (kürzester
  Weg, Breitensuche) vom Haus zum Betrieb, bleiben eine Weile drin und gehen zurück.
  Ohne Wegverbindung oder ohne Arbeit bummeln sie ums Haus.
- Bewegung in Echtzeit (rein darstellend); die Produktion hängt noch **nicht** an den Arbeitskräften.
  Fehlende Leute werden im Wirtschaftsfenster (Bilanz) nur angezeigt.
- Bevölkerung = Wohnplätze (sofort voll). Zuzug über Zeit und Versorgung folgen mit Phase 5.
- Sechs Kleidungsvarianten (Helm, Mütze, Haar) und vier Hauttöne, vier Blickrichtungen, Laufbilder.

## Tiere

- Grasläufer: erfundener, hochbeiniger Pflanzenfresser des Planeten. Herden von 3–6 Tieren
  grasen auf Grasland und Wiesen, mindestens 22 Felder von der Siedlung entfernt
  (etwa jeder achte Wiesen-Chunk, fest aus dem Seed).
- Hühner: drei je Wohnhaus, laufen ums Haus.
- Tiere betreten keine Wege, Gebäude, Gewässer, Sümpfe oder Felsen; steht plötzlich etwas
  im Weg, kehren sie zu ihrem Platz zurück.

## Technik

- `src/life/life.js` (Verhalten), `src/rendering/lifeSprites.js` (prozedurale Pixel-Figuren).
- Nur in der Nahansicht (ab Zoom 0,5) sichtbar und berechnet, mit ca. 30 Bildern/s.
- Figuren werden jedes Bild zwischen Bäume und Gebäude einsortiert (zwei sortierte Listen
  gemischt), damit sie korrekt hinter und vor Objekten erscheinen.
- Nichts davon wird gespeichert; die Figuren entstehen beim Laden neu.

## Später

- Higgsfield-Figuren und -Tiere (Siedler, Arbeiter, Nutztiere, weitere Wildtiere).
- Arbeitskräfte als Voraussetzung für Produktion, Zuzug und Bedürfnisse.
- Fahrzeuge (der Pick-up ist schon freigestellt), Rauch und Lichter.
