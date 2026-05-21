import { TURN_GAUGE_READY_VALUE } from '../battle.constants';

import {
  advanceTurnGaugeUntilReady,
  consumeTurnGauge,
  getReadyTurnEntries,
} from '../calculations/battle.calculations';

import {
  createBattleEvent,
  createSystemEvent,
} from '../events/battle-event.factory';

import { restoreTurnStartResources } from '../resources/battle-resource.application';

import {
  appendEvents,
  determineBattleStatus,
  getActorOrThrow,
  isActorAlive,
  setBattleStatus,
} from '../utils/battle-state.utils';

import type {
  BattleActorState,
  BattleState,
  BattleTurnOrderEntry,
} from '../battle.types';

export function sortReadyEntries(
  entries: BattleTurnOrderEntry[],
): BattleTurnOrderEntry[] {
  return [...entries].sort((left, right) => {
    if (right.turnGauge !== left.turnGauge) {
      return right.turnGauge - left.turnGauge;
    }

    if (right.actionSpeed !== left.actionSpeed) {
      return right.actionSpeed - left.actionSpeed;
    }

    return left.initiative - right.initiative;
  });
}

export function filterTurnOrderToLivingActors(
  turnOrder: BattleTurnOrderEntry[],
  actors: Record<string, BattleActorState>,
): BattleTurnOrderEntry[] {
  return turnOrder.filter((entry) => {
    const actor = actors[entry.actorId];

    return actor && isActorAlive(actor);
  });
}

export function findNextReadyLivingEntry(
  turnOrder: BattleTurnOrderEntry[],
  actors: Record<string, BattleActorState>,
): BattleTurnOrderEntry | undefined {
  const readyEntries = sortReadyEntries(getReadyTurnEntries(turnOrder));

  return readyEntries.find((entry) => {
    const actor = actors[entry.actorId];

    return actor && isActorAlive(actor);
  });
}

export function consumeActorTurnGauge(
  battleState: BattleState,
  actorId: string,
): BattleTurnOrderEntry[] {
  return battleState.turnOrder.map((entry) => {
    if (entry.actorId !== actorId) {
      return entry;
    }

    return {
      ...consumeTurnGauge(entry),
      hasActedThisRound: true,
    };
  });
}

export function shouldAdvanceRound(battleState: BattleState): boolean {
  if (determineBattleStatus(battleState.actors) !== 'in_progress') {
    return false;
  }

  const livingTurnOrder = filterTurnOrderToLivingActors(
    battleState.turnOrder,
    battleState.actors,
  );

  return (
    livingTurnOrder.length > 0 &&
    livingTurnOrder.every((entry) => entry.hasActedThisRound)
  );
}

export function resetRoundActedFlags(
  turnOrder: BattleTurnOrderEntry[],
  actors: Record<string, BattleActorState>,
): BattleTurnOrderEntry[] {
  return turnOrder.map((entry) => {
    const actor = actors[entry.actorId];

    if (!actor || !isActorAlive(actor)) {
      return entry;
    }

    return {
      ...entry,
      hasActedThisRound: false,
    };
  });
}

export function advanceRoundIfNeeded(battleState: BattleState): BattleState {
  if (!shouldAdvanceRound(battleState)) {
    return battleState;
  }

  const currentRoundNumber = battleState.roundNumber;
  const nextRoundNumber = currentRoundNumber + 1;

  return appendEvents(
    {
      ...battleState,
      roundNumber: nextRoundNumber,
      turnOrder: resetRoundActedFlags(
        battleState.turnOrder,
        battleState.actors,
      ),
      updatedAt: new Date().toISOString(),
    },
    [
      createSystemEvent('ROUND_ENDED', `Round ${currentRoundNumber} ended.`),
      createSystemEvent('ROUND_STARTED', `Round ${nextRoundNumber} started.`),
    ],
  );
}

export function startBattle(battleState: BattleState): BattleState {
  if (battleState.status !== 'created') {
    return battleState;
  }

  const startedState = appendEvents(
    setBattleStatus(battleState, 'in_progress'),
    [
      createSystemEvent('BATTLE_STARTED', 'Battle started.'),
      createSystemEvent('ROUND_STARTED', 'Round 1 started.'),
    ],
  );

  return advanceBattleToNextActor(startedState);
}

export function advanceBattleToNextActor(
  battleState: BattleState,
): BattleState {
  const currentStatus = determineBattleStatus(battleState.actors);

  if (currentStatus !== 'in_progress') {
    return appendEvents(
      {
        ...battleState,
        status: currentStatus,
        activeActorId: undefined,
        turnOrder: filterTurnOrderToLivingActors(
          battleState.turnOrder,
          battleState.actors,
        ),
      },
      [
        createSystemEvent(
          'BATTLE_ENDED',
          currentStatus === 'victory'
            ? 'Battle ended in victory.'
            : 'Battle ended in defeat.',
        ),
      ],
    );
  }

  const livingTurnOrder = filterTurnOrderToLivingActors(
    battleState.turnOrder,
    battleState.actors,
  );

  const advancedTurnOrder = advanceTurnGaugeUntilReady(livingTurnOrder);

  const readyEntry = findNextReadyLivingEntry(
    advancedTurnOrder,
    battleState.actors,
  );

  if (!readyEntry) {
    return {
      ...battleState,
      status: 'in_progress',
      activeActorId: undefined,
      turnOrder: advancedTurnOrder,
      updatedAt: new Date().toISOString(),
    };
  }

  const nextTurnNumber = battleState.turnNumber + 1;

  const readyActor = getActorOrThrow(battleState, readyEntry.actorId);
  const turnStartRestore = restoreTurnStartResources(readyActor);

  const nextActors = {
    ...battleState.actors,
    [readyEntry.actorId]: turnStartRestore.actor,
  };

  return appendEvents(
    {
      ...battleState,
      actors: nextActors,
      status: 'in_progress',
      activeActorId: readyEntry.actorId,
      turnNumber: nextTurnNumber,
      turnOrder: advancedTurnOrder,
      updatedAt: new Date().toISOString(),
    },
    [
      ...turnStartRestore.events,
      createBattleEvent({
        type: 'TURN_STARTED',
        phase: 'initiation',
        actorId: readyEntry.actorId,
        message: `Turn ${nextTurnNumber} started.`,
        metadata: {
          turnGauge: readyEntry.turnGauge,
          readyValue: TURN_GAUGE_READY_VALUE,
          roundNumber: battleState.roundNumber,
        },
      }),
    ],
  );
}
