import { getItemDefinitionById } from '../item/item.registry';

import type {
  Character,
  DerivedStats,
  ItemId,
  ResourceType,
} from '../character/character.types';

import type { ItemDefinition } from '../item/item.types';

export type ItemUseContext = 'battle' | 'out_of_battle';

export type ConsumableEffectTarget = ResourceType | 'Fatigue';

export interface ConsumableEffectApplication {
  effectType: string;
  target: ConsumableEffectTarget;

  previousValue: number;
  nextValue: number;
  amountApplied: number;
}

export interface ConsumableItemUseResult {
  itemId: ItemId;
  consumesOnUse: boolean;

  character: Character;
  effects: ConsumableEffectApplication[];
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

function shouldRecordConsumableEffect(
  effect: ConsumableEffectApplication,
): boolean {
  return effect.amountApplied > 0;
}

function pushConsumableEffectIfMeaningful(
  effects: ConsumableEffectApplication[],
  effect: ConsumableEffectApplication,
): void {
  if (shouldRecordConsumableEffect(effect)) {
    effects.push(effect);
  }
}

function getCurrentResourceValue(
  character: Character,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return character.currentState.hp;

    case 'MP':
      return character.currentState.mp;

    case 'Stamina':
      return character.currentState.stamina;
  }
}

function getMaxResourceValue(
  derivedStats: DerivedStats,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return derivedStats.maxHp;

    case 'MP':
      return derivedStats.maxMp;

    case 'Stamina':
      return derivedStats.maxStamina;
  }
}

function setCurrentResourceValue(
  character: Character,
  resourceType: ResourceType,
  value: number,
): Character {
  switch (resourceType) {
    case 'HP':
      return {
        ...character,
        currentState: {
          ...character.currentState,
          hp: value,
        },
      };

    case 'MP':
      return {
        ...character,
        currentState: {
          ...character.currentState,
          mp: value,
        },
      };

    case 'Stamina':
      return {
        ...character,
        currentState: {
          ...character.currentState,
          stamina: value,
        },
      };
  }
}

function restoreResource(
  character: Character,
  derivedStats: DerivedStats,
  resourceType: ResourceType,
  amount: number,
): {
  character: Character;
  effect: ConsumableEffectApplication;
} {
  const previousValue = getCurrentResourceValue(character, resourceType);
  const maxValue = getMaxResourceValue(derivedStats, resourceType);

  const nextValue = clamp(
    previousValue + normalizeEffectAmount(amount),
    0,
    maxValue,
  );

  return {
    character: setCurrentResourceValue(character, resourceType, nextValue),
    effect: {
      effectType: 'restore_resource',
      target: resourceType,
      previousValue,
      nextValue,
      amountApplied: nextValue - previousValue,
    },
  };
}

function damageHp(
  character: Character,
  amount: number,
): {
  character: Character;
  effect: ConsumableEffectApplication;
} {
  const previousValue = character.currentState.hp;
  const nextValue = Math.max(0, previousValue - normalizeEffectAmount(amount));

  return {
    character: {
      ...character,
      currentState: {
        ...character.currentState,
        hp: nextValue,
      },
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

function recoverFatigue(
  character: Character,
  amount: number,
): {
  character: Character;
  effect: ConsumableEffectApplication;
} {
  const previousValue = character.fatigue;
  const nextValue = Math.max(0, previousValue - Math.max(0, amount));

  return {
    character: {
      ...character,
      fatigue: nextValue,
    },
    effect: {
      effectType: 'rest',
      target: 'Fatigue',
      previousValue,
      nextValue,
      amountApplied: previousValue - nextValue,
    },
  };
}

export function getConsumableItemDefinitionForUse(
  itemId: ItemId,
  context: ItemUseContext,
): ItemDefinition {
  const item = getItemDefinitionById(itemId);

  if (!item.consumable) {
    throw new Error(`Item ${itemId} is not consumable.`);
  }

  if (context === 'battle' && !item.consumable.usableInBattle) {
    throw new Error(`Item ${itemId} cannot be used in battle.`);
  }

  if (context === 'out_of_battle' && !item.consumable.usableOutOfBattle) {
    throw new Error(`Item ${itemId} cannot be used outside battle.`);
  }

  return item;
}

export function applyConsumableItemEffectsToCharacter(
  character: Character,
  derivedStats: DerivedStats,
  itemId: ItemId,
  context: ItemUseContext,
): ConsumableItemUseResult {
  const item = getConsumableItemDefinitionForUse(itemId, context);

  if (!item.consumable) {
    throw new Error(`Item ${itemId} is not consumable.`);
  }

  let nextCharacter = character;
  const effects: ConsumableEffectApplication[] = [];

  for (const effect of item.consumable.effects) {
    if (effect.type === 'restore_resource') {
      const result = restoreResource(
        nextCharacter,
        derivedStats,
        effect.resourceType,
        effect.amount,
      );

      nextCharacter = result.character;
      pushConsumableEffectIfMeaningful(effects, result.effect);
      continue;
    }

    if (effect.type === 'damage') {
      const result = damageHp(nextCharacter, effect.amount);

      nextCharacter = result.character;
      pushConsumableEffectIfMeaningful(effects, result.effect);
      continue;
    }

    if (effect.type === 'rest') {
      const hpResult = restoreResource(
        nextCharacter,
        derivedStats,
        'HP',
        derivedStats.maxHp * effect.hpPercent,
      );

      nextCharacter = hpResult.character;
      pushConsumableEffectIfMeaningful(effects, {
        ...hpResult.effect,
        effectType: 'rest',
      });

      const mpResult = restoreResource(
        nextCharacter,
        derivedStats,
        'MP',
        derivedStats.maxMp * effect.mpPercent,
      );

      nextCharacter = mpResult.character;
      pushConsumableEffectIfMeaningful(effects, {
        ...mpResult.effect,
        effectType: 'rest',
      });

      const staminaResult = restoreResource(
        nextCharacter,
        derivedStats,
        'Stamina',
        derivedStats.maxStamina * effect.staminaPercent,
      );

      nextCharacter = staminaResult.character;
      pushConsumableEffectIfMeaningful(effects, {
        ...staminaResult.effect,
        effectType: 'rest',
      });

      const fatigueResult = recoverFatigue(
        nextCharacter,
        effect.fatigueRecovery ?? 0,
      );

      nextCharacter = fatigueResult.character;
      pushConsumableEffectIfMeaningful(effects, fatigueResult.effect);
    }
  }

  return {
    itemId,
    consumesOnUse: item.consumable.consumesOnUse,

    character: nextCharacter,
    effects,
  };
}
