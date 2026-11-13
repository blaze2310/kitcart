import Aurora from "@/components/Aurora";

export default function AuroraTestPage() {
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
        <strong>Aurora Arctic — Independent Test</strong>

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
          href="/pillar-test"
          style={{
            display: "inline-block",
            marginTop: 10,
            fontSize: 12,
            color: "#FFF0D9",
            textDecoration: "underline",
          }}
        >
          Open Light Pillar Test
        </a>
      </div>
    </main>
  );
}
