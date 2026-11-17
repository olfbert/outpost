// Spiel-Bot für Balance-Tests: baut nach einer vernünftigen Reihenfolge, ohne Cheats.
(() => {
  const o = window.__outpost, st = o.state, s = o.world.start, P = o.placement;
  const B = (t) => st.buildings.filter((b) => b.type === t);
  const done = (t) => st.buildings.some((b) => b.type === t && !b.site);
  const log = [];
  const W = o.world.size;
  function ownRoadTiles() { const out = []; for (const [k] of st.roads) if (!(st.npcRoads && st.npcRoads.has(k))) out.push({ x: k % W, y: (k - k % W) / W }); return out; }
  function connect(x, y, w, h) {
    // freies Nachbarfeld suchen und mit dem nächsten eigenen Weg verbinden
    const adj = [];
    for (let i = -1; i <= w; i++) { adj.push({ x: x + i, y: y - 1 }, { x: x + i, y: y + h }); }
    for (let j = 0; j < h; j++) { adj.push({ x: x - 1, y: y + j }, { x: x + w, y: y + j }); }
    const rt = ownRoadTiles();
    let best = null;
    for (const a of adj) for (const r of rt) { const d = Math.abs(a.x - r.x) + Math.abs(a.y - r.y); if (!best || d < best.d) best = { a, r, d }; }
    if (!best) return false;
    if (best.d === 0) return true;
    if (best.d > 60) return false;
    o.setTool('r:1');
    const pl = o.roads.plan(1, best.r, best.a);
    o.setTool(null);
    if (!pl || !pl.ok) return false;
    o.roads.build(pl);
    return true;
  }
  function tryBuild(type, cx = s.x, cy = s.y, rmax = 30) {
    const def = window.__defs[type];
    const w = def.footprint.width, h = def.footprint.height;
    if (type === 'lumber_camp') {
      // wie ein Spieler: dichtesten Wald in der Nähe suchen
      const cands = [];
      for (let r = 3; r <= 22; r += 1) for (let a = 0; a < r * 8; a += 2) {
        const x = Math.round(cx + Math.cos(a / (r * 8) * 6.2832) * r), y = Math.round(cy + Math.sin(a / (r * 8) * 6.2832) * r);
        const v = P.validate(type, x, y);
        if (v.reasons.some((q) => q.startsWith('Geld fehlt'))) return null;
        if (v.reasons.filter((q) => q !== 'Kein Weganschluss').length) continue;
        cands.push({ x, y, score: v.forest - r * 3 });
      }
      cands.sort((p, q) => q.score - p.score);
      for (const c of cands.slice(0, 15)) {
        if (!connect(c.x, c.y, 1, 1)) continue;
        if (!P.validate(type, c.x, c.y).ok) continue;
        const b = P.place(type, c.x, c.y); if (b) { log.push(`${Math.round(st.gameMonths * 10) / 10}: ${type} (${c.score})`); return b; }
      }
      log.push('kein Holzfällerplatz: ' + cands.length);
      return null;
    }
    for (let r = 2; r <= rmax; r++) {
      for (let a = 0; a < r * 8; a++) {
        const x = Math.round(cx + Math.cos(a / (r * 8) * 6.2832) * r), y = Math.round(cy + Math.sin(a / (r * 8) * 6.2832) * r);
        const v = P.validate(type, x, y);
        const bad = v.reasons.filter((q) => q !== 'Kein Weganschluss');
        if (bad.length) { if (bad.some((q) => q.startsWith('Geld fehlt') || q.startsWith('Benötigt'))) return null; continue; }
        // Platz um das Gebäude frei halten (Weg muss heranführen)
        if (!v.ok && !connect(x, y, w, h)) continue;
        const v2 = P.validate(type, x, y);
        if (!v2.ok) continue;
        const b = P.place(type, x, y);
        if (b) { log.push(`${Math.round(st.gameMonths * 10) / 10}: ${type}`); return b; }
      }
    }
    return null;
  }
  window.__bot = { tryBuild, B, done, log, connect };
})();
