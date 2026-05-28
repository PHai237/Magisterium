import { useEffect, useMemo, useState } from "react";

import type {
  CharacterSnapshot,
  ItemId,
  MarketCatalog,
  MarketCatalogItem,
  MarketVendor
} from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { marketApi } from "./market.api";
import "./market.css";

interface MarketPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
}

interface MarketJournalEntry {
  id: string;
  tone: "neutral" | "success" | "error" | "rumor";
  message: string;
}

const ITEM_ICONS: Record<string, string> = {
  fresh_potato: "🥔",
  plump_wheat: "🌾",
  gathered_egg: "🥚",
  moon_turnip: "🌙",
  green_herb: "🌿",
  clear_glass_vial: "⚗",
  basic_solvent: "🧴",
  cooking_salt: "🧂",
  pressed_seed_oil: "🫙",
  slime_gel: "🟢"
};

function getItemIcon(itemId: ItemId): string {
  return ITEM_ICONS[itemId] ?? "◇";
}

function getInitialVendorId(catalog: MarketCatalog | null): string | null {
  return catalog?.vendors.find((vendor) => vendor.unlockState === "open")?.id ?? null;
}

function getRestockLabel(restockAt: string, now: number): string {
  const restockTime = new Date(restockAt).getTime();
  const remainingMs = Math.max(0, restockTime - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function getVendorRestockLabel(vendor: MarketVendor | undefined, now: number): string {
  const restockTimes = vendor?.items.map((item) => item.nextRestockAt) ?? [];

  if (restockTimes.length === 0) {
    return "No scheduled stock";
  }

  const nearestRestockAt = restockTimes.sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime()
  )[0];

  return getRestockLabel(nearestRestockAt, now);
}

function getRarityTone(item: MarketCatalogItem): string {
  return item.rarity === "rare"
    ? "market-item-card--rare"
    : item.rarity === "uncommon"
      ? "market-item-card--uncommon"
      : "";
}

function createJournalEntry(
  message: string,
  tone: MarketJournalEntry["tone"] = "neutral"
): MarketJournalEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tone,
    message
  };
}

export function MarketPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: MarketPanelProps) {
  const [catalog, setCatalog] = useState<MarketCatalog | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<ItemId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [journal, setJournal] = useState<MarketJournalEntry[]>(() => [
    createJournalEntry(
      "Farmer Stall is open. Local supply wagons reached the plaza this morning."
    )
  ]);

  const activeVendor = useMemo(
    () => catalog?.vendors.find((vendor) => vendor.id === activeVendorId),
    [activeVendorId, catalog]
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setError(null);

      try {
        const nextCatalog = await marketApi.getCatalog(userId);

        if (cancelled) {
          return;
        }

        setCatalog(nextCatalog);
        setActiveVendorId((current) => current ?? getInitialVendorId(nextCatalog));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load market."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function pushJournal(message: string, tone: MarketJournalEntry["tone"] = "neutral") {
    setJournal((current) => [createJournalEntry(message, tone), ...current].slice(0, 18));
  }

  async function refreshCatalog() {
    const nextCatalog = await marketApi.getCatalog(userId);
    setCatalog(nextCatalog);
    setActiveVendorId((current) => current ?? getInitialVendorId(nextCatalog));
  }

  async function buyItem(item: MarketCatalogItem) {
    if (busyItemId || item.currentStock <= 0) {
      return;
    }

    setBusyItemId(item.itemId);
    setError(null);

    try {
      const result = await marketApi.buy(userId, {
        characterId: currentCharacter.id,
        itemId: item.itemId,
        quantity: 1
      });

      onCharacterUpdated(result.character);
      pushJournal(
        `Purchased 1x ${item.name} for ${formatNumber(item.buyPriceBronze)} Bronze.`,
        "success"
      );
      await refreshCatalog();
    } catch (buyError) {
      const message =
        buyError instanceof Error ? buyError.message : "Purchase failed.";

      setError(message);
      pushJournal(message, "error");
    } finally {
      setBusyItemId(null);
    }
  }

  function openRumor() {
    pushJournal(
      "A quiet trader says the cellar market will open once free merchants and player listings arrive.",
      "rumor"
    );
  }

  return (
    <section className="market-panel" aria-label="Town marketplace">
      <main className="market-main">
        <header className="market-heading">
          <div>
            <p>Supply Market</p>
            <h2>The Town Marketplace</h2>
            <span>
              Reliable ingredients for cooking, alchemy, and later profession work.
            </span>
          </div>

          <button type="button" className="market-rumor-button" onClick={openRumor}>
            <span aria-hidden="true">🕯</span>
            Listen to Rumors
          </button>
        </header>

        <nav className="market-stall-tabs" aria-label="Market stalls">
          {catalog?.vendors.map((vendor) => (
            <button
              key={vendor.id}
              type="button"
              className={
                vendor.id === activeVendorId
                  ? "market-stall-tab market-stall-tab--active"
                  : "market-stall-tab"
              }
              disabled={vendor.unlockState !== "open"}
              onClick={() => setActiveVendorId(vendor.id)}
            >
              <span aria-hidden="true">{vendor.icon}</span>
              <strong>{vendor.name}</strong>
              <small>{vendor.role}</small>
            </button>
          ))}
        </nav>

        <div className="market-content">
          {loading ? <div className="market-state">Loading market stock...</div> : null}

          {!loading && error ? (
            <div className="market-state market-state--error">{error}</div>
          ) : null}

          {!loading && activeVendor ? (
            <>
              <div className="market-vendor-summary">
                <strong>{activeVendor.name}</strong>
                <span>{activeVendor.description}</span>
              </div>

              <div className="market-item-grid">
                {activeVendor.items.map((item) => (
                  <article
                    key={item.itemId}
                    className={`market-item-card ${getRarityTone(item)}`}
                  >
                    <div className="market-item-card__icon" aria-hidden="true">
                      {getItemIcon(item.itemId)}
                    </div>

                    <div className="market-item-card__copy">
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                      <span>
                        Stock:{" "}
                        <b className={item.currentStock <= 0 ? "market-stock-empty" : ""}>
                          {formatNumber(item.currentStock)}
                        </b>
                        /{formatNumber(item.maxStock)}
                      </span>
                    </div>

                    <div className="market-item-card__buy">
                      <span>{formatNumber(item.buyPriceBronze)} B</span>
                      <button
                        type="button"
                        disabled={busyItemId !== null || item.currentStock <= 0}
                        onClick={() => void buyItem(item)}
                      >
                        {busyItemId === item.itemId ? "..." : "Buy"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <footer className="market-restock">
          <span>Wallet: {formatNumber(currentCharacter.moneyBronze)} Bronze</span>
          <span>
            Next stock rotation:{" "}
            <strong>{getVendorRestockLabel(activeVendor, now)}</strong>
          </span>
        </footer>
      </main>

      <aside className="market-journal" aria-label="Market journal">
        <header>
          <span>Market Journal</span>
          <i aria-hidden="true" />
        </header>

        <div className="market-journal__scroll">
          {journal.map((entry) => (
            <div
              key={entry.id}
              className={`market-journal-line market-journal-line--${entry.tone}`}
            >
              {entry.message}
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
