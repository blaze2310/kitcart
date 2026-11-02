
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { useAuthRobot } from "@/features/auth/components/AuthShell";

const providers = ["Google", "Facebook", "GitHub"] as const;
type Provider = (typeof providers)[number];

function ProviderIcon({ name }: { name: Provider }) {
  if (name === "Google") {
    return (
      <svg width="21" height="21" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.79 7.18l7.73 6C44.4 38.01 46.98 31.82 46.98 24.55z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.6.27-3.14.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.04 37.63 27.3 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    );
  }

  if (name === "Facebook") {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.095 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.028 1.792-4.702 4.533-4.702 1.312 0 2.686.235 2.686.235v2.97H15.83c-1.491 0-1.955.93-1.955 1.884v2.273h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.1 24 12.073z" />
      </svg>
    );
  }

  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297a12 12 0 0 0-3.793 23.386c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.118-3.176 0 0 1.008-.323 3.301 1.23A11.53 11.53 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.656 1.652.244 2.873.12 3.176.77.84 1.235 1.91 1.235 3.221 0 4.61-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.825.576A12.001 12.001 0 0 0 12 .297z" />
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState(
    "Google and GitHub sign-in are available. Username/password sign-in is coming later."
  );
  const [connecting, setConnecting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const {
    setUsernameFocused,
    setPasswordVisible,
    passwordVisible: showPassword,
    wave,
  } = useAuthRobot();

  const togglePassword = () => {
    setPasswordVisible(!showPassword);
    passwordRef.current?.focus();
  };

  const connectProvider = async (provider: "google" | "github") => {
    if (connecting) return;

    setConnecting(true);
    setNotice(`Connecting securely to ${provider === "google" ? "Google" : "GitHub"}...`);

    try {
      await signIn(provider, { redirectTo: "/account" });
    } catch {
      setConnecting(false);
      setNotice(`Could not start ${provider === "google" ? "Google" : "GitHub"} sign-in. Please try again.`);
    }
  };

  return (
    <section
      className="kc-glass kc-auth-card kc-enter"
      aria-label="Sign in"
    >
      <span className="kc-eyebrow">
        <Sparkles size={12} />
        YOUR SHOPPING JOURNEY STARTS HERE
      </span>

      <h1 className="kc-heading">
        Welcome back<span>.</span>
      </h1>

      <p className="kc-subtitle">Sign in to your KitCart account</p>

      <div className="kc-social-row">
        {providers.map((name) => (
          <button
            key={name}
            type="button"
            className="kc-social"
            disabled={name === "Facebook" || connecting}
            title={
              name === "Facebook"
                ? "Facebook sign-in is coming soon"
                : `Continue securely with ${name}`
            }
            aria-label={`Sign in with ${name}`}
            onClick={
              name === "Facebook" ? undefined : () => connectProvider(name === "Google" ? "google" : "github")
            }
          >
            <ProviderIcon name={name} />
            <span>{name}</span>
          </button>
        ))}
      </div>

      <div className="kc-divider">or sign in with credentials</div>

      <form
        className="kc-form"
        onSubmit={(event) => {
          event.preventDefault();
          wave();
          setNotice(
            "Username/password authentication will be connected when we build the database backend."
          );
        }}
      >
        <div>
          <label className="kc-field-label" htmlFor="kitcart-username">
            Username
          </label>
          <input
            className="kc-input"
            id="kitcart-username"
            autoComplete="username"
            type="text"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
            placeholder="Enter username"
          />
        </div>

        <div>
          <label className="kc-field-label" htmlFor="kitcart-password">
            Password
          </label>

          <div className="kc-password">
            <input
              ref={passwordRef}
              className="kc-input"
              id="kitcart-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordVisible(false)}
              placeholder="Enter password"
            />

            <button
              className="kc-eye"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onMouseDown={(event) => event.preventDefault()}
              onClick={togglePassword}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          className="kc-forgot"
          type="button"
          disabled
          title="Password recovery is not connected"
        >
          Forgot password?
        </button>

        <button
          className="kc-primary-button"
          type="submit"
          title="Username/password authentication is not connected yet"
        >
          <LockKeyhole size={17} />
          Sign In
          <ArrowRight size={17} />
        </button>
      </form>

      <p className="kc-footer">
        Don&apos;t have an account?{" "}
        <Link href="/signup" onClick={wave}>
          Sign Up
        </Link>
      </p>

      <p className="kc-notice" role="status">
        {notice}
      </p>
    </section>
  );
}
