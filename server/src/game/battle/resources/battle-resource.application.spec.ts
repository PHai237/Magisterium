import {
  buildSkillResourceCosts,
  restoreTurnStartResources,
} from './battle-resource.application';

import type { BattleActorState } from '../battle.types';

import type { BaseStats, DerivedStats } from '../../character/character.types';

import type { SkillDefinition } from '../../skill/skill.types';

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

function createSkill(
  overrides: Partial<SkillDefinition> = {},
): SkillDefinition {
  return {
    id: 'test_skill',
    name: 'Test Skill',
    description: 'A test skill.',

    family: 'weapon',
    actionType: 'physical_skill',
    actionCategory: 'offensive',
    targetType: 'enemy_single',

    cost: {
      hpCost: 0,
      mpCost: 0,
      staminaCost: 0,
    },

    effects: [],

    runeCapacity: 0,
    runeSlots: [],
    attachedRuneIds: [],

    tags: [],

    ...overrides,
  };
}

describe('battle resource application', () => {
  describe('buildSkillResourceCosts', () => {
    it('should return an empty cost list when skill has no positive costs', () => {
      const skill = createSkill({
        cost: {
          hpCost: 0,
          mpCost: 0,
          staminaCost: 0,
        },
      });

      expect(buildSkillResourceCosts(skill)).toEqual([]);
    });

    it('should build MP and Stamina costs when positive', () => {
      const skill = createSkill({
        cost: {
          mpCost: 8,
          staminaCost: 12,
        },
      });

      expect(buildSkillResourceCosts(skill)).toEqual([
        {
          resourceType: 'MP',
          amount: 8,
        },
        {
          resourceType: 'Stamina',
          amount: 12,
        },
      ]);
    });

    it('should include HP cost when positive', () => {
      const skill = createSkill({
        cost: {
          hpCost: 5,
          mpCost: 8,
          staminaCost: 12,
        },
      });

      expect(buildSkillResourceCosts(skill)).toEqual([
        {
          resourceType: 'HP',
          amount: 5,
        },
        {
          resourceType: 'MP',
          amount: 8,
        },
        {
          resourceType: 'Stamina',
          amount: 12,
        },
      ]);
    });

    it('should ignore undefined or zero HP cost', () => {
      const skill = createSkill({
        cost: {
          mpCost: 3,
          staminaCost: 0,
        },
      });

      expect(buildSkillResourceCosts(skill)).toEqual([
        {
          resourceType: 'MP',
          amount: 3,
        },
      ]);
    });
  });

  describe('restoreTurnStartResources', () => {
    it('should restore MP and Stamina at turn start', () => {
      const actor = createActor({
        mp: 10,
        stamina: 20,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxMp: 50,
          maxStamina: 100,
          mpRegen: 3,
          staminaRegen: 7,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(13);
      expect(result.actor.stamina).toBe(27);

      expect(result.events.map((event) => event.type)).toEqual([
        'RESOURCE_RESTORED',
        'RESOURCE_RESTORED',
      ]);

      expect(result.events[0]).toMatchObject({
        actorId: actor.actorId,
        value: 3,
        metadata: {
          resourceType: 'MP',
          currentValue: 13,
          maxValue: 50,
        },
      });

      expect(result.events[1]).toMatchObject({
        actorId: actor.actorId,
        value: 7,
        metadata: {
          resourceType: 'Stamina',
          currentValue: 27,
          maxValue: 100,
        },
      });
    });

    it('should not restore resources above max values', () => {
      const actor = createActor({
        mp: 49,
        stamina: 98,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxMp: 50,
          maxStamina: 100,
          mpRegen: 5,
          staminaRegen: 5,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(50);
      expect(result.actor.stamina).toBe(100);

      expect(result.events[0]).toMatchObject({
        type: 'RESOURCE_RESTORED',
        value: 1,
        metadata: {
          resourceType: 'MP',
          currentValue: 50,
          maxValue: 50,
        },
      });

      expect(result.events[1]).toMatchObject({
        type: 'RESOURCE_RESTORED',
        value: 2,
        metadata: {
          resourceType: 'Stamina',
          currentValue: 100,
          maxValue: 100,
        },
      });
    });

    it('should create no restore events when resources are already full', () => {
      const actor = createActor({
        mp: DEFAULT_DERIVED_STATS.maxMp,
        stamina: DEFAULT_DERIVED_STATS.maxStamina,
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(DEFAULT_DERIVED_STATS.maxMp);
      expect(result.actor.stamina).toBe(DEFAULT_DERIVED_STATS.maxStamina);
      expect(result.events).toEqual([]);
    });

    it('should emit recovery event when actor recovers from exhaustion', () => {
      const actor = createActor({
        isExhausted: true,
        stamina: 20,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 100,
          staminaRegen: 1,
          mpRegen: 0,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.stamina).toBe(21);
      expect(result.actor.isExhausted).toBe(false);

      expect(result.events.map((event) => event.type)).toEqual([
        'RESOURCE_RESTORED',
        'RECOVERED_FROM_EXHAUSTION',
      ]);

      expect(result.events[1]).toMatchObject({
        type: 'RECOVERED_FROM_EXHAUSTION',
        actorId: actor.actorId,
        metadata: {
          stamina: 21,
          maxStamina: 100,
        },
      });
    });

    it('should keep actor exhausted when stamina does not pass recovery threshold', () => {
      const actor = createActor({
        isExhausted: true,
        stamina: 19,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 100,
          staminaRegen: 1,
          mpRegen: 0,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.stamina).toBe(20);
      expect(result.actor.isExhausted).toBe(true);

      expect(result.events.map((event) => event.type)).toEqual([
        'RESOURCE_RESTORED',
      ]);
    });

    it('should not restore resources for defeated actors', () => {
      const actor = createActor({
        hp: 0,
        mp: 10,
        stamina: 20,
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor).toBe(actor);
      expect(result.events).toEqual([]);
    });
  });
});
