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
  | "pass"
  | "unknown";

type EquipmentSlot =
  | "weapon"
  | "off_hand"
  | "head"
  | "body"
  | "hands"
  | "feet"
  | "accessory";

const ONE_NIGHT_INN_PASS_ITEM_IDS = new Set<ItemId>([
  "one_night_inn_pass",
  "one_night_inn_voucher"
]);

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
    description: "A modest charm carried by novice adventurers."
  },
  cloth_cap: {
    id: "cloth_cap",
    name: "Cloth Cap",
    icon: "🎩",
    category: "equipment",
    equipmentSlot: "head",
    description: "Basic headwear with minor protection."
  },
  patched_tunic: {
    id: "patched_tunic",
    name: "Patched Tunic",
    icon: "🦺",
    category: "equipment",
    equipmentSlot: "body",
    description: "A patched starter tunic."
  },
  worn_boots: {
    id: "worn_boots",
    name: "Worn Boots",
    icon: "🥾",
    category: "equipment",
    equipmentSlot: "feet",
    description: "Old boots for long roads."
  },
  stamina_bread: {
    id: "stamina_bread",
    name: "Stamina Bread",
    icon: "🍞",
    category: "consumable",
    description: "Restores a small amount of stamina."
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
  one_night_inn_pass: {
    id: "one_night_inn_pass",
    name: "One-Night Inn Pass",
    icon: "🎟️",
    category: "pass",
    description: "Redeem this at The Inn for one full overnight rest."
  },
  one_night_inn_voucher: {
    id: "one_night_inn_voucher",
    name: "One-Night Inn Pass",
    icon: "🎟️",
    category: "pass",
    description: "Redeem this at The Inn for one full overnight rest."
  },
  slime_gel: {
    id: "slime_gel",
    name: "Slime Gel",
    icon: "🟢",
    category: "material",
    description: "Sticky residue from a slime. Mostly used as a low-grade crafting material."
  },
  goblin_ear: {
    id: "goblin_ear",
    name: "Goblin Ear",
    icon: "👂",
    category: "material",
    description: "A crude proof of defeating a goblin."
  }
};

function buildInventoryStacks(itemIds: ItemId[]): InventoryItemStack[] {
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
    quantity: quantityByItemId.get(itemId) ?? 0
  }));
}

function getCurrencyBreakdown(totalBronze: number) {
  const safeTotal = Math.max(0, Math.floor(totalBronze));
  const gold = Math.floor(safeTotal / 10_000);
  const silver = Math.floor((safeTotal % 10_000) / 100);
  const bronze = safeTotal % 100;

  return { gold, silver, bronze };
}

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getItemDefinition(itemId: ItemId): ItemDisplayDefinition {
  return (
    ITEM_DISPLAY_DEFINITIONS[itemId] ?? {
      id: itemId,
      name: compactLabel(itemId),
      icon: "◇",
      category: "unknown",
      description: "Unknown item."
    }
  );
}

function isEquipmentItem(item: ItemDisplayDefinition): boolean {
  return item.category === "equipment";
}

function isInnPassItemId(itemId: ItemId): boolean {
  return ONE_NIGHT_INN_PASS_ITEM_IDS.has(itemId);
}

function isConsumableLike(item: ItemDisplayDefinition): boolean {
  return item.category === "consumable" || item.category === "pass";
}

function canUseItemFromInventory(item: ItemDisplayDefinition): boolean {
  return item.category === "consumable" && !isInnPassItemId(item.id);
}

function isInnPass(item: ItemDisplayDefinition): boolean {
  return isInnPassItemId(item.id);
}

function getItemCategoryLabel(item: ItemDisplayDefinition): string {
  if (isInnPass(item)) {
    return "Inn Pass";
  }

  return compactLabel(item.category);
}

function filterInventoryStacks(
  stacks: InventoryItemStack[],
  filter: InventoryFilter
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

function formatEffects(effects: ConsumableEffectApplication[]): string {
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

export function InventoryOverlay({
  userId,
  currentCharacter,
  onCharacterUpdated,
  onClose
}: InventoryOverlayProps) {
  const [stacks, setStacks] = useState<InventoryItemStack[]>(() =>
    buildInventoryStacks(currentCharacter.inventoryItemIds)
  );
  const [equippedItemIds, setEquippedItemIds] = useState<ItemId[]>(() => [
    ...currentCharacter.equippedItemIds
  ]);
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [busyItemId, setBusyItemId] = useState<ItemId | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wallet = useMemo(
    () => getCurrencyBreakdown(currentCharacter.moneyBronze),
    [currentCharacter.moneyBronze]
  );

  const equippedItems = useMemo(
    () => equippedItemIds.map((itemId) => getItemDefinition(itemId)),
    [equippedItemIds]
  );

  const selectedStack = useMemo(
    () => stacks.find((stack) => stack.itemId === selectedItemId) ?? null,
    [selectedItemId, stacks]
  );

  const selectedItem = selectedItemId ? getItemDefinition(selectedItemId) : null;

  const selectedItemIsEquipped = selectedItemId
    ? equippedItemIds.includes(selectedItemId)
    : false;

  const visibleStacks = useMemo(
    () => filterInventoryStacks(stacks, filter),
    [filter, stacks]
  );

  const bagCells = useMemo(() => {
    const minimumSlots = 25;
    const filledCells = visibleStacks.map((stack) => ({
      stack,
      item: getItemDefinition(stack.itemId)
    }));

    const emptyCount = Math.max(0, minimumSlots - filledCells.length);

    return {
      filledCells,
      emptyCells: Array.from({ length: emptyCount }, (_, index) => index)
    };
  }, [visibleStacks]);

  useEffect(() => {
    setStacks(buildInventoryStacks(currentCharacter.inventoryItemIds));
  }, [currentCharacter.inventoryItemIds]);

  useEffect(() => {
    setEquippedItemIds([...currentCharacter.equippedItemIds]);
  }, [currentCharacter.equippedItemIds]);

  useEffect(() => {
    const availableItemIds = new Set<ItemId>([
      ...currentCharacter.inventoryItemIds,
      ...equippedItemIds
    ]);

    setSelectedItemId((current) =>
      current && !availableItemIds.has(current) ? null : current
    );
  }, [currentCharacter.inventoryItemIds, equippedItemIds]);

  useEffect(() => {
    if (!message && !error) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 2800);

    return () => window.clearTimeout(timerId);
  }, [message, error]);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setLoading(true);
      setError(null);

      try {
        const nextStacks = await charactersApi.getInventory(
          userId,
          currentCharacter.id
        );

        if (!cancelled) {
          setStacks(nextStacks);
          setSelectedItemId((previousSelectedItemId) => {
            if (
              previousSelectedItemId &&
              nextStacks.some((stack) => stack.itemId === previousSelectedItemId)
            ) {
              return previousSelectedItemId;
            }

            return nextStacks[0]?.itemId ?? null;
          });
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
          setLoading(false);
        }
      }
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [currentCharacter.id, userId]);

  async function runInventoryAction(
    itemId: ItemId,
    action: "equip" | "unequip" | "use"
  ) {
    if (busyItemId) {
      return;
    }

    const item = getItemDefinition(itemId);

    if (action === "use" && !canUseItemFromInventory(item)) {
      setMessage(null);
      setError(
        isInnPass(item)
          ? "Inn Passes can only be redeemed at The Inn."
          : `${item.name} cannot be used from the inventory.`
      );
      return;
    }

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
        setEquippedItemIds([...result.character.equippedItemIds]);
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
        setEquippedItemIds([...result.character.equippedItemIds]);
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
      setEquippedItemIds([...result.character.equippedItemIds]);
      setStacks(buildInventoryStacks(result.character.inventoryItemIds));
      setMessage(`${item.name} used. ${formatEffects(result.itemUse.effects)}`);

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

  function getEquippedItemForSlot(slot?: EquipmentSlot) {
    if (!slot) {
      return null;
    }

    return equippedItems.find((item) => item.equipmentSlot === slot) ?? null;
  }

  return (
    <section className="inventory-overlay" aria-label="Inventory">
      <header className="inventory-overlay__header">
        <div className="inventory-overlay__heading">
          <h2>Inventory</h2>

          <div className="inventory-wallet" aria-label="Wallet">
            <span className="inventory-wallet__coin inventory-wallet__coin--gold">
              <strong>{formatNumber(wallet.gold)}</strong> Gold
            </span>
            <span className="inventory-wallet__coin inventory-wallet__coin--silver">
              <strong>{formatNumber(wallet.silver)}</strong> Silver
            </span>
            <span className="inventory-wallet__coin inventory-wallet__coin--bronze">
              <strong>{formatNumber(wallet.bronze)}</strong> Bronze
            </span>
          </div>
        </div>

        <button
          type="button"
          className="inventory-overlay__close"
          onClick={onClose}
          aria-label="Close inventory"
        >
          ×
        </button>
      </header>

      <div className="inventory-overlay__layout">
        <aside className="inventory-paperdoll" aria-label="Equipment">
          <div className="inventory-paperdoll__stage">
            <div className="inventory-character-model" aria-hidden="true">
              <div className="inventory-character-model__avatar">
                {getInitialLetter(currentCharacter.name)}
              </div>
              <span>Weaver</span>
            </div>

            {EQUIPMENT_SLOTS.map((slotView) => {
              const equippedItem = getEquippedItemForSlot(slotView.slot);

              return (
                <button
                  key={slotView.id}
                  type="button"
                  className={[
                    "inventory-equipment-slot",
                    `inventory-equipment-slot--${slotView.className}`,
                    equippedItem ? "inventory-equipment-slot--filled" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!equippedItem || busyItemId !== null}
                  onClick={() => {
                    if (equippedItem) {
                      void runInventoryAction(equippedItem.id, "unequip");
                    }
                  }}
                  title={
                    equippedItem
                      ? `${equippedItem.name} — click to unequip`
                      : slotView.label
                  }
                >
                  <span aria-hidden="true">
                    {equippedItem?.icon ?? slotView.icon}
                  </span>
                  {equippedItem ? (
                    <strong>{equippedItem.name}</strong>
                  ) : (
                    <small>{slotView.label}</small>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="inventory-bag" aria-label="Bag">
          <div className="inventory-bag__main">
            <div className="inventory-bag-grid">
              {loading ? (
                <div className="inventory-status inventory-status--muted">
                  Loading inventory...
                </div>
              ) : null}

              {!loading &&
                bagCells.filledCells.map(({ stack, item }) => (
                  <button
                    key={stack.itemId}
                    type="button"
                    className={[
                      "inventory-bag-cell",
                      selectedItemId === stack.itemId
                        ? "inventory-bag-cell--selected"
                        : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedItemId(stack.itemId)}
                    aria-label={`${item.name}, quantity ${stack.quantity}`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {stack.quantity > 1 ? (
                      <span className="inventory-bag-cell__quantity">
                        {formatNumber(stack.quantity)}
                      </span>
                    ) : null}
                  </button>
                ))}

              {!loading &&
                bagCells.emptyCells.map((cellIndex) => (
                  <div
                    key={`empty-${cellIndex}`}
                    className="inventory-bag-cell"
                    aria-hidden="true"
                  />
                ))}
            </div>

            <section className="inventory-action-panel">
              {selectedItem ? (
                <>
                  <div className="inventory-action-panel__item">
                    <span className="inventory-action-panel__icon" aria-hidden="true">
                      {selectedItem.icon}
                    </span>

                    <div>
                      <strong>{selectedItem.name}</strong>
                      <small>
                        {getItemCategoryLabel(selectedItem)}
                        {selectedStack
                          ? ` · ${formatNumber(selectedStack.quantity)} owned`
                          : selectedItemIsEquipped
                            ? " · Equipped"
                            : ""}
                      </small>
                    </div>
                  </div>

                  <p>{selectedItem.description}</p>

                  <div className="inventory-action-panel__actions">
                    {isEquipmentItem(selectedItem) ? (
                      <button
                        type="button"
                        className={
                          selectedItemIsEquipped
                            ? "inventory-action-panel__button--danger"
                            : undefined
                        }
                        disabled={
                          busyItemId !== null ||
                          (!selectedItemIsEquipped && !selectedStack)
                        }
                        onClick={() =>
                          void runInventoryAction(
                            selectedItem.id,
                            selectedItemIsEquipped ? "unequip" : "equip"
                          )
                        }
                      >
                        {busyItemId === selectedItem.id
                          ? "Working..."
                          : selectedItemIsEquipped
                            ? "Unequip"
                            : "Equip"}
                      </button>
                    ) : null}

                    {canUseItemFromInventory(selectedItem) ? (
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

                    {isInnPass(selectedItem) ? (
                      <button type="button" disabled>
                        Redeem at Inn
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="inventory-action-panel__empty">
                  <strong>No item selected</strong>
                  <span>Select an item to inspect it.</span>
                </div>
              )}

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
            {INVENTORY_FILTERS.map((inventoryFilter) => (
              <button
                key={inventoryFilter.id}
                type="button"
                className={
                  filter === inventoryFilter.id
                    ? "inventory-type-tab inventory-type-tab--active"
                    : "inventory-type-tab"
                }
                data-tooltip={inventoryFilter.label}
                aria-label={inventoryFilter.label}
                aria-pressed={filter === inventoryFilter.id}
                onClick={() => setFilter(inventoryFilter.id)}
              >
                <span aria-hidden="true">{inventoryFilter.icon}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </section>
  );
}