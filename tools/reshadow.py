"""Berechnet die Schlagschatten der Gebäudebilder neu.

Bisher fiel jeder Bildpunkt von der Unterkante seiner Spalte aus um seine Bildhöhe zur Seite.
Dabei zählte die Tiefe des Gebäudes (alles, was im Bild weiter oben liegt, weil es weiter
hinten steht) als Höhe – die Schatten wurden viel zu lang und lagen neben der Grundplatte.

Neu: Das Gebäude wird als Körper über seiner Grundfläche (Raute aus Anker und Footprint)
betrachtet. Die Höhe je Spalte ist der Abstand der Silhouetten-Oberkante zur hinteren Kante
der Grundfläche. Jeder Bodenpunkt der Grundfläche wirft Schatten entlang der Lichtrichtung
(Licht von links oben, Schatten nach rechts unten entlang der Welt-x-Achse), so weit wie die
Höhe in seiner Spalte reicht. Sichtbar ist nur der Teil, der nicht vom Gebäude verdeckt wird.

Aufruf: python3 -I tools/reshadow.py   (nach flatten_plinth.py ausführen; wiederholbar)
"""
import json
import numpy as np
from PIL import Image

K = 0.42          # Schattenlänge (in y-Pixeln) je Pixel Höhe; x-Versatz ist doppelt so groß
ALPHA = 78
man_path = 'assets/manifest.json'
man = json.load(open(man_path))
fps = {k: v for k, v in json.load(open('tools/footprints.json')).items() if not k.startswith('_')}
# Bilder mit Grundplatte: Der Schatten fällt nur von dem Teil der Grundfläche, auf dem wirklich
# etwas steht (Fußpunkt per Farbwechsel gegenüber der Platte gesucht). Ohne Platte zählt die
# ganze Tiefe der Grundfläche.
PADDED = set(json.load(open('tools/plinth_table.json')).keys()) | {'haulage'}


def foot_y(a, op, x, y_back, y_front):
    """Vorderster Fußpunkt eines Objekts in Spalte x (Bildzeile) – Platte = gleichmäßige Farbe."""
    y = int(y_front) - 2
    if y <= y_back or not op[y, x]:
        return int(y_front)
    ref = a[y, x, :3].astype(int)
    miss = 0
    while y > y_back:
        y -= 1
        if not op[y, x]:
            return y + 1
        d = np.abs(a[y, x, :3].astype(int) - ref).sum()
        if d > 60:
            miss += 1
            if miss >= 2:
                return y + 2
        else:
            miss = 0
            ref = (ref * 3 + a[y, x, :3]) // 4
    return int(y_back)

for name, (fw, fh) in fps.items():
    sp = man['sprites'].get(name)
    if not sp:
        continue
    path = 'assets/' + sp['file']
    a = np.array(Image.open(path).convert('RGBA'))
    a[a[..., 3] < 255] = 0                       # alten Schatten entfernen
    op = a[..., 3] == 255
    H, W = op.shape
    ax, ay = sp['ax'], sp['ay']
    top = (ax, ay); right = (ax + fw * 32, ay + fw * 16)
    bottom = (ax + (fw - fh) * 32, ay + (fw + fh) * 16); left = (ax - fh * 32, ay + fh * 16)

    def back_y(x):   # hintere Kante der Grundfläche
        return top[1] + (top[0] - x) / 2 if x <= top[0] else top[1] + (x - top[0]) / 2

    def front_y(x):  # vordere Kante
        return bottom[1] - (bottom[0] - x) / 2 if x <= bottom[0] else bottom[1] - (x - bottom[0]) / 2

    # Höhe je Spalte
    hcol = np.zeros(W + 400)
    for x in range(max(0, left[0]), min(W, right[0] + 1)):
        c = np.where(op[:, x])[0]
        if len(c):
            hcol[x] = max(0.0, back_y(x) - c.min())
    smax = int(hcol.max() * K) + 2
    PW, PH = W + 2 * smax + 4, H + smax + 4
    sh = np.zeros((PH, PW), bool)
    pad = np.zeros((PH, PW), bool)          # Bodenteil der Grundplatte (darf beschattet werden)
    cols = [x for x in range(max(0, left[0]), min(W, right[0] + 1)) if hcol[x] > 4]
    if cols:
        ox0, ox1 = min(cols), max(cols)
        cx, hw = (ox0 + ox1) / 2, max(1.0, (ox1 - ox0) / 2)
        cy = (top[1] + bottom[1]) / 2
    for x in range(max(0, left[0]), min(W, right[0] + 1)):
        yb, yfr = back_y(x), front_y(x)
        yfoot = foot_y(a, op, x, yb, yfr) if name in PADDED else int(yfr)
        if name in PADDED:
            for y in range(max(0, yfoot), min(H, int(yfr) + 1)):
                if op[y, x]: pad[y, x] = True
        s = min(hcol[x] * K, 18)
        if s < 1 or not cols or abs(x - cx) > hw:
            continue
        # Grundfläche des Objekts: kleinere Raute über seiner Breite, in der Mitte der Grundfläche
        r = (hw - abs(x - cx)) / 2
        y0 = int(np.ceil(max(yb, cy - r)))
        y1 = int(min(yfr, cy + r, yfoot))
        n = int(s)
        for y in range(y0, y1 + 1):
            for k in range(n + 1):
                xx, yy = x + 2 * k, y + k
                if 0 <= yy < PH:
                    sh[yy, xx] = True
                    if xx + 1 < PW: sh[yy, xx + 1] = True
    obj = np.pad(op, ((0, PH - H), (0, PW - W))) & ~pad
    near = np.zeros_like(obj)
    for k in range(1, 7):
        near[:, k:] |= obj[:, :-k]
        near[k // 2:, k:] |= obj[:PH - k // 2, :-k]
    # Bild auf ein Vielfaches von 4 vergrößern, damit der Schatten Platz hat
    ys, xs = np.where(sh | np.pad(op, ((0, PH - H), (0, PW - W))))
    NW = -(-max(W, xs.max() + 1) // 4) * 4
    NH = -(-max(H, ys.max() + 1) // 4) * 4
    out = np.zeros((NH, NW, 4), np.uint8)
    shc = sh[:NH, :NW]
    out[:shc.shape[0], :shc.shape[1]][shc] = (12, 14, 12, ALPHA)
    spr = a[:NH, :NW]
    m = spr[..., 3] == 255
    o2 = out[:spr.shape[0], :spr.shape[1]]
    o2[m] = spr[m]
    # Schatten auf der Grundplatte nur am Fuß hoher Objekte, leicht abgedunkelt
    dk = m & shc[:spr.shape[0], :spr.shape[1]] & pad[:spr.shape[0], :spr.shape[1]] & near[:spr.shape[0], :spr.shape[1]]
    o2[dk, :3] = (o2[dk, :3].astype(int) * 0.8).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(path)
    print('Schatten:', name, f'Höhe max {int(hcol.max())}', f'{W}x{H} -> {NW}x{NH}')
json.dump(man, open(man_path, 'w'), indent=2, ensure_ascii=False)
open(man_path, 'a').write('\n')
