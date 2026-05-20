import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

import { createCharacter } from '../game/character/character.factory';

import {
  clampCurrentState,
  createCharacterSnapshot,
} from '../game/character/character.calculations';

import type {
  Character,
  CharacterSnapshot,
} from '../game/character/character.types';

type CharacterEntityInput = Character &
  Partial<Pick<CharacterSnapshot, 'baseStats' | 'derivedStats'>>;

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

  create(dto: CreateCharacterDto): CharacterSnapshot {
    const userId = this.normalizeRequiredUserId(dto.userId);

    const character = createCharacter({
      name: dto.name,
      originId: dto.originId,
      userId,
    });

    this.characters.set(character.id, character);
    this.currentCharacterIdsByUserScope.set(userId, character.id);

    return createCharacterSnapshot(character);
  }

  findAll(userId?: string): CharacterSnapshot[] {
    const userScope = this.normalizeOptionalUserId(userId);

    return Array.from(this.characters.values())
      .filter((character) => {
        if (!userScope) {
          return true;
        }

        return character.userId === userScope;
      })
      .map((character) => createCharacterSnapshot(character));
  }

  findCurrent(userId?: string): CharacterSnapshot | null {
    const userScope = this.normalizeRequiredUserId(userId);

    const currentCharacterId =
      this.currentCharacterIdsByUserScope.get(userScope);

    if (!currentCharacterId) {
      return null;
    }

    return this.findById(currentCharacterId);
  }

  findById(id: string): CharacterSnapshot {
    const character = this.findEntityById(id);

    return createCharacterSnapshot(character);
  }

  updateById(id: string, dto: UpdateCharacterDto): CharacterSnapshot {
    const existingCharacter = this.findEntityById(id);
    const existingSnapshot = createCharacterSnapshot(existingCharacter);

    const nextUserId = dto.userId
      ? this.normalizeRequiredUserId(dto.userId)
      : existingCharacter.userId;

    const nextCharacter: Character = {
      ...existingCharacter,
      userId: nextUserId,
      name: dto.name ?? existingCharacter.name,
      currentState: clampCurrentState(
        {
          hp: dto.currentState?.hp ?? existingCharacter.currentState.hp,
          mp: dto.currentState?.mp ?? existingCharacter.currentState.mp,
          stamina:
            dto.currentState?.stamina ?? existingCharacter.currentState.stamina,
        },
        existingSnapshot.derivedStats,
      ),
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(id, nextCharacter);
    this.migrateCurrentCharacterScope(existingCharacter, nextCharacter);

    return createCharacterSnapshot(nextCharacter);
  }

  replaceById(
    id: string,
    incomingData: CharacterEntityInput,
  ): CharacterSnapshot {
    this.findEntityById(id);

    const sanitizedCharacter = this.sanitizeCharacterEntity(incomingData);

    const updatedCharacter: Character = {
      ...sanitizedCharacter,
      id,
      userId: this.normalizeRequiredUserId(sanitizedCharacter.userId),
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(id, updatedCharacter);

    if (!this.currentCharacterIdsByUserScope.has(updatedCharacter.userId)) {
      this.currentCharacterIdsByUserScope.set(
        updatedCharacter.userId,
        updatedCharacter.id,
      );
    }

    return createCharacterSnapshot(updatedCharacter);
  }

  setCurrentCharacter(id: string, userId?: string): CharacterSnapshot {
    const userScope = this.normalizeRequiredUserId(userId);
    const character = this.findEntityById(id);

    if (character.userId !== userScope) {
      throw new NotFoundException(`Character not found in user scope: ${id}`);
    }

    this.currentCharacterIdsByUserScope.set(userScope, character.id);

    return createCharacterSnapshot(character);
  }

  deleteById(id: string) {
    this.findEntityById(id);

    this.characters.delete(id);

    for (const [
      userScope,
      currentCharacterId,
    ] of this.currentCharacterIdsByUserScope.entries()) {
      if (currentCharacterId === id) {
        this.currentCharacterIdsByUserScope.delete(userScope);
      }
    }

    return {
      deleted: true,
      id,
    };
  }

  private migrateCurrentCharacterScope(
    previousCharacter: Character,
    nextCharacter: Character,
  ): void {
    const previousScope = previousCharacter.userId;
    const nextScope = nextCharacter.userId;

    if (previousScope !== nextScope) {
      const previousCurrentId =
        this.currentCharacterIdsByUserScope.get(previousScope);

      if (previousCurrentId === nextCharacter.id) {
        this.currentCharacterIdsByUserScope.delete(previousScope);
      }
    }

    if (!this.currentCharacterIdsByUserScope.has(nextScope)) {
      this.currentCharacterIdsByUserScope.set(nextScope, nextCharacter.id);
    }
  }

  private normalizeRequiredUserId(userId?: string | null): string {
    const normalizedUserId = userId?.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    return normalizedUserId;
  }

  private normalizeOptionalUserId(userId?: string | null): string | undefined {
    const normalizedUserId = userId?.trim();

    return normalizedUserId || undefined;
  }

  private findEntityById(id: string): Character {
    const character = this.characters.get(id);

    if (!character) {
      throw new NotFoundException(`Character not found: ${id}`);
    }

    return character;
  }

  private sanitizeCharacterEntity(input: CharacterEntityInput): Character {
    return {
      id: input.id,
      version: input.version,

      userId: input.userId,

      name: input.name,
      originId: input.originId,

      progression: input.progression,

      moneyBronze: input.moneyBronze,

      stats: input.stats,
      currentState: input.currentState,

      passiveIds: input.passiveIds,

      learnedSkillIds: input.learnedSkillIds,
      equippedSkillIds: input.equippedSkillIds,

      starterKitId: input.starterKitId,

      inventoryItemIds: input.inventoryItemIds,
      equippedItemIds: input.equippedItemIds,

      fatigue: input.fatigue,
      lastRestAt: input.lastRestAt,

      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }
}
