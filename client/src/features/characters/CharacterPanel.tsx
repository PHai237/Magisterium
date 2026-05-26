import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ORIGIN_OPTIONS, STAT_KEYS } from "../../domain/magisterium.constants";
import type {
  CharacterCreationPreview,
  CharacterSnapshot,
  ItemId,
  OriginId
} from "../../domain/magisterium.types";
import { compactLabel } from "../../lib/format";
import { charactersApi } from "./characters.api";

interface CharacterPanelProps {
  userId: string;
  onCurrentCharacterChange?: (character: CharacterSnapshot | null) => void;
  onEnterWorld?: (character: CharacterSnapshot) => void;
}

interface LoadState {
  characters: CharacterSnapshot[];
  current: CharacterSnapshot | null;
}

const initialLoadState: LoadState = {
  characters: [],
  current: null
};

const STARTING_KIT_ITEM_ICONS: Record<string, string> = {
  stamina_bread: "🍞",
  minor_hp_potion: "🧪",
  minor_mp_potion: "🔷",
  one_night_inn_voucher: "🏨"
};

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getStartingKitItemIcon(itemId: ItemId): string {
  return STARTING_KIT_ITEM_ICONS[itemId] ?? "◇";
}

function formatQuantity(quantity: number): string {
  return `${quantity}x`;
}

export function CharacterPanel({
  userId,
  onCurrentCharacterChange,
  onEnterWorld
}: CharacterPanelProps) {
  const [data, setData] = useState<LoadState>(initialLoadState);
  const [preview, setPreview] = useState<CharacterCreationPreview | null>(null);
  const [name, setName] = useState("Wanderer Weaver");
  const [originId, setOriginId] = useState<OriginId>("wanderer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);

  const selectedOrigin = useMemo(
    () =>
      ORIGIN_OPTIONS.find((origin) => origin.id === originId) ??
      ORIGIN_OPTIONS[0]!,
    [originId]
  );

  const selectedOriginIndex = useMemo(
    () => ORIGIN_OPTIONS.findIndex((origin) => origin.id === originId),
    [originId]
  );

  const normalizedOriginIndex =
    selectedOriginIndex >= 0 ? selectedOriginIndex : 0;

  const loadCharacters = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const [characters, current] = await Promise.all([
        charactersApi.list(userId),
        charactersApi.getCurrent(userId)
      ]);

      setData({
        characters,
        current
      });

      onCurrentCharacterChange?.(current);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load characters."
      );
    } finally {
      setBusy(false);
    }
  }, [onCurrentCharacterChange, userId]);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setPreviewBusy(true);
      setError(null);

      try {
        const nextPreview = await charactersApi.preview(userId, { originId });

        if (!cancelled) {
          setPreview(nextPreview);
        }
      } catch (previewError) {
        if (!cancelled) {
          setPreview(null);
          setError(
            previewError instanceof Error
              ? previewError.message
              : "Failed to load character preview."
          );
        }
      } finally {
        if (!cancelled) {
          setPreviewBusy(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [originId, userId]);

  function selectPreviousOrigin() {
    const previousIndex =
      normalizedOriginIndex === 0
        ? ORIGIN_OPTIONS.length - 1
        : normalizedOriginIndex - 1;

    setOriginId(ORIGIN_OPTIONS[previousIndex]!.id);
  }

  function selectNextOrigin() {
    const nextIndex =
      normalizedOriginIndex === ORIGIN_OPTIONS.length - 1
        ? 0
        : normalizedOriginIndex + 1;

    setOriginId(ORIGIN_OPTIONS[nextIndex]!.id);
  }

  async function createCharacter() {
    if (busy || previewBusy || !name.trim()) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await charactersApi.create(userId, {
        name,
        originId
      });

      setData((previous) => ({
        characters: [
          created,
          ...previous.characters.filter(
            (character) => character.id !== created.id
          )
        ],
        current: created
      }));

      onCurrentCharacterChange?.(created);
      setName("New Weaver");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create character."
      );
    } finally {
      setBusy(false);
    }
  }

  async function selectCharacter(characterId: string) {
    setBusy(true);
    setError(null);

    try {
      const current = await charactersApi.setCurrent(userId, characterId);

      setData((previous) => ({
        ...previous,
        current
      }));

      onCurrentCharacterChange?.(current);
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : "Failed to set current character."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteCurrentCharacter() {
    if (!data.current) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${data.current.name}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await charactersApi.delete(userId, data.current.id);
      await loadCharacters();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete character."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="character-page">
      <aside className="character-sidebar">
        <div className="character-sidebar__content">
          <div className="character-sidebar__header">
            <div className="character-sidebar__title">
              Characters ({data.characters.length}/3)
            </div>

            <button
              className="character-delete-icon-button"
              type="button"
              disabled={busy || !data.current}
              onClick={() => void deleteCurrentCharacter()}
              aria-label="Delete current character"
              title="Delete current character"
            >
              🗑
            </button>
          </div>

          {busy && data.characters.length === 0 ? (
            <div className="character-loading">Loading...</div>
          ) : data.characters.length === 0 ? (
            <div className="character-empty">
              <strong>No character yet</strong>
            </div>
          ) : (
            <div className="character-list">
              {data.characters.map((character) => {
                const isActive = data.current?.id === character.id;

                return (
                  <button
                    key={character.id}
                    className={`character-list-card ${
                      isActive ? "character-list-card--active" : ""
                    }`}
                    onClick={() => void selectCharacter(character.id)}
                    type="button"
                    disabled={busy}
                  >
                    <span className="character-list-card__main">
                      <span className="character-avatar">
                        {getInitialLetter(character.name)}
                      </span>

                      <span>
                        <strong>{character.name}</strong>
                        <small>
                          Lv. {character.progression.level} ·{" "}
                          {compactLabel(character.originId)}
                        </small>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="character-new-button"
            type="button"
            disabled={busy || previewBusy}
            onClick={() => {
              setName("New Weaver");
              setOriginId("wanderer");
            }}
          >
            + New Character
          </button>
        </div>

        <Button
          className="character-enter-button"
          disabled={!data.current || busy}
          variant="secondary"
          type="button"
          onClick={() => {
            if (data.current) {
              onEnterWorld?.(data.current);
            }
          }}
        >
          {data.current ? `Enter as ${data.current.name}` : "Enter World"}
        </Button>
      </aside>

      <main className="character-main">
        <form
          className="character-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createCharacter();
          }}
        >
          <header className="character-create-header">
            <h2>Create Character</h2>
          </header>

          <section className="character-create-grid">
            <div className="character-top-row">
              <div className="character-create-card character-info-card">
                <div className="character-card-title">Character</div>

                <input
                  id="character-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter character name"
                  autoComplete="off"
                  disabled={busy}
                />

                <div className="resource-preview">
                  <div className="resource-preview__item resource-preview__item--hp">
                    <span>HP</span>
                    <strong>{preview?.derivedStats.maxHp ?? "—"}</strong>
                  </div>

                  <div className="resource-preview__item resource-preview__item--mp">
                    <span>MP</span>
                    <strong>{preview?.derivedStats.maxMp ?? "—"}</strong>
                  </div>

                  <div className="resource-preview__item resource-preview__item--stamina">
                    <span>Stamina</span>
                    <strong>{preview?.derivedStats.maxStamina ?? "—"}</strong>
                  </div>
                </div>

                <div className="character-field-message">
                  {error ? <span>{error}</span> : null}
                </div>
              </div>

              <div className="character-create-card character-starting-kit-card">
                <div className="character-card-title">Starting Kit</div>

                <div className="starting-kit-list">
                  <div className="starting-kit-item">
                    <span className="starting-kit-icon">🪙</span>
                    <span className="starting-kit-qty">
                      {preview?.startingKit.moneyBronze ?? "—"}
                    </span>
                    <span className="starting-kit-name">Bronze</span>
                  </div>

                  {preview?.startingKit.items.map((item) => (
                    <div key={item.itemId} className="starting-kit-item">
                      <span className="starting-kit-icon">
                        {getStartingKitItemIcon(item.itemId)}
                      </span>
                      <span className="starting-kit-qty">
                        {formatQuantity(item.quantity)}
                      </span>
                      <span className="starting-kit-name">{item.name}</span>
                    </div>
                  ))}

                  {!preview && previewBusy && (
                    <div className="starting-kit-item">
                      <span className="starting-kit-icon">◇</span>
                      <span className="starting-kit-qty">—</span>
                      <span className="starting-kit-name">Loading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="character-create-card character-origin-stats-card">
              <div className="character-origin-panel">
                <div className="character-card-title">Origin</div>

                <div className="origin-content">
                  <div>
                    <div className="origin-name">
                      <span>{selectedOrigin.icon}</span>
                      <strong>{selectedOrigin.label}</strong>
                    </div>

                    <span className="origin-focus">{selectedOrigin.focus}</span>

                    <p>{selectedOrigin.description}</p>
                  </div>

                  <div className="origin-controls">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={selectPreviousOrigin}
                      disabled={previewBusy}
                    >
                      Prev
                    </Button>

                    <span>
                      Origin {normalizedOriginIndex + 1} /{" "}
                      {ORIGIN_OPTIONS.length}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={selectNextOrigin}
                      disabled={previewBusy}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="character-stats-panel">
                <div className="character-card-title">Stats</div>

                <div className="stats-grid">
                  {STAT_KEYS.map((statKey) => (
                    <div key={statKey} className="stats-cell">
                      <span>{statKey}</span>
                      <strong>{preview?.baseStats[statKey] ?? "—"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <footer className="character-create-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={busy || previewBusy}
              onClick={() => {
                setName("");
                setOriginId("wanderer");
              }}
            >
              Reset
            </Button>

            <Button
              type="submit"
              disabled={busy || previewBusy || !name.trim()}
            >
              Create Character
            </Button>
          </footer>
        </form>
      </main>
    </div>
  );
}