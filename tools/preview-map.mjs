// Entwicklerwerkzeug: rendert eine Übersichtskarte als PPM und gibt Biom-Anteile aus.
// Aufruf: node tools/preview-map.mjs SEED [größe] [x0 y0 spanne]
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/world/worldGenerator.js';
import { CONFIG } from '../src/config/gameConfig.js';
import { TERRAIN_RAMPS, TERRAIN_INFO, T, COLORS, DEPOSIT_COLORS } from '../src/config/terrain.js';

const seed = process.argv[2] || 'TEST';
const N = +(process.argv[3] || 512);
const t0 = performance.now();
const world = createWorld(seed, CONFIG);
const t1 = performance.now();
const W = world.size;
const x0 = +(process.argv[4] || 0), y0 = +(process.argv[5] || 0), span = +(process.argv[6] || W);
const tpp = span / N;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const buf = Buffer.alloc(N * N * 3);
const counts = new Array(13).fill(0);
const o = {};
const oct = tpp > 8 ? 3 : tpp > 2 ? 4 : 5;
for (let v = 0; v < N; v++) {
  for (let u = 0; u < N; u++) {
    const x = x0 + (u + 0.5) * tpp, y = y0 + (v + 0.5) * tpp;
    world.sample(x, y, o, oct, tpp);
    counts[o.terrain]++;
    const e = o.e, terr = o.terrain, fd = o.forest;
    const e2 = world.sample(x + tpp, y, {}, oct, tpp).e;
    let sh = Math.max(-0.3, Math.min(0.3, ((e2 - e) / tpp) * 40));
    let idx = Math.max(0, Math.min(4, Math.floor((0.5 + sh) * 5)));
    let col = hex(TERRAIN_RAMPS[terr][idx]);
    if (terr === T.FOREST) col = hex(sh > 0 ? COLORS.canopy : COLORS.canopyDark);
    if (terr === T.CONIFER) col = hex(sh > 0 ? COLORS.conifer : COLORS.coniferDark);
    if (tpp <= 1) {
      const ob = world.objectAt(Math.floor(x), Math.floor(y), terr, fd);
      if (ob >= 10) col = hex(DEPOSIT_COLORS[ob]);
    }
    const i = (v * N + u) * 3;
    buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2];
  }
}
const t2 = performance.now();
// Startpunkt markieren
const su = Math.floor((world.start.x - x0) / tpp), sv = Math.floor((world.start.y - y0) / tpp);
for (let k = -3; k <= 3; k++) for (const [a, b] of [[su + k, sv], [su, sv + k]]) {
  if (a >= 0 && b >= 0 && a < N && b < N) { const i = (b * N + a) * 3; buf[i] = 255; buf[i + 1] = 40; buf[i + 2] = 40; }
}
writeFileSync(`/tmp/map_${seed}.ppm`, Buffer.concat([Buffer.from(`P6\n${N} ${N}\n255\n`), buf]));
const total = N * N;
console.log(`Seed ${seed}: Start ${world.start.x},${world.start.y}  createWorld ${(t1 - t0).toFixed(0)} ms, ${N}² Proben ${(t2 - t1).toFixed(0)} ms (${(((t2 - t1) * 1000) / total / 2).toFixed(2)} µs/Probe)`);
console.log(counts.map((c, i) => `${TERRAIN_INFO[i].name} ${((c / total) * 100).toFixed(1)}%`).join(' | '));
console.log('Startvorkommen:', world.extraDeposits.map((d) => `${d.type}@${d.x},${d.y}`).join(' '));
