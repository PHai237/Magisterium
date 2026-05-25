import { getItemDefinitionById } from '../item/item.registry';

import type { ItemId } from '../character/character.types';

import type { EquipmentSlot } from '../item/item.types';

export interface EquipmentSlotConflict {
  itemId: ItemId;
  slot: EquipmentSlot;
}

export interface EquipItemResult {
  equippedItemIds: ItemId[];
  removedItemIds: ItemId[];
}

export interface UnequipItemResult {
  equippedItemIds: ItemId[];
  removedItemIds: ItemId[];
}

export function getEquipmentSlotForItem(itemId: ItemId): EquipmentSlot {
  const item = getItemDefinitionById(itemId);

  if (!item.equipment) {
    throw new Error(`Item ${itemId} is not equipment.`);
  }

  return item.equipment.slot;
}

export function assertItemIsEquipment(itemId: ItemId): void {
  getEquipmentSlotForItem(itemId);
}

export function isItemEquipped(
  equippedItemIds: readonly ItemId[],
  itemId: ItemId,
): boolean {
  return equippedItemIds.includes(itemId);
}

export function findEquipmentSlotConflicts(
  equippedItemIds: readonly ItemId[],
  itemId: ItemId,
): EquipmentSlotConflict[] {
  const targetSlot = getEquipmentSlotForItem(itemId);
  const targetItem = getItemDefinitionById(itemId);

  return equippedItemIds
    .filter((equippedItemId) => equippedItemId !== itemId)
    .filter((equippedItemId) => {
      const equippedItem = getItemDefinitionById(equippedItemId);

      if (!equippedItem.equipment) {
        return false;
      }

      if (equippedItem.equipment.slot === targetSlot) {
        return true;
      }

      if (
        targetItem.equipment?.twoHanded &&
        equippedItem.equipment.slot === 'off_hand'
      ) {
        return true;
      }

      if (
        targetSlot === 'off_hand' &&
        equippedItem.equipment.twoHanded === true
      ) {
        return true;
      }

      return false;
    })
    .map((equippedItemId) => ({
      itemId: equippedItemId,
      slot: getEquipmentSlotForItem(equippedItemId),
    }));
}

export function equipItem(
  equippedItemIds: readonly ItemId[],
  itemId: ItemId,
): EquipItemResult {
  assertItemIsEquipment(itemId);

  if (isItemEquipped(equippedItemIds, itemId)) {
    return {
      equippedItemIds: [...equippedItemIds],
      removedItemIds: [],
    };
  }

  const conflicts = findEquipmentSlotConflicts(equippedItemIds, itemId);
  const conflictingItemIds = new Set(
    conflicts.map((conflict) => conflict.itemId),
  );

  const nextEquippedItemIds = equippedItemIds.filter(
    (equippedItemId) => !conflictingItemIds.has(equippedItemId),
  );

  return {
    equippedItemIds: [...nextEquippedItemIds, itemId],
    removedItemIds: Array.from(conflictingItemIds),
  };
}

export function unequipItem(
  equippedItemIds: readonly ItemId[],
  itemId: ItemId,
): UnequipItemResult {
  if (!isItemEquipped(equippedItemIds, itemId)) {
    return {
      equippedItemIds: [...equippedItemIds],
      removedItemIds: [],
    };
  }

  return {
    equippedItemIds: equippedItemIds.filter(
      (equippedItemId) => equippedItemId !== itemId,
    ),
    removedItemIds: [itemId],
  };
}
