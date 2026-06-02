import { apiGet, apiPost } from "../../lib/api/api-client";
import type {
  CharacterSnapshot,
  EquipmentSlot,
  ItemId,
  ItemRarity,
  OriginId
} from "../../domain/magisterium.types";

export interface SmithModifierView {
  id: string;
  target: string;
  operation: string;
  valueType: string;
  value: number;
  priority: number;
  sourceId: string;
  sourceType: string;
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
  modifiers: SmithModifierView[];
  tags: string[];
}

export interface SmithRecipeView {
  id: string;
  outputQuantity: number;
  output: SmithRecipeOutputView;
  requirements: SmithRecipeRequirementView[];
  bronzeCost: number;
  recommendedOriginIds: OriginId[];
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

export const smithApi = {
  getRecipes(userId: string, characterId: string) {
    return apiGet<SmithRecipeCatalogResult>(
      `/smith/${characterId}/recipes`,
      { userId }
    );
  },

  craft(userId: string, characterId: string, recipeId: string) {
    return apiPost<SmithCraftResult>(
      `/smith/${characterId}/craft`,
      { recipeId },
      { userId }
    );
  }
};
