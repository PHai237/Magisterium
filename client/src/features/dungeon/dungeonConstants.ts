import type { DungeonDefinition } from "./dungeonTypes";

export const DUNGEONS: DungeonDefinition[] = [
    {
        id: 'training_ground',
        name: 'Training Ground',
        description: 'A safe area where adventurers can practice their skills and prepare for real dungeons. It is filled with training dummies and weak monsters.',
        recommendedLevel: 1,
        difficulty: 'beginner',
        possibleMonsterIds: ['training_dummy'],
        entryCostGold: 0,
        tags: ['beginner', 'safe_zone'],
    },
    {
        id: 'forest_cave',
        name: 'Forest Cave',
        description: 'A dark and damp cave located in the heart of the forest. It is home to various low-level monsters and serves as a good starting point for new adventurers.',
        recommendedLevel: 1,
        difficulty: 'normal',
        possibleMonsterIds: ['slime', 'wolf'],
        entryCostGold: 10,
        tags: ['beginner', 'nature', 'cave'],
    }
];

export function getDungeonById(dungeonId: string): DungeonDefinition | null {
    return DUNGEONS.find((dungeon) => dungeon.id === dungeonId) ?? null;
}