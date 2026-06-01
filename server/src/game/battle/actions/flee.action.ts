import {
  advanceRandomContext,
  calculateFleeChance,
  resolveRandomRoll,
} from '../calculations/battle.calculations';

import { createBattleEvent } from '../events/battle-event.factory';

import {
  advanceBattleToNextActor,
  advanceRoundIfNeeded,
  consumeActorTurnGauge,
} from '../turn/battle-turn.engine';

import {
  createCancelledActionResult,
  createDefaultProcContext,
} from '../utils/battle-action-result.utils';

import {
  appendEvents,
  getActorOrThrow,
  isActorDefeated,
  setBattleStatus,
} from '../utils/battle-state.utils';

import type { BattleEngineResult } from '../battle-engine.types';

import type {
  BattleActionCommand,
  BattleActionResult,
  BattleEvent,
  BattleState,
  RandomRollResult,
} from '../battle.types';

function createFleeCancelledResult(
  battleState: BattleState,
  command: BattleActionCommand,
  message: string,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);
  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_CANCELLED',
      phase: 'cancelled',
      actorId: command.actorId,
      message,
    }),
  ];

  return {
    battleState: appendEvents(battleState, events),
    actionResult: createCancelledActionResult(actor, events),
  };
}

export function resolveFlee(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  if (isActorDefeated(actor)) {
    return createFleeCancelledResult(
      battleState,
      command,
      'Defeated actor cannot flee.',
    );
  }

  if (actor.actorType !== 'character') {
    return createFleeCancelledResult(
      battleState,
      command,
      'Only characters can flee from battle.',
    );
  }

  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_STARTED',
      phase: 'initiation',
      actorId: actor.actorId,
      message: 'Flee attempt started.',
    }),
  ];

  const randomRolls: RandomRollResult[] = [];
  let randomContext = battleState.randomContext;
  const fleeChance = calculateFleeChance(actor);

  const fleeRoll = resolveRandomRoll({
    type: 'flee',
    actorId: actor.actorId,
    baseChance: fleeChance,
    sourceType: 'battle_engine',
    randomContext,
  });

  randomRolls.push(fleeRoll);
  randomContext = advanceRandomContext(randomContext);

  if (fleeRoll.success) {
    events.push(
      createBattleEvent({
        type: 'CONTROL_FORCED',
        phase: 'completed',
        actorId: actor.actorId,
        value: fleeChance,
        message: 'Escaped from battle.',
        metadata: {
          roll: fleeRoll.roll,
          finalChance: fleeRoll.finalChance,
        },
      }),
      createBattleEvent({
        type: 'BATTLE_ENDED',
        phase: 'completed',
        actorId: actor.actorId,
        value: fleeChance,
        message: 'Battle ended by escape.',
        metadata: {
          status: 'escaped',
          roll: fleeRoll.roll,
          finalChance: fleeRoll.finalChance,
        },
      }),
    );

    const nextState = appendEvents(
      {
        ...setBattleStatus(battleState, 'escaped'),
        activeActorId: undefined,
        randomContext,
        updatedAt: new Date().toISOString(),
      },
      events,
    );

    const actionResult: BattleActionResult = {
      phase: 'completed',
      actorState: actor,
      targetStates: [],
      events,
      randomRolls,
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

  events.push(
    createBattleEvent({
      type: 'CONTROL_FORCED',
      phase: 'completed',
      actorId: actor.actorId,
      value: fleeChance,
      message: 'Failed to escape.',
      metadata: {
        roll: fleeRoll.roll,
        finalChance: fleeRoll.finalChance,
      },
    }),
    createBattleEvent({
      type: 'TURN_ENDED',
      phase: 'completed',
      actorId: actor.actorId,
      message: 'Turn ended.',
    }),
  );

  const stateAfterFailedFlee = appendEvents(
    {
      ...battleState,
      activeActorId: undefined,
      randomContext,
      turnOrder: consumeActorTurnGauge(battleState, actor.actorId),
      updatedAt: new Date().toISOString(),
    },
    events,
  );

  const nextState = advanceBattleToNextActor(
    advanceRoundIfNeeded(stateAfterFailedFlee),
  );

  const actionResult: BattleActionResult = {
    phase: 'completed',
    actorState: actor,
    targetStates: [],
    events,
    randomRolls,
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
