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

type LibraryCollectionId = "bestiary" | "items" | "spells" | "lore";

interface LibraryCollection {
  id: LibraryCollectionId;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
}

const COLLECTIONS: LibraryCollection[] = [
  {
    id: "bestiary",
    name: "Bestiary",
    subtitle: "Creatures & Drops",
    icon: "◆",
    description:
      "Records of creatures defeated by this character and the rewards personally recovered from them.",
  },
  {
    id: "items",
    name: "Item Records",
    subtitle: "Equipment & Materials",
    icon: "◇",
    description:
      "A future archive for equipment, materials, consumables and their known uses.",
  },
  {
    id: "spells",
    name: "Spell Studies",
    subtitle: "Magic & Runes",
    icon: "✦",
    description:
      "A future study hall for learning spells, researching runes and recording magical discoveries.",
  },
  {
    id: "lore",
    name: "World Records",
    subtitle: "People & History",
    icon: "▤",
    description:
      "A future collection for places, people, quests and fragments of the world's history.",
  },
];

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
  const [activeCollectionId, setActiveCollectionId] =
    useState<LibraryCollectionId>("bestiary");
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

  const activeCollection =
    COLLECTIONS.find((collection) => collection.id === activeCollectionId) ??
    COLLECTIONS[0]!;

  const selectedMonster = useMemo(
    () =>
      bestiary?.monsters.find(
        (monster) => monster.monsterId === selectedMonsterId,
      ) ??
      bestiary?.monsters[0] ??
      null,
    [bestiary, selectedMonsterId],
  );

  function selectCollection(collectionId: LibraryCollectionId) {
    setActiveCollectionId(collectionId);
    setLibrarianMessage(null);
  }

  return (
    <section className="library-panel" aria-label="The Library">
      <header className="library-panel__topbar">
        <Button type="button" variant="ghost" onClick={onBack}>
          Return
        </Button>

        <div className="library-panel__title">
          <span>The Library</span>
          <div aria-hidden="true">▤</div>
        </div>
      </header>

      <div className="library-panel__body">
        <aside className="library-collections" aria-label="Collections">
          <div className="library-column-heading">
            <span>Library Wing</span>
            <h2>Collections</h2>
          </div>

          <div className="library-collection-list">
            {COLLECTIONS.map((collection) => {
              const isActive = collection.id === activeCollectionId;

              return (
                <button
                  key={collection.id}
                  type="button"
                  className={
                    isActive
                      ? "library-collection library-collection--active"
                      : "library-collection"
                  }
                  aria-pressed={isActive}
                  onClick={() => selectCollection(collection.id)}
                >
                  <span className="library-collection__icon" aria-hidden="true">
                    {collection.icon}
                  </span>
                  <span className="library-collection__copy">
                    <strong>{collection.name}</strong>
                    {isActive ? <small>{collection.subtitle}</small> : null}
                  </span>
                  {collection.id === "bestiary" ? (
                    <em>
                      {bestiary?.unlockedRecords ?? 0}/
                      {bestiary?.totalRecords ?? 0}
                    </em>
                  ) : (
                    <em>Future</em>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <aside
          className="library-index"
          aria-label={`${activeCollection.name} index`}
        >
          <div className="library-column-heading library-column-heading--active">
            <span>{activeCollection.subtitle}</span>
            <h2>{activeCollection.name}</h2>
          </div>

          {activeCollectionId === "bestiary" ? (
            <BestiaryIndex
              bestiary={bestiary}
              error={error}
              loading={loading}
              selectedMonster={selectedMonster}
              onSelectMonster={setSelectedMonsterId}
            />
          ) : (
            <FutureCollectionIndex collection={activeCollection} />
          )}
        </aside>

        <main className="library-information">
          <div className="library-librarian">
            <div>
              <span>Head Librarian</span>
              <strong>Elara the Librarian</strong>
            </div>
            <button
              type="button"
              onClick={() =>
                setLibrarianMessage(
                  activeCollectionId === "bestiary"
                    ? "Defeat creatures and claim their rewards. The Library preserves only what you have truly discovered."
                    : `${activeCollection.name} is being prepared. Its shelves will open when this collection gains a purpose in your journey.`,
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

          <div className="library-information__record">
            {activeCollectionId === "bestiary" ? (
              selectedMonster ? (
                selectedMonster.unlocked ? (
                  <UnlockedRecord monster={selectedMonster} />
                ) : (
                  <LockedRecord />
                )
              ) : (
                <div className="library-empty-state">No record selected.</div>
              )
            ) : (
              <FutureCollectionDetail collection={activeCollection} />
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

function BestiaryIndex({
  bestiary,
  error,
  loading,
  selectedMonster,
  onSelectMonster,
}: {
  bestiary: LibraryBestiaryResult | null;
  error: string | null;
  loading: boolean;
  selectedMonster: LibraryMonsterRecord | null;
  onSelectMonster: (monsterId: string) => void;
}) {
  if (loading) {
    return <div className="library-empty-state">Opening the records...</div>;
  }

  if (error) {
    return (
      <div className="library-empty-state library-empty-state--error">
        {error}
      </div>
    );
  }

  return (
    <div className="library-record-list">
      {bestiary?.monsters.map((monster, index) => (
        <button
          key={monster.monsterId}
          type="button"
          className={
            selectedMonster?.monsterId === monster.monsterId
              ? "library-record library-record--active"
              : "library-record"
          }
          onClick={() => onSelectMonster(monster.monsterId)}
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
      ))}
    </div>
  );
}

function FutureCollectionIndex({
  collection,
}: {
  collection: LibraryCollection;
}) {
  return (
    <div className="library-future-index">
      {["Sealed Shelf", "Uncatalogued", "Restricted Record"].map(
        (label, index) => (
          <div key={label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </div>
        ),
      )}
      <p>{collection.name} has no readable records yet.</p>
    </div>
  );
}

function FutureCollectionDetail({
  collection,
}: {
  collection: LibraryCollection;
}) {
  return (
    <div className="library-future-detail">
      <div aria-hidden="true">{collection.icon}</div>
      <span>Collection Reserved</span>
      <h2>{collection.name}</h2>
      <p>{collection.description}</p>
    </div>
  );
}

function LockedRecord() {
  return (
    <div className="library-locked-record">
      <div aria-hidden="true">?</div>
      <span>Sealed Record</span>
      <h2>???</h2>
      <p>Defeat this creature and claim its reward to reveal the record.</p>
    </div>
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
