import { resolveBasicAttack } from './actions/basic-attack.action';
import { resolveSkipTurn } from './actions/skip-turn.action';
import { resolveUseSkill } from './actions/use-skill.action';

import type { BattleEngineResult } from './battle-engine.types';

import type {
  BattleActionCommand,
  BattleEvent,
  BattleState,
} from './battle.types';

import { createBattleEvent } from './events/battle-event.factory';

import { createCancelledActionResult } from './utils/battle-action-result.utils';

import { appendEvents, getActorOrThrow } from './utils/battle-state.utils';

export type { BattleEngineResult } from './battle-engine.types';

export { createBattleEvent } from './events/battle-event.factory';

export { appendEvents } from './utils/battle-state.utils';

export {
  advanceBattleToNextActor,
  startBattle,
} from './turn/battle-turn.engine';

function resolveUnsupportedAction(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  const unsupportedAction = (command as { actionType: string }).actionType;

  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_CANCELLED',
      phase: 'cancelled',
      actorId: command.actorId,
      message: `Unsupported battle action: ${unsupportedAction}.`,
    }),
  ];

  return {
    battleState: appendEvents(battleState, events),
    actionResult: createCancelledActionResult(actor, events),
  };
}

export function resolveBattleAction(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  if (command.battleId !== battleState.battleId) {
    throw new Error(
      `Battle command id ${command.battleId} does not match current battle ${battleState.battleId}.`,
    );
  }

  if (battleState.status === 'created') {
    throw new Error('Battle must be started before resolving actions.');
  }

  if (battleState.status !== 'in_progress') {
    throw new Error(
      `Cannot resolve action while battle is ${battleState.status}.`,
    );
  }

  if (!battleState.activeActorId) {
    throw new Error('No active actor is ready to act.');
  }

  if (battleState.activeActorId !== command.actorId) {
    throw new Error(
      `Actor ${command.actorId} is not the active actor. Active actor is ${battleState.activeActorId}.`,
    );
  }

  switch (command.actionType) {
    case 'basic_attack':
      return resolveBasicAttack(battleState, command);

    case 'use_skill':
      return resolveUseSkill(battleState, command);

    case 'skip_turn':
      return resolveSkipTurn(battleState, command);

    default:
      return resolveUnsupportedAction(battleState, command);
  }
}
