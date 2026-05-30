import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "../../components/ui/Button";
import { STAT_KEYS } from "../../domain/magisterium.constants";
import type {
  CharacterSanctuaryStatusResult,
  CharacterSnapshot,
  SanctuaryInventoryQuantity,
  StatKey
} from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { sanctuaryApi } from "./sanctuary.api";
import "./sanctuary.css";

interface SanctuaryPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
}

interface StatDisplayDefinition {
  label: string;
  icon: string;
}

const FRAGMENTS_PER_RUNE = 10;

type SanctuaryActionKind = "refine" | "imbue";
type SanctuaryQuantityMode = "one" | "all" | "custom";

interface SanctuaryQuantitySelection {
  mode: SanctuaryQuantityMode;
  customValue: string;
}

const DEFAULT_QUANTITY_SELECTION: SanctuaryQuantitySelection = {
  mode: "one",
  customValue: ""
};

const STAT_DISPLAY_DEFINITIONS: Record<StatKey, StatDisplayDefinition> = {
  STR: {
    label: "Strength",
    icon: "💪"
  },
  DEX: {
    label: "Dexterity",
    icon: "🎯"
  },
  CON: {
    label: "Constitution",
    icon: "🛡️"
  },
  INT: {
    label: "Intelligence",
    icon: "🧠"
  },
  WIS: {
    label: "Wisdom",
    icon: "🔮"
  },
  LUK: {
    label: "Luck",
    icon: "🎲"
  }
};

function getQuantity(
  quantities: SanctuaryInventoryQuantity[],
  statKey: StatKey
): number {
  return quantities.find((item) => item.statKey === statKey)?.quantity ?? 0;
}

function getEffectiveStatValue(
  status: CharacterSanctuaryStatusResult,
  statKey: StatKey
): number {
  const stat = status.character.stats[statKey];

  return stat.currentValue + stat.accumulatedBonus;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getProgressPercent(fragmentCount: number): number {
  return clampPercent((fragmentCount / FRAGMENTS_PER_RUNE) * 100);
}

function formatRankThreshold(status: CharacterSanctuaryStatusResult): string {
  const nextRequirement = status.rankStatus.averageStatRequiredForNextRank;

  if (nextRequirement === undefined) {
    return "Final rank reached";
  }

  return `Next threshold: ${formatNumber(nextRequirement, 1)} AVG`;
}

function getQuantitySelectionKey(
  statKey: StatKey,
  actionKind: SanctuaryActionKind
): string {
  return `${statKey}:${actionKind}`;
}

function getSelectedActionQuantity(
  selection: SanctuaryQuantitySelection,
  maxQuantity: number
): number {
  if (selection.mode === "one") {
    return 1;
  }

  if (selection.mode === "all") {
    return maxQuantity;
  }

  return Math.floor(Number(selection.customValue));
}

function displayStatLabel(statKey: StatKey): string {
  return STAT_DISPLAY_DEFINITIONS[statKey].label;
}

export function SanctuaryPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: SanctuaryPanelProps) {
  const [status, setStatus] = useState<CharacterSanctuaryStatusResult | null>(
    null
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [quantitySelections, setQuantitySelections] = useState<
    Record<string, SanctuaryQuantitySelection>
  >({});
  const [error, setError] = useState<string | null>(null);

  const loading = status === null;

  const orderedStats = useMemo(() => [...STAT_KEYS], []);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setBusyAction("load");
      setError(null);

      try {
        const nextStatus = await sanctuaryApi.getStatus(
          userId,
          currentCharacter.id
        );

        if (cancelled) {
          return;
        }

        setStatus(nextStatus);
        onCharacterUpdated(nextStatus.character);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to commune with The Sanctuary."
        );
      } finally {
        if (!cancelled) {
          setBusyAction(null);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [currentCharacter.id, onCharacterUpdated, userId]);

  async function runSanctuaryAction(
    actionKey: string,
    action: () => Promise<CharacterSanctuaryStatusResult>
  ) {
    if (busyAction) {
      return;
    }

    setBusyAction(actionKey);
    setError(null);

    try {
      const nextStatus = await action();

      setStatus(nextStatus);
      onCharacterUpdated(nextStatus.character);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The ritual failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  function getQuantitySelection(
    statKey: StatKey,
    actionKind: SanctuaryActionKind
  ): SanctuaryQuantitySelection {
    return (
      quantitySelections[getQuantitySelectionKey(statKey, actionKind)] ??
      DEFAULT_QUANTITY_SELECTION
    );
  }

  function updateQuantitySelection(
    statKey: StatKey,
    actionKind: SanctuaryActionKind,
    nextSelection: SanctuaryQuantitySelection
  ) {
    setQuantitySelections((currentSelections) => ({
      ...currentSelections,
      [getQuantitySelectionKey(statKey, actionKind)]: nextSelection
    }));
  }

  function resolveActionQuantity(
    statKey: StatKey,
    actionKind: SanctuaryActionKind,
    maxQuantity: number
  ): number | null {
    const selectedQuantity = getSelectedActionQuantity(
      getQuantitySelection(statKey, actionKind),
      maxQuantity
    );

    if (!Number.isSafeInteger(selectedQuantity) || selectedQuantity <= 0) {
      setError("Enter a positive quantity.");
      return null;
    }

    if (selectedQuantity > maxQuantity) {
      setError(
        actionKind === "refine"
          ? `Not enough ${statKey} fragments to refine ${formatNumber(
              selectedQuantity
            )} rune(s).`
          : `Not enough ${statKey} runes to imbue ${formatNumber(
              selectedQuantity
            )} time(s).`
      );
      return null;
    }

    return selectedQuantity;
  }

  function refineRune(statKey: StatKey, maxQuantity: number) {
    const quantity = resolveActionQuantity(statKey, "refine", maxQuantity);

    if (quantity === null) {
      return;
    }

    void runSanctuaryAction(
      `refine-${statKey}`,
      () =>
        sanctuaryApi.refineRune(
          userId,
          currentCharacter.id,
          statKey,
          quantity
        )
    );
  }

  function imbueRune(statKey: StatKey, maxQuantity: number) {
    const quantity = resolveActionQuantity(statKey, "imbue", maxQuantity);

    if (quantity === null) {
      return;
    }

    void runSanctuaryAction(
      `imbue-${statKey}`,
      () =>
        sanctuaryApi.imbueRune(userId, currentCharacter.id, statKey, quantity)
    );
  }

  function rankUp() {
    if (!status?.rankStatus.isEligibleForRankUp) {
      return;
    }

    void runSanctuaryAction(
      "rank-up",
      () => sanctuaryApi.rankUp(userId, currentCharacter.id)
    );
  }

  function renderQuantityControl(
    statKey: StatKey,
    actionKind: SanctuaryActionKind,
    maxQuantity: number
  ) {
    const selection = getQuantitySelection(statKey, actionKind);
    const disabled = Boolean(busyAction) || maxQuantity <= 0;
    const actionLabel = actionKind === "refine" ? "refine" : "imbue";

    return (
      <div className="sanctuary-quantity-control">
        <select
          aria-label={`${displayStatLabel(statKey)} ${actionLabel} quantity`}
          disabled={disabled}
          value={selection.mode}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            updateQuantitySelection(statKey, actionKind, {
              mode: event.target.value as SanctuaryQuantityMode,
              customValue: selection.customValue
            })
          }
        >
          <option value="one">1</option>
          <option value="all">All</option>
          <option value="custom">Qty</option>
        </select>

        {selection.mode === "custom" ? (
          <input
            aria-label={`${displayStatLabel(statKey)} custom ${actionLabel} quantity`}
            disabled={disabled}
            inputMode="numeric"
            min={1}
            placeholder="0"
            type="number"
            value={selection.customValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateQuantitySelection(statKey, actionKind, {
                mode: "custom",
                customValue: event.target.value
              })
            }
          />
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <section className="sanctuary-panel sanctuary-panel--loading">
        <div className="sanctuary-loading-orb" aria-hidden="true">
          ✦
        </div>
        <strong>Communing with The Sanctuary...</strong>
        {error ? <span>{error}</span> : null}
      </section>
    );
  }

  const rankStatus = status.rankStatus;
  const isRankReady = rankStatus.isEligibleForRankUp;
  const nextRankName = rankStatus.nextRank?.name ?? "Maximum Rank";

  return (
    <section className="sanctuary-panel" aria-label="The Sanctuary">
      <header className="sanctuary-panel__top">
        <div className="sanctuary-panel__identity">
          <span>The Sanctuary</span>
          <div className="sanctuary-panel__icon" aria-hidden="true">
            🏛️
          </div>
        </div>
      </header>

      <div className="sanctuary-panel__body">
        <aside className="sanctuary-altar-card">
          <div className="sanctuary-altar-card__halo" aria-hidden="true" />

          <section
            className={
              isRankReady
                ? "sanctuary-rank-card sanctuary-rank-card--ready"
                : "sanctuary-rank-card"
            }
          >
            <span>Current Rank</span>
            <strong>{rankStatus.currentRank.name}</strong>
          </section>

          <section className="sanctuary-average-card">
            <div>
              <span>Average Potential</span>
              <strong>{formatNumber(rankStatus.averageStatValue, 1)}</strong>
            </div>

            <div>
              <span>Next Rank</span>
              <strong>{nextRankName}</strong>
            </div>

            <div className="sanctuary-rank-progress">
              <span style={{ width: `${clampPercent(rankStatus.progressPercentToNextRank)}%` }} />
            </div>

            <p>{formatRankThreshold(status)}</p>
          </section>

          {error ? (
            <div className="sanctuary-action-error" role="alert">
              {error}
            </div>
          ) : null}

          {isRankReady ? (
            <Button
              type="button"
              className="sanctuary-rankup-button sanctuary-rankup-button--ready"
              disabled={Boolean(busyAction)}
              onClick={rankUp}
            >
              {busyAction === "rank-up" ? "Ascending..." : "Perform Rank Ascension"}
            </Button>
          ) : null}
        </aside>

        <main className="sanctuary-stat-board">
          <header className="sanctuary-stat-board__header">
            <div>
              <h3>Fragments · Runes · Imbuement</h3>
            </div>
          </header>

          <div className="sanctuary-stat-list">
            {orderedStats.map((statKey) => {
              const display = STAT_DISPLAY_DEFINITIONS[statKey];
              const stat = status.character.stats[statKey];
              const effectiveValue = getEffectiveStatValue(status, statKey);
              const fragmentCount = getQuantity(status.fragments, statKey);
              const runeCount = getQuantity(status.runes, statKey);

            const maxRefineQuantity = Math.floor(
              fragmentCount / FRAGMENTS_PER_RUNE
            );
            const maxImbueQuantity = runeCount;
            const canRefine = maxRefineQuantity >= 1;
            const canImbue = maxImbueQuantity >= 1;
            const refineBusy = busyAction === `refine-${statKey}`;
            const imbueBusy = busyAction === `imbue-${statKey}`;

            return (
              <article className="sanctuary-stat-row" key={statKey}>
                <div className="sanctuary-stat-row__identity">
                  <span className="sanctuary-stat-icon" aria-hidden="true">
                    {display.icon}
                  </span>

                  <div>
                    <strong>{display.label}</strong>
                    <small>
                      {statKey} · Bonus +{formatNumber(stat.accumulatedBonus)}
                    </small>
                  </div>
                </div>

                <div className="sanctuary-stat-row__resource">
                  <div className="sanctuary-stat-row__numbers">
                    <span>
                      Fragments{" "}
                      <strong className={canRefine ? "is-ready" : ""}>
                        {formatNumber(fragmentCount)}
                      </strong>
                      /{FRAGMENTS_PER_RUNE}
                    </span>

                    <span>
                      Runes <strong>{formatNumber(runeCount)}</strong>
                    </span>
                  </div>

                  <div className="sanctuary-fragment-track">
                    <span style={{ width: `${getProgressPercent(fragmentCount)}%` }} />
                  </div>
                </div>

                <div className="sanctuary-stat-row__actions">
                  <div className="sanctuary-stat-value">
                    <span>Value</span>
                    <strong>{formatNumber(effectiveValue)}</strong>
                  </div>

                  <div className="sanctuary-action-cluster">
                    <button
                      type="button"
                      className="sanctuary-action-button sanctuary-action-button--refine"
                      disabled={!canRefine || Boolean(busyAction)}
                      onClick={() => refineRune(statKey, maxRefineQuantity)}
                    >
                      {refineBusy ? "..." : "Refine"}
                    </button>
                    {renderQuantityControl(
                      statKey,
                      "refine",
                      maxRefineQuantity
                    )}
                  </div>

                  <div className="sanctuary-action-cluster">
                    <button
                      type="button"
                      className="sanctuary-action-button sanctuary-action-button--imbue"
                      disabled={!canImbue || Boolean(busyAction)}
                      onClick={() => imbueRune(statKey, maxImbueQuantity)}
                    >
                      {imbueBusy ? "..." : "Imbue"}
                    </button>
                    {renderQuantityControl(statKey, "imbue", maxImbueQuantity)}
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        </main>
      </div>
    </section>
  );
}
