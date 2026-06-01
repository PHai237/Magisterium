import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot, ItemId } from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { charactersApi } from "../characters/characters.api";
import "./inn.css";

interface InnPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
}

type InnPaymentMethod = "pass" | "bronze";

const BASIC_INN_REST_PRICE_BRONZE = 3;

const ONE_NIGHT_INN_PASS_ITEM_IDS = new Set<ItemId>([
  "one_night_inn_pass"
]);

function isInnPassItemId(itemId: ItemId): boolean {
  return ONE_NIGHT_INN_PASS_ITEM_IDS.has(itemId);
}

export function InnPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: InnPanelProps) {
  const passCount = useMemo(
    () =>
      currentCharacter.inventoryItemIds.filter((itemId) =>
        isInnPassItemId(itemId)
      ).length,
    [currentCharacter.inventoryItemIds]
  );

  const hasPass = passCount > 0;
  const canAffordBronze =
    currentCharacter.moneyBronze >= BASIC_INN_REST_PRICE_BRONZE;

  const [paymentMethod, setPaymentMethod] = useState<InnPaymentMethod>(
    hasPass ? "pass" : "bronze"
  );
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restFlash, setRestFlash] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentMethod === "pass" && !hasPass) {
      setPaymentMethod("bronze");
    }
  }, [hasPass, paymentMethod]);

  useEffect(() => {
    if (!message && !error) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 2800);

    return () => window.clearTimeout(timerId);
  }, [message, error]);

  const canRest = paymentMethod === "pass" ? hasPass : canAffordBronze;

  function selectPaymentMethod(nextPaymentMethod: InnPaymentMethod) {
    if (busy) {
      return;
    }

    if (nextPaymentMethod === "pass" && !hasPass) {
      return;
    }

    setPaymentMethod(nextPaymentMethod);
    setIsPaymentMenuOpen(false);
  }

  async function restAtInn() {
    if (busy || !canRest) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);
    setIsPaymentMenuOpen(false);

    try {
      const result =
        paymentMethod === "pass"
          ? await charactersApi.restAtInnWithPass(
              userId,
              currentCharacter.id
            )
          : await charactersApi.restAtInn(userId, currentCharacter.id);

      onCharacterUpdated(result.character);

      setRestFlash(true);
      window.setTimeout(() => setRestFlash(false), 850);

      setMessage(
        paymentMethod === "pass"
          ? "Inn Pass redeemed. You are ready for the next expedition."
          : "Rest complete. You are ready for the next expedition."
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
    <article
      className={`inn-basic-card ${restFlash ? "inn-basic-card--flash" : ""}`}
    >
      <header className="inn-basic-card__header">
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
      </header>

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

      <div className="inn-action-panel">
        <div className="inn-payment-menu">
          <button
            type="button"
            className="inn-payment-trigger"
            disabled={busy}
            onClick={() => setIsPaymentMenuOpen((current) => !current)}
            aria-expanded={isPaymentMenuOpen}
            aria-label="Choose inn payment method"
          >
            <span aria-hidden="true">
              {paymentMethod === "pass" ? "🎟️" : "🪙"}
            </span>
            <strong>
              {paymentMethod === "pass"
                ? `${formatNumber(passCount)}x`
                : formatNumber(BASIC_INN_REST_PRICE_BRONZE)}
            </strong>
          </button>

          {isPaymentMenuOpen ? (
            <div className="inn-payment-dropdown" role="menu">
              <button
                type="button"
                className={
                  paymentMethod === "bronze"
                    ? "inn-payment-option inn-payment-option--active"
                    : "inn-payment-option"
                }
                onClick={() => selectPaymentMethod("bronze")}
                role="menuitem"
              >
                <span aria-hidden="true">🪙</span>
                <strong>Bronze</strong>
                <em>{formatNumber(BASIC_INN_REST_PRICE_BRONZE)}</em>
              </button>

              <button
                type="button"
                className={
                  paymentMethod === "pass"
                    ? "inn-payment-option inn-payment-option--active"
                    : "inn-payment-option"
                }
                disabled={!hasPass}
                onClick={() => selectPaymentMethod("pass")}
                role="menuitem"
              >
                <span aria-hidden="true">🎟️</span>
                <strong>Inn Pass</strong>
                <em>{hasPass ? `${formatNumber(passCount)}x` : "0x"}</em>
              </button>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          disabled={busy || !canRest}
          onClick={() => void restAtInn()}
        >
          {busy
            ? "Resting..."
            : canRest
              ? "Rest"
              : paymentMethod === "pass"
                ? "No Inn Pass"
                : "Not enough bronze"}
        </Button>
      </div>

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
