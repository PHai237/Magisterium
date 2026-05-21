import {
  advanceBattleToNextActor,
  advanceRoundIfNeeded,
  consumeActorTurnGauge,
  filterTurnOrderToLivingActors,
  findNextReadyLivingEntry,
  resetRoundActedFlags,
  shouldAdvanceRound,
  sortReadyEntries,
  startBattle,
} from './battle-turn.engine';

import {
  createBattleActorState,
  createBattleState,
} from '../factory/battle.factory';

import { TURN_GAUGE_READY_VALUE } from '../battle.constants';

import type {
  BattleActorState,
  BattleActorType,
  BattleState,
  BattleTurnOrderEntry,
} from '../battle.types';

import type { BaseStats, DerivedStats } from '../../character/character.types';

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

interface CreateActorInput {
  actorId: string;
  actorType?: BattleActorType;
  hp?: number;
  mp?: number;
  stamina?: number;
  derivedStats?: Partial<DerivedStats>;
}

function createActor(input: CreateActorInput): BattleActorState {
  const derivedStats: DerivedStats = {
    ...DEFAULT_DERIVED_STATS,
    ...input.derivedStats,
  };

  return createBattleActorState({
    actorId: input.actorId,
    actorType: input.actorType ?? 'character',

    baseStats: DEFAULT_BASE_STATS,
    derivedStats,

    currentState: {
      hp: input.hp ?? derivedStats.maxHp,
      mp: input.mp ?? derivedStats.maxMp,
      stamina: input.stamina ?? derivedStats.maxStamina,
    },
  });
}

function createTestBattle(
  actors: BattleActorState[],
  overrides: Partial<BattleState> = {},
): BattleState {
  return {
    ...createBattleState({
      battleId: 'turn_test_battle',
      seed: 'turn_test_seed',
      actors,
    }),
    ...overrides,
  };
}

function createTurnEntry(
  overrides: Partial<BattleTurnOrderEntry> = {},
): BattleTurnOrderEntry {
  return {
    actorId: 'actor_1',
    actionSpeed: 10,
    initiative: 0,
    turnGauge: 0,
    hasActedThisRound: false,

    ...overrides,
  };
}

describe('battle turn engine', () => {
  describe('sortReadyEntries', () => {
    it('should sort ready entries by gauge, speed, then initiative', () => {
      const slowHighGauge = createTurnEntry({
        actorId: 'slow_high_gauge',
        actionSpeed: 10,
        initiative: 2,
        turnGauge: 130,
      });

      const fastSameGauge = createTurnEntry({
        actorId: 'fast_same_gauge',
        actionSpeed: 30,
        initiative: 3,
        turnGauge: 120,
      });

      const earlySameGauge = createTurnEntry({
        actorId: 'early_same_gauge',
        actionSpeed: 20,
        initiative: 0,
        turnGauge: 120,
      });

      const lateSameGauge = createTurnEntry({
        actorId: 'late_same_gauge',
        actionSpeed: 20,
        initiative: 1,
        turnGauge: 120,
      });

      expect(
        sortReadyEntries([
          lateSameGauge,
          earlySameGauge,
          fastSameGauge,
          slowHighGauge,
        ]).map((entry) => entry.actorId),
      ).toEqual([
        'slow_high_gauge',
        'fast_same_gauge',
        'early_same_gauge',
        'late_same_gauge',
      ]);
    });
  });

  describe('filterTurnOrderToLivingActors', () => {
    it('should remove dead or missing actors from turn order', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const deadSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const turnOrder = [
        createTurnEntry({
          actorId: 'hero',
        }),
        createTurnEntry({
          actorId: 'slime',
        }),
        createTurnEntry({
          actorId: 'missing_actor',
        }),
      ];

      expect(
        filterTurnOrderToLivingActors(turnOrder, {
          hero,
          slime: deadSlime,
        }).map((entry) => entry.actorId),
      ).toEqual(['hero']);
    });
  });

  describe('findNextReadyLivingEntry', () => {
    it('should return the highest-priority ready living actor', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const deadGoblin = createActor({
        actorId: 'dead_goblin',
        actorType: 'monster',
        hp: 0,
      });

      const turnOrder = [
        createTurnEntry({
          actorId: 'dead_goblin',
          actionSpeed: 999,
          turnGauge: 999,
        }),
        createTurnEntry({
          actorId: 'slime',
          actionSpeed: 50,
          turnGauge: TURN_GAUGE_READY_VALUE,
        }),
        createTurnEntry({
          actorId: 'hero',
          actionSpeed: 100,
          turnGauge: TURN_GAUGE_READY_VALUE,
        }),
      ];

      const readyEntry = findNextReadyLivingEntry(turnOrder, {
        hero,
        slime,
        dead_goblin: deadGoblin,
      });

      expect(readyEntry?.actorId).toBe('hero');
    });

    it('should return undefined when no living actor is ready', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const turnOrder = [
        createTurnEntry({
          actorId: 'hero',
          turnGauge: TURN_GAUGE_READY_VALUE - 1,
        }),
      ];

      expect(
        findNextReadyLivingEntry(turnOrder, {
          hero,
        }),
      ).toBeUndefined();
    });
  });

  describe('consumeActorTurnGauge', () => {
    it('should consume only the selected actor gauge and mark it as acted', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createTestBattle([hero, slime], {
        turnOrder: [
          createTurnEntry({
            actorId: 'hero',
            turnGauge: 150,
            hasActedThisRound: false,
          }),
          createTurnEntry({
            actorId: 'slime',
            turnGauge: 80,
            hasActedThisRound: false,
          }),
        ],
      });

      const nextTurnOrder = consumeActorTurnGauge(battle, 'hero');

      expect(nextTurnOrder).toEqual([
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 50,
          hasActedThisRound: true,
        },
        {
          actorId: 'slime',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 80,
          hasActedThisRound: false,
        },
      ]);
    });
  });

  describe('shouldAdvanceRound', () => {
    it('should return true when every living actor has acted', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createTestBattle([hero, slime], {
        status: 'in_progress',
        turnOrder: [
          createTurnEntry({
            actorId: 'hero',
            hasActedThisRound: true,
          }),
          createTurnEntry({
            actorId: 'slime',
            hasActedThisRound: true,
          }),
        ],
      });

      expect(shouldAdvanceRound(battle)).toBe(true);
    });

    it('should return false when any living actor has not acted', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createTestBattle([hero, slime], {
        status: 'in_progress',
        turnOrder: [
          createTurnEntry({
            actorId: 'hero',
            hasActedThisRound: true,
          }),
          createTurnEntry({
            actorId: 'slime',
            hasActedThisRound: false,
          }),
        ],
      });

      expect(shouldAdvanceRound(battle)).toBe(false);
    });

    it('should return false when battle is already resolved', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battle = createTestBattle([hero, defeatedSlime], {
        status: 'in_progress',
      });

      expect(shouldAdvanceRound(battle)).toBe(false);
    });
  });

  describe('resetRoundActedFlags', () => {
    it('should reset hasActedThisRound only for living actors', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const deadSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const turnOrder = [
        createTurnEntry({
          actorId: 'hero',
          hasActedThisRound: true,
        }),
        createTurnEntry({
          actorId: 'slime',
          hasActedThisRound: true,
        }),
      ];

      expect(
        resetRoundActedFlags(turnOrder, {
          hero,
          slime: deadSlime,
        }),
      ).toEqual([
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 0,
          hasActedThisRound: false,
        },
        {
          actorId: 'slime',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 0,
          hasActedThisRound: true,
        },
      ]);
    });
  });

  describe('advanceRoundIfNeeded', () => {
    it('should advance round and append round events when all living actors acted', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createTestBattle([hero, slime], {
        status: 'in_progress',
        roundNumber: 1,
        turnOrder: [
          createTurnEntry({
            actorId: 'hero',
            hasActedThisRound: true,
          }),
          createTurnEntry({
            actorId: 'slime',
            hasActedThisRound: true,
          }),
        ],
      });

      const nextBattle = advanceRoundIfNeeded(battle);

      expect(nextBattle.roundNumber).toBe(2);
      expect(
        nextBattle.turnOrder.every((entry) => !entry.hasActedThisRound),
      ).toBe(true);

      expect(nextBattle.events.map((event) => event.type)).toEqual([
        'ROUND_ENDED',
        'ROUND_STARTED',
      ]);
    });

    it('should return the same battle when round should not advance', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createTestBattle([hero, slime], {
        status: 'in_progress',
        turnOrder: [
          createTurnEntry({
            actorId: 'hero',
            hasActedThisRound: true,
          }),
          createTurnEntry({
            actorId: 'slime',
            hasActedThisRound: false,
          }),
        ],
      });

      expect(advanceRoundIfNeeded(battle)).toBe(battle);
    });
  });

  describe('startBattle', () => {
    it('should start a created battle and select the first active actor', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
        derivedStats: {
          actionSpeed: 100,
        },
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        derivedStats: {
          actionSpeed: 50,
        },
      });

      const battle = createTestBattle([hero, slime]);
      const startedBattle = startBattle(battle);

      expect(startedBattle.status).toBe('in_progress');
      expect(startedBattle.activeActorId).toBe('hero');
      expect(startedBattle.turnNumber).toBe(1);

      expect(startedBattle.events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          'BATTLE_STARTED',
          'ROUND_STARTED',
          'TURN_STARTED',
        ]),
      );
    });

    it('should return the same battle when battle is not in created status', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const battle = createTestBattle([hero], {
        status: 'in_progress',
      });

      expect(startBattle(battle)).toBe(battle);
    });
  });

  describe('advanceBattleToNextActor', () => {
    it('should select a ready living actor and restore turn-start resources', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
        mp: 10,
        stamina: 20,
        derivedStats: {
          actionSpeed: 100,
          maxMp: 50,
          maxStamina: 100,
          mpRegen: 3,
          staminaRegen: 7,
        },
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        derivedStats: {
          actionSpeed: 50,
        },
      });

      const battle = createTestBattle([hero, slime], {
        status: 'in_progress',
        turnNumber: 0,
        turnOrder: [
          createTurnEntry({
            actorId: 'hero',
            actionSpeed: 100,
            turnGauge: TURN_GAUGE_READY_VALUE,
          }),
          createTurnEntry({
            actorId: 'slime',
            actionSpeed: 50,
            turnGauge: 0,
          }),
        ],
      });

      const nextBattle = advanceBattleToNextActor(battle);

      expect(nextBattle.activeActorId).toBe('hero');
      expect(nextBattle.turnNumber).toBe(1);
      expect(nextBattle.actors.hero.mp).toBe(13);
      expect(nextBattle.actors.hero.stamina).toBe(27);

      expect(nextBattle.events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          'RESOURCE_RESTORED',
          'RESOURCE_RESTORED',
          'TURN_STARTED',
        ]),
      );
    });

    it('should end with victory when no living monsters remain', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battle = createTestBattle([hero, defeatedSlime], {
        status: 'in_progress',
      });

      const nextBattle = advanceBattleToNextActor(battle);

      expect(nextBattle.status).toBe('victory');
      expect(nextBattle.activeActorId).toBeUndefined();
      expect(nextBattle.turnOrder.map((entry) => entry.actorId)).toEqual([
        'hero',
      ]);

      expect(nextBattle.events.map((event) => event.type)).toContain(
        'BATTLE_ENDED',
      );
    });

    it('should end with defeat when no living characters remain', () => {
      const defeatedHero = createActor({
        actorId: 'hero',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createTestBattle([defeatedHero, slime], {
        status: 'in_progress',
      });

      const nextBattle = advanceBattleToNextActor(battle);

      expect(nextBattle.status).toBe('defeat');
      expect(nextBattle.activeActorId).toBeUndefined();
      expect(nextBattle.turnOrder.map((entry) => entry.actorId)).toEqual([
        'slime',
      ]);

      expect(nextBattle.events.map((event) => event.type)).toContain(
        'BATTLE_ENDED',
      );
    });
  });
});
