import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';

import { CreateCharacterDto } from './dto/create-character.dto';
import { PreviewCharacterDto } from './dto/preview-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

import {
  normalizeCharacterName,
  normalizeOptionalCharacterName,
  normalizeRequiredUserId,
} from './character.validation';

import { DatabaseService } from '../database/database.service';

import { createCharacter } from '../game/character/character.factory';

import {
  addBronze,
  buildCurrentState,
  buildStatsForOrigin,
  calculateBaseStats,
  calculateDerivedStats,
  createCharacterSnapshot,
  getDefaultStarterKit,
  getOriginById,
} from '../game/character/character.calculations';

import {
  addItemQuantityToInventory,
  addItemStacksToInventory,
  buildInventoryStacks,
  countInventoryItem,
  removeItemQuantityFromInventory,
} from '../game/inventory/inventory.calculations';

import type {
  InventoryItemStack,
  InventoryOperationResult,
} from '../game/inventory/inventory.types';

import {
  getItemDefinitionById,
  hasItemDefinition,
} from '../game/item/item.registry';

import {
  equipItem,
  unequipItem,
} from '../game/inventory/equipment.calculations';

import {
  applyConsumableItemEffectsToCharacter,
  getConsumableItemDefinitionForUse,
} from '../game/inventory/consumable.calculations';

import type {
  ConsumableEffectApplication,
  ItemUseContext,
} from '../game/inventory/consumable.calculations';

import type {
  Character,
  CharacterCreationPreview,
  CharacterSnapshot,
  CurrentState,
  ItemId,
  StarterKitDefinition,
} from '../game/character/character.types';

import type {
  AppliedBattleRewardResult,
  BattleRewardSummary,
  CharacterProgressionRewardResult,
} from '../game/reward/reward.types';

type CreateCharacterCommand = CreateCharacterDto & {
  userId: string;
};

export interface CharacterInventoryMutationResult {
  character: CharacterSnapshot;
  inventoryChange: InventoryOperationResult;
}

export interface CharacterEquipmentMutationResult {
  character: CharacterSnapshot;

  equipmentChange: {
    itemId: ItemId;
    equippedItemIds: ItemId[];
    removedItemIds: ItemId[];
  };
}

export interface ApplyBattleRewardOptions {
  battleStartingInventoryItemIds?: ItemId[];
  battleInventoryItemIds?: ItemId[];
  battleCurrentState?: CurrentState;
}

export interface CharacterConsumableUseResult {
  character: CharacterSnapshot;

  itemUse: {
    itemId: ItemId;
    context: ItemUseContext;
    consumesOnUse: boolean;
    effects: ConsumableEffectApplication[];
  };

  inventoryChange: InventoryOperationResult;
}

export interface CharacterInnRestResult {
  character: CharacterSnapshot;

  rest: {
    paymentMethod: 'bronze' | 'voucher';
    priceBronze: number;
    voucherItemId?: ItemId;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
    previousCurrentState: CurrentState;
    nextCurrentState: CurrentState;
    restedAt: string;
  };
}

const BASE_EXP_REQUIRED_FOR_LEVEL_UP = 100;
const EXP_LEVEL_GROWTH_FACTOR = 1.5;
const MAX_CHARACTER_LEVEL = 100;
const BASIC_INN_REST_PRICE_BRONZE = 3;
const ONE_NIGHT_INN_VOUCHER_ID: ItemId = 'one_night_inn_voucher';

const MAX_SAFE_TOTAL_EXP = 100_000_000;
const MAX_SAFE_REWARD_EXP = 1_000_000;
const MAX_CHARACTERS_PER_USER = 3;

@Injectable()
export class CharacterService implements OnModuleInit {
  private readonly characters = new Map<string, Character>();
  private readonly currentCharacterIdsByUserScope = new Map<string, string>();

  private readonly logger = new Logger(CharacterService.name);

  constructor(
    @Optional()
    private readonly databaseService?: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.hydrateCharacterStateFromDatabase();
  }

  ping() {
    return {
      status: 'ok',
      module: 'character',
      message: 'Character module is ready.',
    };
  }

  createPreview(dto: PreviewCharacterDto): CharacterCreationPreview {
    const originDef = getOriginById(dto.originId);
    const starterKitDef = getDefaultStarterKit();

    const stats = buildStatsForOrigin(originDef);
    const baseStats = calculateBaseStats(stats);
    const derivedStats = calculateDerivedStats(baseStats);
    const currentState = buildCurrentState(derivedStats);

    return {
      originId: originDef.id,
      baseStats,
      derivedStats,
      currentState,

      startingKit: this.buildStartingKitPreview(starterKitDef),
    };
  }

  create(dto: CreateCharacterCommand): CharacterSnapshot {
    const userId = normalizeRequiredUserId(dto.userId);
    const name = normalizeCharacterName(dto.name);

    if (
      this.findCharactersByUserScope(userId).length >= MAX_CHARACTERS_PER_USER
    ) {
      throw new BadRequestException(
        `A user can have at most ${MAX_CHARACTERS_PER_USER} characters.`,
      );
    }

    const character = createCharacter({
      name,
      originId: dto.originId,
      userId,
    });

    this.characters.set(character.id, character);
    this.currentCharacterIdsByUserScope.set(userId, character.id);

    this.persistCharacter(character);
    this.persistCurrentCharacter(userId, character.id);

    return createCharacterSnapshot(character);
  }

  findAll(userId: string): CharacterSnapshot[] {
    const userScope = normalizeRequiredUserId(userId);

    return Array.from(this.characters.values())
      .filter((character) => character.userId === userScope)
      .map((character) => createCharacterSnapshot(character));
  }

  findCurrent(userId: string): CharacterSnapshot | null {
    const userScope = normalizeRequiredUserId(userId);
    const currentCharacterId =
      this.currentCharacterIdsByUserScope.get(userScope);

    if (!currentCharacterId) {
      return this.findFallbackCurrentCharacter(userScope);
    }

    const currentCharacter = this.characters.get(currentCharacterId);

    if (!currentCharacter || currentCharacter.userId !== userScope) {
      this.currentCharacterIdsByUserScope.delete(userScope);

      return this.findFallbackCurrentCharacter(userScope);
    }

    return createCharacterSnapshot(currentCharacter);
  }

  findById(id: string): CharacterSnapshot {
    const character = this.findEntityById(id);

    return createCharacterSnapshot(character);
  }

  findByIdForUserScope(id: string, userId: string): CharacterSnapshot {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(id);

    this.assertCharacterBelongsToUserScope(character, userScope);

    return createCharacterSnapshot(character);
  }

  updateById(
    id: string,
    dto: UpdateCharacterDto,
    userId: string,
  ): CharacterSnapshot {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(id);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);

    const nextName =
      normalizeOptionalCharacterName(dto.name) ?? existingCharacter.name;

    const nextCharacter: Character = {
      ...existingCharacter,
      name: nextName,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(id, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return createCharacterSnapshot(nextCharacter);
  }

  applyBattleReward(
    characterId: string,
    userId: string,
    reward: BattleRewardSummary,
    options: ApplyBattleRewardOptions = {},
  ): AppliedBattleRewardResult & {
    character: CharacterSnapshot;
  } {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);

    const progressionResult = this.calculateProgressionReward(
      existingCharacter.progression.level,
      existingCharacter.progression.exp,
      reward.exp,
    );

    const inventoryAfterBattle = this.reconcileInventoryAfterBattle(
      existingCharacter.inventoryItemIds,
      options,
    );

    const nextInventoryItemIds = this.runInventoryOperationOrThrowBadRequest(
      () => addItemStacksToInventory(inventoryAfterBattle, reward.items),
    );

    const nextCharacter: Character = {
      ...existingCharacter,

      progression: {
        ...existingCharacter.progression,
        level: progressionResult.nextLevel,
        exp: progressionResult.nextExp,
      },

      moneyBronze: addBronze(existingCharacter.moneyBronze, reward.moneyBronze),

      inventoryItemIds: nextInventoryItemIds,

      equippedItemIds: existingCharacter.equippedItemIds.filter(
        (equippedItemId) => nextInventoryItemIds.includes(equippedItemId),
      ),

      currentState: options.battleCurrentState
        ? {
            ...options.battleCurrentState,
          }
        : existingCharacter.currentState,

      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      reward,
      progression: progressionResult,
    };
  }

  getInventoryStacks(
    characterId: string,
    userId: string,
  ): InventoryItemStack[] {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(character, userScope);

    return buildInventoryStacks(character.inventoryItemIds);
  }

  countInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
  ): number {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(character, userScope);
    this.assertKnownInventoryItem(itemId);

    return countInventoryItem(character.inventoryItemIds, itemId);
  }

  addInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
    quantity: number,
  ): CharacterInventoryMutationResult {
    const userScope = normalizeRequiredUserId(userId);
    const normalizedQuantity =
      this.normalizePositiveInventoryMutationQuantity(quantity);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    this.assertKnownInventoryItem(itemId);

    const inventoryChange = this.runInventoryOperationOrThrowBadRequest(() =>
      addItemQuantityToInventory(
        existingCharacter.inventoryItemIds,
        itemId,
        normalizedQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      inventoryItemIds: inventoryChange.inventoryItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      inventoryChange,
    };
  }

  removeInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
    quantity: number,
  ): CharacterInventoryMutationResult {
    const userScope = normalizeRequiredUserId(userId);
    const normalizedQuantity =
      this.normalizePositiveInventoryMutationQuantity(quantity);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    this.assertKnownInventoryItem(itemId);
    this.assertInventoryHasQuantity(
      existingCharacter,
      itemId,
      normalizedQuantity,
    );

    const inventoryChange = this.runInventoryOperationOrThrowBadRequest(() =>
      removeItemQuantityFromInventory(
        existingCharacter.inventoryItemIds,
        itemId,
        normalizedQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      inventoryItemIds: inventoryChange.inventoryItemIds,
      equippedItemIds: existingCharacter.equippedItemIds.filter(
        (equippedItemId) => equippedItemId !== itemId,
      ),
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      inventoryChange,
    };
  }

  consumeInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
  ): CharacterInventoryMutationResult {
    return this.removeInventoryItem(characterId, userId, itemId, 1);
  }

  equipInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
  ): CharacterEquipmentMutationResult {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    this.assertKnownInventoryItem(itemId);
    this.assertInventoryHasQuantity(existingCharacter, itemId, 1);
    this.assertInventoryItemIsEquipment(itemId);

    const equipmentResult = equipItem(
      existingCharacter.equippedItemIds,
      itemId,
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      equippedItemIds: equipmentResult.equippedItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      equipmentChange: {
        itemId,
        equippedItemIds: equipmentResult.equippedItemIds,
        removedItemIds: equipmentResult.removedItemIds,
      },
    };
  }

  unequipInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
  ): CharacterEquipmentMutationResult {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    this.assertKnownInventoryItem(itemId);
    this.assertInventoryItemIsEquipment(itemId);

    const equipmentResult = unequipItem(
      existingCharacter.equippedItemIds,
      itemId,
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      equippedItemIds: equipmentResult.equippedItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      equipmentChange: {
        itemId,
        equippedItemIds: equipmentResult.equippedItemIds,
        removedItemIds: equipmentResult.removedItemIds,
      },
    };
  }

  useConsumableItemOutOfBattle(
    characterId: string,
    userId: string,
    itemId: ItemId,
  ): CharacterConsumableUseResult {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    this.assertKnownInventoryItem(itemId);
    this.assertInventoryHasQuantity(existingCharacter, itemId, 1);
    this.assertInventoryItemIsConsumableForContext(itemId, 'out_of_battle');
    this.assertConsumableIsAllowedFromInventory(itemId);

    const snapshotBeforeUse = createCharacterSnapshot(existingCharacter);

    const sanitizedCharacterBeforeUse: Character = {
      ...existingCharacter,
      equippedItemIds: snapshotBeforeUse.equippedItemIds,
      currentState: snapshotBeforeUse.currentState,
    };

    const itemUseResult = applyConsumableItemEffectsToCharacter(
      sanitizedCharacterBeforeUse,
      snapshotBeforeUse.derivedStats,
      itemId,
      'out_of_battle',
    );

    const inventoryChange = itemUseResult.consumesOnUse
      ? this.runInventoryOperationOrThrowBadRequest(() =>
          removeItemQuantityFromInventory(
            itemUseResult.character.inventoryItemIds,
            itemId,
            1,
          ),
        )
      : {
          itemId,
          previousQuantity: countInventoryItem(
            itemUseResult.character.inventoryItemIds,
            itemId,
          ),
          nextQuantity: countInventoryItem(
            itemUseResult.character.inventoryItemIds,
            itemId,
          ),
          quantityChanged: 0,
          inventoryItemIds: [...itemUseResult.character.inventoryItemIds],
        };

    const nextCharacter: Character = {
      ...itemUseResult.character,
      inventoryItemIds: inventoryChange.inventoryItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),

      itemUse: {
        itemId,
        context: 'out_of_battle',
        consumesOnUse: itemUseResult.consumesOnUse,
        effects: itemUseResult.effects,
      },

      inventoryChange,
    };
  }

  setCurrentCharacter(id: string, userId: string): CharacterSnapshot {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(id);

    this.assertCharacterBelongsToUserScope(character, userScope);

    this.currentCharacterIdsByUserScope.set(userScope, character.id);
    this.persistCurrentCharacter(userScope, character.id);

    return createCharacterSnapshot(character);
  }

  deleteById(id: string, userId: string) {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(id);

    this.assertCharacterBelongsToUserScope(character, userScope);

    this.characters.delete(id);
    this.deletePersistedCharacter(id);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      deleted: true,
      id,
    };
  }

  clearCharacters(): void {
    this.characters.clear();
    this.currentCharacterIdsByUserScope.clear();

    this.persistClearCharacterState();
  }

  restAtInn(characterId: string, userId: string): CharacterInnRestResult {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.characters.get(characterId);

    if (!character || character.userId !== userScope) {
      throw new NotFoundException(`Character not found: ${characterId}`);
    }

    if (character.moneyBronze < BASIC_INN_REST_PRICE_BRONZE) {
      throw new BadRequestException(
        `Not enough bronze to rest. Required: ${BASIC_INN_REST_PRICE_BRONZE}.`,
      );
    }

    const snapshotBeforeRest = createCharacterSnapshot(character);
    const restedAt = new Date().toISOString();

    const nextCurrentState: CurrentState = {
      hp: snapshotBeforeRest.derivedStats.maxHp,
      mp: snapshotBeforeRest.derivedStats.maxMp,
      stamina: snapshotBeforeRest.derivedStats.maxStamina,
    };

    const updatedCharacter: Character = {
      ...character,
      version: character.version + 1,
      moneyBronze: character.moneyBronze - BASIC_INN_REST_PRICE_BRONZE,
      currentState: nextCurrentState,
      fatigue: 0,
      lastRestAt: restedAt,
      updatedAt: restedAt,
    };

    this.characters.set(updatedCharacter.id, updatedCharacter);
    this.persistCharacter(updatedCharacter);

    return {
      character: createCharacterSnapshot(updatedCharacter),
      rest: {
        paymentMethod: 'bronze',
        priceBronze: BASIC_INN_REST_PRICE_BRONZE,
        previousMoneyBronze: character.moneyBronze,
        nextMoneyBronze: updatedCharacter.moneyBronze,
        previousCurrentState: snapshotBeforeRest.currentState,
        nextCurrentState,
        restedAt,
      },
    };
  }

  restAtInnWithVoucher(
    characterId: string,
    userId: string,
  ): CharacterInnRestResult {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.characters.get(characterId);

    if (!character || character.userId !== userScope) {
      throw new NotFoundException(`Character not found: ${characterId}`);
    }

    this.assertInventoryHasQuantity(character, ONE_NIGHT_INN_VOUCHER_ID, 1);

    const snapshotBeforeRest = createCharacterSnapshot(character);
    const restedAt = new Date().toISOString();

    const sanitizedCharacterBeforeRest: Character = {
      ...character,
      equippedItemIds: snapshotBeforeRest.equippedItemIds,
      currentState: snapshotBeforeRest.currentState,
    };

    const itemUseResult = applyConsumableItemEffectsToCharacter(
      sanitizedCharacterBeforeRest,
      snapshotBeforeRest.derivedStats,
      ONE_NIGHT_INN_VOUCHER_ID,
      'out_of_battle',
    );

    const inventoryChange = this.runInventoryOperationOrThrowBadRequest(() =>
      removeItemQuantityFromInventory(
        itemUseResult.character.inventoryItemIds,
        ONE_NIGHT_INN_VOUCHER_ID,
        1,
      ),
    );

    const updatedCharacter: Character = {
      ...itemUseResult.character,
      version: character.version + 1,
      inventoryItemIds: inventoryChange.inventoryItemIds,
      lastRestAt: restedAt,
      updatedAt: restedAt,
    };

    this.characters.set(updatedCharacter.id, updatedCharacter);
    this.persistCharacter(updatedCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    const snapshotAfterRest = createCharacterSnapshot(updatedCharacter);

    return {
      character: snapshotAfterRest,
      rest: {
        paymentMethod: 'voucher',
        priceBronze: 0,
        voucherItemId: ONE_NIGHT_INN_VOUCHER_ID,
        previousMoneyBronze: character.moneyBronze,
        nextMoneyBronze: updatedCharacter.moneyBronze,
        previousCurrentState: snapshotBeforeRest.currentState,
        nextCurrentState: snapshotAfterRest.currentState,
        restedAt,
      },
    };
  }

  private buildStartingKitPreview(starterKit: StarterKitDefinition) {
    const itemQuantityById = new Map<ItemId, number>();

    for (const itemId of starterKit.startingItemIds) {
      itemQuantityById.set(itemId, (itemQuantityById.get(itemId) ?? 0) + 1);
    }

    return {
      id: starterKit.id,
      name: starterKit.name,
      moneyBronze: starterKit.startingMoneyBronze,
      items: Array.from(itemQuantityById.entries()).map(
        ([itemId, quantity]) => {
          const itemDefinition = getItemDefinitionById(itemId);

          return {
            itemId,
            name: itemDefinition.name,
            quantity,
          };
        },
      ),
    };
  }

  private calculateTotalExpRequiredForLevel(level: number): number {
    const normalizedLevel = Math.max(1, Math.floor(level));

    if (normalizedLevel <= 1) {
      return 0;
    }

    let totalExp = 0;

    for (
      let currentLevel = 1;
      currentLevel < normalizedLevel;
      currentLevel += 1
    ) {
      totalExp += Math.floor(
        BASE_EXP_REQUIRED_FOR_LEVEL_UP *
          currentLevel *
          EXP_LEVEL_GROWTH_FACTOR ** (currentLevel - 1),
      );
    }

    return totalExp;
  }

  private calculateLevelFromTotalExp(totalExp: number): number {
    const safeTotalExp = Math.max(0, Math.floor(totalExp));
    let nextLevel = 1;

    while (
      nextLevel < MAX_CHARACTER_LEVEL &&
      safeTotalExp >= this.calculateTotalExpRequiredForLevel(nextLevel + 1)
    ) {
      nextLevel += 1;
    }

    return nextLevel;
  }

  private calculateProgressionReward(
    previousLevel: number,
    previousExp: number,
    expGained: number,
  ): CharacterProgressionRewardResult {
    const safePreviousLevel = Math.min(
      MAX_CHARACTER_LEVEL,
      Math.max(1, this.assertSafeExperienceInteger(previousLevel, 'Level')),
    );

    const safePreviousExp = this.assertSafeExperienceTotal(
      previousExp,
      'Previous EXP',
    );

    const safeExpGained = this.assertSafeExperienceGain(expGained);

    const nextExp = safePreviousExp + safeExpGained;

    this.assertSafeExperienceTotal(nextExp, 'Next EXP');

    const nextLevel = Math.max(
      safePreviousLevel,
      this.calculateLevelFromTotalExp(nextExp),
    );

    return {
      previousLevel: safePreviousLevel,
      nextLevel,

      previousExp: safePreviousExp,
      nextExp,

      expGained: safeExpGained,

      leveledUp: nextLevel > safePreviousLevel,
      levelsGained: Math.max(0, nextLevel - safePreviousLevel),
    };
  }

  private runInventoryOperationOrThrowBadRequest<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Inventory operation failed.';

      throw new BadRequestException(message);
    }
  }

  private countItemIds(itemIds: readonly ItemId[]): Map<ItemId, number> {
    const counts = new Map<ItemId, number>();

    for (const itemId of itemIds) {
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    }

    return counts;
  }

  private removeItemCopies(
    inventoryItemIds: readonly ItemId[],
    itemId: ItemId,
    quantity: number,
  ): ItemId[] {
    let remainingToRemove = quantity;
    const nextInventoryItemIds: ItemId[] = [];

    for (const currentItemId of inventoryItemIds) {
      if (currentItemId === itemId && remainingToRemove > 0) {
        remainingToRemove -= 1;
        continue;
      }

      nextInventoryItemIds.push(currentItemId);
    }

    return nextInventoryItemIds;
  }

  private reconcileInventoryAfterBattle(
    currentInventoryItemIds: readonly ItemId[],
    options: ApplyBattleRewardOptions,
  ): ItemId[] {
    if (!options.battleInventoryItemIds) {
      return [...currentInventoryItemIds];
    }

    if (!options.battleStartingInventoryItemIds) {
      return [...options.battleInventoryItemIds];
    }

    const startingCounts = this.countItemIds(
      options.battleStartingInventoryItemIds,
    );
    const endingCounts = this.countItemIds(options.battleInventoryItemIds);
    let nextInventoryItemIds = [...currentInventoryItemIds];

    for (const [itemId, startingQuantity] of startingCounts.entries()) {
      const endingQuantity = endingCounts.get(itemId) ?? 0;
      const consumedQuantity = Math.max(0, startingQuantity - endingQuantity);

      if (consumedQuantity > 0) {
        nextInventoryItemIds = this.removeItemCopies(
          nextInventoryItemIds,
          itemId,
          consumedQuantity,
        );
      }
    }

    for (const [itemId, endingQuantity] of endingCounts.entries()) {
      const startingQuantity = startingCounts.get(itemId) ?? 0;
      const gainedQuantity = Math.max(0, endingQuantity - startingQuantity);

      if (gainedQuantity > 0) {
        nextInventoryItemIds = this.runInventoryOperationOrThrowBadRequest(() =>
          addItemQuantityToInventory(
            nextInventoryItemIds,
            itemId,
            gainedQuantity,
          ),
        ).inventoryItemIds;
      }
    }

    return nextInventoryItemIds;
  }

  private assertSafeExperienceInteger(value: number, label: string): number {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${label} must be a finite number.`);
    }

    const normalizedValue = Math.floor(value);

    if (!Number.isSafeInteger(normalizedValue)) {
      throw new BadRequestException(`${label} must be a safe integer.`);
    }

    if (normalizedValue < 0) {
      throw new BadRequestException(`${label} must not be negative.`);
    }

    return normalizedValue;
  }

  private assertSafeExperienceTotal(value: number, label: string): number {
    const normalizedValue = this.assertSafeExperienceInteger(value, label);

    if (normalizedValue > MAX_SAFE_TOTAL_EXP) {
      throw new BadRequestException(
        `${label} exceeds the safe EXP total limit.`,
      );
    }

    return normalizedValue;
  }

  private assertSafeExperienceGain(expGained: number): number {
    const normalizedValue = this.assertSafeExperienceInteger(
      expGained,
      'Reward EXP',
    );

    if (normalizedValue > MAX_SAFE_REWARD_EXP) {
      throw new BadRequestException(
        'Reward EXP exceeds the safe reward EXP limit.',
      );
    }

    return normalizedValue;
  }

  private assertInventoryItemIsConsumableForContext(
    itemId: ItemId,
    context: ItemUseContext,
  ): void {
    try {
      getConsumableItemDefinitionForUse(itemId, context);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Item ${itemId} is not consumable.`;

      throw new BadRequestException(message);
    }
  }

  private assertInventoryItemIsEquipment(itemId: ItemId): void {
    try {
      equipItem([], itemId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Item ${itemId} is not equipment.`;

      throw new BadRequestException(message);
    }
  }

  private assertKnownInventoryItem(itemId: ItemId): void {
    if (!hasItemDefinition(itemId)) {
      throw new BadRequestException(`Item definition not found: ${itemId}`);
    }
  }

  private assertConsumableIsAllowedFromInventory(itemId: ItemId): void {
    const itemDefinition = getItemDefinitionById(itemId);

    const hasRestEffect =
      itemDefinition.consumable?.effects.some(
        (effect) => effect.type === 'rest',
      ) ?? false;

    if (hasRestEffect) {
      throw new BadRequestException(
        `Item ${itemId} can only be used through an inn service.`,
      );
    }
  }

  private normalizePositiveInventoryMutationQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) {
      throw new BadRequestException(
        'Item quantity must be a positive integer.',
      );
    }

    const normalizedQuantity = Math.floor(quantity);

    if (normalizedQuantity <= 0) {
      throw new BadRequestException(
        'Item quantity must be a positive integer.',
      );
    }

    if (!Number.isSafeInteger(normalizedQuantity)) {
      throw new BadRequestException('Item quantity must be a safe integer.');
    }

    return normalizedQuantity;
  }

  private assertInventoryHasQuantity(
    character: Character,
    itemId: ItemId,
    quantity: number,
  ): void {
    const currentQuantity = countInventoryItem(
      character.inventoryItemIds,
      itemId,
    );

    if (currentQuantity < quantity) {
      throw new BadRequestException(
        `Not enough item ${itemId} in inventory. Required ${quantity}, available ${currentQuantity}.`,
      );
    }
  }

  private findEntityById(id: string): Character {
    const character = this.characters.get(id);

    if (!character) {
      throw new NotFoundException(`Character not found: ${id}`);
    }

    return character;
  }

  private assertCharacterBelongsToUserScope(
    character: Character,
    userScope: string,
  ): void {
    if (!character.userId) {
      throw new BadRequestException(
        `Character ${character.id} does not have an owner user scope.`,
      );
    }

    if (character.userId !== userScope) {
      throw new NotFoundException(
        `Character not found in user scope: ${character.id}`,
      );
    }
  }

  private findCharactersByUserScope(userScope: string): Character[] {
    return Array.from(this.characters.values()).filter(
      (character) => character.userId === userScope,
    );
  }

  private selectLatestCharacter(
    currentCandidate: Character | undefined,
    nextCandidate: Character,
  ): Character {
    if (!currentCandidate) {
      return nextCandidate;
    }

    const currentUpdatedAt = Date.parse(currentCandidate.updatedAt);
    const nextUpdatedAt = Date.parse(nextCandidate.updatedAt);

    if (Number.isFinite(currentUpdatedAt) && Number.isFinite(nextUpdatedAt)) {
      if (nextUpdatedAt > currentUpdatedAt) {
        return nextCandidate;
      }

      if (nextUpdatedAt < currentUpdatedAt) {
        return currentCandidate;
      }
    }

    const currentCreatedAt = Date.parse(currentCandidate.createdAt);
    const nextCreatedAt = Date.parse(nextCandidate.createdAt);

    if (Number.isFinite(currentCreatedAt) && Number.isFinite(nextCreatedAt)) {
      if (nextCreatedAt > currentCreatedAt) {
        return nextCandidate;
      }

      if (nextCreatedAt < currentCreatedAt) {
        return currentCandidate;
      }
    }

    return nextCandidate.id.localeCompare(currentCandidate.id) > 0
      ? nextCandidate
      : currentCandidate;
  }

  private findLatestCharacterForUserScope(
    userScope: string,
  ): Character | undefined {
    let latestCharacter: Character | undefined;

    for (const character of this.findCharactersByUserScope(userScope)) {
      latestCharacter = this.selectLatestCharacter(latestCharacter, character);
    }

    return latestCharacter;
  }

  private findFallbackCurrentCharacter(
    userScope: string,
  ): CharacterSnapshot | null {
    const fallbackCharacter = this.findLatestCharacterForUserScope(userScope);

    if (!fallbackCharacter) {
      this.currentCharacterIdsByUserScope.delete(userScope);
      this.deletePersistedCurrentCharacter(userScope);

      return null;
    }

    this.currentCharacterIdsByUserScope.set(userScope, fallbackCharacter.id);
    this.persistCurrentCharacter(userScope, fallbackCharacter.id);

    return createCharacterSnapshot(fallbackCharacter);
  }

  private repairCurrentCharacterForUserScope(userScope: string): void {
    const currentCharacterId =
      this.currentCharacterIdsByUserScope.get(userScope);

    if (currentCharacterId) {
      const currentCharacter = this.characters.get(currentCharacterId);

      if (currentCharacter && currentCharacter.userId === userScope) {
        return;
      }

      this.currentCharacterIdsByUserScope.delete(userScope);
    }

    const fallbackCharacter = this.findLatestCharacterForUserScope(userScope);

    if (!fallbackCharacter) {
      this.currentCharacterIdsByUserScope.delete(userScope);
      this.deletePersistedCurrentCharacter(userScope);

      return;
    }

    this.currentCharacterIdsByUserScope.set(userScope, fallbackCharacter.id);
    this.persistCurrentCharacter(userScope, fallbackCharacter.id);
  }

  private async hydrateCharacterStateFromDatabase(): Promise<void> {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    try {
      await this.databaseService.initialize();

      const characters = await this.databaseService.loadCharacters();

      this.characters.clear();

      for (const character of characters) {
        this.characters.set(character.id, character);
      }

      const currentCharacters =
        await this.databaseService.loadCurrentCharacters();

      this.currentCharacterIdsByUserScope.clear();

      for (const currentCharacter of currentCharacters) {
        const character = this.characters.get(currentCharacter.characterId);

        if (character && character.userId === currentCharacter.userId) {
          this.currentCharacterIdsByUserScope.set(
            currentCharacter.userId,
            currentCharacter.characterId,
          );
        }
      }

      for (const character of characters) {
        this.repairCurrentCharacterForUserScope(character.userId);
      }

      this.logger.log(
        `Hydrated ${characters.length} characters from database.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error.';

      this.logger.error(`Failed to hydrate character state: ${message}`);

      throw error;
    }
  }

  private persistCharacter(character: Character): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    void this.databaseService
      .upsertCharacter(character)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown database error.';

        this.logger.error(
          `Failed to persist character ${character.id}: ${message}`,
        );
      });
  }

  private deletePersistedCharacter(characterId: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    void this.databaseService
      .deleteCharacter(characterId)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown database error.';

        this.logger.error(
          `Failed to delete persisted character ${characterId}: ${message}`,
        );
      });
  }

  private persistCurrentCharacter(userId: string, characterId: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    void this.databaseService
      .setCurrentCharacter(userId, characterId)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown database error.';

        this.logger.error(
          `Failed to persist current character for user ${userId}: ${message}`,
        );
      });
  }

  private deletePersistedCurrentCharacter(userId: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    void this.databaseService
      .deleteCurrentCharacter(userId)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown database error.';

        this.logger.error(
          `Failed to delete current character for user ${userId}: ${message}`,
        );
      });
  }

  private persistClearCharacterState(): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    void this.databaseService.clearCharacterState().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unknown database error.';

      this.logger.error(`Failed to clear character state: ${message}`);
    });
  }
}
