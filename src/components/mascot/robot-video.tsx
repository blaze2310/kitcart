"use client";

import { useEffect, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, t: number) =>
  start + (end - start) * t;

export default function RobotVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const targetRef = useRef(0.5);
  const currentRef = useRef(0.5);

  const [error, setError] = useState(false);

  // ---- CALIBRATION ----
  // These are percentages of the whole video duration.
  // Adjust CENTER_PROGRESS if the face still looks too much left/right at center.
  const MIN_PROGRESS = 0.08;
  const CENTER_PROGRESS = 0.18;
  const MAX_PROGRESS = 0.52;

  // Lower fps cap = less lag, but less responsive.
  const SEEK_FPS = 18;
  const SMOOTHING = 0.14;
  const SEEK_EPSILON = 1 / 24;

  useEffect(() => {
    let animationFrame = 0;
    let lastSeekMs = 0;

    const handleMouseMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth;
      targetRef.current = clamp(x, 0, 1);
    };

    const animate = (now: number) => {
      const video = videoRef.current;

      currentRef.current +=
        (targetRef.current - currentRef.current) * SMOOTHING;

      const x = currentRef.current;

      // Piecewise mapping:
      // mouse center -> CENTER_PROGRESS
      let progress = CENTER_PROGRESS;

      if (x <= 0.5) {
        progress = lerp(MIN_PROGRESS, CENTER_PROGRESS, x / 0.5);
      } else {
        progress = lerp(CENTER_PROGRESS, MAX_PROGRESS, (x - 0.5) / 0.5);
      }

      if (
        video &&
        video.readyState >= 1 &&
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        const desiredTime = clamp(progress * video.duration, 0.01, video.duration - 0.01);

        const enoughTimePassed = now - lastSeekMs >= 1000 / SEEK_FPS;
        const enoughDifference =
          Math.abs(video.currentTime - desiredTime) > SEEK_EPSILON;

        if (!video.seeking && enoughTimePassed && enoughDifference) {
          if ("fastSeek" in video) {
            // @ts-expect-error browser support varies
            video.fastSeek(desiredTime);
          } else {
            video.currentTime = desiredTime;
          }
          lastSeekMs = now;
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", handleMouseMove, {
      passive: true,
    });

    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 shadow-2xl">
      {error ? (
        <div className="flex h-full items-center justify-center bg-[#11142B] text-[#F7F8FC]">
          Unable to load robot animation.
        </div>
      ) : (
        <video
          ref={videoRef}
          src="/animations/kitcart-robot-headtest.mp4"
          poster="/animations/kitcart-robot-poster.jpg"
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.pause();

            // Start from centered face instead of midpoint
            video.currentTime = video.duration * CENTER_PROGRESS;
          }}
          onError={() => setError(true)}
        />
      )}

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-[#11142B]/65 px-4 py-2 text-xs text-[#F7F8FC] backdrop-blur-md">
        Move your cursor to interact
      </div>
    </div>
  );
}