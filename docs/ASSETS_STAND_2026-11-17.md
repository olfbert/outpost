# Asset-Stand 17.11.2026 (v0.10.1)

Neues Dokument. Die älteren Asset-Stände bleiben unverändert.

## Neu eingebunden
| Datei | Sprite | Kategorie | Größe | Transparenz | Status |
|---|---|---|---|---|---|
| buildings/residential/wood_house_01.png | wood_house | Wohnen | 84×52 | ja | geprüft |
| buildings/residential/brick_house_01.png | brick_house | Wohnen | 88×60 | ja | geprüft |
| buildings/residential/row_house_01.png | row_house | Wohnen | 152×100 | ja | geprüft |
| buildings/logistics/drone_port_01.png | drone_port | Logistik | 148×96 | ja | geprüft |

## Hinweise
- Verarbeitet wird mit `python3 -I tools/asset_batch.py tools/asset_batch_leben_2.json`.
- **Backsteinhaus:** Der Hintergrund-Farbton ist auf 280–340° begrenzt. Sonst würde das rote Mauerwerk mit entfernt.
- **Drohnenflugplatz:** Er wird ohne `--grow` freigestellt, weil die glatte Betonplatte sonst mit dem Hintergrund verschwindet.
  - Der dünne Windsack ging dabei verloren.
  - Die Platte war im Original am Bildrand angeschnitten.
  - Eine neue Version mit mehr Rand wäre schöner, ist aber nicht nötig.

## Noch prozedural
- Deko: Laterne, Bank, Mülleimer, Blumenbeet, Brunnen
- Drohnen
- Lkw und Autos
