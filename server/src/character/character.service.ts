import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCharacterDto } from './dto/create-character.dto';

import { createCharacter } from '../game/character/character.factory';
import type { Character } from '../game/character/character.types';

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

  create(dto: CreateCharacterDto): Character {
    const character = createCharacter({
      name: dto.name,
      classId: dto.classId,
      giftId: dto.giftId,
    });

    this.characters.set(character.id, character);
    this.currentCharacterId = character.id;

    return character;
  }

  findAll(): Character[] {
    return Array.from(this.characters.values());
  }

  findCurrent(): Character | null {
    if (!this.currentCharacterId) {
      return null;
    }

    return this.findById(this.currentCharacterId);
  }

  findById(id: string): Character {
    const character = this.characters.get(id);

    if (!character) {
      throw new NotFoundException(`Character not found: ${id}`);
    }

    return character;
  }

  replaceById(id: string, character: Character): Character {
    if (!this.characters.has(id)) {
      throw new NotFoundException(`Character not found: ${id}`);
    }

    const updatedCharacter: Character = {
      ...character,
      id,
    };

    this.characters.set(id, updatedCharacter);

    if (!this.currentCharacterId) {
      this.currentCharacterId = id;
    }

    return updatedCharacter;
  }

  setCurrentCharacter(id: string): Character {
    const character = this.findById(id);

    this.currentCharacterId = character.id;

    return character;
  }

  deleteById(id: string) {
    const deleted = this.characters.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Character not found: ${id}`);
    }

    if (this.currentCharacterId === id) {
      this.currentCharacterId = null;
    }

    return {
      deleted: true,
      id,
    };
  }
}
