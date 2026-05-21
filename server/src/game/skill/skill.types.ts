import type {
  DamageType,
  ElementType,
  SkillId,
  StatKey,
} from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

import type { StatusEffectType } from '../status/status.types';

export type SkillFamily =
  | 'weapon'
  | 'martial'
  | 'arcane'
  | 'divine'
  | 'shadow'
  | 'rune'
  | 'survival';

export type ActionType =
  | 'basic_attack'
  | 'physical_skill'
  | 'finesse_skill'
  | 'guard_skill'
  | 'magical_spell'
  | 'support_spell'
  | 'curse_spell'
  | 'trick_skill';

export const ACTION_TYPE_STAT_EXP_TARGET: Record<ActionType, StatKey> = {
  basic_attack: 'STR',
  physical_skill: 'STR',
  finesse_skill: 'DEX',
  guard_skill: 'CON',
  magical_spell: 'INT',
  support_spell: 'WIS',
  curse_spell: 'WIS',
  trick_skill: 'LUK',
};

export type ActionCategory =
  | 'offensive'
  | 'defensive'
  | 'support'
  | 'control'
  | 'utility';

export type SkillTargetType =
  | 'enemy_single'
  | 'enemy_all'
  | 'self'
  | 'ally_single'
  | 'ally_all';

export type SkillRuneSlotType =
  | 'power'
  | 'element'
  | 'utility'
  | 'control'
  | 'support';

export type SkillEffectType =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'status_effect'
  | 'resource_restore'
  | 'cleanse';

export type SkillScalingMode = 'flat' | 'single_stat' | 'dual_stat';

export interface SkillCost {
  hpCost?: number;
  mpCost: number;
  staminaCost: number;
}

export interface SkillScaling {
  mode: SkillScalingMode;

  primaryStat?: StatKey;
  primaryMultiplier?: number;

  secondaryStat?: StatKey;
  secondaryMultiplier?: number;
}

export interface SkillEffect {
  id: string;

  type: SkillEffectType;
  targetType: SkillTargetType;

  damageType?: DamageType;
  elementType?: ElementType;

  baseValue: number;
  scaling?: SkillScaling;

  modifiers?: readonly StatModifier[];

  statusEffectType?: StatusEffectType;
  durationTurns?: number;
  chance?: number;

  tags: readonly string[];
}

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;

  family: SkillFamily;
  actionType: ActionType;
  actionCategory: ActionCategory;
  targetType: SkillTargetType;

  cost: SkillCost;

  effects: readonly SkillEffect[];

  runeCapacity: number;
  runeSlots: readonly SkillRuneSlotType[];
  attachedRuneIds: readonly string[];

  cooldownTurns?: number;

  tags: readonly string[];
}
