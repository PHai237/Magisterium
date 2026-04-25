import { useState } from 'react';

import type { BattleContentSource } from './features/battle/battleTypes';
import { BattlePage } from './features/battle/BattlePage';
import { LOCAL_STORAGE_KEYS } from './features/character-creation/constants';
import { CharacterCreationForm } from './features/character-creation/CharacterCreationForm';
import type { Character } from './features/character-creation/types';
import { CharacterProfilePage } from './features/character-profile/CharacterProfilePage';
import { useCurrentCharacter } from './features/character-profile/useCurrentCharacter';
import { DungeonEntryPage } from './features/dungeon/DungeonEntryPage';
import type { DungeonDefinition } from './features/dungeon/dungeonTypes';
import {
  canAffordBronze,
  subtractBronze,
} from './features/economy/currencyUtils';
import { TownPage } from './features/place/TownPage';
import { TravelPage } from './features/travel/TravelPage';
import { ZoneEntryPage } from './features/zone/ZoneEntryPage';
import { ZoneExplorePage } from './features/zone/ZoneExplorePage';
import type { ZoneDefinition } from './features/zone/zoneTypes';

type AppScreen =
  | 'profile'
  | 'town'
  | 'zone'
  | 'travel'
  | 'zone_explore'
  | 'dungeon'
  | 'battle';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('profile');
  const [selectedBattleSource, setSelectedBattleSource] =
    useState<BattleContentSource | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneDefinition | null>(null);
  const [battleRunId, setBattleRunId] = useState(0);

  const {
    character,
    errorMessage,
    hasCharacter,
    loadCharacter,
    clearCharacter,
  } = useCurrentCharacter();

  function persistCharacter(updatedCharacter: Character) {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.currentCharacter,
      JSON.stringify(updatedCharacter),
    );

    loadCharacter();
  }

  function saveUpdatedCharacterToScreen(
    updatedCharacter: Character,
    nextScreen: AppScreen,
  ) {
    persistCharacter(updatedCharacter);
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

    if (selectedBattleSource.type === 'zone') {
      saveUpdatedCharacterToScreen(updatedCharacter, 'zone_explore');
      return;
    }

    saveUpdatedCharacterToScreen(updatedCharacter, 'dungeon');
  }

  function startDungeonBattle(
    dungeon: DungeonDefinition,
    baseCharacter: Character,
  ) {
    if (!canAffordBronze(baseCharacter.moneyBronze, dungeon.entryCostBronze)) {
      saveUpdatedCharacterToScreen(baseCharacter, 'dungeon');
      setSelectedBattleSource(null);
      return;
    }

    const preparedCharacter: Character = {
      ...baseCharacter,
      moneyBronze: subtractBronze(
        baseCharacter.moneyBronze,
        dungeon.entryCostBronze,
      ),
    };

    persistCharacter(preparedCharacter);

    setSelectedBattleSource({
      type: 'dungeon',
      data: dungeon,
    });
    setBattleRunId((currentId) => currentId + 1);
    setCurrentScreen('battle');
  }

  function saveUpdatedCharacterAndContinue(updatedCharacter: Character) {
    if (!selectedBattleSource) {
      saveUpdatedCharacterToProfile(updatedCharacter);
      return;
    }

    if (selectedBattleSource.type === 'dungeon') {
      startDungeonBattle(selectedBattleSource.data, updatedCharacter);
      return;
    }

    persistCharacter(updatedCharacter);
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
              setSelectedZone(null);
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
              selectedBattleSource.type === 'dungeon'
                ? 'dungeon'
                : 'zone_explore',
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
            setSelectedZone(zone);
            setCurrentScreen('travel');
          }}
        />
      );
    }

    if (currentScreen === 'travel' && selectedZone) {
      return (
        <TravelPage
          character={character}
          zone={selectedZone}
          onCancelTravel={() => {
            setCurrentScreen('zone');
          }}
          onArriveAtZone={() => {
            setCurrentScreen('zone_explore');
          }}
          onTravelEventResult={(updatedCharacter) => {
            persistCharacter(updatedCharacter);
          }}
        />
      );
    }

    if (currentScreen === 'zone_explore' && selectedZone) {
      return (
        <ZoneExplorePage
          character={character}
          zone={selectedZone}
          onBackToZoneList={() => {
            setCurrentScreen('zone');
          }}
          onReturnToProfile={() => {
            setCurrentScreen('profile');
          }}
          onSearchEncounter={() => {
            setSelectedBattleSource({
              type: 'zone',
              data: selectedZone,
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
            startDungeonBattle(dungeon, character);
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
          setSelectedZone(null);
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
        setSelectedZone(null);
        setBattleRunId(0);
        setCurrentScreen('profile');
      }}
    />
  );
}

export default App;