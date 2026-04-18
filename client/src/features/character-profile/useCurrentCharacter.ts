import { useCallback, useState } from 'react';

import { LOCAL_STORAGE_KEYS } from '../character-creation/constants';
import type { Character } from '../character-creation/types';

interface CurrentCharacterState {
  character: Character | null;
  errorMessage: string;
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
    const parsedCharacter = JSON.parse(rawCharacter) as Character;

    return {
      character: parsedCharacter,
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