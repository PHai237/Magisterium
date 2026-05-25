import {
  calculateResourceCheck,
  getCurrentResource,
  getMaxResource,
  spendResources,
  updateExhaustionState,
} from '../calculations/battle.calculations';

import { createBattleEvent } from '../events/battle-event.factory';

import { isActorDefeated } from '../utils/battle-state.utils';

import type {
  BattleActorState,
  BattleEvent,
  BattleResourceCost,
} from '../battle.types';

import type { SkillDefinition } from '../../skill/skill.types';

export { calculateResourceCheck, spendResources };

export function buildSkillResourceCosts(
  skill: SkillDefinition,
): BattleResourceCost[] {
  const costs: BattleResourceCost[] = [];

  if ((skill.cost.hpCost ?? 0) > 0) {
    costs.push({
      resourceType: 'HP',
      amount: skill.cost.hpCost ?? 0,
    });
  }

  if (skill.cost.mpCost > 0) {
    costs.push({
      resourceType: 'MP',
      amount: skill.cost.mpCost,
    });
  }

  if (skill.cost.staminaCost > 0) {
    costs.push({
      resourceType: 'Stamina',
      amount: skill.cost.staminaCost,
    });
  }

  return costs;
}

function normalizeResourceRegen(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function restoreTurnStartResources(actor: BattleActorState): {
  actor: BattleActorState;
  events: BattleEvent[];
} {
  if (isActorDefeated(actor)) {
    return {
      actor,
      events: [],
    };
  }

  const wasExhausted = actor.isExhausted;

  const currentMp = getCurrentResource(actor, 'MP');
  const currentStamina = getCurrentResource(actor, 'Stamina');

  const maxMp = getMaxResource(actor, 'MP');
  const maxStamina = getMaxResource(actor, 'Stamina');

  const nextMp = Math.min(
    maxMp,
    currentMp + normalizeResourceRegen(actor.derivedStats.mpRegen),
  );

  const nextStamina = Math.min(
    maxStamina,
    currentStamina + normalizeResourceRegen(actor.derivedStats.staminaRegen),
  );

  const restoredMp = nextMp - currentMp;
  const restoredStamina = nextStamina - currentStamina;

  const restoredActor = updateExhaustionState({
    ...actor,
    mp: nextMp,
    stamina: nextStamina,
  });

  const events: BattleEvent[] = [];

  if (restoredMp > 0) {
    events.push(
      createBattleEvent({
        type: 'RESOURCE_RESTORED',
        phase: 'initiation',
        actorId: actor.actorId,
        value: restoredMp,
        message: 'MP restored at turn start.',
        metadata: {
          resourceType: 'MP',
          currentValue: nextMp,
          maxValue: maxMp,
        },
      }),
    );
  }

  if (restoredStamina > 0) {
    events.push(
      createBattleEvent({
        type: 'RESOURCE_RESTORED',
        phase: 'initiation',
        actorId: actor.actorId,
        value: restoredStamina,
        message: 'Stamina restored at turn start.',
        metadata: {
          resourceType: 'Stamina',
          currentValue: nextStamina,
          maxValue: maxStamina,
        },
      }),
    );
  }

  if (wasExhausted && !restoredActor.isExhausted) {
    events.push(
      createBattleEvent({
        type: 'RECOVERED_FROM_EXHAUSTION',
        phase: 'initiation',
        actorId: actor.actorId,
        message: 'Actor recovered from exhaustion.',
        metadata: {
          stamina: restoredActor.stamina,
          maxStamina,
        },
      }),
    );
  }

  return {
    actor: restoredActor,
    events,
  };
}
