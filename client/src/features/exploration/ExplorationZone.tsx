import { useEffect, useMemo, useState } from "react";

import { EXPLORATION_ZONE_DEFINITIONS } from "../../domain/magisterium.constants";
import type {
  CharacterSnapshot,
  EncounterId,
  ExplorationSearchResult,
  ExplorationZoneId
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
import { explorationApi } from "./exploration.api";
import "./exploration.css";

interface ExplorationZoneProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  zoneId: ExplorationZoneId;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onEncounterFound: (encounterId: EncounterId) => void;
  onReturnToWorldMap: () => void;
}

function clampPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function getCurrencyBreakdown(totalBronze: number) {
  const safeTotal = Math.max(0, Math.floor(totalBronze));
  const gold = Math.floor(safeTotal / 10_000);
  const silver = Math.floor((safeTotal % 10_000) / 100);
  const bronze = safeTotal % 100;

  return { gold, silver, bronze };
}

function ResourcePill({
  label,
  value,
  max,
  tone
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mp" | "stamina";
}) {
  return (
    <div className={`exploration-resource exploration-resource--${tone}`}>
      <span>{label}</span>
      <div className="exploration-resource__track">
        <div
          className="exploration-resource__fill"
          style={{ width: `${clampPercent(value, max)}%` }}
        />
      </div>
      <strong>
        {formatNumber(value)} / {formatNumber(max)}
      </strong>
    </div>
  );
}

function getLogClassName(message: string): string {
  if (message.includes("hostile") || message.includes("Warning")) {
    return "exploration-journal-line exploration-journal-line--danger";
  }

  if (message.includes("Bronze") || message.includes("Found")) {
    return "exploration-journal-line exploration-journal-line--reward";
  }

  if (message.includes("Recovered") || message.includes("material")) {
    return "exploration-journal-line exploration-journal-line--item";
  }

  if (message.includes("Searching") || message.includes("Stamina")) {
    return "exploration-journal-line exploration-journal-line--muted";
  }

  return "exploration-journal-line";
}

export function ExplorationZone({
  userId,
  currentCharacter,
  zoneId,
  onCharacterUpdated,
  onEncounterFound,
  onReturnToWorldMap
}: ExplorationZoneProps) {
  const zone = EXPLORATION_ZONE_DEFINITIONS[zoneId];
  const wallet = useMemo(
    () => getCurrencyBreakdown(currentCharacter.moneyBronze),
    [currentCharacter.moneyBronze]
  );

  const [isSearching, setIsSearching] = useState(false);
  const [searchLog, setSearchLog] = useState<string[]>(() => [
    ...zone.entryLog,
    "System: Ready to search. Keep enough stamina before pushing deeper."
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchLog([
      ...zone.entryLog,
      "System: Ready to search. Keep enough stamina before pushing deeper."
    ]);
    setError(null);
  }, [zone]);

  function prependLogs(messages: string[]) {
    setSearchLog((current) => [...messages, ...current].slice(0, 36));
  }

  async function handleSearch() {
    if (isSearching) {
      return;
    }

    setIsSearching(true);
    setError(null);
    prependLogs(["Searching the area..."]);

    try {
      const result: ExplorationSearchResult = await explorationApi.search(
        userId,
        {
          characterId: currentCharacter.id,
          zoneId
        }
      );

      onCharacterUpdated(result.character);
      prependLogs(result.log);

      if (result.outcomeType === "encounter" && result.encounterId) {
        prependLogs([
          `Encounter found: ${compactLabel(result.encounterId)}. Drawing weapon...`
        ]);

        window.setTimeout(() => {
          onEncounterFound(result.encounterId as EncounterId);
        }, 850);
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "Search failed."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="exploration-zone" aria-label="Exploration zone">
      <header className="exploration-topbar">
        <div className="exploration-topbar__identity">
          <strong>{currentCharacter.name}</strong>
          <span>Lv. {currentCharacter.progression.level}</span>
          <em>Origin: {compactLabel(currentCharacter.originId)}</em>
        </div>

        <div className="exploration-topbar__vitals">
          <ResourcePill
            label="HP"
            value={currentCharacter.currentState.hp}
            max={currentCharacter.derivedStats.maxHp}
            tone="hp"
          />
          <ResourcePill
            label="MP"
            value={currentCharacter.currentState.mp}
            max={currentCharacter.derivedStats.maxMp}
            tone="mp"
          />
          <ResourcePill
            label="STA"
            value={currentCharacter.currentState.stamina}
            max={currentCharacter.derivedStats.maxStamina}
            tone="stamina"
          />
        </div>

        <div className="exploration-wallet" aria-label="Wallet">
          <span className="exploration-wallet__gold">
            {formatNumber(wallet.gold)} <small>G</small>
          </span>
          <span className="exploration-wallet__silver">
            {formatNumber(wallet.silver)} <small>S</small>
          </span>
          <span className="exploration-wallet__bronze">
            {formatNumber(wallet.bronze)} <small>B</small>
          </span>
        </div>
      </header>

      <div className="exploration-layout">
        <main className="exploration-main">
          <div className="exploration-main__nav">
            <button
              type="button"
              className="exploration-back-button"
              disabled={isSearching}
              onClick={onReturnToWorldMap}
            >
              ← Back to World Map
            </button>
          </div>

          <div className="exploration-ambient">
            <div className="exploration-ambient__icon" aria-hidden="true">
              {zone.icon}
            </div>
            <div className="exploration-ambient__eyebrow">
              Exploration Area
            </div>
            <h2>{zone.name}</h2>
            <p>{zone.description}</p>

            <div className="exploration-zone-meta">
              <span>
                Danger: <strong>{"◆".repeat(zone.dangerLevel)}</strong>
              </span>
              <span aria-hidden="true">|</span>
              <span>
                Cost: <strong>{zone.staminaCost} STA / Search</strong>
              </span>
            </div>
          </div>

          <div className="exploration-control">
            <button
              type="button"
              className="exploration-search-button"
              disabled={isSearching}
              onClick={() => void handleSearch()}
            >
              <strong>
                {isSearching ? "Searching the area..." : "Search Area"}
              </strong>
              <span>
                {isSearching
                  ? "Listening for movement and hidden traces."
                  : "Server rolls for encounter, loot, or silence."}
              </span>
            </button>

            {error ? <div className="exploration-error">{error}</div> : null}
          </div>
        </main>

        <aside className="exploration-journal">
          <div className="exploration-journal__header">
            <span>Exploration Journal</span>
            <i aria-hidden="true" />
          </div>

          <div className="exploration-journal__scroll">
            {searchLog.map((message, index) => (
              <div key={`${message}-${index}`} className={getLogClassName(message)}>
                {message}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
