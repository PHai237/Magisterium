import { useCallback, useState } from 'react';

import {
  CHARACTER_CLASSES,
  LOCAL_STORAGE_KEYS,
} from '../character-creation/constants';
import type { Character } from '../character-creation/types';
import { mergeInventoryStacks } from '../inventory/inventoryCalculations';
import type { ItemStack } from '../item/itemTypes';

interface CurrentCharacterState {
  character: Character | null;
  errorMessage: string;
}

function getCurrentClassSkillDefinition(
  classId: Character['classId'],
  skillId: string,
) {
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
      ...currentSkillDefinition,
      ...skill,
      elementType:
        skill.elementType ??
        currentSkillDefinition?.elementType ??
        (skill.effectType === 'damage' ? 'neutral' : null),
    };
  });
}

function normalizeInventory(rawInventory: unknown): ItemStack[] {
  if (!Array.isArray(rawInventory)) {
    return [];
  }

  const normalizedInventory = rawInventory
    .map((itemStack) => {
      const parsedItemStack = itemStack as Partial<ItemStack>;

      if (
        typeof parsedItemStack.itemId !== 'string' ||
        typeof parsedItemStack.quantity !== 'number'
      ) {
        return null;
      }

      return {
        itemId: parsedItemStack.itemId,
        quantity: Math.max(0, Math.floor(parsedItemStack.quantity)),
      };
    })
    .filter((itemStack): itemStack is ItemStack => Boolean(itemStack));

  return mergeInventoryStacks(normalizedInventory);
}

function normalizeStoredCharacter(rawCharacter: unknown): Character {
  const parsedCharacter = rawCharacter as Character & {
    gold?: number;
    moneyBronze?: number;
    inventory?: unknown;
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

  const normalizedStarterGift =
    parsedCharacter.starterGift &&
    parsedCharacter.starterGift.effectType === 'starting_gold'
      ? {
          ...parsedCharacter.starterGift,
          effectType: 'starting_money' as const,
        }
      : parsedCharacter.starterGift;

  return {
    ...parsedCharacter,
    version: Math.max(parsedCharacter.version ?? 1, 3),
    moneyBronze: normalizedMoneyBronze,
    starterGift: normalizedStarterGift ?? parsedCharacter.starterGift,
    skills: normalizeStoredSkills(parsedCharacter),
    inventory: normalizeInventory(parsedCharacter.inventory),
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

    if (JSON.stringify(parsedCharacter) !== JSON.stringify(normalizedCharacter)) {
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

export function useCurrentCharacter() {
  const [state, setState] = useState<CurrentCharacterState>(() =>
    readCurrentCharacterFromStorage(),
  );

  const loadCharacter = useCallback(() => {
    setState(readCurrentCharacterFromStorage());
  }, []);

  const clearCharacter = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.currentCharacter);

    setState({
      character: null,
      errorMessage: '',
    });
  }, []);

  return {
    character: state.character,
    errorMessage: state.errorMessage,
    hasCharacter: state.character !== null,
    loadCharacter,
    clearCharacter,
  };
}