import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

interface SmithDialogueOverlayProps {
  onClose: () => void;
}

interface SmithDialogueTopic {
  id: string;
  label: string;
  response: string;
}

const SMITH_DIALOGUE_TOPICS: SmithDialogueTopic[] = [
  {
    id: "introduction",
    label: "Who are you?",
    response:
      "I am Garran. If it bends, I straighten it. If it breaks, I teach it better manners.",
  },
  {
    id: "crafting",
    label: "Ask about forging.",
    response:
      "Bring the right materials and enough bronze. I will handle the heat, the hammer, and the part where metal learns obedience.",
  },
  {
    id: "materials",
    label: "Ask about materials.",
    response:
      "Monster parts, ore, wood, hide; everything has a temper. Good smithing starts before the item ever touches the anvil.",
  },
  {
    id: "work",
    label: "Any work available?",
    response:
      "Not yet. But tools go missing, blades need testing, and rare metals never walk into town by themselves.",
  },
];

export function SmithDialogueOverlay({ onClose }: SmithDialogueOverlayProps) {
  const titleId = useId();
  const [selectedTopic, setSelectedTopic] = useState<SmithDialogueTopic | null>(
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
      className="smith-dialogue-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="smith-dialogue"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="smith-dialogue__header">
          <div className="smith-dialogue__identity">
            <div className="smith-dialogue__avatar" aria-hidden="true">
              G
            </div>

            <div>
              <span>Master of The Smith</span>
              <h2 id={titleId}>Garran the Smith</h2>
            </div>
          </div>

          <button
            type="button"
            className="smith-dialogue__close"
            onClick={onClose}
            aria-label="Close dialogue"
            autoFocus
          >
            x
          </button>
        </header>

        <div className="smith-dialogue__speech">
          <span>{selectedTopic ? "Response" : "Greeting"}</span>
          <p>
            &ldquo;
            {selectedTopic?.response ??
              "Mind your sleeves near the coals. The forge is friendlier than it looks, but only after it respects you."}
            &rdquo;
          </p>
        </div>

        <div className="smith-dialogue__topics" aria-label="Dialogue topics">
          {SMITH_DIALOGUE_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={
                selectedTopic?.id === topic.id
                  ? "smith-dialogue__topic smith-dialogue__topic--active"
                  : "smith-dialogue__topic"
              }
              aria-pressed={selectedTopic?.id === topic.id}
              onClick={() => setSelectedTopic(topic)}
            >
              {topic.label}
            </button>
          ))}

          <button
            type="button"
            className="smith-dialogue__topic smith-dialogue__topic--leave"
            onClick={onClose}
          >
            Return to The Smith
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
