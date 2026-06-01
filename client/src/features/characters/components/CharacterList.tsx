import type { CharacterSnapshot } from "../../../domain/magisterium.types";
import { compactLabel } from "../../../lib/format";

interface CharacterListProps {
  characters: CharacterSnapshot[];
  currentCharacter: CharacterSnapshot | null;
  busy: boolean;
  onSelectCharacter: (characterId: string) => void;
  onDeleteCurrentCharacter: () => void;
  onPrepareNewCharacter: () => void;
}

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function CharacterList({
  characters,
  currentCharacter,
  busy,
  onSelectCharacter,
  onDeleteCurrentCharacter,
  onPrepareNewCharacter
}: CharacterListProps) {
  return (
    <aside className="character-sidebar">
      <div className="character-sidebar__content">
        <div className="character-sidebar__header">
          <div className="character-sidebar__title">
            Characters ({characters.length}/3)
          </div>

          <button
            className="character-delete-icon-button"
            type="button"
            disabled={busy || !currentCharacter}
            onClick={onDeleteCurrentCharacter}
            aria-label="Delete current character"
            title="Delete current character"
          >
            🗑
          </button>
        </div>

        {busy && characters.length === 0 ? (
          <div className="character-loading">Loading...</div>
        ) : characters.length === 0 ? (
          <div className="character-empty">
            <strong>No character yet</strong>
          </div>
        ) : (
          <div className="character-list">
            {characters.map((character) => {
              const isActive = currentCharacter?.id === character.id;

              return (
                <button
                  key={character.id}
                  className={`character-list-card ${
                    isActive ? "character-list-card--active" : ""
                  }`}
                  onClick={() => onSelectCharacter(character.id)}
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
                        {compactLabel(
                          character.progression.rankId ?? "novice"
                        )} ·{" "}
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
          disabled={busy || characters.length >= 3}
          onClick={onPrepareNewCharacter}
        >
          {characters.length >= 3 ? "Character Slots Full" : "+ New Character"}
        </button>
      </div>
    </aside>
  );
}
