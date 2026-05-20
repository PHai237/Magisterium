import {
  advanceTurnGaugeUntilReady,
  calculateCriticalMultiplier,
  calculateDamage,
  calculateDamageVarianceMultiplier,
  calculateHitChance,
  calculateRandomFinalChance,
  consumeTurnGauge,
  finalizeDamage,
  hashStringToUnitInterval,
  resolveRandomRoll,
  spendResources,
  updateExhaustionState,
} from './battle.calculations';

import {
  RECOVERY_STAMINA_PERCENT,
  TURN_GAUGE_READY_VALUE,
} from './battle.constants';

import type {
  BattleActorState,
  BattleTurnOrderEntry,
  RandomRollRequest,
} from './battle.types';

import type {
  BaseStats,
  DerivedStats,
  ResistanceProfile,
} from '../character/character.types';

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

type BattleActorStateOverrides = Partial<
  Omit<BattleActorState, 'baseStats' | 'derivedStats' | 'resistances'>
> & {
  baseStats?: Partial<BaseStats>;
  derivedStats?: Partial<DerivedStats>;
  resistances?: ResistanceProfile;
};

function createActor(
  overrides: BattleActorStateOverrides = {},
): BattleActorState {
  const { baseStats, derivedStats, resistances, ...actorOverrides } = overrides;

  return {
    actorId: 'actor_1',
    actorType: 'character',

    baseStats: {
      ...DEFAULT_BASE_STATS,
      ...baseStats,
    },
    derivedStats: {
      ...DEFAULT_DERIVED_STATS,
      ...derivedStats,
    },
    resistances: resistances ?? {},

    hp: DEFAULT_DERIVED_STATS.maxHp,
    mp: DEFAULT_DERIVED_STATS.maxMp,
    stamina: DEFAULT_DERIVED_STATS.maxStamina,

    shield: 0,
    isExhausted: false,

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,

    ...actorOverrides,
  };
}

describe('battle calculations', () => {
  describe('deterministic random rolls', () => {
    it('should hash strings into the [0, 1) interval', () => {
      const roll = hashStringToUnitInterval('battle:seed:0:hit');

      expect(roll).toBeGreaterThanOrEqual(0);
      expect(roll).toBeLessThan(1);
    });

    it('should resolve the same random request deterministically', () => {
      const request: RandomRollRequest = {
        type: 'hit',
        actorId: 'actor_1',
        targetId: 'monster_1',
        baseChance: 75,
        randomContext: {
          battleId: 'battle_1',
          seed: 'fixed_seed',
          rollIndex: 0,
        },
      };

      const firstRoll = resolveRandomRoll(request);
      const secondRoll = resolveRandomRoll(request);

      expect(firstRoll.roll).toBe(secondRoll.roll);
      expect(firstRoll.success).toBe(secondRoll.success);
      expect(firstRoll.finalChance).toBe(75);
    });

    it('should resolve damage variance rolls deterministically', () => {
      const request: RandomRollRequest = {
        type: 'damage_variance',
        actorId: 'actor_1',
        targetId: 'monster_1',
        baseChance: 100,
        randomContext: {
          battleId: 'battle_1',
          seed: 'fixed_seed',
          rollIndex: 2,
        },
      };

      const roll = resolveRandomRoll(request);

      expect(roll.type).toBe('damage_variance');
      expect(roll.roll).toBeGreaterThanOrEqual(0);
      expect(roll.roll).toBeLessThanOrEqual(100);
      expect(roll.success).toBe(true);
    });

    it('should apply luck scaling only when enabled', () => {
      const baseRequest: RandomRollRequest = {
        type: 'proc',
        actorId: 'actor_1',
        baseChance: 10,
        luckValue: 20,
        luckScaling: {
          enabled: false,
          multiplierPerPoint: 0.5,
        },
        randomContext: {
          battleId: 'battle_1',
          seed: 'fixed_seed',
          rollIndex: 1,
        },
      };

      expect(calculateRandomFinalChance(baseRequest)).toBe(10);

      expect(
        calculateRandomFinalChance({
          ...baseRequest,
          luckScaling: {
            enabled: true,
            multiplierPerPoint: 0.5,
          },
        }),
      ).toBe(20);
    });
  });

  describe('hit and critical calculations', () => {
    it('should calculate hit chance from accuracy minus evasion', () => {
      const attacker = createActor({
        derivedStats: {
          accuracy: 90,
        },
      });

      const defender = createActor({
        derivedStats: {
          evasionRate: 15,
        },
      });

      expect(calculateHitChance(attacker, defender)).toBe(75);
    });

    it('should ignore evasion when defender is exhausted', () => {
      const attacker = createActor({
        derivedStats: {
          accuracy: 90,
        },
      });

      const defender = createActor({
        isExhausted: true,
        derivedStats: {
          evasionRate: 30,
        },
      });

      expect(calculateHitChance(attacker, defender)).toBe(90);
    });

    it('should clamp hit chance to the maximum cap', () => {
      const attacker = createActor({
        derivedStats: {
          accuracy: 120,
        },
      });

      const defender = createActor({
        derivedStats: {
          evasionRate: 0,
        },
      });

      expect(calculateHitChance(attacker, defender)).toBe(98);
    });

    it('should treat critDamageBonus as bonus percent, not as an extra base multiplier', () => {
      const attacker = createActor({
        derivedStats: {
          critDamageBonus: 50,
        },
      });

      expect(calculateCriticalMultiplier(attacker)).toBe(1.5);
    });
  });

  describe('damage calculations', () => {
    it('should return zero final damage when mitigated damage is zero', () => {
      expect(finalizeDamage(0)).toBe(0);
      expect(finalizeDamage(-5)).toBe(0);
    });

    it('should floor final damage and enforce minimum damage for positive mitigated damage', () => {
      expect(finalizeDamage(7.99)).toBe(7);
      expect(finalizeDamage(0.25)).toBe(1);
    });

    it('should calculate physical damage through raw damage, defense, resistance, and final floor', () => {
      const attacker = createActor({
        actorId: 'attacker',
        derivedStats: {
          critDamageBonus: 50,
        },
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          pDef: 5,
        },
        resistances: {
          physical: 0.2,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,

          damageType: 'physical',

          basePower: 10,
          scalingValue: 10,

          isCritical: false,
        },
        0.5,
      );

      expect(result.rawDamage).toBe(20);
      expect(result.damageAfterDefense).toBe(15);
      expect(result.damageAfterResistance).toBe(12);
      expect(result.finalDamage).toBe(12);
      expect(result.isTrueDamage).toBe(false);
      expect(result.wasFullyBlocked).toBe(false);
    });

    it('should apply critical multiplier before mitigation', () => {
      const attacker = createActor({
        actorId: 'attacker',
        derivedStats: {
          critDamageBonus: 50,
        },
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          pDef: 5,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,

          damageType: 'physical',

          basePower: 10,
          scalingValue: 10,

          isCritical: true,
        },
        0.5,
      );

      expect(result.rawDamage).toBe(30);
      expect(result.damageAfterDefense).toBe(25);
      expect(result.finalDamage).toBe(25);
      expect(result.isCritical).toBe(true);
    });

    it('should bypass defense and resistance for true damage', () => {
      const attacker = createActor({
        actorId: 'attacker',
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          pDef: 999,
          mDef: 999,
        },
        resistances: {
          physical: 0.95,
          fire: 0.95,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,

          damageType: 'true',
          elementType: 'fire',

          basePower: 10,
          scalingValue: 5,

          isCritical: false,
        },
        0.5,
      );

      expect(result.rawDamage).toBe(15);
      expect(result.damageAfterDefense).toBe(15);
      expect(result.damageAfterResistance).toBe(15);
      expect(result.finalDamage).toBe(15);
      expect(result.isTrueDamage).toBe(true);
    });

    it('should apply deterministic damage variance multiplier', () => {
      expect(calculateDamageVarianceMultiplier(0)).toBe(0.95);
      expect(calculateDamageVarianceMultiplier(0.5)).toBe(1);
      expect(calculateDamageVarianceMultiplier(1)).toBe(1.05);
    });
  });

  describe('resource and exhaustion calculations', () => {
    it('should set actor as exhausted when stamina reaches zero', () => {
      const actor = createActor({
        stamina: 1,
      });

      const updatedActor = spendResources(actor, [
        {
          resourceType: 'Stamina',
          amount: 1,
        },
      ]);

      expect(updatedActor.stamina).toBe(0);
      expect(updatedActor.isExhausted).toBe(true);
    });

    it('should keep actor exhausted until stamina is above recovery threshold', () => {
      const actor = createActor({
        isExhausted: true,
        stamina: DEFAULT_DERIVED_STATS.maxStamina * RECOVERY_STAMINA_PERCENT,
      });

      expect(updateExhaustionState(actor).isExhausted).toBe(true);

      const recoveredActor = updateExhaustionState({
        ...actor,
        stamina:
          DEFAULT_DERIVED_STATS.maxStamina * RECOVERY_STAMINA_PERCENT + 1,
      });

      expect(recoveredActor.isExhausted).toBe(false);
    });
  });

  describe('turn gauge calculations', () => {
    it('should advance low-speed actors until one is ready', () => {
      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'slow_actor',
          actionSpeed: 1,
          initiative: 0,
          turnGauge: 0,
          hasActedThisRound: false,
        },
      ];

      const advancedTurnOrder = advanceTurnGaugeUntilReady(turnOrder);

      expect(advancedTurnOrder[0].turnGauge).toBeGreaterThanOrEqual(
        TURN_GAUGE_READY_VALUE,
      );
    });

    it('should preserve overflow gauge after consuming a turn', () => {
      const entry: BattleTurnOrderEntry = {
        actorId: 'fast_actor',
        actionSpeed: 30,
        initiative: 0,
        turnGauge: 105,
        hasActedThisRound: false,
      };

      expect(consumeTurnGauge(entry).turnGauge).toBe(5);
    });

    it('should normalize zero action speed to minimum speed instead of softlocking', () => {
      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'stuck_actor',
          actionSpeed: 0,
          initiative: 0,
          turnGauge: 0,
          hasActedThisRound: false,
        },
      ];

      const advancedTurnOrder = advanceTurnGaugeUntilReady(turnOrder);

      expect(advancedTurnOrder[0].actionSpeed).toBe(1);
      expect(advancedTurnOrder[0].turnGauge).toBeGreaterThanOrEqual(
        TURN_GAUGE_READY_VALUE,
      );
    });
  });
});
