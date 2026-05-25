import {
  CHARACTER_CLASSES,
  LOCAL_STORAGE_KEYS,
  STARTER_GIFTS,
} from '../features/character-creation/constants';

import {
  createCharacter as buildCharacter,
} from '../features/character-creation/calculations';

import type {
  Character,
  SkillDefinition,
} from '../features/character-creation/types';

import type {
  CharacterRepository,
  CreateCharacterInput,
  CurrentCharacterState,
} from './characterRepository';

function getCurrentClassSkillDefinition(
  classId: Character['classId'],
  skillId: string,
): SkillDefinition | null {
  return (
    CHARACTER_CLASSES.find((characterClass) => characterClass.id === classId)
      ?.starterSkills.find((skill) => skill.id === skillId) ?? null
  );
}

function normalizeStoredSkills(parsedCharacter: Character): Character['skills'] {
  if (!Array.isArray(parsedCharacter.skills)) {
    return [];
  }

  return parsedCharacter.skills.map((skill) => {
    const currentSkillDefinition = getCurrentClassSkillDefinition(
      parsedCharacter.classId,
      skill.id,
    );

    return {
      ...(currentSkillDefinition ?? {}),
      ...skill,
      elementType:
        skill.elementType ??
        currentSkillDefinition?.elementType ??
        (skill.effectType === 'damage' ? 'neutral' : null),
    } as SkillDefinition;
  });
}

function normalizeStoredCharacter(rawCharacter: unknown): Character {
  const parsedCharacter = rawCharacter as Character & {
    gold?: number;
    moneyBronze?: number;
    starterGift?: Character['starterGift'] & {
      effectType?: string;
    };
  };

  const normalizedMoneyBronze =
    typeof parsedCharacter.moneyBronze === 'number'
      ? parsedCharacter.moneyBronze
      : typeof parsedCharacter.gold === 'number'
        ? parsedCharacter.gold
        : 0;

  const fallbackStarterGift =
    parsedCharacter.starterGift ??
    STARTER_GIFTS.find((gift) => gift.id === 'stale_bread') ??
    STARTER_GIFTS[0];

  const normalizedStarterGift =
    fallbackStarterGift.effectType === 'starting_gold'
      ? {
          ...fallbackStarterGift,
          effectType: 'starting_money' as const,
        }
      : fallbackStarterGift;

  return {
    ...parsedCharacter,
    version: Math.max(parsedCharacter.version ?? 1, 2),
    moneyBronze: normalizedMoneyBronze,
    starterGift: normalizedStarterGift,
    skills: normalizeStoredSkills(parsedCharacter),
  };
}

function readCurrentCharacterFromStorage(): CurrentCharacterState {
  const rawCharacter = localStorage.getItem(
    LOCAL_STORAGE_KEYS.currentCharacter,
  );

  if (!rawCharacter) {
    return {
      character: null,
      errorMessage: '',
    };
  }

  try {
    const parsedCharacter = JSON.parse(rawCharacter);
    const normalizedCharacter = normalizeStoredCharacter(parsedCharacter);

    if (
      JSON.stringify(parsedCharacter) !==
      JSON.stringify(normalizedCharacter)
    ) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.currentCharacter,
        JSON.stringify(normalizedCharacter),
      );
    }

    return {
      character: normalizedCharacter,
      errorMessage: '',
    };
  } catch {
    return {
      character: null,
      errorMessage: 'Saved character data is corrupted.',
    };
  }
}

function saveCurrentCharacterToStorage(character: Character): Character {
  localStorage.setItem(
    LOCAL_STORAGE_KEYS.currentCharacter,
    JSON.stringify(character),
  );

  return character;
}

function addCharacterToArchive(character: Character): void {
  const archiveRaw = localStorage.getItem(
    LOCAL_STORAGE_KEYS.characterArchive,
  );

  const archive: Character[] = archiveRaw ? JSON.parse(archiveRaw) : [];

  archive.push(character);

  localStorage.setItem(
    LOCAL_STORAGE_KEYS.characterArchive,
    JSON.stringify(archive),
  );
}

export const localCharacterRepository: CharacterRepository = {
  getCurrentCharacter() {
    return readCurrentCharacterFromStorage();
  },

  createCharacter(input: CreateCharacterInput) {
    const character = buildCharacter({
      name: input.name,
      classId: input.classId,
      giftId: input.giftId,
    });

    saveCurrentCharacterToStorage(character);
    addCharacterToArchive(character);

    return character;
  },

  saveCurrentCharacter(character: Character) {
    return saveCurrentCharacterToStorage(character);
  },

  clearCurrentCharacter() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.currentCharacter);
  },
};