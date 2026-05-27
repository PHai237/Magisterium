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
  const [restFlash, setRestFlash] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAffordRest =
    currentCharacter.moneyBronze >= BASIC_INN_REST_PRICE_BRONZE;

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

      setRestFlash(true);
      window.setTimeout(() => setRestFlash(false), 850);

      setMessage("Rest complete. You are ready for the next expedition.");
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
    <article
      className={`inn-basic-card ${restFlash ? "inn-basic-card--flash" : ""}`}
    >
      <div className="inn-basic-card__visual">
        <div className="inn-basic-card__glow" aria-hidden="true" />
        <div className="inn-basic-card__sigil" aria-hidden="true">
          🕯️
        </div>
      </div>

      <div className="inn-basic-card__copy">
        <p>The Inn</p>
        <h2>Rest for the night</h2>
      </div>

      <section className="inn-service-box" aria-label="Rest service details">
        <div className="inn-service-summary">
          <span>Service</span>
          <strong>Overnight Rest</strong>
        </div>

        <div className="inn-restore-list">
          <div className="inn-restore-row">
            <span aria-hidden="true">❤️</span>
            <strong>Fully restore HP</strong>
            <em>+100%</em>
          </div>

          <div className="inn-restore-row">
            <span aria-hidden="true">💙</span>
            <strong>Fully restore MP</strong>
            <em>+100%</em>
          </div>

          <div className="inn-restore-row">
            <span aria-hidden="true">⚡</span>
            <strong>Fully restore Stamina</strong>
            <em>+100%</em>
          </div>
        </div>

        <div className="inn-service-summary inn-service-summary--price">
          <span>Price</span>
          <strong>{formatNumber(BASIC_INN_REST_PRICE_BRONZE)} Bronze</strong>
        </div>
      </section>

      <Button
        type="button"
        disabled={busy || !canAffordRest}
        onClick={() => void restAtInn()}
      >
        {busy ? "Resting..." : canAffordRest ? "Rest" : "Not enough bronze"}
      </Button>

      {message ? (
        <div className="inn-basic-result inn-basic-result--success" role="status">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="inn-basic-result inn-basic-result--error" role="alert">
          {error}
        </div>
      ) : null}
    </article>
  );
}