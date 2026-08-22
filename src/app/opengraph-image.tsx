// Default branded social-sharing image (1200×630), generated at build/request time.
// Next applies this to Open Graph + Twitter for any page that doesn't set its own image.
import { ImageResponse } from "next/og";

export const alt = "Keyd — Sell your home directly to buyers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #225d78 0%, #1b3745 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              background: "white",
              color: "#225d78",
              fontSize: 56,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            K
          </div>
          <div style={{ fontSize: 60, fontWeight: 800 }}>Keyd</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Sell your home directly. No agents. No commission.
        </div>
        <div style={{ fontSize: 30, marginTop: 28, color: "#aed3e1" }}>
          For Sale by Owner · Dallas–Fort Worth
        </div>
      </div>
    ),
    size,
  );
}
