import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

interface InnDialogueOverlayProps {
  onClose: () => void;
}

interface InnDialogueTopic {
  id: string;
  label: string;
  response: string;
}

const INN_DIALOGUE_TOPICS: InnDialogueTopic[] = [
  {
    id: "introduction",
    label: "Who are you?",
    response:
      "I keep the rooms ready, the stew warm, and the kitchen standing after adventurers decide they know how to cook.",
  },
  {
    id: "rooms",
    label: "Ask about the rooms.",
    response:
      "A room includes a proper bed, hot water, and enough peace to restore you for the next expedition. Bronze or a valid Inn Pass will do.",
  },
  {
    id: "kitchen",
    label: "May I use the kitchen?",
    response:
      "Once the preparation tables are ready, adventurers may borrow the kitchen and cook with their own ingredients. Clean your station afterward.",
  },
  {
    id: "work",
    label: "Any work available?",
    response:
      "Nothing today. An inn hears every road story eventually, though. If someone needs capable help, you will hear it here.",
  },
];

export function InnDialogueOverlay({ onClose }: InnDialogueOverlayProps) {
  const titleId = useId();
  const [selectedTopic, setSelectedTopic] = useState<InnDialogueTopic | null>(
    null,
  );

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
      className="inn-dialogue-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="inn-dialogue"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="inn-dialogue__header">
          <div className="inn-dialogue__identity">
            <div className="inn-dialogue__avatar" aria-hidden="true">
              🕯️
            </div>

            <div>
              <span>Keeper of The Inn</span>
              <h2 id={titleId}>The Innkeeper</h2>
            </div>
          </div>

          <button
            type="button"
            className="inn-dialogue__close"
            onClick={onClose}
            aria-label="Close dialogue"
            autoFocus
          >
            ×
          </button>
        </header>

        <div className="inn-dialogue__speech">
          <span>{selectedTopic ? "Response" : "Greeting"}</span>
          <p>
            “
            {selectedTopic?.response ??
              "Welcome in. Take a room if you need rest, or stay near the hearth if food and conversation are what brought you here."}
            ”
          </p>
        </div>

        <div className="inn-dialogue__topics" aria-label="Dialogue topics">
          {INN_DIALOGUE_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={
                selectedTopic?.id === topic.id
                  ? "inn-dialogue__topic inn-dialogue__topic--active"
                  : "inn-dialogue__topic"
              }
              aria-pressed={selectedTopic?.id === topic.id}
              onClick={() => setSelectedTopic(topic)}
            >
              {topic.label}
            </button>
          ))}

          <button
            type="button"
            className="inn-dialogue__topic inn-dialogue__topic--leave"
            onClick={onClose}
          >
            Return to The Inn
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
