import type { ZoneDefinition } from './zoneTypes';

export const ZONES: ZoneDefinition[] = [
  {
    id: 'forest_edge',
    name: 'Forest Edge',
    description:
      'A beginner-friendly outer woodland where adventurers hunt weak creatures and test their basic combat rhythm.',
    recommendedLevel: 1,
    difficulty: 'safe',
    encounterDensity: 'normal',
    possibleMonsterIds: ['green_slime', 'wild_rat'],
    tags: ['beginner', 'farming', 'forest'],
  },
  {
    id: 'deep_forest',
    name: 'Deep Forest',
    description:
      'A thicker and darker hunting ground with more frequent encounters and stronger resistance from monsters.',
    recommendedLevel: 2,
    difficulty: 'normal',
    encounterDensity: 'high',
    possibleMonsterIds: ['wild_rat', 'lesser_goblin'],
    tags: ['farming', 'forest', 'dense'],
  },
  {
    id: 'ruined_path',
    name: 'Ruined Path',
    description:
      'A broken road once used by merchants, now haunted by hostile creatures and future event possibilities.',
    recommendedLevel: 2,
    difficulty: 'dangerous',
    encounterDensity: 'low',
    possibleMonsterIds: ['lesser_goblin'],
    tags: ['road', 'danger', 'future-events'],
  },
];