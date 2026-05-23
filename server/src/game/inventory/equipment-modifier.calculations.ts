import { getItemDefinitionById } from '../item/item.registry';

import type { ItemId } from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

export function collectEquipmentStatModifiers(
  equippedItemIds: readonly ItemId[],
): StatModifier[] {
  return equippedItemIds.flatMap((itemId) => {
    const item = getItemDefinitionById(itemId);

    if (!item.equipment) {
      return [];
    }

    return item.equipment.modifiers.map((modifier) => ({
      ...modifier,
      valueSource: modifier.valueSource
        ? {
            ...modifier.valueSource,
          }
        : undefined,
    }));
  });
}

export function hasEquipmentStatModifiers(
  equippedItemIds: readonly ItemId[],
): boolean {
  return collectEquipmentStatModifiers(equippedItemIds).length > 0;
}
