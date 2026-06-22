import type { CreateCharacterDto } from './dto/create-character.dto';

import type {
  CharacterSnapshot,
  CurrentState,
  ItemId,
} from '../game/character/character.types';
import type {
  ConsumableEffectApplication,
  ItemUseContext,
} from '../game/inventory/consumable.calculations';
import type { InventoryOperationResult } from '../game/inventory/inventory.types';

export type CreateCharacterCommand = CreateCharacterDto & {
  userId: string;
};

export interface CharacterInventoryMutationResult {
  character: CharacterSnapshot;
  inventoryChange: InventoryOperationResult;
}

export interface CharacterEquipmentMutationResult {
  character: CharacterSnapshot;

  equipmentChange: {
    itemId: ItemId;
    equippedItemIds: ItemId[];
    removedItemIds: ItemId[];
  };
}

export interface ApplyBattleRewardOptions {
  battleStartingInventoryItemIds?: ItemId[];
  battleInventoryItemIds?: ItemId[];
  battleCurrentState?: CurrentState;
}

export interface ApplyExplorationSearchResultOptions {
  staminaCost: number;
  moneyBronze?: number;
  items?: Array<{
    itemId: ItemId;
    quantity: number;
  }>;
}

export interface CharacterConsumableUseResult {
  character: CharacterSnapshot;

  itemUse: {
    itemId: ItemId;
    context: ItemUseContext;
    consumesOnUse: boolean;
    effects: ConsumableEffectApplication[];
  };

  inventoryChange: InventoryOperationResult;
}

export interface CharacterInnRestResult {
  character: CharacterSnapshot;

  rest: {
    paymentMethod: 'bronze' | 'pass';
    priceBronze: number;
    passItemId?: ItemId;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
    previousCurrentState: CurrentState;
    nextCurrentState: CurrentState;
    restedAt: string;
  };
}

export interface CharacterMarketTransactionResult {
  character: CharacterSnapshot;

  transaction: {
    type: 'buy' | 'sell';
    itemId: ItemId;
    quantity: number;
    unitPriceBronze: number;
    totalPriceBronze: number;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
    inventoryChange: InventoryOperationResult;
  };
}

export interface CharacterCraftInventoryItemCommand {
  outputItemId: ItemId;
  outputQuantity: number;
  requiredItems: Array<{
    itemId: ItemId;
    quantity: number;
  }>;
  bronzeCost: number;
}

export interface CharacterCraftInventoryItemResult {
  character: CharacterSnapshot;

  craft: {
    outputItemId: ItemId;
    outputQuantity: number;
    consumedItems: Array<{
      itemId: ItemId;
      quantity: number;
    }>;
    consumedBronze: number;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
  };
}
