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
    expect(getEquipmentSlotForItem('worn_wooden_shield')).toBe('off_hand');
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

  it('should find same-slot equipment conflicts', () => {
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

  it('should find off-hand conflict when equipping a two-handed weapon', () => {
    const conflicts = findEquipmentSlotConflicts(
      ['rusty_sword', 'worn_wooden_shield', 'simple_wooden_charm'],
      'training_greatsword',
    );

    expect(conflicts).toEqual([
      {
        itemId: 'rusty_sword',
        slot: 'weapon',
      },
      {
        itemId: 'worn_wooden_shield',
        slot: 'off_hand',
      },
    ]);
  });

  it('should find two-handed weapon conflict when equipping an off-hand item', () => {
    const conflicts = findEquipmentSlotConflicts(
      ['training_greatsword', 'simple_wooden_charm'],
      'worn_wooden_shield',
    );

    expect(conflicts).toEqual([
      {
        itemId: 'training_greatsword',
        slot: 'weapon',
      },
    ]);
  });

  it('should not treat one-handed weapon and off-hand item as conflicting', () => {
    const conflicts = findEquipmentSlotConflicts(
      ['rusty_sword', 'simple_wooden_charm'],
      'worn_wooden_shield',
    );

    expect(conflicts).toEqual([]);
  });

  it('should equip an item and remove conflicting same-slot items', () => {
    const result = equipItem(
      ['rusty_sword', 'simple_wooden_charm'],
      'small_dagger',
    );

    expect(result).toEqual({
      equippedItemIds: ['simple_wooden_charm', 'small_dagger'],
      removedItemIds: ['rusty_sword'],
    });
  });

  it('should equip a two-handed weapon and remove weapon plus off-hand conflicts', () => {
    const result = equipItem(
      ['rusty_sword', 'worn_wooden_shield', 'simple_wooden_charm'],
      'training_greatsword',
    );

    expect(result).toEqual({
      equippedItemIds: ['simple_wooden_charm', 'training_greatsword'],
      removedItemIds: ['rusty_sword', 'worn_wooden_shield'],
    });
  });

  it('should equip an off-hand item and remove an equipped two-handed weapon', () => {
    const result = equipItem(
      ['training_greatsword', 'simple_wooden_charm'],
      'worn_wooden_shield',
    );

    expect(result).toEqual({
      equippedItemIds: ['simple_wooden_charm', 'worn_wooden_shield'],
      removedItemIds: ['training_greatsword'],
    });
  });

  it('should allow one-handed weapon and off-hand item together', () => {
    const result = equipItem(['rusty_sword'], 'worn_wooden_shield');

    expect(result).toEqual({
      equippedItemIds: ['rusty_sword', 'worn_wooden_shield'],
      removedItemIds: [],
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
