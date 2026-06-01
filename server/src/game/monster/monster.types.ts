import type {
  BaseStats,
  CurrentState,
  DerivedStats,
  ItemId,
  ResistanceProfile,
} from '../character/character.types';

import type { ActiveStatusEffect } from '../battle/battle.types';

import type { StatModifier } from '../passive/passive.types';

export type MonsterId =
  | 'slime'
  | 'wild_boar'
  | 'wild_wolf'
  | 'goblin'
  | 'spider';

export type MonsterRank = 'normal' | 'elite' | 'boss';

export type MonsterAiTargetingMode = 'random' | 'lowest_hp' | 'highest_threat';

export interface MonsterLootEntry {
  itemId: ItemId;
  chancePercent: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface MonsterRandomLootPoolEntry {
  itemId: ItemId;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface MonsterRandomLootPool {
  id: string;
  chancePercent: number;
  rollCount?: number;
  entries: readonly MonsterRandomLootPoolEntry[];
}

export interface MonsterRewardDefinition {
  exp: number;
  moneyBronze: number;
  lootTable: readonly MonsterLootEntry[];
  randomLootPools?: readonly MonsterRandomLootPool[];
}

export interface MonsterBasicAttackDamageRange {
  min: number;
  max: number;
}

export interface MonsterDefinition {
  id: MonsterId;
  name: string;
  description: string;

  rank: MonsterRank;
  level: number;

  aiTargetingMode: MonsterAiTargetingMode;

  baseStats: BaseStats;
  derivedStatOverrides?: Partial<DerivedStats>;

  resistances: ResistanceProfile;

  currentState?: Partial<CurrentState>;
  shield?: number;

  basicAttackDamageRange?: MonsterBasicAttackDamageRange;

  reward: MonsterRewardDefinition;

  tags: readonly string[];
}

export interface CreateMonsterBattleActorInput {
  monsterId: MonsterId;

  instanceId?: string;

  currentState?: Partial<CurrentState>;
  shield?: number;

  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];
}
