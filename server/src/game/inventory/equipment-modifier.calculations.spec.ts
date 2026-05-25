import {
  cloneEquipmentStatModifier,
  collectEquipmentStatModifiers,
  hasEquipmentStatModifiers,
} from './equipment-modifier.calculations';

import type { StatModifier } from '../passive/passive.types';

describe('equipment modifier calculations', () => {
  it('should collect stat modifiers from equipped equipment items', () => {
    const modifiers = collectEquipmentStatModifiers(['rusty_sword']);

    expect(modifiers).toEqual([
      expect.objectContaining({
        id: 'rusty_sword_p_atk',
        target: 'pAtk',
        operation: 'add',
        valueType: 'flat',
        value: 2,
        sourceId: 'rusty_sword',
        sourceType: 'equipment',
      }),
    ]);
  });

  it('should collect modifiers from multiple equipped items in equipment order', () => {
    const modifiers = collectEquipmentStatModifiers([
      'rusty_sword',
      'simple_wooden_charm',
    ]);

    expect(modifiers.map((modifier) => modifier.id)).toEqual([
      'rusty_sword_p_atk',
      'simple_wooden_charm_healing_potency',
    ]);
  });

  it('should ignore known non-equipment item ids when collecting modifiers', () => {
    const modifiers = collectEquipmentStatModifiers([
      'slime_gel',
      'minor_hp_potion',
    ]);

    expect(modifiers).toEqual([]);
  });

  it('should report whether equipped items provide modifiers', () => {
    expect(hasEquipmentStatModifiers(['rusty_sword'])).toBe(true);
    expect(hasEquipmentStatModifiers(['simple_wooden_charm'])).toBe(true);
    expect(hasEquipmentStatModifiers(['slime_gel'])).toBe(false);
    expect(hasEquipmentStatModifiers([])).toBe(false);
  });

  it('should return cloned modifiers instead of shared references', () => {
    const first = collectEquipmentStatModifiers(['rusty_sword']);
    const second = collectEquipmentStatModifiers(['rusty_sword']);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('should protect registry data from mutation through collected modifiers', () => {
    const collected = collectEquipmentStatModifiers(['rusty_sword']);

    collected[0].value = 999;
    collected[0].sourceId = 'mutated_source';

    const fresh = collectEquipmentStatModifiers(['rusty_sword']);

    expect(fresh[0]).toEqual(
      expect.objectContaining({
        id: 'rusty_sword_p_atk',
        value: 2,
        sourceId: 'rusty_sword',
      }),
    );
  });

  it('should clone stat-ratio value sources instead of sharing references', () => {
    const modifier: StatModifier & {
      valueSource: NonNullable<StatModifier['valueSource']>;
    } = {
      id: 'test_stat_ratio_modifier',
      target: 'pAtk',
      operation: 'add',
      valueType: 'flat',
      value: 1,
      valueSource: {
        type: 'stat_ratio',
        sourceStat: 'STR',
        ratio: 0.5,
        readFrom: 'raw_base_stats',
      },
      priority: 10,
      sourceId: 'test_equipment',
      sourceType: 'equipment',
    };

    const cloned = cloneEquipmentStatModifier(modifier);

    expect(cloned).toEqual(modifier);
    expect(cloned).not.toBe(modifier);
    expect(cloned.valueSource).toEqual(modifier.valueSource);
    expect(cloned.valueSource).not.toBe(modifier.valueSource);
  });

  it('should clone derived-stat-ratio value sources instead of sharing references', () => {
    const modifier: StatModifier & {
      valueSource: NonNullable<StatModifier['valueSource']>;
    } = {
      id: 'test_derived_stat_ratio_modifier',
      target: 'healingPotency',
      operation: 'add',
      valueType: 'flat',
      value: 1,
      valueSource: {
        type: 'derived_stat_ratio',
        sourceDerivedStat: 'maxMp',
        ratio: 0.1,
        readFrom: 'raw_derived_stats',
      },
      priority: 10,
      sourceId: 'test_equipment',
      sourceType: 'equipment',
    };

    const cloned = cloneEquipmentStatModifier(modifier);

    expect(cloned).toEqual(modifier);
    expect(cloned).not.toBe(modifier);
    expect(cloned.valueSource).toEqual(modifier.valueSource);
    expect(cloned.valueSource).not.toBe(modifier.valueSource);
  });

  it('should preserve modifiers without value sources', () => {
    const modifier: StatModifier = {
      id: 'test_flat_modifier',
      target: 'pDef',
      operation: 'add',
      valueType: 'flat',
      value: 2,
      priority: 10,
      sourceId: 'test_equipment',
      sourceType: 'equipment',
    };

    const cloned = cloneEquipmentStatModifier(modifier);

    expect(cloned).toEqual(modifier);
    expect(cloned).not.toBe(modifier);
    expect(cloned.valueSource).toBeUndefined();
  });
});
