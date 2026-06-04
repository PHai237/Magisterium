import type {
  ExplorationEncounterPoolEntry,
  ExplorationItemPoolEntry,
  ExplorationOutcomeWeight,
  ExplorationZoneDefinition,
  ExplorationZoneId,
} from './exploration.types';

export const EXPLORATION_ZONE_IDS = [
  'town_outskirts',
  'forest_edge',
  'abandoned_mine',
] as const satisfies readonly ExplorationZoneId[];

function freezeEncounterPoolEntry(
  entry: ExplorationEncounterPoolEntry,
): Readonly<ExplorationEncounterPoolEntry> {
  return Object.freeze({ ...entry });
}

function freezeItemPoolEntry(
  entry: ExplorationItemPoolEntry,
): Readonly<ExplorationItemPoolEntry> {
  return Object.freeze({ ...entry });
}

function freezeOutcomeWeight(
  entry: ExplorationOutcomeWeight,
): Readonly<ExplorationOutcomeWeight> {
  return Object.freeze({ ...entry });
}

function freezeExplorationZoneDefinition(
  zone: ExplorationZoneDefinition,
): Readonly<ExplorationZoneDefinition> {
  return Object.freeze({
    ...zone,
    encounterPool: Object.freeze(
      zone.encounterPool.map((entry) => freezeEncounterPoolEntry(entry)),
    ),
    itemPool: Object.freeze(
      zone.itemPool.map((entry) => freezeItemPoolEntry(entry)),
    ),
    outcomeWeights: Object.freeze(
      zone.outcomeWeights.map((entry) => freezeOutcomeWeight(entry)),
    ),
    bronzeReward: Object.freeze({ ...zone.bronzeReward }),
    entryLog: Object.freeze([...zone.entryLog]),
  });
}

const BASIC_SUPPLY_ITEM_POOL = Object.freeze([
  {
    itemId: 'stamina_bread',
    minQuantity: 1,
    maxQuantity: 1,
    weight: 25,
  },
  {
    itemId: 'minor_hp_potion',
    minQuantity: 1,
    maxQuantity: 1,
    weight: 25,
  },
  {
    itemId: 'minor_mp_potion',
    minQuantity: 1,
    maxQuantity: 1,
    weight: 25,
  },
  {
    itemId: 'one_night_inn_pass',
    minQuantity: 1,
    maxQuantity: 1,
    weight: 25,
  },
]) satisfies readonly ExplorationItemPoolEntry[];

const STANDARD_OUTCOME_WEIGHTS = Object.freeze([
  {
    outcomeType: 'encounter',
    weight: 40,
  },
  {
    outcomeType: 'bronze',
    weight: 15,
  },
  {
    outcomeType: 'item',
    weight: 5,
  },
  {
    outcomeType: 'nothing',
    weight: 40,
  },
]) satisfies readonly ExplorationOutcomeWeight[];

const RAW_EXPLORATION_ZONE_DEFINITIONS: readonly ExplorationZoneDefinition[] = [
  {
    id: 'town_outskirts',
    name: 'Town Outskirts',
    subtitle: 'Lv. 1 - 2 Wildlands',
    description:
      'Open grassland outside the stronghold where slimes, horned rabbits, and razorwing hawks roam.',
    icon: 'Grass',
    dangerLevel: 1,
    staminaCost: 5,
    encounterPool: [
      {
        encounterId: 'town_outskirts_slime',
        weight: 40,
      },
      {
        encounterId: 'town_outskirts_rabbit',
        weight: 30,
      },
      {
        encounterId: 'town_outskirts_hawk',
        weight: 30,
      },
    ],
    itemPool: BASIC_SUPPLY_ITEM_POOL,
    outcomeWeights: STANDARD_OUTCOME_WEIGHTS,
    bronzeReward: {
      min: 1,
      max: 3,
    },
    entryLog: [
      'You step beyond the stronghold road into the open town outskirts.',
      'The grass shifts under the wind. Something may be watching from nearby.',
    ],
  },
  {
    id: 'forest_edge',
    name: 'Forest Edge',
    subtitle: 'Lv. 2 - 4 Border Woods',
    description:
      'The first line of the forest beyond the safe roads. Wild boars, wolves, and bears claim these border woods.',
    icon: 'Forest',
    dangerLevel: 2,
    staminaCost: 7,
    encounterPool: [
      {
        encounterId: 'forest_edge_boar',
        weight: 40,
      },
      {
        encounterId: 'forest_edge_wolf',
        weight: 35,
      },
      {
        encounterId: 'forest_edge_bear',
        weight: 25,
      },
    ],
    itemPool: BASIC_SUPPLY_ITEM_POOL,
    outcomeWeights: STANDARD_OUTCOME_WEIGHTS,
    bronzeReward: {
      min: 1,
      max: 3,
    },
    entryLog: [
      'You approach the forest edge. The canopy muffles the sound of the road behind you.',
      'Broken branches and claw marks suggest that this area is no longer safe.',
    ],
  },
  {
    id: 'abandoned_mine',
    name: 'Abandoned Mine',
    subtitle: 'Lv. 2 - 3 Derelict Shafts',
    description:
      'A collapsed mining site where goblin scavengers, tunnel spiders, and ore mites haunt the old shafts.',
    icon: 'Mine',
    dangerLevel: 3,
    staminaCost: 8,
    encounterPool: [
      {
        encounterId: 'abandoned_mine_goblin',
        weight: 35,
      },
      {
        encounterId: 'abandoned_mine_spider',
        weight: 35,
      },
      {
        encounterId: 'abandoned_mine_ore_mite',
        weight: 30,
      },
    ],
    itemPool: [
      {
        itemId: 'coal',
        minQuantity: 1,
        maxQuantity: 2,
        weight: 35,
      },
      {
        itemId: 'copper_nugget',
        minQuantity: 1,
        maxQuantity: 1,
        weight: 25,
      },
      {
        itemId: 'rough_stone',
        minQuantity: 1,
        maxQuantity: 2,
        weight: 25,
      },
      {
        itemId: 'minor_hp_potion',
        minQuantity: 1,
        maxQuantity: 1,
        weight: 15,
      },
    ],
    outcomeWeights: [
      {
        outcomeType: 'encounter',
        weight: 45,
      },
      {
        outcomeType: 'bronze',
        weight: 15,
      },
      {
        outcomeType: 'item',
        weight: 10,
      },
      {
        outcomeType: 'nothing',
        weight: 30,
      },
    ],
    bronzeReward: {
      min: 2,
      max: 5,
    },
    entryLog: [
      'You descend toward the abandoned mine where the air smells of rust, dust, and old stone.',
      'Loose gravel shifts underfoot. Something skitters deeper in the dark.',
    ],
  },
];

export const EXPLORATION_ZONE_DEFINITIONS = Object.freeze(
  RAW_EXPLORATION_ZONE_DEFINITIONS.map((zone) =>
    freezeExplorationZoneDefinition(zone),
  ),
) satisfies readonly Readonly<ExplorationZoneDefinition>[];

export function getExplorationZoneDefinitionById(
  zoneId: ExplorationZoneId,
): Readonly<ExplorationZoneDefinition> {
  const zone = EXPLORATION_ZONE_DEFINITIONS.find((item) => item.id === zoneId);

  if (!zone) {
    throw new Error(`Exploration zone definition not found: ${zoneId}`);
  }

  return zone;
}
