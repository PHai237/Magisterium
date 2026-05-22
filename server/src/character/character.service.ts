import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

import {
  normalizeCharacterName,
  normalizeOptionalCharacterName,
  normalizeRequiredUserId,
} from './character.validation';

import { createCharacter } from '../game/character/character.factory';

import {
  addBronze,
  createCharacterSnapshot,
} from '../game/character/character.calculations';

import type {
  Character,
  CharacterSnapshot,
  ItemId,
} from '../game/character/character.types';

import type {
  AppliedBattleRewardResult,
  BattleRewardSummary,
  CharacterProgressionRewardResult,
  RewardItemStack,
} from '../game/reward/reward.types';

type CreateCharacterCommand = CreateCharacterDto & {
  userId: string;
};

const BASE_EXP_REQUIRED_FOR_LEVEL_UP = 100;
const EXP_LEVEL_GROWTH_FACTOR = 1.5;
const MAX_CHARACTER_LEVEL = 100;

@Injectable()
export class CharacterService {
  private readonly characters = new Map<string, Character>();
  private readonly currentCharacterIdsByUserScope = new Map<string, string>();

  ping() {
    return {
      status: 'ok',
      module: 'character',
      message: 'Character module is ready.',
    };
  }

  create(dto: CreateCharacterCommand): CharacterSnapshot {
    const userId = normalizeRequiredUserId(dto.userId);
    const name = normalizeCharacterName(dto.name);

    const character = createCharacter({
      name,
      originId: dto.originId,
      userId,
    });

    this.characters.set(character.id, character);
    this.currentCharacterIdsByUserScope.set(userId, character.id);

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
    this.repairCurrentCharacterForUserScope(userScope);

    return createCharacterSnapshot(nextCharacter);
  }

  applyBattleReward(
    characterId: string,
    userId: string,
    reward: BattleRewardSummary,
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

    const nextCharacter: Character = {
      ...existingCharacter,

      progression: {
        ...existingCharacter.progression,
        level: progressionResult.nextLevel,
        exp: progressionResult.nextExp,
      },

      moneyBronze: addBronze(existingCharacter.moneyBronze, reward.moneyBronze),

      inventoryItemIds: [
        ...existingCharacter.inventoryItemIds,
        ...this.expandRewardItemStacks(reward.items),
      ],

      updatedAt: new Date().toISOString(),
    };

    this.characters.set(characterId, nextCharacter);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      character: createCharacterSnapshot(nextCharacter),
      reward,
      progression: progressionResult,
    };
  }

  setCurrentCharacter(id: string, userId: string): CharacterSnapshot {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(id);

    this.assertCharacterBelongsToUserScope(character, userScope);

    this.currentCharacterIdsByUserScope.set(userScope, character.id);

    return createCharacterSnapshot(character);
  }

  deleteById(id: string, userId: string) {
    const userScope = normalizeRequiredUserId(userId);
    const character = this.findEntityById(id);

    this.assertCharacterBelongsToUserScope(character, userScope);

    this.characters.delete(id);
    this.repairCurrentCharacterForUserScope(userScope);

    return {
      deleted: true,
      id,
    };
  }

  clearCharacters(): void {
    this.characters.clear();
    this.currentCharacterIdsByUserScope.clear();
  }

  private expandRewardItemStacks(items: RewardItemStack[]): ItemId[] {
    const expandedItemIds: ItemId[] = [];

    for (const item of items) {
      const quantity = Math.max(0, Math.floor(item.quantity));

      for (let index = 0; index < quantity; index += 1) {
        expandedItemIds.push(item.itemId);
      }
    }

    return expandedItemIds;
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
    const safePreviousLevel = Math.max(1, Math.floor(previousLevel));
    const safePreviousExp = Math.max(0, Math.floor(previousExp));
    const safeExpGained = Math.max(0, Math.floor(expGained));

    const nextExp = safePreviousExp + safeExpGained;
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

      return null;
    }

    this.currentCharacterIdsByUserScope.set(userScope, fallbackCharacter.id);

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

      return;
    }

    this.currentCharacterIdsByUserScope.set(userScope, fallbackCharacter.id);
  }
}
