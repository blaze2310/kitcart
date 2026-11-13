"use client";

import { useRef, useState, type PointerEvent } from "react";

import Aurora from "@/components/Aurora";
import LightPillar from "@/components/LightPillar";

import styles from "./combo.module.css";

type ViewMode = "aurora" | "pillar" | "both";

export default function BackgroundComboTest() {
  const [mode, setMode] = useState<ViewMode>("both");
  const [showControls, setShowControls] = useState(true);

  const pillarRef = useRef<HTMLDivElement>(null);

  const showAurora = mode === "aurora" || mode === "both";
  const showPillar = mode === "pillar" || mode === "both";

  const MAX_PILLAR_MOVEMENT = 12;

  function handlePointerMove(
    event: PointerEvent<HTMLElement>
  ) {
    if (!pillarRef.current || !showPillar) {
      return;
    }

    if (event.pointerType === "touch") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const normalizedX =
      ((event.clientX - rect.left) / rect.width - 0.5) * 2;

    const normalizedY =
      ((event.clientY - rect.top) / rect.height - 0.5) * 2;

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
    if (!pillarRef.current) {
      return;
    }

    pillarRef.current.style.transform = "rotate(-90deg)";
  }

  return (
    <main
      className={styles.scene}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {showAurora && (
        <div className={`${styles.effect} ${styles.aurora}`}>
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
      )}

      {showPillar && (
        <div
          ref={pillarRef}
          className={`${styles.effect} ${styles.pillar}`}
          style={{
            transition: "transform 240ms ease-out",
          }}
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
      )}

      {showControls ? (
        <section className={styles.panel}>
          <div className={styles.eyebrow}>
            KITCART · BACKGROUND LAB
          </div>

          <h1>Aurora + Horizontal Pillar</h1>

          <p>
            Aurora Arctic is the primary background.
            A thinner, softer Ice Light Pillar moves
            gently behind the interface.
          </p>

          <div className={styles.buttons}>
            <button
              type="button"
              aria-pressed={mode === "aurora"}
              onClick={() => setMode("aurora")}
            >
              Aurora only
            </button>

            <button
              type="button"
              aria-pressed={mode === "pillar"}
              onClick={() => setMode("pillar")}
            >
              Pillar only
            </button>

            <button
              type="button"
              aria-pressed={mode === "both"}
              onClick={() => setMode("both")}
            >
              Both
            </button>
          </div>

          <button
            type="button"
            className={styles.hideButton}
            onClick={() => setShowControls(false)}
          >
            Hide controls
          </button>
        </section>
      ) : (
        <button
          type="button"
          className={styles.showButton}
          onClick={() => setShowControls(true)}
        >
          Show controls
        </button>
      )}
    </main>
  );
}