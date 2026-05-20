import {
  createBattleActorFromCharacterSnapshot,
  createBattleActorFromMonsterInput,
  createBattleActorState,
  createBattleState,
  type CharacterBattleSnapshot,
} from './battle.factory';

import type { BattleActorState } from './battle.types';

import type {
  BaseStats,
  CharacterSnapshot,
  CurrentState,
  DerivedStats,
  ResistanceProfile,
  StatKey,
  StatProgress,
} from '../character/character.types';

const DEFAULT_BASE_STATS: BaseStats = {
  STR: 10,
  DEX: 10,
  CON: 10,
  INT: 10,
  WIS: 10,
  LUK: 10,
};

const DEFAULT_DERIVED_STATS: DerivedStats = {
  maxHp: 100,
  maxMp: 50,
  maxStamina: 100,

  pAtk: 20,
  mAtk: 15,
  healingPotency: 10,

  pDef: 5,
  mDef: 4,

  actionSpeed: 10,
  accuracy: 90,
  evasionRate: 5,

  critRate: 10,
  critDamageBonus: 50,

  fleeRate: 10,

  statusResist: 5,
  spiritualPotency: 10,

  mpRegen: 2,
  staminaRegen: 5,

  secondChanceRate: 2,
  procRate: 5,
};

function createStatProgress(currentValue: number): StatProgress {
  return {
    currentValue,
    fragmentCount: 0,
    accumulatedBonus: 0,
  };
}

function createStatsRecord(): Record<StatKey, StatProgress> {
  return {
    STR: createStatProgress(DEFAULT_BASE_STATS.STR),
    DEX: createStatProgress(DEFAULT_BASE_STATS.DEX),
    CON: createStatProgress(DEFAULT_BASE_STATS.CON),
    INT: createStatProgress(DEFAULT_BASE_STATS.INT),
    WIS: createStatProgress(DEFAULT_BASE_STATS.WIS),
    LUK: createStatProgress(DEFAULT_BASE_STATS.LUK),
  };
}

function createCharacterSnapshot(
  overrides: Partial<CharacterBattleSnapshot> = {},
): CharacterBattleSnapshot {
  const now = new Date().toISOString();

  const currentState: CurrentState = {
    hp: DEFAULT_DERIVED_STATS.maxHp,
    mp: DEFAULT_DERIVED_STATS.maxMp,
    stamina: DEFAULT_DERIVED_STATS.maxStamina,
  };

  const snapshot: CharacterSnapshot = {
    id: 'character_1',
    version: 1,

    name: 'Magica',
    originId: 'scholar',

    progression: {
      level: 1,
      exp: 0,
      milestoneIds: [],
    },

    moneyBronze: 10,

    stats: createStatsRecord(),
    currentState,

    passiveIds: [],

    learnedSkillIds: ['spark'],
    equippedSkillIds: ['spark'],

    starterKitId: 'novice_adventurer_kit',

    inventoryItemIds: ['old_wooden_staff'],
    equippedItemIds: ['old_wooden_staff'],

    fatigue: 0,
    lastRestAt: now,

    createdAt: now,
    updatedAt: now,

    baseStats: DEFAULT_BASE_STATS,
    derivedStats: DEFAULT_DERIVED_STATS,
    userId: '',
  };

  return {
    ...snapshot,
    ...overrides,
  };
}

function createBattleActor(
  overrides: Partial<BattleActorState> = {},
): BattleActorState {
  return {
    actorId: 'actor_1',
    actorType: 'character',

    baseStats: DEFAULT_BASE_STATS,
    derivedStats: DEFAULT_DERIVED_STATS,
    resistances: {},

    hp: DEFAULT_DERIVED_STATS.maxHp,
    mp: DEFAULT_DERIVED_STATS.maxMp,
    stamina: DEFAULT_DERIVED_STATS.maxStamina,

    shield: 0,
    isExhausted: false,

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,

    ...overrides,
  };
}

describe('battle factory', () => {
  describe('createBattleActorState', () => {
    it('should create a battle actor with clamped resources', () => {
      const actor = createBattleActorState({
        actorId: 'actor_1',
        actorType: 'character',

        baseStats: DEFAULT_BASE_STATS,
        derivedStats: DEFAULT_DERIVED_STATS,

        currentState: {
          hp: 999,
          mp: -10,
          stamina: 42.9,
        },

        shield: -5,
        procCountThisTurn: -3,
      });

      expect(actor.hp).toBe(DEFAULT_DERIVED_STATS.maxHp);
      expect(actor.mp).toBe(0);
      expect(actor.stamina).toBe(42);

      expect(actor.shield).toBe(0);
      expect(actor.procCountThisTurn).toBe(0);
    });

    it('should default resources to max values when currentState is missing', () => {
      const actor = createBattleActorState({
        actorId: 'actor_1',
        actorType: 'character',

        baseStats: DEFAULT_BASE_STATS,
        derivedStats: DEFAULT_DERIVED_STATS,
      });

      expect(actor.hp).toBe(DEFAULT_DERIVED_STATS.maxHp);
      expect(actor.mp).toBe(DEFAULT_DERIVED_STATS.maxMp);
      expect(actor.stamina).toBe(DEFAULT_DERIVED_STATS.maxStamina);
    });

    it('should mark actor as exhausted when stamina starts at zero', () => {
      const actor = createBattleActorState({
        actorId: 'actor_1',
        actorType: 'character',

        baseStats: DEFAULT_BASE_STATS,
        derivedStats: DEFAULT_DERIVED_STATS,

        currentState: {
          stamina: 0,
        },
      });

      expect(actor.stamina).toBe(0);
      expect(actor.isExhausted).toBe(true);
    });
  });

  describe('createBattleActorFromCharacterSnapshot', () => {
    it('should create a battle actor from a character snapshot', () => {
      const snapshot = createCharacterSnapshot();

      const actor = createBattleActorFromCharacterSnapshot(snapshot);

      expect(actor.actorId).toBe(snapshot.id);
      expect(actor.actorType).toBe('character');

      expect(actor.baseStats).toBe(snapshot.baseStats);
      expect(actor.derivedStats).toBe(snapshot.derivedStats);

      expect(actor.hp).toBe(snapshot.currentState.hp);
      expect(actor.mp).toBe(snapshot.currentState.mp);
      expect(actor.stamina).toBe(snapshot.currentState.stamina);

      expect(actor.shield).toBe(0);
      expect(actor.activeStatusEffects).toEqual([]);
      expect(actor.activeModifiers).toEqual([]);
      expect(actor.procCountThisTurn).toBe(0);
    });

    it('should preserve optional resistances from a character battle snapshot', () => {
      const resistances: ResistanceProfile = {
        fire: 0.25,
        magical: 0.1,
      };

      const snapshot = createCharacterSnapshot({
        resistances,
      });

      const actor = createBattleActorFromCharacterSnapshot(snapshot);

      expect(actor.resistances).toEqual(resistances);
    });

    it('should default character resistances to an empty object', () => {
      const snapshot = createCharacterSnapshot();

      const actor = createBattleActorFromCharacterSnapshot(snapshot);

      expect(actor.resistances).toEqual({});
    });
  });

  describe('createBattleActorFromMonsterInput', () => {
    it('should create a monster battle actor', () => {
      const resistances: ResistanceProfile = {
        physical: 0.2,
        fire: -0.5,
      };

      const actor = createBattleActorFromMonsterInput({
        actorId: 'slime_1',
        monsterId: 'slime',

        baseStats: DEFAULT_BASE_STATS,
        derivedStats: DEFAULT_DERIVED_STATS,

        resistances,

        currentState: {
          hp: 40,
          mp: 0,
          stamina: 30,
        },

        shield: 3,
      });

      expect(actor.actorId).toBe('slime_1');
      expect(actor.actorType).toBe('monster');
      expect(actor.monsterId).toBe('slime');

      expect(actor.resistances).toEqual(resistances);

      expect(actor.hp).toBe(40);
      expect(actor.mp).toBe(0);
      expect(actor.stamina).toBe(30);
      expect(actor.shield).toBe(3);
    });
  });

  describe('createBattleState', () => {
    it('should create a battle state with actors, turn order, and deterministic random context', () => {
      const fastActor = createBattleActor({
        actorId: 'fast_actor',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          actionSpeed: 20,
        },
      });

      const slowActor = createBattleActor({
        actorId: 'slow_actor',
        actorType: 'monster',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          actionSpeed: 5,
        },
      });

      const battle = createBattleState({
        battleId: 'battle_test_1',
        seed: 'test_seed',
        actors: [slowActor, fastActor],
      });

      expect(battle.battleId).toBe('battle_test_1');
      expect(battle.status).toBe('created');

      expect(battle.roundNumber).toBe(1);
      expect(battle.turnNumber).toBe(0);
      expect(battle.activeActorId).toBeUndefined();

      expect(battle.actors.slow_actor).toBe(slowActor);
      expect(battle.actors.fast_actor).toBe(fastActor);

      expect(battle.turnOrder.map((entry) => entry.actorId)).toEqual([
        'fast_actor',
        'slow_actor',
      ]);

      expect(battle.randomContext).toEqual({
        battleId: 'battle_test_1',
        seed: 'test_seed',
        rollIndex: 0,
      });

      expect(battle.events).toEqual([]);
      expect(battle.createdAt).toBeDefined();
      expect(battle.updatedAt).toBeDefined();
    });

    it('should reject battle creation without actors', () => {
      expect(() =>
        createBattleState({
          actors: [],
        }),
      ).toThrow('Cannot create a battle without actors.');
    });

    it('should reject duplicate actor ids', () => {
      const firstActor = createBattleActor({
        actorId: 'duplicate_actor',
      });

      const secondActor = createBattleActor({
        actorId: 'duplicate_actor',
        actorType: 'monster',
      });

      expect(() =>
        createBattleState({
          actors: [firstActor, secondActor],
        }),
      ).toThrow('Duplicate battle actor id: duplicate_actor');
    });

    it('should use generated battle id and seed when not provided', () => {
      const actor = createBattleActor({
        actorId: 'actor_1',
      });

      const battle = createBattleState({
        actors: [actor],
      });

      expect(battle.battleId).toBeDefined();
      expect(battle.randomContext.battleId).toBe(battle.battleId);
      expect(battle.randomContext.seed).toBeDefined();
      expect(battle.randomContext.rollIndex).toBe(0);
    });
  });
});
