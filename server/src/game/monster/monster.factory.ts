import { MONSTER_DEFINITIONS } from './monster.definitions';

import type {
  CreateMonsterBattleActorInput,
  MonsterDefinition,
  MonsterId,
} from './monster.types';

import { createBattleActorFromMonsterInput } from '../battle/factory/battle.factory';

import type { BattleActorState } from '../battle/battle.types';

import type { CurrentState, DerivedStats } from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

import type { ActiveStatusEffect } from '../battle/battle.types';

function assertUniqueMonsterDefinitions(
  monsterDefinitions: readonly Readonly<MonsterDefinition>[],
): void {
  const seenMonsterIds = new Set<MonsterId>();

  for (const monsterDefinition of monsterDefinitions) {
    if (seenMonsterIds.has(monsterDefinition.id)) {
      throw new Error(
        `Duplicate monster definition id: ${monsterDefinition.id}`,
      );
    }

    seenMonsterIds.add(monsterDefinition.id);
  }
}

assertUniqueMonsterDefinitions(MONSTER_DEFINITIONS);

const MONSTER_DEFINITION_BY_ID: ReadonlyMap<
  MonsterId,
  Readonly<MonsterDefinition>
> = new Map(
  MONSTER_DEFINITIONS.map((monsterDefinition) => [
    monsterDefinition.id,
    monsterDefinition,
  ]),
);

export function getMonsterDefinitionById(
  monsterId: MonsterId,
): MonsterDefinition {
  const monster = MONSTER_DEFINITION_BY_ID.get(monsterId);

  if (!monster) {
    throw new Error(`Monster definition not found: ${monsterId}`);
  }

  return monster;
}

export function calculateMonsterDerivedStats(
  monster: MonsterDefinition,
): DerivedStats {
  return {
    maxHp: monster.derivedStatOverrides?.maxHp ?? monster.baseStats.CON * 8,
    maxMp: monster.derivedStatOverrides?.maxMp ?? monster.baseStats.INT * 4,
    maxStamina:
      monster.derivedStatOverrides?.maxStamina ?? monster.baseStats.CON * 6,

    pAtk:
      monster.derivedStatOverrides?.pAtk ??
      monster.baseStats.STR * 2 + monster.baseStats.DEX,
    mAtk:
      monster.derivedStatOverrides?.mAtk ??
      monster.baseStats.INT * 2 + monster.baseStats.WIS,
    healingPotency:
      monster.derivedStatOverrides?.healingPotency ?? monster.baseStats.WIS * 2,

    pDef:
      monster.derivedStatOverrides?.pDef ??
      Math.floor(monster.baseStats.CON * 0.8),
    mDef:
      monster.derivedStatOverrides?.mDef ??
      Math.floor(monster.baseStats.WIS * 0.8),

    actionSpeed:
      monster.derivedStatOverrides?.actionSpeed ??
      Math.max(1, monster.baseStats.DEX + monster.baseStats.LUK),
    accuracy:
      monster.derivedStatOverrides?.accuracy ??
      Math.min(100, 70 + monster.baseStats.DEX),
    evasionRate:
      monster.derivedStatOverrides?.evasionRate ??
      Math.min(100, monster.baseStats.DEX),

    critRate:
      monster.derivedStatOverrides?.critRate ??
      Math.min(100, monster.baseStats.LUK),
    critDamageBonus:
      monster.derivedStatOverrides?.critDamageBonus ??
      Math.max(0, monster.baseStats.STR + monster.baseStats.LUK),

    fleeRate:
      monster.derivedStatOverrides?.fleeRate ??
      Math.min(100, monster.baseStats.DEX + monster.baseStats.LUK),

    statusResist:
      monster.derivedStatOverrides?.statusResist ??
      Math.min(100, monster.baseStats.CON + monster.baseStats.WIS),
    spiritualPotency:
      monster.derivedStatOverrides?.spiritualPotency ??
      Math.max(0, monster.baseStats.WIS),

    mpRegen:
      monster.derivedStatOverrides?.mpRegen ??
      Math.max(0, Math.floor(monster.baseStats.WIS / 2)),
    staminaRegen:
      monster.derivedStatOverrides?.staminaRegen ??
      Math.max(0, Math.floor(monster.baseStats.CON / 2)),

    secondChanceRate:
      monster.derivedStatOverrides?.secondChanceRate ??
      Math.min(100, Math.floor(monster.baseStats.LUK / 2)),
    procRate:
      monster.derivedStatOverrides?.procRate ??
      Math.min(100, monster.baseStats.LUK),
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

function buildMonsterCurrentState(
  monster: MonsterDefinition,
  input: Omit<CreateMonsterBattleActorInput, 'monsterId'>,
  derivedStats: DerivedStats,
): Partial<CurrentState> {
  return {
    hp:
      input.currentState?.hp ?? monster.currentState?.hp ?? derivedStats.maxHp,
    mp:
      input.currentState?.mp ?? monster.currentState?.mp ?? derivedStats.maxMp,
    stamina:
      input.currentState?.stamina ??
      monster.currentState?.stamina ??
      derivedStats.maxStamina,
  };
}

function createDeterministicMonsterInstanceId(
  monsterId: MonsterId,
  sequenceNumber: number,
): string {
  return `${monsterId}_${sequenceNumber}`;
}

function normalizeMonsterSequenceNumber(sequenceNumber: number): number {
  if (!Number.isFinite(sequenceNumber)) {
    return 1;
  }

  return Math.max(1, Math.floor(sequenceNumber));
}

export function createMonsterBattleActorFromDefinition(
  monster: MonsterDefinition,
  input: Omit<CreateMonsterBattleActorInput, 'monsterId'> = {},
  fallbackSequenceNumber = 1,
): BattleActorState {
  const derivedStats = calculateMonsterDerivedStats(monster);

  const actorId =
    input.instanceId ??
    createDeterministicMonsterInstanceId(
      monster.id,
      normalizeMonsterSequenceNumber(fallbackSequenceNumber),
    );

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

  return createMonsterBattleActorFromDefinition(monster, input, 1);
}

export function createMonsterBattleActors(
  inputs: CreateMonsterBattleActorInput[],
): BattleActorState[] {
  const monsterSequenceById = new Map<MonsterId, number>();

  return inputs.map((input) => {
    const nextSequenceNumber =
      (monsterSequenceById.get(input.monsterId) ?? 0) + 1;

    monsterSequenceById.set(input.monsterId, nextSequenceNumber);

    return createMonsterBattleActor({
      ...input,
      instanceId:
        input.instanceId ??
        createDeterministicMonsterInstanceId(
          input.monsterId,
          nextSequenceNumber,
        ),
    });
  });
}
