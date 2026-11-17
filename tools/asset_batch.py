"""Verarbeitet mehrere Higgsfield-Bilder auf einmal und trägt sie in assets/manifest.json ein.

Aufruf: python3 -I tools/asset_batch.py tools/asset_batch.json [Quellordner]
Quellordner (Standard assets_src/higgsfield) enthält die Originale; die Zuordnung erfolgt
über den Anfang der Job-ID im Dateinamen.
"""
import json, subprocess, sys, glob, os

cfg = json.load(open(sys.argv[1]))
src = sys.argv[2] if len(sys.argv) > 2 else 'assets_src/higgsfield'
man_path = 'assets/manifest.json'
man = json.load(open(man_path))
for it in cfg['items']:
    files = glob.glob(os.path.join(src, f"*{it['job']}*.png"))
    if not files:
        print('fehlt:', it['sprite'], it['job']); continue
    cmd = [sys.executable, '-I', 'tools/process_asset.py', files[0], it['out'], '--width', str(it['width']),
           '--footprint', it.get('footprint', '1x1'), '--hue', it.get('hue', '285,345'), '--shadow', str(it.get('shadow', 0.3)),
           '--erode', str(it.get('erode', 3)), '--kind', it.get('kind', 'building')]
    if it.get('tone'): cmd += ['--tone', it['tone']]
    if it.get('grow'): cmd += ['--grow', str(it['grow'])]
    if it.get('open'): cmd += ['--open', str(it['open'])]
    if it.get('colors'): cmd += ['--colors', str(it['colors'])]
    if it.get('keep') is not None: cmd += ['--keep', str(it['keep'])]
    os.makedirs(os.path.dirname(it['out']), exist_ok=True)
    res = json.loads(subprocess.check_output(cmd).decode().strip().splitlines()[-1])
    man['sprites'][it['sprite']] = {'file': it['out'].replace('assets/', '', 1), 'ax': res['ax'], 'ay': res['ay']}
    print('ok:', it['sprite'], res['w'], 'x', res['h'])
json.dump(man, open(man_path, 'w'), indent=2, ensure_ascii=False)
open(man_path, 'a').write('\n')
