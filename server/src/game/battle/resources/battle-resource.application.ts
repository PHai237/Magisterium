import {
  calculateResourceCheck,
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

  const nextMp = Math.min(
    actor.derivedStats.maxMp,
    actor.mp + actor.derivedStats.mpRegen,
  );

  const nextStamina = Math.min(
    actor.derivedStats.maxStamina,
    actor.stamina + actor.derivedStats.staminaRegen,
  );

  const restoredMp = nextMp - actor.mp;
  const restoredStamina = nextStamina - actor.stamina;

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
          maxValue: actor.derivedStats.maxMp,
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
          maxValue: actor.derivedStats.maxStamina,
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
          maxStamina: restoredActor.derivedStats.maxStamina,
        },
      }),
    );
  }

  return {
    actor: restoredActor,
    events,
  };
}
