import type {
  MonsterDefinition,
  MonsterId,
  MonsterLootEntry,
  MonsterRandomLootPool,
  MonsterRandomLootPoolEntry,
} from './monster.types';

export const MONSTER_IDS = [
  'slime',
  'wild_boar',
  'wild_wolf',
  'goblin',
] as const satisfies readonly MonsterId[];

function freezeLootEntry(entry: MonsterLootEntry): Readonly<MonsterLootEntry> {
  return Object.freeze({
    ...entry,
  });
}

function freezeRandomLootPoolEntry(
  entry: MonsterRandomLootPoolEntry,
): Readonly<MonsterRandomLootPoolEntry> {
  return Object.freeze({
    ...entry,
  });
}

function freezeRandomLootPool(
  pool: MonsterRandomLootPool,
): Readonly<MonsterRandomLootPool> {
  return Object.freeze({
    ...pool,
    entries: Object.freeze(
      pool.entries.map((entry) => freezeRandomLootPoolEntry(entry)),
    ),
  });
}

function freezeMonsterDefinition(
  monster: MonsterDefinition,
): Readonly<MonsterDefinition> {
  return Object.freeze({
    ...monster,
    baseStats: Object.freeze({
      ...monster.baseStats,
    }),
    derivedStatOverrides: Object.freeze({
      ...monster.derivedStatOverrides,
    }),
    resistances: Object.freeze({
      ...monster.resistances,
    }),
    currentState: Object.freeze({
      ...monster.currentState,
    }),
    reward: Object.freeze({
      ...monster.reward,
      lootTable: Object.freeze(
        monster.reward.lootTable.map((entry) => freezeLootEntry(entry)),
      ),
      randomLootPools: Object.freeze(
        (monster.reward.randomLootPools ?? []).map((pool) =>
          freezeRandomLootPool(pool),
        ),
      ),
    }),
    tags: Object.freeze([...monster.tags]),
  });
}

const STAT_FRAGMENT_RANDOM_LOOT_POOL_ENTRIES = Object.freeze([
  Object.freeze({
    itemId: 'str_fragment',
    weight: 1,
    minQuantity: 1,
    maxQuantity: 1,
  }),
  Object.freeze({
    itemId: 'dex_fragment',
    weight: 1,
    minQuantity: 1,
    maxQuantity: 1,
  }),
  Object.freeze({
    itemId: 'con_fragment',
    weight: 1,
    minQuantity: 1,
    maxQuantity: 1,
  }),
  Object.freeze({
    itemId: 'int_fragment',
    weight: 1,
    minQuantity: 1,
    maxQuantity: 1,
  }),
  Object.freeze({
    itemId: 'wis_fragment',
    weight: 1,
    minQuantity: 1,
    maxQuantity: 1,
  }),
  Object.freeze({
    itemId: 'luk_fragment',
    weight: 1,
    minQuantity: 1,
    maxQuantity: 1,
  }),
]) satisfies readonly MonsterRandomLootPoolEntry[];

const STAT_FRAGMENT_RANDOM_LOOT_POOL = Object.freeze({
  id: 'stat_fragment',
  chancePercent: 30,
  entries: STAT_FRAGMENT_RANDOM_LOOT_POOL_ENTRIES,
}) satisfies MonsterRandomLootPool;

const STAT_FRAGMENT_BONUS_PAIR_RANDOM_LOOT_POOL = Object.freeze({
  id: 'stat_fragment_bonus_pair',
  chancePercent: 1,
  rollCount: 2,
  entries: STAT_FRAGMENT_RANDOM_LOOT_POOL_ENTRIES,
}) satisfies MonsterRandomLootPool;

const STAT_FRAGMENT_RANDOM_LOOT_POOLS = Object.freeze([
  STAT_FRAGMENT_RANDOM_LOOT_POOL,
  STAT_FRAGMENT_BONUS_PAIR_RANDOM_LOOT_POOL,
]) satisfies readonly MonsterRandomLootPool[];

const RAW_MONSTER_DEFINITIONS: readonly MonsterDefinition[] = [
  {
    id: 'slime',
    name: 'Slime',
    description:
      'A weak gelatinous monster commonly found near damp paths outside town. Slow and fragile, but still a real monster with real loot.',

    rank: 'normal',
    level: 1,

    aiTargetingMode: 'random',

    baseStats: {
      STR: 2,
      DEX: 3,
      CON: 4,
      INT: 1,
      WIS: 1,
      LUK: 1,
    },

    derivedStatOverrides: {
      maxHp: 28,
      maxMp: 0,
      maxStamina: 40,

      pAtk: 6,
      mAtk: 0,
      healingPotency: 0,

      pDef: 1,
      mDef: 0,

      actionSpeed: 8,
      accuracy: 75,
      evasionRate: 2,

      critRate: 1,
      critDamageBonus: 25,

      fleeRate: 0,

      statusResist: 0,
      spiritualPotency: 0,

      mpRegen: 0,
      staminaRegen: 3,

      secondChanceRate: 0,
      procRate: 0,
    },

    resistances: {
      physical: 0,
      magical: 0,
      fire: -0.25,
      water: 0.2,
    },

    currentState: {
      hp: 28,
      mp: 0,
      stamina: 40,
    },

    shield: 0,

    reward: {
      exp: 5,
      moneyBronze: 2,
      lootTable: [
        {
          itemId: 'slime_gel',
          chancePercent: 65,
          minQuantity: 1,
          maxQuantity: 2,
        },
      ],
      randomLootPools: STAT_FRAGMENT_RANDOM_LOOT_POOLS,
    },

    tags: ['monster', 'starter', 'beast', 'gelatinous', 'town-outskirts'],
  },
  {
    id: 'wild_boar',
    name: 'Wild Boar',
    description:
      'A territorial boar roaming the grasslands outside town. Tougher than a slime and dangerous when it charges.',

    rank: 'normal',
    level: 1,

    aiTargetingMode: 'random',

    baseStats: {
      STR: 6,
      DEX: 4,
      CON: 7,
      INT: 1,
      WIS: 2,
      LUK: 2,
    },

    derivedStatOverrides: {
      maxHp: 38,
      maxMp: 0,
      maxStamina: 48,

      pAtk: 10,
      mAtk: 0,
      healingPotency: 0,

      pDef: 3,
      mDef: 0,

      actionSpeed: 10,
      accuracy: 78,
      evasionRate: 3,

      critRate: 2,
      critDamageBonus: 25,

      fleeRate: 0,

      statusResist: 1,
      spiritualPotency: 0,

      mpRegen: 0,
      staminaRegen: 4,

      secondChanceRate: 0,
      procRate: 0,
    },

    resistances: {
      physical: 0.05,
      magical: 0,
      fire: 0,
      water: 0,
    },

    currentState: {
      hp: 38,
      mp: 0,
      stamina: 48,
    },

    shield: 0,

    reward: {
      exp: 8,
      moneyBronze: 3,
      lootTable: [
        {
          itemId: 'boar_meat',
          chancePercent: 70,
          minQuantity: 1,
          maxQuantity: 2,
        },
      ],
      randomLootPools: STAT_FRAGMENT_RANDOM_LOOT_POOLS,
    },

    tags: ['monster', 'starter', 'beast', 'boar', 'town-outskirts'],
  },
  {
    id: 'wild_wolf',
    name: 'Wild Wolf',
    description:
      'A lean predator stalking the outer roads. Faster and more accurate than most beginner monsters.',

    rank: 'normal',
    level: 2,

    aiTargetingMode: 'lowest_hp',

    baseStats: {
      STR: 7,
      DEX: 8,
      CON: 5,
      INT: 1,
      WIS: 3,
      LUK: 3,
    },

    derivedStatOverrides: {
      maxHp: 42,
      maxMp: 0,
      maxStamina: 58,

      pAtk: 13,
      mAtk: 0,
      healingPotency: 0,

      pDef: 2,
      mDef: 1,

      actionSpeed: 17,
      accuracy: 84,
      evasionRate: 7,

      critRate: 5,
      critDamageBonus: 35,

      fleeRate: 5,

      statusResist: 1,
      spiritualPotency: 0,

      mpRegen: 0,
      staminaRegen: 5,

      secondChanceRate: 0,
      procRate: 1,
    },

    resistances: {
      physical: 0,
      magical: 0,
      fire: 0,
      water: 0,
    },

    currentState: {
      hp: 42,
      mp: 0,
      stamina: 58,
    },

    shield: 0,

    reward: {
      exp: 11,
      moneyBronze: 4,
      lootTable: [
        {
          itemId: 'wolf_skin',
          chancePercent: 55,
          minQuantity: 1,
          maxQuantity: 1,
        },
      ],
      randomLootPools: STAT_FRAGMENT_RANDOM_LOOT_POOLS,
    },

    tags: ['monster', 'starter', 'beast', 'wolf', 'town-outskirts'],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    description:
      'A small but aggressive humanoid monster. Faster and more dangerous than a slime, suitable for forest-edge encounters.',

    rank: 'normal',
    level: 2,

    aiTargetingMode: 'highest_threat',

    baseStats: {
      STR: 6,
      DEX: 7,
      CON: 5,
      INT: 2,
      WIS: 2,
      LUK: 3,
    },

    derivedStatOverrides: {
      maxHp: 45,
      maxMp: 0,
      maxStamina: 55,

      pAtk: 13,
      mAtk: 0,
      healingPotency: 0,

      pDef: 3,
      mDef: 1,

      actionSpeed: 14,
      accuracy: 82,
      evasionRate: 6,

      critRate: 4,
      critDamageBonus: 35,

      fleeRate: 8,

      statusResist: 1,
      spiritualPotency: 0,

      mpRegen: 0,
      staminaRegen: 5,

      secondChanceRate: 0,
      procRate: 1,
    },

    resistances: {
      physical: 0,
      magical: 0,
      fire: 0,
      water: 0,
    },

    currentState: {
      hp: 45,
      mp: 0,
      stamina: 55,
    },

    shield: 0,

    reward: {
      exp: 12,
      moneyBronze: 5,
      lootTable: [
        {
          itemId: 'goblin_ear',
          chancePercent: 30,
          minQuantity: 1,
          maxQuantity: 1,
        },
        {
          itemId: 'cracked_dagger',
          chancePercent: 8,
          minQuantity: 1,
          maxQuantity: 1,
        },
      ],
      randomLootPools: STAT_FRAGMENT_RANDOM_LOOT_POOLS,
    },

    tags: ['monster', 'starter', 'humanoid', 'goblin', 'forest-edge'],
  },
];

export const MONSTER_DEFINITIONS = Object.freeze(
  RAW_MONSTER_DEFINITIONS.map((monster) => freezeMonsterDefinition(monster)),
) satisfies readonly Readonly<MonsterDefinition>[];
