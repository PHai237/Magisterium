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
import { RoadEventPage } from './features/road-event/RoadEventPage';
import type { RoadEventDefinition } from './features/road-event/roadEventTypes';
import { TravelPage } from './features/travel/TravelPage';
import { ZoneEntryPage } from './features/zone/ZoneEntryPage';
import { ZoneExplorePage } from './features/zone/ZoneExplorePage';
import type { ZoneDefinition } from './features/zone/zoneTypes';

type AppScreen =
  | 'profile'
  | 'town'
  | 'zone'
  | 'travel'
  | 'road_event'
  | 'zone_explore'
  | 'dungeon'
  | 'battle';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('profile');

  const [selectedBattleSource, setSelectedBattleSource] =
    useState<BattleContentSource | null>(null);

  const [selectedZone, setSelectedZone] = useState<ZoneDefinition | null>(null);

  const [selectedRoadEvent, setSelectedRoadEvent] =
    useState<RoadEventDefinition | null>(null);

  const [travelProgressSnapshot, setTravelProgressSnapshot] = useState(0);

  const [checkedRoadEventCheckpoints, setCheckedRoadEventCheckpoints] =
    useState<number[]>([]);

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

    if (selectedBattleSource.type === 'road_event') {
      setSelectedBattleSource(null);
      saveUpdatedCharacterToScreen(updatedCharacter, 'travel');
      return;
    }

    saveUpdatedCharacterToScreen(updatedCharacter, 'dungeon');
  }

  function resetTravelState() {
    setSelectedRoadEvent(null);
    setTravelProgressSnapshot(0);
    setCheckedRoadEventCheckpoints([]);
  }

  function resetRunState() {
    setSelectedBattleSource(null);
    setSelectedZone(null);
    setSelectedRoadEvent(null);
    setTravelProgressSnapshot(0);
    setCheckedRoadEventCheckpoints([]);
    setBattleRunId(0);
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
              resetRunState();
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
            if (selectedBattleSource.type === 'dungeon') {
              setCurrentScreen('dungeon');
              return;
            }

            if (selectedBattleSource.type === 'road_event') {
              setCurrentScreen('travel');
              return;
            }

            setCurrentScreen('zone_explore');
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
            resetTravelState();
            setCurrentScreen('profile');
          }}
          onEnterZone={(zone) => {
            setSelectedZone(zone);
            setSelectedBattleSource(null);
            resetTravelState();
            setCurrentScreen('travel');
          }}
        />
      );
    }

    if (currentScreen === 'road_event' && selectedZone && selectedRoadEvent) {
      return (
        <RoadEventPage
          character={character}
          zone={selectedZone}
          roadEvent={selectedRoadEvent}
          onCancelTravel={() => {
            resetTravelState();
            setCurrentScreen('zone');
          }}
          onResolveRoadEvent={({ updatedCharacter, nextAction, battle }) => {
            persistCharacter(updatedCharacter);
            setSelectedRoadEvent(null);

            if (nextAction === 'start_battle' && battle) {
              setSelectedBattleSource({
                type: 'road_event',
                data: battle,
              });

              setBattleRunId((currentId) => currentId + 1);
              setCurrentScreen('battle');
              return;
            }

            setSelectedBattleSource(null);
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
          initialProgress={travelProgressSnapshot}
          checkedRoadEventCheckpoints={checkedRoadEventCheckpoints}
          onCancelTravel={() => {
            resetTravelState();
            setCurrentScreen('zone');
          }}
          onArriveAtZone={() => {
            resetTravelState();
            setCurrentScreen('zone_explore');
          }}
          onRoadEventCheckpointChecked={(checkpoint) => {
            setCheckedRoadEventCheckpoints((currentCheckpoints) => {
              if (currentCheckpoints.includes(checkpoint)) {
                return currentCheckpoints;
              }

              return [...currentCheckpoints, checkpoint];
            });
          }}
          onRoadEventTriggered={({ roadEvent, progress, checkpoint }) => {
            setTravelProgressSnapshot(progress);
            setSelectedRoadEvent(roadEvent);

            setCheckedRoadEventCheckpoints((currentCheckpoints) => {
              if (currentCheckpoints.includes(checkpoint)) {
                return currentCheckpoints;
              }

              return [...currentCheckpoints, checkpoint];
            });

            setCurrentScreen('road_event');
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
            resetTravelState();
            setCurrentScreen('zone');
          }}
          onReturnToProfile={() => {
            resetTravelState();
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
          resetRunState();
          setCurrentScreen('profile');
        }}
        onStartAdventure={() => {
          resetTravelState();
          setCurrentScreen('dungeon');
        }}
        onVisitTown={() => {
          resetTravelState();
          setCurrentScreen('town');
        }}
        onExploreZones={() => {
          resetTravelState();
          setCurrentScreen('zone');
        }}
      />
    );
  }

  return (
    <CharacterCreationForm
      onCharacterCreated={() => {
        loadCharacter();
        resetRunState();
        setCurrentScreen('profile');
      }}
    />
  );
}

export default App;