import type { EncounterDefinition, EncounterId } from './encounter.types';

export const ENCOUNTER_IDS = [
  'slime_training',
  'goblin_scout',
  'forest_edge_mixed',
] as const satisfies readonly EncounterId[];

export const ENCOUNTER_DEFINITIONS: EncounterDefinition[] = [
  {
    id: 'slime_training',
    name: 'Slime Training',
    description:
      'A safe first combat encounter against a single slime. Used to validate early battle flow and beginner balance.',

    zoneId: 'training_ground',

    rank: 'normal',
    recommendedLevel: 1,

    monsterGroups: [
      {
        monsterId: 'slime',
        count: 1,
        instanceIdPrefix: 'training_slime',
      },
    ],

    tags: ['starter', 'tutorial', 'single-monster'],
  },
  {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    description:
      'A single goblin scout encounter. Faster and more dangerous than slime training, useful for testing monster initiative.',

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

    tags: ['starter', 'forest-edge', 'single-monster'],
  },
  {
    id: 'forest_edge_mixed',
    name: 'Forest Edge Mixed Pack',
    description:
      'A small mixed encounter containing slimes and a goblin. Used to test multi-monster turn order and target selection.',

    zoneId: 'forest_edge',

    rank: 'normal',
    recommendedLevel: 2,

    monsterGroups: [
      {
        monsterId: 'slime',
        count: 2,
        instanceIdPrefix: 'forest_slime',
      },
      {
        monsterId: 'goblin',
        count: 1,
        instanceIdPrefix: 'forest_goblin',
      },
    ],

    tags: ['starter', 'forest-edge', 'multi-monster'],
  },
];
