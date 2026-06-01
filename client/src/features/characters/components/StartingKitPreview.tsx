import type {
  CharacterCreationPreview,
  ItemId
} from "../../../domain/magisterium.types";

interface StartingKitPreviewProps {
  preview: CharacterCreationPreview | null;
  previewBusy: boolean;
}

const STARTING_KIT_ITEM_ICONS: Record<string, string> = {
  stamina_bread: "🍞",
  minor_hp_potion: "🧪",
  minor_mp_potion: "🔷",
  one_night_inn_voucher: "🎟️"
};

const STARTING_KIT_ITEM_HINTS: Record<string, string> = {
  stamina_bread: "Restores a small amount of stamina.",
  minor_hp_potion: "Heals 10 HP.",
  minor_mp_potion: "Restores 10 MP.",
  one_night_inn_voucher: "Redeem at The Inn for one full overnight rest."
};

function getStartingKitItemIcon(itemId: ItemId): string {
  return STARTING_KIT_ITEM_ICONS[itemId] ?? "◇";
}

function getStartingKitItemHint(itemId: ItemId): string {
  return STARTING_KIT_ITEM_HINTS[itemId] ?? "Useful starter item.";
}

function formatQuantity(quantity: number): string {
  return `${quantity}x`;
}

export function StartingKitPreview({
  preview,
  previewBusy
}: StartingKitPreviewProps) {
  return (
    <div className="character-create-card character-starting-kit-card">
      <div className="character-card-title">Starting Kit</div>

      <div className="starting-kit-list">
        <div className="starting-kit-item">
          <span className="starting-kit-icon">🪙</span>
          <span className="starting-kit-qty">
            {preview?.startingKit.moneyBronze ?? "—"}
          </span>
          <span className="starting-kit-name">Bronze</span>
        </div>

        {preview?.startingKit.items.map((item) => (
          <div key={item.itemId} className="starting-kit-item">
            <span className="starting-kit-icon">
              {getStartingKitItemIcon(item.itemId)}
            </span>
            <span className="starting-kit-qty">
              {formatQuantity(item.quantity)}
            </span>
            <span className="starting-kit-name">{item.name}</span>

            <button
              type="button"
              className="character-info-dot starting-kit-info-dot"
              aria-label={`What does ${item.name} do?`}
              data-tooltip={getStartingKitItemHint(item.itemId)}
            >
              !
            </button>
          </div>
        ))}

        {!preview && previewBusy ? (
          <div className="starting-kit-item">
            <span className="starting-kit-icon">◇</span>
            <span className="starting-kit-qty">—</span>
            <span className="starting-kit-name">Loading...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
