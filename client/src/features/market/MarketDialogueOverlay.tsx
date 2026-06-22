import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import type { MarketVendor } from "./market.api";
import { getMarketDialogue, type MarketDialogueTopic } from "./marketDialogue";

interface MarketDialogueOverlayProps {
  vendor: MarketVendor;
  onClose: () => void;
}

export function MarketDialogueOverlay({
  vendor,
  onClose,
}: MarketDialogueOverlayProps) {
  const titleId = useId();
  const dialogue = getMarketDialogue(vendor);
  const [selectedTopic, setSelectedTopic] =
    useState<MarketDialogueTopic | null>(null);

  useEffect(() => {
    setSelectedTopic(null);
  }, [vendor.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="market-dialogue-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="market-dialogue"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="market-dialogue__header">
          <div className="market-dialogue__identity">
            <div className="market-dialogue__avatar" aria-hidden="true">
              {vendor.icon}
            </div>

            <div>
              <span>{dialogue.title}</span>
              <h2 id={titleId}>{dialogue.npcName}</h2>
            </div>
          </div>

          <button
            type="button"
            className="market-dialogue__close"
            onClick={onClose}
            aria-label="Close dialogue"
            autoFocus
          >
            ×
          </button>
        </header>

        <div className="market-dialogue__speech">
          <span>{selectedTopic ? "Response" : "Greeting"}</span>
          <p>“{selectedTopic?.response ?? dialogue.greeting}”</p>
        </div>

        <div className="market-dialogue__topics" aria-label="Dialogue topics">
          {dialogue.topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={
                selectedTopic?.id === topic.id
                  ? "market-dialogue__topic market-dialogue__topic--active"
                  : "market-dialogue__topic"
              }
              aria-pressed={selectedTopic?.id === topic.id}
              onClick={() => setSelectedTopic(topic)}
            >
              {topic.label}
            </button>
          ))}

          <button
            type="button"
            className="market-dialogue__topic market-dialogue__topic--leave"
            onClick={onClose}
          >
            Return to Shop
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
