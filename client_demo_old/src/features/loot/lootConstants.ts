import type { LootTableDefinition, LootTableId } from './lootTypes';

export const LOOT_TABLES: LootTableDefinition[] = [
  {
    id: 'green_slime_loot',
    guaranteedDrops: [
      {
        itemId: 'slime_gel',
        quantity: 1,
      },
    ],
    drops: [
      {
        itemId: 'slime_gel',
        chancePercent: 45,
        minQuantity: 1,
        maxQuantity: 2,
      },
      {
        itemId: 'slime_core',
        chancePercent: 12,
        minQuantity: 1,
        maxQuantity: 1,
      },
      {
        itemId: 'aqua_rune_shard',
        chancePercent: 4,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ],
  },
  {
    id: 'wild_rat_loot',
    drops: [
      {
        itemId: 'rat_tail',
        chancePercent: 60,
        minQuantity: 1,
        maxQuantity: 2,
      },
    ],
  },
  {
    id: 'lesser_goblin_loot',
    guaranteedDrops: [
      {
        itemId: 'goblin_token',
        quantity: 1,
      },
    ],
    drops: [
      {
        itemId: 'goblin_token',
        chancePercent: 40,
        minQuantity: 1,
        maxQuantity: 2,
      },
      {
        itemId: 'goblin_blade_fragment',
        chancePercent: 18,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ],
  },
  {
    id: 'slime_king_loot',
    guaranteedDrops: [
      {
        itemId: 'slime_crown_fragment',
        quantity: 1,
      },
      {
        itemId: 'slime_core',
        quantity: 2,
      },
    ],
    drops: [
      {
        itemId: 'slime_gel',
        chancePercent: 80,
        minQuantity: 2,
        maxQuantity: 5,
      },
      {
        itemId: 'aqua_rune_shard',
        chancePercent: 25,
        minQuantity: 1,
        maxQuantity: 2,
      },
    ],
  },
  {
    id: 'goblin_chief_loot',
    guaranteedDrops: [
      {
        itemId: 'goblin_chief_badge',
        quantity: 1,
      },
    ],
    drops: [
      {
        itemId: 'goblin_token',
        chancePercent: 75,
        minQuantity: 2,
        maxQuantity: 4,
      },
      {
        itemId: 'goblin_blade_fragment',
        chancePercent: 35,
        minQuantity: 1,
        maxQuantity: 2,
      },
      {
        itemId: 'ember_rune_shard',
        chancePercent: 18,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ],
  },
  {
    id: 'bandit_scout_loot',
    guaranteedDrops: [
      {
        itemId: 'bandit_badge',
        quantity: 1,
      },
    ],
    drops: [
      {
        itemId: 'goblin_blade_fragment',
        chancePercent: 20,
        minQuantity: 1,
        maxQuantity: 1,
      },
      {
        itemId: 'ember_rune_shard',
        chancePercent: 8,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ],
  },
  {
    id: 'mutated_slime_loot',
    guaranteedDrops: [
      {
        itemId: 'mutated_goo',
        quantity: 1,
      },
    ],
    drops: [
      {
        itemId: 'mutated_goo',
        chancePercent: 55,
        minQuantity: 1,
        maxQuantity: 3,
      },
      {
        itemId: 'unstable_core',
        chancePercent: 18,
        minQuantity: 1,
        maxQuantity: 1,
      },
      {
        itemId: 'shadow_rune_shard',
        chancePercent: 12,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ],
  },
];

export function getLootTableById(
  lootTableId: LootTableId | string,
): LootTableDefinition | null {
  return (
    LOOT_TABLES.find((lootTable) => lootTable.id === lootTableId) ?? null
  );
}