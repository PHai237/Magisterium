import {
  advanceRandomContext,
  advanceTurnGaugeOnce,
  advanceTurnGaugeUntilReady,
  calculateCritChance,
  calculateDamage,
  calculateDamageVarianceMultiplier,
  calculateFleeChance,
  calculateHitChance,
  calculateProcRate,
  calculateRandomFinalChance,
  calculateResourceCheck,
  calculateResistanceMitigation,
  calculateSecondChanceRate,
  consumeTurnGauge,
  createInitialTurnOrder,
  getCurrentResource,
  getMaxResource,
  getReadyTurnEntries,
  hashStringToUnitInterval,
  resolveRandomRoll,
  spendResources,
  updateExhaustionState,
} from './battle.calculations';

import { MIN_ACTION_SPEED, TURN_GAUGE_READY_VALUE } from '../battle.constants';

import type {
  BattleActorState,
  BattleResourceCost,
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

describe('battle calculations', () => {
  describe('random calculations', () => {
    it('should hash a string into a deterministic unit interval', () => {
      const first = hashStringToUnitInterval('same-seed');
      const second = hashStringToUnitInterval('same-seed');

      expect(first).toBe(second);
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThanOrEqual(1);
    });

    it('should advance random context roll index', () => {
      const context = {
        battleId: 'battle_1',
        seed: 'seed_1',
        rollIndex: 0,
      };

      expect(advanceRandomContext(context)).toEqual({
        battleId: 'battle_1',
        seed: 'seed_1',
        rollIndex: 1,
      });
    });

    it('should calculate final random chance without luck scaling', () => {
      expect(
        calculateRandomFinalChance({
          type: 'hit',
          actorId: 'hero',
          baseChance: 110,
          randomContext: {
            battleId: 'battle_1',
            seed: 'seed_1',
            rollIndex: 0,
          },
        }),
      ).toBe(100);
    });

    it('should calculate final random chance with luck scaling', () => {
      expect(
        calculateRandomFinalChance({
          type: 'crit',
          actorId: 'hero',
          baseChance: 10,
          luckValue: 5,
          luckScaling: {
            enabled: true,
            multiplierPerPoint: 2,
          },
          randomContext: {
            battleId: 'battle_1',
            seed: 'seed_1',
            rollIndex: 0,
          },
        }),
      ).toBe(20);
    });

    it('should resolve a deterministic random roll', () => {
      const roll = resolveRandomRoll({
        type: 'hit',
        actorId: 'hero',
        targetId: 'slime',
        baseChance: 50,
        randomContext: {
          battleId: 'battle_1',
          seed: 'seed_1',
          rollIndex: 0,
        },
      });

      expect(roll.type).toBe('hit');
      expect(roll.actorId).toBe('hero');
      expect(roll.targetId).toBe('slime');
      expect(roll.baseChance).toBe(50);
      expect(roll.finalChance).toBe(50);
      expect(roll.roll).toBeGreaterThanOrEqual(0);
      expect(roll.roll).toBeLessThanOrEqual(100);
      expect(typeof roll.success).toBe('boolean');
    });
  });

  describe('chance calculations', () => {
    it('should calculate hit chance from accuracy and evasion', () => {
      const attacker = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          accuracy: 90,
        },
      });

      const defender = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          evasionRate: 20,
        },
      });

      expect(calculateHitChance(attacker, defender)).toBe(70);
    });

    it('should clamp hit chance to the configured range', () => {
      const attacker = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          accuracy: 999,
        },
      });

      const defender = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          evasionRate: 0,
        },
      });

      expect(calculateHitChance(attacker, defender)).toBe(98);
    });

    it('should ignore evasion when defender is exhausted', () => {
      const attacker = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          accuracy: 80,
        },
      });

      const defender = createActor({
        isExhausted: true,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          evasionRate: 50,
        },
      });

      expect(calculateHitChance(attacker, defender)).toBe(80);
    });

    it('should calculate crit, flee, second chance, and proc rates', () => {
      const actor = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          critRate: 12.345,
          fleeRate: 20.5,
          secondChanceRate: 7.25,
          procRate: 18.75,
        },
      });

      expect(calculateCritChance(actor)).toBe(12.35);
      expect(calculateFleeChance(actor)).toBe(20.5);
      expect(calculateSecondChanceRate(actor)).toBe(7.25);
      expect(calculateProcRate(actor)).toBe(18.75);
    });
  });

  describe('damage calculations', () => {
    it('should calculate physical damage with defense, resistance, and variance', () => {
      const attacker = createActor({
        actorId: 'attacker',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          critDamageBonus: 50,
        },
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
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
          basePower: 50,
          scalingValue: 0,
          isCritical: false,
        },
        0.5,
      );

      expect(result.rawDamage).toBe(50);
      expect(result.damageAfterDefense).toBe(45);
      expect(result.damageAfterResistance).toBe(36);
      expect(result.finalDamage).toBe(36);
      expect(result.absorbedAmount).toBe(0);
      expect(result.isCritical).toBe(false);
      expect(result.isTrueDamage).toBe(false);
    });

    it('should apply critical multiplier to non-true damage', () => {
      const attacker = createActor({
        actorId: 'attacker',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          critDamageBonus: 50,
        },
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          pDef: 0,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,
          damageType: 'physical',
          basePower: 20,
          scalingValue: 0,
          isCritical: true,
        },
        0.5,
      );

      expect(result.rawDamage).toBe(30);
      expect(result.isCritical).toBe(true);
      expect(result.finalDamage).toBe(30);
    });

    it('should bypass defense and resistance for true damage and never apply critical multiplier', () => {
      const attacker = createActor({
        actorId: 'attacker',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          critDamageBonus: 100,
        },
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          pDef: 999,
          mDef: 999,
        },
        resistances: {
          physical: 0.95,
          magical: 0.95,
          fire: 0.95,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,
          damageType: 'true',
          elementType: 'fire',
          basePower: 15,
          scalingValue: 0,
          isCritical: true,
        },
        0.5,
      );

      expect(result.rawDamage).toBe(15);
      expect(result.damageAfterDefense).toBe(15);
      expect(result.damageAfterResistance).toBe(15);
      expect(result.finalDamage).toBe(15);
      expect(result.absorbedAmount).toBe(0);
      expect(result.isCritical).toBe(false);
      expect(result.isTrueDamage).toBe(true);
    });

    it('should apply damage variance multiplier', () => {
      expect(calculateDamageVarianceMultiplier(0)).toBe(0.95);
      expect(calculateDamageVarianceMultiplier(0.5)).toBe(1);
      expect(calculateDamageVarianceMultiplier(1)).toBe(1.05);
    });

    it('should apply elemental resistance after damage type resistance', () => {
      const defender = createActor({
        resistances: {
          physical: 0.2,
          fire: 0.5,
        },
      });

      const result = calculateResistanceMitigation(
        100,
        defender,
        'physical',
        'fire',
      );

      expect(result.damageAfterResistance).toBe(40);
      expect(result.absorbedAmount).toBe(0);
    });

    it('should convert overcapped resistance into absorption', () => {
      const defender = createActor({
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 200,
        },
        resistances: {
          physical: 1.1,
        },
      });

      const result = calculateResistanceMitigation(100, defender, 'physical');

      expect(result.damageAfterResistance).toBe(0);
      expect(result.absorbedAmount).toBe(10);
    });

    it('should cap absorption healing from overcapped resistance by defender max HP', () => {
      const attacker = createActor({
        actorId: 'attacker',
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 100,
          pDef: 0,
        },
        resistances: {
          physical: 1.2,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,
          damageType: 'physical',
          basePower: 1000,
          scalingValue: 0,
          isCritical: false,
        },
        0.5,
      );

      expect(result.damageAfterResistance).toBe(0);
      expect(result.finalDamage).toBe(0);
      expect(result.absorbedAmount).toBe(25);
      expect(result.wasFullyBlocked).toBe(true);
    });

    it('should floor final positive damage to at least one', () => {
      const attacker = createActor({
        actorId: 'attacker',
      });

      const defender = createActor({
        actorId: 'defender',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          pDef: 0,
        },
        resistances: {
          physical: 0.95,
        },
      });

      const result = calculateDamage(
        {
          attacker,
          defender,
          damageType: 'physical',
          basePower: 10,
          scalingValue: 0,
          isCritical: false,
        },
        0.5,
      );

      expect(result.damageAfterResistance).toBe(0.5);
      expect(result.finalDamage).toBe(1);
    });
  });

  describe('resource and exhaustion calculations', () => {
    it('should return clamped current and max resources', () => {
      const actor = createActor({
        hp: 999,
        mp: -10,
        stamina: 20,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 100,
          maxMp: 50,
          maxStamina: 0,
        },
      });

      expect(getMaxResource(actor, 'HP')).toBe(100);
      expect(getMaxResource(actor, 'MP')).toBe(50);
      expect(getMaxResource(actor, 'Stamina')).toBe(0);

      expect(getCurrentResource(actor, 'HP')).toBe(100);
      expect(getCurrentResource(actor, 'MP')).toBe(0);
      expect(getCurrentResource(actor, 'Stamina')).toBe(0);
    });

    it('should calculate resource check success', () => {
      const actor = createActor({
        hp: 80,
        mp: 20,
        stamina: 30,
      });

      const costs: BattleResourceCost[] = [
        {
          resourceType: 'MP',
          amount: 10,
        },
        {
          resourceType: 'Stamina',
          amount: 20,
        },
      ];

      expect(calculateResourceCheck(actor, costs)).toEqual({
        canPay: true,
        missingResources: [],
      });
    });

    it('should calculate resource check failure with missing resources', () => {
      const actor = createActor({
        hp: 80,
        mp: 5,
        stamina: 3,
      });

      const costs: BattleResourceCost[] = [
        {
          resourceType: 'MP',
          amount: 10,
        },
        {
          resourceType: 'Stamina',
          amount: 20,
        },
      ];

      expect(calculateResourceCheck(actor, costs)).toEqual({
        canPay: false,
        missingResources: [
          {
            resourceType: 'MP',
            amount: 5,
          },
          {
            resourceType: 'Stamina',
            amount: 17,
          },
        ],
      });
    });

    it('should ignore non-positive and invalid resource costs', () => {
      const actor = createActor({
        mp: 0,
      });

      expect(
        calculateResourceCheck(actor, [
          {
            resourceType: 'MP',
            amount: -10,
          },
          {
            resourceType: 'Stamina',
            amount: Number.NaN,
          },
        ]),
      ).toEqual({
        canPay: true,
        missingResources: [],
      });
    });

    it('should spend resources and update exhaustion state', () => {
      const actor = createActor({
        hp: 80,
        mp: 20,
        stamina: 10,
      });

      const updatedActor = spendResources(actor, [
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
          amount: 10,
        },
      ]);

      expect(updatedActor.hp).toBe(75);
      expect(updatedActor.mp).toBe(10);
      expect(updatedActor.stamina).toBe(0);
      expect(updatedActor.isExhausted).toBe(true);
    });

    it('should clamp current resources to safe maximums when spending resources', () => {
      const actor = createActor({
        hp: 999,
        mp: 999,
        stamina: 999,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxHp: 50,
          maxMp: 10,
          maxStamina: 0,
        },
      });

      const updatedActor = spendResources(actor, [
        {
          resourceType: 'MP',
          amount: 3,
        },
        {
          resourceType: 'Stamina',
          amount: 1,
        },
      ]);

      expect(updatedActor.hp).toBe(50);
      expect(updatedActor.mp).toBe(7);
      expect(updatedActor.stamina).toBe(0);
      expect(updatedActor.isExhausted).toBe(true);
    });

    it('should mark actor exhausted when stamina is zero', () => {
      const actor = createActor({
        stamina: 0,
        isExhausted: false,
      });

      const updatedActor = updateExhaustionState(actor);

      expect(updatedActor.stamina).toBe(0);
      expect(updatedActor.isExhausted).toBe(true);
    });

    it('should keep actor exhausted until stamina passes recovery threshold', () => {
      const actor = createActor({
        stamina: 10,
        isExhausted: true,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 100,
        },
      });

      const updatedActor = updateExhaustionState(actor);

      expect(updatedActor.stamina).toBe(10);
      expect(updatedActor.isExhausted).toBe(true);
    });

    it('should recover exhausted actor when stamina passes recovery threshold', () => {
      const actor = createActor({
        stamina: 25,
        isExhausted: true,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 100,
        },
      });

      const updatedActor = updateExhaustionState(actor);

      expect(updatedActor.stamina).toBe(25);
      expect(updatedActor.isExhausted).toBe(false);
    });

    it('should keep actor exhausted when max stamina is zero', () => {
      const actor = createActor({
        isExhausted: true,
        stamina: 5,
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          maxStamina: 0,
        },
      });

      const updatedActor = updateExhaustionState(actor);

      expect(updatedActor.stamina).toBe(0);
      expect(updatedActor.isExhausted).toBe(true);
    });
  });

  describe('turn gauge calculations', () => {
    it('should create initial turn order sorted by action speed', () => {
      const slowActor = createActor({
        actorId: 'slow',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          actionSpeed: 5,
        },
      });

      const fastActor = createActor({
        actorId: 'fast',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          actionSpeed: 20,
        },
      });

      const turnOrder = createInitialTurnOrder([slowActor, fastActor]);

      expect(turnOrder.map((entry) => entry.actorId)).toEqual(['fast', 'slow']);

      expect(turnOrder[0]).toMatchObject({
        actorId: 'fast',
        actionSpeed: 20,
        initiative: 1,
        turnGauge: 0,
        hasActedThisRound: false,
      });
    });

    it('should normalize zero action speed to the minimum action speed', () => {
      const actor = createActor({
        actorId: 'zero_speed',
        derivedStats: {
          ...DEFAULT_DERIVED_STATS,
          actionSpeed: 0,
        },
      });

      const turnOrder = createInitialTurnOrder([actor]);

      expect(turnOrder[0].actionSpeed).toBe(MIN_ACTION_SPEED);
    });

    it('should advance turn gauge once', () => {
      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 20,
          hasActedThisRound: false,
        },
      ];

      expect(advanceTurnGaugeOnce(turnOrder)).toEqual([
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 30,
          hasActedThisRound: false,
        },
      ]);
    });

    it('should advance turn gauge until an entry is ready', () => {
      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'hero',
          actionSpeed: 10,
          initiative: 0,
          turnGauge: 0,
          hasActedThisRound: false,
        },
      ];

      const advancedTurnOrder = advanceTurnGaugeUntilReady(turnOrder);

      expect(advancedTurnOrder[0].turnGauge).toBeGreaterThanOrEqual(
        TURN_GAUGE_READY_VALUE,
      );

      expect(getReadyTurnEntries(advancedTurnOrder)).toHaveLength(1);
    });

    it('should force the highest gauge entry ready if safety fallback is needed', () => {
      const turnOrder: BattleTurnOrderEntry[] = [
        {
          actorId: 'actor_a',
          actionSpeed: 1,
          initiative: 1,
          turnGauge: 10,
          hasActedThisRound: false,
        },
        {
          actorId: 'actor_b',
          actionSpeed: 1,
          initiative: 2,
          turnGauge: 20,
          hasActedThisRound: false,
        },
      ];

      const advancedTurnOrder = advanceTurnGaugeUntilReady(turnOrder);

      expect(
        advancedTurnOrder.some(
          (entry) => entry.turnGauge >= TURN_GAUGE_READY_VALUE,
        ),
      ).toBe(true);
    });

    it('should consume turn gauge and preserve non-negative value', () => {
      const consumedEntry = consumeTurnGauge({
        actorId: 'hero',
        actionSpeed: 10,
        initiative: 0,
        turnGauge: 120,
        hasActedThisRound: false,
      });

      expect(consumedEntry.turnGauge).toBe(20);
    });

    it('should clamp consumed turn gauge to zero', () => {
      const consumedEntry = consumeTurnGauge({
        actorId: 'hero',
        actionSpeed: 10,
        initiative: 0,
        turnGauge: 50,
        hasActedThisRound: false,
      });

      expect(consumedEntry.turnGauge).toBe(0);
    });
  });
});
