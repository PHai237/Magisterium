import {
  buildSkillResourceCosts,
  calculateResourceCheck,
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

});
