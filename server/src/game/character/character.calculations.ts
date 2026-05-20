import {
  BRONZE_PER_GOLD,
  BRONZE_PER_SILVER,
  DEFAULT_STARTER_KIT_ID,
  FALNA_ACCUMULATED_BONUS_MAX,
  FALNA_FRAGMENT_COUNT_MAX,
  FALNA_VISIBLE_STAT_MAX,
  FALNA_VISIBLE_STAT_MIN,
  MAX_SAFE_BRONZE_INPUT,
  MAX_SAFE_BRONZE_TOTAL,
  MAX_SAFE_GOLD_INPUT,
  MAX_SAFE_SILVER_INPUT,
  ORIGIN_DEFINITIONS,
  STARTER_KIT_DEFINITIONS,
  STAT_KEYS,
  ZERO_BASE_STATS,
} from './character.constants';

import type {
  BaseStats,
  Character,
  CharacterSnapshot,
  CurrencyAmount,
  CurrentState,
  DerivedStats,
  OriginDefinition,
  OriginId,
  StarterKitDefinition,
  StarterKitId,
  StatKey,
  StatProgress,
} from './character.types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toSafeInteger(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.floor(value);
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertSafeNonNegativeInteger(
  value: number,
  label: string,
): number {
  const normalizedValue = toSafeInteger(value);

  if (!Number.isSafeInteger(normalizedValue)) {
    throw new Error(`${label} must be a safe integer.`);
  }

  if (normalizedValue < 0) {
    throw new Error(`${label} must not be negative.`);
  }

  return normalizedValue;
}

export function assertSafeCurrencyTotal(totalBronze: number): number {
  const normalizedTotal = assertSafeNonNegativeInteger(
    totalBronze,
    'Currency total',
  );

  if (normalizedTotal > MAX_SAFE_BRONZE_TOTAL) {
    throw new Error('Currency total exceeds the safe integer limit.');
  }

  return normalizedTotal;
}

function assertSafeCurrencyUnitAmount(
  value: number,
  maxValue: number,
  label: string,
): number {
  const normalizedValue = assertSafeNonNegativeInteger(value, label);

  if (normalizedValue > maxValue) {
    throw new Error(`${label} exceeds the safe currency conversion limit.`);
  }

  return normalizedValue;
}

export function createStatProgress(
  currentValue = 0,
  fragmentCount = 0,
  accumulatedBonus = 0,
): StatProgress {
  return {
    currentValue: clamp(
      toSafeInteger(currentValue),
      FALNA_VISIBLE_STAT_MIN,
      FALNA_VISIBLE_STAT_MAX,
    ),
    fragmentCount: clamp(
      toSafeInteger(fragmentCount),
      0,
      FALNA_FRAGMENT_COUNT_MAX,
    ),
    accumulatedBonus: clamp(
      toSafeInteger(accumulatedBonus),
      0,
      FALNA_ACCUMULATED_BONUS_MAX,
    ),
  };
}

export function createEmptyStatProgressRecord(): Record<StatKey, StatProgress> {
  return {
    STR: createStatProgress(),
    DEX: createStatProgress(),
    CON: createStatProgress(),
    INT: createStatProgress(),
    WIS: createStatProgress(),
    LUK: createStatProgress(),
  };
}

export function normalizeStatProgress(progress?: StatProgress): StatProgress {
  if (!progress) {
    return createStatProgress();
  }

  return createStatProgress(
    progress.currentValue,
    progress.fragmentCount,
    progress.accumulatedBonus,
  );
}

export function normalizeStatProgressRecord(
  stats: Partial<Record<StatKey, StatProgress>>,
): Record<StatKey, StatProgress> {
  const normalized = createEmptyStatProgressRecord();

  for (const statKey of STAT_KEYS) {
    normalized[statKey] = normalizeStatProgress(stats[statKey]);
  }

  return normalized;
}

export function getOriginById(originId: OriginId): OriginDefinition {
  const found = ORIGIN_DEFINITIONS.find((origin) => origin.id === originId);

  if (!found) {
    throw new Error(`Origin not found: ${originId}`);
  }

  return found;
}

export function getStarterKitById(
  starterKitId: StarterKitId,
): StarterKitDefinition {
  const found = STARTER_KIT_DEFINITIONS.find((kit) => kit.id === starterKitId);

  if (!found) {
    throw new Error(`Starter kit not found: ${starterKitId}`);
  }

  return found;
}

export function getDefaultStarterKit(): StarterKitDefinition {
  return getStarterKitById(DEFAULT_STARTER_KIT_ID);
}

export function buildStatsForOrigin(
  originDef: OriginDefinition,
): Record<StatKey, StatProgress> {
  const stats = createEmptyStatProgressRecord();

  for (const statKey of STAT_KEYS) {
    stats[statKey] = createStatProgress(originDef.initialStatBonus[statKey]);
  }

  return stats;
}

export function getEffectiveStatValue(progress: StatProgress): number {
  const normalized = normalizeStatProgress(progress);

  return clamp(
    normalized.currentValue + normalized.accumulatedBonus,
    FALNA_VISIBLE_STAT_MIN,
    FALNA_VISIBLE_STAT_MAX,
  );
}

export function calculateBaseStats(
  stats: Record<StatKey, StatProgress>,
): BaseStats {
  const normalizedStats = normalizeStatProgressRecord(stats);

  const baseStats: BaseStats = {
    ...ZERO_BASE_STATS,
  };

  for (const statKey of STAT_KEYS) {
    baseStats[statKey] = getEffectiveStatValue(normalizedStats[statKey]);
  }

  return baseStats;
}

export function addBaseStats(left: BaseStats, right: BaseStats): BaseStats {
  return {
    STR: left.STR + right.STR,
    DEX: left.DEX + right.DEX,
    CON: left.CON + right.CON,
    INT: left.INT + right.INT,
    WIS: left.WIS + right.WIS,
    LUK: left.LUK + right.LUK,
  };
}

export function calculateDerivedStats(baseStats: BaseStats): DerivedStats {
  const { STR, DEX, CON, INT, WIS, LUK } = baseStats;

  const maxHp = Math.floor(20 + CON * 5);
  const maxMp = Math.floor(20 + INT * 3 + WIS * 2);
  const maxStamina = Math.floor(100 + CON + DEX + STR);

  const pAtk = roundToTwoDecimals(5 + STR * 1.5 + DEX * 0.5);
  const mAtk = roundToTwoDecimals(5 + INT * 2);
  const healingPotency = roundToTwoDecimals(5 + WIS * 1.5 + INT * 0.5);

  const pDef = roundToTwoDecimals(CON * 0.5 + STR * 0.2);
  const mDef = roundToTwoDecimals(WIS * 0.5 + INT * 0.2);

  const actionSpeed = roundToTwoDecimals(10 + DEX);

  const accuracy = roundToTwoDecimals(
    clamp(90 + DEX * 0.5 + LUK * 0.2, 50, 98),
  );

  const evasionRate = roundToTwoDecimals(clamp(DEX * 0.4 + LUK * 0.1, 0, 45));

  const critRate = roundToTwoDecimals(clamp(1 + LUK * 0.5 + DEX * 0.1, 0, 50));

  const critDamageBonus = roundToTwoDecimals(clamp(50 + STR * 0.5, 50, 150));

  const fleeRate = roundToTwoDecimals(clamp(5 + DEX * 0.5 + LUK * 0.3, 5, 75));

  const statusResist = roundToTwoDecimals(clamp(WIS * 0.5 + LUK * 0.2, 0, 75));

  const spiritualPotency = roundToTwoDecimals(WIS);

  const mpRegen = clamp(1 + Math.floor(WIS / 5), 1, 30);
  const staminaRegen = clamp(5 + Math.floor(CON / 3), 5, 40);

  const secondChanceRate = roundToTwoDecimals(clamp(LUK * 0.2, 0, 25));
  const procRate = roundToTwoDecimals(clamp(LUK * 0.5, 0, 50));

  return {
    maxHp,
    maxMp,
    maxStamina,

    pAtk,
    mAtk,
    healingPotency,

    pDef,
    mDef,

    actionSpeed,
    accuracy,
    evasionRate,

    critRate,
    critDamageBonus,

    fleeRate,

    statusResist,
    spiritualPotency,

    mpRegen,
    staminaRegen,

    secondChanceRate,
    procRate,
  };
}

export function buildCurrentState(derivedStats: DerivedStats): CurrentState {
  return {
    hp: derivedStats.maxHp,
    mp: derivedStats.maxMp,
    stamina: derivedStats.maxStamina,
  };
}

export function clampCurrentState(
  currentState: CurrentState,
  derivedStats: DerivedStats,
): CurrentState {
  return {
    hp: clamp(toSafeInteger(currentState.hp), 0, derivedStats.maxHp),
    mp: clamp(toSafeInteger(currentState.mp), 0, derivedStats.maxMp),
    stamina: clamp(
      toSafeInteger(currentState.stamina),
      0,
      derivedStats.maxStamina,
    ),
  };
}

export function createCharacterSnapshot(
  character: Character,
): CharacterSnapshot {
  const baseStats = calculateBaseStats(character.stats);
  const derivedStats = calculateDerivedStats(baseStats);

  return {
    ...character,
    currentState: clampCurrentState(character.currentState, derivedStats),
    baseStats,
    derivedStats,
  };
}

export function breakDownBronze(totalBronze: number): CurrencyAmount {
  const normalizedTotal = assertSafeCurrencyTotal(totalBronze);

  const gold = Math.floor(normalizedTotal / BRONZE_PER_GOLD);
  const remainderAfterGold = normalizedTotal % BRONZE_PER_GOLD;

  const silver = Math.floor(remainderAfterGold / BRONZE_PER_SILVER);
  const bronze = remainderAfterGold % BRONZE_PER_SILVER;

  return {
    bronze,
    silver,
    gold,
  };
}

export function convertToBronze(amount: CurrencyAmount): number {
  const bronze = assertSafeCurrencyUnitAmount(
    amount.bronze,
    MAX_SAFE_BRONZE_INPUT,
    'Bronze amount',
  );

  const silver = assertSafeCurrencyUnitAmount(
    amount.silver,
    MAX_SAFE_SILVER_INPUT,
    'Silver amount',
  );

  const gold = assertSafeCurrencyUnitAmount(
    amount.gold,
    MAX_SAFE_GOLD_INPUT,
    'Gold amount',
  );

  const totalBronze =
    gold * BRONZE_PER_GOLD + silver * BRONZE_PER_SILVER + bronze;

  return assertSafeCurrencyTotal(totalBronze);
}

export function normalizeCurrency(amount: CurrencyAmount): CurrencyAmount {
  return breakDownBronze(convertToBronze(amount));
}

export function addBronze(
  currentMoneyBronze: number,
  deltaBronze: number,
): number {
  const current = assertSafeCurrencyTotal(currentMoneyBronze);
  const delta = toSafeInteger(deltaBronze);

  if (!Number.isSafeInteger(delta)) {
    throw new Error('Currency delta must be a safe integer.');
  }

  const nextTotal = current + delta;

  if (!Number.isSafeInteger(nextTotal)) {
    throw new Error('Currency operation exceeds the safe integer limit.');
  }

  if (nextTotal < 0) {
    return 0;
  }

  return assertSafeCurrencyTotal(nextTotal);
}
