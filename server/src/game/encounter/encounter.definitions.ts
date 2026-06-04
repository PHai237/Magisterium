import type {
  EncounterDefinition,
  EncounterId,
  EncounterMonsterGroup,
} from './encounter.types';

export const ENCOUNTER_IDS = [
  'town_outskirts_slime',
  'town_outskirts_rabbit',
  'town_outskirts_hawk',
  'forest_edge_boar',
  'forest_edge_wolf',
  'forest_edge_bear',
  'abandoned_mine_goblin',
  'abandoned_mine_spider',
  'abandoned_mine_ore_mite',
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
    id: 'town_outskirts_rabbit',
    name: 'Town Outskirts Rabbit',
    description:
      'A quick beginner encounter against a horned rabbit in the grass outside town. It is fragile, but fast enough to test careless adventurers.',

    zoneId: 'town_outskirts',

    rank: 'normal',
    recommendedLevel: 1,

    monsterGroups: [
      {
        monsterId: 'horned_rabbit',
        count: 1,
        instanceIdPrefix: 'outskirts_rabbit',
      },
    ],

    tags: ['starter', 'town-outskirts', 'single-monster', 'rabbit'],
  },
  {
    id: 'town_outskirts_hawk',
    name: 'Town Outskirts Hawk',
    description:
      'A territorial razorwing hawk dives from the open sky near the outskirts. Useful for testing speed, evasion, and early pressure.',

    zoneId: 'town_outskirts',

    rank: 'normal',
    recommendedLevel: 1,

    monsterGroups: [
      {
        monsterId: 'razorwing_hawk',
        count: 1,
        instanceIdPrefix: 'outskirts_hawk',
      },
    ],

    tags: ['starter', 'town-outskirts', 'single-monster', 'hawk'],
  },
  {
    id: 'forest_edge_boar',
    name: 'Forest Edge Boar',
    description:
      'A territorial wild boar roots near the forest edge. Tougher than the grassland monsters and dangerous when it charges.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 1,

    monsterGroups: [
      {
        monsterId: 'wild_boar',
        count: 1,
        instanceIdPrefix: 'forest_boar',
      },
    ],

    tags: ['starter', 'forest-edge', 'single-monster', 'boar'],
  },
  {
    id: 'forest_edge_wolf',
    name: 'Forest Edge Wolf',
    description:
      'A lean wild wolf stalks the outer tree line. Faster and more accurate than most early beasts.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'wild_wolf',
        count: 1,
        instanceIdPrefix: 'forest_wolf',
      },
    ],

    tags: ['starter', 'forest-edge', 'single-monster', 'wolf'],
  },
  {
    id: 'forest_edge_bear',
    name: 'Forest Edge Bear',
    description:
      'A heavy forest bear blocks the deeper trail. It is the strongest early beast in the forest edge.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 3,

    monsterGroups: [
      {
        monsterId: 'bear',
        count: 1,
        instanceIdPrefix: 'forest_bear',
      },
    ],

    tags: ['starter', 'forest-edge', 'single-monster', 'bear'],
  },
  {
    id: 'abandoned_mine_goblin',
    name: 'Abandoned Mine Goblin',
    description:
      'A goblin scavenger prowls the abandoned mine tunnels, picking through rusted tools and broken carts.',

    zoneId: 'abandoned_mine',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'goblin',
        count: 1,
        instanceIdPrefix: 'mine_goblin',
      },
    ],

    tags: ['starter', 'abandoned-mine', 'single-monster', 'goblin'],
  },
  {
    id: 'abandoned_mine_spider',
    name: 'Abandoned Mine Spider',
    description:
      'A low tunnel spider nests between cracked support beams and old ore carts. Its silk and venom are useful early materials.',

    zoneId: 'abandoned_mine',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'spider',
        count: 1,
        instanceIdPrefix: 'mine_spider',
      },
    ],

    tags: ['starter', 'abandoned-mine', 'single-monster', 'spider'],
  },
  {
    id: 'abandoned_mine_ore_mite',
    name: 'Abandoned Mine Ore Mite',
    description:
      'A mineral-eating ore mite scrapes through the old mine floor, leaving coal dust and copper traces behind.',

    zoneId: 'abandoned_mine',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'ore_mite',
        count: 1,
        instanceIdPrefix: 'mine_ore_mite',
      },
    ],

    tags: ['starter', 'abandoned-mine', 'single-monster', 'ore-mite'],
  },
];

export const ENCOUNTER_DEFINITIONS = Object.freeze(
  RAW_ENCOUNTER_DEFINITIONS.map((encounter) =>
    freezeEncounterDefinition(encounter),
  ),
) satisfies readonly Readonly<EncounterDefinition>[];
