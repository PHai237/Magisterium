import { randomUUID } from 'crypto';

import { MONSTER_DEFINITIONS } from './monster.definitions';

import type {
  CreateMonsterBattleActorInput,
  MonsterDefinition,
  MonsterId,
} from './monster.types';

import { MIN_ACTION_SPEED } from '../battle/battle.constants';

import { calculateDerivedStats } from '../character/character.calculations';

import { createBattleActorFromMonsterInput } from '../battle/factory/battle.factory';

import type { BattleActorState } from '../battle/battle.types';

import type { CurrentState, DerivedStats } from '../character/character.types';

import type { ActiveStatusEffect } from '../battle/battle.types';

import type { StatModifier } from '../passive/passive.types';

function toSafeNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampResource(
  value: number | undefined,
  fallback: number,
  maxValue: number,
): number {
  const safeValue = Math.floor(toSafeNumber(value, fallback));
  const safeMaxValue = Math.max(0, Math.floor(toSafeNumber(maxValue, 0)));

  return clamp(safeValue, 0, safeMaxValue);
}

function clampPercent(value: number, fallback = 0): number {
  return clamp(toSafeNumber(value, fallback), 0, 100);
}

function normalizeNonNegativeNumber(value: number, fallback = 0): number {
  return Math.max(0, toSafeNumber(value, fallback));
}

function normalizeMonsterDerivedStats(stats: DerivedStats): DerivedStats {
  return {
    maxHp: normalizeNonNegativeNumber(stats.maxHp),
    maxMp: normalizeNonNegativeNumber(stats.maxMp),
    maxStamina: normalizeNonNegativeNumber(stats.maxStamina),

    pAtk: normalizeNonNegativeNumber(stats.pAtk),
    mAtk: normalizeNonNegativeNumber(stats.mAtk),
    healingPotency: normalizeNonNegativeNumber(stats.healingPotency),

    pDef: normalizeNonNegativeNumber(stats.pDef),
    mDef: normalizeNonNegativeNumber(stats.mDef),

    actionSpeed: Math.max(
      MIN_ACTION_SPEED,
      normalizeNonNegativeNumber(stats.actionSpeed, MIN_ACTION_SPEED),
    ),

    accuracy: clampPercent(stats.accuracy, 75),
    evasionRate: clampPercent(stats.evasionRate),

    critRate: clampPercent(stats.critRate),
    critDamageBonus: normalizeNonNegativeNumber(stats.critDamageBonus, 50),

    fleeRate: clampPercent(stats.fleeRate),

    statusResist: clampPercent(stats.statusResist),
    spiritualPotency: normalizeNonNegativeNumber(stats.spiritualPotency),

    mpRegen: normalizeNonNegativeNumber(stats.mpRegen),
    staminaRegen: normalizeNonNegativeNumber(stats.staminaRegen),

    secondChanceRate: clampPercent(stats.secondChanceRate),
    procRate: clampPercent(stats.procRate),
  };
}

function buildMonsterCurrentState(
  monster: MonsterDefinition,
  input: Omit<CreateMonsterBattleActorInput, 'monsterId'>,
  derivedStats: DerivedStats,
): Partial<CurrentState> {
  const currentState = {
    ...monster.currentState,
    ...input.currentState,
  };

  return {
    hp: clampResource(currentState.hp, derivedStats.maxHp, derivedStats.maxHp),
    mp: clampResource(currentState.mp, derivedStats.maxMp, derivedStats.maxMp),
    stamina: clampResource(
      currentState.stamina,
      derivedStats.maxStamina,
      derivedStats.maxStamina,
    ),
  };
}

function cloneActiveStatusEffects(
  effects?: ActiveStatusEffect[],
): ActiveStatusEffect[] {
  return effects
    ? effects.map((effect) => ({
        ...effect,
        modifiers: effect.modifiers.map((modifier) => ({
          ...modifier,
        })),
      }))
    : [];
}

function cloneStatModifiers(modifiers?: StatModifier[]): StatModifier[] {
  return modifiers
    ? modifiers.map((modifier) => ({
        ...modifier,
      }))
    : [];
}

export function getMonsterDefinitionById(
  monsterId: MonsterId,
): MonsterDefinition {
  const monster = MONSTER_DEFINITIONS.find(
    (definition) => definition.id === monsterId,
  );

  if (!monster) {
    throw new Error(`Monster definition not found: ${monsterId}`);
  }

  return {
    ...monster,
    baseStats: {
      ...monster.baseStats,
    },
    derivedStatOverrides: {
      ...monster.derivedStatOverrides,
    },
    resistances: {
      ...monster.resistances,
    },
    currentState: {
      ...monster.currentState,
    },
    reward: {
      ...monster.reward,
      lootTable: monster.reward.lootTable.map((entry) => ({
        ...entry,
      })),
    },
    tags: [...monster.tags],
  };
}

export function calculateMonsterDerivedStats(
  monster: MonsterDefinition,
): DerivedStats {
  return normalizeMonsterDerivedStats({
    ...calculateDerivedStats(monster.baseStats),
    ...monster.derivedStatOverrides,
  });
}

export function createMonsterBattleActorFromDefinition(
  monster: MonsterDefinition,
  input: Omit<CreateMonsterBattleActorInput, 'monsterId'> = {},
): BattleActorState {
  const derivedStats = calculateMonsterDerivedStats(monster);
  const actorId = input.instanceId ?? `${monster.id}_${randomUUID()}`;

  return createBattleActorFromMonsterInput({
    actorId,
    monsterId: monster.id,
    aiTargetingMode: monster.aiTargetingMode,

    baseStats: {
      ...monster.baseStats,
    },
    derivedStats,

    resistances: {
      ...monster.resistances,
    },

    currentState: buildMonsterCurrentState(monster, input, derivedStats),

    shield: input.shield ?? monster.shield ?? 0,

    activeStatusEffects: cloneActiveStatusEffects(input.activeStatusEffects),
    activeModifiers: cloneStatModifiers(input.activeModifiers),
  });
}

export function createMonsterBattleActor(
  input: CreateMonsterBattleActorInput,
): BattleActorState {
  const monster = getMonsterDefinitionById(input.monsterId);

  return createMonsterBattleActorFromDefinition(monster, input);
}

export function createMonsterBattleActors(
  inputs: CreateMonsterBattleActorInput[],
): BattleActorState[] {
  return inputs.map((input) => createMonsterBattleActor(input));
}
