import { useEffect, useMemo, useState } from "react";

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
  description: string;
}

const FRAGMENTS_PER_RUNE = 10;

const STAT_DISPLAY_DEFINITIONS: Record<StatKey, StatDisplayDefinition> = {
  STR: {
    label: "Strength",
    icon: "💪",
    description: "Physical force, weapon impact, and direct strike pressure."
  },
  DEX: {
    label: "Dexterity",
    icon: "🎯",
    description: "Precision, evasion, action speed, and agile techniques."
  },
  CON: {
    label: "Constitution",
    icon: "🛡️",
    description: "Health, stamina stability, and physical survivability."
  },
  INT: {
    label: "Intelligence",
    icon: "🧠",
    description: "Spell calculation, magical attack, and arcane scaling."
  },
  WIS: {
    label: "Wisdom",
    icon: "🔮",
    description: "Spiritual control, mana discipline, healing, and resistance."
  },
  LUK: {
    label: "Luck",
    icon: "🎲",
    description: "Critical potential, second chance, and combat procs."
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

export function SanctuaryPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: SanctuaryPanelProps) {
  const [status, setStatus] = useState<CharacterSanctuaryStatusResult | null>(
    null
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
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

  function refineRune(statKey: StatKey) {
    void runSanctuaryAction(
      `refine-${statKey}`,
      () => sanctuaryApi.refineRune(userId, currentCharacter.id, statKey)
    );
  }

  function imbueRune(statKey: StatKey) {
    void runSanctuaryAction(
      `imbue-${statKey}`,
      () => sanctuaryApi.imbueRune(userId, currentCharacter.id, statKey)
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

            const canRefine = fragmentCount >= FRAGMENTS_PER_RUNE;
            const canImbue = runeCount >= 1;
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
                      {statKey} · Base {formatNumber(stat.currentValue)} · Bonus +
                      {formatNumber(stat.accumulatedBonus)}
                    </small>
                    <p>{display.description}</p>
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

                  <button
                    type="button"
                    className="sanctuary-action-button sanctuary-action-button--refine"
                    disabled={!canRefine || Boolean(busyAction)}
                    onClick={() => refineRune(statKey)}
                  >
                    {refineBusy ? "..." : "Refine"}
                  </button>

                  <button
                    type="button"
                    className="sanctuary-action-button sanctuary-action-button--imbue"
                    disabled={!canImbue || Boolean(busyAction)}
                    onClick={() => imbueRune(statKey)}
                  >
                    {imbueBusy ? "..." : "Imbue"}
                  </button>
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
