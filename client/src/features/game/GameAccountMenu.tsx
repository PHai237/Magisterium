import { useEffect, useRef, useState } from "react";

interface GameAccountMenuProps {
  characterName: string;
  onBackToCharacters: () => void;
  onLogout: () => void;
}

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function GameAccountMenu({
  characterName,
  onBackToCharacters,
  onLogout
}: GameAccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, []);

  function runAndClose(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="gameshell-account" ref={menuRef}>
      <button
        type="button"
        className="gameshell-account__avatar"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {getInitialLetter(characterName)}
      </button>

      {isOpen ? (
        <div className="gameshell-account-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(onBackToCharacters)}
          >
            <span aria-hidden="true">👤</span>
            Character Selection
          </button>

          <button type="button" role="menuitem" disabled>
            <span aria-hidden="true">⚙️</span>
            Settings
          </button>

          <div className="gameshell-account-menu__divider" />

          <button
            type="button"
            role="menuitem"
            className="gameshell-account-menu__danger"
            onClick={() => runAndClose(onLogout)}
          >
            <span aria-hidden="true">⏻</span>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}