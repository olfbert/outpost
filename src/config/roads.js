// Wegtypen (datengetrieben). width = halbe Wegbreite als Anteil eines Feldes.
// Die Form (Gerade, Kurve, T-Kreuzung, Kreuzung, Sackgasse) ergibt sich
// automatisch aus den Nachbarfeldern.

import { T } from './terrain.js';

const GROUND = [T.GRASS, T.MEADOW, T.FOREST, T.CONIFER, T.SAND, T.GRAVEL];

export const ROADS = [
  null, // 0 = kein Weg
  {
    id: 'dirt', name: 'Erdweg', description: 'Festgefahrener Pfad. Billig, aber langsam.',
    width: 0.17, cost: { money: 8 }, terrain: GROUND,
    colors: ['#6e5a3e', '#7b6545', '#87704d'], edge: '#5c4a33', speck: '#9a8560',
  },
  {
    id: 'gravel', name: 'Schotterweg', description: 'Verdichteter Schotter, für LKW geeignet.',
    width: 0.21, cost: { money: 25 }, terrain: GROUND,
    colors: ['#857f70', '#948e7e', '#a29c8b'], edge: '#6c675b', speck: '#b9b3a2',
  },
  {
    id: 'paved', name: 'Befestigte Straße', description: 'Einfache Straße mit fester Decke und Bankett.',
    width: 0.26, cost: { money: 60 }, terrain: GROUND,
    colors: ['#545656', '#5c5e5e', '#636565'], edge: '#8d8a7c', speck: '#6e7070',
  },
];

export const ROAD_MENU = [1, 2, 3];
export const ROAD_BY_ID = Object.fromEntries(ROADS.filter(Boolean).map((r, i) => [r.id, i + 1]));
