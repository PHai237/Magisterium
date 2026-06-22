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
export const MARKET_NAME = 'The Market';

export const MARKET_VENDOR_DEFINITIONS: readonly MarketVendorDefinition[] = [
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
        itemId: 'stamina_bread',
        buyPriceBronze: 3,
        minStock: 6,
        maxStock: 10,
        restockCadence: 'daily',
        rarity: 'common',
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
        itemId: 'minor_hp_potion',
        buyPriceBronze: 5,
        minStock: 4,
        maxStock: 7,
        restockCadence: 'daily',
        rarity: 'common',
      },
      {
        itemId: 'minor_mp_potion',
        buyPriceBronze: 5,
        minStock: 4,
        maxStock: 7,
        restockCadence: 'daily',
        rarity: 'common',
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
        itemId: 'one_night_inn_pass',
        buyPriceBronze: 2,
        minStock: 2,
        maxStock: 4,
        restockCadence: 'weekly',
        rarity: 'common',
      },
      {
        itemId: 'rough_wood',
        buyPriceBronze: 2,
        minStock: 4,
        maxStock: 8,
        restockCadence: 'two_day',
        rarity: 'common',
      },
      {
        itemId: 'rough_stone',
        buyPriceBronze: 2,
        minStock: 4,
        maxStock: 8,
        restockCadence: 'two_day',
        rarity: 'common',
      },
    ],
  },
];
