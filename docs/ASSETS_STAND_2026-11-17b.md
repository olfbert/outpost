# Asset-Stand 17.11.2026, Nachtrag (v0.13.1)

Neues Dokument. Die älteren Asset-Stände bleiben unverändert.

## Neu eingebunden
| Datei | Sprite | Größe | Sockel (px) | Status |
|---|---|---|---|---|
| buildings/residential/container_home_01.png | container_home | 84×52 | 3 | geprüft |
| buildings/residential/duplex_01.png | duplex | 128×88 | 2 | geprüft |
| buildings/residential/dormitory_01.png | dormitory | 152×100 | 2 | geprüft |
| buildings/residential/villa_01.png | villa | 152×100 | 3 | geprüft |
| buildings/residential/highrise_01.png | highrise | 156×164 | 3 | geprüft |

## Verarbeitung
1. `python3 -I tools/asset_batch.py tools/asset_batch_wohnen_3.json`
2. `python3 -I tools/flatten_plinth.py`
3. `python3 -I tools/reshadow.py`

## Hinweise
- Beim Doppelhaus war der Rasen im Original rechts angeschnitten.
- Der Pool der Villa ragt etwas über die Grundfläche hinaus.

## Noch prozedural
- Deko: Laterne, Bank, Mülleimer, Blumenbeet, Brunnen
- Drohnen
- Lkw und Autos
