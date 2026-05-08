import { getItemById } from '../item/itemConstants';
import type { ItemStack, ResolvedItemStack } from '../item/itemTypes';

export function mergeInventoryStacks(itemStacks: ItemStack[]): ItemStack[] {
  const mergedInventory = new Map<string, ItemStack>();

  for (const itemStack of itemStacks) {
    if (itemStack.quantity <= 0) {
      continue;
    }

    const existingItemStack = mergedInventory.get(itemStack.itemId);

    if (!existingItemStack) {
      mergedInventory.set(itemStack.itemId, {
        itemId: itemStack.itemId,
        quantity: itemStack.quantity,
      });

      continue;
    }

    mergedInventory.set(itemStack.itemId, {
      itemId: existingItemStack.itemId,
      quantity: existingItemStack.quantity + itemStack.quantity,
    });
  }

  return Array.from(mergedInventory.values()).sort((firstItem, secondItem) =>
    firstItem.itemId.localeCompare(secondItem.itemId),
  );
}

export function addItemStacksToInventory(params: {
  inventory: ItemStack[];
  itemStacks: ItemStack[];
}): ItemStack[] {
  return mergeInventoryStacks([
    ...params.inventory,
    ...params.itemStacks,
  ]);
}

export function resolveInventoryItemStacks(
  inventory: ItemStack[],
): ResolvedItemStack[] {
  return inventory
    .map((itemStack) => {
      const item = getItemById(itemStack.itemId);

      if (!item) {
        return null;
      }

      return {
        ...itemStack,
        item,
      };
    })
    .filter(
      (itemStack): itemStack is ResolvedItemStack => Boolean(itemStack),
    );
}

export function getInventoryTotalQuantity(inventory: ItemStack[]): number {
  return inventory.reduce((total, itemStack) => {
    return total + itemStack.quantity;
  }, 0);
}

export function getInventoryUniqueItemCount(inventory: ItemStack[]): number {
  return inventory.length;
}

export function formatInventoryStack(itemStack: ItemStack): string {
  const item = getItemById(itemStack.itemId);

  if (!item) {
    return `${itemStack.quantity}x Unknown Item`;
  }

  return `${itemStack.quantity}x ${item.name}`;
}

export function formatInventoryPreview(
  inventory: ItemStack[],
  maxItems = 4,
): string {
  if (inventory.length === 0) {
    return 'Empty inventory';
  }

  const visibleItems = inventory.slice(0, maxItems);
  const hiddenItemCount = Math.max(0, inventory.length - visibleItems.length);

  const visibleText = visibleItems
    .map((itemStack) => formatInventoryStack(itemStack))
    .join(', ');

  if (hiddenItemCount <= 0) {
    return visibleText;
  }

  return `${visibleText}, +${hiddenItemCount} more`;
}