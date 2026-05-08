import type { ItemId, ItemStack } from '../item/itemTypes';

export type LootTableId =
  | 'green_slime_loot'
  | 'wild_rat_loot'
  | 'lesser_goblin_loot'
  | 'slime_king_loot'
  | 'goblin_chief_loot'
  | 'bandit_scout_loot'
  | 'mutated_slime_loot';

export interface LootDropDefinition {
  itemId: ItemId;
  chancePercent: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface LootTableDefinition {
  id: LootTableId;
  guaranteedDrops?: ItemStack[];
  drops: LootDropDefinition[];
}