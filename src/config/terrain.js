// Geländearten, Naturobjekte, Rohstoffvorkommen und ihre Farbpaletten.
// Reine Daten – Weltgenerator und Renderer lesen nur von hier.

export const T = {
  DEEP: 0, SEA: 1, LAKE: 2, RIVER: 3,
  SAND: 4, GRASS: 5, MEADOW: 6, FOREST: 7, CONIFER: 8,
  SWAMP: 9, GRAVEL: 10, ROCK: 11, MOUNTAIN: 12,
};
export const TERRAIN_COUNT = 13;
export const isWater = (t) => t <= T.RIVER;

export const TERRAIN_INFO = [
  { name: 'Tiefes Wasser', buildable: false },
  { name: 'Flachwasser', buildable: false },
  { name: 'See', buildable: false },
  { name: 'Fluss', buildable: false },
  { name: 'Sandfläche', buildable: true },
  { name: 'Grasland', buildable: true },
  { name: 'Fruchtbare Ebene', buildable: true },
  { name: 'Mischwald', buildable: true },
  { name: 'Nadelwald', buildable: true },
  { name: 'Sumpf', buildable: false },
  { name: 'Geröllfläche', buildable: true },
  { name: 'Felsige Hügel', buildable: false },
  { name: 'Gebirge', buildable: false },
];

// Fünfstufige Farbrampen (dunkel -> hell), gedämpfte Naturtöne.
export const TERRAIN_RAMPS = [
  ['#1c3f52', '#21485c', '#265166', '#2b5a70', '#31647b'], // DEEP
  ['#2c5b72', '#33667e', '#3a7189', '#437d95', '#4d89a0'], // SEA
  ['#346a80', '#3c758b', '#458096', '#4f8ca1', '#5a98ac'], // LAKE
  ['#3a7388', '#427e93', '#4b899e', '#5595a9', '#60a1b4'], // RIVER
  ['#b3a074', '#bfac7f', '#cab88b', '#d4c397', '#decea4'], // SAND
  ['#2e5030', '#386036', '#436c3a', '#53793e', '#668845'], // GRASS
  ['#3a5a2e', '#456a33', '#527738', '#62853e', '#769345'], // MEADOW
  ['#28412a', '#304c2e', '#395733', '#436338', '#4f6f3e'], // FOREST
  ['#253a31', '#2d4537', '#36503e', '#405c46', '#4a684e'], // CONIFER
  ['#33402e', '#3c4a33', '#465439', '#515f40', '#5d6a48'], // SWAMP
  ['#77725f', '#847f6b', '#918c78', '#9e9985', '#aba693'], // GRAVEL
  ['#62625c', '#6f6f67', '#7c7c73', '#8a8a80', '#98988e'], // ROCK
  ['#6e6e73', '#7f7f84', '#919195', '#a4a4a7', '#b9b9bb'], // MOUNTAIN
];

export const COLORS = {
  shallow: '#6fa7b3',
  foam: '#a5cbcd',
  bank: '#63563e',
  wetSand: '#9a8a62',
  canopy: '#2f4e2f',        // Flächendarstellung Mischwald
  canopyDark: '#1d3420',
  conifer: '#284334',       // Flächendarstellung Nadelwald
  coniferDark: '#182c25',
  background: '#1c3f52',
};

// Naturobjekte auf einem Feld (höchstens eines pro Feld).
export const O = {
  NONE: 0, TREE: 1, CONIFER: 2, BUSH: 3, ROCK: 4, BOULDER: 5, PEAK: 6,
  DEADTREE: 7, REEDS: 8,
  // Nach dem Fällen: Stumpf, später junger Baum (wächst wieder zum Baum)
  STUMP: 20, SAPLING: 21, SAPLING_C: 22,
  // Rohstoffvorkommen
  DEP_STONE: 10, DEP_IRON: 11, DEP_COAL: 12, DEP_LIME: 13, DEP_CLAY: 14, DEP_SAND: 15,
};
export const isDeposit = (o) => o >= O.DEP_STONE && o <= O.DEP_SAND;
export const isTree = (o) => o === O.TREE || o === O.CONIFER || o === O.DEADTREE;

export const OBJECT_INFO = {
  [O.TREE]: { name: 'Laubbäume', resource: 'Holz' },
  [O.CONIFER]: { name: 'Nadelbäume', resource: 'Holz' },
  [O.BUSH]: { name: 'Buschwerk' },
  [O.ROCK]: { name: 'Felsbrocken' },
  [O.BOULDER]: { name: 'Felsblock' },
  [O.PEAK]: { name: 'Felsmassiv' },
  [O.DEADTREE]: { name: 'Sumpfbäume', resource: 'Holz' },
  [O.REEDS]: { name: 'Schilf' },
  [O.STUMP]: { name: 'Baumstumpf (gefällt)' },
  [O.SAPLING]: { name: 'Junger Laubbaum' },
  [O.SAPLING_C]: { name: 'Junger Nadelbaum' },
  [O.DEP_STONE]: { name: 'Steinvorkommen', resource: 'Stein', unit: 't' },
  [O.DEP_IRON]: { name: 'Eisenerzvorkommen', resource: 'Eisenerz', unit: 't' },
  [O.DEP_COAL]: { name: 'Kohlevorkommen', resource: 'Kohle', unit: 't' },
  [O.DEP_LIME]: { name: 'Kalksteinvorkommen', resource: 'Kalkstein', unit: 't' },
  [O.DEP_CLAY]: { name: 'Tonvorkommen', resource: 'Ton', unit: 't' },
  [O.DEP_SAND]: { name: 'Sandvorkommen', resource: 'Sand', unit: 't' },
};

// Bodenfärbung der Vorkommen (dezent, fleckig in den Boden eingearbeitet)
export const DEPOSIT_GROUND = {
  [O.DEP_STONE]: { cols: ['#5f5d52', '#6b695d', '#777468'], speck: '#8d8a7e', cover: 0.32 },
  [O.DEP_IRON]: { cols: ['#5d4434', '#694c3a', '#755542'], speck: '#8a5e44', cover: 0.32 },
  [O.DEP_COAL]: { cols: ['#2c2d29', '#353632', '#3f3f3a'], speck: '#4c4b45', cover: 0.32 },
  [O.DEP_LIME]: { cols: ['#8f8b78', '#9b9784', '#a7a390'], speck: '#b8b4a1', cover: 0.32 },
  [O.DEP_CLAY]: { cols: ['#6e5038', '#7a5940', '#856248'], speck: '#946c4f', cover: 0.32 },
  [O.DEP_SAND]: { cols: ['#a3946b', '#ae9f75', '#b9aa80'], speck: '#c6b88e', cover: 0.32 },
};

// Farbe der Vorkommen in der Flächendarstellung / Minimap.
export const DEPOSIT_COLORS = {
  [O.DEP_STONE]: '#8d8d86',
  [O.DEP_IRON]: '#9a5a3a',
  [O.DEP_COAL]: '#2b2b30',
  [O.DEP_LIME]: '#d8d2bd',
  [O.DEP_CLAY]: '#a8683f',
  [O.DEP_SAND]: '#e2d39b',
};
