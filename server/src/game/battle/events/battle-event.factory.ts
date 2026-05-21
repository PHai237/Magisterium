import { randomUUID } from 'crypto';

import type { BattleEvent, BattleEventType } from '../battle.types';

export function createBattleEvent(input: Omit<BattleEvent, 'id'>): BattleEvent {
  return {
    id: randomUUID(),
    ...input,
  };
}

export function createSystemEvent(
  type: BattleEventType,
  message: string,
): BattleEvent {
  return createBattleEvent({
    type,
    phase: type === 'BATTLE_ENDED' ? 'completed' : 'initiation',
    actorId: 'battle_engine',
    message,
  });
}
