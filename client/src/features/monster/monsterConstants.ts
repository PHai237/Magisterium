import type { MonsterDefinition } from "./monsterTypes";

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
        gold: 5,
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
        gold: 6,
        },
        tags: ['beginner', 'fast'],
    },
    {
        id: 'lesser_goblin',
        name: 'Lesser Goblin',
        description: 'A low-ranked dungeon creature with slightly better combat instincts.',
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
        gold: 9,
        },
        tags: ['beginner', 'humanoid'],
    },
    {
        id: 'slime_king',
        name: 'Slime King',
        description: 'A swollen ruler of lesser slimes with a heavy body and surprising durability.',
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
            gold: 20,
        },
        tags: ['boss', 'slime', 'crown'],
    },
    {
        id: 'goblin_chief',
        name: 'Goblin Chief',
        description: 'A brutal leader of goblins who commands lesser creatures through force and instinct.',
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
            gold: 32,
        },
        tags: ['boss', 'goblin', 'leader'],
    },
];

export function getMonsterById(monsterId: string) {
  return MONSTERS.find((monster) => monster.id === monsterId) ?? null;
}