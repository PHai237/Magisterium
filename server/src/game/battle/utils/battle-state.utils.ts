import {
  MAX_BATTLE_EVENTS_RETAINED,
  PINNED_BATTLE_EVENT_TYPES,
} from '../battle.constants';

import type {
  BattleActorState,
  BattleEvent,
  BattleState,
  BattleStatus,
} from '../battle.types';

export function cloneActorRecord(
  actors: Record<string, BattleActorState>,
): Record<string, BattleActorState> {
  return Object.fromEntries(
    Object.entries(actors).map(([actorId, actor]) => [
      actorId,
      {
        ...actor,
        activeStatusEffects: [...actor.activeStatusEffects],
        activeModifiers: [...actor.activeModifiers],
        skillIds: [...actor.skillIds],
      },
    ]),
  );
}

export function getActorOrThrow(
  battleState: BattleState,
  actorId: string,
): BattleActorState {
  const actor = battleState.actors[actorId];

  if (!actor) {
    throw new Error(`Battle actor not found: ${actorId}`);
  }

  return actor;
}

export function isActorDefeated(actor: BattleActorState): boolean {
  return actor.hp <= 0;
}

export function isActorAlive(actor: BattleActorState): boolean {
  return !isActorDefeated(actor);
}

export function areOpposingActors(
  actor: BattleActorState,
  target: BattleActorState,
): boolean {
  return actor.actorType !== target.actorType;
}

export function getLivingActors(
  actors: Record<string, BattleActorState>,
): BattleActorState[] {
  return Object.values(actors).filter(isActorAlive);
}

export function getLivingEnemiesOf(
  battleState: BattleState,
  actor: BattleActorState,
): BattleActorState[] {
  return Object.values(battleState.actors).filter(
    (target) => areOpposingActors(actor, target) && isActorAlive(target),
  );
}

export function getLivingAlliesOf(
  battleState: BattleState,
  actor: BattleActorState,
): BattleActorState[] {
  return Object.values(battleState.actors).filter(
    (target) => !areOpposingActors(actor, target) && isActorAlive(target),
  );
}

export function determineBattleStatus(
  actors: Record<string, BattleActorState>,
): BattleStatus {
  const actorList = Object.values(actors);

  const hasLivingCharacter = actorList.some(
    (actor) => actor.actorType === 'character' && isActorAlive(actor),
  );

  const hasLivingMonster = actorList.some(
    (actor) => actor.actorType === 'monster' && isActorAlive(actor),
  );

  if (!hasLivingCharacter) {
    return 'defeat';
  }

  if (!hasLivingMonster) {
    return 'victory';
  }

  return 'in_progress';
}

export function appendEvents(
  battleState: BattleState,
  events: BattleEvent[],
): BattleState {
  const combinedEvents = [...battleState.events, ...events];

  const pinnedEvents = combinedEvents.filter((event) =>
    PINNED_BATTLE_EVENT_TYPES.has(event.type),
  );

  const nonPinnedEvents = combinedEvents.filter(
    (event) => !PINNED_BATTLE_EVENT_TYPES.has(event.type),
  );

  const recentEventLimit = Math.max(
    0,
    MAX_BATTLE_EVENTS_RETAINED - pinnedEvents.length,
  );

  const nextEvents = [
    ...pinnedEvents.slice(0, MAX_BATTLE_EVENTS_RETAINED),
    ...nonPinnedEvents.slice(-recentEventLimit),
  ];

  return {
    ...battleState,
    events: nextEvents,
    updatedAt: new Date().toISOString(),
  };
}

export function setBattleStatus(
  battleState: BattleState,
  status: BattleStatus,
): BattleState {
  return {
    ...battleState,
    status,
    updatedAt: new Date().toISOString(),
  };
}
