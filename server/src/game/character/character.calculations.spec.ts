import {
  applyModifiersToBaseStats,
  applyModifiersToDerivedStats,
  calculateBaseStats,
  calculateDerivedStats,
  createCharacterSnapshot,
  sanitizeEquippedItemIds,
} from './character.calculations';

import { createCharacter } from './character.factory';

import type { BaseStats, DerivedStats, StatProgress } from './character.types';

import type { StatModifier } from '../passive/passive.types';

const BASE_STATS: BaseStats = {
  STR: 10,
  DEX: 10,
  CON: 10,
  INT: 10,
  WIS: 10,
  LUK: 10,
};

function createStatProgress(currentValue: number): StatProgress {
  return {
    currentValue,
    fragmentCount: 0,
    accumulatedBonus: 0,
  };
}

describe('character calculations', () => {
  it('should calculate phase 6B derived stats from base stats', () => {
    expect(calculateDerivedStats(BASE_STATS, [])).toEqual({
      maxHp: 130,
      maxMp: 70,
      maxStamina: 145,

      pAtk: 26,
      mAtk: 25,
      healingPotency: 25,

      pDef: 10,
      mDef: 10,

      actionSpeed: 20,
      accuracy: 90,
      evasionRate: 15,

      critRate: 3.5,
      critDamageBonus: 55,

      fleeRate: 30,

      statusResist: 15,
      spiritualPotency: 10,

      mpRegen: 3,
      staminaRegen: 8,

      secondChanceRate: 0,
      procRate: 2.5,
    });
  });

  it('should calculate base stats from stat progress records', () => {
    const baseStats = calculateBaseStats({
      STR: createStatProgress(10),
      DEX: createStatProgress(11),
      CON: createStatProgress(12),
      INT: createStatProgress(13),
      WIS: createStatProgress(14),
      LUK: createStatProgress(15),
    });

    expect(baseStats).toEqual({
      STR: 10,
      DEX: 11,
      CON: 12,
      INT: 13,
      WIS: 14,
      LUK: 15,
    });
  });

  it('should apply flat modifiers to derived stats', () => {
    const rawDerivedStats = calculateDerivedStats(BASE_STATS, []);
    const modifiers: StatModifier[] = [
      {
        id: 'test_p_atk_modifier',
        target: 'pAtk',
        operation: 'add',
        valueType: 'flat',
        value: 5,
        priority: 10,
        sourceId: 'test_sword',
        sourceType: 'equipment',
      },
    ];

    const modifiedDerivedStats = applyModifiersToDerivedStats(
      rawDerivedStats,
      BASE_STATS,
      modifiers,
    );

    expect(modifiedDerivedStats.pAtk).toBe(rawDerivedStats.pAtk + 5);
  });

  it('should apply percent modifiers to derived stats', () => {
    const rawDerivedStats: DerivedStats = calculateDerivedStats(BASE_STATS, []);
    const modifiers: StatModifier[] = [
      {
        id: 'test_percent_modifier',
        target: 'maxHp',
        operation: 'add',
        valueType: 'percent',
        value: 10,
        priority: 10,
        sourceId: 'test_armor',
        sourceType: 'equipment',
      },
    ];

    const modifiedDerivedStats = applyModifiersToDerivedStats(
      rawDerivedStats,
      BASE_STATS,
      modifiers,
    );

    expect(modifiedDerivedStats.maxHp).toBe(
      Math.round(rawDerivedStats.maxHp * 1.1 * 100) / 100,
    );
  });

  it('should apply flat modifiers to base stats before derived stats are calculated', () => {
    const modifiers: StatModifier[] = [
      {
        id: 'test_str_modifier',
        target: 'STR',
        operation: 'add',
        valueType: 'flat',
        value: 5,
        priority: 10,
        sourceId: 'test_ring',
        sourceType: 'equipment',
      },
    ];

    const modifiedBaseStats = applyModifiersToBaseStats(BASE_STATS, modifiers);

    expect(modifiedBaseStats.STR).toBe(15);

    const rawDerivedStats = calculateDerivedStats(BASE_STATS, []);
    const modifiedDerivedStats = calculateDerivedStats(
      modifiedBaseStats,
      modifiers,
    );

    expect(modifiedDerivedStats.pAtk).toBeGreaterThan(rawDerivedStats.pAtk);
  });

  it('should allow base stat modifiers to read raw base stats through stat-ratio value source', () => {
    const modifiers: StatModifier[] = [
      {
        id: 'test_str_from_con_modifier',
        target: 'STR',
        operation: 'add',
        valueType: 'flat',
        value: 0,
        valueSource: {
          type: 'stat_ratio',
          sourceStat: 'CON',
          ratio: 0.5,
          readFrom: 'raw_base_stats',
        },
        priority: 10,
        sourceId: 'test_training_gear',
        sourceType: 'equipment',
      },
    ];

    const modifiedBaseStats = applyModifiersToBaseStats(BASE_STATS, modifiers);

    expect(modifiedBaseStats.STR).toBe(15);
  });

  it('should reject base stat modifiers that read derived stats', () => {
    const modifiers: StatModifier[] = [
      {
        id: 'test_str_from_max_hp_modifier',
        target: 'STR',
        operation: 'add',
        valueType: 'flat',
        value: 0,
        valueSource: {
          type: 'derived_stat_ratio',
          sourceDerivedStat: 'maxHp',
          ratio: 0.1,
          readFrom: 'raw_derived_stats',
        },
        priority: 10,
        sourceId: 'test_invalid_gear',
        sourceType: 'equipment',
      },
    ];

    expect(() => applyModifiersToBaseStats(BASE_STATS, modifiers)).toThrow(
      'Base stat modifier test_str_from_max_hp_modifier cannot use derived_stat_ratio value source.',
    );
  });

  it('should allow derived stat modifiers to read raw derived stats', () => {
    const rawDerivedStats = calculateDerivedStats(BASE_STATS, []);
    const modifiers: StatModifier[] = [
      {
        id: 'test_shield_like_hp_modifier',
        target: 'maxHp',
        operation: 'add',
        valueType: 'flat',
        value: 0,
        valueSource: {
          type: 'derived_stat_ratio',
          sourceDerivedStat: 'maxMp',
          ratio: 0.25,
          readFrom: 'raw_derived_stats',
        },
        priority: 10,
        sourceId: 'test_arcane_vitality',
        sourceType: 'equipment',
      },
    ];

    const modifiedDerivedStats = applyModifiersToDerivedStats(
      rawDerivedStats,
      BASE_STATS,
      modifiers,
    );

    expect(modifiedDerivedStats.maxHp).toBe(
      Math.round((rawDerivedStats.maxHp + rawDerivedStats.maxMp * 0.25) * 100) /
        100,
    );
  });

  it('should keep base and derived modifier pipelines single-pass and deterministic', () => {
    const modifiers: StatModifier[] = [
      {
        id: 'test_base_str_bonus',
        target: 'STR',
        operation: 'add',
        valueType: 'flat',
        value: 5,
        priority: 10,
        sourceId: 'test_base_item',
        sourceType: 'equipment',
      },
      {
        id: 'test_derived_patk_bonus',
        target: 'pAtk',
        operation: 'add',
        valueType: 'flat',
        value: 2,
        valueSource: {
          type: 'stat_ratio',
          sourceStat: 'STR',
          ratio: 0.2,
          readFrom: 'raw_base_stats',
        },
        priority: 20,
        sourceId: 'test_derived_item',
        sourceType: 'equipment',
      },
    ];

    const modifiedBaseStats = applyModifiersToBaseStats(BASE_STATS, modifiers);
    const modifiedDerivedStats = calculateDerivedStats(
      modifiedBaseStats,
      modifiers,
    );

    const secondModifiedBaseStats = applyModifiersToBaseStats(
      BASE_STATS,
      modifiers,
    );
    const secondModifiedDerivedStats = calculateDerivedStats(
      secondModifiedBaseStats,
      modifiers,
    );

    expect(modifiedBaseStats).toEqual(secondModifiedBaseStats);
    expect(modifiedDerivedStats).toEqual(secondModifiedDerivedStats);
  });

  it('should include equipped item modifiers in character snapshots', () => {
    const character = createCharacter({
      name: 'GearUser',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshotWithRustySword = createCharacterSnapshot(character);

    const snapshotWithoutRustySword = createCharacterSnapshot({
      ...character,
      equippedItemIds: [],
    });

    expect(snapshotWithRustySword.equippedItemIds).toEqual(['rusty_sword']);
    expect(snapshotWithRustySword.derivedStats.pAtk).toBe(
      snapshotWithoutRustySword.derivedStats.pAtk + 2,
    );
  });

  it('should update snapshot derived stats after equipment changes', () => {
    const character = createCharacter({
      name: 'CharmUser',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshotWithoutCharm = createCharacterSnapshot(character);

    const snapshotWithCharm = createCharacterSnapshot({
      ...character,
      inventoryItemIds: [...character.inventoryItemIds, 'simple_wooden_charm'],
      equippedItemIds: [...character.equippedItemIds, 'simple_wooden_charm'],
    });

    expect(snapshotWithCharm.derivedStats.healingPotency).toBe(
      snapshotWithoutCharm.derivedStats.healingPotency + 2,
    );
  });

  it('should clamp current state against recalculated derived stats in snapshots', () => {
    const character = createCharacter({
      name: 'ClampUser',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot({
      ...character,
      currentState: {
        hp: 999_999,
        mp: 999_999,
        stamina: 999_999,
      },
    });

    expect(snapshot.currentState).toEqual({
      hp: snapshot.derivedStats.maxHp,
      mp: snapshot.derivedStats.maxMp,
      stamina: snapshot.derivedStats.maxStamina,
    });
  });
  it('should sanitize duplicate equipped item ids before applying modifiers', () => {
    const character = createCharacter({
      name: 'DuplicateGear',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot({
      ...character,
      equippedItemIds: ['rusty_sword', 'rusty_sword', 'rusty_sword'],
    });

    const cleanSnapshot = createCharacterSnapshot({
      ...character,
      equippedItemIds: ['rusty_sword'],
    });

    expect(snapshot.equippedItemIds).toEqual(['rusty_sword']);
    expect(snapshot.derivedStats.pAtk).toBe(cleanSnapshot.derivedStats.pAtk);
  });

  it('should ignore unknown and non-equipment equipped item ids in snapshots', () => {
    const character = createCharacter({
      name: 'DirtyGear',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot({
      ...character,
      inventoryItemIds: [
        ...character.inventoryItemIds,
        'missing_item',
        'minor_hp_potion',
      ],
      equippedItemIds: ['missing_item', 'minor_hp_potion', 'rusty_sword'],
    });

    expect(snapshot.equippedItemIds).toEqual(['rusty_sword']);
  });

  it('should skip equipped items that are not present in inventory', () => {
    const character = createCharacter({
      name: 'GhostGear',
      originId: 'mercenary',
      userId: 'user_1',
    });

    expect(
      sanitizeEquippedItemIds(
        ['training_greatsword'],
        character.inventoryItemIds,
      ),
    ).toEqual([]);
  });

  it('should reject non-finite modifier math', () => {
    const modifiers: StatModifier[] = [
      {
        id: 'bad_infinite_modifier',
        target: 'pAtk',
        operation: 'add',
        valueType: 'flat',
        value: Infinity,
        priority: 10,
        sourceId: 'bad_item',
        sourceType: 'equipment',
      },
    ];

    expect(() => calculateDerivedStats(BASE_STATS, modifiers)).toThrow(
      'Resolved modifier value for modifier bad_infinite_modifier must be a finite number.',
    );
  });
});
