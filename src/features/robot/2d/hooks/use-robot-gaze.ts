
"use client";

import { useEffect, useRef, useState } from "react";

export type Gaze = {
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function useRobotGaze(): Gaze {
  const [gaze, setGaze] = useState<Gaze>({
    x: 0,
    y: 0,
  });

  const targetRef = useRef<Gaze>({ x: 0, y: 0 });
  const currentRef = useRef<Gaze>({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrame = 0;
    let active = true;

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updateTarget = (event: PointerEvent) => {
      if (motionPreference.matches) {
        targetRef.current = { x: 0, y: 0 };
        return;
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      targetRef.current = {
        x: clamp(
          (event.clientX - centerX) /
            Math.max(centerX, 1),
          -1,
          1
        ),
        y: clamp(
          (event.clientY - centerY) /
            Math.max(centerY, 1),
          -1,
          1
        ),
      };
    };

    const resetGaze = () => {
      targetRef.current = { x: 0, y: 0 };
    };

    const animate = () => {
      if (!active) return;

      const target = motionPreference.matches
        ? { x: 0, y: 0 }
        : targetRef.current;

      const current = currentRef.current;

      const next = {
        x: current.x + (target.x - current.x) * 0.12,
        y: current.y + (target.y - current.y) * 0.12,
      };

      currentRef.current = next;

      setGaze((previous) => {
        if (
          Math.abs(previous.x - next.x) < 0.0005 &&
          Math.abs(previous.y - next.y) < 0.0005
        ) {
          return previous;
        }

        return next;
      });

      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", updateTarget, {
      passive: true,
    });

    window.addEventListener("blur", resetGaze);

    motionPreference.addEventListener(
      "change",
      resetGaze
    );

    animationFrame = requestAnimationFrame(animate);

    return () => {
      active = false;

      window.removeEventListener(
        "pointermove",
        updateTarget
      );

      window.removeEventListener("blur", resetGaze);

      motionPreference.removeEventListener(
        "change",
        resetGaze
      );

      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return gaze;
}
