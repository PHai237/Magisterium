import {
  applyDamageToActor,
  applyHealingToActor,
  applyShieldToActor,
} from './battle-damage.application';

import type { BattleActorState } from '../battle.types';

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

function createActor(
  overrides: Partial<BattleActorState> = {},
): BattleActorState {
  return {
    actorId: 'target',
    actorType: 'monster',

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

describe('battle damage application', () => {
  describe('applyDamageToActor', () => {
    it('should apply HP damage when no shield is present', () => {
      const target = createActor({
        hp: 80,
      });

      const result = applyDamageToActor(target, 25);

      expect(result.targetState.hp).toBe(55);
      expect(result.targetState.shield).toBe(0);

      expect(result.shieldDamage).toBe(0);
      expect(result.hpDamage).toBe(25);
      expect(result.overkillDamage).toBe(0);
      expect(result.shieldBroken).toBe(false);
    });

    it('should apply shield damage before HP damage', () => {
      const target = createActor({
        hp: 80,
        shield: 10,
      });

      const result = applyDamageToActor(target, 25);

      expect(result.targetState.shield).toBe(0);
      expect(result.targetState.hp).toBe(65);

      expect(result.shieldDamage).toBe(10);
      expect(result.hpDamage).toBe(15);
      expect(result.overkillDamage).toBe(0);
      expect(result.shieldBroken).toBe(true);
    });

    it('should damage shield without breaking it when damage is lower than shield', () => {
      const target = createActor({
        hp: 80,
        shield: 20,
      });

      const result = applyDamageToActor(target, 12);

      expect(result.targetState.shield).toBe(8);
      expect(result.targetState.hp).toBe(80);

      expect(result.shieldDamage).toBe(12);
      expect(result.hpDamage).toBe(0);
      expect(result.overkillDamage).toBe(0);
      expect(result.shieldBroken).toBe(false);
    });

    it('should floor fractional damage', () => {
      const target = createActor({
        hp: 80,
      });

      const result = applyDamageToActor(target, 12.9);

      expect(result.targetState.hp).toBe(68);
      expect(result.hpDamage).toBe(12);
      expect(result.overkillDamage).toBe(0);
    });

    it('should treat negative damage as zero', () => {
      const target = createActor({
        hp: 80,
        shield: 10,
      });

      const result = applyDamageToActor(target, -20);

      expect(result.targetState.hp).toBe(80);
      expect(result.targetState.shield).toBe(10);

      expect(result.hpDamage).toBe(0);
      expect(result.shieldDamage).toBe(0);
      expect(result.overkillDamage).toBe(0);
      expect(result.shieldBroken).toBe(false);
    });

    it('should report real HP damage instead of phantom overkill damage', () => {
      const target = createActor({
        hp: 10,
        shield: 0,
      });

      const result = applyDamageToActor(target, 9999);

      expect(result.targetState.hp).toBe(0);

      expect(result.shieldDamage).toBe(0);
      expect(result.hpDamage).toBe(10);
      expect(result.overkillDamage).toBe(9989);
      expect(result.shieldBroken).toBe(false);
    });

    it('should report real HP damage after shield and keep overkill separate', () => {
      const target = createActor({
        hp: 10,
        shield: 5,
      });

      const result = applyDamageToActor(target, 100);

      expect(result.targetState.shield).toBe(0);
      expect(result.targetState.hp).toBe(0);

      expect(result.shieldDamage).toBe(5);
      expect(result.hpDamage).toBe(10);
      expect(result.overkillDamage).toBe(85);
      expect(result.shieldBroken).toBe(true);
    });

    it('should clamp invalid current HP before applying damage', () => {
      const target = createActor({
        hp: 999,
      });

      const result = applyDamageToActor(target, 25);

      expect(result.targetState.hp).toBe(75);
      expect(result.hpDamage).toBe(25);
      expect(result.overkillDamage).toBe(0);
    });
  });

  describe('applyHealingToActor', () => {
    it('should restore HP', () => {
      const target = createActor({
        hp: 40,
      });

      const result = applyHealingToActor(target, 25);

      expect(result.targetState.hp).toBe(65);
      expect(result.healingDone).toBe(25);
    });

    it('should cap healing at max HP', () => {
      const target = createActor({
        hp: 90,
      });

      const result = applyHealingToActor(target, 25);

      expect(result.targetState.hp).toBe(DEFAULT_DERIVED_STATS.maxHp);
      expect(result.healingDone).toBe(10);
    });

    it('should floor fractional healing', () => {
      const target = createActor({
        hp: 40,
      });

      const result = applyHealingToActor(target, 12.9);

      expect(result.targetState.hp).toBe(52);
      expect(result.healingDone).toBe(12);
    });

    it('should treat negative healing as zero', () => {
      const target = createActor({
        hp: 40,
      });

      const result = applyHealingToActor(target, -10);

      expect(result.targetState.hp).toBe(40);
      expect(result.healingDone).toBe(0);
    });

    it('should not revive a defeated actor through normal healing', () => {
      const target = createActor({
        hp: 0,
      });

      const result = applyHealingToActor(target, 25);

      expect(result.targetState.hp).toBe(0);
      expect(result.healingDone).toBe(0);
    });

    it('should normalize negative current HP and not revive it through normal healing', () => {
      const target = createActor({
        hp: -10,
      });

      const result = applyHealingToActor(target, 25);

      expect(result.targetState.hp).toBe(0);
      expect(result.healingDone).toBe(0);
    });

    it('should clamp invalid current HP before healing', () => {
      const target = createActor({
        hp: 999,
      });

      const result = applyHealingToActor(target, 25);

      expect(result.targetState.hp).toBe(DEFAULT_DERIVED_STATS.maxHp);
      expect(result.healingDone).toBe(0);
    });
  });

  describe('applyShieldToActor', () => {
    it('should add shield to the target', () => {
      const target = createActor({
        shield: 5,
      });

      const result = applyShieldToActor(target, 12);

      expect(result.targetState.shield).toBe(17);
      expect(result.shieldGained).toBe(12);
    });

    it('should floor fractional shield gain', () => {
      const target = createActor({
        shield: 5,
      });

      const result = applyShieldToActor(target, 12.9);

      expect(result.targetState.shield).toBe(17);
      expect(result.shieldGained).toBe(12);
    });

    it('should treat negative shield gain as zero', () => {
      const target = createActor({
        shield: 5,
      });

      const result = applyShieldToActor(target, -10);

      expect(result.targetState.shield).toBe(5);
      expect(result.shieldGained).toBe(0);
    });

    it('should cap shield by max HP ratio', () => {
      const target = createActor({
        shield: 40,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 100,
        },
      });

      const result = applyShieldToActor(target, 25);

      expect(result.targetState.shield).toBe(50);
      expect(result.shieldGained).toBe(10);
    });

    it('should not gain more shield when already at shield cap', () => {
      const target = createActor({
        shield: 50,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 100,
        },
      });

      const result = applyShieldToActor(target, 25);

      expect(result.targetState.shield).toBe(50);
      expect(result.shieldGained).toBe(0);
    });

    it('should normalize existing shield before applying capped shield gain', () => {
      const target = createActor({
        shield: 999,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 100,
        },
      });

      const result = applyShieldToActor(target, 10);

      expect(result.targetState.shield).toBe(50);
      expect(result.shieldGained).toBe(0);
    });

    it('should not allow shield when max HP is zero', () => {
      const target = createActor({
        shield: 5,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 0,
        },
      });

      const result = applyShieldToActor(target, 10);

      expect(result.targetState.shield).toBe(0);
      expect(result.shieldGained).toBe(0);
    });
  });
});
