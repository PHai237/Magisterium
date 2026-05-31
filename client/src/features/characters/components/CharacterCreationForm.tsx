import { Button } from "../../../components/ui/Button";
import { STAT_KEYS } from "../../../domain/magisterium.constants";
import type {
  CharacterCreationPreview,
  OriginId,
} from "../../../domain/magisterium.types";
import { CharacterOriginSelector } from "./CharacterOriginSelector";
import { StartingKitPreview } from "./StartingKitPreview";

interface CharacterCreationFormProps {
  name: string;
  originId: OriginId;
  preview: CharacterCreationPreview | null;
  error: string | null;
  busy: boolean;
  previewBusy: boolean;
  onNameChange: (name: string) => void;
  onOriginChange: (originId: OriginId) => void;
  onSubmit: () => void;
  onReset: () => void;
}

const STAT_HINTS: Record<string, string> = {
  STR: "Increases physical damage, stamina, and critical damage.",
  DEX: "Improves accuracy, evasion, speed, stamina, and flee chance.",
  CON: "Increases HP, stamina, physical defense, and stamina recovery.",
  INT: "Increases magic damage and MP.",
  WIS: "Improves healing, MP, magic defense, status resist, and MP recovery.",
  LUK: "Improves critical chance and combat proc chance.",
};

export function CharacterCreationForm({
  name,
  originId,
  preview,
  error,
  busy,
  previewBusy,
  onNameChange,
  onOriginChange,
  onSubmit,
  onReset,
}: CharacterCreationFormProps) {
  return (
    <main className="character-main">
      <form
        className="character-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
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
                className="character-name-input"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Name your Weaver..."
                aria-label="Character name"
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

            <StartingKitPreview preview={preview} previewBusy={previewBusy} />
          </div>

          <div className="character-create-card character-origin-stats-card">
            <CharacterOriginSelector
              originId={originId}
              previewBusy={previewBusy}
              onOriginChange={onOriginChange}
            />

            <div className="character-stats-panel">
              <div className="character-card-title">Stats</div>

              <div className="stats-grid">
                {STAT_KEYS.map((statKey) => (
                  <div key={statKey} className="stats-cell">
                    <button
                      type="button"
                      className="character-info-dot character-stat-info-dot"
                      aria-label={`What does ${statKey} do?`}
                      data-tooltip={STAT_HINTS[statKey]}
                    >
                      !
                    </button>

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
            onClick={onReset}
          >
            Reset
          </Button>

          <Button type="submit" disabled={busy || previewBusy || !name.trim()}>
            Create Character
          </Button>
        </footer>
      </form>
    </main>
  );
}
