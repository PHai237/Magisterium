import type {
  Character,
  ClassId,
  GiftId,
} from '../features/character-creation/types';

import { localCharacterRepository } from './localCharacterRepository';

export interface CreateCharacterInput {
  name: string;
  classId: ClassId;
  giftId: GiftId;
}

export interface CurrentCharacterState {
  character: Character | null;
  errorMessage: string;
}

export interface CharacterRepository {
  getCurrentCharacter(): CurrentCharacterState;
  createCharacter(input: CreateCharacterInput): Character;
  saveCurrentCharacter(character: Character): Character;
  clearCurrentCharacter(): void;
}

export const characterRepository: CharacterRepository =
  localCharacterRepository;