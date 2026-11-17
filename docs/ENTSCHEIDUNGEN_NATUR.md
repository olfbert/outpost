# Holzernte, Nachwachsen, Vorkommen, Industrie-Assets (Stand 16.11.2026, Version 0.6.0)

Ergänzt die bisherigen Dokumente.

## Sichtbare Holzernte
- Jedes Holzfällerlager hat einen „Zielbaum“ (den nächsten Baum in Reichweite).
- Seine Arbeiter (mit Helm) gehen vom Lager zum Baum, holen mit der Axt aus und schlagen zu
  (zwei Bilder), gehen nach einer Weile zurück und wieder hin.
- Wird der Baum in der Simulation gefällt (alle 8 fm), verschwindet er; ein Stumpf mit
  liegendem Stamm und Spänen bleibt. Danach ist der nächste Baum dran.
- Bei normaler Geschwindigkeit fällt ein Lager etwa alle 6 echten Stunden einen Baum
  (40 fm/Monat), die Arbeiter hacken also lange an einem Baum – im Zeitraffer sieht man es schneller.

## Nachwachsen
- Gefällte Bäume stehen in `state.felled` (Feld -> Spielmonat), nicht mehr dauerhaft geräumt.
- Nach 6 Monaten wächst ein junger Baum (Laub- oder Nadelbaum je nach Standort),
  nach 18 Monaten steht wieder ein ausgewachsener Baum (`regrowSaplingMonths`,
  `regrowTreeMonths` in `gameConfig.js`). Junge Bäume werden nicht gefällt.
- Holzfäller ohne Wald finden nachgewachsene Bäume am Monatsende wieder.
- Bau und Wegebau auf einem Stumpf räumen das Feld dauerhaft.
- Spielstand-Version 4 (Migration ergänzt die leere Liste).

## Vorkommen dezenter
- Statt großer „Wolken“-Haufen: Der Boden ist fleckig eingefärbt und mit dem Untergrund gemischt
  (Stein grau-braun, Eisen rostig, Kohle dunkel, Kalk hell, Ton rotbraun, Sand gelblich).
- Nur auf etwa jedem dritten Feld liegen ein paar flache Steine/Klumpen.
- Genau bestimmen lässt sich ein Vorkommen per Antippen (Infofenster) oder mit der Bauvorschau
  einer Mine (zeigt den Vorrat).

## Industrie-Assets
- Steinbruch, Eisenerz- und Kohlemine, Kalksteinbruch, Ton- und Sandgrube, Schmelzofen,
  Zementwerk und Betonwerk stammen jetzt aus Higgsfield (`tools/asset_batch.json`).
- Werkzeug-Ergänzung: `--keep` verwirft kleine Reste des Hintergrunds; beim Schmelzofen war der
  Farbschlüssel eng zu wählen, weil die Ziegel fast denselben Farbton wie der Hintergrund haben.
