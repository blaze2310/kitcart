"use client";

import { useState } from "react";

import Aurora from "@/components/Aurora";
import LightPillar from "@/components/LightPillar";

import styles from "./design-lab.module.css";

type EffectMode = "aurora" | "pillar" | "both";
type BackgroundMode = "studio" | "ocean";

export default function DesignLabPage() {
  const [effect, setEffect] = useState<EffectMode>("pillar");
  const [background, setBackground] =
    useState<BackgroundMode>("studio");

  const [rotation, setRotation] = useState(-15);

  const showAurora = effect === "aurora" || effect === "both";
  const showPillar = effect === "pillar" || effect === "both";

  return (
    <main
      className={`${styles.scene} ${
        background === "studio"
          ? styles.studio
          : styles.ocean
      }`}
    >
      <div className={styles.effects} aria-hidden="true">
        {showAurora && (
          <div className={styles.auroraSurface}>
            <Aurora
              colorStops={[
                "#8fe3ff",
                "#e8f6ff",
                "#6f9bff"
              ]}
              amplitude={0.7}
              blend={0.5}
              height={0.45}
              speed={0.7}
              glow={0.6}
            />
          </div>
        )}

        {showPillar && (
          <div className={styles.pillarSurface}>
            <LightPillar
              topColor="#22d3ee"
              bottomColor="#e0f2fe"
              intensity={1}
              glowAmount={0.002}
              bloom={0.6}
              pillarWidth={2.5}
              pillarHeight={0.4}
              pillarRotation={rotation}
              rotationSpeed={0.3}
              interactive
              clickPulse
              intro
              quality="high"
              mixBlendMode="screen"
              twist={0.6}
            />
          </div>
        )}
      </div>

      <section className={styles.panel}>
        <div className={styles.eyebrow}>
          KITCART · REACT BITS TEST
        </div>

        <h1>Effects studio</h1>

        <p>
          Original Arctic and Ice presets.
          No additional masks or opacity reduction.
        </p>

        <div className={styles.group}>
          <div className={styles.label}>Effect</div>

          <div className={styles.buttons}>
            <button
              type="button"
              aria-pressed={effect === "aurora"}
              className={
                effect === "aurora" ? styles.active : ""
              }
              onClick={() => setEffect("aurora")}
            >
              Aurora
            </button>

            <button
              type="button"
              aria-pressed={effect === "pillar"}
              className={
                effect === "pillar" ? styles.active : ""
              }
              onClick={() => setEffect("pillar")}
            >
              Pillar
            </button>

            <button
              type="button"
              aria-pressed={effect === "both"}
              className={
                effect === "both" ? styles.active : ""
              }
              onClick={() => setEffect("both")}
            >
              Both
            </button>
          </div>
        </div>

        <div className={styles.group}>
          <div className={styles.label}>Background</div>

          <div className={styles.buttons}>
            <button
              type="button"
              aria-pressed={background === "studio"}
              className={
                background === "studio" ? styles.active : ""
              }
              onClick={() => setBackground("studio")}
            >
              Dark studio
            </button>

            <button
              type="button"
              aria-pressed={background === "ocean"}
              className={
                background === "ocean" ? styles.active : ""
              }
              onClick={() => setBackground("ocean")}
            >
              KitCart teal
            </button>
          </div>
        </div>

        {showPillar && (
          <div className={styles.group}>
            <label
              className={styles.label}
              htmlFor="pillar-rotation"
            >
              Pillar rotation: {rotation}°
            </label>

            <input
              id="pillar-rotation"
              className={styles.slider}
              type="range"
              min="-180"
              max="180"
              step="5"
              value={rotation}
              onChange={(event) =>
                setRotation(Number(event.target.value))
              }
            />

            <div className={styles.hint}>
              Original Ice preset: −15°
            </div>

            <button
              type="button"
              className={styles.reset}
              onClick={() => setRotation(-15)}
            >
              Reset rotation
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
