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

const RAW_EXPLORATION_ZONE_DEFINITIONS: readonly ExplorationZoneDefinition[] = [
  {
    id: 'town_outskirts',
    name: 'Town Outskirts',
    subtitle: 'Lv. 1 - 2 Wildlands',
    description:
      'Open grassland outside the stronghold where slimes, wild boars, and wolves roam. Searching here can trigger real low-level encounters.',
    icon: '🌾',
    dangerLevel: 1,
    staminaCost: 5,
    encounterPool: [
      {
        encounterId: 'town_outskirts_slime',
        weight: 38,
      },
      {
        encounterId: 'town_outskirts_boar',
        weight: 30,
      },
      {
        encounterId: 'town_outskirts_wolf',
        weight: 22,
      },
      {
        encounterId: 'town_outskirts_mixed',
        weight: 10,
      },
    ],
    itemPool: [
      {
        itemId: 'slime_gel',
        minQuantity: 1,
        maxQuantity: 1,
        weight: 100,
      },
    ],
    outcomeWeights: [
      {
        outcomeType: 'encounter',
        weight: 45,
      },
      {
        outcomeType: 'bronze',
        weight: 25,
      },
      {
        outcomeType: 'nothing',
        weight: 20,
      },
      {
        outcomeType: 'item',
        weight: 10,
      },
    ],
    bronzeReward: {
      min: 3,
      max: 9,
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
      'The first line of the forest beyond the safe roads. Wolves and goblin scouts are more common here.',
    icon: '🌲',
    dangerLevel: 2,
    staminaCost: 7,
    encounterPool: [
      {
        encounterId: 'goblin_scout',
        weight: 55,
      },
      {
        encounterId: 'forest_edge_mixed',
        weight: 45,
      },
    ],
    itemPool: [
      {
        itemId: 'wolf_skin',
        minQuantity: 1,
        maxQuantity: 1,
        weight: 100,
      },
    ],
    outcomeWeights: [
      {
        outcomeType: 'encounter',
        weight: 55,
      },
      {
        outcomeType: 'bronze',
        weight: 15,
      },
      {
        outcomeType: 'nothing',
        weight: 20,
      },
      {
        outcomeType: 'item',
        weight: 10,
      },
    ],
    bronzeReward: {
      min: 4,
      max: 12,
    },
    entryLog: [
      'You approach the forest edge. The canopy muffles the sound of the road behind you.',
      'Broken branches and claw marks suggest that this area is no longer safe.',
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
