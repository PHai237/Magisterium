import { randomUUID } from 'crypto';

import type {
  BattleActionPhase,
  BattleEvent,
  BattleEventType,
} from '../battle.types';

export type CreateBattleEventInput = Omit<BattleEvent, 'id'> & {
  id?: string;
};

function getDefaultSystemEventPhase(type: BattleEventType): BattleActionPhase {
  switch (type) {
    case 'BATTLE_STARTED':
    case 'ROUND_STARTED':
    case 'TURN_STARTED':
    case 'ACTION_STARTED':
      return 'initiation';

    case 'RESOURCE_CHECK_FAILED':
    case 'RESOURCE_SPENT':
      return 'resource_check';

    case 'MISS':
    case 'EVADE':
    case 'HIT':
      return 'accuracy_check';

    case 'CRIT':
    case 'DAMAGE_CALCULATED':
      return 'damage_calculation';

    case 'DAMAGE_MITIGATED':
      return 'mitigation';

    case 'DAMAGE_APPLIED':
    case 'SHIELD_GAINED':
    case 'SHIELD_DAMAGED':
    case 'SHIELD_BROKEN':
    case 'HEAL_APPLIED':
    case 'RESOURCE_RESTORED':
    case 'SECOND_CHANCE_TRIGGERED':
    case 'EXHAUSTED':
    case 'RECOVERED_FROM_EXHAUSTION':
    case 'ACTOR_DEFEATED':
    case 'ITEM_USED':
      return 'apply_damage';

    case 'STATUS_RESISTED':
    case 'STATUS_APPLIED':
    case 'STATUS_EXPIRED':
      return 'status_effects';

    case 'ACTION_CANCELLED':
      return 'cancelled';

    case 'TURN_ENDED':
    case 'ROUND_ENDED':
    case 'BATTLE_ENDED':
    case 'CONTROL_FORCED':
    case 'PROC_TRIGGERED':
    case 'PROC_LIMIT_REACHED':
      return 'completed';
  }
}

export function createBattleEvent(input: CreateBattleEventInput): BattleEvent {
  const { id, ...event } = input;

  return {
    id: id ?? randomUUID(),
    ...event,
  };
}

export function createSystemEvent(
  type: BattleEventType,
  message: string,
  phase?: BattleActionPhase,
): BattleEvent {
  return createBattleEvent({
    type,
    phase: phase ?? getDefaultSystemEventPhase(type),
    actorId: 'battle_engine',
    message,
  });
}
