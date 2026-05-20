import type {
  MonsterDefinition,
  MonsterId,
  MonsterLootEntry,
} from './monster.types';

export const MONSTER_IDS = [
  'slime',
  'goblin',
] as const satisfies readonly MonsterId[];

function freezeLootEntry(entry: MonsterLootEntry): Readonly<MonsterLootEntry> {
  return Object.freeze({
    ...entry,
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
    }),
    tags: Object.freeze([...monster.tags]),
  });
}

const RAW_MONSTER_DEFINITIONS: readonly MonsterDefinition[] = [
  {
    id: 'slime',
    name: 'Slime',
    description:
      'A weak gelatinous monster. Slow, fragile, and commonly used by new adventurers to learn basic combat.',

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
          chancePercent: 35,
          minQuantity: 1,
          maxQuantity: 2,
        },
      ],
    },

    tags: ['monster', 'starter', 'beast', 'gelatinous'],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    description:
      'A small but aggressive humanoid monster. Faster and more dangerous than a slime, but still suitable for early combat testing.',

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
    },

    tags: ['monster', 'starter', 'humanoid', 'goblin'],
  },
];

export const MONSTER_DEFINITIONS = Object.freeze(
  RAW_MONSTER_DEFINITIONS.map((monster) => freezeMonsterDefinition(monster)),
) satisfies readonly Readonly<MonsterDefinition>[];
