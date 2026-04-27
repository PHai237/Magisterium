import type { MonsterDefinition } from './monsterTypes';

export const MONSTERS: MonsterDefinition[] = [
  {
    id: 'green_slime',
    name: 'Green Slime',
    description: 'A weak slime often used by beginners to learn basic combat.',
    level: 1,
    rank: 'normal',
    damageType: 'physical',
    stats: {
      maxHp: 35,
      attack: 7,
      defense: 2,
      actionSpeed: 92,
      critRate: 1,
    },
    reward: {
      exp: 12,
      bronze: 3,
    },
    tags: ['beginner', 'soft-body'],
  },
  {
    id: 'wild_rat',
    name: 'Wild Rat',
    description: 'A small but quick creature that relies on speed over power.',
    level: 1,
    rank: 'normal',
    damageType: 'physical',
    stats: {
      maxHp: 28,
      attack: 8,
      defense: 1,
      actionSpeed: 108,
      critRate: 3,
    },
    reward: {
      exp: 14,
      bronze: 5,
    },
    tags: ['beginner', 'fast'],
  },
  {
    id: 'lesser_goblin',
    name: 'Lesser Goblin',
    description:
      'A low-ranked dungeon creature with slightly better combat instincts.',
    level: 2,
    rank: 'normal',
    damageType: 'physical',
    stats: {
      maxHp: 48,
      attack: 10,
      defense: 4,
      actionSpeed: 98,
      critRate: 2,
    },
    reward: {
      exp: 20,
      bronze: 9,
    },
    tags: ['beginner', 'humanoid'],
  },
  {
    id: 'slime_king',
    name: 'Slime King',
    description:
      'A swollen ruler of lesser slimes with a heavy body and surprising durability.',
    level: 3,
    rank: 'boss',
    damageType: 'physical',
    stats: {
      maxHp: 110,
      attack: 14,
      defense: 6,
      actionSpeed: 88,
      critRate: 3,
    },
    reward: {
      exp: 45,
      bronze: 20,
    },
    tags: ['boss', 'slime', 'crown'],
  },
  {
    id: 'goblin_chief',
    name: 'Goblin Chief',
    description:
      'A brutal leader of goblins who commands lesser creatures through force and instinct.',
    level: 4,
    rank: 'boss',
    damageType: 'physical',
    stats: {
      maxHp: 135,
      attack: 18,
      defense: 8,
      actionSpeed: 102,
      critRate: 5,
    },
    reward: {
      exp: 65,
      bronze: 32,
    },
    tags: ['boss', 'goblin', 'leader'],
  },
  {
    id: 'bandit_scout',
    name: 'Bandit Scout',
    description:
      'A lightly armed road bandit who watches travelers and strikes when the path is quiet.',
    level: 2,
    rank: 'normal',
    damageType: 'physical',
    stats: {
      maxHp: 55,
      attack: 11,
      defense: 3,
      actionSpeed: 106,
      critRate: 4,
    },
    reward: {
      exp: 22,
      bronze: 14,
    },
    tags: ['road-event', 'bandit', 'humanoid'],
  },
  {
    id: 'mutated_slime',
    name: 'Mutated Slime',
    description:
      'A strange slime changed by unknown energy. Its body pulses with unstable power.',
    level: 3,
    rank: 'elite',
    damageType: 'physical',
    stats: {
      maxHp: 82,
      attack: 13,
      defense: 5,
      actionSpeed: 95,
      critRate: 3,
    },
    reward: {
      exp: 36,
      bronze: 18,
    },
    tags: ['road-event', 'mutated', 'slime', 'rare'],
  },
];

export function getMonsterById(monsterId: string) {
  return MONSTERS.find((monster) => monster.id === monsterId) ?? null;
}