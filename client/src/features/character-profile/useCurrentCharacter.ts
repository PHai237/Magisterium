import { useCallback, useState } from 'react';

import { LOCAL_STORAGE_KEYS } from '../character-creation/constants';
import type { Character } from '../character-creation/types';

interface CurrentCharacterState {
  character: Character | null;
  errorMessage: string;
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
    version: Math.max(parsedCharacter.version ?? 1, 2),
    moneyBronze: normalizedMoneyBronze,
    starterGift: normalizedStarterGift ?? parsedCharacter.starterGift,
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