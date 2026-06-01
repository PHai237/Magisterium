import type {
  EncounterDefinition,
  EncounterId,
  EncounterMonsterGroup,
} from './encounter.types';

export const ENCOUNTER_IDS = [
  'town_outskirts_slime',
  'town_outskirts_boar',
  'town_outskirts_wolf',
  'town_outskirts_mixed',
  'goblin_scout',
  'forest_edge_spider',
  'forest_edge_mixed',
] as const satisfies readonly EncounterId[];

function freezeMonsterGroup(
  group: EncounterMonsterGroup,
): Readonly<EncounterMonsterGroup> {
  return Object.freeze({
    ...group,
  });
}

function freezeEncounterDefinition(
  encounter: EncounterDefinition,
): Readonly<EncounterDefinition> {
  return Object.freeze({
    ...encounter,
    monsterGroups: Object.freeze(
      encounter.monsterGroups.map((group) => freezeMonsterGroup(group)),
    ),
    tags: Object.freeze([...encounter.tags]),
  });
}

const RAW_ENCOUNTER_DEFINITIONS: readonly EncounterDefinition[] = [
  {
    id: 'town_outskirts_slime',
    name: 'Town Outskirts Slime',
    description:
      'A real beginner encounter against a slime outside town. Drops slime gel and validates the early combat loop without using dummy enemies.',

    zoneId: 'town_outskirts',

    rank: 'normal',
    recommendedLevel: 1,

    monsterGroups: [
      {
        monsterId: 'slime',
        count: 1,
        instanceIdPrefix: 'outskirts_slime',
      },
    ],

    tags: ['starter', 'town-outskirts', 'single-monster', 'slime'],
  },
  {
    id: 'town_outskirts_boar',
    name: 'Town Outskirts Boar',
    description:
      'A beginner encounter against a wild boar outside town. Slightly tougher than slime and drops boar meat.',

    zoneId: 'town_outskirts',

    rank: 'normal',
    recommendedLevel: 1,

    monsterGroups: [
      {
        monsterId: 'wild_boar',
        count: 1,
        instanceIdPrefix: 'outskirts_boar',
      },
    ],

    tags: ['starter', 'town-outskirts', 'single-monster', 'boar'],
  },
  {
    id: 'town_outskirts_wolf',
    name: 'Town Outskirts Wolf',
    description:
      'A faster beginner encounter against a wild wolf. Useful for testing evasion, accuracy, speed, and early danger pressure.',

    zoneId: 'town_outskirts',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'wild_wolf',
        count: 1,
        instanceIdPrefix: 'outskirts_wolf',
      },
    ],

    tags: ['starter', 'town-outskirts', 'single-monster', 'wolf'],
  },
  {
    id: 'town_outskirts_mixed',
    name: 'Town Outskirts Mixed Pack',
    description:
      'A small real encounter near town containing multiple beginner monsters. Used to test multi-monster turn order with real loot.',

    zoneId: 'town_outskirts',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'slime',
        count: 1,
        instanceIdPrefix: 'outskirts_pack_slime',
      },
      {
        monsterId: 'wild_boar',
        count: 1,
        instanceIdPrefix: 'outskirts_pack_boar',
      },
    ],

    tags: ['starter', 'town-outskirts', 'multi-monster', 'mixed'],
  },
  {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    description:
      'A single goblin scout encounter. Faster and more dangerous than town outskirts beasts, intended for forest-edge progression.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'goblin',
        count: 1,
        instanceIdPrefix: 'goblin_scout',
      },
    ],

    tags: ['starter', 'forest-edge', 'single-monster', 'goblin'],
  },
  {
    id: 'forest_edge_spider',
    name: 'Forest Edge Spider',
    description:
      'A single forest spider encounter. Useful for farming spider silk, eyes, and venom sacs for early crafting and alchemy.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'spider',
        count: 1,
        instanceIdPrefix: 'forest_spider',
      },
    ],

    tags: ['starter', 'forest-edge', 'single-monster', 'spider'],
  },
  {
    id: 'forest_edge_mixed',
    name: 'Forest Edge Mixed Pack',
    description:
      'A small mixed encounter containing forest-edge enemies. Used to test multi-monster pressure after the town outskirts loop is stable.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'wild_wolf',
        count: 1,
        instanceIdPrefix: 'forest_wolf',
      },
      {
        monsterId: 'goblin',
        count: 1,
        instanceIdPrefix: 'forest_goblin',
      },
    ],

    tags: ['starter', 'forest-edge', 'multi-monster', 'mixed'],
  },
];

export const ENCOUNTER_DEFINITIONS = Object.freeze(
  RAW_ENCOUNTER_DEFINITIONS.map((encounter) =>
    freezeEncounterDefinition(encounter),
  ),
) satisfies readonly Readonly<EncounterDefinition>[];
