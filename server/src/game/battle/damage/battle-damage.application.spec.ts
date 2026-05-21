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

describe('battle damage application', () => {
  describe('applyDamageToActor', () => {
    it('should apply damage to HP when the target has no shield', () => {
      const target = createActor({
        hp: 80,
        shield: 0,
      });

      const result = applyDamageToActor(target, 25);

      expect(result.targetState.hp).toBe(55);
      expect(result.targetState.shield).toBe(0);

      expect(result.hpDamage).toBe(25);
      expect(result.shieldDamage).toBe(0);
      expect(result.shieldBroken).toBe(false);
    });

    it('should consume shield before HP', () => {
      const target = createActor({
        hp: 80,
        shield: 10,
      });

      const result = applyDamageToActor(target, 25);

      expect(result.targetState.hp).toBe(65);
      expect(result.targetState.shield).toBe(0);

      expect(result.shieldDamage).toBe(10);
      expect(result.hpDamage).toBe(15);
      expect(result.shieldBroken).toBe(true);
    });

    it('should damage only shield when shield fully absorbs the hit', () => {
      const target = createActor({
        hp: 80,
        shield: 30,
      });

      const result = applyDamageToActor(target, 12);

      expect(result.targetState.hp).toBe(80);
      expect(result.targetState.shield).toBe(18);

      expect(result.shieldDamage).toBe(12);
      expect(result.hpDamage).toBe(0);
      expect(result.shieldBroken).toBe(false);
    });

    it('should clamp HP at zero', () => {
      const target = createActor({
        hp: 10,
        shield: 0,
      });

      const result = applyDamageToActor(target, 999);

      expect(result.targetState.hp).toBe(0);
      expect(result.hpDamage).toBe(999);
    });

    it('should floor fractional damage', () => {
      const target = createActor({
        hp: 80,
        shield: 0,
      });

      const result = applyDamageToActor(target, 12.9);

      expect(result.targetState.hp).toBe(68);
      expect(result.hpDamage).toBe(12);
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
      expect(result.shieldBroken).toBe(false);
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
  });
});
