import type { CharacterSnapshot, ItemId, OriginId } from '../character/character.types';
import type { EquipmentSlot, ItemRarity } from '../item/item.types';
import type { StatModifier } from '../passive/passive.types';

export interface SmithRecipeRequirementDefinition {
  itemId: ItemId;
  quantity: number;
}

export interface SmithRecipeDefinition {
  id: string;
  outputItemId: ItemId;
  outputQuantity: number;
  requiredItems: readonly SmithRecipeRequirementDefinition[];
  bronzeCost: number;
  recommendedOriginIds: readonly OriginId[];
  sortOrder: number;
}

export interface SmithRecipeRequirementView {
  itemId: ItemId;
  name: string;
  requiredQuantity: number;
  ownedQuantity: number;
  isSatisfied: boolean;
}

export interface SmithRecipeOutputView {
  itemId: ItemId;
  name: string;
  description: string;
  rarity: ItemRarity;
  slot: EquipmentSlot;
  modifiers: readonly StatModifier[];
  tags: readonly string[];
}

export interface SmithRecipeView {
  id: string;
  outputQuantity: number;
  output: SmithRecipeOutputView;
  requirements: SmithRecipeRequirementView[];
  bronzeCost: number;
  recommendedOriginIds: readonly OriginId[];
  canCraft: boolean;
  missingReason?: string;
}

export interface SmithRecipeCatalogResult {
  character: CharacterSnapshot;
  recipes: SmithRecipeView[];
}

export interface SmithCraftResult {
  character: CharacterSnapshot;
  craft: {
    recipeId: string;
    outputItemId: ItemId;
    outputQuantity: number;
    consumedItems: Array<{
      itemId: ItemId;
      quantity: number;
    }>;
    consumedBronze: number;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
  };
}
