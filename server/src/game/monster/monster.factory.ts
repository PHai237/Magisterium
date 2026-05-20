import { randomUUID } from 'crypto';

import { MONSTER_DEFINITIONS } from './monster.definitions';

import type {
  CreateMonsterBattleActorInput,
  MonsterDefinition,
  MonsterId,
} from './monster.types';

import { calculateDerivedStats } from '../character/character.calculations';

import { createBattleActorFromMonsterInput } from '../battle/factory/battle.factory';

import type { BattleActorState } from '../battle/battle.types';

import type { DerivedStats } from '../character/character.types';

export function getMonsterDefinitionById(
  monsterId: MonsterId,
): MonsterDefinition {
  const monster = MONSTER_DEFINITIONS.find(
    (definition) => definition.id === monsterId,
  );

  if (!monster) {
    throw new Error(`Monster definition not found: ${monsterId}`);
  }

  return monster;
}

export function calculateMonsterDerivedStats(
  monster: MonsterDefinition,
): DerivedStats {
  return {
    ...calculateDerivedStats(monster.baseStats),
    ...monster.derivedStatOverrides,
  };
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

    baseStats: monster.baseStats,
    derivedStats,

    resistances: monster.resistances,

    currentState: {
      ...monster.currentState,
      ...input.currentState,
    },

    shield: input.shield ?? monster.shield ?? 0,

    activeStatusEffects: input.activeStatusEffects ?? [],
    activeModifiers: input.activeModifiers ?? [],
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
