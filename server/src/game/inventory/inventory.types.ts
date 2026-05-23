import type { ItemId } from '../character/character.types';

export interface InventoryItemStack {
  itemId: ItemId;
  quantity: number;
}

export interface InventoryOperationResult {
  itemId: ItemId;

  previousQuantity: number;
  nextQuantity: number;
  quantityChanged: number;

  inventoryItemIds: ItemId[];
}
