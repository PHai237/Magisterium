import {
  buildSkillResourceCosts,
  calculateResourceCheck,
  restoreTurnStartResources,
  spendResources,
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
    actorId: 'hero',
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

function createSkill(
  overrides: Partial<SkillDefinition> = {},
): SkillDefinition {
  return {
    id: 'test_skill',
    name: 'Test Skill',
    description: 'Test skill.',

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
    it('should build resource costs from a skill definition', () => {
      const skill = createSkill({
        cost: {
          hpCost: 5,
          mpCost: 10,
          staminaCost: 15,
        },
      });

      expect(buildSkillResourceCosts(skill)).toEqual([
        {
          resourceType: 'HP',
          amount: 5,
        },
        {
          resourceType: 'MP',
          amount: 10,
        },
        {
          resourceType: 'Stamina',
          amount: 15,
        },
      ]);
    });

    it('should omit zero or missing resource costs', () => {
      const skill = createSkill({
        cost: {
          mpCost: 0,
          staminaCost: 12,
        },
      });

      expect(buildSkillResourceCosts(skill)).toEqual([
        {
          resourceType: 'Stamina',
          amount: 12,
        },
      ]);
    });
  });

  describe('calculateResourceCheck', () => {
    it('should return canPay true when resources are sufficient', () => {
      const actor = createActor({
        hp: 80,
        mp: 20,
        stamina: 30,
      });

      expect(
        calculateResourceCheck(actor, [
          {
            resourceType: 'HP',
            amount: 10,
          },
          {
            resourceType: 'MP',
            amount: 20,
          },
          {
            resourceType: 'Stamina',
            amount: 30,
          },
        ]),
      ).toEqual({
        canPay: true,
        missingResources: [],
      });
    });

    it('should report missing resources', () => {
      const actor = createActor({
        hp: 5,
        mp: 2,
        stamina: 1,
      });

      expect(
        calculateResourceCheck(actor, [
          {
            resourceType: 'HP',
            amount: 10,
          },
          {
            resourceType: 'MP',
            amount: 5,
          },
          {
            resourceType: 'Stamina',
            amount: 3,
          },
        ]),
      ).toEqual({
        canPay: false,
        missingResources: [
          {
            resourceType: 'HP',
            amount: 5,
          },
          {
            resourceType: 'MP',
            amount: 3,
          },
          {
            resourceType: 'Stamina',
            amount: 2,
          },
        ],
      });
    });
  });

  describe('spendResources', () => {
    it('should spend HP, MP, and Stamina resources', () => {
      const actor = createActor({
        hp: 80,
        mp: 20,
        stamina: 30,
      });

      const result = spendResources(actor, [
        {
          resourceType: 'HP',
          amount: 5,
        },
        {
          resourceType: 'MP',
          amount: 10,
        },
        {
          resourceType: 'Stamina',
          amount: 15,
        },
      ]);

      expect(result.hp).toBe(75);
      expect(result.mp).toBe(10);
      expect(result.stamina).toBe(15);
      expect(result.isExhausted).toBe(false);
    });

    it('should exhaust actor when stamina reaches zero', () => {
      const actor = createActor({
        stamina: 10,
      });

      const result = spendResources(actor, [
        {
          resourceType: 'Stamina',
          amount: 10,
        },
      ]);

      expect(result.stamina).toBe(0);
      expect(result.isExhausted).toBe(true);
    });
  });

  describe('restoreTurnStartResources', () => {
    it('should restore MP and Stamina at turn start', () => {
      const actor = createActor({
        mp: 10,
        stamina: 20,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          mpRegen: 3,
          staminaRegen: 7,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(13);
      expect(result.actor.stamina).toBe(27);
      expect(result.actor.isExhausted).toBe(false);

      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'RESOURCE_RESTORED',
            phase: 'initiation',
            actorId: 'hero',
            value: 3,
            metadata: {
              resourceType: 'MP',
              currentValue: 13,
              maxValue: 50,
            },
          }),
          expect.objectContaining({
            type: 'RESOURCE_RESTORED',
            phase: 'initiation',
            actorId: 'hero',
            value: 7,
            metadata: {
              resourceType: 'Stamina',
              currentValue: 27,
              maxValue: 100,
            },
          }),
        ]),
      );
    });

    it('should not restore above maximum resources', () => {
      const actor = createActor({
        mp: 49,
        stamina: 98,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          mpRegen: 10,
          staminaRegen: 10,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(50);
      expect(result.actor.stamina).toBe(100);

      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'RESOURCE_RESTORED',
            value: 1,
            metadata: {
              resourceType: 'MP',
              currentValue: 50,
              maxValue: 50,
            },
          }),
          expect.objectContaining({
            type: 'RESOURCE_RESTORED',
            value: 2,
            metadata: {
              resourceType: 'Stamina',
              currentValue: 100,
              maxValue: 100,
            },
          }),
        ]),
      );
    });

    it('should recover exhaustion when stamina passes recovery threshold', () => {
      const actor = createActor({
        isExhausted: true,
        stamina: 15,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 100,
          staminaRegen: 10,
          mpRegen: 0,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.stamina).toBe(25);
      expect(result.actor.isExhausted).toBe(false);

      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'RECOVERED_FROM_EXHAUSTION',
            phase: 'initiation',
            actorId: 'hero',
            metadata: {
              stamina: 25,
              maxStamina: 100,
            },
          }),
        ]),
      );
    });

    it('should stay exhausted when stamina does not pass recovery threshold', () => {
      const actor = createActor({
        isExhausted: true,
        stamina: 10,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 100,
          staminaRegen: 5,
          mpRegen: 0,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.stamina).toBe(15);
      expect(result.actor.isExhausted).toBe(true);

      expect(result.events.map((event) => event.type)).not.toContain(
        'RECOVERED_FROM_EXHAUSTION',
      );
    });

    it('should not restore resources for defeated actors', () => {
      const actor = createActor({
        hp: 0,
        mp: 10,
        stamina: 10,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          mpRegen: 10,
          staminaRegen: 10,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor).toBe(actor);
      expect(result.events).toEqual([]);
    });

    it('should not restore stamina for monster actors', () => {
      const actor = createActor({
        actorId: 'wild_wolf',
        actorType: 'monster',
        mp: 10,
        stamina: 20,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          mpRegen: 3,
          staminaRegen: 7,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(13);
      expect(result.actor.stamina).toBe(20);
      expect(result.events).toEqual([
        expect.objectContaining({
          type: 'RESOURCE_RESTORED',
          actorId: 'wild_wolf',
          value: 3,
          metadata: {
            resourceType: 'MP',
            currentValue: 13,
            maxValue: 50,
          },
        }),
      ]);
    });

    it('should normalize invalid regen values to zero', () => {
      const actor = createActor({
        mp: 10,
        stamina: 10,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          mpRegen: Number.NaN,
          staminaRegen: -10,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(10);
      expect(result.actor.stamina).toBe(10);
      expect(result.events).toEqual([]);
    });

    it('should not restore resources above zero when maximum resources are invalid', () => {
      const actor = createActor({
        isExhausted: true,
        mp: 5,
        stamina: 5,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxMp: 0,
          maxStamina: 0,
          mpRegen: 10,
          staminaRegen: 10,
        },
      });

      const result = restoreTurnStartResources(actor);

      expect(result.actor.mp).toBe(0);
      expect(result.actor.stamina).toBe(0);
      expect(result.actor.isExhausted).toBe(true);
      expect(result.events).toEqual([]);
    });
  });
});
