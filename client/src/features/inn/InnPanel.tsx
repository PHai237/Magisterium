import { useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { charactersApi } from "../characters/characters.api";
import "./inn.css";

interface InnPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
}

const BASIC_INN_REST_PRICE_BRONZE = 3;

export function InnPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: InnPanelProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAffordRest = currentCharacter.moneyBronze >= BASIC_INN_REST_PRICE_BRONZE;

  async function restAtInn() {
    if (busy || !canAffordRest) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const result = await charactersApi.restAtInn(
        userId,
        currentCharacter.id
      );

      onCharacterUpdated(result.character);

      setMessage(
        `Rest complete. ${formatNumber(result.rest.priceBronze)} Bronze spent.`
      );
    } catch (restError) {
      setError(
        restError instanceof Error
          ? restError.message
          : "Failed to rest at the inn."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="inn-panel">
      <section className="inn-basic-card">
        <div className="inn-basic-card__sigil" aria-hidden="true">
          🕯️
        </div>

        <div className="inn-basic-card__copy">
          <p>The Cozy Hearth</p>
          <h2>Rest for the night</h2>
          <span>
            Pay a small fee to fully recover HP, MP, and Stamina before your
            next expedition.
          </span>
        </div>

        <div className="inn-basic-card__price">
          <span>Price</span>
          <strong>{formatNumber(BASIC_INN_REST_PRICE_BRONZE)} Bronze</strong>
        </div>

        <Button
          type="button"
          disabled={busy || !canAffordRest}
          onClick={() => void restAtInn()}
        >
          {busy
            ? "Resting..."
            : canAffordRest
              ? "Rest"
              : "Not enough bronze"}
        </Button>

        <div className="inn-basic-card__wallet">
          Wallet: <strong>{formatNumber(currentCharacter.moneyBronze)}</strong>{" "}
          Bronze
        </div>

        {message ? (
          <div className="inn-basic-result inn-basic-result--success">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="inn-basic-result inn-basic-result--error">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}