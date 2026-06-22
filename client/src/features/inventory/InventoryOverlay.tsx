import { useEffect, useMemo, useState } from "react";

import type {
  CharacterSnapshot,
  InventoryItemStack,
  ItemId,
} from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { charactersApi } from "../characters/characters.api";
import { hasItemImage, renderItemIcon } from "../items/itemAssets";
import {
  EQUIPMENT_SLOTS,
  INVENTORY_FILTERS,
  type EquipmentSlot,
  type InventoryFilter,
  type InventoryMobilePanel,
  buildInventoryStacks,
  canUseItemFromInventory,
  filterInventoryStacks,
  formatEffects,
  getCurrencyBreakdown,
  getInitialLetter,
  getItemCategoryLabel,
  getItemDefinition,
  isEquipmentItem,
  isInnPass,
} from "./inventoryPresentation";
import "./inventory.css";

interface InventoryOverlayProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onClose: () => void;
}
export function InventoryOverlay({
  userId,
  currentCharacter,
  onCharacterUpdated,
  onClose,
}: InventoryOverlayProps) {
  const [stacks, setStacks] = useState<InventoryItemStack[]>(() =>
    buildInventoryStacks(currentCharacter.inventoryItemIds),
  );
  const [equippedItemIds, setEquippedItemIds] = useState<ItemId[]>(() => [
    ...currentCharacter.equippedItemIds,
  ]);
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [mobilePanel, setMobilePanel] = useState<InventoryMobilePanel>("bag");
  const [busyItemId, setBusyItemId] = useState<ItemId | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wallet = useMemo(
    () => getCurrencyBreakdown(currentCharacter.moneyBronze),
    [currentCharacter.moneyBronze],
  );

  const equippedItems = useMemo(
    () => equippedItemIds.map((itemId) => getItemDefinition(itemId)),
    [equippedItemIds],
  );

  const selectedStack = useMemo(
    () => stacks.find((stack) => stack.itemId === selectedItemId) ?? null,
    [selectedItemId, stacks],
  );

  const selectedItem = selectedItemId
    ? getItemDefinition(selectedItemId)
    : null;

  const selectedItemIsEquipped = selectedItemId
    ? equippedItemIds.includes(selectedItemId)
    : false;

  const visibleStacks = useMemo(
    () => filterInventoryStacks(stacks, filter),
    [filter, stacks],
  );

  const bagCells = useMemo(() => {
    const minimumSlots = 25;
    const filledCells = visibleStacks.map((stack) => ({
      stack,
      item: getItemDefinition(stack.itemId),
    }));

    const emptyCount = Math.max(0, minimumSlots - filledCells.length);

    return {
      filledCells,
      emptyCells: Array.from({ length: emptyCount }, (_, index) => index),
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
      ...equippedItemIds,
    ]);

    setSelectedItemId((current) =>
      current && !availableItemIds.has(current) ? null : current,
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
          currentCharacter.id,
        );

        if (!cancelled) {
          setStacks(nextStacks);
          setSelectedItemId((previousSelectedItemId) => {
            if (
              previousSelectedItemId &&
              nextStacks.some(
                (stack) => stack.itemId === previousSelectedItemId,
              )
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
              : "Failed to load inventory.",
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
    action: "equip" | "unequip" | "use",
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
          : `${item.name} cannot be used from the inventory.`,
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
          itemId,
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
          itemId,
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
        itemId,
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
          : "Inventory action failed.",
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
    <section
      className="inventory-overlay"
      data-mobile-panel={mobilePanel}
      aria-label="Inventory"
    >
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

        <div className="inventory-mobile-switch" aria-label="Inventory view">
          <button
            type="button"
            className={
              mobilePanel === "character"
                ? "inventory-mobile-switch__button inventory-mobile-switch__button--active"
                : "inventory-mobile-switch__button"
            }
            aria-pressed={mobilePanel === "character"}
            onClick={() => setMobilePanel("character")}
          >
            Character
          </button>

          <button
            type="button"
            className={
              mobilePanel === "bag"
                ? "inventory-mobile-switch__button inventory-mobile-switch__button--active"
                : "inventory-mobile-switch__button"
            }
            aria-pressed={mobilePanel === "bag"}
            onClick={() => setMobilePanel("bag")}
          >
            Bag
          </button>
        </div>
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
                    equippedItem ? "inventory-equipment-slot--filled" : "",
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
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedItemId(stack.itemId)}
                    aria-label={`${item.name}, quantity ${stack.quantity}`}
                  >
                    <span aria-hidden="true">
                      {renderItemIcon({
                        itemId: item.id,
                        fallback: item.icon,
                      })}
                    </span>
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
                    <span
                      className={[
                        "inventory-action-panel__icon",
                        hasItemImage(selectedItem.id)
                          ? "inventory-action-panel__icon--image"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden="true"
                    >
                      {renderItemIcon({
                        itemId: selectedItem.id,
                        fallback: selectedItem.icon,
                      })}
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
                            selectedItemIsEquipped ? "unequip" : "equip",
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
