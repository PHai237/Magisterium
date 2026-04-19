import type { MonsterId } from '../monster/monsterTypes';

export type DungeonId = 'training_ground' | 'forest_cave';

export type DungeonDifficulty = 'beginner' | 'normal' | 'hard';

export interface DungeonDefinition {
    id: DungeonId;
    name: string;
    description: string;
    recommendedLevel: number;
    difficulty: DungeonDifficulty;
    possibleMonsterIds: MonsterId[];
    entryCostGold: number;
    tags: string[];
}