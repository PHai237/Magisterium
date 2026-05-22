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
  applyShieldToActor,
} from '../damage/battle-damage.application';

import { createBattleEvent } from '../events/battle-event.factory';

import {
  buildSkillResourceCosts,
  calculateResourceCheck,
  spendResources,
} from '../resources/battle-resource.application';

import { resolveSkillTargets } from '../targeting/battle-targeting';

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

import { getSkillDefinitionById } from '../../skill/skill.registry';

import type {
  SkillDefinition,
  SkillEffect,
  SkillScalingSource,
} from '../../skill/skill.types';

import type { DerivedStats, StatKey } from '../../character/character.types';

const BASE_STAT_KEYS: readonly StatKey[] = [
  'STR',
  'DEX',
  'CON',
  'INT',
  'WIS',
  'LUK',
];

const DERIVED_STAT_KEYS: readonly (keyof DerivedStats)[] = [
  'maxHp',
  'maxMp',
  'maxStamina',

  'pAtk',
  'mAtk',
  'healingPotency',

  'pDef',
  'mDef',

  'actionSpeed',
  'accuracy',
  'evasionRate',

  'critRate',
  'critDamageBonus',

  'fleeRate',

  'statusResist',
  'spiritualPotency',

  'mpRegen',
  'staminaRegen',

  'secondChanceRate',
  'procRate',
];

function isBaseStatKey(source: SkillScalingSource): source is StatKey {
  return BASE_STAT_KEYS.includes(source as StatKey);
}

function isDerivedStatKey(
  source: SkillScalingSource,
): source is keyof DerivedStats {
  return DERIVED_STAT_KEYS.includes(source as keyof DerivedStats);
}

function getActorScalingSourceValue(
  actor: BattleActorState,
  source: SkillScalingSource,
): number {
  if (isBaseStatKey(source)) {
    return actor.baseStats[source] ?? 0;
  }

  if (isDerivedStatKey(source)) {
    return actor.derivedStats[source] ?? 0;
  }

  return 0;
}

function calculateSkillScalingValue(
  effect: SkillEffect,
  actor: BattleActorState,
): number {
  if (!effect.scaling) {
    return 0;
  }

  switch (effect.scaling.mode) {
    case 'flat':
      return 0;

    case 'single_stat': {
      if (!effect.scaling.primaryStat) {
        return 0;
      }

      return (
        getActorScalingSourceValue(actor, effect.scaling.primaryStat) *
        (effect.scaling.primaryMultiplier ?? 0)
      );
    }

    case 'dual_stat': {
      const primaryValue = effect.scaling.primaryStat
        ? getActorScalingSourceValue(actor, effect.scaling.primaryStat) *
          (effect.scaling.primaryMultiplier ?? 0)
        : 0;

      const secondaryValue = effect.scaling.secondaryStat
        ? getActorScalingSourceValue(actor, effect.scaling.secondaryStat) *
          (effect.scaling.secondaryMultiplier ?? 0)
        : 0;

      return primaryValue + secondaryValue;
    }
  }
}

function calculateSkillEffectValue(
  effect: SkillEffect,
  actor: BattleActorState,
): number {
  return Math.max(
    0,
    effect.baseValue + calculateSkillScalingValue(effect, actor),
  );
}

function dedupeTargetStates(
  targetStates: BattleActorState[],
): BattleActorState[] {
  return Array.from(
    new Map(
      targetStates.map((targetState) => [targetState.actorId, targetState]),
    ).values(),
  );
}

function createSkillActionCancelledResult(
  battleState: BattleState,
  actor: BattleActorState,
  message: string,
  skillId?: string,
  targetStates: BattleActorState[] = [],
): BattleEngineResult {
  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_CANCELLED',
      phase: 'cancelled',
      actorId: actor.actorId,
      skillId,
      message,
    }),
  ];

  return {
    battleState: appendEvents(battleState, events),
    actionResult: createCancelledActionResult(
      actor,
      events,
      dedupeTargetStates(targetStates),
    ),
  };
}

function getSkillOrCreateCancelledResult(
  battleState: BattleState,
  actor: BattleActorState,
  skillId?: string,
): {
  skill?: SkillDefinition;
  result?: BattleEngineResult;
} {
  if (!skillId) {
    const events: BattleEvent[] = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        message: 'use_skill requires skillId.',
      }),
    ];

    return {
      result: {
        battleState: appendEvents(battleState, events),
        actionResult: createCancelledActionResult(actor, events),
      },
    };
  }

  try {
    return {
      skill: getSkillDefinitionById(skillId),
    };
  } catch {
    const events: BattleEvent[] = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        skillId,
        message: `Skill definition not found: ${skillId}.`,
      }),
    ];

    return {
      result: {
        battleState: appendEvents(battleState, events),
        actionResult: createCancelledActionResult(actor, events),
      },
    };
  }
}

export function resolveUseSkill(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  if (isActorDefeated(actor)) {
    return createSkillActionCancelledResult(
      battleState,
      actor,
      'Defeated actor cannot act.',
      command.skillId,
    );
  }

  const skillLookup = getSkillOrCreateCancelledResult(
    battleState,
    actor,
    command.skillId,
  );

  if (skillLookup.result) {
    return skillLookup.result;
  }

  const skill = skillLookup.skill;

  if (!skill) {
    return createSkillActionCancelledResult(
      battleState,
      actor,
      'Skill definition could not be loaded.',
      command.skillId,
    );
  }

  if (!actor.skillIds.includes(skill.id)) {
    return createSkillActionCancelledResult(
      battleState,
      actor,
      `Actor ${actor.actorId} has not equipped skill: ${skill.id}.`,
      skill.id,
    );
  }

  let initialTargetStates: BattleActorState[];

  try {
    initialTargetStates = dedupeTargetStates(
      skill.effects.flatMap((effect) =>
        resolveSkillTargets(
          battleState,
          actor,
          effect.targetType,
          command.targetIds,
        ),
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid skill target.';

    return createSkillActionCancelledResult(
      battleState,
      actor,
      message,
      skill.id,
    );
  }

  const resourceCosts = buildSkillResourceCosts(skill);
  const resourceCheck = calculateResourceCheck(actor, resourceCosts);

  if (!resourceCheck.canPay) {
    const events: BattleEvent[] = [
      createBattleEvent({
        type: 'RESOURCE_CHECK_FAILED',
        phase: 'resource_check',
        actorId: actor.actorId,
        skillId: skill.id,
        message: 'Not enough resources to use skill.',
        metadata: {
          missingResources: resourceCheck.missingResources,
        },
      }),
    ];

    return {
      battleState: appendEvents(battleState, events),
      actionResult: createCancelledActionResult(
        actor,
        events,
        initialTargetStates,
      ),
    };
  }

  const actorAfterResourceSpend = spendResources(actor, resourceCosts);

  const nextActors = cloneActorRecord(battleState.actors);
  nextActors[actor.actorId] = actorAfterResourceSpend;

  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_STARTED',
      phase: 'initiation',
      actorId: actor.actorId,
      skillId: skill.id,
      message: `Skill started: ${skill.name}.`,
    }),
  ];

  for (const cost of resourceCosts) {
    events.push(
      createBattleEvent({
        type: 'RESOURCE_SPENT',
        phase: 'resource_check',
        actorId: actor.actorId,
        skillId: skill.id,
        value: cost.amount,
        message: `${cost.resourceType} spent.`,
        metadata: {
          resourceType: cost.resourceType,
          amount: cost.amount,
        },
      }),
    );
  }

  const affectedTargetIds = new Set<string>();
  let randomContext = battleState.randomContext;
  const randomRolls: RandomRollResult[] = [];

  for (const effect of skill.effects) {
    const currentActor = nextActors[actor.actorId];

    let effectTargets: BattleActorState[];

    try {
      effectTargets = resolveSkillTargets(
        {
          ...battleState,
          actors: nextActors,
        },
        currentActor,
        effect.targetType,
        command.targetIds,
      );
    } catch {
      continue;
    }

    for (const target of effectTargets) {
      affectedTargetIds.add(target.actorId);

      if (effect.type === 'damage') {
        const currentTarget = nextActors[target.actorId];

        if (!currentTarget || isActorDefeated(currentTarget)) {
          continue;
        }

        const hitChance = calculateHitChance(currentActor, currentTarget);

        const hitRoll = resolveRandomRoll({
          type: 'hit',
          actorId: currentActor.actorId,
          targetId: currentTarget.actorId,
          baseChance: hitChance,
          sourceId: skill.id,
          randomContext,
        });

        randomRolls.push(hitRoll);
        randomContext = advanceRandomContext(randomContext);

        if (!hitRoll.success) {
          events.push(
            createBattleEvent({
              type: 'MISS',
              phase: 'accuracy_check',
              actorId: currentActor.actorId,
              targetId: currentTarget.actorId,
              skillId: skill.id,
              effectId: effect.id,
              value: hitChance,
              message: `${skill.name} missed.`,
              metadata: {
                roll: hitRoll.roll,
                finalChance: hitRoll.finalChance,
              },
            }),
          );

          continue;
        }

        events.push(
          createBattleEvent({
            type: 'HIT',
            phase: 'accuracy_check',
            actorId: currentActor.actorId,
            targetId: currentTarget.actorId,
            skillId: skill.id,
            effectId: effect.id,
            value: hitChance,
            message: `${skill.name} hit.`,
            metadata: {
              roll: hitRoll.roll,
              finalChance: hitRoll.finalChance,
            },
          }),
        );

        const critChance = calculateCritChance(currentActor);

        const critRoll = resolveRandomRoll({
          type: 'crit',
          actorId: currentActor.actorId,
          targetId: currentTarget.actorId,
          baseChance: critChance,
          sourceId: skill.id,
          randomContext,
        });

        randomRolls.push(critRoll);
        randomContext = advanceRandomContext(randomContext);

        if (critRoll.success) {
          events.push(
            createBattleEvent({
              type: 'CRIT',
              phase: 'damage_calculation',
              actorId: currentActor.actorId,
              targetId: currentTarget.actorId,
              skillId: skill.id,
              effectId: effect.id,
              value: critChance,
              message: `${skill.name} critically hit.`,
              metadata: {
                roll: critRoll.roll,
                finalChance: critRoll.finalChance,
              },
            }),
          );
        }

        const varianceRoll = resolveRandomRoll({
          type: 'damage_variance',
          actorId: currentActor.actorId,
          targetId: currentTarget.actorId,
          baseChance: 100,
          sourceId: skill.id,
          sourceType: 'battle_engine',
          randomContext,
        });

        randomRolls.push(varianceRoll);
        randomContext = advanceRandomContext(randomContext);

        const varianceRollUnit = varianceRoll.roll / 100;

        const damageResult = calculateDamage(
          {
            attacker: currentActor,
            defender: currentTarget,

            damageType: effect.damageType ?? 'physical',
            elementType: effect.elementType,

            basePower: effect.baseValue,
            scalingValue: calculateSkillScalingValue(effect, currentActor),

            isCritical: critRoll.success,
          },
          varianceRollUnit,
        );

        events.push(
          createBattleEvent({
            type: 'DAMAGE_CALCULATED',
            phase: 'damage_calculation',
            actorId: currentActor.actorId,
            targetId: currentTarget.actorId,
            skillId: skill.id,
            effectId: effect.id,
            value: damageResult.rawDamage,
            damageType: damageResult.damageType,
            elementType: damageResult.elementType,
            message: 'Skill damage calculated.',
            metadata: {
              isCritical: damageResult.isCritical,
              varianceRoll: varianceRoll.roll,
              varianceRollUnit,
            },
          }),
          createBattleEvent({
            type: 'DAMAGE_MITIGATED',
            phase: 'mitigation',
            actorId: currentActor.actorId,
            targetId: currentTarget.actorId,
            skillId: skill.id,
            effectId: effect.id,
            value: damageResult.damageAfterResistance,
            damageType: damageResult.damageType,
            elementType: damageResult.elementType,
            message: 'Skill damage mitigated.',
            metadata: {
              damageAfterDefense: damageResult.damageAfterDefense,
              damageAfterResistance: damageResult.damageAfterResistance,
              absorbedAmount: damageResult.absorbedAmount,
            },
          }),
        );

        let updatedTarget = currentTarget;

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
                actorId: currentActor.actorId,
                targetId: currentTarget.actorId,
                skillId: skill.id,
                effectId: effect.id,
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
              actorId: currentActor.actorId,
              targetId: currentTarget.actorId,
              skillId: skill.id,
              effectId: effect.id,
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
            actorId: currentActor.actorId,
            targetId: currentTarget.actorId,
            skillId: skill.id,
            effectId: effect.id,
            value: damageApplication.hpDamage,
            damageType: damageResult.damageType,
            elementType: damageResult.elementType,
            message: 'Skill damage applied.',
            metadata: {
              finalDamage: damageResult.finalDamage,
              shieldDamage: damageApplication.shieldDamage,
              hpDamage: damageApplication.hpDamage,
              targetHp: updatedTarget.hp,
            },
          }),
        );

        if (isActorAlive(currentTarget) && isActorDefeated(updatedTarget)) {
          events.push(
            createBattleEvent({
              type: 'ACTOR_DEFEATED',
              phase: 'apply_damage',
              actorId: currentActor.actorId,
              targetId: currentTarget.actorId,
              skillId: skill.id,
              effectId: effect.id,
              message: 'Actor defeated.',
            }),
          );
        }

        nextActors[currentTarget.actorId] = updatedTarget;
      }

      if (effect.type === 'heal') {
        const currentTarget = nextActors[target.actorId];

        if (!currentTarget || isActorDefeated(currentTarget)) {
          continue;
        }

        const healingApplication = applyHealingToActor(
          currentTarget,
          calculateSkillEffectValue(effect, currentActor),
        );

        nextActors[currentTarget.actorId] = healingApplication.targetState;

        events.push(
          createBattleEvent({
            type: 'HEAL_APPLIED',
            phase: 'apply_damage',
            actorId: currentActor.actorId,
            targetId: currentTarget.actorId,
            skillId: skill.id,
            effectId: effect.id,
            value: healingApplication.healingDone,
            message: `${skill.name} restored HP.`,
            metadata: {
              targetHp: healingApplication.targetState.hp,
              maxHp: healingApplication.targetState.derivedStats.maxHp,
            },
          }),
        );
      }

      if (effect.type === 'shield') {
        const currentTarget = nextActors[target.actorId];

        if (!currentTarget || isActorDefeated(currentTarget)) {
          continue;
        }

        const shieldApplication = applyShieldToActor(
          currentTarget,
          calculateSkillEffectValue(effect, currentActor),
        );

        nextActors[currentTarget.actorId] = shieldApplication.targetState;

        events.push(
          createBattleEvent({
            type: 'SHIELD_GAINED',
            phase: 'apply_damage',
            actorId: currentActor.actorId,
            targetId: currentTarget.actorId,
            skillId: skill.id,
            effectId: effect.id,
            value: shieldApplication.shieldGained,
            message: `${skill.name} granted shield.`,
            metadata: {
              targetShield: shieldApplication.targetState.shield,
            },
          }),
        );
      }
    }
  }

  events.push(
    createBattleEvent({
      type: 'TURN_ENDED',
      phase: 'completed',
      actorId: actor.actorId,
      skillId: skill.id,
      message: 'Turn ended.',
    }),
  );

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

  const finalActorState =
    nextState.actors[actor.actorId] ?? nextActors[actor.actorId];

  const targetStates = Array.from(affectedTargetIds)
    .map((targetId) => nextState.actors[targetId] ?? nextActors[targetId])
    .filter((target): target is BattleActorState => Boolean(target));

  const actionResult: BattleActionResult = {
    phase: 'completed',

    actorState: finalActorState,
    targetStates,

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
