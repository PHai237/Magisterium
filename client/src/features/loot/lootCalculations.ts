import { getItemById } from '../item/itemConstants';
import type { ItemStack, ResolvedItemStack } from '../item/itemTypes';

import { getLootTableById } from './lootConstants';
import type { LootDropDefinition, LootTableId } from './lootTypes';

function rollChance(percent: number): boolean {
  if (percent <= 0) {
    return false;
  }

  if (percent >= 100) {
    return true;
  }

  return Math.random() * 100 < percent;
}

function rollQuantity(minQuantity: number, maxQuantity: number): number {
  const min = Math.max(0, Math.floor(minQuantity));
  const max = Math.max(min, Math.floor(maxQuantity));

  return min + Math.floor(Math.random() * (max - min + 1));
}

function rollDrop(drop: LootDropDefinition): ItemStack | null {
  if (!rollChance(drop.chancePercent)) {
    return null;
  }

  const quantity = rollQuantity(drop.minQuantity, drop.maxQuantity);

  if (quantity <= 0) {
    return null;
  }

  return {
    itemId: drop.itemId,
    quantity,
  };
}

export function mergeItemStacks(itemStacks: ItemStack[]): ItemStack[] {
  const merged = new Map<string, ItemStack>();

  for (const itemStack of itemStacks) {
    if (itemStack.quantity <= 0) {
      continue;
    }

    const existing = merged.get(itemStack.itemId);

    if (!existing) {
      merged.set(itemStack.itemId, {
        ...itemStack,
      });
      continue;
    }

    merged.set(itemStack.itemId, {
      ...existing,
      quantity: existing.quantity + itemStack.quantity,
    });
  }

  return Array.from(merged.values());
}

export function rollLootForTable(
  lootTableId: LootTableId | string | undefined,
): ItemStack[] {
  if (!lootTableId) {
    return [];
  }

  const lootTable = getLootTableById(lootTableId);

  if (!lootTable) {
    return [];
  }

  const guaranteedDrops = lootTable.guaranteedDrops ?? [];
  const rolledDrops = lootTable.drops
    .map((drop) => rollDrop(drop))
    .filter((drop): drop is ItemStack => Boolean(drop));

  return mergeItemStacks([...guaranteedDrops, ...rolledDrops]);
}

export function resolveItemStacks(
  itemStacks: ItemStack[],
): ResolvedItemStack[] {
  return itemStacks
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

export function formatItemStack(itemStack: ItemStack): string {
  const item = getItemById(itemStack.itemId);

  if (!item) {
    return `${itemStack.quantity}x Unknown Item`;
  }

  return `${itemStack.quantity}x ${item.name}`;
}

export function formatItemStackList(itemStacks: ItemStack[]): string {
  if (itemStacks.length === 0) {
    return 'No item drops';
  }

  return itemStacks.map((itemStack) => formatItemStack(itemStack)).join(', ');
}