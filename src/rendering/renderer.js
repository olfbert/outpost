// Renderer (Canvas 2D). Vier Detailstufen, abhängig vom Zoom:
//   0  volle Auflösung: Boden als gebackene Kacheln, Objekte und Gebäude
//      einzeln und tiefensortiert
//   1  halbe Auflösung, Objekte in die Kacheln eingebacken
//   2  Viertelauflösung
//   3  Flächendarstellung (farLayer.js)
// Die Simulation kennt den Renderer nicht; er liest nur Welt und Spielzustand.

import { bakeGround } from './groundBaker.js';
import { FarLayer } from './farLayer.js';
import { COLORS } from '../config/terrain.js';
import { BUILDINGS } from '../config/buildings.js';
import { footprintDiamond } from '../camera/isoProjection.js';

const CELL = 512;                       // Kantenlänge einer Bodenkachel in Pixeln
const OBJ_MARGIN = { l: 60, r: 60, t: 14, b: 104 };  // Überstand von Sprites in Welt-Px

// Weiche Wolke und ihr Schatten als vorberechnete Bilder.
function makeCloud(seed, shadow) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 180;
  const g = c.getContext('2d');
  let h = seed >>> 0;
  const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return h / 4294967296; };
  for (let i = 0; i < 16; i++) {
    const x = 70 + rnd() * 180, y = 70 + rnd() * 50 - (i % 3) * 8, r = 26 + rnd() * 34;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const col = shadow ? '10, 24, 18' : '255, 255, 252';
    grd.addColorStop(0, `rgba(${col}, ${shadow ? 0.5 : 0.85})`);
    grd.addColorStop(0.6, `rgba(${col}, ${shadow ? 0.25 : 0.45})`);
    grd.addColorStop(1, `rgba(${col}, 0)`);
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}
const CLOUD_CELL = 30000;     // Rastergröße der Wolkenverteilung in Welt-Px

export class Renderer {
  constructor(canvas, sprites, cfg) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.sprites = sprites;
    this.cfg = cfg;
    this.cells = new Map();
    this.pool = [];
    this.frame = 0;
    this.dpr = 1;
    this.small = false;
    this.listKey = '';
    this.list = [];
    this.stats = { cells: 0, baked: 0, objects: 0, level: 0, ms: 0 };
    this.scratch = document.createElement('canvas');
    this.scratch.width = CELL; this.scratch.height = CELL;
    this.scratchCtx = this.scratch.getContext('2d');
    this.scratchImg = this.scratchCtx.createImageData(CELL, CELL);
    this.clouds = [0, 1, 2].map((i) => ({ img: makeCloud(101 + i * 7, false), sh: makeCloud(101 + i * 7, true) }));
  }

  // Wolken über der Landschaft bei weitem Zoom (in Weltkoordinaten, ändern sich nicht).
  _drawClouds(cam, view) {
    const sc = cam.scale;
    let a = Math.min(1, (0.1 - sc) / 0.05, (sc - 0.004) / 0.006);
    if (a <= 0 || !this.state.settings.clouds) return;
    const ctx = this.ctx, seed = this.world.size;
    const ix0 = Math.floor(view.x0 / CLOUD_CELL) - 1, ix1 = Math.floor(view.x1 / CLOUD_CELL) + 1;
    const iy0 = Math.floor(view.y0 / CLOUD_CELL) - 1, iy1 = Math.floor(view.y1 / CLOUD_CELL) + 1;
    const items = [];
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ seed ^ this.cloudSeed;
      h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = (h ^ (h >>> 13)) >>> 0;
      if ((h & 255) > 80) continue;
      const w = CLOUD_CELL * (0.45 + ((h >>> 8) & 255) / 255 * 0.7);
      items.push({ x: (ix + ((h >>> 16) & 255) / 255) * CLOUD_CELL, y: (iy + ((h >>> 24) & 255) / 255) * CLOUD_CELL, w, k: h % 3 });
    }
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = a * 0.55;
    for (const c of items) ctx.drawImage(this.clouds[c.k].sh, c.x + c.w * 0.35, c.y + c.w * 0.3, c.w, c.w * 0.56);
    ctx.globalAlpha = a * 0.8;
    for (const c of items) ctx.drawImage(this.clouds[c.k].img, c.x, c.y, c.w, c.w * 0.56);
    ctx.globalAlpha = 1;
  }

  setWorld(world, store, state) {
    this.world = world; this.store = store; this.state = state;
    this.cloudSeed = world.start.x * 31 + world.start.y;
    for (const c of this.cells.values()) this.pool.push(c.canvas);
    this.cells.clear();
    this.far = new FarLayer(world);
    this.listKey = '';
  }

  resize(cssW, cssH) {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.cfg.maxDevicePixelRatio);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.small = cssW * cssH < 700 * 900;
    this.maxCells = this.small ? [26, 26, 34] : [70, 70, 90];
  }

  // Nach Rodung/Bau: eingebackene Objekte im Bereich neu erzeugen.
  // ground = true: auch der Boden hat sich geändert (Wege) – dann auch Stufe 0.
  // Betroffene Kacheln werden sofort neu gebacken, damit nichts aufblitzt.
  invalidateTiles(x, y, w, h, ground = false) {
    const d = footprintDiamond(x - 1, y - 1, w + 2, h + 2);
    const x0 = d[3][0] - OBJ_MARGIN.r, x1 = d[1][0] + OBJ_MARGIN.l;
    const y0 = d[0][1] - OBJ_MARGIN.b, y1 = d[2][1] + OBJ_MARGIN.t;
    for (const [key, c] of this.cells) {
      if (c.lvl === 0 && !ground) continue;
      const span = CELL << c.lvl;
      const cx0 = c.ix * span, cy0 = c.iy * span;
      if (cx0 > x1 || cx0 + span < x0 || cy0 > y1 || cy0 + span < y0) continue;
      if (c.used >= this.frame - 1) this._bakeCell(c.lvl, c.ix, c.iy, c.canvas);
      else { this.pool.push(c.canvas); this.cells.delete(key); }
    }
    this.listKey = '';
  }

  // --- Kacheln ---------------------------------------------------------------
  _bakeCell(lvl, ix, iy, reuse) {
    const span = CELL << lvl, res = 1 / (1 << lvl);
    const wx0 = ix * span, wy0 = iy * span;
    const canvas = reuse || this.pool.pop() || document.createElement('canvas');
    if (canvas.width !== CELL) { canvas.width = CELL; canvas.height = CELL; }
    const ctx = canvas.getContext('2d', { alpha: false });
    bakeGround(this.store, wx0, wy0, CELL, res, this.scratchImg);
    ctx.putImageData(this.scratchImg, 0, 0);
    if (lvl > 0) {
      const items = [];
      this._collectObjects(wx0 - OBJ_MARGIN.l, wy0 - OBJ_MARGIN.t, wx0 + span + OBJ_MARGIN.r, wy0 + span + OBJ_MARGIN.b, items, true);
      items.sort((a, b) => a.wy - b.wy);
      const f = 1 << lvl, list = this.sprites.list;
      ctx.imageSmoothingEnabled = false;
      for (const it of items) {
        const sp = list[it.s];
        ctx.drawImage(sp.src[lvl], sp.x / f, sp.y / f, sp.w / f, sp.h / f,
          Math.round((it.wx - sp.ax - wx0) * res), Math.round((it.wy - sp.ay - wy0) * res), sp.w / f, sp.h / f);
      }
    }
    const cell = { lvl, ix, iy, canvas, used: this.frame };
    this.cells.set(lvl + ':' + ix + ':' + iy, cell);
    this.stats.baked++;
    return cell;
  }

  _evictCells(lvl) {
    const max = this.maxCells[lvl];
    let n = 0;
    for (const c of this.cells.values()) if (c.lvl === lvl) n++;
    if (n <= max) return;
    const arr = [...this.cells.entries()].filter(([, c]) => c.lvl === lvl && c.used < this.frame).sort((a, b) => a[1].used - b[1].used);
    for (let i = 0; i < arr.length && n > max; i++, n--) {
      this.pool.push(arr[i][1].canvas);
      this.cells.delete(arr[i][0]);
    }
    while (this.pool.length > 12) { const c = this.pool.pop(); c.width = 0; c.height = 0; }
  }

  // --- Objekte ----------------------------------------------------------------
  _chunkDraw(c) {
    if (c.draw) return c.draw;
    const N = this.store.N, out = [];
    if (c.objCount) {
      for (let j = 0; j < N * N; j++) {
        const ob = c.obj[j];
        if (!ob) continue;
        const x = c.X0 + (j % N), y = c.Y0 + ((j / N) | 0);
        const v = c.vari[j];
        const s = this.sprites.forObject(ob, v & 0xffff);
        if (s < 0) continue;
        const dep = ob >= 10 && ob <= 15;
        if (dep && ((v >>> 5) % 3) !== 0) continue;      // Vorkommen: nur vereinzelte Steine, Rest ist Bodenfarbe
        const ox = ((v >>> 16) & 15) - 8, oy = ((v >>> 24) & 7) - 3;
        out.push({ wx: (x - y) * 32 + ox, wy: (x + y) * 16 + 16 + oy, s });
      }
    }
    c.draw = out;
    return out;
  }

  // Sammelt Naturobjekte im Weltrechteck. force = fehlende Chunks sofort erzeugen.
  _collectObjects(x0, y0, x1, y1, out, force, idsOut) {
    const store = this.store, N = store.N, sh = store.shift;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [wx, wy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      const fx = wx / 64 + wy / 32, fy = wy / 32 - wx / 64;
      if (fx < minX) minX = fx; if (fx > maxX) maxX = fx;
      if (fy < minY) minY = fy; if (fy > maxY) maxY = fy;
    }
    const cx0 = Math.floor(minX - 1) >> sh, cx1 = Math.floor(maxX + 1) >> sh;
    const cy0 = Math.floor(minY - 1) >> sh, cy1 = Math.floor(maxY + 1) >> sh;
    let complete = true;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const X0 = cx * N, Y0 = cy * N;
        const bx0 = (X0 - Y0 - N) * 32, bx1 = (X0 - Y0 + N) * 32, by0 = (X0 + Y0) * 16, by1 = (X0 + Y0 + 2 * N) * 16 + 16;
        if (bx1 < x0 || bx0 > x1 || by1 < y0 || by0 > y1) continue;
        let c = store.peek(cx, cy);
        if (!c) {
          if (!force && performance.now() > this.deadline) { complete = false; continue; }
          c = store.get(cx, cy);
        }
        if (idsOut) idsOut.push(c);
        else {
          const d = this._chunkDraw(c);
          for (let i = 0; i < d.length; i++) {
            const it = d[i];
            if (it.wx >= x0 && it.wx <= x1 && it.wy >= y0 && it.wy <= y1) out.push(it);
          }
        }
      }
    }
    return complete;
  }

  // Ein Gebäude-Sprite in senkrechte Streifen je Feldspalte zerlegen (richtige Tiefe)
  _stripsFor(b, sp, kind, out) {
    const def = BUILDINGS[b.type], w = def.footprint.width, h = def.footprint.height;
    const bwx = (b.x - b.y) * 32, bwy = (b.x + b.y) * 16;
    const n = w + h;
    for (let i = 0; i < n; i++) {
      let sx0 = sp.ax - h * 32 + i * 32, sx1 = sx0 + 32;
      if (i === 0) sx0 = 0;
      if (i === n - 1) sx1 = sp.w;
      sx0 = Math.max(0, sx0); sx1 = Math.min(sp.w, sx1);
      if (sx1 <= sx0) continue;
      let tx, ty;
      if (i < w) { tx = b.x + i; ty = b.y + h - 1; } else { tx = b.x + w - 1; ty = b.y + (w + h - 1 - i); }
      out.push({ wy: (tx + ty) * 16 + 16.5, strip: true, sp, sx: sx0, sw: sx1 - sx0, dx: bwx - sp.ax + sx0, dy: bwy - sp.ay, b, kind });
    }
  }

  _buildingStrips(b) {
    const sp = this.sprites.list[this.sprites.building[b.type]];
    const key = (b.site ? 's' : 'b');
    if (!this.stripCache) this.stripCache = new WeakMap();
    const cached = this.stripCache.get(b);
    if (cached && cached.spr === sp.src[0] && cached.key === key) return cached.strips;
    const strips = [];
    if (b.site) {
      const def = BUILDINGS[b.type], size = def.footprint.width + 'x' + def.footprint.height;
      const slab = this.sprites.list[this.sprites.byId['site_slab_' + size] ?? this.sprites.byId.site_slab_1x1];
      const scaf = this.sprites.list[this.sprites.byId['site_scaffold_' + size] ?? this.sprites.byId.site_scaffold_1x1];
      this._stripsFor(b, slab, 'site', strips);
      this._stripsFor(b, sp, 'clip', strips);
      this._stripsFor(b, scaf, 'site', strips);
    } else this._stripsFor(b, sp, null, strips);
    this.stripCache.set(b, { strips, spr: sp.src[0], key });
    return strips;
  }

  // Alle Bodenkacheln neu backen (z. B. Wechsel der Jahreszeit)
  invalidateAll() {
    for (const c of this.cells.values()) this.pool.push(c.canvas);
    this.cells.clear();
    this.listKey = '';
  }

  // --- Zeichnen ---------------------------------------------------------------
  // Liefert true, wenn noch Inhalte nachgeladen werden (dann erneut zeichnen).
  draw(cam, overlay, life) {
    const t0 = performance.now();
    this.deadline = t0 + this.cfg.frameBudgetMs;
    this.frame++;
    const { ctx, cfg } = this;
    const dpr = this.dpr, s = cam.scale * dpr, vw = this.canvas.width, vh = this.canvas.height;
    const view = { x0: cam.x - vw / 2 / s, y0: cam.y - vh / 2 / s, x1: cam.x + vw / 2 / s, y1: cam.y + vh / 2 / s };
    const lvl = cam.scale >= cfg.lodDetail ? 0 : cam.scale >= cfg.lodHalf ? 1 : cam.scale >= cfg.lodQuarter ? 2 : 3;
    let pending = false;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, vw, vh);

    // Kacheln bestimmen und fehlende im Zeitbudget backen
    const drawCells = [];
    let needFar = lvl === 3 || cam.scale < cfg.lodFadeEnd;
    if (lvl < 3) {
      const span = CELL << lvl;
      const ix0 = Math.floor(view.x0 / span), ix1 = Math.floor(view.x1 / span);
      const iy0 = Math.floor(view.y0 / span), iy1 = Math.floor(view.y1 / span);
      const missing = [];
      for (let iy = iy0; iy <= iy1; iy++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const cell = this.cells.get(lvl + ':' + ix + ':' + iy);
          if (cell) { cell.used = this.frame; drawCells.push(cell); } else {
            const dx = (ix + 0.5) * span - cam.x, dy = (iy + 0.5) * span - cam.y;
            missing.push({ ix, iy, d: dx * dx + dy * dy });
          }
        }
      }
      if (missing.length) {
        missing.sort((a, b) => a.d - b.d);
        let baked = 0;
        for (const m of missing) {
          if (baked > 0 && performance.now() > this.deadline) break;
          drawCells.push(this._bakeCell(lvl, m.ix, m.iy));
          baked++;
        }
        if (baked < missing.length) { pending = true; needFar = true; }
        this._evictCells(lvl);
      }
    }

    this.far.beginFrame();
    if (needFar) this.far.draw(ctx, cam, dpr, view);

    if (lvl < 3) {
      const span = CELL << lvl;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = s * (1 << lvl) < 1;
      ctx.imageSmoothingQuality = 'medium';
      if (lvl === 2 && cam.scale < cfg.lodFadeEnd) {
        ctx.globalAlpha = Math.max(0, Math.min(1, (cam.scale - cfg.lodQuarter) / (cfg.lodFadeEnd - cfg.lodQuarter)));
      }
      for (const c of drawCells) {
        const x0 = Math.round((c.ix * span - cam.x) * s + vw / 2), x1 = Math.round(((c.ix + 1) * span - cam.x) * s + vw / 2);
        const y0 = Math.round((c.iy * span - cam.y) * s + vh / 2), y1 = Math.round(((c.iy + 1) * span - cam.y) * s + vh / 2);
        ctx.drawImage(c.canvas, x0, y0, x1 - x0, y1 - y0);
      }
      ctx.globalAlpha = 1;
    }

    const ox = Math.round(vw / 2 - cam.x * s), oy = Math.round(vh / 2 - cam.y * s);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.imageSmoothingEnabled = s < 1;
    if (lvl === 0) {
      if (!this._drawSorted(view, s, ox, oy, life)) pending = true;
    } else {
      this._drawBuildingsFlat(lvl, cam, s);
    }
    this._drawClouds(cam, view);
    this._drawOverlay(cam, overlay, s, ox, oy, lvl);

    if (this.far.queue.length) {
      // frisch berechnete Flächenbilder erscheinen im nächsten Frame
      this.far.work(Math.max(this.deadline, performance.now() + 2));
      pending = true;
    }

    this.stats.cells = this.cells.size;
    this.stats.level = lvl;
    this.stats.ms = performance.now() - t0;
    return pending;
  }

  _drawSorted(view, s, ox, oy, life) {
    const ctx = this.ctx;
    const x0 = view.x0 - OBJ_MARGIN.l, y0 = view.y0 - OBJ_MARGIN.t, x1 = view.x1 + OBJ_MARGIN.r, y1 = view.y1 + OBJ_MARGIN.b;
    const chunks = [];
    const complete = this._collectObjects(x0, y0, x1, y1, null, false, chunks);
    let key = this.state.rev + '|' + (complete ? 1 : 0);
    for (const c of chunks) key += ',' + c.cx + ':' + c.cy;
    if (key !== this.listKey) {
      const list = [];
      for (const c of chunks) { const d = this._chunkDraw(c); for (let i = 0; i < d.length; i++) list.push(d[i]); }
      for (const b of this.state.buildings) for (const st of this._buildingStrips(b)) list.push(st);
      for (const b of this.state.npcBuildings || []) for (const st of this._buildingStrips(b)) list.push(st);
      list.sort((a, b) => a.wy - b.wy);
      this.list = list; this.listKey = key;
    }
    const list = this.list, sprites = this.sprites.list;
    // Menschen und Tiere bewegen sich: jedes Bild neu einsortieren (Mischen zweier sortierter Listen)
    const agents = life ? life.collect(view, this._agents || (this._agents = [])) : [];
    let ai = 0;
    const drawAgent = (a) => { const sp = sprites[a.s]; ctx.drawImage(sp.src[0], sp.x, sp.y, sp.w, sp.h, Math.round(a.wx - sp.ax), Math.round(a.wy - sp.ay), sp.w, sp.h); };
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      while (ai < agents.length && agents[ai].wy <= it.wy) drawAgent(agents[ai++]);
      if (it.strip) {
        const sp = it.sp;
        if (it.dx > x1 || it.dx + it.sw < x0 || it.dy > y1 || it.dy + sp.h < y0) continue;
        // Baustelle: Gebäude wächst von unten nach oben
        let cut = 0;
        if (it.kind === 'clip') {
          const p = it.b.site ? it.b.site.progress : 1;
          cut = Math.floor(sp.h * (1 - (0.08 + 0.92 * p)));
        } else if (it.kind === 'site' && !it.b.site) continue;
        // Streifen auf ganze Gerätepixel legen, damit zwischen ihnen keine Naht entsteht
        const X0 = Math.round(ox + it.dx * s), X1 = Math.round(ox + (it.dx + it.sw) * s);
        const Y0 = Math.round(oy + (it.dy + cut) * s), Y1 = Math.round(oy + (it.dy + sp.h) * s);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (Y1 > Y0) ctx.drawImage(sp.src[0], sp.x + it.sx, sp.y + cut, it.sw, sp.h - cut, X0, Y0, X1 - X0, Y1 - Y0);
        ctx.setTransform(s, 0, 0, s, ox, oy);
      } else {
        if (it.wx < x0 || it.wx > x1 || it.wy < y0 || it.wy > y1) continue;
        const sp = sprites[it.s];
        ctx.drawImage(sp.src[0], sp.x, sp.y, sp.w, sp.h, it.wx - sp.ax, it.wy - sp.ay, sp.w, sp.h);
      }
      n++;
    }
    while (ai < agents.length) drawAgent(agents[ai++]);
    this.stats.objects = n;
    this.stats.agents = agents.length;
    return complete;
  }

  _drawBuildingsFlat(lvl, cam, s) {
    const ctx = this.ctx, bs = this.state.npcBuildings && this.state.npcBuildings.length ? this.state.buildings.concat(this.state.npcBuildings) : this.state.buildings;
    if (!bs.length && !this.state.roads.size) return;
    if (lvl === 3) {
      // Wege als Linien
      if (this.state.roads.size) {
        const W = this.world.size, wpx = Math.max((1.2 * this.dpr) / s, 22);
        ctx.fillStyle = '#b9ad8e';
        for (const k of this.state.roads.keys()) {
          const x = k % W, y = (k - x) / W;
          ctx.fillRect((x - y) * 32 - wpx / 2, (x + y) * 16 + 16 - wpx / 2, wpx, wpx);
        }
      }
      // Siedlungen als Punkte (Cluster)
      ctx.fillStyle = '#e9e2cf';
      const r = Math.max((2.5 * this.dpr) / s, 24);
      for (const b of bs) {
        const def = BUILDINGS[b.type];
        const cx = (b.x - b.y + (def.footprint.width - def.footprint.height) / 2) * 32;
        const cy = (b.x + b.y + (def.footprint.width + def.footprint.height) / 2) * 16;
        ctx.fillRect(cx - r, cy - r / 2, r * 2, r);
      }
      return;
    }
    const f = 1 << lvl;
    const sorted = [...bs].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const b of sorted) {
      const sp = this.sprites.list[this.sprites.building[b.type]];
      if (b.site) ctx.globalAlpha = 0.35 + 0.5 * b.site.progress;
      ctx.drawImage(sp.src[lvl], sp.x / f, sp.y / f, sp.w / f, sp.h / f, (b.x - b.y) * 32 - sp.ax, (b.x + b.y) * 16 - sp.ay, sp.w, sp.h);
      ctx.globalAlpha = 1;
    }
  }

  _diamondPath(x, y, w, h) {
    const d = footprintDiamond(x, y, w, h), ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(d[0][0], d[0][1]); ctx.lineTo(d[1][0], d[1][1]); ctx.lineTo(d[2][0], d[2][1]); ctx.lineTo(d[3][0], d[3][1]);
    ctx.closePath();
  }

  // Beschriftung als helles Banner (Siedlungen) bzw. dunkles Schild (Hinweise).
  _label(text, wx, wy, cam, strong) {
    const ctx = this.ctx, dpr = this.dpr;
    const sx = ((wx - cam.x) * cam.scale + cam.vw / 2), sy = ((wy - cam.y) * cam.scale + cam.vh / 2);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = strong ? '600 14px Georgia, "Times New Roman", serif' : '500 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    const tw = ctx.measureText(text).width, pad = 10, hgt = 24;
    const x = Math.round(sx - tw / 2 - pad), y = Math.round(sy - hgt / 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = strong ? '#ebe2c9' : 'rgba(24, 30, 33, 0.82)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, tw + pad * 2, hgt, strong ? 3 : 6); else ctx.rect(x, y, tw + pad * 2, hgt);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (strong) { ctx.strokeStyle = 'rgba(90, 72, 44, 0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x + 2.5, y + 2.5, tw + pad * 2 - 5, hgt - 5); }
    ctx.fillStyle = strong ? '#33291c' : '#e2ddd0';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + pad, y + hgt / 2 + 1);
    ctx.restore();
  }

  _drawOverlay(cam, ov, s, ox, oy, lvl) {
    const ctx = this.ctx, px = 1 / s * this.dpr;      // 1 CSS-Pixel in Welt-Px
    ctx.lineJoin = 'round';

    if (ov.startZone) {
      const st = this.world.start, r = 7;
      ctx.setLineDash([10 * px, 7 * px]);
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = 'rgba(240, 214, 140, 0.95)';
      this._diamondPath(st.x - r, st.y - r, r * 2 + 1, r * 2 + 1);
      ctx.stroke();
      ctx.setLineDash([]);
      this._label('Empfohlene Landezone', (st.x - st.y) * 32, (st.x + st.y - r * 2) * 16 - 18 * px, cam, true);
    }
    if (ov.hover && lvl === 0 && !ov.ghost) {
      ctx.lineWidth = 1 * px;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      this._diamondPath(ov.hover.x, ov.hover.y, 1, 1);
      ctx.stroke();
    }
    if (ov.selected) {
      const q = ov.selected;
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = 'rgba(20, 24, 26, 0.7)';
      this._diamondPath(q.x, q.y, q.w, q.h); ctx.stroke();
      ctx.lineWidth = 1.2 * px;
      ctx.strokeStyle = '#f2dc9a';
      this._diamondPath(q.x, q.y, q.w, q.h); ctx.stroke();
    }
    if (ov.road) {
      const g = ov.road;
      for (const t of g.tiles) {
        ctx.fillStyle = !t.ok ? 'rgba(215, 85, 70, 0.55)' : t.same ? 'rgba(255, 255, 255, 0.18)' : 'rgba(225, 205, 140, 0.55)';
        this._diamondPath(t.x, t.y, 1, 1); ctx.fill();
      }
      if (g.start) {
        ctx.lineWidth = 2 * px;
        ctx.strokeStyle = '#f2dc9a';
        this._diamondPath(g.start.x, g.start.y, 1, 1); ctx.stroke();
      }
    }
    if (ov.ghost) {
      const g = ov.ghost;
      if (g.fieldPreview) {
        ctx.fillStyle = BUILDINGS[g.type].farm.kind === 'pasture' ? 'rgba(170, 215, 120, 0.32)' : 'rgba(225, 195, 120, 0.34)';
        for (const t of g.fieldPreview) { this._diamondPath(t.x, t.y, 1, 1); ctx.fill(); }
      }
      for (const t of g.tiles) {
        ctx.fillStyle = t.ok ? 'rgba(120, 200, 120, 0.42)' : 'rgba(215, 85, 70, 0.5)';
        this._diamondPath(t.x, t.y, 1, 1); ctx.fill();
      }
      ctx.lineWidth = 1.5 * px;
      ctx.strokeStyle = g.ok ? 'rgba(190, 240, 180, 0.95)' : 'rgba(250, 150, 135, 0.95)';
      this._diamondPath(g.x, g.y, g.w, g.h); ctx.stroke();
      const sp = this.sprites.list[this.sprites.building[g.type]];
      const m = lvl === 0 ? 0 : Math.min(lvl, 2), f = 1 << m;
      ctx.globalAlpha = g.ok ? 0.82 : 0.5;
      ctx.drawImage(sp.src[m], sp.x / f, sp.y / f, sp.w / f, sp.h / f, (g.x - g.y) * 32 - sp.ax, (g.x + g.y) * 16 - sp.ay, sp.w, sp.h);
      ctx.globalAlpha = 1;
    }
    if (lvl >= 1 && ov.settlement) {
      const q = ov.settlement;
      this._label(q.name, (q.x - q.y) * 32, (q.x + q.y) * 16 - 22 * px, cam, true);
    }
    if (ov.neighbors) for (const q of ov.neighbors) this._label(q.name, (q.x - q.y) * 32, (q.x + q.y) * 16 - 26 * px, cam, false);
  }
}
