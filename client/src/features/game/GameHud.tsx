import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
import { GameAccountMenu } from "./GameAccountMenu";

interface GameHudProps {
  currentCharacter: CharacterSnapshot;
  onBackToCharacters: () => void;
  onLogout: () => void;
}

export function GameHud({
  currentCharacter,
  onBackToCharacters,
  onLogout
}: GameHudProps) {
  return (
    <section className="gameshell-hud" aria-label="Character status">
      <div className="gameshell-vitals">
        <div className="gameshell-vital gameshell-vital--hp">
          <span>HP</span>
          <strong>
            {formatNumber(currentCharacter.currentState.hp)} /{" "}
            {formatNumber(currentCharacter.derivedStats.maxHp)}
          </strong>
        </div>

        <div className="gameshell-vital gameshell-vital--mp">
          <span>MP</span>
          <strong>
            {formatNumber(currentCharacter.currentState.mp)} /{" "}
            {formatNumber(currentCharacter.derivedStats.maxMp)}
          </strong>
        </div>

        <div className="gameshell-vital gameshell-vital--stamina">
          <span>STA</span>
          <strong>
            {formatNumber(currentCharacter.currentState.stamina)} /{" "}
            {formatNumber(currentCharacter.derivedStats.maxStamina)}
          </strong>
        </div>
      </div>

      <div className="gameshell-character-chip">
        <div className="gameshell-character-chip__copy">
          <strong>{currentCharacter.name}</strong>
          <span>
            Lv. {currentCharacter.progression.level} ·{" "}
            {compactLabel(currentCharacter.originId)}
          </span>
        </div>

        <GameAccountMenu
          characterName={currentCharacter.name}
          onBackToCharacters={onBackToCharacters}
          onLogout={onLogout}
        />
      </div>
    </section>
  );
}