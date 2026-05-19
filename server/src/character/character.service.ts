import { Injectable, NotFoundException } from '@nestjs/common';

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

const DEFAULT_USER_SCOPE = '__anonymous__';

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
    const character = createCharacter({
      name: dto.name,
      originId: dto.originId,
      userId: dto.userId,
    });

    this.characters.set(character.id, character);
    this.currentCharacterIdsByUserScope.set(
      this.getUserScope(character.userId),
      character.id,
    );

    return createCharacterSnapshot(character);
  }

  findAll(userId?: string): CharacterSnapshot[] {
    const userScope = userId ? this.getUserScope(userId) : undefined;

    return Array.from(this.characters.values())
      .filter((character) => {
        if (!userScope) {
          return true;
        }

        return this.getUserScope(character.userId) === userScope;
      })
      .map((character) => createCharacterSnapshot(character));
  }

  findCurrent(userId?: string): CharacterSnapshot | null {
    const currentCharacterId = this.currentCharacterIdsByUserScope.get(
      this.getUserScope(userId),
    );

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

    const nextCharacter: Character = {
      ...existingCharacter,
      userId: dto.userId ?? existingCharacter.userId,
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
      updatedAt: new Date().toISOString(),
    };

    this.characters.set(id, updatedCharacter);

    const userScope = this.getUserScope(updatedCharacter.userId);

    if (!this.currentCharacterIdsByUserScope.has(userScope)) {
      this.currentCharacterIdsByUserScope.set(userScope, id);
    }

    return createCharacterSnapshot(updatedCharacter);
  }

  setCurrentCharacter(id: string, userId?: string): CharacterSnapshot {
    const character = this.findEntityById(id);

    if (
      userId &&
      character.userId &&
      this.getUserScope(userId) !== this.getUserScope(character.userId)
    ) {
      throw new NotFoundException(`Character not found in user scope: ${id}`);
    }

    const userScope = this.getUserScope(userId ?? character.userId);

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
    const previousScope = this.getUserScope(previousCharacter.userId);
    const nextScope = this.getUserScope(nextCharacter.userId);

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

  private getUserScope(userId?: string | null): string {
    const normalizedUserId = userId?.trim();

    return normalizedUserId || DEFAULT_USER_SCOPE;
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
