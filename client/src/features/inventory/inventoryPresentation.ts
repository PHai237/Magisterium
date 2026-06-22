import type {
  ConsumableEffectApplication,
  InventoryItemStack,
  ItemId,
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
export type InventoryFilter =
  | "all"
  | "weapon"
  | "armor"
  | "consumable"
  | "material";

export type InventoryMobilePanel = "character" | "bag";

export type ItemDisplayCategory =
  | "equipment"
  | "consumable"
  | "material"
  | "pass"
  | "unknown";

export type EquipmentSlot =
  | "weapon"
  | "off_hand"
  | "helmet"
  | "armor"
  | "legging"
  | "boots"
  | "accessory";

export const ONE_NIGHT_INN_PASS_ITEM_IDS = new Set<ItemId>([
  "one_night_inn_pass",
]);

export interface ItemDisplayDefinition {
  id: ItemId;
  name: string;
  icon: string;
  category: ItemDisplayCategory;
  description: string;
  equipmentSlot?: EquipmentSlot;
}

export interface EquipmentSlotView {
  id: string;
  label: string;
  icon: string;
  className: string;
  slot?: EquipmentSlot;
}

export const EQUIPMENT_SLOTS: EquipmentSlotView[] = [
  {
    id: "helmet",
    label: "Helmet",
    icon: "👑",
    className: "slot-helmet",
    slot: "helmet",
  },
  {
    id: "hand",
    label: "Hand",
    icon: "⚔️",
    className: "slot-hand",
    slot: "weapon",
  },
  {
    id: "offhand",
    label: "Off-hand",
    icon: "🛡️",
    className: "slot-offhand",
    slot: "off_hand",
  },
  {
    id: "armor",
    label: "Armor",
    icon: "🦺",
    className: "slot-armor",
    slot: "armor",
  },
  {
    id: "legging",
    label: "Legging",
    icon: "👖",
    className: "slot-legging",
    slot: "legging",
  },
  {
    id: "boots",
    label: "Boots",
    icon: "🥾",
    className: "slot-boots",
    slot: "boots",
  },
  {
    id: "accessory",
    label: "Accessory",
    icon: "◇",
    className: "slot-accessory",
    slot: "accessory",
  },
];

export const INVENTORY_FILTERS: Array<{
  id: InventoryFilter;
  label: string;
  icon: string;
}> = [
  { id: "all", label: "All", icon: "✦" },
  { id: "weapon", label: "Weapon", icon: "⚔️" },
  { id: "armor", label: "Armor", icon: "🛡️" },
  { id: "consumable", label: "Consumable", icon: "🧪" },
  { id: "material", label: "Material", icon: "◇" },
];

export const ITEM_DISPLAY_DEFINITIONS: Record<string, ItemDisplayDefinition> = {
  old_wooden_staff: {
    id: "old_wooden_staff",
    name: "Old Wooden Staff",
    icon: "🪄",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "Starter staff for magic-focused characters.",
  },
  rusty_sword: {
    id: "rusty_sword",
    name: "Rusty Sword",
    icon: "🗡️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A worn starter blade with basic physical attack.",
  },
  worn_travelers_knife: {
    id: "worn_travelers_knife",
    name: "Traveler's Knife",
    icon: "🔪",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A light knife for agile wanderers.",
  },
  small_dagger: {
    id: "small_dagger",
    name: "Small Dagger",
    icon: "🗡️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A compact blade for quick strikes.",
  },
  training_greatsword: {
    id: "training_greatsword",
    name: "Training Greatsword",
    icon: "⚔️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A heavy two-handed training weapon.",
  },
  worn_wooden_shield: {
    id: "worn_wooden_shield",
    name: "Worn Wooden Shield",
    icon: "🛡️",
    category: "equipment",
    equipmentSlot: "off_hand",
    description: "A battered shield for early defensive builds.",
  },
  simple_wooden_charm: {
    id: "simple_wooden_charm",
    name: "Simple Wooden Charm",
    icon: "📿",
    category: "equipment",
    equipmentSlot: "accessory",
    description: "A modest charm carried by novice adventurers.",
  },
  cloth_cap: {
    id: "cloth_cap",
    name: "Cloth Cap",
    icon: "🎩",
    category: "equipment",
    equipmentSlot: "helmet",
    description: "Basic helmet-slot headwear with minor protection.",
  },
  patched_tunic: {
    id: "patched_tunic",
    name: "Patched Tunic",
    icon: "🦺",
    category: "equipment",
    equipmentSlot: "armor",
    description: "A patched starter tunic.",
  },
  worn_boots: {
    id: "worn_boots",
    name: "Worn Boots",
    icon: "🥾",
    category: "equipment",
    equipmentSlot: "boots",
    description: "Old boots for long roads.",
  },
  stamina_bread: {
    id: "stamina_bread",
    name: "Stamina Bread",
    icon: "🍞",
    category: "consumable",
    description: "Restores a small amount of stamina.",
  },
  minor_hp_potion: {
    id: "minor_hp_potion",
    name: "Minor HP Potion",
    icon: "🧪",
    category: "consumable",
    description: "Restores a small amount of HP.",
  },
  minor_mp_potion: {
    id: "minor_mp_potion",
    name: "Minor MP Potion",
    icon: "🔷",
    category: "consumable",
    description: "Restores a small amount of MP.",
  },
  one_night_inn_pass: {
    id: "one_night_inn_pass",
    name: "One-Night Inn Pass",
    icon: "🎟️",
    category: "pass",
    description: "Redeem this at The Inn for one full overnight rest.",
  },
  str_fragment: {
    id: "str_fragment",
    name: "STR Fragment",
    icon: "🟥",
    category: "material",
    description:
      "A raw shard of Strength potential. Refine 10 at The Sanctuary into 1 STR Rune.",
  },
  dex_fragment: {
    id: "dex_fragment",
    name: "DEX Fragment",
    icon: "🟩",
    category: "material",
    description:
      "A raw shard of Dexterity potential. Refine 10 at The Sanctuary into 1 DEX Rune.",
  },
  con_fragment: {
    id: "con_fragment",
    name: "CON Fragment",
    icon: "🛡️",
    category: "material",
    description:
      "A raw shard of Constitution potential. Refine 10 at The Sanctuary into 1 CON Rune.",
  },
  int_fragment: {
    id: "int_fragment",
    name: "INT Fragment",
    icon: "🟦",
    category: "material",
    description:
      "A raw shard of Intelligence potential. Refine 10 at The Sanctuary into 1 INT Rune.",
  },
  wis_fragment: {
    id: "wis_fragment",
    name: "WIS Fragment",
    icon: "🟪",
    category: "material",
    description:
      "A raw shard of Wisdom potential. Refine 10 at The Sanctuary into 1 WIS Rune.",
  },
  luk_fragment: {
    id: "luk_fragment",
    name: "LUK Fragment",
    icon: "🟨",
    category: "material",
    description:
      "A raw shard of Luck potential. Refine 10 at The Sanctuary into 1 LUK Rune.",
  },
  str_rune: {
    id: "str_rune",
    name: "STR Rune",
    icon: "🔴",
    category: "material",
    description:
      "A condensed Strength rune. Imbue it at The Sanctuary to permanently increase STR.",
  },
  dex_rune: {
    id: "dex_rune",
    name: "DEX Rune",
    icon: "🟢",
    category: "material",
    description:
      "A condensed Dexterity rune. Imbue it at The Sanctuary to permanently increase DEX.",
  },
  con_rune: {
    id: "con_rune",
    name: "CON Rune",
    icon: "🛡️",
    category: "material",
    description:
      "A condensed Constitution rune. Imbue it at The Sanctuary to permanently increase CON.",
  },
  int_rune: {
    id: "int_rune",
    name: "INT Rune",
    icon: "🔵",
    category: "material",
    description:
      "A condensed Intelligence rune. Imbue it at The Sanctuary to permanently increase INT.",
  },
  wis_rune: {
    id: "wis_rune",
    name: "WIS Rune",
    icon: "🟣",
    category: "material",
    description:
      "A condensed Wisdom rune. Imbue it at The Sanctuary to permanently increase WIS.",
  },
  luk_rune: {
    id: "luk_rune",
    name: "LUK Rune",
    icon: "🟡",
    category: "material",
    description:
      "A condensed Luck rune. Imbue it at The Sanctuary to permanently increase LUK.",
  },
  slime_gel: {
    id: "slime_gel",
    name: "Slime Gel",
    icon: "🟢",
    category: "material",
    description:
      "Sticky residue from a slime. Mostly used as a low-grade crafting material.",
  },
  slime_core: {
    id: "slime_core",
    name: "Slime Core",
    icon: "◇",
    category: "material",
    description:
      "A translucent slime core for alchemy and flexible craft bindings.",
  },
  rabbit_meat: {
    id: "rabbit_meat",
    name: "Rabbit Meat",
    icon: "M",
    category: "material",
    description: "Lean rabbit meat used for simple cooking and light meals.",
  },
  rabbit_foot: {
    id: "rabbit_foot",
    name: "Rabbit Foot",
    icon: "F",
    category: "material",
    description: "A lucky rabbit foot for charms and folk alchemy.",
  },
  hawk_feather: {
    id: "hawk_feather",
    name: "Hawk Feather",
    icon: "F",
    category: "material",
    description: "A firm feather used for arrow fletching and light craft.",
  },
  hawk_egg: {
    id: "hawk_egg",
    name: "Hawk Egg",
    icon: "E",
    category: "material",
    description: "A prized wild egg used by cooks and alchemists.",
  },
  boar_meat: {
    id: "boar_meat",
    name: "Boar Meat",
    icon: "M",
    category: "material",
    description: "Fresh boar meat used for cooking and early provisioning.",
  },
  boar_tusk: {
    id: "boar_tusk",
    name: "Boar Tusk",
    icon: "△",
    category: "material",
    description:
      "A hard tusk used for crude fittings, points, and reinforced tool parts.",
  },
  tough_hide: {
    id: "tough_hide",
    name: "Tough Hide",
    icon: "▰",
    category: "material",
    description: "Sturdy hide for leather armor, straps, and rugged padding.",
  },
  wolf_pelt: {
    id: "wolf_pelt",
    name: "Wolf Pelt",
    icon: "P",
    category: "material",
    description: "A rough pelt taken from a wild wolf.",
  },
  wolf_meat: {
    id: "wolf_meat",
    name: "Wolf Meat",
    icon: "M",
    category: "material",
    description: "Lean, gamey wolf meat for survival cooking.",
  },
  wolf_fang: {
    id: "wolf_fang",
    name: "Wolf Fang",
    icon: "△",
    category: "material",
    description:
      "A sharp fang used for small blades, charms, and predatory craft parts.",
  },
  bear_meat: {
    id: "bear_meat",
    name: "Bear Meat",
    icon: "M",
    category: "material",
    description: "A heavy cut of bear meat for hearty meals.",
  },
  bear_claw: {
    id: "bear_claw",
    name: "Bear Claw",
    icon: "C",
    category: "material",
    description:
      "A heavy claw used for weapons, talismans, and brutal craftwork.",
  },
  goblin_ear: {
    id: "goblin_ear",
    name: "Goblin Ear",
    icon: "👂",
    category: "material",
    description: "A crude proof of defeating a goblin.",
  },
  goblin_scrap: {
    id: "goblin_scrap",
    name: "Goblin Scrap",
    icon: "▣",
    category: "material",
    description: "Scavenged metal and junk from goblin gear.",
  },
  spider_silk: {
    id: "spider_silk",
    name: "Spider Silk",
    icon: "S",
    category: "material",
    description: "Resilient silk for thread, wraps, bindings, and tailoring.",
  },
  spider_eye: {
    id: "spider_eye",
    name: "Spider Eye",
    icon: "E",
    category: "material",
    description: "A glossy spider eye for charms, reagents, and alchemy.",
  },
  venom_sac: {
    id: "venom_sac",
    name: "Venom Sac",
    icon: "V",
    category: "material",
    description: "A small sac of weak spider venom for early alchemy.",
  },
  coal: {
    id: "coal",
    name: "Coal",
    icon: "●",
    category: "material",
    description: "Plain forge fuel for smelting and metalwork.",
  },
  copper_nugget: {
    id: "copper_nugget",
    name: "Copper Nugget",
    icon: "◆",
    category: "material",
    description:
      "A small copper nugget for early fittings and simple metal goods.",
  },
  mineral_dust: {
    id: "mineral_dust",
    name: "Mineral Dust",
    icon: "·",
    category: "material",
    description:
      "Fine mineral dust for alchemy, refining, and early enchantment.",
  },
  rough_wood: {
    id: "rough_wood",
    name: "Rough Wood",
    icon: "▬",
    category: "material",
    description:
      "Unfinished common wood for handles, frames, and basic crafting.",
  },
  rough_stone: {
    id: "rough_stone",
    name: "Rough Stone",
    icon: "●",
    category: "material",
    description:
      "A plain rough stone for sharpening, crude molds, and simple reinforcement.",
  },
};

export function buildInventoryStacks(itemIds: ItemId[]): InventoryItemStack[] {
  const orderedItemIds: ItemId[] = [];
  const quantityByItemId = new Map<ItemId, number>();

  itemIds.forEach((itemId) => {
    if (!quantityByItemId.has(itemId)) {
      orderedItemIds.push(itemId);
      quantityByItemId.set(itemId, 0);
    }

    quantityByItemId.set(itemId, (quantityByItemId.get(itemId) ?? 0) + 1);
  });

  return orderedItemIds.map((itemId) => ({
    itemId,
    quantity: quantityByItemId.get(itemId) ?? 0,
  }));
}

export function getCurrencyBreakdown(totalBronze: number) {
  const safeTotal = Math.max(0, Math.floor(totalBronze));
  const gold = Math.floor(safeTotal / 10_000);
  const silver = Math.floor((safeTotal % 10_000) / 100);
  const bronze = safeTotal % 100;

  return { gold, silver, bronze };
}

export function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function getItemDefinition(itemId: ItemId): ItemDisplayDefinition {
  return (
    ITEM_DISPLAY_DEFINITIONS[itemId] ?? {
      id: itemId,
      name: compactLabel(itemId),
      icon: "◇",
      category: "unknown",
      description: "Unknown item.",
    }
  );
}

export function isEquipmentItem(item: ItemDisplayDefinition): boolean {
  return item.category === "equipment";
}

export function isInnPassItemId(itemId: ItemId): boolean {
  return ONE_NIGHT_INN_PASS_ITEM_IDS.has(itemId);
}

export function isConsumableLike(item: ItemDisplayDefinition): boolean {
  return item.category === "consumable" || item.category === "pass";
}

export function canUseItemFromInventory(item: ItemDisplayDefinition): boolean {
  return item.category === "consumable" && !isInnPassItemId(item.id);
}

export function isInnPass(item: ItemDisplayDefinition): boolean {
  return isInnPassItemId(item.id);
}

export function getItemCategoryLabel(item: ItemDisplayDefinition): string {
  if (isInnPass(item)) {
    return "Inn Pass";
  }

  return compactLabel(item.category);
}

export function filterInventoryStacks(
  stacks: InventoryItemStack[],
  filter: InventoryFilter,
): InventoryItemStack[] {
  if (filter === "all") {
    return stacks;
  }

  return stacks.filter((stack) => {
    const item = getItemDefinition(stack.itemId);

    if (filter === "weapon") {
      return item.category === "equipment" && item.equipmentSlot === "weapon";
    }

    if (filter === "armor") {
      return (
        item.category === "equipment" &&
        item.equipmentSlot !== undefined &&
        item.equipmentSlot !== "weapon"
      );
    }

    if (filter === "consumable") {
      return isConsumableLike(item);
    }

    if (filter === "material") {
      return item.category === "material";
    }

    return true;
  });
}

export function formatEffects(effects: ConsumableEffectApplication[]): string {
  if (effects.length === 0) {
    return "No direct effect was applied.";
  }

  return effects
    .map((effect) => {
      const sign = effect.amountApplied >= 0 ? "+" : "";
      return `${effect.target} ${sign}${formatNumber(effect.amountApplied)}`;
    })
    .join(", ");
}
