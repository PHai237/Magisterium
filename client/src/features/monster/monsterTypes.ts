import type { DamageType } from '../character-creation/types';

export type MonsterId = 'training_dummy' | 'slime' | 'wolf';

export type MonsterRank = 'normal' | 'elite' | 'boss';

export interface MonsterStats {
    maxHp: number;
    attack: number;
    defense: number;
    actionSpeed: number;
    critRate: number;
}

export interface MonsterReward {
    exp: number;
    gold: number;
}

export interface MonsterDefinition {
    id: MonsterId;
    name: string;
    description: string;
    level: number;
    rank: MonsterRank;
    damageType: DamageType;
    stats: MonsterStats;
    reward: MonsterReward;
    tags: string[];
}

export interface MonsterBattleState {
    monsterId: MonsterId;
    name: string;
    level: number;
    rank: MonsterRank;
    currentHp: number;
    maxHp: number;
    attack: number;
    defense: number;
    actionSpeed: number;
    critRate: number;
    damageType: DamageType;
    reward: MonsterReward;
    tags: string[];
}
