"""Entfernt die Seitenflächen (Sockel) unter den Grundplatten der Gebäudebilder.

Die Higgsfield-Bilder zeigen Gebäude oft auf einer dicken Platte. Im Spiel wirkt das, als
würde das Gebäude über dem Boden schweben. Dieses Werkzeug schneidet pro Spalte die
untersten N Pixel ab (N aus tools/plinth_table.json), legt auf der Schattenseite (rechts)
Schlagschatten an die Stelle und verschiebt den Ankerpunkt, damit die Oberkante der Platte
auf dem Boden liegt. Bereits bearbeitete Sprites sind im Manifest mit "plinthCut" markiert.

Aufruf: python3 -I tools/flatten_plinth.py
"""
import json
import numpy as np
from PIL import Image

man_path = 'assets/manifest.json'
man = json.load(open(man_path))
table = {k: v for k, v in json.load(open('tools/plinth_table.json')).items() if not k.startswith('_')}
for name, t in table.items():
    sp = man['sprites'].get(name)
    if not sp or sp.get('plinthCut'):
        continue
    path = 'assets/' + sp['file']
    a = np.array(Image.open(path).convert('RGBA'))
    op = a[..., 3] == 255
    ys, xs = np.where(op)
    bottom = ys.max()
    bx = int(round(xs[ys >= bottom - 1].mean()))
    for x in range(a.shape[1]):
        c = np.where(op[:, x])[0]
        if not len(c):
            continue
        b = c.max()
        for y in range(b - t + 1, b + 1):
            if not op[y, x]:
                continue
            if x > bx:
                a[y, x] = (12, 12, 12, 80)   # Schattenseite: Schlagschatten statt Sockel
            else:
                a[y, x] = (0, 0, 0, 0)
    Image.fromarray(a, 'RGBA').save(path)
    sp['ay'] = sp['ay'] - t
    sp['plinthCut'] = t
    print('flach:', name, t)
json.dump(man, open(man_path, 'w'), indent=2, ensure_ascii=False)
open(man_path, 'a').write('\n')
