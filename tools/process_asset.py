"""Nachbearbeitung generierter Assets (Higgsfield) für OUTPOST.

Schritte: Hintergrund per Farbschlüssel entfernen (zusammenhängend vom Rand aus),
Rand säubern, zuschneiden, auf Zielbreite verkleinern, Farben reduzieren,
harte Alpha-Kante, Ankerpunkt bestimmen.

Aufruf: python3 -I tools/process_asset.py QUELLE.png ZIEL.png --width 72 --kind building --footprint 1x1
Ausgabe: JSON mit Bildgröße und Ankerpunkt (ax, ay) für assets/manifest.json.
"""
import argparse, json, colorsys
from collections import deque
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter


def background_mask(rgb, hue_lo, hue_hi, sat_min):
    a = rgb.astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-6
    s = d / (mx + 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    if hue_hi > 360:   # Bereich über 0° hinweg, z. B. 270..375 = 270..360 und 0..15
        cand = ((h >= hue_lo) | (h <= hue_hi - 360)) & (s >= sat_min)
    else:
        cand = (h >= hue_lo) & (h <= hue_hi) & (s >= sat_min)
    # nur was vom Rand aus zusammenhängt (Flutfüllung), damit Lila im Motiv bleibt
    H, W = cand.shape
    bg = np.zeros_like(cand)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if cand[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if cand[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    return bg


def grow_mask(rgb, step):
    """Hintergrund als glatte Fläche vom Rand aus wachsen lassen (für Farbverläufe).
    Ein Nachbarpixel gehört dazu, wenn es sich vom aktuellen Pixel um weniger als
    step (0..255, größter Kanalunterschied) unterscheidet. Motivkanten stoppen das Wachstum."""
    a = ndimage.gaussian_filter(rgb.astype(np.float32), sigma=(1.2, 1.2, 0))
    H, W = a.shape[:2]
    bg = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            bg[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        c = a[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx]:
                if np.abs(a[ny, nx] - c).max() < step:
                    bg[ny, nx] = True; q.append((ny, nx))
    return bg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--width', type=int, required=True, help='Zielbreite des Motivs in Pixeln')
    ap.add_argument('--kind', choices=['building', 'nature', 'vehicle'], default='building')
    ap.add_argument('--footprint', default='1x1')
    ap.add_argument('--colors', type=int, default=32)
    ap.add_argument('--hue', default='270,375', help='Hintergrund-Farbton von,bis in Grad (über 360 = Umbruch)')
    ap.add_argument('--sat', type=float, default=0.14)
    ap.add_argument('--work', type=int, default=512, help='Arbeitsauflösung für die Maske')
    ap.add_argument('--preview')
    ap.add_argument('--keep', type=float, default=0.15, help='Nebenflächen behalten ab diesem Anteil der größten Fläche')
    ap.add_argument('--erode', type=int, default=3, help='Wie viele Pixel die Maske (Arbeitsauflösung) eingezogen wird')
    ap.add_argument('--shadow', type=float, default=0.22, help='Länge des Bodenschattens relativ zur Höhe (0 = keiner)')
    ap.add_argument('--grow', type=float, default=0, help='Zusätzlich glatten Hintergrund vom Rand aus wachsen lassen (Schwelle, z. B. 5); für Verläufe')
    ap.add_argument('--open', type=int, default=0, help='Dünne Reste (Linien) entfernen: Öffnung mit diesem Radius (Arbeitsauflösung)')
    ap.add_argument('--tone', default='', help='Farbanpassung: sättigung,helligkeit[,farbtonverschiebung in Grad], z. B. 0.8,0.9,-20')
    a = ap.parse_args()
    lo, hi = map(float, a.hue.split(','))

    src = Image.open(a.src).convert('RGB')
    work = src.resize((a.work, a.work), Image.LANCZOS)
    rgb = np.array(work)
    bg = background_mask(rgb, lo, hi, a.sat)
    if a.grow > 0:
        bg |= grow_mask(rgb, a.grow)
    mask = Image.fromarray(((~bg) * 255).astype(np.uint8))
    # kleine Löcher schließen, Rand um 1 Pixel einziehen (lila Saum weg)
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    for _ in range(a.erode - 1):
        mask = mask.filter(ImageFilter.MinFilter(3))
    # nur die größte zusammenhängende Fläche behalten
    m = np.array(mask) > 127
    if a.open > 0:
        m = ndimage.binary_opening(m, structure=np.ones((3, 3), bool), iterations=a.open)
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = np.argsort(sizes)[::-1]
        big = sizes[keep[0]]
        m = np.isin(lab, [k + 1 for k in keep if sizes[k] > big * a.keep])
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([rgb, (m * 255).astype(np.uint8)])[y0:y1, x0:x1]
    # Saum entfernen: Randpixel (Mischfarbe mit dem Hintergrund) bekommen die Farbe
    # des nächstgelegenen sicheren Innenpixels.
    mm = m[y0:y1, x0:x1]
    inner = ndimage.binary_erosion(mm, iterations=2)
    if inner.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
        edge = mm & ~inner
        rgba[edge, :3] = rgba[iy[edge], ix[edge], :3]
        # auch unsichtbare Pixel einfärben, damit beim Verkleinern nichts hineinblutet
        rgba[~mm, :3] = rgba[iy[~mm], ix[~mm], :3]

    img = Image.fromarray(rgba, 'RGBA')
    w0, h0 = img.size
    tw = a.width
    th = max(1, round(h0 * tw / w0))
    # Verkleinern: Farbe und Alpha getrennt per Flächenmittel (BOX) – kein heller Überschwinger.
    # Die Farbe ist vorher bis in den transparenten Bereich ausgeblutet.
    rgb_small = img.convert('RGB').resize((tw, th), Image.BOX)
    a_small = np.array(img.split()[3].resize((tw, th), Image.BOX))
    hard = a_small > 140
    # einzelne lose Pixel ohne Nachbarn entfernen
    nb = ndimage.convolve(hard.astype(np.uint8), np.ones((3, 3), np.uint8), mode='constant') - hard
    hard &= nb > 0
    out = Image.merge('RGBA', (*rgb_small.split(), Image.fromarray(np.where(hard, 255, 0).astype(np.uint8))))
    # Farben reduzieren (ohne Dithering) – ergibt saubere Pixelflächen
    rgbq = out.convert('RGB').quantize(colors=a.colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = Image.merge('RGBA', (*rgbq.split(), out.split()[3]))
    if a.tone:
        from PIL import ImageEnhance
        parts = list(map(float, a.tone.split(',')))
        sat, bri = parts[0], parts[1]
        alpha = out.split()[3]
        base = out.convert('RGB')
        if len(parts) > 2 and parts[2]:
            hsv = np.array(base.convert('HSV')).astype(np.int16)
            hsv[..., 0] = (hsv[..., 0] + int(round(parts[2] / 360 * 255))) % 256
            base = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
        rgb2 = ImageEnhance.Brightness(ImageEnhance.Color(base).enhance(sat)).enhance(bri)
        out = Image.merge('RGBA', (*rgb2.split(), alpha))
    # Bodenschatten: Silhouette nach rechts unten versetzt, gestaucht (Licht von links oben)
    k = int(round(th * a.shadow)) if a.shadow > 0 else 0
    # auf Vielfache von 4 auffüllen (Mip-Stufen des Atlas); Platz rechts/unten für den Schatten
    W4, H4 = -(-(tw + k) // 4) * 4, -(-(th + k // 2) // 4) * 4
    canvas = Image.new('RGBA', (W4, H4), (0, 0, 0, 0))
    ox, oy = 0, 0
    if k:
        al = np.array(out)[..., 3] > 0
        sh = np.zeros((H4, W4), dtype=np.uint8)
        # Schlagschatten: jeder Punkt fällt von seinem Fußpunkt (unterstes Pixel der
        # Spalte) um seine Höhe nach rechts unten auf den Boden (Licht von links oben).
        ys2, xs2 = np.where(al)
        colbottom = np.full(tw, -1)
        for xx in range(tw):
            c = np.where(al[:, xx])[0]
            if len(c): colbottom[xx] = c.max()
        f = k / max(1, th)
        for yy, xx in zip(ys2, xs2):
            d = colbottom[xx] - yy
            sx, sy = int(xx + d * f * 1.6), int(colbottom[xx] + d * f * 0.8)
            if 0 <= sx < W4 and 0 <= sy < H4: sh[sy, sx] = 1
        sh = ndimage.binary_closing(sh, iterations=2)
        shadow = np.zeros((H4, W4, 4), dtype=np.uint8); shadow[..., 3] = sh * 80; shadow[..., :3] = 12
        canvas = Image.fromarray(shadow, 'RGBA')
    canvas.alpha_composite(out, (ox, oy))
    arr = np.zeros((H4, W4), dtype=bool); arr[oy:oy + th, ox:ox + tw] = np.array(out)[..., 3] > 0   # Anker ohne Schatten
    ys, xs = np.where(arr)
    bottom = ys.max()
    if a.kind == 'building':
        fw, fh = map(int, a.footprint.split('x'))
        # unterster Punkt = vordere Ecke der Grundfläche; obere Ecke liegt (w+h)*16 darüber
        bx = int(round(xs[ys >= bottom - 1].mean()))
        ax, ay = bx - (fw - fh) * 16, bottom + 1 - (fw + fh) * 16
    else:
        ax, ay = int(round(xs[ys >= bottom - 2].mean())), bottom
    canvas.save(a.dst)
    if a.preview:
        pv = Image.new('RGBA', (W4 * 4, H4 * 4), (95, 128, 70, 255))
        pv.alpha_composite(canvas.resize((W4 * 4, H4 * 4), Image.NEAREST))
        pv.save(a.preview)
    print(json.dumps({'file': a.dst, 'w': W4, 'h': H4, 'ax': int(ax), 'ay': int(ay)}))


if __name__ == '__main__':
    main()
