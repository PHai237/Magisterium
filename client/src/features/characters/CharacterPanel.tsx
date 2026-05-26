import { useCallback, useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import type {
  CharacterCreationPreview,
  CharacterSnapshot,
  OriginId
} from "../../domain/magisterium.types";
import { CharacterCreationForm } from "./components/CharacterCreationForm";
import { CharacterList } from "./components/CharacterList";
import { charactersApi } from "./characters.api";
import "./character.css";

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

export function CharacterPanel({
  userId,
  onCurrentCharacterChange,
  onEnterWorld
}: CharacterPanelProps) {
  const [data, setData] = useState<LoadState>(initialLoadState);
  const [preview, setPreview] = useState<CharacterCreationPreview | null>(null);
  const [name, setName] = useState("");
  const [originId, setOriginId] = useState<OriginId>("wanderer");
  const [pendingDeleteCharacter, setPendingDeleteCharacter] =
    useState<CharacterSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);

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

  async function createCharacter() {
    if (busy || previewBusy || !name.trim()) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await charactersApi.create(userId, {
        name: name.trim(),
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
      setName("");
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

  function requestDeleteCurrentCharacter() {
    if (!data.current || busy) {
      return;
    }

    setPendingDeleteCharacter(data.current);
  }

  function cancelDeleteCharacter() {
    if (busy) {
      return;
    }

    setPendingDeleteCharacter(null);
  }

  async function confirmDeleteCharacter() {
    if (!pendingDeleteCharacter) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await charactersApi.delete(userId, pendingDeleteCharacter.id);
      setPendingDeleteCharacter(null);
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

  function prepareNewCharacter() {
    setName("");
    setOriginId("wanderer");
  }

  function resetCreationForm() {
    setName("");
    setOriginId("wanderer");
  }

  return (
    <div className="character-page">
      <div className="character-sidebar-frame">
        <CharacterList
          characters={data.characters}
          currentCharacter={data.current}
          busy={busy || previewBusy}
          onSelectCharacter={(characterId) => void selectCharacter(characterId)}
          onDeleteCurrentCharacter={requestDeleteCurrentCharacter}
          onPrepareNewCharacter={prepareNewCharacter}
        />

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
      </div>

      <CharacterCreationForm
        name={name}
        originId={originId}
        preview={preview}
        error={error}
        busy={busy}
        previewBusy={previewBusy}
        onNameChange={setName}
        onOriginChange={setOriginId}
        onSubmit={() => void createCharacter()}
        onReset={resetCreationForm}
      />

      {pendingDeleteCharacter ? (
        <div className="character-confirm-overlay">
          <section
            className="character-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-delete-title"
          >
            <div className="character-confirm-icon" aria-hidden="true">
              ✦
            </div>

            <div className="character-confirm-copy">
              <p>Delete Character</p>
              <h2 id="character-delete-title">
                Release {pendingDeleteCharacter.name}?
              </h2>
              <span>
                This Weaver will be removed from your roster. This action cannot
                be undone.
              </span>
            </div>

            {error ? <div className="error-banner">{error}</div> : null}

            <div className="character-confirm-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={cancelDeleteCharacter}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={() => void confirmDeleteCharacter()}
              >
                {busy ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}