// Isometrische 2:1-Projektion. Drei Koordinatenräume, strikt getrennt:
//   Feld    (x, y)   – Rasterposition in der Welt
//   Welt-Px (wx, wy) – projizierte Position bei Zoom 1
//   Bildschirm       – erst die Kamera rechnet Welt-Px in Bildschirmpunkte um

export const TILE_W = 64, TILE_H = 32, HALF_W = 32, HALF_H = 16;

export const tileToWorldX = (x, y) => (x - y) * HALF_W;
export const tileToWorldY = (x, y) => (x + y) * HALF_H;

// Welt-Px -> Feld (Gleitkomma). Math.floor ergibt das Feld unter dem Punkt.
export function worldToTile(wx, wy, out) {
  const a = wx / TILE_W, b = wy / TILE_H;
  out.x = b + a;
  out.y = b - a;
  return out;
}

// Eckpunkte der Raute eines Feldrechtecks (oben, rechts, unten, links) in Welt-Px.
export function footprintDiamond(x, y, w, h) {
  return [
    [(x - y) * HALF_W, (x + y) * HALF_H],
    [(x + w - y) * HALF_W, (x + w + y) * HALF_H],
    [(x + w - y - h) * HALF_W, (x + w + y + h) * HALF_H],
    [(x - y - h) * HALF_W, (x + y + h) * HALF_H],
  ];
}
