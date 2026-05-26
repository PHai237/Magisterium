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
  one_night_inn_voucher: "🏨"
};

function getStartingKitItemIcon(itemId: ItemId): string {
  return STARTING_KIT_ITEM_ICONS[itemId] ?? "◇";
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