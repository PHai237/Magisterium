import type { DungeonDefinition } from "./dungeonTypes";

export const DUNGEONS: DungeonDefinition[] = [
    {
        id: 'slime_nest',
        name: 'Slime Nest',
        description:
            'A corrupted slime chamber where the Slime King rules over lesser slime creatures. This dungeon is designed as a boss-focused challenge rather than a farming route.',
        recommendedLevel: 2,
        difficulty: 'beginner',
        bossMonsterId: 'slime_king',
        entryCostGold: 0,
        tags: ['boss', 'slime', 'early-dungeon'],
    },
    {
        id: 'goblin_den',
        name: 'Goblin Den',
        description:
            'A hostile underground nest led by the Goblin Chief. It is an early boss dungeon meant for direct challenge, not regular mob farming.',
        recommendedLevel: 3,
        difficulty: 'normal',
        bossMonsterId: 'goblin_chief',
        entryCostGold: 10,
        tags: ['boss', 'goblin', 'danger'],
    },
];

export function getDungeonById(dungeonId: string): DungeonDefinition | null {
    return DUNGEONS.find((dungeon) => dungeon.id === dungeonId) ?? null;
}