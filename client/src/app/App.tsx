import { useCallback, useEffect, useState } from "react";

import type {
  AuthResponse,
  CharacterSnapshot,
  UserSessionSnapshot
} from "../domain/magisterium.types";

import { MagisteriumBrand } from "../components/brand/MagisteriumBrand";

import { AuthPanel } from "../features/auth/AuthPanel";
import { authApi } from "../features/auth/auth.api";
import { CharacterPanel } from "../features/characters/CharacterPanel";
import { GameShell } from "../features/game/GameShell";
import {
  clearStoredAuthToken,
  writeStoredAuthToken
} from "../lib/storage/auth-token";

type AppScreen = "character_gate" | "game";

export function App() {
  const [user, setUser] = useState<UserSessionSnapshot | null>(null);
  const [currentCharacter, setCurrentCharacter] =
    useState<CharacterSnapshot | null>(null);
  const [screen, setScreen] = useState<AppScreen>("character_gate");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionUser = await authApi.me();

        setUser(sessionUser);

        if (!sessionUser) {
          clearStoredAuthToken();
          setCurrentCharacter(null);
          setScreen("character_gate");
        }
      } catch {
        clearStoredAuthToken();
        setUser(null);
        setCurrentCharacter(null);
        setScreen("character_gate");
      } finally {
        setInitializing(false);
      }
    }

    void loadSession();
  }, []);

  const handleAuthSuccess = useCallback((response: AuthResponse) => {
    writeStoredAuthToken(response.token);
    setUser(response.user);
    setCurrentCharacter(null);
    setScreen("character_gate");
  }, []);

  const handleCurrentCharacterChange = useCallback(
    (character: CharacterSnapshot | null) => {
      setCurrentCharacter(character);

      if (!character) {
        setScreen("character_gate");
      }
    },
    []
  );

  const handleEnterWorld = useCallback((character: CharacterSnapshot) => {
    setCurrentCharacter(character);
    setScreen("game");
  }, []);

  const handleCharacterUpdated = useCallback((character: CharacterSnapshot) => {
    setCurrentCharacter(character);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local logout still wins if server session is already gone.
    } finally {
      clearStoredAuthToken();
      setUser(null);
      setCurrentCharacter(null);
      setScreen("character_gate");
    }
  }, []);

  if (user && currentCharacter && screen === "game") {
    return (
      <main className="phase5-root">
        <GameShell
          userId={user.id}
          currentCharacter={currentCharacter}
          onBackToCharacters={() => setScreen("character_gate")}
          onCharacterUpdated={handleCharacterUpdated}
          onLogout={() => void handleLogout()}
        />
      </main>
    );
  }

  return (
    <main className="phase5-root">
      <header className="phase5-topbar phase5-topbar--gate">
        <MagisteriumBrand compact />

        {user ? (
          <div className="phase5-topbar__actions">
            <button
              className="phase5-logout-button phase5-logout-button--icon"
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Logout"
              data-tooltip="Logout"
            >
              <svg
                aria-hidden="true"
                className="phase5-logout-icon"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path d="M12 3v9" />
                <path d="M7.1 6.8a7 7 0 1 0 9.8 0" />
              </svg>
            </button>
          </div>
        ) : null}
      </header>

      <section className="phase5-workspace">
        {initializing ? (
          <div className="phase5-loading-screen">
            <span>Loading...</span>
          </div>
        ) : user ? (
          <CharacterPanel
            userId={user.id}
            onCurrentCharacterChange={handleCurrentCharacterChange}
            onEnterWorld={handleEnterWorld}
          />
        ) : (
          <AuthPanel onAuthSuccess={handleAuthSuccess} />
        )}
      </section>
    </main>
  );
}
