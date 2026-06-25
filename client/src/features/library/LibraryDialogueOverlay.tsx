import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

interface LibraryDialogueOverlayProps {
  onClose: () => void;
}

interface LibraryDialogueTopic {
  id: string;
  label: string;
  response: string;
}

const LIBRARY_DIALOGUE_TOPICS: LibraryDialogueTopic[] = [
  {
    id: "introduction",
    label: "Who are you?",
    response:
      "I keep the shelves awake, the records honest, and the dangerous books just far enough from curious hands.",
  },
  {
    id: "bestiary",
    label: "Ask about the Bestiary.",
    response:
      "Defeat creatures and claim their rewards. The Library preserves only what you have truly discovered.",
  },
  {
    id: "runes",
    label: "Ask about rune fragments.",
    response:
      "Some spells are not learned whole. Bring me a fragment worth studying, and perhaps a grimoire will answer.",
  },
  {
    id: "work",
    label: "Any work available?",
    response:
      "Not yet. But missing pages, strange runes, and sealed grimoires have a habit of becoming quests.",
  },
];

export function LibraryDialogueOverlay({
  onClose,
}: LibraryDialogueOverlayProps) {
  const titleId = useId();
  const [selectedTopic, setSelectedTopic] =
    useState<LibraryDialogueTopic | null>(null);

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
      className="library-dialogue-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="library-dialogue"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="library-dialogue__header">
          <div className="library-dialogue__identity">
            <div className="library-dialogue__avatar" aria-hidden="true">
              L
            </div>

            <div>
              <span>Keeper of The Library</span>
              <h2 id={titleId}>Elara the Librarian</h2>
            </div>
          </div>

          <button
            type="button"
            className="library-dialogue__close"
            onClick={onClose}
            aria-label="Close dialogue"
            autoFocus
          >
            x
          </button>
        </header>

        <div className="library-dialogue__speech">
          <span>{selectedTopic ? "Response" : "Greeting"}</span>
          <p>
            &ldquo;
            {selectedTopic?.response ??
              "Welcome to the Library. Choose a shelf carefully; some records prefer to stay quiet until you earn their names."}
            &rdquo;
          </p>
        </div>

        <div className="library-dialogue__topics" aria-label="Dialogue topics">
          {LIBRARY_DIALOGUE_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={
                selectedTopic?.id === topic.id
                  ? "library-dialogue__topic library-dialogue__topic--active"
                  : "library-dialogue__topic"
              }
              aria-pressed={selectedTopic?.id === topic.id}
              onClick={() => setSelectedTopic(topic)}
            >
              {topic.label}
            </button>
          ))}

          <button
            type="button"
            className="library-dialogue__topic library-dialogue__topic--leave"
            onClick={onClose}
          >
            Return to The Library
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
