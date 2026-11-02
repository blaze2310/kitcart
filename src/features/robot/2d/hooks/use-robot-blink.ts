
"use client";

import { useEffect, useState } from "react";

export function useRobotBlink(): boolean {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const clearTimer = () => {
      clearTimeout(timer);
    };

    const scheduleBlink = () => {
      if (disposed || motionPreference.matches) return;

      timer = setTimeout(() => {
        if (disposed) return;

        if (document.hidden) {
          scheduleBlink();
          return;
        }

        setBlinking(true);

        timer = setTimeout(() => {
          if (disposed) return;

          setBlinking(false);

          if (Math.random() < 0.18) {
            timer = setTimeout(() => {
              if (disposed) return;

              setBlinking(true);

              timer = setTimeout(() => {
                if (disposed) return;

                setBlinking(false);
                scheduleBlink();
              }, 140);
            }, 170);
          } else {
            scheduleBlink();
          }
        }, 150);
      }, 3000 + Math.random() * 3000);
    };

    const restart = () => {
      clearTimer();
      setBlinking(false);

      if (
        !document.hidden &&
        !motionPreference.matches
      ) {
        scheduleBlink();
      }
    };

    motionPreference.addEventListener("change", restart);

    document.addEventListener(
      "visibilitychange",
      restart
    );

    scheduleBlink();

    return () => {
      disposed = true;
      clearTimer();

      motionPreference.removeEventListener(
        "change",
        restart
      );

      document.removeEventListener(
        "visibilitychange",
        restart
      );
    };
  }, []);

  return blinking;
}
