export type ItemId =
  | 'slime_gel'
  | 'slime_core'
  | 'rat_tail'
  | 'goblin_token'
  | 'goblin_blade_fragment'
  | 'slime_crown_fragment'
  | 'goblin_chief_badge'
  | 'bandit_badge'
  | 'mutated_goo'
  | 'unstable_core'
  | 'ember_rune_shard'
  | 'aqua_rune_shard'
  | 'shadow_rune_shard'
  | 'light_rune_shard';

export type ItemCategory =
  | 'material'
  | 'monster_part'
  | 'rune_shard'
  | 'quest'
  | 'consumable';

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  maxStack: number;
  tags: string[];
}

export interface ItemStack {
  itemId: ItemId;
  quantity: number;
}

export interface ResolvedItemStack extends ItemStack {
  item: ItemDefinition;
}