import {
  assertItemDefinitionExists,
  getItemDefinitionById,
} from '../item/item.registry';

import type { ItemId } from '../character/character.types';

import type {
  InventoryItemStack,
  InventoryOperationResult,
} from './inventory.types';

export const MAX_INVENTORY_ITEM_INSTANCES = 500;

export function normalizeInventoryQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(0, Math.floor(quantity));
}

function normalizePositiveInventoryMutationQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    throw new Error('Item quantity must be a finite positive integer.');
  }

  const normalizedQuantity = Math.floor(quantity);

  if (normalizedQuantity <= 0) {
    throw new Error('Item quantity must be a positive integer.');
  }

  if (!Number.isSafeInteger(normalizedQuantity)) {
    throw new Error('Item quantity must be a safe integer.');
  }

  return normalizedQuantity;
}

function assertInventoryCapacity(
  currentInventoryLength: number,
  quantityToAdd: number,
): void {
  const nextInventoryLength = currentInventoryLength + quantityToAdd;

  if (nextInventoryLength > MAX_INVENTORY_ITEM_INSTANCES) {
    throw new Error(
      `Inventory capacity exceeded. Maximum item instances: ${MAX_INVENTORY_ITEM_INSTANCES}.`,
    );
  }
}

function assertItemStackLimit(input: {
  itemId: ItemId;
  currentQuantity: number;
  quantityToAdd: number;
  maxStackSize: number;
}): void {
  const nextQuantity = input.currentQuantity + input.quantityToAdd;

  if (nextQuantity > input.maxStackSize) {
    throw new Error(
      `Item stack limit exceeded for ${input.itemId}. Maximum stack size: ${input.maxStackSize}.`,
    );
  }
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
  let inventoryItemIds: ItemId[] = [];

  for (const stack of stacks) {
    if (normalizeInventoryQuantity(stack.quantity) <= 0) {
      continue;
    }

    const result = addItemQuantityToInventory(
      inventoryItemIds,
      stack.itemId,
      stack.quantity,
    );

    inventoryItemIds = result.inventoryItemIds;
  }

  return inventoryItemIds;
}

export function addItemQuantityToInventory(
  inventoryItemIds: readonly ItemId[],
  itemId: ItemId,
  quantity: number,
): InventoryOperationResult {
  assertItemDefinitionExists(itemId);

  const itemDefinition = getItemDefinitionById(itemId);
  const normalizedQuantity =
    normalizePositiveInventoryMutationQuantity(quantity);
  const previousQuantity = countInventoryItem(inventoryItemIds, itemId);

  if (!itemDefinition.stackable && normalizedQuantity > 1) {
    throw new Error(
      `Non-stackable item ${itemId} cannot be added with quantity ${normalizedQuantity}.`,
    );
  }

  assertItemStackLimit({
    itemId,
    currentQuantity: previousQuantity,
    quantityToAdd: normalizedQuantity,
    maxStackSize: itemDefinition.maxStackSize,
  });

  assertInventoryCapacity(inventoryItemIds.length, normalizedQuantity);

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
    if (normalizeInventoryQuantity(stack.quantity) <= 0) {
      continue;
    }

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

  const normalizedQuantity =
    normalizePositiveInventoryMutationQuantity(quantity);
  const previousQuantity = countInventoryItem(inventoryItemIds, itemId);

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
