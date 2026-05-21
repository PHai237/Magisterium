import {
  appendEvents,
  areOpposingActors,
  cloneActorRecord,
  determineBattleStatus,
  getActorOrThrow,
  getLivingActors,
  getLivingAlliesOf,
  getLivingEnemiesOf,
  isActorAlive,
  isActorDefeated,
  setBattleStatus,
} from './battle-state.utils';

import { createBattleEvent } from '../events/battle-event.factory';

import { MAX_BATTLE_EVENTS_RETAINED } from '../battle.constants';

import type {
  BattleActorState,
  BattleEvent,
  BattleState,
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

function createActor(
  overrides: Partial<BattleActorState> = {},
): BattleActorState {
  return {
    actorId: 'actor_1',
    actorType: 'character',

    skillIds: [],

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

function createBattleState(
  actors: BattleActorState[],
  overrides: Partial<BattleState> = {},
): BattleState {
  const now = new Date().toISOString();

  return {
    battleId: 'state_utils_test_battle',
    status: 'in_progress',

    roundNumber: 1,
    turnNumber: 1,
    activeActorId: actors[0]?.actorId,

    actors: Object.fromEntries(actors.map((actor) => [actor.actorId, actor])),

    turnOrder: [],

    randomContext: {
      battleId: 'state_utils_test_battle',
      seed: 'state_utils_seed',
      rollIndex: 0,
    },

    events: [],

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
}

function createTestEvent(index: number): BattleEvent {
  return createBattleEvent({
    type: 'TURN_STARTED',
    phase: 'initiation',
    actorId: `actor_${index}`,
    message: `Event ${index}`,
  });
}

describe('battle state utils', () => {
  describe('cloneActorRecord', () => {
    it('should clone actor records and mutable child arrays', () => {
      const actor = createActor({
        actorId: 'hero',
        skillIds: ['spark'],
        activeStatusEffects: [
          {
            id: 'burn_1',
            type: 'burn',
            remainingTurns: 2,
            stacks: 1,
            modifiers: [],
          },
        ],
        activeModifiers: [
          {
            id: 'mod_1',
            target: 'STR',
            operation: 'add',
            valueType: 'flat',
            value: 2,
            priority: 10,
            sourceType: 'skill',
            sourceId: 'skill_1',
          },
        ],
      });

      const cloned = cloneActorRecord({
        hero: actor,
      });

      expect(cloned.hero).toEqual(actor);
      expect(cloned.hero).not.toBe(actor);

      expect(cloned.hero.skillIds).toEqual(actor.skillIds);
      expect(cloned.hero.skillIds).not.toBe(actor.skillIds);

      expect(cloned.hero.activeStatusEffects).toEqual(
        actor.activeStatusEffects,
      );
      expect(cloned.hero.activeStatusEffects).not.toBe(
        actor.activeStatusEffects,
      );

      expect(cloned.hero.activeModifiers).toEqual(actor.activeModifiers);
      expect(cloned.hero.activeModifiers).not.toBe(actor.activeModifiers);
    });
  });

  describe('getActorOrThrow', () => {
    it('should return an actor by id', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const battle = createBattleState([hero]);

      expect(getActorOrThrow(battle, 'hero')).toBe(hero);
    });

    it('should throw when actor is missing', () => {
      const battle = createBattleState([]);

      expect(() => getActorOrThrow(battle, 'missing')).toThrow(
        'Battle actor not found: missing',
      );
    });
  });

  describe('actor life helpers', () => {
    it('should detect defeated actors', () => {
      expect(
        isActorDefeated(
          createActor({
            hp: 0,
          }),
        ),
      ).toBe(true);

      expect(
        isActorDefeated(
          createActor({
            hp: 1,
          }),
        ),
      ).toBe(false);
    });

    it('should detect living actors', () => {
      expect(
        isActorAlive(
          createActor({
            hp: 1,
          }),
        ),
      ).toBe(true);

      expect(
        isActorAlive(
          createActor({
            hp: 0,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('team helpers', () => {
    it('should detect opposing actors by actor type', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      expect(areOpposingActors(hero, slime)).toBe(true);
      expect(areOpposingActors(hero, ally)).toBe(false);
    });

    it('should return all living actors', () => {
      const hero = createActor({
        actorId: 'hero',
        hp: 50,
      });

      const defeatedAlly = createActor({
        actorId: 'defeated_ally',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 20,
      });

      expect(
        getLivingActors({
          hero,
          defeated_ally: defeatedAlly,
          slime,
        }).map((actor) => actor.actorId),
      ).toEqual(['hero', 'slime']);
    });

    it('should return living enemies of an actor', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const defeatedGoblin = createActor({
        actorId: 'defeated_goblin',
        actorType: 'monster',
        hp: 0,
      });

      const battle = createBattleState([hero, ally, slime, defeatedGoblin]);

      expect(
        getLivingEnemiesOf(battle, hero).map((actor) => actor.actorId),
      ).toEqual(['slime']);
    });

    it('should return living allies of an actor including self', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const defeatedAlly = createActor({
        actorId: 'defeated_ally',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createBattleState([hero, ally, defeatedAlly, slime]);

      expect(
        getLivingAlliesOf(battle, hero).map((actor) => actor.actorId),
      ).toEqual(['hero', 'ally']);
    });
  });

  describe('determineBattleStatus', () => {
    it('should return in_progress when both sides have living actors', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      expect(
        determineBattleStatus({
          hero,
          slime,
        }),
      ).toBe('in_progress');
    });

    it('should return victory when all monsters are defeated', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      expect(
        determineBattleStatus({
          hero,
          slime,
        }),
      ).toBe('victory');
    });

    it('should return defeat when all characters are defeated', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      expect(
        determineBattleStatus({
          hero,
          slime,
        }),
      ).toBe('defeat');
    });

    it('should return defeat when there are no living characters', () => {
      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      expect(
        determineBattleStatus({
          slime,
        }),
      ).toBe('defeat');
    });
  });

  describe('appendEvents', () => {
    it('should append events and update updatedAt', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const battle = createBattleState([hero], {
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const event = createTestEvent(1);
      const nextBattle = appendEvents(battle, [event]);

      expect(nextBattle.events).toEqual([event]);
      expect(nextBattle.updatedAt).not.toBe(battle.updatedAt);
    });

    it('should retain pinned battle started and battle ended events when trimming event log', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const battleStarted = createBattleEvent({
        type: 'BATTLE_STARTED',
        phase: 'initiation',
        actorId: 'battle_engine',
        message: 'Battle started.',
      });

      const battleEnded = createBattleEvent({
        type: 'BATTLE_ENDED',
        phase: 'completed',
        actorId: 'battle_engine',
        message: 'Battle ended.',
      });

      const oldEvents = Array.from(
        {
          length: MAX_BATTLE_EVENTS_RETAINED + 20,
        },
        (_, index) => createTestEvent(index),
      );

      const battle = createBattleState([hero], {
        events: [battleStarted, ...oldEvents],
      });

      const nextBattle = appendEvents(battle, [battleEnded]);

      expect(nextBattle.events).toContain(battleStarted);
      expect(nextBattle.events).toContain(battleEnded);
      expect(nextBattle.events.length).toBeLessThanOrEqual(
        MAX_BATTLE_EVENTS_RETAINED,
      );
    });
  });

  describe('setBattleStatus', () => {
    it('should set battle status and update updatedAt', () => {
      const hero = createActor({
        actorId: 'hero',
      });

      const battle = createBattleState([hero], {
        status: 'created',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const nextBattle = setBattleStatus(battle, 'in_progress');

      expect(nextBattle.status).toBe('in_progress');
      expect(nextBattle.updatedAt).not.toBe(battle.updatedAt);
    });
  });
});
