import { apiGet, apiPost } from "../../lib/api/api-client";
import type { CharacterSnapshot, ItemId } from "../../domain/magisterium.types";

export type MarketUnlockState = "open" | "locked" | "rumored";
export type MarketRestockCadence = "daily" | "two_day" | "weekly";

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
  unlockState: MarketUnlockState;
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
    type: "buy" | "sell";
    itemId: ItemId;
    quantity: number;
    unitPriceBronze: number;
    totalPriceBronze: number;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
  };
}

interface MarketTransactionPayload {
  characterId: string;
  itemId: ItemId;
  quantity: number;
}

export const marketApi = {
  getCatalog(userId: string) {
    return apiGet<MarketCatalog>("/market/catalog", { userId });
  },

  buy(userId: string, payload: MarketTransactionPayload) {
    return apiPost<MarketTransactionResult>("/market/buy", payload, { userId });
  },

  sell(userId: string, payload: MarketTransactionPayload) {
    return apiPost<MarketTransactionResult>("/market/sell", payload, { userId });
  }
};
