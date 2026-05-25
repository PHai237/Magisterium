import {
  advanceRandomContext,
  calculateCritChance,
  calculateDamage,
  calculateHitChance,
  resolveRandomRoll,
} from '../calculations/battle.calculations';

import {
  applyDamageToActor,
  applyHealingToActor,
} from '../damage/battle-damage.application';

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
  areOpposingActors,
  cloneActorRecord,
  getActorOrThrow,
  isActorAlive,
  isActorDefeated,
} from '../utils/battle-state.utils';

import type { BattleEngineResult } from '../battle-engine.types';

import type {
  BattleActionCommand,
  BattleActionResult,
  BattleActorState,
  BattleEvent,
  BattleState,
  RandomRollResult,
} from '../battle.types';

function createBasicAttackCancelledResult(
  battleState: BattleState,
  actor: BattleActorState,
  message: string,
  target?: BattleActorState,
): BattleEngineResult {
  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_CANCELLED',
      phase: 'cancelled',
      actorId: actor.actorId,
      targetId: target?.actorId,
      message,
    }),
  ];

  return {
    battleState: appendEvents(battleState, events),
    actionResult: createCancelledActionResult(
      actor,
      events,
      target ? [target] : [],
    ),
  };
}

export function resolveBasicAttack(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  if (isActorDefeated(actor)) {
    return createBasicAttackCancelledResult(
      battleState,
      actor,
      'Defeated actor cannot act.',
    );
  }

  const targetId = command.targetIds[0];

  if (!targetId) {
    return createBasicAttackCancelledResult(
      battleState,
      actor,
      'Basic attack requires a target.',
    );
  }

  const target = getActorOrThrow(battleState, targetId);

  if (actor.actorId === target.actorId) {
    return createBasicAttackCancelledResult(
      battleState,
      actor,
      'Basic attack cannot target self.',
      target,
    );
  }

  if (!areOpposingActors(actor, target)) {
    return createBasicAttackCancelledResult(
      battleState,
      actor,
      'Basic attack cannot target an ally.',
      target,
    );
  }

  if (isActorDefeated(target)) {
    return createBasicAttackCancelledResult(
      battleState,
      actor,
      'Basic attack cannot target a defeated actor.',
      target,
    );
  }

  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_STARTED',
      phase: 'initiation',
      actorId: actor.actorId,
      targetId: target.actorId,
      message: 'Basic attack started.',
    }),
  ];

  const randomRolls: RandomRollResult[] = [];
  let randomContext = battleState.randomContext;

  const hitChance = calculateHitChance(actor, target);

  const hitRoll = resolveRandomRoll({
    type: 'hit',
    actorId: actor.actorId,
    targetId: target.actorId,
    baseChance: hitChance,
    randomContext,
  });

  randomRolls.push(hitRoll);
  randomContext = advanceRandomContext(randomContext);

  if (!hitRoll.success) {
    events.push(
      createBattleEvent({
        type: 'MISS',
        phase: 'accuracy_check',
        actorId: actor.actorId,
        targetId: target.actorId,
        value: hitChance,
        message: 'Basic attack missed.',
        metadata: {
          roll: hitRoll.roll,
          finalChance: hitRoll.finalChance,
        },
      }),
      createBattleEvent({
        type: 'TURN_ENDED',
        phase: 'completed',
        actorId: actor.actorId,
        message: 'Turn ended.',
      }),
    );

    const nextActors = cloneActorRecord(battleState.actors);
    nextActors[actor.actorId] = actor;

    const stateAfterMiss = appendEvents(
      {
        ...battleState,
        actors: nextActors,
        activeActorId: undefined,
        randomContext,
        turnOrder: consumeActorTurnGauge(battleState, actor.actorId),
        updatedAt: new Date().toISOString(),
      },
      events,
    );

    const nextState = advanceBattleToNextActor(
      advanceRoundIfNeeded(stateAfterMiss),
    );

    const actionResult: BattleActionResult = {
      phase: 'completed',

      actorState: actor,
      targetStates: [target],

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
      type: 'HIT',
      phase: 'accuracy_check',
      actorId: actor.actorId,
      targetId: target.actorId,
      value: hitChance,
      message: 'Basic attack hit.',
      metadata: {
        roll: hitRoll.roll,
        finalChance: hitRoll.finalChance,
      },
    }),
  );

  const critChance = calculateCritChance(actor);

  const critRoll = resolveRandomRoll({
    type: 'crit',
    actorId: actor.actorId,
    targetId: target.actorId,
    baseChance: critChance,
    randomContext,
  });

  randomRolls.push(critRoll);
  randomContext = advanceRandomContext(randomContext);

  if (critRoll.success) {
    events.push(
      createBattleEvent({
        type: 'CRIT',
        phase: 'damage_calculation',
        actorId: actor.actorId,
        targetId: target.actorId,
        value: critChance,
        message: 'Critical hit.',
        metadata: {
          roll: critRoll.roll,
          finalChance: critRoll.finalChance,
        },
      }),
    );
  }

  const varianceRoll = resolveRandomRoll({
    type: 'damage_variance',
    actorId: actor.actorId,
    targetId: target.actorId,
    baseChance: 100,
    sourceType: 'battle_engine',
    randomContext,
  });

  randomRolls.push(varianceRoll);
  randomContext = advanceRandomContext(randomContext);

  const varianceRollUnit = varianceRoll.roll / 100;

  const damageResult = calculateDamage(
    {
      attacker: actor,
      defender: target,

      damageType: 'physical',

      basePower: actor.derivedStats.pAtk,
      scalingValue: 0,

      isCritical: critRoll.success,
    },
    varianceRollUnit,
  );

  events.push(
    createBattleEvent({
      type: 'DAMAGE_CALCULATED',
      phase: 'damage_calculation',
      actorId: actor.actorId,
      targetId: target.actorId,
      value: damageResult.rawDamage,
      damageType: damageResult.damageType,
      elementType: damageResult.elementType,
      message: 'Damage calculated.',
      metadata: {
        isCritical: damageResult.isCritical,
        varianceRoll: varianceRoll.roll,
        varianceRollUnit,
      },
    }),
    createBattleEvent({
      type: 'DAMAGE_MITIGATED',
      phase: 'mitigation',
      actorId: actor.actorId,
      targetId: target.actorId,
      value: damageResult.damageAfterResistance,
      damageType: damageResult.damageType,
      elementType: damageResult.elementType,
      message: 'Damage mitigated.',
      metadata: {
        damageAfterDefense: damageResult.damageAfterDefense,
        damageAfterResistance: damageResult.damageAfterResistance,
        absorbedAmount: damageResult.absorbedAmount,
      },
    }),
  );

  const updatedActor: BattleActorState = {
    ...actor,
  };

  let updatedTarget = target;

  if (damageResult.absorbedAmount > 0) {
    const healingApplication = applyHealingToActor(
      updatedTarget,
      damageResult.absorbedAmount,
    );

    updatedTarget = healingApplication.targetState;

    if (healingApplication.healingDone > 0) {
      events.push(
        createBattleEvent({
          type: 'HEAL_APPLIED',
          phase: 'apply_damage',
          actorId: actor.actorId,
          targetId: target.actorId,
          value: healingApplication.healingDone,
          message: 'Damage was absorbed and converted into healing.',
          metadata: {
            absorbedAmount: damageResult.absorbedAmount,
            targetHp: updatedTarget.hp,
          },
        }),
      );
    }
  }

  const damageApplication = applyDamageToActor(
    updatedTarget,
    damageResult.finalDamage,
  );

  updatedTarget = damageApplication.targetState;

  if (damageApplication.shieldDamage > 0) {
    events.push(
      createBattleEvent({
        type: damageApplication.shieldBroken
          ? 'SHIELD_BROKEN'
          : 'SHIELD_DAMAGED',
        phase: 'apply_damage',
        actorId: actor.actorId,
        targetId: target.actorId,
        value: damageApplication.shieldDamage,
        message: damageApplication.shieldBroken
          ? 'Shield was broken.'
          : 'Shield absorbed damage.',
      }),
    );
  }

  events.push(
    createBattleEvent({
      type: 'DAMAGE_APPLIED',
      phase: 'apply_damage',
      actorId: actor.actorId,
      targetId: target.actorId,
      value: damageApplication.hpDamage,
      damageType: damageResult.damageType,
      elementType: damageResult.elementType,
      message: 'Damage applied.',
      metadata: {
        finalDamage: damageResult.finalDamage,
        shieldDamage: damageApplication.shieldDamage,
        hpDamage: damageApplication.hpDamage,
        targetHp: updatedTarget.hp,
      },
    }),
  );

  if (isActorAlive(target) && isActorDefeated(updatedTarget)) {
    events.push(
      createBattleEvent({
        type: 'ACTOR_DEFEATED',
        phase: 'apply_damage',
        actorId: actor.actorId,
        targetId: target.actorId,
        message: 'Actor defeated.',
      }),
    );
  }

  events.push(
    createBattleEvent({
      type: 'TURN_ENDED',
      phase: 'completed',
      actorId: actor.actorId,
      message: 'Turn ended.',
    }),
  );

  const nextActors = cloneActorRecord(battleState.actors);
  nextActors[actor.actorId] = updatedActor;
  nextActors[target.actorId] = updatedTarget;

  const stateAfterAction = appendEvents(
    {
      ...battleState,
      actors: nextActors,
      activeActorId: undefined,
      randomContext,
      turnOrder: consumeActorTurnGauge(battleState, actor.actorId),
      updatedAt: new Date().toISOString(),
    },
    events,
  );

  const nextState = advanceBattleToNextActor(
    advanceRoundIfNeeded(stateAfterAction),
  );

  const actionResult: BattleActionResult = {
    phase: 'completed',

    actorState: updatedActor,
    targetStates: [updatedTarget],

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
