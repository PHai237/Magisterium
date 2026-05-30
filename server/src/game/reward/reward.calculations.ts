import type {
  BattleRewardCalculationInput,
  BattleRewardSummary,
  DefeatedMonsterRewardSource,
  LootRollResult,
  RewardItemStack,
} from './reward.types';

import type { ItemId } from '../character/character.types';

import type {
  MonsterId,
  MonsterLootEntry,
  MonsterRandomLootPool,
  MonsterRandomLootPoolEntry,
} from '../monster/monster.types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toSafeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function hashStringToUnitInterval(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0x100000000;
}

function rollPercent(seed: string): number {
  return roundToTwoDecimals(hashStringToUnitInterval(seed) * 100);
}

function buildLootRollSeed(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  itemId: ItemId;
}): string {
  return [
    input.battleId,
    input.seed,
    input.actorId,
    input.monsterId,
    input.itemId,
    'loot_drop',
  ].join(':');
}

function buildQuantityRollSeed(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  itemId: ItemId;
}): string {
  return [
    input.battleId,
    input.seed,
    input.actorId,
    input.monsterId,
    input.itemId,
    'loot_quantity',
  ].join(':');
}

function buildRandomLootPoolDropSeed(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  poolId: string;
}): string {
  return [
    input.battleId,
    input.seed,
    input.actorId,
    input.monsterId,
    input.poolId,
    'random_loot_pool_drop',
  ].join(':');
}

function buildRandomLootPoolPickSeed(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  poolId: string;
}): string {
  return [
    input.battleId,
    input.seed,
    input.actorId,
    input.monsterId,
    input.poolId,
    'random_loot_pool_pick',
  ].join(':');
}

function normalizeLootChance(chancePercent: number): number {
  if (!Number.isFinite(chancePercent)) {
    return 0;
  }

  return roundToTwoDecimals(clamp(chancePercent, 0, 100));
}

function normalizeLootQuantityRange(entry: {
  minQuantity: number;
  maxQuantity: number;
}): {
  minQuantity: number;
  maxQuantity: number;
} {
  const minQuantity = toSafeNonNegativeInteger(entry.minQuantity);
  const rawMaxQuantity = toSafeNonNegativeInteger(entry.maxQuantity);

  return {
    minQuantity,
    maxQuantity: Math.max(minQuantity, rawMaxQuantity),
  };
}

function normalizeRandomLootWeight(weight: number): number {
  if (!Number.isFinite(weight)) {
    return 0;
  }

  return Math.max(0, weight);
}

function pickRandomLootPoolEntry(input: {
  pool: MonsterRandomLootPool;
  pickPercent: number;
}): MonsterRandomLootPoolEntry | undefined {
  const weightedEntries = input.pool.entries
    .map((entry) => ({
      entry,
      weight: normalizeRandomLootWeight(entry.weight),
    }))
    .filter((entry) => entry.weight > 0);

  const totalWeight = weightedEntries.reduce(
    (total, entry) => total + entry.weight,
    0,
  );

  if (totalWeight <= 0) {
    return undefined;
  }

  const targetWeight = (input.pickPercent / 100) * totalWeight;
  let accumulatedWeight = 0;

  for (const weightedEntry of weightedEntries) {
    accumulatedWeight += weightedEntry.weight;

    if (targetWeight < accumulatedWeight) {
      return weightedEntry.entry;
    }
  }

  return weightedEntries[weightedEntries.length - 1]?.entry;
}

function rollLootQuantity(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  itemId: ItemId;
  minQuantity: number;
  maxQuantity: number;
}): {
  quantity: number;
  quantityRollPercent?: number;
} {
  if (input.maxQuantity <= 0) {
    return {
      quantity: 0,
    };
  }

  if (input.minQuantity === input.maxQuantity) {
    return {
      quantity: input.minQuantity,
    };
  }

  const quantityRollPercent = rollPercent(buildQuantityRollSeed(input));
  const quantityRollUnit = quantityRollPercent / 100;
  const quantityRange = input.maxQuantity - input.minQuantity + 1;

  return {
    quantity: Math.min(
      input.maxQuantity,
      input.minQuantity + Math.floor(quantityRollUnit * quantityRange),
    ),
    quantityRollPercent,
  };
}

function rollRandomLootPool(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  pool: MonsterRandomLootPool;
}): LootRollResult | undefined {
  const selectedEntry = pickRandomLootPoolEntry({
    pool: input.pool,
    pickPercent: rollPercent(
      buildRandomLootPoolPickSeed({
        battleId: input.battleId,
        seed: input.seed,
        actorId: input.actorId,
        monsterId: input.monsterId,
        poolId: input.pool.id,
      }),
    ),
  });

  if (!selectedEntry) {
    return undefined;
  }

  const chancePercent = normalizeLootChance(input.pool.chancePercent);
  const rollPercentValue = rollPercent(
    buildRandomLootPoolDropSeed({
      battleId: input.battleId,
      seed: input.seed,
      actorId: input.actorId,
      monsterId: input.monsterId,
      poolId: input.pool.id,
    }),
  );

  const dropped = rollPercentValue < chancePercent;
  const quantityRange = normalizeLootQuantityRange(selectedEntry);

  const quantityResult = dropped
    ? rollLootQuantity({
        battleId: input.battleId,
        seed: input.seed,
        actorId: input.actorId,
        monsterId: input.monsterId,
        itemId: selectedEntry.itemId,
        minQuantity: quantityRange.minQuantity,
        maxQuantity: quantityRange.maxQuantity,
      })
    : {
        quantity: 0,
      };

  return {
    actorId: input.actorId,
    monsterId: input.monsterId,

    itemId: selectedEntry.itemId,

    chancePercent,
    rollPercent: rollPercentValue,

    dropped,

    quantity: quantityResult.quantity,

    minQuantity: quantityRange.minQuantity,
    maxQuantity: quantityRange.maxQuantity,

    quantityRollPercent: quantityResult.quantityRollPercent,
  };
}

function rollLootEntry(input: {
  battleId: string;
  seed: string;
  actorId: string;
  monsterId: MonsterId;
  entry: MonsterLootEntry;
}): LootRollResult {
  const chancePercent = normalizeLootChance(input.entry.chancePercent);
  const rollPercentValue = rollPercent(
    buildLootRollSeed({
      battleId: input.battleId,
      seed: input.seed,
      actorId: input.actorId,
      monsterId: input.monsterId,
      itemId: input.entry.itemId,
    }),
  );

  const dropped = rollPercentValue < chancePercent;
  const quantityRange = normalizeLootQuantityRange(input.entry);

  const quantityResult = dropped
    ? rollLootQuantity({
        battleId: input.battleId,
        seed: input.seed,
        actorId: input.actorId,
        monsterId: input.monsterId,
        itemId: input.entry.itemId,
        minQuantity: quantityRange.minQuantity,
        maxQuantity: quantityRange.maxQuantity,
      })
    : {
        quantity: 0,
      };

  return {
    actorId: input.actorId,
    monsterId: input.monsterId,

    itemId: input.entry.itemId,

    chancePercent,
    rollPercent: rollPercentValue,

    dropped,

    quantity: quantityResult.quantity,

    minQuantity: quantityRange.minQuantity,
    maxQuantity: quantityRange.maxQuantity,

    quantityRollPercent: quantityResult.quantityRollPercent,
  };
}

function aggregateItemStacks(lootRolls: LootRollResult[]): RewardItemStack[] {
  const quantityByItemId = new Map<ItemId, number>();

  for (const roll of lootRolls) {
    if (!roll.dropped || roll.quantity <= 0) {
      continue;
    }

    quantityByItemId.set(
      roll.itemId,
      (quantityByItemId.get(roll.itemId) ?? 0) + roll.quantity,
    );
  }

  return Array.from(quantityByItemId.entries())
    .map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
}

function createDefeatedMonsterSource(input: {
  actorId: string;
  monsterId: MonsterId;
}): DefeatedMonsterRewardSource {
  return {
    actorId: input.actorId,
    monsterId: input.monsterId,
  };
}

export function calculateBattleReward(
  input: BattleRewardCalculationInput,
): BattleRewardSummary {
  const lootRolls: LootRollResult[] = [];

  let exp = 0;
  let moneyBronze = 0;

  for (const defeatedMonster of input.defeatedMonsters) {
    exp += toSafeNonNegativeInteger(defeatedMonster.reward.exp);
    moneyBronze += toSafeNonNegativeInteger(defeatedMonster.reward.moneyBronze);

    for (const entry of defeatedMonster.reward.lootTable) {
      lootRolls.push(
        rollLootEntry({
          battleId: input.battleId,
          seed: input.seed,
          actorId: defeatedMonster.actorId,
          monsterId: defeatedMonster.monsterId,
          entry,
        }),
      );
    }

    for (const pool of defeatedMonster.reward.randomLootPools ?? []) {
      const roll = rollRandomLootPool({
        battleId: input.battleId,
        seed: input.seed,
        actorId: defeatedMonster.actorId,
        monsterId: defeatedMonster.monsterId,
        pool,
      });

      if (roll) {
        lootRolls.push(roll);
      }
    }
  }

  return {
    exp,
    moneyBronze,

    items: aggregateItemStacks(lootRolls),

    defeatedMonsters: input.defeatedMonsters.map((monster) =>
      createDefeatedMonsterSource(monster),
    ),

    lootRolls,
  };
}
