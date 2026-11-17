"""Gleicht knallgrünen Rasen in Gebäudebildern an das gedämpfte Spielgras an.

Higgsfield malt Gärten oft in hellem Lindgrün; im Spiel hebt sich das als Fläche ab.
Pixel mit grünem Farbton und hoher Sättigung werden in Helligkeit und Sättigung auf den
Bereich des Spielgrases gezogen (Farbton bleibt grob erhalten, Hecken bleiben dunkler).

Aufruf: python3 -I tools/grass_match.py sprite [sprite ...]
"""
import colorsys
import json
import sys
import numpy as np
from PIL import Image

man = json.load(open('assets/manifest.json'))['sprites']
for name in sys.argv[1:]:
    path = 'assets/' + man[name]['file']
    a = np.array(Image.open(path).convert('RGBA')).astype(float)
    H, W = a.shape[:2]
    n = 0
    for y in range(H):
        for x in range(W):
            if a[y, x, 3] < 255:
                continue
            r, g, b = a[y, x, :3] / 255
            h, l, s = colorsys.rgb_to_hls(r, g, b)
            if 0.22 < h < 0.42 and s > 0.35 and l > 0.22:
                # Ziel: Spielgras etwa Farbton 0,27, Sättigung 0,38, Helligkeit 0,30–0,40
                l2 = 0.24 + (l - 0.22) * 0.45
                s2 = min(s, 0.42)
                h2 = h * 0.5 + 0.27 * 0.5
                r2, g2, b2 = colorsys.hls_to_rgb(h2, l2, s2)
                a[y, x, :3] = (r2 * 255, g2 * 255, b2 * 255)
                n += 1
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(path)
    print('Rasen angepasst:', name, n)
