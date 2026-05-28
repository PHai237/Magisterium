import type { ItemId } from '../character/character.types';

export type MarketRestockCadence = 'daily' | 'two_day' | 'weekly';

export interface MarketStockEntry {
  itemId: ItemId;
  buyPriceBronze: number;
  minStock: number;
  maxStock: number;
  restockCadence: MarketRestockCadence;
  rarity: 'common' | 'uncommon' | 'rare';
}

export interface MarketVendorDefinition {
  id: string;
  name: string;
  icon: string;
  role: string;
  description: string;
  unlockState: 'open' | 'locked' | 'rumored';
  stock: readonly MarketStockEntry[];
}

export const MARKET_ID = 'town_market';
export const MARKET_NAME = 'Market';

export const MARKET_VENDOR_DEFINITIONS = [
    {
      id: 'farmer_stall',
      name: 'Farmer Stall',
      icon: '🌾',
      role: 'Cooking Supplies',
      description:
        'Local farmers bring the stable ingredients chefs cannot reliably loot from monsters.',
      unlockState: 'open',
      stock: [
        {
          itemId: 'fresh_potato',
          buyPriceBronze: 5,
          minStock: 9,
          maxStock: 14,
          restockCadence: 'daily',
          rarity: 'common',
        },
        {
          itemId: 'plump_wheat',
          buyPriceBronze: 8,
          minStock: 6,
          maxStock: 10,
          restockCadence: 'daily',
          rarity: 'common',
        },
        {
          itemId: 'gathered_egg',
          buyPriceBronze: 15,
          minStock: 2,
          maxStock: 4,
          restockCadence: 'two_day',
          rarity: 'uncommon',
        },
        {
          itemId: 'moon_turnip',
          buyPriceBronze: 80,
          minStock: 0,
          maxStock: 1,
          restockCadence: 'weekly',
          rarity: 'rare',
        },
      ],
    },
    {
      id: 'herbalist_table',
      name: 'Herbalist Table',
      icon: '🧪',
      role: 'Alchemy Supplies',
      description:
        'Basic herbs and reagents for early alchemy work. Rare catalysts arrive slowly.',
      unlockState: 'open',
      stock: [
        {
          itemId: 'green_herb',
          buyPriceBronze: 6,
          minStock: 7,
          maxStock: 12,
          restockCadence: 'daily',
          rarity: 'common',
        },
        {
          itemId: 'basic_solvent',
          buyPriceBronze: 10,
          minStock: 4,
          maxStock: 8,
          restockCadence: 'daily',
          rarity: 'common',
        },
        {
          itemId: 'slime_gel',
          buyPriceBronze: 12,
          minStock: 2,
          maxStock: 5,
          restockCadence: 'two_day',
          rarity: 'uncommon',
        },
      ],
    },
    {
      id: 'general_goods',
      name: 'General Goods',
      icon: '⚖',
      role: 'Containers & Staples',
      description:
        'Small tools and staple goods that support cooking, alchemy, and travel preparation.',
      unlockState: 'open',
      stock: [
        {
          itemId: 'clear_glass_vial',
          buyPriceBronze: 4,
          minStock: 8,
          maxStock: 16,
          restockCadence: 'daily',
          rarity: 'common',
        },
        {
          itemId: 'cooking_salt',
          buyPriceBronze: 3,
          minStock: 10,
          maxStock: 18,
          restockCadence: 'daily',
          rarity: 'common',
        },
        {
          itemId: 'pressed_seed_oil',
          buyPriceBronze: 9,
          minStock: 4,
          maxStock: 8,
          restockCadence: 'two_day',
          rarity: 'uncommon',
        },
      ],
    },
    {
      id: 'black_market_rumor',
      name: 'Black Market',
      icon: '🕯',
      role: 'Rumored Player Trade',
      description:
        'A locked social trade space reserved for future player listings, chat, and rare goods.',
      unlockState: 'rumored',
      stock: [],
    },
  ] as const satisfies readonly MarketVendorDefinition[];
