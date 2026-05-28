import type { CharacterSnapshot, ItemId } from '../character/character.types';
import type { InventoryOperationResult } from '../inventory/inventory.types';
import type { MarketRestockCadence } from './market.definitions';

export interface MarketCatalogItem {
  itemId: ItemId;
  name: string;
  description: string;
  category: string;
  rarity: string;
  buyPriceBronze: number;
  sellPriceBronze: number;
  maxStock: number;
  currentStock: number;
  restockCadence: MarketRestockCadence;
  nextRestockAt: string;
  tags: readonly string[];
}

export interface MarketVendor {
  id: string;
  name: string;
  icon: string;
  role: string;
  description: string;
  unlockState: 'open' | 'locked' | 'rumored';
  items: MarketCatalogItem[];
}

export interface MarketCatalog {
  id: string;
  name: string;
  generatedAt: string;
  vendors: MarketVendor[];
}

export interface MarketTransactionResult {
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
