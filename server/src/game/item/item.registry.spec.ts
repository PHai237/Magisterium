import {
  assertItemDefinitionExists,
  cloneItemDefinition,
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
      MONSTER_DEFINITIONS.flatMap((monster) => [
        ...monster.reward.lootTable.map((entry) => entry.itemId),
        ...(monster.reward.randomLootPools ?? []).flatMap((pool) =>
          pool.entries.map((entry) => entry.itemId),
        ),
      ]),
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
    expect(clonedPotion).toEqual(rawPotion);
  });

  it('should deep clone equipment modifiers and nested value sources', () => {
    const itemWithModifierValueSource = cloneItemDefinition({
      id: 'test_value_source_item',
      name: 'Test Value Source Item',
      description: 'Test item with nested modifier value source.',
      category: 'equipment',
      rarity: 'common',
      stackable: false,
      maxStackSize: 1,
      sellPriceBronze: 0,
      equipment: {
        slot: 'accessory',
        modifiers: [
          {
            id: 'test_modifier',
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
            sourceId: 'test_value_source_item',
            sourceType: 'equipment',
          },
        ],
      },
      tags: ['test', 'clone'],
    });

    const clonedAgain = cloneItemDefinition(itemWithModifierValueSource);

    expect(clonedAgain).toEqual(itemWithModifierValueSource);

    expect(clonedAgain).not.toBe(itemWithModifierValueSource);
    expect(clonedAgain.tags).not.toBe(itemWithModifierValueSource.tags);

    expect(clonedAgain.equipment).not.toBe(
      itemWithModifierValueSource.equipment,
    );

    expect(clonedAgain.equipment?.modifiers).not.toBe(
      itemWithModifierValueSource.equipment?.modifiers,
    );

    expect(clonedAgain.equipment?.modifiers[0]).not.toBe(
      itemWithModifierValueSource.equipment?.modifiers[0],
    );

    expect(clonedAgain.equipment?.modifiers[0].valueSource).not.toBe(
      itemWithModifierValueSource.equipment?.modifiers[0].valueSource,
    );
  });

  it('should deep clone consumable effects', () => {
    const rawVoucher = ITEM_DEFINITIONS.find(
      (item) => item.id === 'one_night_inn_voucher',
    );

    const clonedVoucher = getItemDefinitionById('one_night_inn_voucher');

    expect(rawVoucher).toBeDefined();

    expect(clonedVoucher).not.toBe(rawVoucher);
    expect(clonedVoucher.consumable).not.toBe(rawVoucher?.consumable);
    expect(clonedVoucher.consumable?.effects).not.toBe(
      rawVoucher?.consumable?.effects,
    );
    expect(clonedVoucher.consumable?.effects[0]).not.toBe(
      rawVoucher?.consumable?.effects[0],
    );
    expect(clonedVoucher).toEqual(rawVoucher);
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

  it('should classify item categories by capability', () => {
    expect(isEquipmentItem('rusty_sword')).toBe(true);
    expect(isConsumableItem('minor_hp_potion')).toBe(true);
    expect(isConsumableItem('one_night_inn_voucher')).toBe(true);
    expect(isStackableItem('slime_gel')).toBe(true);
    expect(isStackableItem('rusty_sword')).toBe(false);
  });

  it('should treat inn pass as voucher category with consumable capability', () => {
    const voucher = getItemDefinitionById('one_night_inn_voucher');

    expect(voucher.category).toBe('voucher');
    expect(voucher.consumable).toBeDefined();
    expect(voucher.consumable?.usableInBattle).toBe(false);
    expect(voucher.consumable?.usableOutOfBattle).toBe(true);
    expect(isConsumableItem('one_night_inn_voucher')).toBe(true);
  });

  it('should define unique item ids', () => {
    const itemIds = ITEM_DEFINITIONS.map((item) => item.id);
    const uniqueItemIds = new Set(itemIds);

    expect(uniqueItemIds.size).toBe(itemIds.length);
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
