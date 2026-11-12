import type { ReactNode } from "react";

import Aurora from "@/components/Aurora";
import LightPillar from "@/components/LightPillar";

import styles from "./marketplace-layout.module.css";

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.background} aria-hidden="true">

        <div className={styles.baseGlow} />

        <div className={styles.auroraLayer}>
          <Aurora
            colorStops={[
              "#8FE3FF",
              "#E8F6FF",
              "#6F9BFF",
            ]}
            amplitude={0.7}
            blend={0.5}
            height={0.45}
            speed={0.45}
            glow={0.6}
            brightness={0.8}
            layers={2}
            scale={1}
            direction="top"
            mouseInteraction={true}
            intro={true}
            opacity={0.85}
            dpr={1}
          />
        </div>

        <div className={styles.pillarLayer}>
          <LightPillar
            topColor="#22D3EE"
            bottomColor="#FFF0D9"
            intensity={1}
            glowAmount={0.002}
            bloom={0.6}
            pillarWidth={2.5}
            pillarHeight={0.4}
            pillarRotation={90}
            rotationSpeed={0.12}
            flow={0.7}
            interactive={true}
            clickPulse={false}
            intro={true}
            quality="medium"
            mixBlendMode="screen"
            twist={0.6}
            detail={4}
            noiseIntensity={0.12}
            fade={0.28}
          />
        </div>

        <div className={styles.creamAtmosphere} />
        <div className={styles.lowerFade} />

      </div>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
