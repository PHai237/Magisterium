interface GameActionBarProps {
  isInventoryOpen: boolean;
  onToggleInventory: () => void;
}

export function GameActionBar({
  isInventoryOpen,
  onToggleInventory
}: GameActionBarProps) {
  return (
    <footer className="gameshell-actionbar" aria-label="Game actions">
      <button
        type="button"
        className={`gameshell-actionbar__inventory${
          isInventoryOpen ? " gameshell-actionbar__inventory--active" : ""
        }`}
        aria-label={isInventoryOpen ? "Close inventory" : "Open inventory"}
        aria-pressed={isInventoryOpen}
        data-tooltip={isInventoryOpen ? "Close Inventory" : "Inventory"}
        onClick={onToggleInventory}
      >
        <span aria-hidden="true">🎒</span>
      </button>
    </footer>
  );
}