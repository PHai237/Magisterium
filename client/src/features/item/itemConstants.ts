import type { ItemDefinition, ItemId } from './itemTypes';

export const ITEMS: ItemDefinition[] = [
  {
    id: 'slime_gel',
    name: 'Slime Gel',
    description:
      'A sticky material left behind by weak slimes. Useful for future crafting.',
    category: 'material',
    rarity: 'common',
    maxStack: 99,
    tags: ['slime', 'crafting'],
  },
  {
    id: 'slime_core',
    name: 'Slime Core',
    description:
      'A condensed core from a stronger slime. It pulses with faint energy.',
    category: 'monster_part',
    rarity: 'uncommon',
    maxStack: 50,
    tags: ['slime', 'core', 'crafting'],
  },
  {
    id: 'rat_tail',
    name: 'Rat Tail',
    description:
      'A rough monster part collected from wild rats.',
    category: 'monster_part',
    rarity: 'common',
    maxStack: 99,
    tags: ['rat', 'monster-part'],
  },
  {
    id: 'goblin_token',
    name: 'Goblin Token',
    description:
      'A small crude token carried by lesser goblins.',
    category: 'monster_part',
    rarity: 'common',
    maxStack: 99,
    tags: ['goblin', 'token'],
  },
  {
    id: 'goblin_blade_fragment',
    name: 'Goblin Blade Fragment',
    description:
      'A chipped blade fragment from a goblin weapon.',
    category: 'material',
    rarity: 'uncommon',
    maxStack: 50,
    tags: ['goblin', 'weapon', 'crafting'],
  },
  {
    id: 'slime_crown_fragment',
    name: 'Slime Crown Fragment',
    description:
      'A strange fragment from the Slime King. It may be useful for future boss crafting.',
    category: 'quest',
    rarity: 'rare',
    maxStack: 20,
    tags: ['boss', 'slime', 'rare'],
  },
  {
    id: 'goblin_chief_badge',
    name: 'Goblin Chief Badge',
    description:
      'A crude badge taken from the Goblin Chief.',
    category: 'quest',
    rarity: 'rare',
    maxStack: 20,
    tags: ['boss', 'goblin', 'rare'],
  },
  {
    id: 'bandit_badge',
    name: 'Bandit Badge',
    description:
      'A small badge used by road bandits to identify each other.',
    category: 'monster_part',
    rarity: 'uncommon',
    maxStack: 50,
    tags: ['bandit', 'road-event'],
  },
  {
    id: 'mutated_goo',
    name: 'Mutated Goo',
    description:
      'Unstable slime matter changed by unknown energy.',
    category: 'material',
    rarity: 'uncommon',
    maxStack: 50,
    tags: ['mutated', 'slime', 'unstable'],
  },
  {
    id: 'unstable_core',
    name: 'Unstable Core',
    description:
      'A rare unstable core that may later be used for rune crafting.',
    category: 'monster_part',
    rarity: 'rare',
    maxStack: 20,
    tags: ['mutated', 'core', 'rare'],
  },
  {
    id: 'ember_rune_shard',
    name: 'Ember Rune Shard',
    description:
      'A shard containing faint fire-aligned rune energy.',
    category: 'rune_shard',
    rarity: 'uncommon',
    maxStack: 50,
    tags: ['rune', 'fire'],
  },
  {
    id: 'aqua_rune_shard',
    name: 'Aqua Rune Shard',
    description:
      'A shard containing faint water-aligned rune energy.',
    category: 'rune_shard',
    rarity: 'uncommon',
    maxStack: 50,
    tags: ['rune', 'water'],
  },
  {
    id: 'shadow_rune_shard',
    name: 'Shadow Rune Shard',
    description:
      'A shard containing faint dark-aligned rune energy.',
    category: 'rune_shard',
    rarity: 'rare',
    maxStack: 30,
    tags: ['rune', 'dark'],
  },
  {
    id: 'light_rune_shard',
    name: 'Light Rune Shard',
    description:
      'A shard containing faint light-aligned rune energy.',
    category: 'rune_shard',
    rarity: 'rare',
    maxStack: 30,
    tags: ['rune', 'light'],
  },
];

export function getItemById(itemId: ItemId | string): ItemDefinition | null {
  return ITEMS.find((item) => item.id === itemId) ?? null;
}