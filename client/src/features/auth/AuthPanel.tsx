import { type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { AuthResponse } from "../../domain/magisterium.types";
import { authApi } from "./auth.api";
import "./auth.css";

interface AuthPanelProps {
  onAuthSuccess: (response: AuthResponse) => void;
}

type AuthMode = "login" | "register";

export function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode() {
    setMode((previousMode) =>
      previousMode === "login" ? "register" : "login"
    );

    setError(null);
    setUsernameOrEmail("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function validateForm(): string | null {
    if (mode === "login" && !usernameOrEmail.trim()) {
      return "Username or email is required.";
    }

    if (mode === "register" && !username.trim()) {
      return "Username is required.";
    }

    if (mode === "register" && !email.trim()) {
      return "Email is required.";
    }

    if (!password) {
      return "Password is required.";
    }

    if (mode === "register" && password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response =
        mode === "login"
          ? await authApi.login({
              identifier: usernameOrEmail.trim(),
              password
            })
          : await authApi.register({
              username: username.trim(),
              email: email.trim(),
              password
            });

      onAuthSuccess(response);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <section className="auth-card">
          <header className="auth-header">
            <h2 className="auth-title">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p className="auth-subtitle">
              {mode === "login"
                ? "Enter your credentials to continue your journey."
                : "Begin your journey in the world of Magisterium."}
            </p>
          </header>

          <form
            className="auth-form"
            autoComplete={mode === "register" ? "off" : "on"}
            onSubmit={(event) => void handleAuthSubmit(event)}
          >
            {error ? <div className="error-banner">{error}</div> : null}

            {mode === "login" ? (
              <div className="auth-field">
                <label className="form-label" htmlFor="auth-identifier">
                  Username or Email
                </label>

                <input
                  id="auth-identifier"
                  name="magisterium-login-identifier"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(event) => setUsernameOrEmail(event.target.value)}
                  placeholder="Enter your account name..."
                  disabled={busy}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            ) : (
              <>
                <div className="auth-field">
                  <label className="form-label" htmlFor="auth-username">
                    Username
                  </label>

                  <input
                    id="auth-username"
                    name="magisterium-register-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Choose a username..."
                    disabled={busy}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    data-form-type="other"
                    data-lpignore="true"
                  />
                </div>

                <div className="auth-field">
                  <label className="form-label" htmlFor="auth-email">
                    Email
                  </label>

                  <input
                    id="auth-email"
                    name="magisterium-register-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address..."
                    disabled={busy}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              </>
            )}

            <div className="auth-field">
              <label className="form-label" htmlFor="auth-password">
                Password
              </label>

              <input
                id="auth-password"
                name={
                  mode === "login"
                    ? "magisterium-login-password"
                    : "magisterium-register-password"
                }
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password..."
                disabled={busy}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            {mode === "register" ? (
              <div className="auth-field">
                <label className="form-label" htmlFor="auth-confirm">
                  Confirm Password
                </label>

                <input
                  id="auth-confirm"
                  name="magisterium-register-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Retype your password..."
                  disabled={busy}
                  autoComplete="new-password"
                />
              </div>
            ) : null}

            <Button type="submit" className="auth-submit-btn" disabled={busy}>
              {busy
                ? mode === "login"
                  ? "Connecting..."
                  : "Creating account..."
                : mode === "login"
                  ? "Enter Magisterium"
                  : "Create Account"}
            </Button>
          </form>

          <div className="auth-switch-zone">
            <span>
              {mode === "login"
                ? "New to the realm?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              className="auth-switch-link"
              onClick={switchMode}
              disabled={busy}
            >
              {mode === "login" ? "Create Account" : "Sign In"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}