import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot, ItemId } from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import {
  type MarketCatalog,
  type MarketCatalogItem,
  type MarketVendor,
  marketApi
} from "./market.api";
import "./market.css";

interface MarketPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
}

type MarketFilter = "all" | string;

const ITEM_ICONS: Record<string, string> = {
  fresh_potato: "🥔",
  plump_wheat: "🌾",
  gathered_egg: "🥚",
  sweet_carrot: "🥕",
  red_onion: "🧅",
  fresh_milk: "🥛",
  hot_chili: "🌶️",
  moon_turnip: "🌙",
  green_herb: "🌿",
  clear_glass_vial: "🧪",
  basic_solvent: "💧",
  cooking_salt: "🧂",
  pressed_seed_oil: "🫙",
  slime_gel: "🟢",
  boar_meat: "🥩",
  wolf_skin: "🐺",
  goblin_ear: "👂",
  cracked_dagger: "🗡️"
};

const FILTER_PRIORITY = [
  "cooking",
  "vegetable",
  "grain",
  "alchemy",
  "herb",
  "container",
  "seasoning",
  "material",
  "loot"
];

function getItemIcon(itemId: ItemId): string {
  return ITEM_ICONS[itemId] ?? "◇";
}

function formatRestockTime(nextRestockAt: string): string {
  const targetTime = new Date(nextRestockAt).getTime();

  if (!Number.isFinite(targetTime)) {
    return "Unknown";
  }

  const diffMs = Math.max(0, targetTime - Date.now());
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function getVendorStatusLabel(vendor: MarketVendor): string {
  if (vendor.unlockState === "open") {
    return "Open";
  }

  if (vendor.unlockState === "rumored") {
    return "???";
  }

  return "Locked";
}

function getVendorTone(vendor: MarketVendor): string {
  if (vendor.unlockState === "rumored") {
    return "rumor";
  }

  if (vendor.id.includes("herb")) {
    return "herbalist";
  }

  if (vendor.id.includes("butcher") || vendor.id.includes("meat")) {
    return "butcher";
  }

  if (vendor.id.includes("general")) {
    return "general";
  }

  return "farmer";
}

function getFilterLabel(filter: MarketFilter): string {
  if (filter === "all") {
    return "All Items";
  }

  return filter
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildVendorFilters(vendor: MarketVendor | null): MarketFilter[] {
  if (!vendor) {
    return ["all"];
  }

  const itemTags = new Set(vendor.items.flatMap((item) => [...item.tags]));

  const priorityFilters = FILTER_PRIORITY.filter((tag) => itemTags.has(tag));
  const remainingFilters = Array.from(itemTags)
    .filter(
      (tag) =>
        !FILTER_PRIORITY.includes(tag) &&
        tag !== "market" &&
        tag !== vendor.id
    )
    .slice(0, 4);

  return ["all", ...priorityFilters, ...remainingFilters].slice(0, 6);
}

function filterVendorItems(
  vendor: MarketVendor | null,
  activeFilter: MarketFilter
): MarketCatalogItem[] {
  if (!vendor) {
    return [];
  }

  if (activeFilter === "all") {
    return vendor.items;
  }

  return vendor.items.filter((item) => item.tags.includes(activeFilter));
}

function getDefaultVendor(catalog: MarketCatalog | null): MarketVendor | null {
  if (!catalog || catalog.vendors.length === 0) {
    return null;
  }

  return (
    catalog.vendors.find((vendor) => vendor.unlockState === "open") ??
    catalog.vendors[0] ??
    null
  );
}

export function MarketPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: MarketPanelProps) {
  const [catalog, setCatalog] = useState<MarketCatalog | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [activeFilter, setActiveFilter] = useState<MarketFilter>("all");
  const [busyItemId, setBusyItemId] = useState<ItemId | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedVendor = useMemo(() => {
    if (!catalog) {
      return null;
    }

    return (
      catalog.vendors.find((vendor) => vendor.id === selectedVendorId) ??
      getDefaultVendor(catalog)
    );
  }, [catalog, selectedVendorId]);

  const vendorFilters = useMemo(
    () => buildVendorFilters(selectedVendor),
    [selectedVendor]
  );

  const visibleItems = useMemo(
    () => filterVendorItems(selectedVendor, activeFilter),
    [activeFilter, selectedVendor]
  );

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

        const defaultVendor = getDefaultVendor(nextCatalog);
        setSelectedVendorId(defaultVendor?.id ?? "");
        setActiveFilter("all");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load market catalog."
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

  useEffect(() => {
    if (!notice && !error) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 2800);

    return () => window.clearTimeout(timerId);
  }, [notice, error]);

  function selectVendor(vendor: MarketVendor) {
    if (busyItemId) {
      return;
    }

    setSelectedVendorId(vendor.id);
    setActiveFilter("all");
    setNotice(null);
    setError(null);
  }

  async function buyItem(item: MarketCatalogItem) {
    if (!selectedVendor || busyItemId || item.currentStock <= 0) {
      return;
    }

    if (selectedVendor.unlockState !== "open") {
      setError("This vendor is not available yet.");
      return;
    }

    if (currentCharacter.moneyBronze < item.buyPriceBronze) {
      setError(`Not enough Bronze to buy ${item.name}.`);
      return;
    }

    setBusyItemId(item.itemId);
    setNotice(null);
    setError(null);

    try {
      const result = await marketApi.buy(userId, {
        characterId: currentCharacter.id,
        itemId: item.itemId,
        quantity: 1
      });

      onCharacterUpdated(result.character);

      const nextCatalog = await marketApi.getCatalog(userId);
      setCatalog(nextCatalog);

      setNotice(`Bought 1x ${item.name} for ${item.buyPriceBronze} Bronze.`);
    } catch (buyError) {
      setError(
        buyError instanceof Error ? buyError.message : "Purchase failed."
      );
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <section className="market-basic-card" aria-label="Market">
      <header className="market-basic-card__top">
        <div className="market-basic-card__identity">
          <span>Market</span>
          <div className="market-basic-card__icon" aria-hidden="true">
            🧺
          </div>
        </div>
      </header>

      <div className="market-basic-card__body">
        <aside className="market-vendor-list" aria-label="Market vendors">
          <div className="market-section-title">Vendors</div>

          {loading ? (
            <div className="market-muted-box">Loading market...</div>
          ) : catalog && catalog.vendors.length > 0 ? (
            <div className="market-vendor-scroll">
              {catalog.vendors.map((vendor) => {
                const isSelected = selectedVendor?.id === vendor.id;
                const tone = getVendorTone(vendor);

                return (
                  <button
                    key={vendor.id}
                    type="button"
                    className={[
                      "market-vendor-card",
                      `market-vendor-card--${tone}`,
                      isSelected ? "market-vendor-card--active" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={Boolean(busyItemId)}
                    onClick={() => selectVendor(vendor)}
                  >
                    <span className="market-vendor-card__icon" aria-hidden="true">
                      {vendor.icon}
                    </span>

                    <span className="market-vendor-card__copy">
                      <strong>{vendor.name}</strong>
                      <em>{vendor.role}</em>
                    </span>

                    <span
                      className={`market-vendor-card__status market-vendor-card__status--${vendor.unlockState}`}
                    >
                      {getVendorStatusLabel(vendor)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="market-muted-box">No vendors available.</div>
          )}
        </aside>

        <main className="market-trading-panel">
          {selectedVendor ? (
            <>
              <div className="market-vendor-header">
                <div>
                  <h3>{selectedVendor.name}</h3>
                </div>

                <div className="market-restock-pill">
                  Next Restock
                  <strong>
                    {selectedVendor.items[0]
                      ? formatRestockTime(selectedVendor.items[0].nextRestockAt)
                      : "—"}
                  </strong>
                </div>
              </div>

              <div className="market-filter-row" aria-label="Market filters">
                {vendorFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={
                      filter === activeFilter
                        ? "market-filter-button market-filter-button--active"
                        : "market-filter-button"
                    }
                    disabled={Boolean(busyItemId)}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {getFilterLabel(filter)}
                  </button>
                ))}
              </div>

              <div className="market-item-scroll">
                {visibleItems.length > 0 ? (
                  <div className="market-item-grid">
                    {visibleItems.map((item) => {
                      const isOutOfStock = item.currentStock <= 0;
                      const cannotAfford =
                        currentCharacter.moneyBronze < item.buyPriceBronze;
                      const isBusy = busyItemId === item.itemId;

                      return (
                        <article key={item.itemId} className="market-item-card">
                          <div className="market-item-card__icon" aria-hidden="true">
                            {getItemIcon(item.itemId)}
                          </div>

                          <div className="market-item-card__copy">
                            <div className="market-item-card__title-row">
                              <strong>{item.name}</strong>
                              <span>{item.buyPriceBronze} B</span>
                            </div>

                            <p>{item.description}</p>

                            <div className="market-item-card__meta">
                              <span>Stock: {formatNumber(item.currentStock)}</span>
                              <span>{item.rarity}</span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            className="market-buy-button"
                            disabled={
                              isBusy ||
                              Boolean(busyItemId) ||
                              isOutOfStock ||
                              cannotAfford ||
                              selectedVendor.unlockState !== "open"
                            }
                            onClick={() => void buyItem(item)}
                          >
                            {isBusy
                              ? "..."
                              : isOutOfStock
                                ? "Sold"
                                : cannotAfford
                                  ? "No ₿"
                                  : "Buy"}
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="market-empty-state">
                    No items match this filter.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="market-empty-state">
              Choose a vendor to browse supplies.
            </div>
          )}
        </main>
      </div>

      {notice || error ? (
        <footer className="market-basic-card__footer">
          {notice ? (
            <strong className="market-message market-message--success">
              {notice}
            </strong>
          ) : null}

          {error ? (
            <strong className="market-message market-message--error">
              {error}
            </strong>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}
