import {
  DAMAGE_TYPE_DEFENSE_MULTIPLIER,
  DAMAGE_TYPE_RESISTANCE_MULTIPLIER,
  DAMAGE_VARIANCE_RATIO,
  EXHAUSTED_DEFENSE_MULTIPLIER,
  EXHAUSTED_EVASION_RATE,
  EXHAUSTION_STAMINA_THRESHOLD,
  MAX_ABSORBED_HEAL_RATIO_OF_MAX_HP,
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
} from '../battle.constants';

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
} from '../battle.types';

import type {
  DamageType,
  ResistanceKey,
  ResourceType,
} from '../../character/character.types';

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

function normalizeNonNegativeIntegerValue(value: number): number {
  return Math.max(0, Math.floor(toSafeNumber(value)));
}

function normalizeResourceCostAmount(amount: number): number {
  return normalizeNonNegativeIntegerValue(amount);
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
    request.sourceType ?? '',
    request.eventType ?? '',
  ].join(':');
}

export function hashStringToUnitInterval(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
}

export function calculateRandomFinalChance(request: RandomRollRequest): number {
  const baseChance = normalizeChancePercent(request.baseChance);

  if (!request.luckScaling?.enabled) {
    return roundToTwoDecimals(baseChance);
  }

  const luckValue = Math.max(0, toSafeNumber(request.luckValue ?? 0));
  const multiplierPerPoint = toSafeNumber(
    request.luckScaling.multiplierPerPoint,
  );

  return roundToTwoDecimals(
    normalizeChancePercent(baseChance + luckValue * multiplierPerPoint),
  );
}

export function resolveRandomRoll(
  request: RandomRollRequest,
): RandomRollResult {
  const finalChance = calculateRandomFinalChance(request);
  const rollUnit = hashStringToUnitInterval(buildRollSeed(request));
  const roll = roundToTwoDecimals(rollUnit * 100);

  return {
    type: request.type,

    actorId: request.actorId,
    targetId: request.targetId,

    baseChance: request.baseChance,
    finalChance,

    roll,
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
    toSafeNumber(baseDefense) * exhaustionMultiplier * damageTypeMultiplier;

  return Math.max(0, roundToTwoDecimals(effectiveDefense));
}

export function applyDefenseMitigation(
  rawDamage: number,
  defender: BattleActorState,
  damageType: DamageType,
): number {
  const defense = getDefenseForDamageType(defender, damageType);

  return Math.max(0, roundToTwoDecimals(toSafeNumber(rawDamage) - defense));
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
  const safeCurrentDamage = Math.max(0, toSafeNumber(currentDamage));

  if (safeCurrentDamage <= 0) {
    return {
      damageAfterResistance: 0,
      absorbedAmount: 0,
    };
  }

  if (safeResistance >= 1) {
    const absorptionRatio = clamp(safeResistance - 1, 0, MAX_ABSORPTION_RATIO);

    return {
      damageAfterResistance: 0,
      absorbedAmount: roundToTwoDecimals(safeCurrentDamage * absorptionRatio),
    };
  }

  const damageAfterResistance =
    safeCurrentDamage * calculateResistanceMultiplier(safeResistance);

  return {
    damageAfterResistance: Math.max(
      0,
      roundToTwoDecimals(damageAfterResistance),
    ),
    absorbedAmount: 0,
  };
}

function calculateAbsorbedAmountCap(defender: BattleActorState): number {
  return roundToTwoDecimals(
    getMaxResource(defender, 'HP') * MAX_ABSORBED_HEAL_RATIO_OF_MAX_HP,
  );
}

function capAbsorbedAmount(
  absorbedAmount: number,
  defender: BattleActorState,
): number {
  return roundToTwoDecimals(
    Math.min(
      Math.max(0, toSafeNumber(absorbedAmount)),
      calculateAbsorbedAmountCap(defender),
    ),
  );
}

export function calculateResistanceMitigation(
  damageAfterDefense: number,
  defender: BattleActorState,
  damageType: DamageType,
  elementType?: ResistanceKey,
): ResistanceMitigationResult {
  let currentDamage = Math.max(0, toSafeNumber(damageAfterDefense));
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
    absorbedAmount: capAbsorbedAmount(absorbedAmount, defender),
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
  let rawDamage = Math.max(
    0,
    toSafeNumber(input.basePower) + toSafeNumber(input.scalingValue),
  );

  const canApplyCritical = input.damageType !== 'true';

  if (input.isCritical && canApplyCritical) {
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

export function calculateDamageVarianceMultiplier(rollUnit: number): number {
  const normalizedRoll = clamp(toSafeNumber(rollUnit), 0, 1);
  const minMultiplier = 1 - DAMAGE_VARIANCE_RATIO;
  const maxMultiplier = 1 + DAMAGE_VARIANCE_RATIO;

  return roundToTwoDecimals(
    minMultiplier + normalizedRoll * (maxMultiplier - minMultiplier),
  );
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

    isCritical: input.damageType !== 'true' && input.isCritical,
    isTrueDamage: input.damageType === 'true',

    wasFullyBlocked: rawDamage > 0 && finalDamage === 0,
  };
}

export function getMaxResource(
  actor: BattleActorState,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return normalizeNonNegativeIntegerValue(actor.derivedStats.maxHp);

    case 'MP':
      return normalizeNonNegativeIntegerValue(actor.derivedStats.maxMp);

    case 'Stamina':
      return normalizeNonNegativeIntegerValue(actor.derivedStats.maxStamina);
  }
}

function clampResourceValue(
  actor: BattleActorState,
  resourceType: ResourceType,
  value: number,
): number {
  return clamp(
    normalizeNonNegativeIntegerValue(value),
    0,
    getMaxResource(actor, resourceType),
  );
}

export function getCurrentResource(
  actor: BattleActorState,
  resourceType: ResourceType,
): number {
  switch (resourceType) {
    case 'HP':
      return clampResourceValue(actor, 'HP', actor.hp);

    case 'MP':
      return clampResourceValue(actor, 'MP', actor.mp);

    case 'Stamina':
      return clampResourceValue(actor, 'Stamina', actor.stamina);
  }
}

function getExhaustionRecoveryThreshold(actor: BattleActorState): number {
  const maxStamina = getMaxResource(actor, 'Stamina');

  if (maxStamina <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return maxStamina * RECOVERY_STAMINA_PERCENT;
}

export function updateExhaustionState(
  actor: BattleActorState,
): BattleActorState {
  const maxStamina = getMaxResource(actor, 'Stamina');
  const stamina = clampResourceValue(actor, 'Stamina', actor.stamina);

  if (maxStamina <= 0) {
    return {
      ...actor,
      stamina: 0,
      isExhausted: true,
    };
  }

  if (stamina <= EXHAUSTION_STAMINA_THRESHOLD) {
    return {
      ...actor,
      stamina,
      isExhausted: true,
    };
  }

  if (!actor.isExhausted) {
    return {
      ...actor,
      stamina,
      isExhausted: false,
    };
  }

  return {
    ...actor,
    stamina,
    isExhausted: stamina <= getExhaustionRecoveryThreshold(actor),
  };
}

export function calculateResourceCheck(
  actor: BattleActorState,
  costs: BattleResourceCost[],
): BattleResourceCheckResult {
  const missingResources: BattleResourceCost[] = [];

  for (const cost of costs) {
    const amount = normalizeResourceCostAmount(cost.amount);

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
  let hp = getCurrentResource(actor, 'HP');
  let mp = getCurrentResource(actor, 'MP');
  let stamina = getCurrentResource(actor, 'Stamina');

  for (const cost of costs) {
    const amount = normalizeResourceCostAmount(cost.amount);

    if (amount <= 0) {
      continue;
    }

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
    hp: clampResourceValue(actor, 'HP', hp),
    mp: clampResourceValue(actor, 'MP', mp),
    stamina: clampResourceValue(actor, 'Stamina', stamina),
  });
}

function normalizeTurnOrderEntry(
  entry: BattleTurnOrderEntry,
): BattleTurnOrderEntry {
  return {
    ...entry,
    actionSpeed: Math.max(
      MIN_ACTION_SPEED,
      normalizeNonNegativeIntegerValue(entry.actionSpeed),
    ),
    turnGauge: normalizeNonNegativeIntegerValue(entry.turnGauge),
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
      normalizeNonNegativeIntegerValue(actor.derivedStats.actionSpeed),
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

function forceHighestGaugeEntryReady(
  turnOrder: BattleTurnOrderEntry[],
): BattleTurnOrderEntry[] {
  if (turnOrder.length === 0) {
    return [];
  }

  const bestEntry = [...turnOrder].sort((left, right) => {
    if (right.turnGauge !== left.turnGauge) {
      return right.turnGauge - left.turnGauge;
    }

    if (right.actionSpeed !== left.actionSpeed) {
      return right.actionSpeed - left.actionSpeed;
    }

    return left.initiative - right.initiative;
  })[0];

  return turnOrder.map((entry) =>
    entry.actorId === bestEntry.actorId
      ? {
          ...entry,
          turnGauge: TURN_GAUGE_READY_VALUE,
        }
      : entry,
  );
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

  if (getReadyTurnEntries(nextTurnOrder).length > 0) {
    return nextTurnOrder;
  }

  return forceHighestGaugeEntryReady(nextTurnOrder);
}
