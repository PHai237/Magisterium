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
    stock: [] as readonly MarketStockEntry[],
  },
  {
    id: 'herbalist_table',
    name: 'Herbalist Table',
    icon: '🧪',
    role: 'Alchemy Supplies',
    description:
      'Basic herbs and reagents for early alchemy work. Rare catalysts arrive slowly.',
    unlockState: 'open',
    stock: [] as readonly MarketStockEntry[],
  },
  {
    id: 'general_goods',
    name: 'General Goods',
    icon: '⚖',
    role: 'Containers & Staples',
    description:
      'Small tools and staple goods that support cooking, alchemy, and travel preparation.',
    unlockState: 'open',
    stock: [] as readonly MarketStockEntry[],
  },
] as const satisfies readonly MarketVendorDefinition[];
