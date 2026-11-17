// Deterministische Hash- und Rauschfunktionen.
// Alles hier ist eine reine Funktion von (Koordinate, Seed) – derselbe Seed
// erzeugt auf jedem Gerät dieselbe Welt.

export function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function hash2(x, y, seed) {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function rand2(x, y, seed) {
  return hash2(x, y, seed) / 4294967296;
}

// Wert-Rauschen, Ergebnis 0..1
export function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) / 4294967296;
}

// Fraktales Rauschen, Ergebnis ca. 0..1 (Mittel 0,5). Jede Oktave wird gedreht,
// damit keine Gitterstruktur sichtbar wird.
export function fbm(x, y, seed, octaves) {
  let amp = 0.5, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x, y, seed + i * 1013);
    norm += amp;
    amp *= 0.5;
    const nx = x * 1.6 - y * 1.2 + 31.7;
    y = x * 1.2 + y * 1.6 - 17.3;
    x = nx;
  }
  return sum / norm;
}

export function smooth(a, b, x) {
  let t = (x - a) / (b - a);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

// Kleiner Zufallsgenerator für Abläufe, die eine Folge brauchen (mulberry32).
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
