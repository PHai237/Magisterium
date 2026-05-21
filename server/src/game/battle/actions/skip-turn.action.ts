import { createBattleEvent } from '../events/battle-event.factory';

import {
  advanceBattleToNextActor,
  advanceRoundIfNeeded,
  consumeActorTurnGauge,
} from '../turn/battle-turn.engine';

import { createDefaultProcContext } from '../utils/battle-action-result.utils';

import { appendEvents, getActorOrThrow } from '../utils/battle-state.utils';

import type { BattleEngineResult } from '../battle-engine.types';

import type {
  BattleActionCommand,
  BattleActionResult,
  BattleEvent,
  BattleState,
} from '../battle.types';

export function resolveSkipTurn(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'TURN_ENDED',
      phase: 'completed',
      actorId: command.actorId,
      message: 'Actor skipped the turn.',
    }),
  ];

  const stateAfterSkip = appendEvents(
    {
      ...battleState,
      activeActorId: undefined,
      turnOrder: consumeActorTurnGauge(battleState, command.actorId),
      updatedAt: new Date().toISOString(),
    },
    events,
  );

  const nextState = advanceBattleToNextActor(
    advanceRoundIfNeeded(stateAfterSkip),
  );

  const actionResult: BattleActionResult = {
    phase: 'completed',

    actorState: actor,
    targetStates: [],

    events,
    randomRolls: [],

    procContext: createDefaultProcContext(
      actor.actorId,
      `${battleState.battleId}:turn:${battleState.turnNumber}`,
    ),
  };

  return {
    battleState: nextState,
    actionResult,
  };
}
