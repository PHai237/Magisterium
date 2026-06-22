import { BadRequestException, Injectable } from '@nestjs/common';

import { CharacterService } from '../../character/character.service';
import { countInventoryItem } from '../inventory/inventory.calculations';
import {
  getItemDefinitionById,
  hasItemDefinition,
} from '../item/item.registry';
import { SMITH_RECIPE_DEFINITIONS } from './smith.constants';

import type { CharacterSnapshot, ItemId } from '../character/character.types';
import type {
  SmithCraftResult,
  SmithRecipeCatalogResult,
  SmithRecipeDefinition,
  SmithRecipeRequirementView,
  SmithRecipeView,
} from './smith.types';

@Injectable()
export class SmithService {
  constructor(private readonly characterService: CharacterService) {}

  completePersistence<T>(result: T): T | Promise<T> {
    return this.characterService.completePersistence(result);
  }

  getRecipes(characterId: string, userId: string): SmithRecipeCatalogResult {
    const character = this.characterService.findByIdForUserScope(
      characterId,
      userId,
    );

    return {
      character,
      recipes: this.getAvailableRecipeDefinitions().map((recipe) =>
        this.buildRecipeView(recipe, character),
      ),
    };
  }

  craft(
    characterId: string,
    userId: string,
    recipeId: string,
  ): SmithCraftResult {
    const recipe = this.findRecipeById(recipeId);

    if (!recipe) {
      throw new BadRequestException(`Unknown smith recipe: ${recipeId}.`);
    }

    this.assertRecipeIsUsable(recipe);

    const result = this.characterService.craftInventoryItem(
      characterId,
      userId,
      {
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
        requiredItems: recipe.requiredItems.map((item) => ({ ...item })),
        bronzeCost: recipe.bronzeCost,
      },
    );

    return {
      character: result.character,
      craft: {
        recipeId: recipe.id,
        outputItemId: result.craft.outputItemId,
        outputQuantity: result.craft.outputQuantity,
        consumedItems: result.craft.consumedItems,
        consumedBronze: result.craft.consumedBronze,
        previousMoneyBronze: result.craft.previousMoneyBronze,
        nextMoneyBronze: result.craft.nextMoneyBronze,
      },
    };
  }

  private getAvailableRecipeDefinitions(): SmithRecipeDefinition[] {
    return SMITH_RECIPE_DEFINITIONS.filter((recipe) =>
      this.isRecipeUsable(recipe),
    )
      .map((recipe) => ({ ...recipe }))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private findRecipeById(recipeId: string): SmithRecipeDefinition | undefined {
    return SMITH_RECIPE_DEFINITIONS.find((recipe) => recipe.id === recipeId);
  }

  private isRecipeUsable(recipe: SmithRecipeDefinition): boolean {
    if (!hasItemDefinition(recipe.outputItemId)) {
      return false;
    }

    const output = getItemDefinitionById(recipe.outputItemId);

    if (!output.equipment) {
      return false;
    }

    return recipe.requiredItems.every((requiredItem) =>
      hasItemDefinition(requiredItem.itemId),
    );
  }

  private assertRecipeIsUsable(recipe: SmithRecipeDefinition): void {
    if (!this.isRecipeUsable(recipe)) {
      throw new BadRequestException(
        `Smith recipe is not usable because one or more item definitions are missing: ${recipe.id}.`,
      );
    }
  }

  private buildRecipeView(
    recipe: SmithRecipeDefinition,
    character: CharacterSnapshot,
  ): SmithRecipeView {
    const output = getItemDefinitionById(recipe.outputItemId);

    if (!output.equipment) {
      throw new BadRequestException(
        `Smith recipe output is not equipment: ${recipe.outputItemId}.`,
      );
    }

    const requirements = recipe.requiredItems.map((requiredItem) =>
      this.buildRequirementView(
        requiredItem.itemId,
        requiredItem.quantity,
        character,
      ),
    );

    const hasAllItems = requirements.every(
      (requirement) => requirement.isSatisfied,
    );
    const hasBronze = character.moneyBronze >= recipe.bronzeCost;

    return {
      id: recipe.id,
      outputQuantity: recipe.outputQuantity,
      output: {
        itemId: output.id,
        name: output.name,
        description: output.description,
        rarity: output.rarity,
        slot: output.equipment.slot,
        modifiers: output.equipment.modifiers,
        tags: output.tags,
      },
      requirements,
      bronzeCost: recipe.bronzeCost,
      recommendedOriginIds: recipe.recommendedOriginIds,
      canCraft: hasAllItems && hasBronze,
      missingReason: this.getMissingReason(requirements, hasBronze),
    };
  }

  private buildRequirementView(
    itemId: ItemId,
    requiredQuantity: number,
    character: CharacterSnapshot,
  ): SmithRecipeRequirementView {
    const item = getItemDefinitionById(itemId);
    const ownedQuantity = countInventoryItem(
      character.inventoryItemIds,
      itemId,
    );

    return {
      itemId,
      name: item.name,
      requiredQuantity,
      ownedQuantity,
      isSatisfied: ownedQuantity >= requiredQuantity,
    };
  }

  private getMissingReason(
    requirements: readonly SmithRecipeRequirementView[],
    hasBronze: boolean,
  ): string | undefined {
    const missingItems = requirements.filter(
      (requirement) => !requirement.isSatisfied,
    );

    if (missingItems.length > 0) {
      return 'Missing required materials.';
    }

    if (!hasBronze) {
      return 'Not enough bronze.';
    }

    return undefined;
  }
}
