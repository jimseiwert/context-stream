export default function Loading() {
  return (
    <div
      className="dark"
      style={{
        minHeight: "100vh",
        backgroundColor: "#030711",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Loading"
      role="status"
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        {/* Animated logo mark */}
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid rgba(16,185,129,0.15)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#10b981",
              borderRightColor: "#06b6d4",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#5a6a85",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
