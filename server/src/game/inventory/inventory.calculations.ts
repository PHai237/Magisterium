import {
  assertItemDefinitionExists,
  getItemDefinitionById,
} from '../item/item.registry';

import type { ItemId } from '../character/character.types';

import type {
  InventoryItemStack,
  InventoryOperationResult,
} from './inventory.types';

export function normalizeInventoryQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(0, Math.floor(quantity));
}

export function countInventoryItem(
  inventoryItemIds: readonly ItemId[],
  itemId: ItemId,
): number {
  return inventoryItemIds.filter((currentItemId) => currentItemId === itemId)
    .length;
}

export function hasInventoryItem(
  inventoryItemIds: readonly ItemId[],
  itemId: ItemId,
  quantity = 1,
): boolean {
  const normalizedQuantity = normalizeInventoryQuantity(quantity);

  if (normalizedQuantity <= 0) {
    return true;
  }

  return countInventoryItem(inventoryItemIds, itemId) >= normalizedQuantity;
}

export function buildInventoryStacks(
  inventoryItemIds: readonly ItemId[],
): InventoryItemStack[] {
  const stackByItemId = new Map<ItemId, InventoryItemStack>();

  for (const itemId of inventoryItemIds) {
    const existingStack = stackByItemId.get(itemId);

    if (existingStack) {
      existingStack.quantity += 1;
      continue;
    }

    stackByItemId.set(itemId, {
      itemId,
      quantity: 1,
    });
  }

  return Array.from(stackByItemId.values());
}

export function expandInventoryStacks(
  stacks: readonly InventoryItemStack[],
): ItemId[] {
  const inventoryItemIds: ItemId[] = [];

  for (const stack of stacks) {
    assertItemDefinitionExists(stack.itemId);

    const quantity = normalizeInventoryQuantity(stack.quantity);

    for (let index = 0; index < quantity; index += 1) {
      inventoryItemIds.push(stack.itemId);
    }
  }

  return inventoryItemIds;
}

export function addItemQuantityToInventory(
  inventoryItemIds: readonly ItemId[],
  itemId: ItemId,
  quantity: number,
): InventoryOperationResult {
  assertItemDefinitionExists(itemId);

  const normalizedQuantity = normalizeInventoryQuantity(quantity);
  const previousQuantity = countInventoryItem(inventoryItemIds, itemId);

  if (normalizedQuantity <= 0) {
    return {
      itemId,
      previousQuantity,
      nextQuantity: previousQuantity,
      quantityChanged: 0,
      inventoryItemIds: [...inventoryItemIds],
    };
  }

  const itemDefinition = getItemDefinitionById(itemId);

  if (!itemDefinition.stackable && normalizedQuantity > 1) {
    throw new Error(
      `Non-stackable item ${itemId} cannot be added with quantity ${normalizedQuantity}.`,
    );
  }

  const addedItemIds = Array.from(
    {
      length: normalizedQuantity,
    },
    () => itemId,
  );

  return {
    itemId,
    previousQuantity,
    nextQuantity: previousQuantity + normalizedQuantity,
    quantityChanged: normalizedQuantity,
    inventoryItemIds: [...inventoryItemIds, ...addedItemIds],
  };
}

export function addItemStacksToInventory(
  inventoryItemIds: readonly ItemId[],
  stacks: readonly InventoryItemStack[],
): ItemId[] {
  let nextInventoryItemIds = [...inventoryItemIds];

  for (const stack of stacks) {
    const result = addItemQuantityToInventory(
      nextInventoryItemIds,
      stack.itemId,
      stack.quantity,
    );

    nextInventoryItemIds = result.inventoryItemIds;
  }

  return nextInventoryItemIds;
}

export function removeItemQuantityFromInventory(
  inventoryItemIds: readonly ItemId[],
  itemId: ItemId,
  quantity: number,
): InventoryOperationResult {
  assertItemDefinitionExists(itemId);

  const normalizedQuantity = normalizeInventoryQuantity(quantity);
  const previousQuantity = countInventoryItem(inventoryItemIds, itemId);

  if (normalizedQuantity <= 0) {
    return {
      itemId,
      previousQuantity,
      nextQuantity: previousQuantity,
      quantityChanged: 0,
      inventoryItemIds: [...inventoryItemIds],
    };
  }

  if (previousQuantity < normalizedQuantity) {
    throw new Error(
      `Not enough item ${itemId} in inventory. Required ${normalizedQuantity}, available ${previousQuantity}.`,
    );
  }

  let remainingToRemove = normalizedQuantity;
  const nextInventoryItemIds: ItemId[] = [];

  for (const currentItemId of inventoryItemIds) {
    if (currentItemId === itemId && remainingToRemove > 0) {
      remainingToRemove -= 1;
      continue;
    }

    nextInventoryItemIds.push(currentItemId);
  }

  return {
    itemId,
    previousQuantity,
    nextQuantity: previousQuantity - normalizedQuantity,
    quantityChanged: -normalizedQuantity,
    inventoryItemIds: nextInventoryItemIds,
  };
}
