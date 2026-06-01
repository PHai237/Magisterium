import { applyBattleConsumableItemEffectsToActor } from './battle-item.application';

import { createBattleActorState } from '../factory/battle.factory';

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
  return createBattleActorState({
    actorId: overrides.actorId ?? 'hero',
    actorType: overrides.actorType ?? 'character',

    skillIds: overrides.skillIds ?? [],

    baseStats: {
      ...DEFAULT_BASE_STATS,
      ...overrides.baseStats,
    },

    derivedStats: {
      ...DEFAULT_DERIVED_STATS,
      ...overrides.derivedStats,
    },

    resistances: overrides.resistances ?? {},

    currentState: {
      hp: overrides.hp ?? DEFAULT_DERIVED_STATS.maxHp,
      mp: overrides.mp ?? DEFAULT_DERIVED_STATS.maxMp,
      stamina: overrides.stamina ?? DEFAULT_DERIVED_STATS.maxStamina,
    },

    shield: overrides.shield ?? 0,

    monsterId: overrides.monsterId,
    aiTargetingMode: overrides.aiTargetingMode,
  });
}

describe('battle item application', () => {
  it('should apply HP potion effect to a battle actor without exceeding max HP', () => {
    const actor = createActor({
      hp: 80,
    });

    const result = applyBattleConsumableItemEffectsToActor(
      actor,
      'minor_hp_potion',
    );

    expect(result.itemId).toBe('minor_hp_potion');
    expect(result.consumesOnUse).toBe(true);
    expect(result.actorState.hp).toBe(100);

    expect(result.effects).toEqual([
      {
        effectType: 'restore_resource',
        target: 'HP',
        previousValue: 80,
        nextValue: 100,
        amountApplied: 20,
      },
    ]);
  });

  it('should apply MP potion effect to a battle actor', () => {
    const actor = createActor({
      mp: 0,
    });

    const result = applyBattleConsumableItemEffectsToActor(
      actor,
      'minor_mp_potion',
    );

    expect(result.actorState.mp).toBe(20);

    expect(result.effects).toEqual([
      {
        effectType: 'restore_resource',
        target: 'MP',
        previousValue: 0,
        nextValue: 20,
        amountApplied: 20,
      },
    ]);
  });

  it('should apply stamina bread effect to a battle actor', () => {
    const actor = createActor({
      stamina: 10,
    });

    const result = applyBattleConsumableItemEffectsToActor(
      actor,
      'stamina_bread',
    );

    expect(result.actorState.stamina).toBe(35);

    expect(result.effects).toEqual([
      {
        effectType: 'restore_resource',
        target: 'Stamina',
        previousValue: 10,
        nextValue: 35,
        amountApplied: 25,
      },
    ]);
  });

  it('should clamp restored resource to max value', () => {
    const actor = createActor({
      hp: 95,
    });

    const result = applyBattleConsumableItemEffectsToActor(
      actor,
      'minor_hp_potion',
    );

    expect(result.actorState.hp).toBe(100);

    expect(result.effects[0]).toEqual({
      effectType: 'restore_resource',
      target: 'HP',
      previousValue: 95,
      nextValue: 100,
      amountApplied: 5,
    });
  });

  it('should update exhaustion state when restoring stamina above recovery threshold', () => {
    const actor = createActor({
      stamina: 0,
    });

    expect(actor.isExhausted).toBe(true);

    const result = applyBattleConsumableItemEffectsToActor(
      actor,
      'stamina_bread',
    );

    expect(result.actorState.stamina).toBe(25);
    expect(result.actorState.isExhausted).toBe(false);
  });

  it('should reject a non-consumable item inside battle', () => {
    const actor = createActor();

    expect(() =>
      applyBattleConsumableItemEffectsToActor(actor, 'rusty_sword'),
    ).toThrow('Item rusty_sword is not consumable.');
  });

  it('should reject a consumable that is not usable inside battle', () => {
    const actor = createActor();

    expect(() =>
      applyBattleConsumableItemEffectsToActor(actor, 'one_night_inn_pass'),
    ).toThrow('Item one_night_inn_pass cannot be used in battle.');
  });
});
