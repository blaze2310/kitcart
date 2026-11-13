
"use client";

import {
  useRef,
  type ReactNode,
  type PointerEvent,
} from "react";

import Aurora from "@/components/Aurora";
import LightPillar from "@/components/LightPillar";

import styles from "./marketplace-layout.module.css";

const MAX_PILLAR_MOVEMENT = 12;

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pillarRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (!pillarRef.current) return;
    if (event.pointerType === "touch") return;

    const normalizedX =
      (event.clientX / window.innerWidth - 0.5) * 2;

    const normalizedY =
      (event.clientY / window.innerHeight - 0.5) * 2;

    const offsetX =
      Math.max(-1, Math.min(1, normalizedX)) *
      MAX_PILLAR_MOVEMENT;

    const offsetY =
      Math.max(-1, Math.min(1, normalizedY)) *
      MAX_PILLAR_MOVEMENT;

    pillarRef.current.style.transform =
      `translate3d(${offsetX}px, ${offsetY}px, 0) rotate(-90deg)`;
  }

  function handlePointerLeave() {
    if (!pillarRef.current) return;

    pillarRef.current.style.transform =
      "rotate(-90deg)";
  }

  return (
    <div
      className={styles.shell}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* BACKGROUND EFFECTS */}

      <div
        className={styles.background}
        aria-hidden="true"
      >
        {/* PRIMARY — AURORA ARCTIC */}

        <div className={styles.auroraLayer}>
          <Aurora
            colorStops={[
              "#8fe3ff",
              "#e8f6ff",
              "#6f9bff",
            ]}
            amplitude={0.7}
            blend={0.5}
            height={0.45}
            speed={0.7}
            glow={0.6}
            brightness={0.64}
          />
        </div>

        {/* SECONDARY — HORIZONTAL LIGHT PILLAR ICE */}

        <div
          ref={pillarRef}
          className={styles.pillarLayer}
        >
          <LightPillar
            topColor="#22d3ee"
            bottomColor="#e0f2fe"
            intensity={0.42}
            glowAmount={0.0006}
            bloom={0.4}
            pillarWidth={1.1}
            pillarHeight={0.4}
            pillarRotation={-15}
            rotationSpeed={0.3}
            flow={1}
            detail={4}
            fade={0}
            interactive={false}
            clickPulse={false}
            intro
            quality="high"
            mixBlendMode="screen"
            twist={0.6}
          />
        </div>

        <div className={styles.lowerFade} />
      </div>

      {/* EXISTING MARKETPLACE CONTENT */}

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
