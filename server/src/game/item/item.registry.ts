import { ITEM_DEFINITIONS } from './item.definitions';

import type {
  ConsumableItemDefinition,
  EquipmentItemDefinition,
  ItemDefinition,
  ItemUseEffect,
} from './item.types';

import type { ItemId } from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

function cloneItemUseEffect(effect: Readonly<ItemUseEffect>): ItemUseEffect {
  return {
    ...effect,
  };
}

function cloneStatModifier(modifier: Readonly<StatModifier>): StatModifier {
  return {
    ...modifier,
    valueSource: modifier.valueSource
      ? {
          ...modifier.valueSource,
        }
      : undefined,
  };
}

function cloneEquipmentDefinition(
  equipment: Readonly<EquipmentItemDefinition>,
): EquipmentItemDefinition {
  return {
    ...equipment,
    modifiers: equipment.modifiers.map((modifier) =>
      cloneStatModifier(modifier),
    ),
  };
}

function cloneConsumableDefinition(
  consumable: Readonly<ConsumableItemDefinition>,
): ConsumableItemDefinition {
  return {
    ...consumable,
    effects: consumable.effects.map((effect) => cloneItemUseEffect(effect)),
  };
}

export function cloneItemDefinition(
  item: Readonly<ItemDefinition>,
): ItemDefinition {
  return {
    ...item,

    ...(item.equipment
      ? {
          equipment: cloneEquipmentDefinition(item.equipment),
        }
      : {}),

    ...(item.consumable
      ? {
          consumable: cloneConsumableDefinition(item.consumable),
        }
      : {}),

    tags: [...item.tags],
  };
}

export function getItemDefinitionById(itemId: ItemId): ItemDefinition {
  const item = ITEM_DEFINITIONS.find((definition) => definition.id === itemId);

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
  return ITEM_DEFINITIONS.some((definition) => definition.id === itemId);
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
