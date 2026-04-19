import type { MonsterDefinition } from "./monsterTypes";

export const MONSTERS: MonsterDefinition[] = [
    {
        id: 'training_dummy',
        name: 'Training Dummy',
        description: 'A stationary target used for practice. It does not attack or move.',
        level: 1,
        rank: 'normal',
        damageType: 'physical',
        stats: {
            maxHp: 100,
            attack: 0,
            defense: 0,
            actionSpeed: 0,
            critRate: 0,
        },
        reward: {
            exp: 0,
            gold: 0,
        },
        tags: ['beginner', 'innocent'],
    },
    {
        id: 'slime',
        name: 'Green Slime',
        description: 'A common low-level monster. It is weak but can be found in large numbers.',
        level: 1,
        rank: 'normal',
        damageType: 'physical',
        stats: {
            maxHp: 20,
            attack: 5,
            defense: 1,
            actionSpeed: 10,
            critRate: 3,
        },
        reward: {
            exp: 10,
            gold: 5,
        },
        tags: ['beginner', 'soft-body'],
    },
    {
        id: 'wolf',
        name: 'Forest Wolf',
        description: 'A wild predator that roams the forest. It is faster than it looks.',
        level: 3,
        rank: 'normal',
        damageType: 'physical',
        stats: {
            maxHp: 50,
            attack: 15,
            defense: 5,
            actionSpeed: 20,
            critRate: 5,
        },
        reward: {
            exp: 20,
            gold: 9,
        },
        tags: ['beginner', 'fast'],
    },
];