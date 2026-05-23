import {
  assertItemDefinitionExists,
  getItemDefinitionById,
  getItemDefinitionsByIds,
  hasItemDefinition,
  isConsumableItem,
  isEquipmentItem,
  isStackableItem,
} from './item.registry';

import { ITEM_DEFINITIONS } from './item.definitions';

import {
  ORIGIN_DEFINITIONS,
  STARTER_KIT_DEFINITIONS,
} from '../character/character.constants';

import { MONSTER_DEFINITIONS } from '../monster/monster.definitions';

import type { ItemId } from '../character/character.types';

function collectStarterItemIds(): ItemId[] {
  return Array.from(
    new Set([
      ...STARTER_KIT_DEFINITIONS.flatMap((kit) => kit.startingItemIds),
      ...ORIGIN_DEFINITIONS.flatMap((origin) => origin.startingItemIds),
    ]),
  );
}

function collectMonsterLootItemIds(): ItemId[] {
  return Array.from(
    new Set(
      MONSTER_DEFINITIONS.flatMap((monster) =>
        monster.reward.lootTable.map((entry) => entry.itemId),
      ),
    ),
  );
}

describe('item registry', () => {
  it('should return an item definition by id', () => {
    const potion = getItemDefinitionById('minor_hp_potion');

    expect(potion.id).toBe('minor_hp_potion');
    expect(potion.category).toBe('consumable');
    expect(potion.consumable?.effects).toEqual([
      {
        type: 'restore_resource',
        resourceType: 'HP',
        amount: 30,
      },
    ]);
  });

  it('should clone item definitions instead of returning shared references', () => {
    const rawPotion = ITEM_DEFINITIONS.find(
      (item) => item.id === 'minor_hp_potion',
    );

    const clonedPotion = getItemDefinitionById('minor_hp_potion');

    expect(rawPotion).toBeDefined();
    expect(clonedPotion).not.toBe(rawPotion);
    expect(clonedPotion.tags).not.toBe(rawPotion?.tags);
    expect(clonedPotion.consumable).not.toBe(rawPotion?.consumable);
    expect(clonedPotion.consumable?.effects).not.toBe(
      rawPotion?.consumable?.effects,
    );
  });

  it('should return multiple item definitions by ids', () => {
    const items = getItemDefinitionsByIds([
      'minor_hp_potion',
      'minor_mp_potion',
      'stamina_bread',
    ]);

    expect(items.map((item) => item.id)).toEqual([
      'minor_hp_potion',
      'minor_mp_potion',
      'stamina_bread',
    ]);
  });

  it('should report whether item definitions exist', () => {
    expect(hasItemDefinition('slime_gel')).toBe(true);
    expect(hasItemDefinition('missing_item')).toBe(false);

    expect(() => assertItemDefinitionExists('goblin_ear')).not.toThrow();

    expect(() => assertItemDefinitionExists('missing_item')).toThrow(
      'Item definition not found: missing_item',
    );
  });

  it('should classify item categories', () => {
    expect(isEquipmentItem('rusty_sword')).toBe(true);
    expect(isConsumableItem('minor_hp_potion')).toBe(true);
    expect(isStackableItem('slime_gel')).toBe(true);
    expect(isStackableItem('rusty_sword')).toBe(false);
  });

  it('should define every starter item used by origins and starter kits', () => {
    const starterItemIds = collectStarterItemIds();

    expect(starterItemIds.length).toBeGreaterThan(0);

    for (const itemId of starterItemIds) {
      expect(hasItemDefinition(itemId)).toBe(true);
    }
  });

  it('should define every item used by monster loot tables', () => {
    const lootItemIds = collectMonsterLootItemIds();

    expect(lootItemIds.length).toBeGreaterThan(0);

    for (const itemId of lootItemIds) {
      expect(hasItemDefinition(itemId)).toBe(true);
    }
  });
});
