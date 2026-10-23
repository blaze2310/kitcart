
"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import RobotLoginPreview from "@/components/mascot/robot-login-preview";

export default function LoginPreviewPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [usernameFocused, setUsernameFocused] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [pattern, setPattern] = useState("Idle");

  const passwordRef = useRef<HTMLInputElement>(null);

  // Revealing the password is the ONLY trigger
  // for password body animations.
  const passwordAnimationActive =
    passwordFocused && showPassword;

  // Planned visor behavior:
  // Hidden password = idle body, eyes watching field.
  const visorShouldLookAtPassword =
    passwordFocused && !showPassword;

  // Username actions must not override password.
  const usernameAnimationActive =
    usernameFocused && !passwordAnimationActive;

  const handlePatternChange = useCallback(
    (value: string) => setPattern(value),
    []
  );

  const togglePasswordVisibility = () => {
    setShowPassword((previous) => !previous);
    passwordRef.current?.focus();
  };

  return (
    <main className="min-h-screen bg-[#11142B] text-[#F7F8FC]">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            Kit
            <span className="text-[#A8A2FF]">
              Cart
            </span>
          </Link>

          <span className="rounded-full border border-[#A8A2FF]/30 px-4 py-2 text-xs text-[#A8A2FF]">
            Login Interaction Preview
          </span>
        </header>

        <div className="grid min-h-[80vh] items-center gap-8 lg:grid-cols-[55%_45%]">
          <section className="min-w-0">
            <div className="h-[480px] overflow-hidden rounded-3xl border border-white/10 bg-[#11142B] sm:h-[620px]">
              <RobotLoginPreview
                usernameFocused={usernameAnimationActive}
                passwordFocused={passwordAnimationActive}
                onPatternChange={handlePatternChange}
              />
            </div>

            <div className="mt-3 space-y-1 text-center text-sm">
              <p className="text-[#A8A2FF]">
                Robot: {pattern}
              </p>

              <p className="text-white/60">
                {passwordAnimationActive
                  ? "Visible password — reaction active"
                  : visorShouldLookAtPassword
                    ? "Hidden password — visor gaze pending"
                    : usernameFocused
                      ? "Username interaction"
                      : "Normal idle"}
              </p>
            </div>
          </section>

          <section className="w-full max-w-lg px-2 py-8 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
              Welcome back
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Log in to KitCart
            </h1>

            <p className="mt-3 text-sm text-white/60">
              Your shopping buddy is ready to see you again.
            </p>

            <div className="mt-8 space-y-5">
              {/* USERNAME */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm text-white/75"
                >
                  Username
                </label>

                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  onFocus={() =>
                    setUsernameFocused(true)
                  }
                  onBlur={() =>
                    setUsernameFocused(false)
                  }
                  placeholder="Enter your username"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-white outline-none placeholder:text-white/35 focus:border-[#A8A2FF]"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm text-white/75"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    onFocus={() =>
                      setPasswordFocused(true)
                    }
                    onBlur={() =>
                      setPasswordFocused(false)
                    }
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 pr-20 text-white outline-none placeholder:text-white/35 focus:border-[#A8A2FF]"
                  />

                  <button
                    type="button"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={togglePasswordVisibility}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-sm text-[#A8A2FF] hover:bg-white/10"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <p className="mt-2 text-xs text-white/45">
                  {passwordAnimationActive
                    ? "Password visible — robot reaction active."
                    : visorShouldLookAtPassword
                      ? "Password hidden — robot remains idle."
                      : "Click Show to reveal the password."}
                </p>
              </div>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-xl bg-[#6658D9]/60 px-5 py-4 font-semibold text-white/70"
              >
                Log in — Coming Soon
              </button>

              <p className="text-center text-xs leading-relaxed text-white/45">
                Interaction preview only. Credentials
                are not submitted or authenticated.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
