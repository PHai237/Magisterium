import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot, ItemId } from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { charactersApi } from "../characters/characters.api";
import { InnDialogueOverlay } from "./InnDialogueOverlay";
import "./inn.css";

interface InnPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onBack: () => void;
}

type InnPaymentMethod = "pass" | "bronze";

const BASIC_INN_REST_PRICE_BRONZE = 2;
const ONE_NIGHT_INN_PASS_ITEM_IDS = new Set<ItemId>(["one_night_inn_pass"]);

function isInnPassItemId(itemId: ItemId): boolean {
  return ONE_NIGHT_INN_PASS_ITEM_IDS.has(itemId);
}

export function InnPanel({
  userId,
  currentCharacter,
  onCharacterUpdated,
  onBack,
}: InnPanelProps) {
  const passCount = useMemo(
    () =>
      currentCharacter.inventoryItemIds.filter((itemId) =>
        isInnPassItemId(itemId),
      ).length,
    [currentCharacter.inventoryItemIds],
  );

  const hasPass = passCount > 0;
  const canAffordBronze =
    currentCharacter.moneyBronze >= BASIC_INN_REST_PRICE_BRONZE;

  const [paymentMethod, setPaymentMethod] = useState<InnPaymentMethod>(
    hasPass ? "pass" : "bronze",
  );
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restFlash, setRestFlash] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paymentMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!isPaymentMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        paymentMenuRef.current &&
        !paymentMenuRef.current.contains(event.target as Node)
      ) {
        setIsPaymentMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isPaymentMenuOpen]);

  const canRest = paymentMethod === "pass" ? hasPass : canAffordBronze;

  function selectPaymentMethod(nextPaymentMethod: InnPaymentMethod) {
    if (busy || (nextPaymentMethod === "pass" && !hasPass)) {
      return;
    }

    setPaymentMethod(nextPaymentMethod);
    setIsPaymentMenuOpen(false);
  }

  function showUnavailableService(service: "menu" | "kitchen") {
    setError(null);
    setMessage(
      service === "menu"
        ? "The innkeeper is still preparing today's food menu."
        : "The shared kitchen is not ready for adventurers yet.",
    );
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
          ? await charactersApi.restAtInnWithPass(userId, currentCharacter.id)
          : await charactersApi.restAtInn(userId, currentCharacter.id);

      onCharacterUpdated(result.character);
      setRestFlash(true);
      window.setTimeout(() => setRestFlash(false), 850);
      setMessage(
        paymentMethod === "pass"
          ? "Inn Pass redeemed. You are ready for the next expedition."
          : "Rest complete. You are ready for the next expedition.",
      );
    } catch (restError) {
      setError(
        restError instanceof Error
          ? restError.message
          : "Failed to rest at the inn.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`inn-panel ${restFlash ? "inn-panel--flash" : ""}`}
      aria-label="The Inn"
    >
      <header className="inn-panel__topbar">
        <Button
          type="button"
          variant="ghost"
          className="inn-panel__return"
          onClick={onBack}
        >
          Return
        </Button>

        <div className="inn-panel__title">
          <span>The Inn</span>
          <div className="inn-panel__title-icon" aria-hidden="true">
            🕯️
          </div>
        </div>
      </header>

      <div className="inn-panel__body">
        <section className="inn-room-service" aria-label="Rent a room">
          <div className="inn-section-heading">
            <h2>Rent a Room</h2>
          </div>

          <div className="inn-room-visual" aria-hidden="true">
            <div className="inn-room-visual__window">☾</div>
            <div className="inn-room-visual__bed">▰</div>
            <div className="inn-room-visual__lamp">✦</div>
          </div>

          <div className="inn-restore-list">
            <div className="inn-restore-row">
              <span aria-hidden="true">♥</span>
              <strong>Fully restore HP</strong>
              <em>100%</em>
            </div>
            <div className="inn-restore-row">
              <span aria-hidden="true">◆</span>
              <strong>Fully restore MP</strong>
              <em>100%</em>
            </div>
            <div className="inn-restore-row">
              <span aria-hidden="true">⚡</span>
              <strong>Fully restore Stamina</strong>
              <em>100%</em>
            </div>
          </div>

          <div className="inn-room-price">
            <span>Room price</span>
            <strong>{formatNumber(BASIC_INN_REST_PRICE_BRONZE)} Bronze</strong>
          </div>

          <div className="inn-action-panel">
            <div className="inn-payment-menu" ref={paymentMenuRef}>
              <button
                type="button"
                className="inn-payment-trigger"
                disabled={busy}
                onClick={() => setIsPaymentMenuOpen((current) => !current)}
                aria-expanded={isPaymentMenuOpen}
                aria-label="Choose inn payment method"
              >
                <span aria-hidden="true">
                  {paymentMethod === "pass" ? "🎟️" : "●"}
                </span>
                <strong>
                  {paymentMethod === "pass"
                    ? `${formatNumber(passCount)}x Pass`
                    : `${formatNumber(BASIC_INN_REST_PRICE_BRONZE)} Bronze`}
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
                    <span aria-hidden="true">●</span>
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
                  ? "Rent Room"
                  : paymentMethod === "pass"
                    ? "No Inn Pass"
                    : "Not enough Bronze"}
            </Button>
          </div>
        </section>

        <section className="inn-tavern-service" aria-label="Tavern and kitchen">
          <div className="inn-section-heading">
            <h2>Tavern & Kitchen</h2>
          </div>

          <article className="innkeeper-card">
            <div className="innkeeper-card__copy">
              <strong>Mara the Innkeeper</strong>
            </div>
            <button
              type="button"
              className="innkeeper-card__talk"
              onClick={() => setIsDialogueOpen(true)}
            >
              Talk
            </button>
          </article>

          <div className="inn-tavern-options">
            <article className="inn-tavern-option">
              <div className="inn-tavern-option__heading">
                <div className="inn-tavern-option__icon" aria-hidden="true">
                  🍲
                </div>
                <h3>Today's Menu</h3>
              </div>
              <div className="inn-tavern-option__copy">
                <p>
                  Order a cooked meal without spending your own ingredients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showUnavailableService("menu")}
              >
                View Menu
              </button>
            </article>

            <article className="inn-tavern-option">
              <div className="inn-tavern-option__heading">
                <div className="inn-tavern-option__icon" aria-hidden="true">
                  🔥
                </div>
                <h3>Borrow the Kitchen</h3>
              </div>
              <div className="inn-tavern-option__copy">
                <p>
                  Use known recipes and ingredients collected on your travels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showUnavailableService("kitchen")}
              >
                Use Kitchen
              </button>
            </article>
          </div>
        </section>
      </div>

      {message || error ? (
        <footer className="inn-panel__footer">
          {message ? (
            <strong className="inn-message inn-message--success">
              {message}
            </strong>
          ) : null}
          {error ? (
            <strong className="inn-message inn-message--error">{error}</strong>
          ) : null}
        </footer>
      ) : null}

      {isDialogueOpen ? (
        <InnDialogueOverlay onClose={() => setIsDialogueOpen(false)} />
      ) : null}
    </section>
  );
}
