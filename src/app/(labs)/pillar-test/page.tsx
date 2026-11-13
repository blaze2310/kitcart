import LightPillar from "@/components/LightPillar";

export default function PillarTestPage() {
  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100svh",
        overflow: "hidden",
        background: "#100f17",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <LightPillar
          topColor="#22d3ee"
          bottomColor="#e0f2fe"
          intensity={1}
          glowAmount={0.002}
          bloom={0.6}
          pillarWidth={2.5}
          pillarHeight={0.4}
          pillarRotation={-15}
          rotationSpeed={0.3}
          interactive
          clickPulse
          intro
          quality="high"
          mixBlendMode="screen"
          twist={0.6}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          zIndex: 10,
          padding: "14px 20px",
          borderRadius: 14,
          background: "rgba(7, 27, 45, 0.88)",
          border: "1px solid rgba(143, 226, 232, 0.35)",
          color: "#FFF0D9",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <strong>Light Pillar Ice — Independent Test</strong>

        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#8FE2E8",
          }}
        >
          Original React Bits preset. No additional effects.
        </p>

        <a
          href="/aurora-test"
          style={{
            display: "inline-block",
            marginTop: 10,
            fontSize: 12,
            color: "#FFF0D9",
            textDecoration: "underline",
          }}
        >
          Open Aurora Test
        </a>
      </div>
    </main>
  );
}
