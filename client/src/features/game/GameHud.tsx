import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";

interface GameHudProps {
  currentCharacter: CharacterSnapshot;
}

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatBronze(value: number): string {
  if (value >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)}M BRONZE`;
  }

  if (value >= 1_000) {
    return `${formatNumber(value / 1_000, 1)}K BRONZE`;
  }

  return `${formatNumber(value)} BRONZE`;
}

export function GameHud({ currentCharacter }: GameHudProps) {
  return (
    <footer className="gameshell-footer">
      <div className="gameshell-profile">
        <div className="gameshell-avatar">
          {getInitialLetter(currentCharacter.name)}
        </div>

        <div>
          <strong>{currentCharacter.name}</strong>
          <span>
            Lv. {currentCharacter.progression.level} ·{" "}
            {compactLabel(currentCharacter.originId)}
          </span>
        </div>
      </div>

      <div className="gameshell-stats">
        <div>
          <span>HP</span>
          <strong>
            {formatNumber(currentCharacter.currentState.hp)} /{" "}
            {formatNumber(currentCharacter.derivedStats.maxHp)}
          </strong>
        </div>

        <div>
          <span>MP</span>
          <strong>
            {formatNumber(currentCharacter.currentState.mp)} /{" "}
            {formatNumber(currentCharacter.derivedStats.maxMp)}
          </strong>
        </div>

        <div>
          <span>STA</span>
          <strong>
            {formatNumber(currentCharacter.currentState.stamina)} /{" "}
            {formatNumber(currentCharacter.derivedStats.maxStamina)}
          </strong>
        </div>

        <div>
          <span>🪙</span>
          <strong>{formatBronze(currentCharacter.moneyBronze)}</strong>
        </div>
      </div>
    </footer>
  );
}