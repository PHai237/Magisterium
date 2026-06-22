import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';

import { PreviewCharacterDto } from './dto/preview-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import type {
  ApplyBattleRewardOptions,
  ApplyExplorationSearchResultOptions,
  CharacterConsumableUseResult,
  CharacterCraftInventoryItemCommand,
  CharacterCraftInventoryItemResult,
  CharacterEquipmentMutationResult,
  CharacterInnRestResult,
  CharacterInventoryMutationResult,
  CharacterMarketTransactionResult,
  CreateCharacterCommand,
} from './character-service.types';
import { CharacterPersistenceCoordinator } from './character-persistence.coordinator';
import {
  assertConsumableIsAllowedFromInventory,
  assertInventoryHasQuantity,
  assertInventoryItemIsConsumableForContext,
  assertInventoryItemIsEquipment,
  assertKnownInventoryItem,
  buildSanctuaryStatusResult,
  buildStartingKitPreview,
  calculateMarketTotalPrice,
  normalizeNonNegativeBronzeAmount,
  normalizeNonNegativeExplorationStaminaCost,
  normalizePositiveInventoryMutationQuantity,
  normalizeSanctuaryStatKey,
  reconcileInventoryAfterBattle,
  runInventoryOperationOrThrowBadRequest,
} from './character-domain.helpers';

import {
  normalizeCharacterName,
  normalizeOptionalCharacterName,
  normalizeRequiredUserId,
} from './character.validation';

import { DatabaseService } from '../database/database.service';

import { BattleService } from '../game/battle/battle.service';

import { createCharacter } from '../game/character/character.factory';

import {
  addBronze,
  buildCurrentState,
  buildStatsForOrigin,
  calculateBaseStats,
  calculateDerivedStats,
  createCharacterSnapshot,
  createStatProgress,
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

import type { InventoryItemStack } from '../game/inventory/inventory.types';

import {
  SANCTUARY_FRAGMENT_COST_PER_RUNE,
  STAT_FRAGMENT_ITEM_ID_BY_STAT,
  STAT_RUNE_ITEM_ID_BY_STAT,
} from '../game/sanctuary/sanctuary.constants';
import { calculateRankStatus } from '../game/sanctuary/sanctuary-rank.calculations';

import type {
  CharacterRankUpResult,
  CharacterRuneImbueResult,
  CharacterRuneRefinementResult,
  CharacterSanctuaryStatusResult,
} from '../game/sanctuary/sanctuary.types';

import {
  equipItem,
  unequipItem,
} from '../game/inventory/equipment.calculations';

import { applyConsumableItemEffectsToCharacter } from '../game/inventory/consumable.calculations';

import type {
  Character,
  CharacterCreationPreview,
  CharacterSnapshot,
  CurrentState,
  ItemId,
  StatKey,
} from '../game/character/character.types';

import type {
  AppliedBattleRewardResult,
  BattleRewardSummary,
} from '../game/reward/reward.types';

const BASIC_INN_REST_PRICE_BRONZE = 2;
const ONE_NIGHT_INN_PASS_ID: ItemId = 'one_night_inn_pass';

const MAX_CHARACTERS_PER_USER = 3;

@Injectable()
export class CharacterService implements OnModuleInit {
  private readonly characters = new Map<string, Character>();
  private readonly currentCharacterIdsByUserScope = new Map<string, string>();
  private readonly persistence: CharacterPersistenceCoordinator;

  private readonly logger = new Logger(CharacterService.name);

  constructor(
    @Optional()
    private readonly databaseService?: DatabaseService,

    @Optional()
    @Inject(forwardRef(() => BattleService))
    private readonly battleService?: BattleService,
  ) {
    this.persistence = new CharacterPersistenceCoordinator(databaseService);
  }

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

  completePersistence<T>(result: T): T | Promise<T> {
    if (!this.databaseService?.isEnabled()) {
      return result;
    }

    return this.flushPersistence().then(() => result);
  }

  async flushPersistence(): Promise<void> {
    await this.persistence.flush();
    await this.battleService?.flushPersistence();
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

      startingKit: buildStartingKitPreview(starterKitDef),
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

    const inventoryAfterBattle = reconcileInventoryAfterBattle(
      existingCharacter.inventoryItemIds,
      options,
    );

    const nextInventoryItemIds = runInventoryOperationOrThrowBadRequest(() =>
      addItemStacksToInventory(inventoryAfterBattle, reward.items),
    );

    const nextCharacter: Character = {
      ...existingCharacter,

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
    };
  }

  applyExplorationSearchResult(
    characterId: string,
    userId: string,
    options: ApplyExplorationSearchResultOptions,
  ): CharacterSnapshot {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);

    const staminaCost = normalizeNonNegativeExplorationStaminaCost(
      options.staminaCost,
    );

    const snapshotBeforeSearch = createCharacterSnapshot(existingCharacter);

    if (snapshotBeforeSearch.currentState.stamina < staminaCost) {
      throw new BadRequestException(
        `Not enough stamina to search. Required ${staminaCost}, available ${snapshotBeforeSearch.currentState.stamina}.`,
      );
    }

    const itemRewards = options.items ?? [];

    for (const itemReward of itemRewards) {
      assertKnownInventoryItem(itemReward.itemId);
      normalizePositiveInventoryMutationQuantity(itemReward.quantity);
    }

    const nextInventoryItemIds = runInventoryOperationOrThrowBadRequest(() =>
      addItemStacksToInventory(existingCharacter.inventoryItemIds, itemRewards),
    );

    const moneyBronze = options.moneyBronze ?? 0;

    if (
      !Number.isFinite(moneyBronze) ||
      !Number.isSafeInteger(Math.floor(moneyBronze))
    ) {
      throw new BadRequestException(
        'Exploration bronze reward must be a safe integer.',
      );
    }

    if (moneyBronze < 0) {
      throw new BadRequestException(
        'Exploration bronze reward must not be negative.',
      );
    }

    const nextCurrentState: CurrentState = {
      ...snapshotBeforeSearch.currentState,
      stamina: snapshotBeforeSearch.currentState.stamina - staminaCost,
    };

    const nextCharacter: Character = {
      ...existingCharacter,
      moneyBronze: addBronze(
        existingCharacter.moneyBronze,
        Math.floor(moneyBronze),
      ),
      inventoryItemIds: nextInventoryItemIds,
      equippedItemIds: existingCharacter.equippedItemIds.filter(
        (equippedItemId) => nextInventoryItemIds.includes(equippedItemId),
      ),
      currentState: nextCurrentState,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return createCharacterSnapshot(nextCharacter);
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
    assertKnownInventoryItem(itemId);

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
      normalizePositiveInventoryMutationQuantity(quantity);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertKnownInventoryItem(itemId);

    const inventoryChange = runInventoryOperationOrThrowBadRequest(() =>
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
      normalizePositiveInventoryMutationQuantity(quantity);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertKnownInventoryItem(itemId);
    assertInventoryHasQuantity(existingCharacter, itemId, normalizedQuantity);

    const inventoryChange = runInventoryOperationOrThrowBadRequest(() =>
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

  craftInventoryItem(
    characterId: string,
    userId: string,
    command: CharacterCraftInventoryItemCommand,
  ): CharacterCraftInventoryItemResult {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);
    const outputQuantity = normalizePositiveInventoryMutationQuantity(
      command.outputQuantity,
    );
    const bronzeCost = normalizeNonNegativeBronzeAmount(
      command.bronzeCost,
      'Smithing fee',
    );

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertKnownInventoryItem(command.outputItemId);
    assertInventoryItemIsEquipment(command.outputItemId);

    const requiredQuantityByItemId = new Map<ItemId, number>();

    for (const requiredItem of command.requiredItems) {
      assertKnownInventoryItem(requiredItem.itemId);

      const requiredQuantity = normalizePositiveInventoryMutationQuantity(
        requiredItem.quantity,
      );

      requiredQuantityByItemId.set(
        requiredItem.itemId,
        (requiredQuantityByItemId.get(requiredItem.itemId) ?? 0) +
          requiredQuantity,
      );
    }

    if (existingCharacter.moneyBronze < bronzeCost) {
      throw new BadRequestException(
        `Not enough bronze. Required ${bronzeCost}, available ${existingCharacter.moneyBronze}.`,
      );
    }

    for (const [itemId, quantity] of requiredQuantityByItemId.entries()) {
      assertInventoryHasQuantity(existingCharacter, itemId, quantity);
    }

    let nextInventoryItemIds = [...existingCharacter.inventoryItemIds];

    for (const [itemId, quantity] of requiredQuantityByItemId.entries()) {
      nextInventoryItemIds = runInventoryOperationOrThrowBadRequest(() =>
        removeItemQuantityFromInventory(nextInventoryItemIds, itemId, quantity),
      ).inventoryItemIds;
    }

    const outputInventoryChange = runInventoryOperationOrThrowBadRequest(() =>
      addItemQuantityToInventory(
        nextInventoryItemIds,
        command.outputItemId,
        outputQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      moneyBronze: existingCharacter.moneyBronze - bronzeCost,
      inventoryItemIds: outputInventoryChange.inventoryItemIds,
      equippedItemIds: existingCharacter.equippedItemIds.filter(
        (equippedItemId) =>
          outputInventoryChange.inventoryItemIds.includes(equippedItemId),
      ),
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      craft: {
        outputItemId: command.outputItemId,
        outputQuantity,
        consumedItems: Array.from(requiredQuantityByItemId.entries()).map(
          ([itemId, quantity]) => ({
            itemId,
            quantity,
          }),
        ),
        consumedBronze: bronzeCost,
        previousMoneyBronze: existingCharacter.moneyBronze,
        nextMoneyBronze: nextCharacter.moneyBronze,
      },
    };
  }

  buyMarketItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
    quantity: number,
    unitPriceBronze: number,
  ): CharacterMarketTransactionResult {
    const userScope = normalizeRequiredUserId(userId);
    const normalizedQuantity =
      normalizePositiveInventoryMutationQuantity(quantity);
    const normalizedUnitPrice = normalizeNonNegativeBronzeAmount(
      unitPriceBronze,
      'Market item price',
    );
    const totalPriceBronze = calculateMarketTotalPrice(
      normalizedUnitPrice,
      normalizedQuantity,
    );
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertKnownInventoryItem(itemId);

    if (existingCharacter.moneyBronze < totalPriceBronze) {
      throw new BadRequestException(
        `Not enough bronze. Required ${totalPriceBronze}, available ${existingCharacter.moneyBronze}.`,
      );
    }

    const inventoryChange = runInventoryOperationOrThrowBadRequest(() =>
      addItemQuantityToInventory(
        existingCharacter.inventoryItemIds,
        itemId,
        normalizedQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      moneyBronze: existingCharacter.moneyBronze - totalPriceBronze,
      inventoryItemIds: inventoryChange.inventoryItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      transaction: {
        type: 'buy',
        itemId,
        quantity: normalizedQuantity,
        unitPriceBronze: normalizedUnitPrice,
        totalPriceBronze,
        previousMoneyBronze: existingCharacter.moneyBronze,
        nextMoneyBronze: nextCharacter.moneyBronze,
        inventoryChange,
      },
    };
  }

  sellMarketItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
    quantity: number,
    unitPriceBronze: number,
  ): CharacterMarketTransactionResult {
    const userScope = normalizeRequiredUserId(userId);
    const normalizedQuantity =
      normalizePositiveInventoryMutationQuantity(quantity);
    const normalizedUnitPrice = normalizeNonNegativeBronzeAmount(
      unitPriceBronze,
      'Market item price',
    );
    const totalPriceBronze = calculateMarketTotalPrice(
      normalizedUnitPrice,
      normalizedQuantity,
    );
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertKnownInventoryItem(itemId);
    assertInventoryHasQuantity(existingCharacter, itemId, normalizedQuantity);

    const inventoryChange = runInventoryOperationOrThrowBadRequest(() =>
      removeItemQuantityFromInventory(
        existingCharacter.inventoryItemIds,
        itemId,
        normalizedQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      moneyBronze: addBronze(existingCharacter.moneyBronze, totalPriceBronze),
      inventoryItemIds: inventoryChange.inventoryItemIds,
      equippedItemIds: existingCharacter.equippedItemIds.filter(
        (equippedItemId) =>
          inventoryChange.inventoryItemIds.includes(equippedItemId),
      ),
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      transaction: {
        type: 'sell',
        itemId,
        quantity: normalizedQuantity,
        unitPriceBronze: normalizedUnitPrice,
        totalPriceBronze,
        previousMoneyBronze: existingCharacter.moneyBronze,
        nextMoneyBronze: nextCharacter.moneyBronze,
        inventoryChange,
      },
    };
  }

  equipInventoryItem(
    characterId: string,
    userId: string,
    itemId: ItemId,
  ): CharacterEquipmentMutationResult {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertKnownInventoryItem(itemId);
    assertInventoryHasQuantity(existingCharacter, itemId, 1);
    assertInventoryItemIsEquipment(itemId);

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
    assertKnownInventoryItem(itemId);
    assertInventoryItemIsEquipment(itemId);

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
    assertKnownInventoryItem(itemId);
    assertInventoryHasQuantity(existingCharacter, itemId, 1);
    assertInventoryItemIsConsumableForContext(itemId, 'out_of_battle');
    assertConsumableIsAllowedFromInventory(itemId);

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
      ? runInventoryOperationOrThrowBadRequest(() =>
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

  getSanctuaryStatus(
    characterId: string,
    userId: string,
  ): CharacterSanctuaryStatusResult {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(character, userScope);

    return buildSanctuaryStatusResult(character);
  }

  refineStatRune(
    characterId: string,
    userId: string,
    statKey: StatKey,
    quantity = 1,
  ): CharacterRuneRefinementResult {
    const userScope = normalizeRequiredUserId(userId);
    const normalizedStatKey = normalizeSanctuaryStatKey(statKey);
    const normalizedQuantity =
      normalizePositiveInventoryMutationQuantity(quantity);
    const consumedFragmentQuantity =
      SANCTUARY_FRAGMENT_COST_PER_RUNE * normalizedQuantity;
    const fragmentItemId = STAT_FRAGMENT_ITEM_ID_BY_STAT[normalizedStatKey];
    const runeItemId = STAT_RUNE_ITEM_ID_BY_STAT[normalizedStatKey];
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertInventoryHasQuantity(
      existingCharacter,
      fragmentItemId,
      consumedFragmentQuantity,
    );

    const removedFragments = runInventoryOperationOrThrowBadRequest(() =>
      removeItemQuantityFromInventory(
        existingCharacter.inventoryItemIds,
        fragmentItemId,
        consumedFragmentQuantity,
      ),
    );

    const createdRune = runInventoryOperationOrThrowBadRequest(() =>
      addItemQuantityToInventory(
        removedFragments.inventoryItemIds,
        runeItemId,
        normalizedQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      inventoryItemIds: createdRune.inventoryItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      ...buildSanctuaryStatusResult(nextCharacter),
      refinement: {
        statKey: normalizedStatKey,
        consumedItemId: fragmentItemId,
        consumedQuantity: consumedFragmentQuantity,
        createdItemId: runeItemId,
        createdQuantity: normalizedQuantity,
      },
    };
  }

  imbueStatRune(
    characterId: string,
    userId: string,
    statKey: StatKey,
    quantity = 1,
  ): CharacterRuneImbueResult {
    const userScope = normalizeRequiredUserId(userId);
    const normalizedStatKey = normalizeSanctuaryStatKey(statKey);
    const normalizedQuantity =
      normalizePositiveInventoryMutationQuantity(quantity);
    const runeItemId = STAT_RUNE_ITEM_ID_BY_STAT[normalizedStatKey];
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);
    assertInventoryHasQuantity(
      existingCharacter,
      runeItemId,
      normalizedQuantity,
    );

    const previousProgress = existingCharacter.stats[normalizedStatKey];
    const previousAccumulatedBonus = previousProgress.accumulatedBonus;
    const nextStatProgress = createStatProgress(
      previousProgress.currentValue,
      previousProgress.fragmentCount,
      previousAccumulatedBonus + normalizedQuantity,
    );

    if (
      nextStatProgress.accumulatedBonus !==
      previousAccumulatedBonus + normalizedQuantity
    ) {
      throw new BadRequestException(
        `${normalizedStatKey} rune imbue quantity exceeds the stat bonus cap.`,
      );
    }

    const removedRune = runInventoryOperationOrThrowBadRequest(() =>
      removeItemQuantityFromInventory(
        existingCharacter.inventoryItemIds,
        runeItemId,
        normalizedQuantity,
      ),
    );

    const nextCharacter: Character = {
      ...existingCharacter,
      stats: {
        ...existingCharacter.stats,
        [normalizedStatKey]: nextStatProgress,
      },
      inventoryItemIds: removedRune.inventoryItemIds,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      ...buildSanctuaryStatusResult(nextCharacter),
      imbue: {
        statKey: normalizedStatKey,
        consumedItemId: runeItemId,
        consumedQuantity: normalizedQuantity,
        previousAccumulatedBonus,
        nextAccumulatedBonus:
          nextCharacter.stats[normalizedStatKey].accumulatedBonus,
      },
    };
  }

  rankUpAtSanctuary(
    characterId: string,
    userId: string,
  ): CharacterRankUpResult {
    const userScope = normalizeRequiredUserId(userId);
    const existingCharacter = this.findEntityById(characterId);

    this.assertCharacterBelongsToUserScope(existingCharacter, userScope);

    const rankStatus = calculateRankStatus(existingCharacter);

    if (!rankStatus.nextRank || !rankStatus.isEligibleForRankUp) {
      throw new BadRequestException(
        'Character has not reached the next rank average stat threshold.',
      );
    }

    const nextRank = rankStatus.nextRank;
    const nextProgression = {
      ...existingCharacter.progression,
      rankIndex: nextRank.index,
      rankId: nextRank.id,
    };

    const nextCharacter: Character = {
      ...existingCharacter,
      progression: nextProgression,
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.persistCharacter(nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      ...buildSanctuaryStatusResult(nextCharacter),
      rankUp: {
        previousRank: rankStatus.currentRank,
        nextRank,
        averageStatValue: rankStatus.averageStatValue,
      },
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
    this.persistence.forgetCharacter(id);
    this.battleService?.deleteBattlesForCharacterForUserScope(id, userScope);
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
    this.persistence.clearVersions();

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

  restAtInnWithPass(
    characterId: string,
    userId: string,
  ): CharacterInnRestResult {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.characters.get(characterId);

    if (!character || character.userId !== userScope) {
      throw new NotFoundException(`Character not found: ${characterId}`);
    }

    assertInventoryHasQuantity(character, ONE_NIGHT_INN_PASS_ID, 1);

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
      ONE_NIGHT_INN_PASS_ID,
      'out_of_battle',
    );

    const inventoryChange = runInventoryOperationOrThrowBadRequest(() =>
      removeItemQuantityFromInventory(
        itemUseResult.character.inventoryItemIds,
        ONE_NIGHT_INN_PASS_ID,
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
        paymentMethod: 'pass',
        priceBronze: 0,
        passItemId: ONE_NIGHT_INN_PASS_ID,
        previousMoneyBronze: character.moneyBronze,
        nextMoneyBronze: updatedCharacter.moneyBronze,
        previousCurrentState: snapshotBeforeRest.currentState,
        nextCurrentState: snapshotAfterRest.currentState,
        restedAt,
      },
    };
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
      this.persistence.resetVersions(characters);

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

      await this.flushPersistence();

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
    this.persistence.persistCharacter(character, () =>
      this.restoreCharacterAfterPersistenceFailure(character.id),
    );
  }

  private deletePersistedCharacter(characterId: string): void {
    this.persistence.deleteCharacter(characterId);
  }

  private persistCurrentCharacter(userId: string, characterId: string): void {
    this.persistence.setCurrentCharacter(userId, characterId);
  }

  private deletePersistedCurrentCharacter(userId: string): void {
    this.persistence.deleteCurrentCharacter(userId);
  }

  private persistClearCharacterState(): void {
    this.persistence.clearCharacterState();
  }

  private async restoreCharacterAfterPersistenceFailure(
    characterId: string,
  ): Promise<void> {
    try {
      const persistedCharacter =
        await this.databaseService?.loadCharacter(characterId);
      if (persistedCharacter) {
        this.characters.set(characterId, persistedCharacter);
      } else {
        this.characters.delete(characterId);
      }
      this.persistence.restoreVersion(persistedCharacter, characterId);
    } catch (restoreError) {
      const message =
        restoreError instanceof Error
          ? restoreError.message
          : 'Unknown database error.';
      this.logger.error(
        `Failed to restore character ${characterId} after persistence failure: ${message}`,
      );
    }
  }
}
