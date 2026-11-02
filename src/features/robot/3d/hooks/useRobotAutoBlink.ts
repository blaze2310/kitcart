
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type RobotAutoBlinkOptions = {
  enabled?: boolean;
  minimumIntervalMs?: number;
  maximumIntervalMs?: number;
  blinkDurationMs?: number;
};

const DEFAULT_MINIMUM_MS = 2500;
const DEFAULT_MAXIMUM_MS = 5000;
const DEFAULT_DURATION_MS = 130;

/**
 * Reusable KitCart 3D robot blinking.
 *
 * - Randomized interval: 2.5–5 seconds
 * - Blink duration: 130 milliseconds
 * - Suspends scheduling while the document is hidden
 * - Clears timers when disabled or unmounted
 * - Never modifies body animations
 * - Supports manual triggering
 */
export function useRobotAutoBlink({
  enabled = true,
  minimumIntervalMs = DEFAULT_MINIMUM_MS,
  maximumIntervalMs = DEFAULT_MAXIMUM_MS,
  blinkDurationMs = DEFAULT_DURATION_MS,
}: RobotAutoBlinkOptions = {}) {
  const [blinking, setBlinking] = useState(false);

  const closeTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const nextTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const clearNextTimer = useCallback(() => {
    if (nextTimer.current !== null) {
      clearTimeout(nextTimer.current);
      nextTimer.current = null;
    }
  }, []);

  const blinkNow = useCallback(() => {
    clearCloseTimer();

    setBlinking(true);

    closeTimer.current = setTimeout(() => {
      setBlinking(false);
      closeTimer.current = null;
    }, Math.max(1, blinkDurationMs));
  }, [blinkDurationMs, clearCloseTimer]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    const schedule = () => {
      clearNextTimer();

      if (!active || document.hidden) {
        return;
      }

      const minimum = Math.max(
        0,
        minimumIntervalMs
      );

      const maximum = Math.max(
        minimum,
        maximumIntervalMs
      );

      const delay =
        minimum +
        Math.random() * (maximum - minimum);

      nextTimer.current = setTimeout(() => {
        nextTimer.current = null;

        if (!active || document.hidden) {
          return;
        }

        blinkNow();
        schedule();
      }, delay);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearNextTimer();
        clearCloseTimer();
        setBlinking(false);
      } else {
        schedule();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    schedule();

    return () => {
      active = false;

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      clearNextTimer();
      clearCloseTimer();
    };
  }, [
    enabled,
    minimumIntervalMs,
    maximumIntervalMs,
    blinkNow,
    clearNextTimer,
    clearCloseTimer,
  ]);

  useEffect(() => {
    if (!enabled) {
      clearNextTimer();
      clearCloseTimer();
    }
  }, [
    enabled,
    clearNextTimer,
    clearCloseTimer,
  ]);

  useEffect(() => {
    return () => {
      clearNextTimer();
      clearCloseTimer();
    };
  }, [clearNextTimer, clearCloseTimer]);

  return {
    blinking,
    blinkNow,
  };
}
