import { randomUUID } from 'crypto';

import {
  MAX_BATTLE_EVENTS_RETAINED,
  MAX_PROC_PER_TURN,
  PINNED_BATTLE_EVENT_TYPES,
  TURN_GAUGE_READY_VALUE,
} from './battle.constants';

import {
  advanceRandomContext,
  advanceTurnGaugeUntilReady,
  calculateCritChance,
  calculateDamage,
  calculateHitChance,
  consumeTurnGauge,
  getReadyTurnEntries,
  resolveRandomRoll,
  updateExhaustionState,
} from './calculations/battle.calculations';

import type {
  BattleActionCommand,
  BattleActionResult,
  BattleActorState,
  BattleEvent,
  BattleEventType,
  BattleState,
  BattleStatus,
  BattleTurnOrderEntry,
  RandomRollResult,
} from './battle.types';

export interface BattleEngineResult {
  battleState: BattleState;
  actionResult: BattleActionResult;
}

interface DamageApplicationResult {
  targetState: BattleActorState;
  shieldDamage: number;
  hpDamage: number;
  shieldBroken: boolean;
}

interface HealingApplicationResult {
  targetState: BattleActorState;
  healingDone: number;
}

export function createBattleEvent(input: Omit<BattleEvent, 'id'>): BattleEvent {
  return {
    id: randomUUID(),
    ...input,
  };
}

function createSystemEvent(
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

function cloneActorRecord(
  actors: Record<string, BattleActorState>,
): Record<string, BattleActorState> {
  return Object.fromEntries(
    Object.entries(actors).map(([actorId, actor]) => [
      actorId,
      {
        ...actor,
        activeStatusEffects: [...actor.activeStatusEffects],
        activeModifiers: [...actor.activeModifiers],
      },
    ]),
  );
}

function getActorOrThrow(
  battleState: BattleState,
  actorId: string,
): BattleActorState {
  const actor = battleState.actors[actorId];

  if (!actor) {
    throw new Error(`Battle actor not found: ${actorId}`);
  }

  return actor;
}

function isActorDefeated(actor: BattleActorState): boolean {
  return actor.hp <= 0;
}

function isActorAlive(actor: BattleActorState): boolean {
  return !isActorDefeated(actor);
}

function areOpposingActors(
  actor: BattleActorState,
  target: BattleActorState,
): boolean {
  return actor.actorType !== target.actorType;
}

function sortReadyEntries(
  entries: BattleTurnOrderEntry[],
): BattleTurnOrderEntry[] {
  return [...entries].sort((left, right) => {
    if (right.turnGauge !== left.turnGauge) {
      return right.turnGauge - left.turnGauge;
    }

    if (right.actionSpeed !== left.actionSpeed) {
      return right.actionSpeed - left.actionSpeed;
    }

    return left.initiative - right.initiative;
  });
}

function filterTurnOrderToLivingActors(
  turnOrder: BattleTurnOrderEntry[],
  actors: Record<string, BattleActorState>,
): BattleTurnOrderEntry[] {
  return turnOrder.filter((entry) => {
    const actor = actors[entry.actorId];

    return actor && isActorAlive(actor);
  });
}

function findNextReadyLivingEntry(
  turnOrder: BattleTurnOrderEntry[],
  actors: Record<string, BattleActorState>,
): BattleTurnOrderEntry | undefined {
  const readyEntries = sortReadyEntries(getReadyTurnEntries(turnOrder));

  return readyEntries.find((entry) => {
    const actor = actors[entry.actorId];

    return actor && isActorAlive(actor);
  });
}

function determineBattleStatus(
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

function setBattleStatus(
  battleState: BattleState,
  status: BattleStatus,
): BattleState {
  return {
    ...battleState,
    status,
    updatedAt: new Date().toISOString(),
  };
}

function applyDamageToActor(
  target: BattleActorState,
  finalDamage: number,
): DamageApplicationResult {
  const safeDamage = Math.max(0, Math.floor(finalDamage));

  const shieldDamage = Math.min(target.shield, safeDamage);
  const remainingDamage = safeDamage - shieldDamage;

  const nextShield = Math.max(0, target.shield - shieldDamage);
  const nextHp = Math.max(0, target.hp - remainingDamage);

  return {
    targetState: {
      ...target,
      shield: nextShield,
      hp: nextHp,
    },
    shieldDamage,
    hpDamage: remainingDamage,
    shieldBroken: target.shield > 0 && nextShield === 0,
  };
}

function applyHealingToActor(
  target: BattleActorState,
  healingAmount: number,
): HealingApplicationResult {
  const safeHealing = Math.max(0, Math.floor(healingAmount));
  const nextHp = Math.min(target.derivedStats.maxHp, target.hp + safeHealing);

  return {
    targetState: {
      ...target,
      hp: nextHp,
    },
    healingDone: nextHp - target.hp,
  };
}

function createDefaultProcContext(actorId: string, turnId: string) {
  return {
    actorId,
    turnId,

    currentProcCount: 0,
    maxProcCount: MAX_PROC_PER_TURN,

    sourceProcIds: [],
  };
}

function createCancelledActionResult(
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

function consumeActorTurnGauge(
  battleState: BattleState,
  actorId: string,
): BattleTurnOrderEntry[] {
  return battleState.turnOrder.map((entry) => {
    if (entry.actorId !== actorId) {
      return entry;
    }

    return {
      ...consumeTurnGauge(entry),
      hasActedThisRound: true,
    };
  });
}

function shouldAdvanceRound(battleState: BattleState): boolean {
  if (determineBattleStatus(battleState.actors) !== 'in_progress') {
    return false;
  }

  const livingTurnOrder = filterTurnOrderToLivingActors(
    battleState.turnOrder,
    battleState.actors,
  );

  return (
    livingTurnOrder.length > 0 &&
    livingTurnOrder.every((entry) => entry.hasActedThisRound)
  );
}

function resetRoundActedFlags(
  turnOrder: BattleTurnOrderEntry[],
  actors: Record<string, BattleActorState>,
): BattleTurnOrderEntry[] {
  return turnOrder.map((entry) => {
    const actor = actors[entry.actorId];

    if (!actor || !isActorAlive(actor)) {
      return entry;
    }

    return {
      ...entry,
      hasActedThisRound: false,
    };
  });
}

function advanceRoundIfNeeded(battleState: BattleState): BattleState {
  if (!shouldAdvanceRound(battleState)) {
    return battleState;
  }

  const currentRoundNumber = battleState.roundNumber;
  const nextRoundNumber = currentRoundNumber + 1;

  return appendEvents(
    {
      ...battleState,
      roundNumber: nextRoundNumber,
      turnOrder: resetRoundActedFlags(
        battleState.turnOrder,
        battleState.actors,
      ),
      updatedAt: new Date().toISOString(),
    },
    [
      createSystemEvent('ROUND_ENDED', `Round ${currentRoundNumber} ended.`),
      createSystemEvent('ROUND_STARTED', `Round ${nextRoundNumber} started.`),
    ],
  );
}

function restoreTurnStartResources(actor: BattleActorState): {
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

export function startBattle(battleState: BattleState): BattleState {
  if (battleState.status !== 'created') {
    return battleState;
  }

  const startedState = appendEvents(
    setBattleStatus(battleState, 'in_progress'),
    [
      createSystemEvent('BATTLE_STARTED', 'Battle started.'),
      createSystemEvent('ROUND_STARTED', 'Round 1 started.'),
    ],
  );

  return advanceBattleToNextActor(startedState);
}

export function advanceBattleToNextActor(
  battleState: BattleState,
): BattleState {
  const currentStatus = determineBattleStatus(battleState.actors);

  if (currentStatus !== 'in_progress') {
    return appendEvents(
      {
        ...battleState,
        status: currentStatus,
        activeActorId: undefined,
        turnOrder: filterTurnOrderToLivingActors(
          battleState.turnOrder,
          battleState.actors,
        ),
      },
      [
        createSystemEvent(
          'BATTLE_ENDED',
          currentStatus === 'victory'
            ? 'Battle ended in victory.'
            : 'Battle ended in defeat.',
        ),
      ],
    );
  }

  const livingTurnOrder = filterTurnOrderToLivingActors(
    battleState.turnOrder,
    battleState.actors,
  );

  const advancedTurnOrder = advanceTurnGaugeUntilReady(livingTurnOrder);

  const readyEntry = findNextReadyLivingEntry(
    advancedTurnOrder,
    battleState.actors,
  );

  if (!readyEntry) {
    return {
      ...battleState,
      status: 'in_progress',
      activeActorId: undefined,
      turnOrder: advancedTurnOrder,
      updatedAt: new Date().toISOString(),
    };
  }

  const nextTurnNumber = battleState.turnNumber + 1;

  const readyActor = getActorOrThrow(battleState, readyEntry.actorId);
  const turnStartRestore = restoreTurnStartResources(readyActor);

  const nextActors = {
    ...battleState.actors,
    [readyEntry.actorId]: turnStartRestore.actor,
  };

  return appendEvents(
    {
      ...battleState,
      actors: nextActors,
      status: 'in_progress',
      activeActorId: readyEntry.actorId,
      turnNumber: nextTurnNumber,
      turnOrder: advancedTurnOrder,
      updatedAt: new Date().toISOString(),
    },
    [
      ...turnStartRestore.events,
      createBattleEvent({
        type: 'TURN_STARTED',
        phase: 'initiation',
        actorId: readyEntry.actorId,
        message: `Turn ${nextTurnNumber} started.`,
        metadata: {
          turnGauge: readyEntry.turnGauge,
          readyValue: TURN_GAUGE_READY_VALUE,
          roundNumber: battleState.roundNumber,
        },
      }),
    ],
  );
}

function resolveUnsupportedAction(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  const events = [
    createBattleEvent({
      type: 'ACTION_CANCELLED',
      phase: 'cancelled',
      actorId: command.actorId,
      message: `Unsupported battle action: ${command.actionType}.`,
    }),
  ];

  return {
    battleState: appendEvents(battleState, events),
    actionResult: createCancelledActionResult(actor, events),
  };
}

function resolveSkipTurn(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  const events = [
    createBattleEvent({
      type: 'TURN_ENDED',
      phase: 'completed',
      actorId: command.actorId,
      message: 'Actor skipped the turn.',
    }),
  ];

  const stateAfterSkip = appendEvents(
    {
      ...battleState,
      activeActorId: undefined,
      turnOrder: consumeActorTurnGauge(battleState, command.actorId),
      updatedAt: new Date().toISOString(),
    },
    events,
  );

  const nextState = advanceBattleToNextActor(
    advanceRoundIfNeeded(stateAfterSkip),
  );

  return {
    battleState: nextState,
    actionResult: {
      phase: 'completed',

      actorState: actor,
      targetStates: [],

      events,
      randomRolls: [],

      procContext: createDefaultProcContext(
        actor.actorId,
        `${battleState.battleId}:turn:${battleState.turnNumber}`,
      ),
    },
  };
}

function resolveBasicAttack(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  if (isActorDefeated(actor)) {
    const events = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        message: 'Defeated actor cannot act.',
      }),
    ];

    return {
      battleState: appendEvents(battleState, events),
      actionResult: createCancelledActionResult(actor, events),
    };
  }

  const targetId = command.targetIds[0];

  if (!targetId) {
    const events = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        message: 'Basic attack requires a target.',
      }),
    ];

    return {
      battleState: appendEvents(battleState, events),
      actionResult: createCancelledActionResult(actor, events),
    };
  }

  const target = getActorOrThrow(battleState, targetId);

  if (actor.actorId === target.actorId) {
    const events = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        targetId: target.actorId,
        message: 'Basic attack cannot target self.',
      }),
    ];

    return {
      battleState: appendEvents(battleState, events),
      actionResult: createCancelledActionResult(actor, events, [target]),
    };
  }

  if (!areOpposingActors(actor, target)) {
    const events = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        targetId: target.actorId,
        message: 'Basic attack cannot target an ally.',
      }),
    ];

    return {
      battleState: appendEvents(battleState, events),
      actionResult: createCancelledActionResult(actor, events, [target]),
    };
  }

  if (isActorDefeated(target)) {
    const events = [
      createBattleEvent({
        type: 'ACTION_CANCELLED',
        phase: 'cancelled',
        actorId: actor.actorId,
        targetId: target.actorId,
        message: 'Basic attack cannot target a defeated actor.',
      }),
    ];

    return {
      battleState: appendEvents(battleState, events),
      actionResult: createCancelledActionResult(actor, events, [target]),
    };
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

    return {
      battleState: nextState,
      actionResult: {
        phase: 'completed',

        actorState: actor,
        targetStates: [target],

        events,
        randomRolls,

        procContext: createDefaultProcContext(
          actor.actorId,
          `${battleState.battleId}:turn:${battleState.turnNumber}`,
        ),
      },
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

  return {
    battleState: nextState,
    actionResult: {
      phase: 'completed',

      actorState: updatedActor,
      targetStates: [updatedTarget],

      events,
      randomRolls,

      procContext: createDefaultProcContext(
        actor.actorId,
        `${battleState.battleId}:turn:${battleState.turnNumber}`,
      ),
    },
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

    case 'skip_turn':
      return resolveSkipTurn(battleState, command);

    default:
      return resolveUnsupportedAction(battleState, command);
  }
}
