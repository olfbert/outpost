# Entscheidungen Phase 4 (Stand 16.11.2026, Version 0.5.0)

Ergänzt die bisherigen Dokumente.

## Schon vorher erledigt

- 1 echter Tag = 1 Ingame-Monat, fließende Spielzeit, Nachrechnen der Offline-Zeit (Phase 3)
- Automatisches Speichern in IndexedDB: nach jeder Bau-/Abriss-/Verkaufsaktion, alle 30 s
  während die Simulation läuft, beim Verlassen der Seite (Phase 1–3)
- Schema-Versionen mit Migrationen 1 → 2 → 3 (Phase 2–3)

## Neu: Export und Import (Menü → Spielstand)

- **Als Datei exportieren**: vollständiger Spielstand als JSON (`outpost-<siedlung>-<datum>.json`),
  Kennung `"format": "outpost-save"`. Wo der Browser Downloads sperrt (z. B. eingebettete
  Ansichten wie die Artifact-Seite), erscheint der Text zum Kopieren.
- **Share-Code kopieren**: kompakte Zeichenfolge `OUTPOST1:z…` (deflate + Base64url).
  Felder von Wegen und Rodungen werden als sortierte Abstände gespeichert, der Verlauf wird
  weggelassen. Eine kleine Siedlung ergibt rund 700 Zeichen. Braucht `CompressionStream`
  (Safari ab 16.4); ohne läuft er unkomprimiert (`OUTPOST1:r…`).
- **Datei importieren / Code einfügen**: Prüfung mit verständlichen Fehlermeldungen
  (unbekanntes Format, beschädigter oder abgeschnittener Code, neuere Spielversion, fehlender Seed).
- **Vorschau vor dem Import**: Siedlung, Seed, Spielzeit, Gebäude/Wege, Geld, Version,
  Exportzeitpunkt. Ältere Versionen werden beim Import migriert.
- **Nie still überschreiben**: Vor jedem Import und jeder neuen Welt wird der aktuelle Stand als
  Sicherung abgelegt; „Sicherung laden“ holt ihn zurück (ebenfalls mit Vorschau).
- Importierte Stände laufen ab dem Import weiter; die Zeit zwischen Export und Import wird
  **nicht** nachgerechnet.

## Abgrenzung

Export/Import ist das Teilen von Einzelspieler-Spielständen. Gemeinsame Welten brauchen ein
Backend mit Datenbank und Anmeldung (Phase 7) – das gibt es noch nicht.
