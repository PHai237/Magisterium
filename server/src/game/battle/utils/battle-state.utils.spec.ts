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

import type {
  BattleActorState,
  BattleEvent,
  BattleState,
} from '../battle.types';

import type {
  BaseStats,
  DerivedStats,
  ResistanceProfile,
} from '../../character/character.types';

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

function createActor(
  overrides: Partial<BattleActorState> = {},
): BattleActorState {
  return {
    actorId: 'actor',
    actorType: 'character',

    skillIds: [],
    inventoryItemIds: [],

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

function createBattleState(overrides: Partial<BattleState> = {}): BattleState {
  const hero = createActor({
    actorId: 'hero',
    actorType: 'character',
  });

  const slime = createActor({
    actorId: 'slime',
    actorType: 'monster',
  });

  return {
    battleId: 'battle_1',
    status: 'in_progress',

    roundNumber: 1,
    turnNumber: 1,
    activeActorId: 'hero',

    actors: {
      hero,
      slime,
    },

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

    randomContext: {
      battleId: 'battle_1',
      seed: 'seed_1',
      rollIndex: 0,
    },

    events: [],

    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',

    ...overrides,
  };
}

function createEvent(id: string, type: BattleEvent['type']): BattleEvent {
  return {
    id,
    type,
    phase: type === 'ACTION_CANCELLED' ? 'cancelled' : 'completed',
    actorId: 'battle_engine',
    message: id,
  };
}

describe('battle state utils', () => {
  describe('cloneActorRecord', () => {
    it('should clone actor records and mutable child arrays', () => {
      const resistances: ResistanceProfile = {
        physical: 0.2,
      };

      const actors: Record<string, BattleActorState> = {
        hero: createActor({
          actorId: 'hero',
          skillIds: ['heavy_strike'],
          inventoryItemIds: ['minor_hp_potion'],
          resistances,
          activeStatusEffects: [
            {
              id: 'burn_1',
              type: 'burn',
              remainingTurns: 2,
              stacks: 1,
              sourceActorId: 'slime',
              modifiers: [
                {
                  id: 'burn_modifier',
                  target: 'pDef',
                  operation: 'add',
                  valueType: 'flat',
                  value: -1,
                  priority: 10,
                  sourceId: 'burn',
                  sourceType: 'status',
                },
              ],
            },
          ],
          activeModifiers: [
            {
              id: 'gear_modifier',
              target: 'pAtk',
              operation: 'add',
              valueType: 'flat',
              value: 2,
              priority: 10,
              sourceId: 'rusty_sword',
              sourceType: 'equipment',
            },
          ],
        }),
      };

      const clonedActors = cloneActorRecord(actors);

      expect(clonedActors).toEqual(actors);
      expect(clonedActors).not.toBe(actors);

      expect(clonedActors.hero).not.toBe(actors.hero);
      expect(clonedActors.hero.skillIds).toEqual(['heavy_strike']);
      expect(clonedActors.hero.skillIds).not.toBe(actors.hero.skillIds);

      expect(clonedActors.hero.inventoryItemIds).toEqual(['minor_hp_potion']);
      expect(clonedActors.hero.inventoryItemIds).not.toBe(
        actors.hero.inventoryItemIds,
      );

      expect(clonedActors.hero.resistances).toEqual(resistances);
      expect(clonedActors.hero.resistances).not.toBe(actors.hero.resistances);

      expect(clonedActors.hero.baseStats).toEqual(DEFAULT_BASE_STATS);
      expect(clonedActors.hero.baseStats).not.toBe(actors.hero.baseStats);

      expect(clonedActors.hero.derivedStats).toEqual(DEFAULT_DERIVED_STATS);
      expect(clonedActors.hero.derivedStats).not.toBe(actors.hero.derivedStats);

      expect(clonedActors.hero.activeStatusEffects).not.toBe(
        actors.hero.activeStatusEffects,
      );

      expect(clonedActors.hero.activeStatusEffects[0]).not.toBe(
        actors.hero.activeStatusEffects[0],
      );

      expect(clonedActors.hero.activeStatusEffects[0].modifiers[0]).not.toBe(
        actors.hero.activeStatusEffects[0].modifiers[0],
      );

      expect(clonedActors.hero.activeModifiers[0]).not.toBe(
        actors.hero.activeModifiers[0],
      );
    });
  });

  describe('actor lookup and life state', () => {
    it('should return an actor by id', () => {
      const battleState = createBattleState();

      expect(getActorOrThrow(battleState, 'hero').actorId).toBe('hero');
    });

    it('should throw when actor is missing', () => {
      const battleState = createBattleState();

      expect(() => getActorOrThrow(battleState, 'missing')).toThrow(
        'Battle actor not found: missing',
      );
    });

    it('should identify defeated and alive actors', () => {
      const aliveActor = createActor({
        hp: 1,
      });

      const defeatedActor = createActor({
        hp: 0,
      });

      expect(isActorAlive(aliveActor)).toBe(true);
      expect(isActorDefeated(aliveActor)).toBe(false);

      expect(isActorAlive(defeatedActor)).toBe(false);
      expect(isActorDefeated(defeatedActor)).toBe(true);
    });
  });

  describe('team helpers', () => {
    it('should identify opposing actors by actor type', () => {
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

      expect(areOpposingActors(hero, slime)).toBe(true);
      expect(areOpposingActors(hero, ally)).toBe(false);
    });

    it('should get living actors', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
        hp: 10,
      });

      const defeatedAlly = createActor({
        actorId: 'ally',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 10,
      });

      const livingActors = getLivingActors({
        hero,
        ally: defeatedAlly,
        slime,
      });

      expect(livingActors.map((actor) => actor.actorId)).toEqual([
        'hero',
        'slime',
      ]);
    });

    it('should get living enemies of an actor', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const defeatedSlime = createActor({
        actorId: 'defeated_slime',
        actorType: 'monster',
        hp: 0,
      });

      const battleState = createBattleState({
        actors: {
          hero,
          slime,
          defeated_slime: defeatedSlime,
        },
      });

      expect(
        getLivingEnemiesOf(battleState, hero).map((actor) => actor.actorId),
      ).toEqual(['slime']);
    });

    it('should get living allies of an actor including self', () => {
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

      const battleState = createBattleState({
        actors: {
          hero,
          ally,
          defeated_ally: defeatedAlly,
          slime,
        },
      });

      expect(
        getLivingAlliesOf(battleState, hero).map((actor) => actor.actorId),
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

    it('should return victory when no living monsters remain', () => {
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

    it('should return defeat when no living characters remain', () => {
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

    it('should return defeat when no actors are present', () => {
      expect(determineBattleStatus({})).toBe('defeat');
    });
  });

  describe('appendEvents', () => {
    it('should append events and update timestamp', () => {
      const battleState = createBattleState({
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const nextState = appendEvents(battleState, [
        createEvent('event_1', 'TURN_STARTED'),
      ]);

      expect(nextState.events).toHaveLength(1);
      expect(nextState.events[0]).toMatchObject({
        id: 'event_1',
        type: 'TURN_STARTED',
      });

      expect(nextState.updatedAt).not.toBe(battleState.updatedAt);
    });

    it('should retain pinned battle lifecycle events when trimming event log', () => {
      const manyEvents: BattleEvent[] = [
        createEvent('battle_started', 'BATTLE_STARTED'),
        ...Array.from({ length: 250 }, (_, index) =>
          createEvent(`event_${index}`, 'TURN_STARTED'),
        ),
        createEvent('battle_ended', 'BATTLE_ENDED'),
      ];

      const battleState = createBattleState({
        events: manyEvents,
      });

      const nextState = appendEvents(battleState, [
        createEvent('latest_event', 'TURN_ENDED'),
      ]);

      expect(nextState.events.length).toBeLessThanOrEqual(200);

      expect(nextState.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'battle_started',
            type: 'BATTLE_STARTED',
          }),
          expect.objectContaining({
            id: 'battle_ended',
            type: 'BATTLE_ENDED',
          }),
          expect.objectContaining({
            id: 'latest_event',
            type: 'TURN_ENDED',
          }),
        ]),
      );
    });
  });

  describe('setBattleStatus', () => {
    it('should set battle status and update timestamp', () => {
      const battleState = createBattleState({
        status: 'created',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const nextState = setBattleStatus(battleState, 'in_progress');

      expect(nextState.status).toBe('in_progress');
      expect(nextState.updatedAt).not.toBe(battleState.updatedAt);
    });
  });
});
