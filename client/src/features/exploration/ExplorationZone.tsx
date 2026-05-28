import { useEffect, useRef, useState } from "react";

import { EXPLORATION_ZONE_DEFINITIONS } from "../../domain/magisterium.constants";
import type {
  CharacterSnapshot,
  EncounterId,
  ExplorationSearchResult,
  ExplorationZoneId
} from "../../domain/magisterium.types";
import { compactLabel } from "../../lib/format";
import { explorationApi } from "./exploration.api";
import "./exploration.css";

interface ExplorationZoneProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  zoneId: ExplorationZoneId;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onEncounterFound: (encounterId: EncounterId) => void;
}

function getLogClassName(message: string): string {
  if (
    message.includes("hostile") ||
    message.includes("Encounter") ||
    message.includes("Drawing weapon") ||
    message.includes("Warning")
  ) {
    return "exploration-journal-line exploration-journal-line--danger";
  }

  if (
    message.includes("Bronze") ||
    message.includes("Found") ||
    message.includes("coin")
  ) {
    return "exploration-journal-line exploration-journal-line--reward";
  }

  if (
    message.includes("Recovered") ||
    message.includes("material") ||
    message.includes("item")
  ) {
    return "exploration-journal-line exploration-journal-line--item";
  }

  if (
    message.includes("Searching") ||
    message.includes("Stamina") ||
    message.includes("Nothing")
  ) {
    return "exploration-journal-line exploration-journal-line--muted";
  }

  return "exploration-journal-line";
}

export function ExplorationZone({
  userId,
  currentCharacter,
  zoneId,
  onCharacterUpdated,
  onEncounterFound
}: ExplorationZoneProps) {
  const zone = EXPLORATION_ZONE_DEFINITIONS[zoneId];
  const journalEndRef = useRef<HTMLDivElement | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchLog([]);
    setError(null);
  }, [zoneId]);

  useEffect(() => {
    journalEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [searchLog]);

  function appendLogs(messages: string[]) {
    const cleanMessages = messages.filter((message) => message.trim().length > 0);

    if (cleanMessages.length === 0) {
      return;
    }

    setSearchLog((current) => [...current, ...cleanMessages].slice(-36));
  }

  async function handleSearch() {
    if (isSearching) {
      return;
    }

    setIsSearching(true);
    setError(null);
    appendLogs(["Searching the area..."]);

    try {
      const result: ExplorationSearchResult = await explorationApi.search(
        userId,
        {
          characterId: currentCharacter.id,
          zoneId
        }
      );

      onCharacterUpdated(result.character);
      appendLogs(result.log);

      if (result.outcomeType === "encounter" && result.encounterId) {
        appendLogs([
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
      <div className="exploration-layout">
        <main className="exploration-main">
          <div className="exploration-ambient">
            <div className="exploration-ambient__icon" aria-hidden="true">
              {zone.icon}
            </div>

            <div className="exploration-ambient__eyebrow">
              Exploration Area
            </div>

            <h2>{zone.name}</h2>

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
                  ? "Scanning the zone..."
                  : "Search for encounters, loot, or traces."}
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
            {searchLog.length > 0 ? (
              searchLog.map((message, index) => (
                <div
                  key={`${message}-${index}`}
                  className={getLogClassName(message)}
                >
                  {message}
                </div>
              ))
            ) : (
              <div className="exploration-journal-empty">
                Search results will appear here.
              </div>
            )}

            <div ref={journalEndRef} />
          </div>
        </aside>
      </div>
    </section>
  );
}