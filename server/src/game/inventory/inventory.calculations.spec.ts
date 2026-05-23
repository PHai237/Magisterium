import {
  addItemQuantityToInventory,
  addItemStacksToInventory,
  buildInventoryStacks,
  countInventoryItem,
  expandInventoryStacks,
  hasInventoryItem,
  normalizeInventoryQuantity,
  removeItemQuantityFromInventory,
} from './inventory.calculations';

import type { ItemId } from '../character/character.types';

describe('inventory calculations', () => {
  it('should normalize inventory quantity', () => {
    expect(normalizeInventoryQuantity(2.9)).toBe(2);
    expect(normalizeInventoryQuantity(0)).toBe(0);
    expect(normalizeInventoryQuantity(-5)).toBe(0);
    expect(normalizeInventoryQuantity(Number.NaN)).toBe(0);
    expect(normalizeInventoryQuantity(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('should count items in an inventory id list', () => {
    const inventory: ItemId[] = ['slime_gel', 'minor_hp_potion', 'slime_gel'];

    expect(countInventoryItem(inventory, 'slime_gel')).toBe(2);
    expect(countInventoryItem(inventory, 'minor_hp_potion')).toBe(1);
    expect(countInventoryItem(inventory, 'goblin_ear')).toBe(0);
  });

  it('should check whether inventory has enough quantity', () => {
    const inventory: ItemId[] = ['slime_gel', 'slime_gel'];

    expect(hasInventoryItem(inventory, 'slime_gel', 2)).toBe(true);
    expect(hasInventoryItem(inventory, 'slime_gel', 3)).toBe(false);
    expect(hasInventoryItem(inventory, 'slime_gel', 0)).toBe(true);
  });

  it('should build inventory stacks while preserving first-seen order', () => {
    const inventory: ItemId[] = [
      'slime_gel',
      'minor_hp_potion',
      'slime_gel',
      'goblin_ear',
      'minor_hp_potion',
    ];

    expect(buildInventoryStacks(inventory)).toEqual([
      {
        itemId: 'slime_gel',
        quantity: 2,
      },
      {
        itemId: 'minor_hp_potion',
        quantity: 2,
      },
      {
        itemId: 'goblin_ear',
        quantity: 1,
      },
    ]);
  });

  it('should expand inventory stacks into raw item ids', () => {
    expect(
      expandInventoryStacks([
        {
          itemId: 'slime_gel',
          quantity: 2,
        },
        {
          itemId: 'goblin_ear',
          quantity: 1,
        },
      ]),
    ).toEqual(['slime_gel', 'slime_gel', 'goblin_ear']);
  });

  it('should add stackable item quantity to inventory', () => {
    const result = addItemQuantityToInventory(['slime_gel'], 'slime_gel', 2);

    expect(result).toEqual({
      itemId: 'slime_gel',
      previousQuantity: 1,
      nextQuantity: 3,
      quantityChanged: 2,
      inventoryItemIds: ['slime_gel', 'slime_gel', 'slime_gel'],
    });
  });

  it('should reject adding multiple copies of a non-stackable item in one operation', () => {
    expect(() => addItemQuantityToInventory([], 'rusty_sword', 2)).toThrow(
      'Non-stackable item rusty_sword cannot be added with quantity 2.',
    );
  });

  it('should add multiple item stacks to inventory', () => {
    const result = addItemStacksToInventory(
      ['slime_gel'],
      [
        {
          itemId: 'slime_gel',
          quantity: 2,
        },
        {
          itemId: 'goblin_ear',
          quantity: 1,
        },
      ],
    );

    expect(result).toEqual([
      'slime_gel',
      'slime_gel',
      'slime_gel',
      'goblin_ear',
    ]);
  });

  it('should remove item quantity from inventory', () => {
    const result = removeItemQuantityFromInventory(
      ['slime_gel', 'minor_hp_potion', 'slime_gel'],
      'slime_gel',
      1,
    );

    expect(result).toEqual({
      itemId: 'slime_gel',
      previousQuantity: 2,
      nextQuantity: 1,
      quantityChanged: -1,
      inventoryItemIds: ['minor_hp_potion', 'slime_gel'],
    });
  });

  it('should reject removing more items than available', () => {
    expect(() =>
      removeItemQuantityFromInventory(['slime_gel'], 'slime_gel', 2),
    ).toThrow(
      'Not enough item slime_gel in inventory. Required 2, available 1.',
    );
  });

  it('should reject unknown item definitions', () => {
    expect(() => addItemQuantityToInventory([], 'missing_item', 1)).toThrow(
      'Item definition not found: missing_item',
    );

    expect(() =>
      removeItemQuantityFromInventory([], 'missing_item', 1),
    ).toThrow('Item definition not found: missing_item');
  });
});
