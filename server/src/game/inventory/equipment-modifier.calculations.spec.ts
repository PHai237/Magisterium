import {
  collectEquipmentStatModifiers,
  hasEquipmentStatModifiers,
} from './equipment-modifier.calculations';

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

  it('should collect modifiers from multiple equipped items', () => {
    const modifiers = collectEquipmentStatModifiers([
      'rusty_sword',
      'simple_wooden_charm',
    ]);

    expect(modifiers.map((modifier) => modifier.id)).toEqual([
      'rusty_sword_p_atk',
      'simple_wooden_charm_healing_potency',
    ]);
  });

  it('should ignore non-equipment item ids when collecting modifiers', () => {
    const modifiers = collectEquipmentStatModifiers([
      'slime_gel',
      'minor_hp_potion',
    ]);

    expect(modifiers).toEqual([]);
  });

  it('should report whether equipped items provide modifiers', () => {
    expect(hasEquipmentStatModifiers(['rusty_sword'])).toBe(true);
    expect(hasEquipmentStatModifiers(['slime_gel'])).toBe(false);
  });

  it('should return cloned modifiers instead of shared references', () => {
    const first = collectEquipmentStatModifiers(['rusty_sword']);
    const second = collectEquipmentStatModifiers(['rusty_sword']);

    expect(first).toEqual(second);
    expect(first[0]).not.toBe(second[0]);
  });
});
