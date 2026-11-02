
"use client";

import { useEffect, useState } from "react";

const IDLE_DELAY_MS = 5000;
const IDLE_TILT_INTERVAL_MS = 7000;
const IDLE_TILT_DURATION_MS = 1500;

export function useRobotIdle() {
  const [idleTilt, setIdleTilt] = useState(0);
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let idleTimer: ReturnType<typeof setTimeout>;
    let gestureTimer: ReturnType<typeof setTimeout>;
    let resetTimer: ReturnType<typeof setTimeout>;

    let disposed = false;
    let idleActive = false;

    const clearAllTimers = () => {
      clearTimeout(idleTimer);
      clearTimeout(gestureTimer);
      clearTimeout(resetTimer);
    };

    const scheduleIdleGesture = () => {
      if (
        disposed ||
        !idleActive ||
        reducedMotion.matches ||
        document.hidden
      ) {
        return;
      }

      gestureTimer = setTimeout(() => {
        if (disposed || !idleActive) return;

        // Alternate gentle left/right curiosity.
        const direction = Math.random() > 0.5 ? 1 : -1;

        setIdleTilt(direction * 2.5);

        resetTimer = setTimeout(() => {
          if (disposed) return;

          setIdleTilt(0);

          if (idleActive) {
            scheduleIdleGesture();
          }
        }, IDLE_TILT_DURATION_MS);
      }, IDLE_TILT_INTERVAL_MS);
    };

    const enterIdle = () => {
      if (
        disposed ||
        reducedMotion.matches ||
        document.hidden
      ) {
        return;
      }

      idleActive = true;
      setIsIdle(true);

      scheduleIdleGesture();
    };

    const exitIdle = () => {
      clearAllTimers();

      idleActive = false;
      setIsIdle(false);
      setIdleTilt(0);
    };

    const resetIdleCountdown = () => {
      exitIdle();

      if (
        !disposed &&
        !reducedMotion.matches &&
        !document.hidden
      ) {
        idleTimer = setTimeout(enterIdle, IDLE_DELAY_MS);
      }
    };

    window.addEventListener(
      "pointermove",
      resetIdleCountdown,
      { passive: true }
    );

    window.addEventListener(
      "pointerdown",
      resetIdleCountdown,
      { passive: true }
    );

    window.addEventListener(
      "keydown",
      resetIdleCountdown
    );

    document.addEventListener(
      "visibilitychange",
      resetIdleCountdown
    );

    reducedMotion.addEventListener(
      "change",
      resetIdleCountdown
    );

    resetIdleCountdown();

    return () => {
      disposed = true;

      clearAllTimers();

      window.removeEventListener(
        "pointermove",
        resetIdleCountdown
      );

      window.removeEventListener(
        "pointerdown",
        resetIdleCountdown
      );

      window.removeEventListener(
        "keydown",
        resetIdleCountdown
      );

      document.removeEventListener(
        "visibilitychange",
        resetIdleCountdown
      );

      reducedMotion.removeEventListener(
        "change",
        resetIdleCountdown
      );
    };
  }, []);

  return {
    isIdle,
    idleTilt,
  };
}
