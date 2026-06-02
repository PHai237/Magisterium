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
    id: 'one_night_inn_pass',
    name: 'One-Night Inn Pass',
    description:
      'A single-use pass for one safe night at a basic inn. Intended for full recovery outside battle.',
    category: 'pass',
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
    description: 'A small flask of cooking oil pressed from local seed crops.',
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
    id: 'wolf_pelt',
    name: 'Wolf Pelt',
    description:
      'A rough pelt taken from a wild wolf. Useful for basic leatherwork and early crafting.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'beast', 'wolf', 'pelt', 'leather'],
  },
  {
    id: 'slime_core',
    name: 'Slime Core',
    description:
      'A translucent core sometimes found inside stable slimes. Useful for basic alchemy and flexible craft bindings.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 4,
    tags: ['loot', 'material', 'slime', 'core', 'alchemy', 'crafting'],
  },
  {
    id: 'slime_membrane',
    name: 'Slime Membrane',
    description:
      'A thin stretchable membrane harvested from gelatinous creatures. Useful for wraps, grips, and early reagent work.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['loot', 'material', 'slime', 'membrane', 'crafting'],
  },
  {
    id: 'boar_tusk',
    name: 'Boar Tusk',
    description:
      'A hard tusk from a wild boar. It can be shaped into crude fittings, points, and reinforced tool parts.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'beast', 'boar', 'bone', 'crafting'],
  },
  {
    id: 'tough_hide',
    name: 'Tough Hide',
    description:
      'A sturdy piece of animal hide suitable for early leather armor, straps, and rugged padding.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'beast', 'hide', 'leather', 'crafting'],
  },
  {
    id: 'wolf_fang',
    name: 'Wolf Fang',
    description:
      'A sharp fang from a wild wolf. Useful for small blades, charms, and predatory craft components.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'beast', 'wolf', 'fang', 'crafting'],
  },
  {
    id: 'goblin_ear',
    name: 'Goblin Ear',
    description:
      'A crude proof of defeating a goblin. Often accepted by guild clerks for basic bounties.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['loot', 'material', 'goblin', 'bounty'],
  },
  {
    id: 'goblin_scrap',
    name: 'Goblin Scrap',
    description:
      'Bent bits of scavenged metal and junk from goblin gear. Useful for crude repairs and early smithing.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['loot', 'material', 'goblin', 'metal', 'crafting'],
  },
  {
    id: 'spider_silk',
    name: 'Spider Silk',
    description:
      'Sticky but resilient silk harvested from forest spiders. Useful for thread, wraps, bindings, and early tailoring.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['loot', 'material', 'spider', 'silk', 'thread', 'crafting'],
  },
  {
    id: 'spider_eye',
    name: 'Spider Eye',
    description:
      'A glossy eye from a forest spider. Useful for perception charms, reagents, and unsettling alchemy work.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'spider', 'eye', 'alchemy'],
  },
  {
    id: 'venom_sac',
    name: 'Venom Sac',
    description:
      'A small sac of weak spider venom. Useful for poison reagents, antidote practice, and early alchemy recipes.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 4,
    tags: ['loot', 'material', 'spider', 'venom', 'alchemy'],
  },
  {
    id: 'cracked_blade',
    name: 'Cracked Blade',
    description:
      'A broken blade segment. Too damaged to wield, but still useful as a smithing component.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 3,
    tags: ['loot', 'material', 'metal', 'blade', 'smithing', 'crafting'],
  },
  {
    id: 'coal',
    name: 'Coal',
    description:
      'Plain fuel for a forge. Essential for smelting, heating, and basic metalwork.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['material', 'fuel', 'forge', 'smithing'],
  },
  {
    id: 'copper_nugget',
    name: 'Copper Nugget',
    description:
      'A small nugget of copper ore. Useful for early fittings, rivets, and simple metal goods.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 2,
    tags: ['material', 'metal', 'copper', 'smithing', 'crafting'],
  },
  {
    id: 'rough_wood',
    name: 'Rough Wood',
    description:
      'Unfinished common wood suitable for handles, frames, and basic crafting placeholders.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['material', 'wood', 'carpentry', 'crafting'],
  },
  {
    id: 'rough_stone',
    name: 'Rough Stone',
    description:
      'A plain rough stone used for sharpening cracked blades, crude molds, and reinforcing early shields.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 1,
    tags: ['material', 'stone', 'mold', 'sharpening', 'crafting'],
  },
  {
    id: 'str_fragment',
    name: 'STR Fragment',
    description:
      'A small shard of physical potential. Ten STR Fragments can be refined into one STR Rune at The Sanctuary.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 500,
    sellPriceBronze: 1,
    tags: ['fragment', 'rune-material', 'stat', 'str', 'sanctuary'],
  },
  {
    id: 'dex_fragment',
    name: 'DEX Fragment',
    description:
      'A small shard of dexterous potential. Ten DEX Fragments can be refined into one DEX Rune at The Sanctuary.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 500,
    sellPriceBronze: 1,
    tags: ['fragment', 'rune-material', 'stat', 'dex', 'sanctuary'],
  },
  {
    id: 'con_fragment',
    name: 'CON Fragment',
    description:
      'A small shard of enduring potential. Ten CON Fragments can be refined into one CON Rune at The Sanctuary.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 500,
    sellPriceBronze: 1,
    tags: ['fragment', 'rune-material', 'stat', 'con', 'sanctuary'],
  },
  {
    id: 'int_fragment',
    name: 'INT Fragment',
    description:
      'A small shard of intellectual potential. Ten INT Fragments can be refined into one INT Rune at The Sanctuary.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 500,
    sellPriceBronze: 1,
    tags: ['fragment', 'rune-material', 'stat', 'int', 'sanctuary'],
  },
  {
    id: 'wis_fragment',
    name: 'WIS Fragment',
    description:
      'A small shard of spiritual potential. Ten WIS Fragments can be refined into one WIS Rune at The Sanctuary.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 500,
    sellPriceBronze: 1,
    tags: ['fragment', 'rune-material', 'stat', 'wis', 'sanctuary'],
  },
  {
    id: 'luk_fragment',
    name: 'LUK Fragment',
    description:
      'A small shard of fortunate potential. Ten LUK Fragments can be refined into one LUK Rune at The Sanctuary.',
    category: 'material',
    rarity: 'common',
    stackable: true,
    maxStackSize: 500,
    sellPriceBronze: 1,
    tags: ['fragment', 'rune-material', 'stat', 'luk', 'sanctuary'],
  },
  {
    id: 'str_rune',
    name: 'STR Rune',
    description:
      'A condensed rune of physical force. It can be imbued at The Sanctuary to permanently increase STR by 1.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 12,
    tags: ['rune', 'stat', 'str', 'sanctuary'],
  },
  {
    id: 'dex_rune',
    name: 'DEX Rune',
    description:
      'A condensed rune of dexterous flow. It can be imbued at The Sanctuary to permanently increase DEX by 1.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 12,
    tags: ['rune', 'stat', 'dex', 'sanctuary'],
  },
  {
    id: 'con_rune',
    name: 'CON Rune',
    description:
      'A condensed rune of endurance. It can be imbued at The Sanctuary to permanently increase CON by 1.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 12,
    tags: ['rune', 'stat', 'con', 'sanctuary'],
  },
  {
    id: 'int_rune',
    name: 'INT Rune',
    description:
      'A condensed rune of intellect. It can be imbued at The Sanctuary to permanently increase INT by 1.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 12,
    tags: ['rune', 'stat', 'int', 'sanctuary'],
  },
  {
    id: 'wis_rune',
    name: 'WIS Rune',
    description:
      'A condensed rune of spiritual clarity. It can be imbued at The Sanctuary to permanently increase WIS by 1.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 12,
    tags: ['rune', 'stat', 'wis', 'sanctuary'],
  },
  {
    id: 'luk_rune',
    name: 'LUK Rune',
    description:
      'A condensed rune of fortune. It can be imbued at The Sanctuary to permanently increase LUK by 1.',
    category: 'material',
    rarity: 'uncommon',
    stackable: true,
    maxStackSize: 99,
    sellPriceBronze: 12,
    tags: ['rune', 'stat', 'luk', 'sanctuary'],
  },
];

export const ITEM_DEFINITIONS = Object.freeze(
  RAW_ITEM_DEFINITIONS.map((item) => freezeItemDefinition(item)),
) satisfies readonly Readonly<ItemDefinition>[];
