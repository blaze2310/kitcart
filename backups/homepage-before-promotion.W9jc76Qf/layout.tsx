
"use client";

import {
  useRef,
  type PointerEvent,
  type ReactNode,
} from "react";

import Aurora from "@/components/Aurora";
import LightPillar from "@/components/LightPillar";

import styles from "./marketplace-layout.module.css";

const MAX_PILLAR_MOVEMENT = 10;

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pillarRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    const pillar = pillarRef.current;

    if (!pillar || event.pointerType === "touch") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const x = Math.max(
      -1,
      Math.min(
        1,
        ((event.clientX - rect.left) / rect.width - 0.5) * 2
      )
    );

    const y = Math.max(
      -1,
      Math.min(
        1,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2
      )
    );

    const offsetX = x * MAX_PILLAR_MOVEMENT;
    const offsetY = y * MAX_PILLAR_MOVEMENT;

    pillar.style.transform =
      `translate3d(${offsetX}px, ${offsetY}px, 0) rotate(-90deg)`;
  }

  function handlePointerLeave() {
    if (!pillarRef.current) {
      return;
    }

    pillarRef.current.style.transform = "rotate(-90deg)";
  }

  return (
    <div
      className={styles.shell}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className={styles.background}
        aria-hidden="true"
      >
        {/* PRIMARY BACKGROUND — INTERACTIVE AURORA */}

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
            mouseInteraction={true}
          />
        </div>

        {/* SECONDARY — GENTLY INTERACTIVE LIGHT PILLAR */}

        <div
          ref={pillarRef}
          className={styles.pillarLayer}
        >
          <LightPillar
            topColor="#22d3ee"
            bottomColor="#e0f2fe"
            intensity={0.6}
            glowAmount={0.0006}
            bloom={0.4}
            pillarWidth={1.5}
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

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
