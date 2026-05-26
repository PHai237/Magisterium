import { useEffect, useMemo, useState } from "react";

import type {
  CharacterSnapshot,
  ConsumableEffectApplication,
  InventoryItemStack,
  ItemId
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
import { charactersApi } from "../characters/characters.api";
import "./inventory.css";

interface InventoryOverlayProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onClose: () => void;
}

type InventoryFilter = "all" | "weapon" | "armor" | "consumable" | "material";

type ItemDisplayCategory =
  | "equipment"
  | "consumable"
  | "material"
  | "voucher"
  | "unknown";

type EquipmentSlot =
  | "weapon"
  | "off_hand"
  | "head"
  | "body"
  | "hands"
  | "feet"
  | "accessory";

interface ItemDisplayDefinition {
  id: ItemId;
  name: string;
  icon: string;
  category: ItemDisplayCategory;
  description: string;
  equipmentSlot?: EquipmentSlot;
}

interface EquipmentSlotView {
  id: string;
  label: string;
  icon: string;
  className: string;
  slot?: EquipmentSlot;
}

const EQUIPMENT_SLOTS: EquipmentSlotView[] = [
  {
    id: "head",
    label: "Head",
    icon: "👑",
    className: "slot-head",
    slot: "head"
  },
  {
    id: "hand",
    label: "Hand",
    icon: "⚔️",
    className: "slot-hand",
    slot: "weapon"
  },
  {
    id: "offhand",
    label: "Off-hand",
    icon: "🛡️",
    className: "slot-offhand",
    slot: "off_hand"
  },
  {
    id: "armor",
    label: "Armor",
    icon: "🦺",
    className: "slot-armor",
    slot: "body"
  },
  {
    id: "legging",
    label: "Legging",
    icon: "👖",
    className: "slot-legging"
  },
  {
    id: "boots",
    label: "Boots",
    icon: "🥾",
    className: "slot-boots",
    slot: "feet"
  }
];

const INVENTORY_FILTERS: Array<{
  id: InventoryFilter;
  label: string;
  icon: string;
}> = [
  { id: "all", label: "All", icon: "✦" },
  { id: "weapon", label: "Weapon", icon: "⚔️" },
  { id: "armor", label: "Armor", icon: "🛡️" },
  { id: "consumable", label: "Consumable", icon: "🧪" },
  { id: "material", label: "Material", icon: "◇" }
];

const ITEM_DISPLAY_DEFINITIONS: Record<string, ItemDisplayDefinition> = {
  old_wooden_staff: {
    id: "old_wooden_staff",
    name: "Old Wooden Staff",
    icon: "🪄",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "Starter staff for magic-focused characters."
  },
  rusty_sword: {
    id: "rusty_sword",
    name: "Rusty Sword",
    icon: "🗡️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A worn starter blade with basic physical attack."
  },
  worn_travelers_knife: {
    id: "worn_travelers_knife",
    name: "Traveler's Knife",
    icon: "🔪",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A light knife for agile wanderers."
  },
  small_dagger: {
    id: "small_dagger",
    name: "Small Dagger",
    icon: "🗡️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A compact blade for quick strikes."
  },
  cracked_dagger: {
    id: "cracked_dagger",
    name: "Cracked Dagger",
    icon: "🗡️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A damaged goblin dagger. Still usable, but unreliable."
  },
  training_greatsword: {
    id: "training_greatsword",
    name: "Training Greatsword",
    icon: "⚔️",
    category: "equipment",
    equipmentSlot: "weapon",
    description: "A heavy two-handed training weapon."
  },
  worn_wooden_shield: {
    id: "worn_wooden_shield",
    name: "Worn Wooden Shield",
    icon: "🛡️",
    category: "equipment",
    equipmentSlot: "off_hand",
    description: "A battered shield for early defensive builds."
  },
  simple_wooden_charm: {
    id: "simple_wooden_charm",
    name: "Simple Wooden Charm",
    icon: "📿",
    category: "equipment",
    equipmentSlot: "accessory",
    description: "A humble charm carried by new adventurers."
  },
  minor_hp_potion: {
    id: "minor_hp_potion",
    name: "Minor HP Potion",
    icon: "🧪",
    category: "consumable",
    description: "Restores a small amount of HP."
  },
  minor_mp_potion: {
    id: "minor_mp_potion",
    name: "Minor MP Potion",
    icon: "🔷",
    category: "consumable",
    description: "Restores a small amount of MP."
  },
  stamina_bread: {
    id: "stamina_bread",
    name: "Stamina Bread",
    icon: "🍞",
    category: "consumable",
    description: "Restores stamina outside battle."
  },
  one_night_inn_voucher: {
    id: "one_night_inn_voucher",
    name: "One-night Inn Voucher",
    icon: "🏨",
    category: "voucher",
    description: "Consumes one voucher to fully rest outside battle."
  },
  slime_gel: {
    id: "slime_gel",
    name: "Slime Gel",
    icon: "🟢",
    category: "material",
    description: "Sticky residue from a slime. Useful as low-grade material."
  },
  goblin_ear: {
    id: "goblin_ear",
    name: "Goblin Ear",
    icon: "👂",
    category: "material",
    description: "A crude bounty proof from a goblin."
  }
};

function getCurrencyBreakdown(totalBronze: number) {
  const safeBronze = Math.max(0, Math.floor(totalBronze));
  const gold = Math.floor(safeBronze / 10_000);
  const silver = Math.floor((safeBronze % 10_000) / 100);
  const bronze = safeBronze % 100;

  return { gold, silver, bronze };
}

function buildInventoryStacks(itemIds: readonly ItemId[]): InventoryItemStack[] {
  const countByItemId = new Map<ItemId, number>();

  itemIds.forEach((itemId) => {
    countByItemId.set(itemId, (countByItemId.get(itemId) ?? 0) + 1);
  });

  return Array.from(countByItemId.entries())
    .map(([itemId, quantity]) => ({
      itemId,
      quantity
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
}

function getItemDefinition(itemId: ItemId): ItemDisplayDefinition {
  return (
    ITEM_DISPLAY_DEFINITIONS[itemId] ?? {
      id: itemId,
      name: compactLabel(itemId),
      icon: "◇",
      category: "unknown",
      description: "Unknown item. Backend owns the source of truth."
    }
  );
}

function isConsumableLike(item: ItemDisplayDefinition): boolean {
  return item.category === "consumable" || item.category === "voucher";
}

function matchesFilter(
  stack: InventoryItemStack,
  filter: InventoryFilter
): boolean {
  const item = getItemDefinition(stack.itemId);

  if (filter === "all") {
    return true;
  }

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

  return item.category === "material" || item.category === "unknown";
}

function buildTooltip(stack: InventoryItemStack): string {
  const item = getItemDefinition(stack.itemId);

  return `${item.name} · ${compactLabel(item.category)} · Qty ${stack.quantity} · ${item.description}`;
}

function summarizeConsumableEffects(
  itemName: string,
  effects: ConsumableEffectApplication[]
): string {
  if (effects.length === 0) {
    return `${itemName} used.`;
  }

  const summary = effects
    .map((effect) => {
      const amount =
        effect.target === "Fatigue"
          ? `-${formatNumber(effect.amountApplied, 2)}`
          : `+${formatNumber(effect.amountApplied, 0)}`;

      return `${effect.target} ${amount}`;
    })
    .join(" · ");

  return `${itemName} used: ${summary}`;
}

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function InventoryOverlay({
  userId,
  currentCharacter,
  onCharacterUpdated,
  onClose
}: InventoryOverlayProps) {
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [stacks, setStacks] = useState<InventoryItemStack[]>(() =>
    buildInventoryStacks(currentCharacter.inventoryItemIds)
  );
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);
  const [busyItemId, setBusyItemId] = useState<ItemId | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const money = getCurrencyBreakdown(currentCharacter.moneyBronze);

  useEffect(() => {
    setStacks(buildInventoryStacks(currentCharacter.inventoryItemIds));
  }, [currentCharacter.inventoryItemIds]);

  useEffect(() => {
    const availableItemIds = new Set([
      ...currentCharacter.inventoryItemIds,
      ...currentCharacter.equippedItemIds
    ]);

    setSelectedItemId((current) =>
      current && !availableItemIds.has(current) ? null : current
    );
  }, [currentCharacter.inventoryItemIds, currentCharacter.equippedItemIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setLoadingInventory(true);
      setError(null);

      try {
        const nextStacks = await charactersApi.getInventory(
          userId,
          currentCharacter.id
        );

        if (!cancelled) {
          setStacks(nextStacks);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load inventory."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingInventory(false);
        }
      }
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [currentCharacter.id, userId]);

  const equippedItemsBySlot = useMemo(() => {
    const next = new Map<EquipmentSlot, ItemId>();

    currentCharacter.equippedItemIds.forEach((itemId) => {
      const item = getItemDefinition(itemId);

      if (item.equipmentSlot) {
        next.set(item.equipmentSlot, itemId);
      }
    });

    return next;
  }, [currentCharacter.equippedItemIds]);

  const visibleStacks = useMemo(
    () => stacks.filter((stack) => matchesFilter(stack, filter)),
    [filter, stacks]
  );

  const selectedStack = selectedItemId
    ? stacks.find((stack) => stack.itemId === selectedItemId) ?? null
    : null;

  const selectedItem = selectedItemId ? getItemDefinition(selectedItemId) : null;
  const selectedItemIsEquipped = selectedItemId
    ? currentCharacter.equippedItemIds.includes(selectedItemId)
    : false;

  const cellCount = Math.max(25, Math.ceil(visibleStacks.length / 5) * 5);
  const cells = Array.from({ length: cellCount }, (_, index) => visibleStacks[index]);

  async function runInventoryAction(
    itemId: ItemId,
    action: "equip" | "unequip" | "use"
  ) {
    if (busyItemId) {
      return;
    }

    const item = getItemDefinition(itemId);

    setBusyItemId(itemId);
    setMessage(null);
    setError(null);

    try {
      if (action === "equip") {
        const result = await charactersApi.equip(
          userId,
          currentCharacter.id,
          itemId
        );

        onCharacterUpdated(result.character);
        setStacks(buildInventoryStacks(result.character.inventoryItemIds));
        setMessage(`${item.name} equipped.`);
        return;
      }

      if (action === "unequip") {
        const result = await charactersApi.unequip(
          userId,
          currentCharacter.id,
          itemId
        );

        onCharacterUpdated(result.character);
        setStacks(buildInventoryStacks(result.character.inventoryItemIds));
        setMessage(`${item.name} unequipped.`);
        return;
      }

      const result = await charactersApi.useConsumable(
        userId,
        currentCharacter.id,
        itemId
      );

      onCharacterUpdated(result.character);
      setStacks(buildInventoryStacks(result.character.inventoryItemIds));
      setMessage(summarizeConsumableEffects(item.name, result.itemUse.effects));

      if (result.inventoryChange.nextQuantity <= 0) {
        setSelectedItemId(null);
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Inventory action failed."
      );
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <section className="inventory-overlay" aria-label="Inventory">
      <header className="inventory-overlay__header">
        <div className="inventory-overlay__heading">
          <h2>Inventory</h2>

          <div className="inventory-wallet" aria-label="Wallet">
            <span className="inventory-wallet__coin inventory-wallet__coin--gold">
              <strong>{formatNumber(money.gold)}</strong> Gold
            </span>

            <span className="inventory-wallet__coin inventory-wallet__coin--silver">
              <strong>{formatNumber(money.silver)}</strong> Silver
            </span>

            <span className="inventory-wallet__coin inventory-wallet__coin--bronze">
              <strong>{formatNumber(money.bronze)}</strong> Bronze
            </span>
          </div>
        </div>

        <button
          type="button"
          className="inventory-overlay__close"
          aria-label="Close inventory"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="inventory-overlay__layout">
        <aside className="inventory-paperdoll">
          <div className="inventory-paperdoll__stage">
            {EQUIPMENT_SLOTS.map((slot) => {
              const equippedItemId = slot.slot
                ? equippedItemsBySlot.get(slot.slot)
                : undefined;
              const equippedItem = equippedItemId
                ? getItemDefinition(equippedItemId)
                : null;

              return (
                <button
                  key={slot.id}
                  type="button"
                  className={`inventory-equipment-slot inventory-equipment-slot--${slot.className}${
                    equippedItem ? " inventory-equipment-slot--filled" : ""
                  }`}
                  aria-label={
                    equippedItem
                      ? `${slot.label}: ${equippedItem.name}`
                      : `${slot.label}: empty`
                  }
                  disabled={!equippedItemId}
                  onClick={() => {
                    if (equippedItemId) {
                      setSelectedItemId(equippedItemId);
                    }
                  }}
                >
                  <span>{equippedItem?.icon ?? slot.icon}</span>
                  <strong>{equippedItem?.name ?? "Empty"}</strong>
                  <small>{slot.label}</small>
                </button>
              );
            })}

            <div className="inventory-character-model">
              <div className="inventory-character-model__avatar" aria-hidden="true">
                {getInitialLetter(currentCharacter.name)}
              </div>
              <span>Avatar Preview</span>
            </div>
          </div>
        </aside>

        <main className="inventory-bag">
          <div className="inventory-bag__main">
            <div className="inventory-bag-grid">
              {cells.map((stack, index) => {
                const item = stack ? getItemDefinition(stack.itemId) : null;
                const isSelected =
                  stack !== undefined && stack.itemId === selectedItemId;

                return (
                  <button
                    key={stack ? `${stack.itemId}-${index}` : `empty-${index}`}
                    type="button"
                    className={`inventory-bag-cell${
                      stack ? " inventory-bag-cell--filled" : ""
                    }${isSelected ? " inventory-bag-cell--selected" : ""}`}
                    aria-label={item?.name ?? "Empty slot"}
                    aria-pressed={isSelected}
                    data-tooltip={stack ? buildTooltip(stack) : undefined}
                    onClick={() => {
                      if (stack) {
                        setSelectedItemId(stack.itemId);
                      }
                    }}
                  >
                    {item ? (
                      <>
                        <span>{item.icon}</span>
                        {stack.quantity > 1 ? (
                          <strong className="inventory-bag-cell__quantity">
                            ×{formatNumber(stack.quantity)}
                          </strong>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <section className="inventory-action-panel" aria-live="polite">
              {selectedItem ? (
                <>
                  <div className="inventory-action-panel__item">
                    <span className="inventory-action-panel__icon">
                      {selectedItem.icon}
                    </span>

                    <div>
                      <strong>{selectedItem.name}</strong>
                      <small>
                        {compactLabel(selectedItem.category)}
                        {selectedStack
                          ? ` · Qty ${formatNumber(selectedStack.quantity)}`
                          : selectedItemIsEquipped
                            ? " · Equipped"
                            : ""}
                      </small>
                    </div>
                  </div>

                  <p>{selectedItem.description}</p>

                  <div className="inventory-action-panel__actions">
                    {selectedItem.category === "equipment" ? (
                      <>
                        <button
                          type="button"
                          disabled={
                            busyItemId !== null ||
                            selectedItemIsEquipped ||
                            !selectedStack
                          }
                          onClick={() =>
                            void runInventoryAction(selectedItem.id, "equip")
                          }
                        >
                          {busyItemId === selectedItem.id
                            ? "Working..."
                            : "Equip"}
                        </button>

                        <button
                          type="button"
                          disabled={busyItemId !== null || !selectedItemIsEquipped}
                          onClick={() =>
                            void runInventoryAction(selectedItem.id, "unequip")
                          }
                        >
                          {busyItemId === selectedItem.id
                            ? "Working..."
                            : "Unequip"}
                        </button>
                      </>
                    ) : null}

                    {isConsumableLike(selectedItem) ? (
                      <button
                        type="button"
                        disabled={busyItemId !== null || !selectedStack}
                        onClick={() =>
                          void runInventoryAction(selectedItem.id, "use")
                        }
                      >
                        {busyItemId === selectedItem.id ? "Using..." : "Use"}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="inventory-action-panel__empty">
                  <strong>Select an item</strong>
                  <span>Click an item slot to inspect, equip, unequip, or use it.</span>
                </div>
              )}

              {loadingInventory ? (
                <div className="inventory-status inventory-status--muted">
                  Loading inventory...
                </div>
              ) : null}

              {message ? (
                <div className="inventory-status inventory-status--success">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="inventory-status inventory-status--error">
                  {error}
                </div>
              ) : null}
            </section>
          </div>

          <nav className="inventory-type-tabs" aria-label="Inventory filters">
            {INVENTORY_FILTERS.map((itemFilter) => (
              <button
                key={itemFilter.id}
                type="button"
                className={`inventory-type-tab${
                  filter === itemFilter.id ? " inventory-type-tab--active" : ""
                }`}
                aria-label={itemFilter.label}
                aria-pressed={filter === itemFilter.id}
                data-tooltip={itemFilter.label}
                onClick={() => setFilter(itemFilter.id)}
              >
                <span aria-hidden="true">{itemFilter.icon}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </section>
  );
}