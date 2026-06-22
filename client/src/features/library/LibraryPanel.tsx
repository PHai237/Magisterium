import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { renderItemIcon } from "../items/itemAssets";
import { renderMonsterIcon } from "../monsters/monsterAssets";
import {
  libraryApi,
  type LibraryBestiaryResult,
  type LibraryMonsterRecord,
} from "./library.api";
import "./library.css";

interface LibraryPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onBack: () => void;
}

const MONSTER_ICON: Record<string, string> = {
  slime: "S",
  horned_rabbit: "R",
  razorwing_hawk: "H",
  wild_boar: "B",
  wild_wolf: "W",
  bear: "B",
  goblin: "G",
  spider: "S",
  ore_mite: "O",
};

export function LibraryPanel({
  userId,
  currentCharacter,
  onBack,
}: LibraryPanelProps) {
  const [bestiary, setBestiary] = useState<LibraryBestiaryResult | null>(null);
  const [selectedMonsterId, setSelectedMonsterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [librarianMessage, setLibrarianMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBestiary() {
      setLoading(true);
      setError(null);
      try {
        const result = await libraryApi.getBestiary(
          userId,
          currentCharacter.id,
        );
        if (cancelled) return;
        setBestiary(result);
        setSelectedMonsterId(
          result.monsters.find((monster) => monster.unlocked)?.monsterId ??
            result.monsters[0]?.monsterId ??
            "",
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to open the Bestiary.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadBestiary();
    return () => {
      cancelled = true;
    };
  }, [currentCharacter.id, userId]);

  const selectedMonster = useMemo(
    () =>
      bestiary?.monsters.find(
        (monster) => monster.monsterId === selectedMonsterId,
      ) ??
      bestiary?.monsters[0] ??
      null,
    [bestiary, selectedMonsterId],
  );

  return (
    <section className="library-panel" aria-label="The Library">
      <header className="library-panel__topbar">
        <Button type="button" variant="ghost" onClick={onBack}>
          Return
        </Button>
        <div className="library-panel__title">
          <span>The Library</span>
          <div aria-hidden="true">📚</div>
        </div>
      </header>

      <div className="library-panel__body">
        <aside className="library-catalog">
          <div className="library-catalog__heading">
            <div>
              <span>Collections</span>
              <h2>Bestiary</h2>
            </div>
            <strong>
              {bestiary?.unlockedRecords ?? 0}/{bestiary?.totalRecords ?? 0}
            </strong>
          </div>

          <div className="library-librarian">
            <div>
              <span>Head Librarian</span>
              <strong>Elara the Librarian</strong>
            </div>
            <button
              type="button"
              onClick={() =>
                setLibrarianMessage(
                  "Defeat creatures and claim their rewards. The Library preserves only what you have truly discovered.",
                )
              }
            >
              Talk
            </button>
          </div>

          {librarianMessage ? (
            <div className="library-librarian__message">
              “{librarianMessage}”
            </div>
          ) : null}

          <div className="library-record-list">
            {loading ? (
              <div className="library-empty-state">Opening the records...</div>
            ) : error ? (
              <div className="library-empty-state library-empty-state--error">
                {error}
              </div>
            ) : (
              bestiary?.monsters.map((monster, index) => (
                <button
                  key={monster.monsterId}
                  type="button"
                  className={
                    selectedMonster?.monsterId === monster.monsterId
                      ? "library-record library-record--active"
                      : "library-record"
                  }
                  onClick={() => setSelectedMonsterId(monster.monsterId)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span
                    className={
                      monster.unlocked
                        ? "library-record__icon"
                        : "library-record__icon library-record__icon--locked"
                    }
                    aria-hidden="true"
                  >
                    {monster.unlocked
                      ? renderMonsterIcon({
                          monsterId: monster.monsterId,
                          fallback: MONSTER_ICON[monster.monsterId] ?? "?",
                        })
                      : "?"}
                  </span>
                  <span className="library-record__copy">
                    <strong>{monster.name}</strong>
                    <small>
                      {monster.unlocked
                        ? `Defeated ${monster.defeatCount}`
                        : "Undiscovered"}
                    </small>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="library-record-detail">
          {selectedMonster ? (
            selectedMonster.unlocked ? (
              <UnlockedRecord monster={selectedMonster} />
            ) : (
              <div className="library-locked-record">
                <div aria-hidden="true">?</div>
                <span>Sealed Record</span>
                <h2>???</h2>
                <p>
                  Defeat this creature and claim its reward to reveal the
                  record.
                </p>
              </div>
            )
          ) : (
            <div className="library-empty-state">No record selected.</div>
          )}
        </main>
      </div>
    </section>
  );
}

function UnlockedRecord({ monster }: { monster: LibraryMonsterRecord }) {
  return (
    <article className="library-monster-record">
      <header>
        <div className="library-monster-record__portrait" aria-hidden="true">
          {renderMonsterIcon({
            monsterId: monster.monsterId,
            fallback: MONSTER_ICON[monster.monsterId] ?? "?",
          })}
        </div>
        <div>
          <span>{monster.rank ?? "normal"} record</span>
          <h2>{monster.name}</h2>
          <small>Defeated {monster.defeatCount} time(s)</small>
        </div>
      </header>

      <p>{monster.description}</p>

      <section className="library-record-section">
        <span>Known Habitat</span>
        <div className="library-zone-list">
          {monster.zoneNames.map((zoneName) => (
            <strong key={zoneName}>{zoneName}</strong>
          ))}
        </div>
      </section>

      <section className="library-record-section">
        <span>Discovered Drops</span>
        <div className="library-drop-grid">
          {monster.drops.map((drop, index) => (
            <div
              key={`${drop.itemId ?? "locked"}-${index}`}
              className={
                drop.discovered
                  ? "library-drop"
                  : "library-drop library-drop--locked"
              }
            >
              <span aria-hidden="true">
                {drop.discovered && drop.itemId
                  ? renderItemIcon({ itemId: drop.itemId, fallback: "◇" })
                  : "?"}
              </span>
              <strong>{drop.name}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="library-record-note">
        Exact combat statistics are not recorded in the Bestiary.
      </div>
    </article>
  );
}
