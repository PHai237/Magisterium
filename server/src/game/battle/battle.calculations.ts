import {
  DAMAGE_TYPE_DEFENSE_MULTIPLIER,
  DAMAGE_TYPE_RESISTANCE_MULTIPLIER,
  DAMAGE_VARIANCE_RATIO,
  EXHAUSTED_DEFENSE_MULTIPLIER,
  EXHAUSTED_EVASION_RATE,
  EXHAUSTION_STAMINA_THRESHOLD,
  MAX_ABSORPTION_RATIO,
  MAX_DAMAGE_REDUCTION_RESISTANCE_VALUE,
  MAX_HIT_CHANCE_PERCENT,
  MAX_TURN_GAUGE_ADVANCE_TICKS,
  MIN_ACTION_SPEED,
  MIN_FINAL_DAMAGE,
  MIN_HIT_CHANCE_PERCENT,
  MIN_RESISTANCE_VALUE,
  RECOVERY_STAMINA_PERCENT,
  TURN_GAUGE_READY_VALUE,
} from './battle.constants';

import type {
  BattleActorState,
  BattleRandomContext,
  BattleResourceCheckResult,
  BattleResourceCost,
  BattleTurnOrderEntry,
  DamageCalculationInput,
  DamageCalculationResult,
  RandomRollRequest,
  RandomRollResult,
} from './battle.types';

import type {
  DamageType,
  ResistanceKey,
  ResourceType,
} from '../character/character.types';

interface ResistanceMitigationResult {
  damageAfterResistance: number;
  absorbedAmount: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toSafeNumber(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeChancePercent(chance: number): number {
  return clamp(toSafeNumber(chance), 0, 100);
}

export function advanceRandomContext(
  randomContext: BattleRandomContext,
): BattleRandomContext {
  return {
    ...randomContext,
    rollIndex: randomContext.rollIndex + 1,
  };
}

function buildRollSeed(request: RandomRollRequest): string {
  return [
    request.randomContext.battleId,
    request.randomContext.seed,
    request.randomContext.rollIndex,
    request.type,
    request.actorId,
    request.targetId ?? '',
    request.sourceId ?? '',
    request.eventType ?? '',
  ].join(':');
}

export function hashStringToUnitInterval(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0x100000000;
}

export function calculateRandomFinalChance(request: RandomRollRequest): number {
  const baseChance = normalizeChancePercent(request.baseChance);

  if (!request.luckScaling?.enabled) {
    return baseChance;
  }

  const luckValue = Math.max(0, toSafeNumber(request.luckValue ?? 0));
  const luckBonus = luckValue * request.luckScaling.multiplierPerPoint;

  return normalizeChancePercent(baseChance + luckBonus);
}

export function resolveRandomRoll(
  request: RandomRollRequest,
): RandomRollResult {
  const finalChance = calculateRandomFinalChance(request);
  const rollUnit = hashStringToUnitInterval(buildRollSeed(request));
  const rollPercent = roundToTwoDecimals(rollUnit * 100);

  return {
    type: request.type,

    actorId: request.actorId,
    targetId: request.targetId,

    baseChance: normalizeChancePercent(request.baseChance),
    finalChance,

    roll: rollPercent,
    success: rollUnit < finalChance / 100,

    randomContext: request.randomContext,
  };
}

export function calculateHitChance(
  attacker: BattleActorState,
  defender: BattleActorState,
): number {
  const attackerAccuracy = normalizeChancePercent(
    attacker.derivedStats.accuracy,
  );

  const defenderEvasion = defender.isExhausted
    ? EXHAUSTED_EVASION_RATE
    : normalizeChancePercent(defender.derivedStats.evasionRate);

  return roundToTwoDecimals(
    clamp(
      attackerAccuracy - defenderEvasion,
      MIN_HIT_CHANCE_PERCENT,
      MAX_HIT_CHANCE_PERCENT,
    ),
  );
}

export function calculateCritChance(attacker: BattleActorState): number {
  return roundToTwoDecimals(
    normalizeChancePercent(attacker.derivedStats.critRate),
  );
}

export function calculateFleeChance(actor: BattleActorState): number {
  return roundToTwoDecimals(
    normalizeChancePercent(actor.derivedStats.fleeRate),
  );
}

export function calculateSecondChanceRate(actor: BattleActorState): number {
  return roundToTwoDecimals(
    normalizeChancePercent(actor.derivedStats.secondChanceRate),
  );
}

export function calculateProcRate(actor: BattleActorState): number {
  return roundToTwoDecimals(
    normalizeChancePercent(actor.derivedStats.procRate),
  );
}

export function getDefenseForDamageType(
  defender: BattleActorState,
  damageType: DamageType,
): number {
  const damageTypeMultiplier = DAMAGE_TYPE_DEFENSE_MULTIPLIER[damageType];

  if (damageTypeMultiplier === 0) {
    return 0;
  }

  const baseDefense =
    damageType === 'physical'
      ? defender.derivedStats.pDef
      : defender.derivedStats.mDef;

  const exhaustionMultiplier = defender.isExhausted
    ? EXHAUSTED_DEFENSE_MULTIPLIER
    : 1;

  const effectiveDefense =
    baseDefense * exhaustionMultiplier * damageTypeMultiplier;

  return Math.max(0, roundToTwoDecimals(effectiveDefense));
}

export function applyDefenseMitigation(
  rawDamage: number,
  defender: BattleActorState,
  damageType: DamageType,
): number {
  const defense = getDefenseForDamageType(defender, damageType);

  return Math.max(0, roundToTwoDecimals(rawDamage - defense));
}

export function getDamageResistanceKey(
  damageType: DamageType,
): ResistanceKey | null {
  switch (damageType) {
    case 'physical':
    case 'magical':
      return damageType;

    case 'true':
      return null;
  }
}

export function getResistanceValue(
  defender: BattleActorState,
  resistanceKey: ResistanceKey,
): number {
  return defender.resistances[resistanceKey] ?? 0;
}

export function calculateResistanceMultiplier(resistanceValue: number): number {
  const safeResistance = clamp(
    toSafeNumber(resistanceValue),
    MIN_RESISTANCE_VALUE,
    MAX_DAMAGE_REDUCTION_RESISTANCE_VALUE,
  );

  return 1 - safeResistance;
}

function applySingleResistanceLayer(
  currentDamage: number,
  resistanceValue: number,
): ResistanceMitigationResult {
  const safeResistance = toSafeNumber(resistanceValue);

  if (currentDamage <= 0) {
    return {
      damageAfterResistance: 0,
      absorbedAmount: 0,
    };
  }

  if (safeResistance >= 1) {
    const absorptionRatio = clamp(safeResistance - 1, 0, MAX_ABSORPTION_RATIO);

    return {
      damageAfterResistance: 0,
      absorbedAmount: roundToTwoDecimals(currentDamage * absorptionRatio),
    };
  }

  const damageAfterResistance =
    currentDamage * calculateResistanceMultiplier(safeResistance);

  return {
    damageAfterResistance: Math.max(
      0,
      roundToTwoDecimals(damageAfterResistance),
    ),
    absorbedAmount: 0,
  };
}

export function calculateResistanceMitigation(
  damageAfterDefense: number,
  defender: BattleActorState,
  damageType: DamageType,
  elementType?: ResistanceKey,
): ResistanceMitigationResult {
  let currentDamage = Math.max(0, damageAfterDefense);
  let absorbedAmount = 0;

  if (DAMAGE_TYPE_RESISTANCE_MULTIPLIER[damageType] === 0) {
    return {
      damageAfterResistance: Math.max(0, roundToTwoDecimals(currentDamage)),
      absorbedAmount: 0,
    };
  }

  const damageResistanceKey = getDamageResistanceKey(damageType);

  if (damageResistanceKey) {
    const layerResult = applySingleResistanceLayer(
      currentDamage,
      getResistanceValue(defender, damageResistanceKey),
    );

    currentDamage = layerResult.damageAfterResistance;
    absorbedAmount += layerResult.absorbedAmount;
  }

  if (elementType) {
    const layerResult = applySingleResistanceLayer(
      currentDamage,
      getResistanceValue(defender, elementType),
    );

    currentDamage = layerResult.damageAfterResistance;
    absorbedAmount += layerResult.absorbedAmount;
  }

  return {
    damageAfterResistance: Math.max(0, roundToTwoDecimals(currentDamage)),
    absorbedAmount: Math.max(0, roundToTwoDecimals(absorbedAmount)),
  };
}

export function applyResistanceMitigation(
  damageAfterDefense: number,
  defender: BattleActorState,
  damageType: DamageType,
  elementType?: ResistanceKey,
): number {
  return calculateResistanceMitigation(
    damageAfterDefense,
    defender,
    damageType,
    elementType,
  ).damageAfterResistance;
}

export function calculateCriticalMultiplier(
  attacker: BattleActorState,
): number {
  const critDamageBonusPercent = Math.max(
    0,
    toSafeNumber(attacker.derivedStats.critDamageBonus),
  );

  return roundToTwoDecimals(1 + critDamageBonusPercent / 100);
}

export function calculateRawDamage(input: DamageCalculationInput): number {
  let rawDamage = Math.max(0, input.basePower + input.scalingValue);

  if (input.isCritical) {
    rawDamage *= calculateCriticalMultiplier(input.attacker);
  }

  return Math.max(0, roundToTwoDecimals(rawDamage));
}

export function finalizeDamage(damageAfterResistance: number): number {
  if (damageAfterResistance <= 0) {
    return 0;
  }

  return Math.max(MIN_FINAL_DAMAGE, Math.floor(damageAfterResistance));
}

export function calculateDamage(
  input: DamageCalculationInput,
  varianceRollUnit = 0.5,
): DamageCalculationResult {
  let rawDamage = calculateRawDamage(input);

  const varianceMultiplier =
    calculateDamageVarianceMultiplier(varianceRollUnit);

  rawDamage = roundToTwoDecimals(rawDamage * varianceMultiplier);

  const damageAfterDefense = applyDefenseMitigation(
    rawDamage,
    input.defender,
    input.damageType,
  );

  const resistanceResult = calculateResistanceMitigation(
    damageAfterDefense,
    input.defender,
    input.damageType,
    input.elementType,
  );

  const finalDamage = finalizeDamage(resistanceResult.damageAfterResistance);

  return {
    rawDamage,

    damageAfterDefense,
    damageAfterResistance: resistanceResult.damageAfterResistance,

    absorbedAmount: resistanceResult.absorbedAmount,
    finalDamage,

    damageType: input.damageType,
    elementType: input.elementType,

    isCritical: input.isCritical,
    isTrueDamage: input.damageType === 'true',

    wasFullyBlocked: rawDamage > 0 && finalDamage === 0,
  };
}

export function calculateDamageVarianceMultiplier(rollUnit: number): number {
  const normalizedRoll = clamp(toSafeNumber(rollUnit), 0, 1);
  const minMultiplier = 1 - DAMAGE_VARIANCE_RATIO;
  const maxMultiplier = 1 + DAMAGE_VARIANCE_RATIO;

  return roundToTwoDecimals(
    minMultiplier + normalizedRoll * (maxMultiplier - minMultiplier),
  );
}

export function getCurrentResource(
  actor: BattleActorState,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return actor.hp;
    case 'MP':
      return actor.mp;
    case 'Stamina':
      return actor.stamina;
  }
}

export function calculateResourceCheck(
  actor: BattleActorState,
  costs: BattleResourceCost[],
): BattleResourceCheckResult {
  const missingResources: BattleResourceCost[] = [];

  for (const cost of costs) {
    const amount = Math.max(0, cost.amount);

    if (amount === 0) {
      continue;
    }

    const currentResource = getCurrentResource(actor, cost.resourceType);

    if (currentResource < amount) {
      missingResources.push({
        resourceType: cost.resourceType,
        amount: amount - currentResource,
      });
    }
  }

  return {
    canPay: missingResources.length === 0,
    missingResources,
  };
}

export function spendResources(
  actor: BattleActorState,
  costs: BattleResourceCost[],
): BattleActorState {
  let hp = actor.hp;
  let mp = actor.mp;
  let stamina = actor.stamina;

  for (const cost of costs) {
    const amount = Math.max(0, cost.amount);

    switch (cost.resourceType) {
      case 'HP':
        hp = Math.max(0, hp - amount);
        break;
      case 'MP':
        mp = Math.max(0, mp - amount);
        break;
      case 'Stamina':
        stamina = Math.max(0, stamina - amount);
        break;
    }
  }

  return updateExhaustionState({
    ...actor,
    hp,
    mp,
    stamina,
  });
}

export function isStaminaExhausted(stamina: number): boolean {
  return toSafeNumber(stamina) <= EXHAUSTION_STAMINA_THRESHOLD;
}

export function shouldRecoverFromExhaustion(actor: BattleActorState): boolean {
  const recoveryThreshold =
    actor.derivedStats.maxStamina * RECOVERY_STAMINA_PERCENT;

  return actor.stamina > recoveryThreshold;
}

export function updateExhaustionState(
  actor: BattleActorState,
): BattleActorState {
  if (isStaminaExhausted(actor.stamina)) {
    return {
      ...actor,
      isExhausted: true,
    };
  }

  if (actor.isExhausted && shouldRecoverFromExhaustion(actor)) {
    return {
      ...actor,
      isExhausted: false,
    };
  }

  return actor;
}

function normalizeTurnOrderEntry(
  entry: BattleTurnOrderEntry,
): BattleTurnOrderEntry {
  return {
    ...entry,
    actionSpeed: Math.max(
      MIN_ACTION_SPEED,
      toSafeNumber(entry.actionSpeed, MIN_ACTION_SPEED),
    ),
    turnGauge: Math.max(0, toSafeNumber(entry.turnGauge, 0)),
  };
}

export function createTurnOrderEntry(
  actor: BattleActorState,
  initiative: number,
): BattleTurnOrderEntry {
  return {
    actorId: actor.actorId,
    actionSpeed: Math.max(
      MIN_ACTION_SPEED,
      toSafeNumber(actor.derivedStats.actionSpeed, MIN_ACTION_SPEED),
    ),
    initiative,
    turnGauge: 0,
    hasActedThisRound: false,
  };
}

export function createInitialTurnOrder(
  actors: BattleActorState[],
): BattleTurnOrderEntry[] {
  return actors
    .map((actor, index) => createTurnOrderEntry(actor, index))
    .sort((left, right) => {
      if (right.actionSpeed !== left.actionSpeed) {
        return right.actionSpeed - left.actionSpeed;
      }

      return left.initiative - right.initiative;
    });
}

export function getReadyTurnEntries(
  turnOrder: BattleTurnOrderEntry[],
): BattleTurnOrderEntry[] {
  return turnOrder.filter((entry) => entry.turnGauge >= TURN_GAUGE_READY_VALUE);
}

export function consumeTurnGauge(
  entry: BattleTurnOrderEntry,
): BattleTurnOrderEntry {
  const normalizedEntry = normalizeTurnOrderEntry(entry);

  return {
    ...normalizedEntry,
    turnGauge: Math.max(0, normalizedEntry.turnGauge - TURN_GAUGE_READY_VALUE),
  };
}

export function advanceTurnGaugeOnce(
  turnOrder: BattleTurnOrderEntry[],
): BattleTurnOrderEntry[] {
  return turnOrder.map((entry) => {
    const normalizedEntry = normalizeTurnOrderEntry(entry);

    return {
      ...normalizedEntry,
      turnGauge: normalizedEntry.turnGauge + normalizedEntry.actionSpeed,
    };
  });
}

export function advanceTurnGaugeUntilReady(
  turnOrder: BattleTurnOrderEntry[],
): BattleTurnOrderEntry[] {
  let nextTurnOrder = turnOrder.map((entry) => normalizeTurnOrderEntry(entry));
  let safetyCounter = 0;

  if (nextTurnOrder.length === 0) {
    return nextTurnOrder;
  }

  while (
    getReadyTurnEntries(nextTurnOrder).length === 0 &&
    safetyCounter < MAX_TURN_GAUGE_ADVANCE_TICKS
  ) {
    nextTurnOrder = advanceTurnGaugeOnce(nextTurnOrder);
    safetyCounter += 1;
  }

  return nextTurnOrder;
}
