import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
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
  onReturnToWorldMap: () => void;
}

interface ExplorationJournalGroup {
  id: string;
  messages: string[];
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
  onEncounterFound,
  onReturnToWorldMap
}: ExplorationZoneProps) {
  const zone = EXPLORATION_ZONE_DEFINITIONS[zoneId];
  const journalScrollRef = useRef<HTMLDivElement | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchLogGroups, setSearchLogGroups] = useState<
    ExplorationJournalGroup[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchLogGroups([]);
    setError(null);
  }, [zoneId]);

  useLayoutEffect(() => {
    const journalElement = journalScrollRef.current;

    if (!journalElement) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      journalElement.scrollTop = journalElement.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [searchLogGroups]);

  function appendLogGroup(messages: string[]) {
    const cleanMessages = messages.filter(
      (message) => message.trim().length > 0
    );

    if (cleanMessages.length === 0) {
      return;
    }

    setSearchLogGroups((current) =>
      [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          messages: cleanMessages
        }
      ].slice(-18)
    );
  }

  async function handleSearch() {
    if (isSearching) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const result: ExplorationSearchResult = await explorationApi.search(
        userId,
        {
          characterId: currentCharacter.id,
          zoneId
        }
      );

      onCharacterUpdated(result.character);

      const nextMessages = ["Searching the area...", ...result.log];

      if (result.outcomeType === "encounter" && result.encounterId) {
        nextMessages.push(
          `Encounter found: ${compactLabel(result.encounterId)}. Drawing weapon...`
        );
      }

      appendLogGroup(nextMessages);

      if (result.outcomeType === "encounter" && result.encounterId) {
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
          <Button
            type="button"
            variant="ghost"
            className="exploration-back-button"
            disabled={isSearching}
            onClick={onReturnToWorldMap}
          >
            ← Return to World
          </Button>

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
                {isSearching ? "Searching..." : "Search Area"}
              </strong>
              <span>Cost: {zone.staminaCost} STA / Search</span>
            </button>

            {error ? <div className="exploration-error">{error}</div> : null}
          </div>
        </main>

        <aside className="exploration-journal">
          <div className="exploration-journal__header">
            <span>Exploration Journal</span>
            <i aria-hidden="true" />
          </div>

          <div className="exploration-journal__scroll" ref={journalScrollRef}>
            {searchLogGroups.length > 0 ? (
              searchLogGroups.map((group) => (
                <section key={group.id} className="exploration-journal-group">
                  {group.messages.map((message, index) => (
                    <div
                      key={`${group.id}-${index}`}
                      className={getLogClassName(message)}
                    >
                      {message}
                    </div>
                  ))}
                </section>
              ))
            ) : (
              <div className="exploration-journal-empty">
                Search results will appear here.
              </div>
            )}

          </div>
        </aside>
      </div>
    </section>
  );
}