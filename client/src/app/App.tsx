import { useEffect, useState } from "react";

import type {
  AuthResponse,
  CharacterSnapshot,
  UserSessionSnapshot
} from "../domain/magisterium.types";
import { AuthPanel } from "../features/auth/AuthPanel";
import { authApi } from "../features/auth/auth.api";
import { CharacterPanel } from "../features/characters/CharacterPanel";
import {
  clearStoredAuthToken,
  writeStoredAuthToken
} from "../lib/storage/auth-token";

export function App() {
  const [user, setUser] = useState<UserSessionSnapshot | null>(null);
  const [, setCurrentCharacter] = useState<CharacterSnapshot | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionUser = await authApi.me();
        setUser(sessionUser);
      } catch {
        clearStoredAuthToken();
        setUser(null);
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
    }
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
            onCurrentCharacterChange={setCurrentCharacter}
          />
        ) : (
          <AuthPanel onAuthSuccess={handleAuthSuccess} />
        )}
      </section>
    </main>
  );
}