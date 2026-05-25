import { useCallback, useState } from 'react';

import { characterRepository } from '../../services/characterRepository';

export function useCurrentCharacter() {
  const [state, setState] = useState(() =>
    characterRepository.getCurrentCharacter(),
  );

  const loadCharacter = useCallback(() => {
    setState(characterRepository.getCurrentCharacter());
  }, []);

  const clearCharacter = useCallback(() => {
    characterRepository.clearCurrentCharacter();

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