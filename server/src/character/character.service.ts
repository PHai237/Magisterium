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

import { createCharacterSnapshot } from '../game/character/character.calculations';

import type {
  Character,
  CharacterSnapshot,
} from '../game/character/character.types';

type CreateCharacterCommand = CreateCharacterDto & {
  userId: string;
};

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
