import type { MonsterId } from '../monster/monsterTypes';

export type DungeonId = 'slime_nest' | 'goblin_den';

export type DungeonDifficulty = 'beginner' | 'normal' | 'hard';

export interface DungeonDefinition {
    id: DungeonId;
    name: string;
    description: string;
    recommendedLevel: number;
    difficulty: DungeonDifficulty;
    bossMonsterId: MonsterId;
    entryCostGold: number;
    tags: string[];
}