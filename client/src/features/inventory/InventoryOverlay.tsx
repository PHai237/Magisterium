import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { compactLabel } from "../../lib/format";
import "./inventory.css";

interface InventoryOverlayProps {
  currentCharacter: CharacterSnapshot;
  onClose: () => void;
}

const EQUIPMENT_SLOTS = [
  { id: "weapon", label: "Weapon", icon: "⚔️", className: "slot-weapon" },
  { id: "head", label: "Head", icon: "◌", className: "slot-head" },
  { id: "armor", label: "Armor", icon: "◌", className: "slot-armor" },
  { id: "offhand", label: "Off-hand", icon: "◌", className: "slot-offhand" },
  { id: "accessory", label: "Accessory", icon: "◌", className: "slot-accessory" },
  { id: "boots", label: "Boots", icon: "◌", className: "slot-boots" }
] as const;

const INVENTORY_PREVIEW_ITEMS = ["🗡️", "🧪", "🔷", "🍞", "🏨", "◇"];

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function InventoryOverlay({
  currentCharacter,
  onClose
}: InventoryOverlayProps) {
  return (
    <section className="inventory-overlay" aria-label="Inventory">
      <header className="inventory-overlay__header">
        <div>
          <p>Inventory</p>
          <h2>Character Bag</h2>
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
          <div className="inventory-paperdoll__identity">
            <strong>{currentCharacter.name}</strong>
            <span>
              Lv. {currentCharacter.progression.level} ·{" "}
              {compactLabel(currentCharacter.originId)}
            </span>
          </div>

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
              <div className="inventory-character-model__avatar">
                {getInitialLetter(currentCharacter.name)}
              </div>
              <span>Avatar Preview</span>
            </div>
          </div>
        </aside>

        <main className="inventory-bag">
          <div className="inventory-bag__title">
            <strong>Bag Slots</strong>
            <span>Backend connection comes next.</span>
          </div>

          <div className="inventory-bag-grid">
            {Array.from({ length: 30 }).map((_, index) => {
              const previewItem = INVENTORY_PREVIEW_ITEMS[index];

              return (
                <button
                  key={index}
                  type="button"
                  className={`inventory-bag-cell${
                    previewItem ? " inventory-bag-cell--filled" : ""
                  }`}
                  aria-label={previewItem ? "Preview item slot" : "Empty slot"}
                >
                  {previewItem ? <span>{previewItem}</span> : null}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </section>
  );
}