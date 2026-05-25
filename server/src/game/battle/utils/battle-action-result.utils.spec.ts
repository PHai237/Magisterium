import {
  createCancelledActionResult,
  createDefaultProcContext,
} from './battle-action-result.utils';

import { MAX_PROC_PER_TURN } from '../battle.constants';

import type { BattleActorState, BattleEvent } from '../battle.types';

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

function createEvent(overrides: Partial<BattleEvent> = {}): BattleEvent {
  return {
    id: 'event_1',
    type: 'ACTION_CANCELLED',
    phase: 'cancelled',

    actorId: 'actor_1',
    message: 'Action cancelled.',

    ...overrides,
  };
}

describe('battle action result utils', () => {
  describe('createDefaultProcContext', () => {
    it('should create a default proc context for an actor and turn', () => {
      const procContext = createDefaultProcContext('hero', 'battle_1:turn:3');

      expect(procContext).toEqual({
        actorId: 'hero',
        turnId: 'battle_1:turn:3',

        currentProcCount: 0,
        maxProcCount: MAX_PROC_PER_TURN,

        sourceProcIds: [],
      });
    });

    it('should create a fresh sourceProcIds array each time', () => {
      const first = createDefaultProcContext('hero', 'turn_1');
      const second = createDefaultProcContext('hero', 'turn_1');

      expect(first.sourceProcIds).toEqual([]);
      expect(second.sourceProcIds).toEqual([]);
      expect(first.sourceProcIds).not.toBe(second.sourceProcIds);
    });
  });

  describe('createCancelledActionResult', () => {
    it('should create a cancelled action result with no targets by default', () => {
      const actor = createActor({
        actorId: 'hero',
      });

      const events = [
        createEvent({
          id: 'event_1',
          actorId: 'hero',
        }),
      ];

      const result = createCancelledActionResult(actor, events);

      expect(result).toEqual({
        phase: 'cancelled',

        actorState: actor,
        targetStates: [],

        events,
        randomRolls: [],

        procContext: {
          actorId: 'hero',
          turnId: 'cancelled',
          currentProcCount: 0,
          maxProcCount: MAX_PROC_PER_TURN,
          sourceProcIds: [],
        },
      });
    });

    it('should preserve provided target states', () => {
      const actor = createActor({
        actorId: 'hero',
      });

      const target = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const events = [
        createEvent({
          id: 'event_1',
          actorId: 'hero',
          targetId: 'slime',
        }),
      ];

      const result = createCancelledActionResult(actor, events, [target]);

      expect(result.phase).toBe('cancelled');
      expect(result.actorState).toBe(actor);
      expect(result.targetStates).toEqual([target]);
      expect(result.targetStates[0]).toBe(target);
      expect(result.events).toBe(events);
      expect(result.randomRolls).toEqual([]);
    });

    it('should create a cancelled proc context tied to the acting actor', () => {
      const actor = createActor({
        actorId: 'mage',
      });

      const events = [
        createEvent({
          id: 'event_1',
          actorId: 'mage',
        }),
      ];

      const result = createCancelledActionResult(actor, events);

      expect(result.procContext).toMatchObject({
        actorId: 'mage',
        turnId: 'cancelled',
        currentProcCount: 0,
        maxProcCount: MAX_PROC_PER_TURN,
      });
    });
  });
});
