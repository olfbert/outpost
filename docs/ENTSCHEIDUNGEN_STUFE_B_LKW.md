# Korrektur Stufe B – Lkw-Verkehr (v0.8.1)

Neues Dokument; `ENTSCHEIDUNGEN_STUFE_B.md` bleibt unverändert. Anlass (17.11.2026, Flo):
„LKWs fahren ineinander und sie fahren glaube ich zu schnell.“

- **Tempo halbiert** (nur Darstellung): Erdweg 0,8, Schotter 1,1, Straße 1,5 Felder je Sekunde; Autos 1,3.
  Die Wirtschaftsrechnung (Lkw-Zeitbudget) bleibt unverändert.
- **Abstand**: Ein Lkw hält, wenn in seiner Spur bis 0,62 Felder vor ihm ein anderer steht oder fährt.
  Im Nahbereich (Kurven, Einmündungen, 0,4 Felder) gilt: Wer den anderen vor sich hat, wartet; sehen sich beide,
  hat der Lkw mit der kleineren Nummer Vorfahrt. Nach 12 Sekunden Stillstand fährt ein Lkw trotzdem weiter
  (gegen Verklemmen).
- **Laderampe**: Wartet ein Lkw an einem Eingang, stellen sich die nächsten dahinter an.
- **Garage**: Ohne Auftrag fährt ein Lkw zurück zur Spedition (bzw. zum Landemodul) und steht dort unsichtbar in der Halle.
  Ausgefahren wird erst, wenn die Ausfahrt frei ist; neue Lkw starten gestaffelt.
- Messung: zehn Lkw eine Minute lang – eine kurze Berührung (Gegenverkehr in einer Kurve) bei 600 Messungen, vorher über 200.
- Spedition und Silo haben jetzt ihre Higgsfield-Bilder (`tools/asset_batch_stufe_b.json`).
