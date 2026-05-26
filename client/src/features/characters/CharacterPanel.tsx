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
  const [name, setName] = useState("Wanderer Weaver");
  const [originId, setOriginId] = useState<OriginId>("wanderer");
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

  function prepareNewCharacter() {
    setName("New Weaver");
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
          onDeleteCurrentCharacter={() => void deleteCurrentCharacter()}
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
    </div>
  );
}