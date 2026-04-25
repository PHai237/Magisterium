import { useState } from 'react';

import type { BattleContentSource } from './features/battle/battleTypes';
import { BattlePage } from './features/battle/BattlePage';
import { LOCAL_STORAGE_KEYS } from './features/character-creation/constants';
import { CharacterCreationForm } from './features/character-creation/CharacterCreationForm';
import type { Character } from './features/character-creation/types';
import { CharacterProfilePage } from './features/character-profile/CharacterProfilePage';
import { useCurrentCharacter } from './features/character-profile/useCurrentCharacter';
import { DungeonEntryPage } from './features/dungeon/DungeonEntryPage';
import { TownPage } from './features/place/TownPage';
import { ZoneEntryPage } from './features/zone/ZoneEntryPage';

type AppScreen = 'profile' | 'town' | 'zone' | 'dungeon' | 'battle';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('profile');
  const [selectedBattleSource, setSelectedBattleSource] =
    useState<BattleContentSource | null>(null);
  const [battleRunId, setBattleRunId] = useState(0);

  const {
    character,
    errorMessage,
    hasCharacter,
    loadCharacter,
    clearCharacter,
  } = useCurrentCharacter();

  function saveUpdatedCharacterToScreen(
    updatedCharacter: Character,
    nextScreen: AppScreen,
  ) {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.currentCharacter,
      JSON.stringify(updatedCharacter),
    );

    loadCharacter();
    setCurrentScreen(nextScreen);
  }

  function saveUpdatedCharacterToProfile(updatedCharacter: Character) {
    saveUpdatedCharacterToScreen(updatedCharacter, 'profile');
  }

  function saveUpdatedCharacterToSource(updatedCharacter: Character) {
    if (!selectedBattleSource) {
      saveUpdatedCharacterToScreen(updatedCharacter, 'profile');
      return;
    }

    saveUpdatedCharacterToScreen(
      updatedCharacter,
      selectedBattleSource.type === 'dungeon' ? 'dungeon' : 'zone',
    );
  }

  function saveUpdatedCharacterAndContinue(updatedCharacter: Character) {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.currentCharacter,
      JSON.stringify(updatedCharacter),
    );

    loadCharacter();
    setBattleRunId((currentId) => currentId + 1);
    setCurrentScreen('battle');
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-200">
            Saved Character Error
          </h1>

          <p className="mt-3 text-red-100">{errorMessage}</p>

          <button
            type="button"
            onClick={() => {
              clearCharacter();
              setSelectedBattleSource(null);
              setBattleRunId(0);
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
    if (currentScreen === 'battle' && selectedBattleSource) {
      return (
        <BattlePage
          key={battleRunId}
          character={character}
          source={selectedBattleSource}
          onBackToSource={() => {
            setCurrentScreen(
              selectedBattleSource.type === 'dungeon' ? 'dungeon' : 'zone',
            );
          }}
          onReturnToSourceAfterWin={saveUpdatedCharacterToSource}
          onReturnToProfileAfterLoss={saveUpdatedCharacterToProfile}
          onEscapeFromBattle={saveUpdatedCharacterToSource}
          onContinueAdventure={saveUpdatedCharacterAndContinue}
        />
      );
    }

    if (currentScreen === 'town') {
      return (
        <TownPage
          character={character}
          onBackToProfile={() => {
            setCurrentScreen('profile');
          }}
          onRecoverAtTavern={saveUpdatedCharacterToProfile}
        />
      );
    }

    if (currentScreen === 'zone') {
      return (
        <ZoneEntryPage
          character={character}
          onBackToProfile={() => {
            setCurrentScreen('profile');
          }}
          onEnterZone={(zone) => {
            setSelectedBattleSource({
              type: 'zone',
              data: zone,
            });
            setBattleRunId((currentId) => currentId + 1);
            setCurrentScreen('battle');
          }}
        />
      );
    }

    if (currentScreen === 'dungeon') {
      return (
        <DungeonEntryPage
          character={character}
          onBackToProfile={() => {
            setSelectedBattleSource(null);
            setCurrentScreen('profile');
          }}
          onEnterDungeon={(dungeon) => {
            setSelectedBattleSource({
              type: 'dungeon',
              data: dungeon,
            });
            setBattleRunId((currentId) => currentId + 1);
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
          setSelectedBattleSource(null);
          setBattleRunId(0);
          setCurrentScreen('profile');
        }}
        onStartAdventure={() => {
          setCurrentScreen('dungeon');
        }}
        onVisitTown={() => {
          setCurrentScreen('town');
        }}
        onExploreZones={() => {
          setCurrentScreen('zone');
        }}
      />
    );
  }

  return (
    <CharacterCreationForm
      onCharacterCreated={() => {
        loadCharacter();
        setSelectedBattleSource(null);
        setBattleRunId(0);
        setCurrentScreen('profile');
      }}
    />
  );
}

export default App;