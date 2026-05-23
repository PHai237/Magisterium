import {
  assertItemIsEquipment,
  equipItem,
  findEquipmentSlotConflicts,
  getEquipmentSlotForItem,
  isItemEquipped,
  unequipItem,
} from './equipment.calculations';

describe('equipment calculations', () => {
  it('should return the equipment slot for an equipment item', () => {
    expect(getEquipmentSlotForItem('rusty_sword')).toBe('weapon');
    expect(getEquipmentSlotForItem('simple_wooden_charm')).toBe('accessory');
  });

  it('should reject non-equipment items', () => {
    expect(() => getEquipmentSlotForItem('minor_hp_potion')).toThrow(
      'Item minor_hp_potion is not equipment.',
    );

    expect(() => assertItemIsEquipment('slime_gel')).toThrow(
      'Item slime_gel is not equipment.',
    );
  });

  it('should detect whether an item is equipped', () => {
    expect(isItemEquipped(['rusty_sword'], 'rusty_sword')).toBe(true);
    expect(isItemEquipped(['rusty_sword'], 'small_dagger')).toBe(false);
  });

  it('should find equipment slot conflicts', () => {
    const conflicts = findEquipmentSlotConflicts(
      ['rusty_sword', 'simple_wooden_charm'],
      'small_dagger',
    );

    expect(conflicts).toEqual([
      {
        itemId: 'rusty_sword',
        slot: 'weapon',
      },
    ]);
  });

  it('should equip an item and remove conflicting slot items', () => {
    const result = equipItem(
      ['rusty_sword', 'simple_wooden_charm'],
      'small_dagger',
    );

    expect(result).toEqual({
      equippedItemIds: ['simple_wooden_charm', 'small_dagger'],
      removedItemIds: ['rusty_sword'],
    });
  });

  it('should not duplicate an already equipped item', () => {
    const result = equipItem(['rusty_sword'], 'rusty_sword');

    expect(result).toEqual({
      equippedItemIds: ['rusty_sword'],
      removedItemIds: [],
    });
  });

  it('should unequip an equipped item', () => {
    const result = unequipItem(
      ['rusty_sword', 'simple_wooden_charm'],
      'rusty_sword',
    );

    expect(result).toEqual({
      equippedItemIds: ['simple_wooden_charm'],
      removedItemIds: ['rusty_sword'],
    });
  });

  it('should do nothing when unequipping an item that is not equipped', () => {
    const result = unequipItem(['rusty_sword'], 'small_dagger');

    expect(result).toEqual({
      equippedItemIds: ['rusty_sword'],
      removedItemIds: [],
    });
  });
});
