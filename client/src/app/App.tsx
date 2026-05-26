import { useEffect, useState } from "react";

import type {
  AuthResponse,
  CharacterSnapshot,
  UserSessionSnapshot
} from "../domain/magisterium.types";
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

  function handleAuthSuccess(response: AuthResponse) {
    writeStoredAuthToken(response.token);
    setUser(response.user);
    setCurrentCharacter(null);
    setScreen("character_gate");
  }

  function handleCurrentCharacterChange(character: CharacterSnapshot | null) {
    setCurrentCharacter(character);

    if (!character) {
      setScreen("character_gate");
    }
  }

  function handleEnterWorld(character: CharacterSnapshot) {
    setCurrentCharacter(character);
    setScreen("game");
  }

  function handleCharacterUpdated(character: CharacterSnapshot) {
    setCurrentCharacter(character);
  }

  async function handleLogout() {
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
  }

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
        <div className="phase5-brand phase5-brand--gate">
          <h1>MAGISTERIUM</h1>
        </div>

        {user ? (
          <button
            className="phase5-logout-button"
            type="button"
            onClick={() => void handleLogout()}
          >
            Logout
          </button>
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