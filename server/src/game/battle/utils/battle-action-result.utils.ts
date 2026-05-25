import { MAX_PROC_PER_TURN } from '../battle.constants';

import type {
  BattleActionResult,
  BattleActorState,
  BattleEvent,
} from '../battle.types';

export function createDefaultProcContext(actorId: string, turnId: string) {
  return {
    actorId,
    turnId,

    currentProcCount: 0,
    maxProcCount: MAX_PROC_PER_TURN,

    sourceProcIds: [],
  };
}

export function createCancelledActionResult(
  actor: BattleActorState,
  events: BattleEvent[],
  targetStates: BattleActorState[] = [],
): BattleActionResult {
  return {
    phase: 'cancelled',

    actorState: actor,
    targetStates,

    events,
    randomRolls: [],

    procContext: createDefaultProcContext(actor.actorId, 'cancelled'),
  };
}
