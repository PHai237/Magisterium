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

  actionSpeed: 100,
  accuracy: 95,
  evasionRate: 5,

  critRate: 5,
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
  isExhausted?: boolean;
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

    skillIds: [],
    inventoryItemIds: [],

    baseStats: DEFAULT_BASE_STATS,
    derivedStats,
    resistances: {},

    currentState: {
      hp: input.hp ?? derivedStats.maxHp,
      mp: input.mp ?? derivedStats.maxMp,
      stamina: input.stamina ?? derivedStats.maxStamina,
    },

    isExhausted: input.isExhausted,
    shield: 0,
  });
}

function createStartedBattleState(input?: {
  hero?: BattleActorState;
  slime?: BattleActorState;
  turnOrder?: BattleTurnOrderEntry[];
  overrides?: Partial<BattleState>;
}): BattleState {
  const hero =
    input?.hero ??
    createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
      },
    });

  const slime =
    input?.slime ??
    createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 50,
      },
    });

  const battleState = createBattleState({
    battleId: 'battle_1',
    seed: 'seed_1',
    actors: [hero, slime],
  });

  return {
    ...battleState,
    status: 'in_progress',
    activeActorId: undefined,
    turnOrder: input?.turnOrder ?? battleState.turnOrder,
    ...input?.overrides,
  };
}

describe('battle turn engine', () => {
  describe('sortReadyEntries', () => {
    it('should sort ready entries by gauge, speed, then initiative', () => {
      const entries: BattleTurnOrderEntry[] = [
        {
          actorId: 'slow',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 100,
          hasActedThisRound: false,
        },
        {
          actorId: 'fast',
          actionSpeed: 20,
          initiative: 1,
          turnGauge: 100,
          hasActedThisRound: false,
        },
        {
          actorId: 'over_ready',
          actionSpeed: 5,
          initiative: 2,
          turnGauge: 120,
          hasActedThisRound: false,
        },
      ];

      expect(sortReadyEntries(entries).map((entry) => entry.actorId)).toEqual([
        'over_ready',
        'fast',
        'slow',
      ]);
    });
  });

  describe('filterTurnOrderToLivingActors', () => {
    it('should keep only entries for living actors', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const deadSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const turnOrder: BattleTurnOrderEntry[] = [
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
          initiative: 1,
          turnGauge: 0,
          hasActedThisRound: false,
        },
        {
          actorId: 'missing',
          actionSpeed: 10,
          initiative: 2,
          turnGauge: 0,
          hasActedThisRound: false,
        },
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
    it('should find the highest-priority ready living entry', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 100,
          hasActedThisRound: false,
        },
        {
          actorId: 'slime',
          actionSpeed: 20,
          initiative: 1,
          turnGauge: 100,
          hasActedThisRound: false,
        },
      ];

      expect(
        findNextReadyLivingEntry(turnOrder, {
          hero,
          slime,
        })?.actorId,
      ).toBe('slime');
    });

    it('should ignore ready defeated actors', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const goblin = createActor({
        actorId: 'goblin',
        actorType: 'monster',
      });

      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'slime',
          actionSpeed: 50,
          initiative: 0,
          turnGauge: 200,
          hasActedThisRound: false,
        },
        {
          actorId: 'goblin',
          actionSpeed: 10,
          initiative: 1,
          turnGauge: 100,
          hasActedThisRound: false,
        },
        {
          actorId: 'hero',
          actionSpeed: 20,
          initiative: 2,
          turnGauge: 90,
          hasActedThisRound: false,
        },
      ];

      expect(
        findNextReadyLivingEntry(turnOrder, {
          hero,
          slime: defeatedSlime,
          goblin,
        })?.actorId,
      ).toBe('goblin');
    });
  });

  describe('consumeActorTurnGauge', () => {
    it('should consume the selected actor turn gauge and mark acted', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [
          {
            actorId: 'hero',
            actionSpeed: 100,
            initiative: 0,
            turnGauge: 120,
            hasActedThisRound: false,
          },
          {
            actorId: 'slime',
            actionSpeed: 50,
            initiative: 1,
            turnGauge: 70,
            hasActedThisRound: false,
          },
        ],
      });

      expect(consumeActorTurnGauge(battleState, 'hero')).toEqual([
        {
          actorId: 'hero',
          actionSpeed: 100,
          initiative: 0,
          turnGauge: 20,
          hasActedThisRound: true,
        },
        {
          actorId: 'slime',
          actionSpeed: 50,
          initiative: 1,
          turnGauge: 70,
          hasActedThisRound: false,
        },
      ]);
    });
  });

  describe('round handling', () => {
    it('should advance round when all living actors acted', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [
          {
            actorId: 'hero',
            actionSpeed: 100,
            initiative: 0,
            turnGauge: 0,
            hasActedThisRound: true,
          },
          {
            actorId: 'slime',
            actionSpeed: 50,
            initiative: 1,
            turnGauge: 0,
            hasActedThisRound: true,
          },
        ],
      });

      expect(shouldAdvanceRound(battleState)).toBe(true);
    });

    it('should not advance round when at least one living actor has not acted', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [
          {
            actorId: 'hero',
            actionSpeed: 100,
            initiative: 0,
            turnGauge: 0,
            hasActedThisRound: true,
          },
          {
            actorId: 'slime',
            actionSpeed: 50,
            initiative: 1,
            turnGauge: 0,
            hasActedThisRound: false,
          },
        ],
      });

      expect(shouldAdvanceRound(battleState)).toBe(false);
    });

    it('should not advance round when battle is already resolved', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battleState = createStartedBattleState({
        hero,
        slime: defeatedSlime,
      });

      expect(shouldAdvanceRound(battleState)).toBe(false);
    });

    it('should reset hasActedThisRound for all entries, including defeated actors', () => {
      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 0,
          hasActedThisRound: true,
        },
        {
          actorId: 'slime',
          actionSpeed: 10,
          initiative: 1,
          turnGauge: 0,
          hasActedThisRound: true,
        },
      ];

      expect(resetRoundActedFlags(turnOrder)).toEqual([
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
          initiative: 1,
          turnGauge: 0,
          hasActedThisRound: false,
        },
      ]);
    });

    it('should append round end and start events when advancing round', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [
          {
            actorId: 'hero',
            actionSpeed: 100,
            initiative: 0,
            turnGauge: 0,
            hasActedThisRound: true,
          },
          {
            actorId: 'slime',
            actionSpeed: 50,
            initiative: 1,
            turnGauge: 0,
            hasActedThisRound: true,
          },
        ],
      });

      const nextState = advanceRoundIfNeeded(battleState);

      expect(nextState.roundNumber).toBe(2);
      expect(
        nextState.turnOrder.every((entry) => !entry.hasActedThisRound),
      ).toBe(true);

      expect(nextState.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'ROUND_ENDED',
            phase: 'completed',
            actorId: 'battle_engine',
            message: 'Round 1 ended.',
          }),
          expect.objectContaining({
            type: 'ROUND_STARTED',
            phase: 'initiation',
            actorId: 'battle_engine',
            message: 'Round 2 started.',
          }),
        ]),
      );
    });
  });

  describe('startBattle', () => {
    it('should start created battle and advance to the first actor', () => {
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

      const battleState = createBattleState({
        battleId: 'battle_start_test',
        seed: 'seed_start_test',
        actors: [hero, slime],
      });

      const startedBattle = startBattle(battleState);

      expect(startedBattle.status).toBe('in_progress');
      expect(startedBattle.activeActorId).toBe('hero');
      expect(startedBattle.turnNumber).toBe(1);

      expect(startedBattle.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'BATTLE_STARTED',
            phase: 'initiation',
          }),
          expect.objectContaining({
            type: 'ROUND_STARTED',
            phase: 'initiation',
            message: 'Round 1 started.',
          }),
          expect.objectContaining({
            type: 'TURN_STARTED',
            phase: 'initiation',
            actorId: 'hero',
          }),
        ]),
      );
    });

    it('should not restart a battle that is not created', () => {
      const battleState = createStartedBattleState();

      expect(startBattle(battleState)).toBe(battleState);
    });
  });

  describe('advanceBattleToNextActor', () => {
    it('should advance to the next ready living actor', () => {
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

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [
          {
            actorId: 'hero',
            actionSpeed: 100,
            initiative: 0,
            turnGauge: 100,
            hasActedThisRound: false,
          },
          {
            actorId: 'slime',
            actionSpeed: 50,
            initiative: 1,
            turnGauge: 50,
            hasActedThisRound: false,
          },
        ],
      });

      const nextState = advanceBattleToNextActor(battleState);

      expect(nextState.activeActorId).toBe('hero');
      expect(nextState.turnNumber).toBe(1);
      expect(nextState.status).toBe('in_progress');

      expect(nextState.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'TURN_STARTED',
            actorId: 'hero',
          }),
        ]),
      );
    });

    it('should not restore resources when starting the actor turn', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
        mp: 10,
        stamina: 10,
        derivedStats: {
          actionSpeed: 100,
          mpRegen: 3,
          staminaRegen: 5,
        },
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        derivedStats: {
          actionSpeed: 10,
        },
      });

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [
          {
            actorId: 'hero',
            actionSpeed: 100,
            initiative: 0,
            turnGauge: 100,
            hasActedThisRound: false,
          },
          {
            actorId: 'slime',
            actionSpeed: 10,
            initiative: 1,
            turnGauge: 0,
            hasActedThisRound: false,
          },
        ],
      });

      const nextState = advanceBattleToNextActor(battleState);

      expect(nextState.actors.hero.mp).toBe(10);
      expect(nextState.actors.hero.stamina).toBe(10);
      expect(nextState.events.map((event) => event.type)).not.toContain(
        'RESOURCE_RESTORED',
      );
    });

    it('should end battle in victory when no living monsters remain', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battleState = createStartedBattleState({
        hero,
        slime: defeatedSlime,
      });

      const nextState = advanceBattleToNextActor(battleState);

      expect(nextState.status).toBe('victory');
      expect(nextState.activeActorId).toBeUndefined();

      expect(nextState.turnOrder.map((entry) => entry.actorId)).toEqual([
        'hero',
      ]);

      expect(nextState.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'BATTLE_ENDED',
            phase: 'completed',
            message: 'Battle ended in victory.',
          }),
        ]),
      );
    });

    it('should end battle in defeat when no living characters remain', () => {
      const defeatedHero = createActor({
        actorId: 'hero',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createStartedBattleState({
        hero: defeatedHero,
        slime,
      });

      const nextState = advanceBattleToNextActor(battleState);

      expect(nextState.status).toBe('defeat');
      expect(nextState.activeActorId).toBeUndefined();

      expect(nextState.turnOrder.map((entry) => entry.actorId)).toEqual([
        'slime',
      ]);

      expect(nextState.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'BATTLE_ENDED',
            phase: 'completed',
            message: 'Battle ended in defeat.',
          }),
        ]),
      );
    });

    it('should throw when battle is in progress but no living turn order entries remain', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createStartedBattleState({
        hero,
        slime,
        turnOrder: [],
      });

      expect(() => advanceBattleToNextActor(battleState)).toThrow(
        'Battle battle_1 is in progress but has no living turn order entries.',
      );
    });
  });
});
