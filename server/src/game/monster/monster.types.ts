import type {
  BaseStats,
  CurrentState,
  DerivedStats,
  ItemId,
  ResistanceProfile,
} from '../character/character.types';

import type { ActiveStatusEffect } from '../battle/battle.types';

import type { StatModifier } from '../passive/passive.types';

export type MonsterId = 'slime' | 'goblin';

export type MonsterRank = 'normal' | 'elite' | 'boss';

export interface MonsterLootEntry {
  itemId: ItemId;
  chancePercent: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface MonsterRewardDefinition {
  exp: number;
  moneyBronze: number;
  lootTable: MonsterLootEntry[];
}

export interface MonsterDefinition {
  id: MonsterId;
  name: string;
  description: string;

  rank: MonsterRank;
  level: number;

  baseStats: BaseStats;
  derivedStatOverrides?: Partial<DerivedStats>;

  resistances: ResistanceProfile;

  currentState?: Partial<CurrentState>;
  shield?: number;

  reward: MonsterRewardDefinition;

  tags: string[];
}

export interface CreateMonsterBattleActorInput {
  monsterId: MonsterId;

  instanceId?: string;

  currentState?: Partial<CurrentState>;
  shield?: number;

  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];
}
