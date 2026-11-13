export default function RenderTestPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "linear-gradient(135deg, #0B3650 0%, #126079 50%, #071B2D 100%)",
        color: "#FFF0D9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 700,
          marginBottom: "16px",
        }}
      >
        KitCart Render Test
      </h1>

      <p
        style={{
          fontSize: "20px",
          color: "#8FE2E8",
          textAlign: "center",
        }}
      >
        If you can see this page, basic Next.js rendering works.
      </p>

      <div
        style={{
          marginTop: "32px",
          padding: "24px 36px",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,240,217,0.5)",
        }}
      >
        Ocean Teal + Cyan + Cream
      </div>
    </main>
  );
}
