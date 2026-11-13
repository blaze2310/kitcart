"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

import Aurora from "@/components/Aurora";
import LightPillar from "@/components/LightPillar";

import MarketplaceShell from "@/features/shop/marketplace/marketplace-shell";
import styles from "./marketplace-layout.module.css";

const MAX_PILLAR_MOVEMENT = 10;
const AURORA_COLORS = ["#8fe3ff", "#e8f6ff", "#6f9bff"];

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  const pillarRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pillar = pillarRef.current;
    if (!pillar || event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));

    pillar.style.transform =
      `translate3d(${x * MAX_PILLAR_MOVEMENT}px, ${y * MAX_PILLAR_MOVEMENT}px, 0) rotate(-90deg)`;
  }

  function handlePointerLeave() {
    if (pillarRef.current) {
      pillarRef.current.style.transform = "rotate(-90deg)";
    }
  }

  return (
    <div
      className={styles.shell}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className={styles.background} aria-hidden="true">
        <div className={styles.auroraLayer}>
          <Aurora
            colorStops={AURORA_COLORS}
            amplitude={0.7}
            blend={0.5}
            height={0.45}
            speed={0.7}
            glow={0.65}
            brightness={0.64}
            mouseInteraction={true}
          />
        </div>

        <div ref={pillarRef} className={styles.pillarLayer}>
          <LightPillar
            topColor="#22d3ee"
            bottomColor="#e0f2fe"
            intensity={0.7}
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
        <MarketplaceShell>{children}</MarketplaceShell>
      </div>
    </div>
  );
}
