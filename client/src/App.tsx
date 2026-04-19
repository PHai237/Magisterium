import { useState } from 'react';

import { LOCAL_STORAGE_KEYS } from './features/character-creation/constants';
import { CharacterCreationForm } from './features/character-creation/CharacterCreationForm';
import type { Character } from './features/character-creation/types';
import { CharacterProfilePage } from './features/character-profile/CharacterProfilePage';
import { useCurrentCharacter } from './features/character-profile/useCurrentCharacter';
import { BattlePage } from './features/battle/BattlePage';
import { DungeonEntryPage } from './features/dungeon/DungeonEntryPage';
import type { DungeonDefinition } from './features/dungeon/dungeonTypes';

type AppScreen = 'profile' | 'dungeon' | 'battle';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('profile');
  const [selectedDungeon, setSelectedDungeon] =
    useState<DungeonDefinition | null>(null);

  const {
    character,
    errorMessage,
    hasCharacter,
    loadCharacter,
    clearCharacter,
  } = useCurrentCharacter();

  function saveUpdatedCharacter(updatedCharacter: Character) {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.currentCharacter,
      JSON.stringify(updatedCharacter),
    );

    loadCharacter();
    setSelectedDungeon(null);
    setCurrentScreen('profile');
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-200">
            Saved Character Error
          </h1>

          <p className="mt-3 text-red-100">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => {
              clearCharacter();
              setSelectedDungeon(null);
              setCurrentScreen('profile');
            }}
            className="mt-5 rounded-xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400"
          >
            Clear Broken Save
          </button>
        </div>
      </main>
    );
  }

  if (hasCharacter && character) {
    if (currentScreen === 'battle' && selectedDungeon) {
      return (
        <BattlePage
          character={character}
          dungeon={selectedDungeon}
          onBackToDungeon={() => {
            setCurrentScreen('dungeon');
          }}
          onBattleFinished={saveUpdatedCharacter}
        />
      );
    }

    if (currentScreen === 'dungeon') {
      return (
        <DungeonEntryPage
          character={character}
          onBackToProfile={() => {
            setSelectedDungeon(null);
            setCurrentScreen('profile');
          }}
          onEnterDungeon={(dungeon) => {
            setSelectedDungeon(dungeon);
            setCurrentScreen('battle');
          }}
        />
      );
    }

    return (
      <CharacterProfilePage
        character={character}
        onCreateNewCharacter={() => {
          clearCharacter();
          setSelectedDungeon(null);
          setCurrentScreen('profile');
        }}
        onStartAdventure={() => {
          setCurrentScreen('dungeon');
        }}
      />
    );
  }

  return (
    <CharacterCreationForm
      onCharacterCreated={() => {
        loadCharacter();
        setSelectedDungeon(null);
        setCurrentScreen('profile');
      }}
    />
  );
}

export default App;