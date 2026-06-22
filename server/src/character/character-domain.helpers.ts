import { BadRequestException } from '@nestjs/common';

import type { ApplyBattleRewardOptions } from './character-service.types';

import {
  addItemQuantityToInventory,
  countInventoryItem,
} from '../game/inventory/inventory.calculations';
import { getConsumableItemDefinitionForUse } from '../game/inventory/consumable.calculations';
import type { ItemUseContext } from '../game/inventory/consumable.calculations';
import { equipItem } from '../game/inventory/equipment.calculations';
import {
  getItemDefinitionById,
  hasItemDefinition,
} from '../game/item/item.registry';
import {
  SANCTUARY_STAT_KEYS,
  STAT_FRAGMENT_ITEM_ID_BY_STAT,
  STAT_RUNE_ITEM_ID_BY_STAT,
} from '../game/sanctuary/sanctuary.constants';
import { calculateRankStatus } from '../game/sanctuary/sanctuary-rank.calculations';
import type { CharacterSanctuaryStatusResult } from '../game/sanctuary/sanctuary.types';
import { createCharacterSnapshot } from '../game/character/character.calculations';
import type {
  Character,
  ItemId,
  StarterKitDefinition,
  StatKey,
} from '../game/character/character.types';

export function buildStartingKitPreview(starterKit: StarterKitDefinition) {
  const itemQuantityById = new Map<ItemId, number>();

  for (const itemId of starterKit.startingItemIds) {
    itemQuantityById.set(itemId, (itemQuantityById.get(itemId) ?? 0) + 1);
  }

  return {
    id: starterKit.id,
    name: starterKit.name,
    moneyBronze: starterKit.startingMoneyBronze,
    items: Array.from(itemQuantityById.entries()).map(([itemId, quantity]) => {
      const itemDefinition = getItemDefinitionById(itemId);

      return {
        itemId,
        name: itemDefinition.name,
        quantity,
      };
    }),
  };
}

export function runInventoryOperationOrThrowBadRequest<T>(
  operation: () => T,
): T {
  try {
    return operation();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Inventory operation failed.';

    throw new BadRequestException(message);
  }
}

export function reconcileInventoryAfterBattle(
  currentInventoryItemIds: readonly ItemId[],
  options: ApplyBattleRewardOptions,
): ItemId[] {
  if (!options.battleInventoryItemIds) {
    return [...currentInventoryItemIds];
  }

  if (!options.battleStartingInventoryItemIds) {
    return [...options.battleInventoryItemIds];
  }

  const startingCounts = countItemIds(options.battleStartingInventoryItemIds);
  const endingCounts = countItemIds(options.battleInventoryItemIds);
  let nextInventoryItemIds = [...currentInventoryItemIds];

  for (const [itemId, startingQuantity] of startingCounts.entries()) {
    const endingQuantity = endingCounts.get(itemId) ?? 0;
    const consumedQuantity = Math.max(0, startingQuantity - endingQuantity);

    if (consumedQuantity > 0) {
      nextInventoryItemIds = removeItemCopies(
        nextInventoryItemIds,
        itemId,
        consumedQuantity,
      );
    }
  }

  for (const [itemId, endingQuantity] of endingCounts.entries()) {
    const startingQuantity = startingCounts.get(itemId) ?? 0;
    const gainedQuantity = Math.max(0, endingQuantity - startingQuantity);

    if (gainedQuantity > 0) {
      nextInventoryItemIds = runInventoryOperationOrThrowBadRequest(() =>
        addItemQuantityToInventory(
          nextInventoryItemIds,
          itemId,
          gainedQuantity,
        ),
      ).inventoryItemIds;
    }
  }

  return nextInventoryItemIds;
}

export function normalizeNonNegativeExplorationStaminaCost(
  staminaCost: number,
): number {
  if (!Number.isFinite(staminaCost)) {
    throw new BadRequestException(
      'Exploration stamina cost must be a finite number.',
    );
  }

  const normalizedStaminaCost = Math.floor(staminaCost);

  if (!Number.isSafeInteger(normalizedStaminaCost)) {
    throw new BadRequestException(
      'Exploration stamina cost must be a safe integer.',
    );
  }

  if (normalizedStaminaCost < 0) {
    throw new BadRequestException(
      'Exploration stamina cost must not be negative.',
    );
  }

  return normalizedStaminaCost;
}

export function normalizeSanctuaryStatKey(statKey: StatKey): StatKey {
  if (!SANCTUARY_STAT_KEYS.includes(statKey)) {
    throw new BadRequestException(`Unsupported sanctuary stat key: ${statKey}`);
  }

  return statKey;
}

export function buildSanctuaryStatusResult(
  character: Character,
): CharacterSanctuaryStatusResult {
  const snapshot = createCharacterSnapshot(character);

  return {
    character: snapshot,
    rankStatus: calculateRankStatus(character),
    fragments: SANCTUARY_STAT_KEYS.map((statKey) => ({
      statKey,
      itemId: STAT_FRAGMENT_ITEM_ID_BY_STAT[statKey],
      quantity: countInventoryItem(
        snapshot.inventoryItemIds,
        STAT_FRAGMENT_ITEM_ID_BY_STAT[statKey],
      ),
    })),
    runes: SANCTUARY_STAT_KEYS.map((statKey) => ({
      statKey,
      itemId: STAT_RUNE_ITEM_ID_BY_STAT[statKey],
      quantity: countInventoryItem(
        snapshot.inventoryItemIds,
        STAT_RUNE_ITEM_ID_BY_STAT[statKey],
      ),
    })),
  };
}

export function assertInventoryItemIsConsumableForContext(
  itemId: ItemId,
  context: ItemUseContext,
): void {
  try {
    getConsumableItemDefinitionForUse(itemId, context);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Item ${itemId} is not consumable.`;

    throw new BadRequestException(message);
  }
}

export function assertInventoryItemIsEquipment(itemId: ItemId): void {
  try {
    equipItem([], itemId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Item ${itemId} is not equipment.`;

    throw new BadRequestException(message);
  }
}

export function assertKnownInventoryItem(itemId: ItemId): void {
  if (!hasItemDefinition(itemId)) {
    throw new BadRequestException(`Item definition not found: ${itemId}`);
  }
}

export function assertConsumableIsAllowedFromInventory(itemId: ItemId): void {
  const itemDefinition = getItemDefinitionById(itemId);
  const hasRestEffect =
    itemDefinition.consumable?.effects.some(
      (effect) => effect.type === 'rest',
    ) ?? false;

  if (hasRestEffect) {
    throw new BadRequestException(
      `Item ${itemId} can only be used through an inn service.`,
    );
  }
}

export function normalizePositiveInventoryMutationQuantity(
  quantity: number,
): number {
  if (!Number.isFinite(quantity)) {
    throw new BadRequestException('Item quantity must be a positive integer.');
  }

  const normalizedQuantity = Math.floor(quantity);

  if (normalizedQuantity <= 0) {
    throw new BadRequestException('Item quantity must be a positive integer.');
  }

  if (!Number.isSafeInteger(normalizedQuantity)) {
    throw new BadRequestException('Item quantity must be a safe integer.');
  }

  return normalizedQuantity;
}

export function normalizeNonNegativeBronzeAmount(
  amount: number,
  label: string,
): number {
  if (!Number.isFinite(amount)) {
    throw new BadRequestException(`${label} must be a finite number.`);
  }

  const normalizedAmount = Math.floor(amount);

  if (!Number.isSafeInteger(normalizedAmount)) {
    throw new BadRequestException(`${label} must be a safe integer.`);
  }

  if (normalizedAmount < 0) {
    throw new BadRequestException(`${label} must not be negative.`);
  }

  return normalizedAmount;
}

export function calculateMarketTotalPrice(
  unitPriceBronze: number,
  quantity: number,
): number {
  const totalPriceBronze = unitPriceBronze * quantity;

  if (!Number.isSafeInteger(totalPriceBronze)) {
    throw new BadRequestException('Market total price must be a safe integer.');
  }

  return totalPriceBronze;
}

export function assertInventoryHasQuantity(
  character: Character,
  itemId: ItemId,
  quantity: number,
): void {
  const currentQuantity = countInventoryItem(
    character.inventoryItemIds,
    itemId,
  );

  if (currentQuantity < quantity) {
    throw new BadRequestException(
      `Not enough item ${itemId} in inventory. Required ${quantity}, available ${currentQuantity}.`,
    );
  }
}

function countItemIds(itemIds: readonly ItemId[]): Map<ItemId, number> {
  const counts = new Map<ItemId, number>();

  for (const itemId of itemIds) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }

  return counts;
}

function removeItemCopies(
  inventoryItemIds: readonly ItemId[],
  itemId: ItemId,
  quantity: number,
): ItemId[] {
  let remainingToRemove = quantity;
  const nextInventoryItemIds: ItemId[] = [];

  for (const currentItemId of inventoryItemIds) {
    if (currentItemId === itemId && remainingToRemove > 0) {
      remainingToRemove -= 1;
      continue;
    }

    nextInventoryItemIds.push(currentItemId);
  }

  return nextInventoryItemIds;
}
