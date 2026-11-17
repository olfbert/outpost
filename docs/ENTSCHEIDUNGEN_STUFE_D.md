# Entscheidungen – Brücken, Computer-Nachbarn und Handel (v0.9.0)

Neues Dokument; frühere Docs bleiben unverändert. Anlass (17.11.2026, Flo):
„Das Cheats-Fenster ist zu klein und ganz unten ist das Bild abgeschnitten. Ich brauche Brücken und KI-Mitspieler
und Handel bzw. Einkauf von Ressourcen.“ Damit wird Stufe D aus dem Ausbauplan vor Stufe C (Bahn) gezogen.

## Darstellung auf dem iPhone

- Die Spielfläche füllt jetzt immer das ganze Fenster (vorher richtete sie sich nach der Bildschirmhöhe; in der
  Claude-App ist das Fenster teils höher, dadurch blieb unten ein Streifen). Größenänderungen werden laufend erkannt.
- Cheat-, Wirtschafts- und Handelsfenster haben eine feste Höhe; Safari hatte das Cheat-Fenster sonst zusammengeklappt.

## Brücken

- Wege dürfen über Fluss, See und flaches Meer gebaut werden (nicht über Tiefsee), höchstens 12 Wasserfelder am Stück.
- Kosten je Brückenfeld zusätzlich zum Weg: 220 Cr und 5 Bretter.
- Darstellung: Holzbohlen mit Geländer und Schatten auf dem Wasser; Lkw, Autos und Bewohner nutzen Brücken wie Wege.

## Computer-Nachbarn

- Vier Nachbarsiedlungen, 170 bis 470 Felder vom Start, Lage, Name und Profil aus dem Seed:
  Stahlstadt (Erz, Kohle, Stahl), Agrarkolonie (Kartoffeln, Getreide, Fleisch, Gemüse),
  Holzsiedlung (Rundholz, Bretter), Baustoffwerk (Stein, Sand, Zement, Beton).
- Sichtbar auf der Karte mit Namensschild: Straßenkreuz, Häuser und Betriebe ihres Profils, eine Handelsstation
  (Lagerhalle) am östlichen Straßenende. Ihre Gebäude und Wege lassen sich nicht überbauen oder abreißen.
- Wirtschaft je Monat: Sie produzieren nach Profil und Größe, verbrauchen, was sie brauchen
  (70 % davon kommt von anderen Nachbarn und Versorgungsflügen, den Rest muss jemand liefern), und wachsen
  bei guter Versorgung um bis zu ca. 1,5 % im Monat (Größe 40–400). Ihr Ort wächst sichtbar mit.
- Gespeichert wird nur ihr veränderlicher Zustand (Größe, Lager, Beziehung, Umsatz) – Schema bleibt 7,
  ältere Spielstände bekommen die Nachbarn beim Laden dazu.

## Handel

- Knopf mit den zwei Pfeilen am rechten Rand oder Tippen auf ein Nachbargebäude öffnet das Handelsfenster.
- Handel mit Nachbarn braucht ein fertiges **Handelskontor** (Logistik, 6.000 Cr, einmalig).
- Preise nach Angebot und Nachfrage: Was sie herstellen, verkaufen sie günstiger; was sie brauchen, kaufen sie teurer.
  Beziehung (durch Handel, verblasst langsam) gibt bis zu 10 % bessere Preise.
- Lieferweg: ohne Straße zur Handelsstation nur Luftfracht (Einkauf +35 %, Verkauf −35 %);
  mit Straßenverbindung vom Kontor zur Handelsstation nur ±5 %, und Lkw fahren die Fuhren sichtbar.
- Gekaufte Ware liegt sofort im Lager, verkaufte wird sofort aus den Lagern genommen und bezahlt.
- **Einkauf bei den Versorgungsflügen** (Wirtschaftsfenster → Einkauf): jede Ware jederzeit, zum doppelten Grundpreis,
  Lieferung ins Landemodul – auch ohne Handelskontor.

## Offen

- Bild für das Handelskontor (Higgsfield, erzeugt; bis zur Einbindung Platzhalter).
- Lieferverträge und Handel per Bahn folgen mit Stufe C.
