import { ITEM_DEFINITIONS } from './item.definitions';

import type { ItemDefinition } from './item.types';

import type { ItemId } from '../character/character.types';

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clonePlainData<T>(value: T): T {
  const unknownValue: unknown = value;

  if (isUnknownArray(unknownValue)) {
    const clonedArray = unknownValue.map((entry) => clonePlainData(entry));

    return clonedArray as T;
  }

  if (isPlainObject(unknownValue)) {
    const clonedObject: Record<string, unknown> = {};

    for (const key of Object.keys(unknownValue)) {
      clonedObject[key] = clonePlainData(unknownValue[key]);
    }

    return clonedObject as T;
  }

  return value;
}

function assertUniqueItemDefinitions(
  itemDefinitions: readonly Readonly<ItemDefinition>[],
): void {
  const seenItemIds = new Set<ItemId>();

  for (const itemDefinition of itemDefinitions) {
    if (seenItemIds.has(itemDefinition.id)) {
      throw new Error(`Duplicate item definition id: ${itemDefinition.id}`);
    }

    seenItemIds.add(itemDefinition.id);
  }
}

function assertFiniteItemNumber(
  value: number,
  label: string,
  options: {
    min?: number;
    max?: number;
  } = {},
): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(`${label} must be at least ${options.min}.`);
  }

  if (options.max !== undefined && value > options.max) {
    throw new Error(`${label} must be at most ${options.max}.`);
  }
}

function assertValidItemDefinitionNumbers(
  itemDefinitions: readonly Readonly<ItemDefinition>[],
): void {
  for (const item of itemDefinitions) {
    assertFiniteItemNumber(item.maxStackSize, `${item.id}.maxStackSize`, {
      min: 1,
      max: 500,
    });

    assertFiniteItemNumber(item.sellPriceBronze, `${item.id}.sellPriceBronze`, {
      min: 0,
      max: 1_000_000,
    });

    if (item.equipment) {
      for (const modifier of item.equipment.modifiers) {
        assertFiniteItemNumber(
          modifier.value,
          `${item.id}.${modifier.id}.value`,
          {
            min: -1_000_000,
            max: 1_000_000,
          },
        );

        assertFiniteItemNumber(
          modifier.priority,
          `${item.id}.${modifier.id}.priority`,
          {
            min: -10_000,
            max: 10_000,
          },
        );

        if (
          modifier.valueSource?.type === 'stat_ratio' ||
          modifier.valueSource?.type === 'derived_stat_ratio'
        ) {
          assertFiniteItemNumber(
            modifier.valueSource.ratio,
            `${item.id}.${modifier.id}.valueSource.ratio`,
            {
              min: -100,
              max: 100,
            },
          );
        }
      }
    }

    if (item.consumable) {
      for (const effect of item.consumable.effects) {
        if (effect.type === 'restore_resource' || effect.type === 'damage') {
          assertFiniteItemNumber(
            effect.amount,
            `${item.id}.${effect.type}.amount`,
            {
              min: 0,
              max: 1_000_000,
            },
          );
        }

        if (effect.type === 'rest') {
          assertFiniteItemNumber(
            effect.hpPercent,
            `${item.id}.rest.hpPercent`,
            {
              min: 0,
              max: 1,
            },
          );

          assertFiniteItemNumber(
            effect.mpPercent,
            `${item.id}.rest.mpPercent`,
            {
              min: 0,
              max: 1,
            },
          );

          assertFiniteItemNumber(
            effect.staminaPercent,
            `${item.id}.rest.staminaPercent`,
            {
              min: 0,
              max: 1,
            },
          );

          assertFiniteItemNumber(
            effect.fatigueRecovery ?? 0,
            `${item.id}.rest.fatigueRecovery`,
            {
              min: 0,
              max: 1,
            },
          );
        }
      }
    }
  }
}

assertUniqueItemDefinitions(ITEM_DEFINITIONS);
assertValidItemDefinitionNumbers(ITEM_DEFINITIONS);

const ITEM_DEFINITION_BY_ID: ReadonlyMap<
  ItemId,
  Readonly<ItemDefinition>
> = new Map(
  ITEM_DEFINITIONS.map((itemDefinition) => [itemDefinition.id, itemDefinition]),
);

export function cloneItemDefinition(
  item: Readonly<ItemDefinition>,
): ItemDefinition {
  return clonePlainData(item);
}

export function getItemDefinitionById(itemId: ItemId): ItemDefinition {
  const item = ITEM_DEFINITION_BY_ID.get(itemId);

  if (!item) {
    throw new Error(`Item definition not found: ${itemId}`);
  }

  return cloneItemDefinition(item);
}

export function getItemDefinitionsByIds(
  itemIds: readonly ItemId[],
): ItemDefinition[] {
  return itemIds.map((itemId) => getItemDefinitionById(itemId));
}

export function hasItemDefinition(itemId: ItemId): boolean {
  return ITEM_DEFINITION_BY_ID.has(itemId);
}

export function assertItemDefinitionExists(itemId: ItemId): void {
  if (!hasItemDefinition(itemId)) {
    throw new Error(`Item definition not found: ${itemId}`);
  }
}

export function isEquipmentItem(itemId: ItemId): boolean {
  return Boolean(getItemDefinitionById(itemId).equipment);
}

export function isConsumableItem(itemId: ItemId): boolean {
  return Boolean(getItemDefinitionById(itemId).consumable);
}

export function isStackableItem(itemId: ItemId): boolean {
  return getItemDefinitionById(itemId).stackable;
}
