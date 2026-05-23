import {
  applyModifiersToBaseStats,
  applyModifiersToDerivedStats,
  calculateBaseStats,
  calculateDerivedStats,
  createCharacterSnapshot,
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
});
