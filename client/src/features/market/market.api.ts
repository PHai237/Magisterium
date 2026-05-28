import { apiGet, apiPost } from "../../lib/api/api-client";

import type {
  ItemId,
  MarketCatalog,
  MarketTransactionResult
} from "../../domain/magisterium.types";

export interface MarketTransactionPayload {
  characterId: string;
  itemId: ItemId;
  quantity: number;
}

export const marketApi = {
  getCatalog(userId: string) {
    return apiGet<MarketCatalog>("/market/catalog", { userId });
  },

  buy(userId: string, payload: MarketTransactionPayload) {
    return apiPost<MarketTransactionResult>("/market/buy", payload, {
      userId
    });
  },

  sell(userId: string, payload: MarketTransactionPayload) {
    return apiPost<MarketTransactionResult>("/market/sell", payload, {
      userId
    });
  }
};
