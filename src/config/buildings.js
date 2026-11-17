// Gebäudedaten (datengetrieben). Neue Gebäude, Rezepte und Freischaltungen
// werden hier ergänzt, ohne die Kernlogik anzufassen.
//
// production: Mengen je Ingame-Monat (fließend berechnet, siehe simulation/production.js)
// upkeep:     Betriebskosten in Cr je Monat (am Monatsende abgerechnet)
// unlock:     Gebäude-IDs, die vorher stehen müssen
// requirements.deposit: Gebäude muss auf diesem Vorkommen stehen (Mine, Grube)
// residents / workers: Wohnplätze bzw. Arbeitsplätze (Bewohner gehen dorthin; noch ohne Einfluss auf die Produktion)

import { T, O } from './terrain.js';

const SOFT_GROUND = [T.GRASS, T.MEADOW, T.FOREST, T.CONIFER, T.SAND, T.GRAVEL];
const DECO_GROUND = [T.GRASS, T.MEADOW, T.FOREST, T.CONIFER, T.SAND, T.GRAVEL, T.HILLS !== undefined ? T.HILLS : T.GRASS];
const MINE_GROUND = [...SOFT_GROUND, T.ROCK];

function extractor(id, name, description, deposit, good, rate, cost, upkeep, unlock, art, workers = 3) {
  return {
    id, name, category: 'resources', description,
    footprint: { width: 2, height: 2 },
    buildCost: cost,
    requirements: { terrain: MINE_GROUND, maxSlope: 0.09, roadAccess: true, deposit },
    production: { inputs: {}, outputs: { [good]: rate } },
    upkeep, unlock, workers,
    art,
  };
}

export const BUILDINGS = {
  landing_module: {
    id: 'landing_module', name: 'Landemodul', category: 'landing',
    description: 'Lande- und Kommandomodul der Expedition. Ausgangspunkt der Siedlung, mit kleinem Lager (600 je Ware).',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 0 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.03 },
    unique: true,
    provides: { storage: 600, supplyRadius: 12, builders: 2, trucks: 2 },
    upkeep: 0,
    art: { kind: 'lander' },
  },
  shelter: {
    id: 'shelter', name: 'Provisorische Unterkunft', category: 'residential',
    description: 'Einfache Notunterkunft aus Plane und Stahlrohr für die ersten Siedler.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 750, planks: 8 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04 },
    upkeep: 0, residents: 2, fullOnBuild: true,
    art: { kind: 'box', wallH: 11, gable: 9, wall: '#767a55', roof: '#868b62', siding: 0, door: true },
  },
  house_small: {
    id: 'house_small', name: 'Kleines Wohnhaus', category: 'residential',
    description: 'Fertighaus mit Ziegeldach für eine Familie.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 2250, planks: 24, stone: 12 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    upkeep: 15, residents: 4,
    art: { kind: 'box', wallH: 15, gable: 12, wall: '#cfc5a8', roof: '#8c4b3b', siding: 5, door: true, windows: true, chimney: true },
  },
  warehouse: {
    id: 'warehouse', name: 'Lagerhalle', category: 'logistics',
    description: 'Wellblechhalle mit 1.200 Platz je Ware. Lkw bringen Überschüsse ins nächste Lager – kurze Wege sparen Fahrzeit.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 3000, planks: 40, stone: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    provides: { storage: 1200 },
    upkeep: 60, workers: 1,
    art: { kind: 'box', wallH: 20, gable: 13, wall: '#8b958a', roof: '#a3abaa', siding: 3, gate: true, stripes: true },
  },
  lumber_camp: {
    id: 'lumber_camp', name: 'Holzfällerlager', category: 'resources',
    description: 'Fällt Bäume im Umkreis und liefert Rundholz. Der Wald wird dabei weniger.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 1250, planks: 12 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.05, roadAccess: true, nearTrees: { radius: 8, min: 20 } },
    production: { inputs: {}, outputs: { logs: 160 } },
    logsPerTree: 20,
    upkeep: 120, workers: 2,
    art: { kind: 'box', wallH: 12, gable: 8, wall: '#7c5d3d', roof: '#5e5a4c', siding: 3, door: true, logs: true },
  },
  sawmill: {
    id: 'sawmill', name: 'Sägewerk', category: 'industry',
    description: 'Verarbeitet Rundholz zu Brettern.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 3750, planks: 20, stone: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { logs: 160 }, outputs: { planks: 240 } },
    upkeep: 200, workers: 3,
    art: { kind: 'box', wallH: 17, gable: 0, wall: '#86684a', roof: '#8e9694', siding: 4, opening: true, planks: true, pipe: true, stripes: true },
  },
  quarry: extractor('quarry', 'Steinbruch', 'Bricht Rohstein aus einem Steinvorkommen.', O.DEP_STONE, 'stone', 200,
    { money: 3000, planks: 30 }, 180, [],
    { kind: 'box', wallH: 10, gable: 7, wall: '#8a8478', roof: '#6d6a62', siding: 3, door: true, piles: ['#6f6f68', '#8e8e86', '#a9a99f'] }),
  iron_mine: extractor('iron_mine', 'Eisenerzmine', 'Fördert Eisenerz. Braucht ein Eisenerzvorkommen.', O.DEP_IRON, 'iron_ore', 120,
    { money: 6250, planks: 50, stone: 40 }, 260, ['sawmill'],
    { kind: 'box', wallH: 14, gable: 9, wall: '#6f6a62', roof: '#5a4a40', siding: 4, gate: true, headframe: true, piles: ['#5e3a2a', '#7d4c36', '#9c6244'] }),
  coal_mine: extractor('coal_mine', 'Kohlemine', 'Fördert Kohle. Braucht ein Kohlevorkommen.', O.DEP_COAL, 'coal', 120,
    { money: 6250, planks: 50, stone: 40 }, 260, ['sawmill'],
    { kind: 'box', wallH: 14, gable: 9, wall: '#5f5c58', roof: '#3f3d3a', siding: 4, gate: true, headframe: true, piles: ['#1e1e22', '#2e2e33', '#43434a'] }),
  lime_quarry: extractor('lime_quarry', 'Kalksteinbruch', 'Bricht Kalkstein für die Zementherstellung.', O.DEP_LIME, 'limestone', 160,
    { money: 3500, planks: 30, stone: 10 }, 180, ['sawmill'],
    { kind: 'box', wallH: 10, gable: 7, wall: '#a7a291', roof: '#7d7a6e', siding: 3, door: true, piles: ['#b9b3a0', '#cfc9b6', '#e2ddcb'] }),
  clay_pit: extractor('clay_pit', 'Tongrube', 'Gräbt Ton ab.', O.DEP_CLAY, 'clay', 160,
    { money: 2250, planks: 20 }, 120, ['sawmill'],
    { kind: 'box', wallH: 9, gable: 6, wall: '#7c6650', roof: '#5f564a', siding: 3, door: true, piles: ['#8d5739', '#a26543', '#b6754e'] }),
  sand_pit: extractor('sand_pit', 'Sandgrube', 'Baggert Sand ab.', O.DEP_SAND, 'sand', 200,
    { money: 2250, planks: 20 }, 120, ['sawmill'],
    { kind: 'box', wallH: 9, gable: 6, wall: '#8a7d62', roof: '#6a6352', siding: 3, door: true, piles: ['#c4b382', '#d6c694', '#e5d7a8'] }),
  smelter: {
    id: 'smelter', name: 'Schmelzofen', category: 'industry',
    description: 'Schmilzt Eisenerz mit Kohle zu Stahl.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 15000, planks: 60, stone: 120 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { iron_ore: 80, coal: 80 }, outputs: { steel: 40 } },
    upkeep: 520, unlock: ['iron_mine', 'coal_mine'], workers: 4,
    art: { kind: 'box', wallH: 22, gable: 0, wall: '#7a4a3c', roof: '#4b4a48', siding: 4, gate: true, stacks: 2 },
  },
  cement_works: {
    id: 'cement_works', name: 'Zementwerk', category: 'industry',
    description: 'Brennt Kalkstein und Ton zu Zement.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 12500, planks: 50, stone: 80, steel: 10 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { limestone: 120, clay: 40 }, outputs: { cement: 80 } },
    upkeep: 420, unlock: ['lime_quarry', 'clay_pit'], workers: 4,
    art: { kind: 'box', wallH: 20, gable: 0, wall: '#a8a59a', roof: '#7f7d76', siding: 3, gate: true, stacks: 1, silo: true },
  },
  concrete_plant: {
    id: 'concrete_plant', name: 'Betonwerk', category: 'industry',
    description: 'Mischt Zement, Sand und Stein zu Beton.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 11250, planks: 40, stone: 60, steel: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { cement: 40, sand: 80, stone: 40 }, outputs: { concrete: 120 } },
    upkeep: 380, unlock: ['cement_works', 'sand_pit'], workers: 3,
    art: { kind: 'box', wallH: 16, gable: 0, wall: '#9a9a94', roof: '#6e6e6a', siding: 4, gate: true, silo: true, piles: ['#857f70', '#948e7e', '#a29c8b'] },
  },
  // --- Versorgung (Stufe A) -----------------------------------------------------------
  fisher_hut: {
    id: 'fisher_hut', name: 'Fischerhütte', category: 'food',
    description: 'Fischt in einem See oder Fluss in der Nähe. Die einfachste Nahrung für den Anfang.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 1500, planks: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.06, roadAccess: true, nearWater: 2 },
    production: { inputs: {}, outputs: { fish: 120 } },
    upkeep: 40, workers: 2,
    art: { kind: 'box', wallH: 10, gable: 7, wall: '#7d7a6e', roof: '#5b5f5c', siding: 3, door: true, piles: ['#4f5e66', '#6c7b80', '#8a979a'] },
  },
  farm: {
    id: 'farm', name: 'Ackerhof', category: 'food',
    description: 'Bestellt bis zu 16 Felder rund um den Hof. Ernte im Spätsommer – Kartoffeln oder Getreide.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 4000, planks: 40, stone: 10 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.05, roadAccess: true },
    farm: { kind: 'field', max: 16, radius: 3, crops: { potatoes: 60, grain: 80 } },   // Ertrag je Feld und Jahr
    upkeep: 120, workers: 4,
    art: { kind: 'box', wallH: 14, gable: 12, wall: '#8c4a3a', roof: '#5a5650', siding: 4, gate: true, silo: true },
  },
  ranch: {
    id: 'ranch', name: 'Viehhof', category: 'food',
    description: 'Hält Herdentiere auf einer eingezäunten Weide (bis zu 20 Felder).',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 4500, planks: 50, stone: 10 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.05, roadAccess: true },
    farm: { kind: 'pasture', max: 20, radius: 3, perTile: 2 },   // Vieh je Weidefeld und Monat
    production: { inputs: {}, outputs: { cattle: 40 } },
    upkeep: 140, workers: 3,
    art: { kind: 'box', wallH: 11, gable: 9, wall: '#6e5638', roof: '#7a4c34', siding: 3, gate: true },
  },
  mill: {
    id: 'mill', name: 'Mühle', category: 'food',
    description: 'Mahlt Getreide zu Mehl.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 5000, planks: 30, stone: 30 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { grain: 120 }, outputs: { flour: 120 } },
    upkeep: 120, unlock: ['farm'], workers: 2,
    art: { kind: 'box', wallH: 18, gable: 0, wall: '#d6d2c4', roof: '#4a4a46', siding: 4, door: true, pipe: true },
  },
  bakery: {
    id: 'bakery', name: 'Bäckerei', category: 'food',
    description: 'Backt aus Mehl Brot.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 4000, planks: 30, stone: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { flour: 120 }, outputs: { bread: 180 } },
    upkeep: 110, unlock: ['mill'], workers: 3,
    art: { kind: 'box', wallH: 13, gable: 10, wall: '#d9c27a', roof: '#6a4532', siding: 0, door: true, windows: true, chimney: true },
  },
  butcher: {
    id: 'butcher', name: 'Schlachterei', category: 'food',
    description: 'Verarbeitet Vieh zu Fleisch.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 4000, planks: 25, stone: 25 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { cattle: 40 }, outputs: { meat: 120 } },
    upkeep: 120, unlock: ['ranch'], workers: 3,
    art: { kind: 'box', wallH: 13, gable: 0, wall: '#d8d8d2', roof: '#8a8f92', siding: 0, door: true, windows: true },
  },
  glassworks: {
    id: 'glassworks', name: 'Glashütte', category: 'industry',
    description: 'Schmilzt Sand mit Kohle zu Glas – für Gewächshäuser und Wohnblöcke.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 9000, planks: 40, stone: 60 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: { sand: 80, coal: 20 }, outputs: { glass: 40 } },
    upkeep: 300, unlock: ['sand_pit', 'coal_mine'], workers: 4,
    art: { kind: 'box', wallH: 18, gable: 0, wall: '#8a7f70', roof: '#55524c', siding: 4, gate: true, stacks: 1 },
  },
  greenhouse: {
    id: 'greenhouse', name: 'Gewächshaus', category: 'food',
    description: 'Zieht das ganze Jahr Gemüse unter Glas, auch im Winter.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 10000, planks: 20, steel: 10, glass: 40 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    production: { inputs: {}, outputs: { vegetables: 160 } },
    upkeep: 200, unlock: ['glassworks'], workers: 3,
    art: { kind: 'box', wallH: 12, gable: 8, wall: '#9fb9b4', roof: '#bcd0cc', siding: 2, stripes: true, door: true },
  },
  food_store: {
    id: 'food_store', name: 'Lebensmittelladen', category: 'food',
    description: 'Versorgt alle Häuser im Umkreis von 14 Feldern mit Nahrung aus dem Lager.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 2500, planks: 20, stone: 10 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    provides: { supplyRadius: 14 },
    upkeep: 60, workers: 2,
    art: { kind: 'box', wallH: 13, gable: 0, wall: '#b9b29a', roof: '#6d6a62', siding: 0, door: true, windows: true },
  },
  wood_house: {
    id: 'wood_house', name: 'Holzhaus', category: 'residential',
    description: 'Gemütliches Blockhaus für 3 Bewohner. Braucht vor allem Bretter, kaum Stein.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 1600, planks: 30 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.06, roadAccess: true },
    upkeep: 10, residents: 3,
    art: { kind: 'box', wallH: 11, gable: 10, wall: '#6b4a30', roof: '#3f5a3a', siding: 3, door: true, chimney: true },
  },
  brick_house: {
    id: 'brick_house', name: 'Backsteinhaus', category: 'residential',
    description: 'Solides zweistöckiges Haus für 6 Bewohner. Füllt sich über 4 Bewohner erst mit zwei Nahrungssorten.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 4200, planks: 20, stone: 40 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.05, roadAccess: true },
    upkeep: 20, residents: 6, needsVariety: { min: 2, below: 4 },
    art: { kind: 'box', wallH: 20, gable: 8, wall: '#9a4a36', roof: '#4d4d50', siding: 0, door: true, windows: true },
  },
  row_house: {
    id: 'row_house', name: 'Reihenhäuser', category: 'residential',
    description: 'Drei Reihenhäuser für zusammen 10 Bewohner. Über 6 Bewohner erst mit zwei Nahrungssorten.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 7000, planks: 40, stone: 50 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.05, roadAccess: true },
    upkeep: 35, residents: 10, needsVariety: { min: 2, below: 6 },
    art: { kind: 'box', wallH: 18, gable: 10, wall: '#d6c58e', roof: '#7a4c34', siding: 0, door: true, windows: true },
  },
  apartment: {
    id: 'apartment', name: 'Wohnblock', category: 'residential',
    description: 'Mehrfamilienhaus aus Beton für 12 Bewohner. Füllt sich über 4 Bewohner nur mit drei Nahrungssorten.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 12000, planks: 40, stone: 40, concrete: 60, glass: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    upkeep: 60, residents: 12, needsVariety: { min: 3, below: 4 },
    unlock: ['concrete_plant', 'glassworks'],
    art: { kind: 'box', wallH: 26, gable: 0, wall: '#b7b3a8', roof: '#6b6a66', siding: 6, door: true, windows: true },
  },
  // --- Deko -------------------------------------------------------------------------
  lamp: { id: 'lamp', name: 'Straßenlaterne', category: 'deco', description: 'Leuchtet abends und nachts. Verschönert die Umgebung.',
    footprint: { width: 1, height: 1 }, buildCost: { money: 120 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.12 }, upkeep: 2, instant: true, beauty: 1, art: { kind: 'prop', prop: 'lamp' } },
  bench: { id: 'bench', name: 'Parkbank', category: 'deco', description: 'Ein Platz zum Ausruhen. Verschönert die Umgebung.',
    footprint: { width: 1, height: 1 }, buildCost: { money: 80 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.12 }, upkeep: 0, instant: true, beauty: 1, art: { kind: 'prop', prop: 'bench' } },
  bin: { id: 'bin', name: 'Mülleimer', category: 'deco', description: 'Hält die Wege sauber. Verschönert die Umgebung.',
    footprint: { width: 1, height: 1 }, buildCost: { money: 40 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.12 }, upkeep: 0, instant: true, beauty: 1, art: { kind: 'prop', prop: 'bin' } },
  flowers: { id: 'flowers', name: 'Blumenbeet', category: 'deco', description: 'Bunte Blumen. Verschönert die Umgebung deutlich.',
    footprint: { width: 1, height: 1 }, buildCost: { money: 150 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.12 }, upkeep: 1, instant: true, beauty: 2, art: { kind: 'prop', prop: 'flowers' } },
  plant_tree: { id: 'plant_tree', name: 'Laubbaum pflanzen', category: 'deco', description: 'Ein Zierbaum für Straßen und Plätze (wird nicht gefällt).',
    footprint: { width: 1, height: 1 }, buildCost: { money: 60 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.15 }, upkeep: 0, instant: true, beauty: 2, art: { kind: 'prop', prop: 'tree' } },
  plant_conifer: { id: 'plant_conifer', name: 'Nadelbaum pflanzen', category: 'deco', description: 'Ein Zierbaum für Straßen und Plätze (wird nicht gefällt).',
    footprint: { width: 1, height: 1 }, buildCost: { money: 60 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.15 }, upkeep: 0, instant: true, beauty: 2, art: { kind: 'prop', prop: 'conifer' } },
  fountain: { id: 'fountain', name: 'Brunnen', category: 'deco', description: 'Ein Zierbrunnen als Mittelpunkt des Ortes. Verschönert die Umgebung stark.',
    footprint: { width: 1, height: 1 }, buildCost: { money: 1500, stone: 20 }, requirements: { terrain: DECO_GROUND, maxSlope: 0.06 }, upkeep: 10, instant: true, beauty: 4, art: { kind: 'prop', prop: 'fountain' } },
  haulage: {
    id: 'haulage', name: 'Spedition', category: 'logistics',
    description: 'Fuhrhof mit zwei Lkw. Weitere Lkw lassen sich hier kaufen (bis zu 8). Mehr Lkw bringen Waren schneller ans Ziel.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 8000, planks: 40, stone: 30 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    provides: { trucks: 2 },
    upkeep: 150, workers: 3,
    art: { kind: 'box', wallH: 14, gable: 0, wall: '#6d7f8f', roof: '#5a5f62', siding: 4, gate: true },
  },
  silo: {
    id: 'silo', name: 'Silo', category: 'logistics',
    description: 'Lager nur für Schüttgut (Rundholz, Stein, Erz, Kohle, Sand, Kalk, Ton, Getreide, Kartoffeln): 2.000 je Ware. Günstiger als eine Lagerhalle.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 3500, planks: 20, stone: 40 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    provides: { bulkStorage: 2000 },
    upkeep: 40,
    art: { kind: 'box', wallH: 26, gable: 0, wall: '#9aa3a6', roof: '#7d878a', siding: 4, silo: true },
  },
  drone_port: {
    id: 'drone_port', name: 'Drohnenflugplatz', category: 'logistics',
    description: 'Vier Lastdrohnen fliegen Waren im Umkreis von 40 Feldern direkt ans Ziel – über Wasser und ohne Wege. Kleine Ladung, aber schnell.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 12000, planks: 30, stone: 40, steel: 15 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    provides: { drones: 4 },
    upkeep: 250, workers: 3, unlock: ['haulage'],
    art: { kind: 'box', wallH: 10, gable: 0, wall: '#8d949a', roof: '#5f666b', siding: 2, gate: true },
  },
  trade_office: {
    id: 'trade_office', name: 'Handelskontor', category: 'logistics',
    description: 'Öffnet den Handel mit den Nachbarsiedlungen. Mit Straßenverbindung zu ihrer Handelsstation wird es deutlich billiger als per Luftfracht.',
    footprint: { width: 1, height: 1 },
    buildCost: { money: 6000, planks: 30, stone: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    upkeep: 100, workers: 2, unique: true,
    art: { kind: 'box', wallH: 15, gable: 9, wall: '#c9b48a', roof: '#4d5e6e', siding: 0, door: true, windows: true },
  },
  depot: {
    id: 'depot', name: 'Bauhof', category: 'industry',
    description: 'Stellt einen weiteren Bautrupp: zwei zusätzliche Baustellen gleichzeitig.',
    footprint: { width: 2, height: 2 },
    buildCost: { money: 3000, planks: 40, stone: 20 },
    requirements: { terrain: SOFT_GROUND, maxSlope: 0.04, roadAccess: true },
    provides: { builders: 2 },
    upkeep: 150, workers: 4,
    art: { kind: 'box', wallH: 14, gable: 0, wall: '#a38a52', roof: '#6b6656', siding: 3, gate: true, planks: true },
  },
};

export const BUILD_MENU = [
  'landing_module', 'shelter', 'wood_house', 'house_small', 'brick_house', 'row_house', 'apartment',
  'fisher_hut', 'food_store', 'farm', 'ranch', 'mill', 'bakery', 'butcher', 'greenhouse',
  'warehouse', 'silo', 'haulage', 'drone_port', 'trade_office', 'depot',
  'lamp', 'bench', 'bin', 'flowers', 'plant_tree', 'plant_conifer', 'fountain',
  'lumber_camp', 'sawmill', 'quarry',
  'clay_pit', 'sand_pit', 'lime_quarry', 'iron_mine', 'coal_mine',
  'smelter', 'cement_works', 'concrete_plant', 'glassworks',
];

export const MENU_TABS = [
  { id: 'all', name: 'Alle' },
  { id: 'living', name: 'Wohnen', cats: ['landing', 'residential'] },
  { id: 'food', name: 'Versorgung', cats: ['food'] },
  { id: 'resources', name: 'Rohstoffe', cats: ['resources'] },
  { id: 'industry', name: 'Industrie', cats: ['industry'] },
  { id: 'logistics', name: 'Logistik', cats: ['logistics'] },
  { id: 'deco', name: 'Deko', cats: ['deco'] },
  { id: 'roads', name: 'Wege' },
];

// Lesbare Namen der Bauvoraussetzungen (für Vorschau und Bauleiste).
export function requirementText(def) {
  const r = def.requirements, out = [];
  if (r.deposit) out.push('passendes Vorkommen');
  if (r.roadAccess) out.push('Weganschluss');
  if (r.nearTrees) out.push(`Wald im Umkreis von ${r.nearTrees.radius} Feldern`);
  if (r.nearWater) out.push(`Wasser im Umkreis von ${r.nearWater} Feldern`);
  if (def.farm) out.push(def.farm.kind === 'field' ? 'freies Land für Felder' : 'freies Land für die Weide');
  out.push('ebener, fester Boden');
  return out.join(', ');
}

export const CATEGORY_NAMES = {
  landing: 'Expedition',
  residential: 'Wohnen',
  industry: 'Industrie',
  resources: 'Rohstoffe',
  food: 'Versorgung',
  logistics: 'Logistik',
  deco: 'Deko',
};
