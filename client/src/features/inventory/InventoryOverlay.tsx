import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import "./inventory.css";

interface InventoryOverlayProps {
  currentCharacter: CharacterSnapshot;
  onClose: () => void;
}

const EQUIPMENT_SLOTS = [
  { id: "head", label: "Head", icon: "👑", className: "slot-head" },
  { id: "hand", label: "Hand", icon: "⚔️", className: "slot-hand" },
  { id: "offhand", label: "Off-hand", icon: "🛡️", className: "slot-offhand" },
  { id: "armor", label: "Armor", icon: "🦺", className: "slot-armor" },
  { id: "legging", label: "Legging", icon: "👖", className: "slot-legging" },
  { id: "boots", label: "Boots", icon: "🥾", className: "slot-boots" }
] as const;

const INVENTORY_FILTERS = [
  { label: "All", icon: "✦" },
  { label: "Weapon", icon: "⚔️" },
  { label: "Armor", icon: "🛡️" },
  { label: "Consumable", icon: "🧪" },
  { label: "Material", icon: "◇" }
] as const;

const INVENTORY_PREVIEW_ITEMS = [
  {
    icon: "🗡️",
    name: "Rusty Sword",
    tooltip: "Weapon · Starter blade · Detail popup later"
  },
  {
    icon: "🧪",
    name: "Minor HP Potion",
    tooltip: "Consumable · Restores HP · Detail popup later"
  },
  {
    icon: "🔷",
    name: "Minor MP Potion",
    tooltip: "Consumable · Restores MP · Detail popup later"
  },
  {
    icon: "🍞",
    name: "Stamina Bread",
    tooltip: "Consumable · Restores stamina · Detail popup later"
  },
  {
    icon: "🏨",
    name: "Inn Voucher",
    tooltip: "Voucher · One-night rest · Detail popup later"
  }
];

function getCurrencyBreakdown(totalBronze: number) {
  const safeBronze = Math.max(0, Math.floor(totalBronze));
  const gold = Math.floor(safeBronze / 10_000);
  const silver = Math.floor((safeBronze % 10_000) / 100);
  const bronze = safeBronze % 100;

  return { gold, silver, bronze };
}

export function InventoryOverlay({
  currentCharacter,
  onClose
}: InventoryOverlayProps) {
  const money = getCurrencyBreakdown(currentCharacter.moneyBronze);

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
            {EQUIPMENT_SLOTS.map((slot) => (
              <div
                key={slot.id}
                className={`inventory-equipment-slot inventory-equipment-slot--${slot.className}`}
                aria-label={slot.label}
              >
                <span>{slot.icon}</span>
                <small>{slot.label}</small>
              </div>
            ))}

            <div className="inventory-character-model">
              <div className="inventory-character-model__avatar" aria-hidden="true">
                ◈
              </div>
              <span>Avatar Preview</span>
            </div>
          </div>
        </aside>

        <main className="inventory-bag">
          <div className="inventory-bag-grid">
            {Array.from({ length: 25 }).map((_, index) => {
              const previewItem = INVENTORY_PREVIEW_ITEMS[index];

              return (
                <button
                  key={index}
                  type="button"
                  className={`inventory-bag-cell${
                    previewItem ? " inventory-bag-cell--filled" : ""
                  }`}
                  aria-label={previewItem?.name ?? "Empty slot"}
                  data-tooltip={previewItem?.tooltip}
                >
                  {previewItem ? <span>{previewItem.icon}</span> : null}
                </button>
              );
            })}
          </div>

          <nav className="inventory-type-tabs" aria-label="Inventory filters">
            {INVENTORY_FILTERS.map((filter, index) => (
              <button
                key={filter.label}
                type="button"
                className={`inventory-type-tab${
                  index === 0 ? " inventory-type-tab--active" : ""
                }`}
                aria-label={filter.label}
                data-tooltip={filter.label}
              >
                <span aria-hidden="true">{filter.icon}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </section>
  );
}