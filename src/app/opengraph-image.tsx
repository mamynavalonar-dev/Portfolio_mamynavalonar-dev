import { ImageResponse } from "next/og";

export const alt = "Portfolio de RAKOTONIAINA Mamy Navalona Antonio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          color: "white",
          background:
            "radial-gradient(circle at 80% 20%, #30343b 0%, #111318 36%, #050505 72%)",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 5, color: "#a1a1aa" }}>
          PORTFOLIO · 2026
        </div>
        <div style={{ marginTop: 28, fontSize: 66, fontWeight: 800, lineHeight: 1.05 }}>
          Mamy Navalona Antonio
        </div>
        <div style={{ marginTop: 24, fontSize: 34, color: "#d4d4d8" }}>
          Développeur Full Stack
        </div>
        <div style={{ marginTop: 54, display: "flex", gap: 18, fontSize: 21, color: "#a1a1aa" }}>
          <span>Next.js</span><span>•</span><span>React</span><span>•</span><span>TypeScript</span><span>•</span><span>Supabase</span>
        </div>
      </div>
    ),
    size,
  );
}
