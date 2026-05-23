import { getConsumableItemDefinitionForUse } from '../../inventory/consumable.calculations';

import type { BattleActorState } from '../battle.types';

import type { ItemId, ResourceType } from '../../character/character.types';

import { updateExhaustionState } from '../calculations/battle.calculations';

export type BattleItemEffectTarget = ResourceType;

export interface BattleItemEffectApplication {
  effectType: string;
  target: BattleItemEffectTarget;

  previousValue: number;
  nextValue: number;
  amountApplied: number;
}

export interface BattleConsumableItemUseResult {
  itemId: ItemId;
  consumesOnUse: boolean;

  actorState: BattleActorState;
  effects: BattleItemEffectApplication[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeEffectAmount(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}

function getCurrentBattleActorResourceValue(
  actor: BattleActorState,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return actor.hp;

    case 'MP':
      return actor.mp;

    case 'Stamina':
      return actor.stamina;
  }
}

function getMaxBattleActorResourceValue(
  actor: BattleActorState,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return actor.derivedStats.maxHp;

    case 'MP':
      return actor.derivedStats.maxMp;

    case 'Stamina':
      return actor.derivedStats.maxStamina;
  }
}

function setCurrentBattleActorResourceValue(
  actor: BattleActorState,
  resourceType: ResourceType,
  value: number,
): BattleActorState {
  switch (resourceType) {
    case 'HP':
      return {
        ...actor,
        hp: value,
      };

    case 'MP':
      return {
        ...actor,
        mp: value,
      };

    case 'Stamina':
      return {
        ...actor,
        stamina: value,
      };
  }
}

function restoreBattleActorResource(
  actor: BattleActorState,
  resourceType: ResourceType,
  amount: number,
): {
  actorState: BattleActorState;
  effect: BattleItemEffectApplication;
} {
  const previousValue = getCurrentBattleActorResourceValue(actor, resourceType);
  const maxValue = getMaxBattleActorResourceValue(actor, resourceType);

  const nextValue = clamp(
    previousValue + normalizeEffectAmount(amount),
    0,
    maxValue,
  );

  return {
    actorState: setCurrentBattleActorResourceValue(
      actor,
      resourceType,
      nextValue,
    ),
    effect: {
      effectType: 'restore_resource',
      target: resourceType,
      previousValue,
      nextValue,
      amountApplied: nextValue - previousValue,
    },
  };
}

function damageBattleActorHp(
  actor: BattleActorState,
  amount: number,
): {
  actorState: BattleActorState;
  effect: BattleItemEffectApplication;
} {
  const previousValue = actor.hp;
  const nextValue = Math.max(0, previousValue - normalizeEffectAmount(amount));

  return {
    actorState: {
      ...actor,
      hp: nextValue,
    },
    effect: {
      effectType: 'damage',
      target: 'HP',
      previousValue,
      nextValue,
      amountApplied: previousValue - nextValue,
    },
  };
}

export function applyBattleConsumableItemEffectsToActor(
  actor: BattleActorState,
  itemId: ItemId,
): BattleConsumableItemUseResult {
  const item = getConsumableItemDefinitionForUse(itemId, 'battle');

  if (!item.consumable) {
    throw new Error(`Item ${itemId} is not consumable.`);
  }

  let nextActor = actor;
  const effects: BattleItemEffectApplication[] = [];

  for (const effect of item.consumable.effects) {
    if (effect.type === 'restore_resource') {
      const result = restoreBattleActorResource(
        nextActor,
        effect.resourceType,
        effect.amount,
      );

      nextActor = result.actorState;
      effects.push(result.effect);
      continue;
    }

    if (effect.type === 'damage') {
      const result = damageBattleActorHp(nextActor, effect.amount);

      nextActor = result.actorState;
      effects.push(result.effect);
      continue;
    }

    if (effect.type === 'rest') {
      throw new Error(`Rest effect is not supported inside battle: ${itemId}`);
    }
  }

  return {
    itemId,
    consumesOnUse: item.consumable.consumesOnUse,

    actorState: updateExhaustionState(nextActor),
    effects,
  };
}
