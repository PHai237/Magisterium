import { type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { AuthResponse } from "../../domain/magisterium.types";
import { authApi } from "./auth.api";
import "./auth.css";
import { AmbientParticlesCanvas } from "./components/AmbientParticlesCanvas";

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

  function clearFormFields() {
    setError(null);
    setUsernameOrEmail("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function switchMode() {
    if (busy) {
      return;
    }

    setMode((previousMode) =>
      previousMode === "login" ? "register" : "login"
    );

    clearFormFields();
  }

  function validateForm(submitMode: AuthMode): string | null {
    if (submitMode === "login" && !usernameOrEmail.trim()) {
      return "Username or email is required.";
    }

    if (submitMode === "register" && !username.trim()) {
      return "Username is required.";
    }

    if (submitMode === "register" && !email.trim()) {
      return "Email is required.";
    }

    if (!password) {
      return "Password is required.";
    }

    if (submitMode === "register" && password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  }

  async function handleAuthSubmit(
    event: FormEvent<HTMLFormElement>,
    submitMode: AuthMode
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const validationError = validateForm(submitMode);

    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response =
        submitMode === "login"
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
      <AmbientParticlesCanvas />

      <div className="auth-container">
        <div className={`auth-flip auth-flip--${mode}`}>
          <div className="auth-flip__inner">
            <section className="auth-card auth-face auth-face--front">
              <button
                type="button"
                className="auth-flip-button"
                onClick={switchMode}
                disabled={busy}
                aria-label="Flip to register"
                data-tooltip="Register"
              >
                <span aria-hidden="true">⟲</span>
              </button>

              <header className="auth-header">
                <div className="auth-sigil" aria-hidden="true">
                  <span className="auth-sigil__ring auth-sigil__ring--outer" />
                  <span className="auth-sigil__ring auth-sigil__ring--inner" />
                  <span className="auth-sigil__glyph">✦</span>
                </div>

                <h2 className="auth-title">Welcome back</h2>

                <p className="auth-subtitle">
                  Enter your credentials to continue your journey.
                </p>
              </header>

              <form
                className="auth-form"
                autoComplete="on"
                onSubmit={(event) => void handleAuthSubmit(event, "login")}
              >
                {mode === "login" && error ? (
                  <div className="error-banner" role="alert">
                    {error}
                  </div>
                ) : null}

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
                    disabled={busy || mode !== "login"}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                <div className="auth-field">
                  <label className="form-label" htmlFor="auth-login-password">
                    Password
                  </label>

                  <input
                    id="auth-login-password"
                    name="magisterium-login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password..."
                    disabled={busy || mode !== "login"}
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={busy || mode !== "login"}
                >
                  {busy && mode === "login"
                    ? "Connecting..."
                    : "Enter Magisterium"}
                </Button>
              </form>
            </section>

            <section className="auth-card auth-face auth-face--back">
              <button
                type="button"
                className="auth-flip-button"
                onClick={switchMode}
                disabled={busy}
                aria-label="Flip to login"
                data-tooltip="Login"
              >
                <span aria-hidden="true">⟲</span>
              </button>

              <header className="auth-header">
                <h2 className="auth-title">Create your account</h2>

                <p className="auth-subtitle">
                  Begin your journey in the world of Magisterium.
                </p>
              </header>

              <form
                className="auth-form"
                autoComplete="off"
                onSubmit={(event) => void handleAuthSubmit(event, "register")}
              >
                {mode === "register" && error ? (
                  <div className="error-banner" role="alert">
                    {error}
                  </div>
                ) : null}

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
                    disabled={busy || mode !== "register"}
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
                    disabled={busy || mode !== "register"}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                <div className="auth-field">
                  <label className="form-label" htmlFor="auth-register-password">
                    Password
                  </label>

                  <input
                    id="auth-register-password"
                    name="magisterium-register-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password..."
                    disabled={busy || mode !== "register"}
                    autoComplete="new-password"
                  />
                </div>

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
                    disabled={busy || mode !== "register"}
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={busy || mode !== "register"}
                >
                  {busy && mode === "register"
                    ? "Creating account..."
                    : "Create Account"}
                </Button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}