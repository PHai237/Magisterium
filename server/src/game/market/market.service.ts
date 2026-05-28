import { BadRequestException, Injectable } from '@nestjs/common';

import { CharacterService } from '../../character/character.service';
import { getItemDefinitionById } from '../item/item.registry';

import {
  MARKET_ID,
  MARKET_NAME,
  MARKET_VENDOR_DEFINITIONS,
  type MarketRestockCadence,
  type MarketStockEntry,
  type MarketVendorDefinition,
} from './market.definitions';

import type { ItemId } from '../character/character.types';
import type { MarketCatalog, MarketCatalogItem } from './market.types';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MarketService {
  private readonly purchasedQuantityByStockKey = new Map<string, number>();

  constructor(private readonly characterService: CharacterService) {}

  getCatalog(now: Date = new Date()): MarketCatalog {
    return {
      id: MARKET_ID,
      name: MARKET_NAME,
      generatedAt: now.toISOString(),
      vendors: MARKET_VENDOR_DEFINITIONS.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        icon: vendor.icon,
        role: vendor.role,
        description: vendor.description,
        unlockState: vendor.unlockState,
        items:
          vendor.unlockState === 'open'
            ? vendor.stock.map((entry) =>
                this.buildCatalogItem(vendor, entry, now),
              )
            : [],
      })),
    };
  }

  buyItem(input: {
    characterId: string;
    userId: string;
    itemId: ItemId;
    quantity: number;
  }) {
    const stock = this.findOpenStockEntry(input.itemId);
    const stockState = this.calculateStockState(stock.vendor, stock.entry);
    const normalizedQuantity = Math.floor(input.quantity);

    if (!Number.isFinite(input.quantity) || normalizedQuantity <= 0) {
      throw new BadRequestException('Item quantity must be a positive integer.');
    }

    if (stockState.currentStock < normalizedQuantity) {
      throw new BadRequestException(
        `Not enough market stock for ${input.itemId}. Required ${normalizedQuantity}, available ${stockState.currentStock}.`,
      );
    }

    const result = this.characterService.buyMarketItem(
      input.characterId,
      input.userId,
      input.itemId,
      normalizedQuantity,
      stock.entry.buyPriceBronze,
    );

    const previousPurchased =
      this.purchasedQuantityByStockKey.get(stockState.stockKey) ?? 0;

    this.purchasedQuantityByStockKey.set(
      stockState.stockKey,
      previousPurchased + normalizedQuantity,
    );

    return result;
  }

  sellItem(input: {
    characterId: string;
    userId: string;
    itemId: ItemId;
    quantity: number;
  }) {
    const item = getItemDefinitionById(input.itemId);

    if (!item.tags.includes('loot')) {
      throw new BadRequestException(
        `Market only buys monster loot for now: ${input.itemId}.`,
      );
    }

    if (item.sellPriceBronze <= 0) {
      throw new BadRequestException(`Market will not buy item ${input.itemId}.`);
    }

    return this.characterService.sellMarketItem(
      input.characterId,
      input.userId,
      input.itemId,
      input.quantity,
      item.sellPriceBronze,
    );
  }

  private findOpenStockEntry(itemId: ItemId): {
    vendor: MarketVendorDefinition;
    entry: MarketStockEntry;
  } {
    for (const vendor of MARKET_VENDOR_DEFINITIONS) {
      if (vendor.unlockState !== 'open') {
        continue;
      }

      const entry = vendor.stock.find((stockEntry) => stockEntry.itemId === itemId);

      if (entry) {
        return { vendor, entry };
      }
    }

    throw new BadRequestException(`Market does not sell item ${itemId}.`);
  }

  private buildCatalogItem(
    vendor: MarketVendorDefinition,
    entry: MarketStockEntry,
    now: Date,
  ): MarketCatalogItem {
    const item = getItemDefinitionById(entry.itemId);
    const stockState = this.calculateStockState(vendor, entry, now);

    return {
      itemId: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: entry.rarity,
      buyPriceBronze: entry.buyPriceBronze,
      sellPriceBronze: item.sellPriceBronze,
      maxStock: stockState.maxStock,
      currentStock: stockState.currentStock,
      restockCadence: entry.restockCadence,
      nextRestockAt: stockState.nextRestockAt,
      tags: [...item.tags],
    };
  }

  private calculateStockState(
    vendor: MarketVendorDefinition,
    entry: MarketStockEntry,
    now: Date = new Date(),
  ): {
    stockKey: string;
    maxStock: number;
    currentStock: number;
    nextRestockAt: string;
  } {
    const period = this.getRestockPeriod(entry.restockCadence, now);
    const stockKey = `${period.key}:${vendor.id}:${entry.itemId}`;
    const purchasedQuantity =
      this.purchasedQuantityByStockKey.get(stockKey) ?? 0;
    const maxStock = this.rollStockAmount(entry, period.key);

    return {
      stockKey,
      maxStock,
      currentStock: Math.max(0, maxStock - purchasedQuantity),
      nextRestockAt: period.nextRestockAt,
    };
  }

  private getRestockPeriod(
    cadence: MarketRestockCadence,
    now: Date,
  ): { key: string; nextRestockAt: string } {
    const time = now.getTime();

    if (cadence === 'weekly') {
      const weekIndex = Math.floor(time / (7 * DAY_MS));
      const nextRestockAt = new Date((weekIndex + 1) * 7 * DAY_MS);

      return {
        key: `weekly:${weekIndex}`,
        nextRestockAt: nextRestockAt.toISOString(),
      };
    }

    if (cadence === 'two_day') {
      const periodIndex = Math.floor(time / (2 * DAY_MS));
      const nextRestockAt = new Date((periodIndex + 1) * 2 * DAY_MS);

      return {
        key: `two_day:${periodIndex}`,
        nextRestockAt: nextRestockAt.toISOString(),
      };
    }

    const dayIndex = Math.floor(time / DAY_MS);
    const nextRestockAt = new Date((dayIndex + 1) * DAY_MS);

    return {
      key: `daily:${dayIndex}`,
      nextRestockAt: nextRestockAt.toISOString(),
    };
  }

  private rollStockAmount(entry: MarketStockEntry, periodKey: string): number {
    const minStock = Math.max(0, Math.floor(entry.minStock));
    const maxStock = Math.max(minStock, Math.floor(entry.maxStock));
    const range = maxStock - minStock + 1;

    return minStock + (this.hashToPositiveInteger(`${periodKey}:${entry.itemId}`) % range);
  }

  private hashToPositiveInteger(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }
}
