import type {
  BaseStats,
  OriginDefinition,
  StarterKitDefinition,
  StarterKitId,
  StatKey,
  StatProgress,
} from './character.types';

export const STAT_KEYS: StatKey[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'LUK'];

export const ZERO_BASE_STATS: BaseStats = {
  STR: 0,
  DEX: 0,
  CON: 0,
  INT: 0,
  WIS: 0,
  LUK: 0,
};

export const ZERO_STAT_PROGRESS: StatProgress = {
  currentValue: 0,
  fragmentCount: 0,
  accumulatedBonus: 0,
};

export const FALNA_VISIBLE_STAT_MIN = 0;
export const FALNA_VISIBLE_STAT_MAX = 999;

export const STARTING_CHARACTER_LEVEL = 1;
export const STARTING_CHARACTER_EXP = 0;

export const STARTING_FATIGUE = 0;
export const MAX_FATIGUE = 100;

export const BRONZE_PER_SILVER = 100;
export const SILVER_PER_GOLD = 100;
export const BRONZE_PER_GOLD = BRONZE_PER_SILVER * SILVER_PER_GOLD;

export const MAX_SAFE_BRONZE_TOTAL = Number.MAX_SAFE_INTEGER;

export const MAX_SAFE_GOLD_INPUT = Math.floor(
  MAX_SAFE_BRONZE_TOTAL / BRONZE_PER_GOLD,
);

export const MAX_SAFE_SILVER_INPUT = Math.floor(
  MAX_SAFE_BRONZE_TOTAL / BRONZE_PER_SILVER,
);

export const MAX_SAFE_BRONZE_INPUT = MAX_SAFE_BRONZE_TOTAL;

export const FALNA_FRAGMENT_COUNT_MAX = 999_999;
export const FALNA_ACCUMULATED_BONUS_MAX = FALNA_VISIBLE_STAT_MAX;

export const DEFAULT_STARTER_KIT_ID: StarterKitId = 'novice_adventurer_kit';

export const STARTER_KIT_DEFINITIONS: StarterKitDefinition[] = [
  {
    id: 'novice_adventurer_kit',
    name: 'Novice Adventurer Kit',
    description:
      'A humble first-day kit for a new adventurer: one bread, one small HP potion, one small MP potion, and one safe night at a basic inn.',
    startingMoneyBronze: 10,
    startingItemIds: [
      'stamina_bread',
      'minor_hp_potion',
      'minor_mp_potion',
      'one_night_inn_voucher',
    ],
    tags: ['starter', 'survival', 'day-one-support'],
  },
];

export const ORIGIN_DEFINITIONS: OriginDefinition[] = [
  {
    id: 'scholar',
    name: 'Scholar',
    description:
      'A bookish beginner who has touched the edge of magic. Highly receptive to internal mana, but physically fragile.',
    initialStatBonus: {
      STR: 1,
      DEX: 2,
      CON: 4,
      INT: 10,
      WIS: 6,
      LUK: 1,
    },
    startingItemIds: ['old_wooden_staff'],
    startingSkillIds: ['spark'],
    startingPassiveIds: [],
    tags: ['origin', 'magic-leaning', 'intelligence'],
  },
  {
    id: 'mercenary',
    name: 'Mercenary',
    description:
      'A rough fighter who has survived by steel and grit. Built for frontline endurance, but completely blind to the mystic arts.',
    initialStatBonus: {
      STR: 10,
      DEX: 3,
      CON: 6,
      INT: 1,
      WIS: 2,
      LUK: 2,
    },
    startingItemIds: ['rusty_sword'],
    startingSkillIds: ['heavy_strike'],
    startingPassiveIds: [],
    tags: ['origin', 'physical-leaning', 'strength'],
  },
  {
    id: 'wanderer',
    name: 'Wanderer',
    description:
      'A traveler with no fixed path. Lacks any true specialization, but possesses the balanced potential to become anything.',
    initialStatBonus: {
      STR: 4,
      DEX: 4,
      CON: 4,
      INT: 4,
      WIS: 4,
      LUK: 4,
    },
    startingItemIds: ['worn_travelers_knife'],
    startingSkillIds: ['steady_strike'],
    startingPassiveIds: [],
    tags: ['origin', 'balanced', 'flexible'],
  },
  {
    id: 'street_urchin',
    name: 'Street Urchin',
    description:
      'A quick-handed survivor from the back alleys. Relies on instinct, speed, and sheer luck to dodge lethal blows.',
    initialStatBonus: {
      STR: 2,
      DEX: 10,
      CON: 4,
      INT: 1,
      WIS: 2,
      LUK: 5,
    },
    startingItemIds: ['small_dagger'],
    startingSkillIds: ['quick_stab'],
    startingPassiveIds: [],
    tags: ['origin', 'speed-leaning', 'dexterity'],
  },
  {
    id: 'acolyte',
    name: 'Acolyte',
    description:
      'A novice trained in spiritual restraint and care. Their strength is not in the blade, but in keeping the soul intact.',
    initialStatBonus: {
      STR: 2,
      DEX: 2,
      CON: 5,
      INT: 4,
      WIS: 10,
      LUK: 1,
    },
    startingItemIds: ['simple_wooden_charm'],
    startingSkillIds: ['minor_heal'],
    startingPassiveIds: [],
    tags: ['origin', 'support-leaning', 'wisdom'],
  },
];
