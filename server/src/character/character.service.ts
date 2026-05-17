import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCharacterDto } from './dto/create-character.dto';

import { createCharacter } from '../game/character/character.factory';
import { createCharacterSnapshot } from '../game/character/character.calculations';

import type {
  Character,
  CharacterSnapshot,
} from '../game/character/character.types';

type CharacterEntityInput = Character &
  Partial<Pick<CharacterSnapshot, 'baseStats' | 'derivedStats'>>;

@Injectable()
export class CharacterService {
  private readonly characters = new Map<string, Character>();
  private currentCharacterId: string | null = null;

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
    });

    this.characters.set(character.id, character);
    this.currentCharacterId = character.id;

    return createCharacterSnapshot(character);
  }

  findAll(): CharacterSnapshot[] {
    return Array.from(this.characters.values()).map((character) =>
      createCharacterSnapshot(character),
    );
  }

  findCurrent(): CharacterSnapshot | null {
    if (!this.currentCharacterId) {
      return null;
    }

    return this.findById(this.currentCharacterId);
  }

  findById(id: string): CharacterSnapshot {
    const character = this.findEntityById(id);

    return createCharacterSnapshot(character);
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

    if (!this.currentCharacterId) {
      this.currentCharacterId = id;
    }

    return createCharacterSnapshot(updatedCharacter);
  }

  setCurrentCharacter(id: string): CharacterSnapshot {
    const character = this.findEntityById(id);

    this.currentCharacterId = character.id;

    return createCharacterSnapshot(character);
  }

  deleteById(id: string) {
    this.findEntityById(id);

    this.characters.delete(id);

    if (this.currentCharacterId === id) {
      this.currentCharacterId = null;
    }

    return {
      deleted: true,
      id,
    };
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
