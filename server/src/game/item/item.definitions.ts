import type { ItemDefinition, ItemUseEffect } from './item.types';

import type { StatModifier } from '../passive/passive.types';

function freezeItemUseEffect(effect: ItemUseEffect): Readonly<ItemUseEffect> {
  return Object.freeze({
    ...effect,
  });
}

function freezeStatModifier(modifier: StatModifier): Readonly<StatModifier> {
  return Object.freeze({
    ...modifier,
    valueSource: modifier.valueSource
      ? {
          ...modifier.valueSource,
        }
      : undefined,
  });
}

function freezeItemDefinition(item: ItemDefinition): Readonly<ItemDefinition> {
  return Object.freeze({
    ...item,

    ...(item.equipment
      ? {
          equipment: Object.freeze({
            ...item.equipment,
            modifiers: Object.freeze(
              item.equipment.modifiers.map((modifier) =>
                freezeStatModifier(modifier),
              ),
            ),
          }),
        }
      : {}),

    ...(item.consumable
      ? {
          consumable: Object.freeze({
            ...item.consumable,
            effects: Object.freeze(
              item.consumable.effects.map((effect) =>
                freezeItemUseEffect(effect),
              ),
            ),
          }),
        }
      : {}),

    tags: Object.freeze([...item.tags]),
  });
}

const RAW_ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  {
    id: 'old_wooden_staff',
    name: 'Old Wooden Staff',
    description:
      'A worn training staff used by novice spellcasters. Weak as a weapon, but useful for channeling simple magic.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 3,
    equipment: {
      slot: 'weapon',
      modifiers: [
        {
          id: 'old_wooden_staff_m_atk',
          target: 'mAtk',
          operation: 'add',
          valueType: 'flat',
          value: 2,
          priority: 10,
          sourceId: 'old_wooden_staff',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['starter', 'weapon', 'staff', 'magic'],
  },
  {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    description:
      'A cheap iron sword with a dull edge. Not impressive, but better than bare hands.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 3,
    equipment: {
      slot: 'weapon',
      modifiers: [
        {
          id: 'rusty_sword_p_atk',
          target: 'pAtk',
          operation: 'add',
          valueType: 'flat',
          value: 2,
          priority: 10,
          sourceId: 'rusty_sword',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['starter', 'weapon', 'sword', 'physical'],
  },
  {
    id: 'worn_travelers_knife',
    name: "Worn Traveler's Knife",
    description:
      'A small utility blade carried by wanderers. Balanced enough for basic survival and emergency combat.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 2,
    equipment: {
      slot: 'weapon',
      modifiers: [
        {
          id: 'worn_travelers_knife_p_atk',
          target: 'pAtk',
          operation: 'add',
          valueType: 'flat',
          value: 1,
          priority: 10,
          sourceId: 'worn_travelers_knife',
          sourceType: 'equipment',
        },
        {
          id: 'worn_travelers_knife_accuracy',
          target: 'accuracy',
          operation: 'add',
          valueType: 'flat',
          value: 1,
          priority: 10,
          sourceId: 'worn_travelers_knife',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['starter', 'weapon', 'knife', 'balanced'],
  },
  {
    id: 'small_dagger',
    name: 'Small Dagger',
    description:
      'A light dagger suitable for quick hands and close-range opportunistic strikes.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 2,
    equipment: {
      slot: 'weapon',
      modifiers: [
        {
          id: 'small_dagger_p_atk',
          target: 'pAtk',
          operation: 'add',
          valueType: 'flat',
          value: 1,
          priority: 10,
          sourceId: 'small_dagger',
          sourceType: 'equipment',
        },
        {
          id: 'small_dagger_evasion',
          target: 'evasionRate',
          operation: 'add',
          valueType: 'flat',
          value: 1,
          priority: 10,
          sourceId: 'small_dagger',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['starter', 'weapon', 'dagger', 'dexterity'],
  },
  {
    id: 'training_greatsword',
    name: 'Training Greatsword',
    description:
      'A heavy two-handed practice blade. It hits harder than a simple sword, but requires both hands.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 6,
    equipment: {
      slot: 'weapon',
      twoHanded: true,
      modifiers: [
        {
          id: 'training_greatsword_p_atk',
          target: 'pAtk',
          operation: 'add',
          valueType: 'flat',
          value: 4,
          priority: 10,
          sourceId: 'training_greatsword',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['weapon', 'greatsword', 'two_handed', 'strength'],
  },
  {
    id: 'worn_wooden_shield',
    name: 'Worn Wooden Shield',
    description:
      'A battered wooden shield. It offers modest protection, but occupies the off hand.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 3,
    equipment: {
      slot: 'off_hand',
      modifiers: [
        {
          id: 'worn_wooden_shield_p_def',
          target: 'pDef',
          operation: 'add',
          valueType: 'flat',
          value: 2,
          priority: 10,
          sourceId: 'worn_wooden_shield',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['shield', 'off_hand', 'defense'],
  },
  {
    id: 'simple_wooden_charm',
    name: 'Simple Wooden Charm',
    description:
      'A plain charm used by novice acolytes to focus their breathing and spiritual discipline.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 2,
    equipment: {
      slot: 'accessory',
      modifiers: [
        {
          id: 'simple_wooden_charm_healing_potency',
          target: 'healingPotency',
          operation: 'add',
          valueType: 'flat',
          value: 2,
          priority: 10,
          sourceId: 'simple_wooden_charm',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['starter', 'accessory', 'support', 'wisdom'],
  },
  {
    id: 'stamina_bread',
    name: 'Stamina Bread',
    description:
      'Dense travel bread that restores a small amount of stamina during battle or exploration.',
    category: 'consumable',
    rarity: 'common',
    stackable: true,
    maxStackSize: 20,
    sellPriceBronze: 1,
    consumable: {
      targetType: 'self',
      consumesOnUse: true,
      usableInBattle: true,
      usableOutOfBattle: true,
      effects: [
        {
          type: 'restore_resource',
          resourceType: 'Stamina',
          amount: 25,
        },
      ],
    },
    tags: ['starter', 'consumable', 'food', 'stamina'],
  },
  {
    id: 'minor_hp_potion',
    name: 'Minor HP Potion',
    description: 'A weak red potion that restores a small amount of HP.',
    category: 'consumable',
    rarity: 'common',
    stackable: true,
    maxStackSize: 20,
    sellPriceBronze: 2,
    consumable: {
      targetType: 'self',
      consumesOnUse: true,
      usableInBattle: true,
      usableOutOfBattle: true,
      effects: [
        {
          type: 'restore_resource',
          resourceType: 'HP',
          amount: 30,
        },
      ],
    },
    tags: ['starter', 'consumable', 'potion', 'hp'],
  },
  {
    id: 'minor_mp_potion',
    name: 'Minor MP Potion',
    description: 'A weak blue potion that restores a small amount of MP.',
    category: 'consumable',
    rarity: 'common',
    stackable: true,
    maxStackSize: 20,
    sellPriceBronze: 2,
    consumable: {
      targetType: 'self',
      consumesOnUse: true,
      usableInBattle: true,
      usableOutOfBattle: true,
      effects: [
        {
          type: 'restore_resource',
          resourceType: 'MP',
          amount: 20,
        },
      ],
    },
    tags: ['starter', 'consumable', 'potion', 'mp'],
  },
  {
    id: 'one_night_inn_voucher',
    name: 'One-Night Inn Pass',
    description:
      'A single-use pass for one safe night at a basic inn. Intended for full recovery outside battle.',
    category: 'voucher',
    rarity: 'common',
    stackable: true,
    maxStackSize: 10,
    sellPriceBronze: 0,
    consumable: {
      targetType: 'self',
      consumesOnUse: true,
      usableInBattle: false,
      usableOutOfBattle: true,
      effects: [
        {
          type: 'rest',
          hpPercent: 1,
          mpPercent: 1,
          staminaPercent: 1,
          fatigueRecovery: 1,
        },
      ],
    },
    tags: ['starter', 'pass', 'rest', 'inn'],
  },
  {
    id: 'fresh_potato',
    name: 'Fresh Potato',
    description:
      'A sturdy farm potato. A basic starch for early cooking recipes.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['market', 'farmer', 'ingredient', 'cooking', 'vegetable'],
  },
  {
    id: 'plump_wheat',
    name: 'Plump Wheat',
    description:
      'Clean bundled wheat that can be milled into flour for bread and travel rations.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['market', 'farmer', 'ingredient', 'cooking', 'grain'],
  },
  {
    id: 'gathered_egg',
    name: 'Gathered Egg',
    description:
      'A fresh egg gathered from local farms. Useful for richer cooking recipes.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 30,
    sellPriceBronze: 2,
    tags: ['market', 'farmer', 'ingredient', 'cooking'],
  },
  {
    id: 'moon_turnip',
    name: 'Moon Turnip',
    description:
      'A rare pale turnip said to sweeten when harvested under moonlight.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 10,
    sellPriceBronze: 12,
    tags: ['market', 'farmer', 'rare', 'ingredient', 'cooking', 'alchemy'],
  },
  {
    id: 'green_herb',
    name: 'Green Herb',
    description:
      'A common medicinal herb used as the base for simple restorative mixtures.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['market', 'herbalist', 'ingredient', 'alchemy', 'herb'],
  },
  {
    id: 'clear_glass_vial',
    name: 'Clear Glass Vial',
    description:
      'A small clean vial suitable for bottling weak potions and extracts.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 50,
    sellPriceBronze: 1,
    tags: ['market', 'general_goods', 'ingredient', 'alchemy', 'container'],
  },
  {
    id: 'basic_solvent',
    name: 'Basic Solvent',
    description:
      'A low-grade alchemical solvent used to draw active properties from herbs.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 50,
    sellPriceBronze: 2,
    tags: ['market', 'herbalist', 'ingredient', 'alchemy'],
  },
  {
    id: 'cooking_salt',
    name: 'Cooking Salt',
    description:
      'Plain cooking salt. Simple, cheap, and required for many basic meals.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['market', 'general_goods', 'ingredient', 'cooking', 'seasoning'],
  },
  {
    id: 'pressed_seed_oil',
    name: 'Pressed Seed Oil',
    description:
      'A small flask of cooking oil pressed from local seed crops.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 50,
    sellPriceBronze: 2,
    tags: ['market', 'general_goods', 'ingredient', 'cooking'],
  },
  {
    id: 'slime_gel',
    name: 'Slime Gel',
    description:
      'Sticky residue from a slime. Mostly used as a low-grade crafting material.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['loot', 'material', 'slime'],
  },
  {
    id: 'boar_meat',
    name: 'Boar Meat',
    description:
      'A fresh cut of meat from a wild boar. Commonly used for cooking, rations, and early provisioning.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['loot', 'material', 'beast', 'boar', 'meat', 'cooking'],
  },
  {
    id: 'wolf_skin',
    name: "Wolf's Skin",
    description:
      'A rough pelt taken from a wild wolf. Useful for basic leatherwork and early crafting.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'beast', 'wolf', 'skin', 'leather'],
  },
  {
    id: 'goblin_ear',
    name: 'Goblin Ear',
    description:
      'A crude proof of defeating a goblin. Often accepted by guild clerks for basic bounties.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['loot', 'material', 'goblin', 'bounty'],
  },
  {
    id: 'cracked_dagger',
    name: 'Cracked Dagger',
    description: 'A damaged goblin dagger. Still usable, but unreliable.',
    category: 'equipment',
    rarity: 'common',
    stackable: false,
    maxStackSize: 1,
    sellPriceBronze: 4,
    equipment: {
      slot: 'weapon',
      modifiers: [
        {
          id: 'cracked_dagger_p_atk',
          target: 'pAtk',
          operation: 'add',
          valueType: 'flat',
          value: 2,
          priority: 10,
          sourceId: 'cracked_dagger',
          sourceType: 'equipment',
        },
      ],
    },
    tags: ['loot', 'weapon', 'dagger', 'goblin'],
  },
];

export const ITEM_DEFINITIONS = Object.freeze(
  RAW_ITEM_DEFINITIONS.map((item) => freezeItemDefinition(item)),
) satisfies readonly Readonly<ItemDefinition>[];
