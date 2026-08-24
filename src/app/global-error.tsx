"use client";

// Catches errors thrown in the root layout itself (must render its own <html>/<body>).
// Keeps users on a branded page rather than the framework's stark 500 shell.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#f8fafc",
          color: "#0f232e",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 460 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Keyd is temporarily unavailable</h1>
          <p style={{ color: "#64748b" }}>We hit a temporary problem. Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#225d78",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>Reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
