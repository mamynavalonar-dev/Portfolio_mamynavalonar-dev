"use client";

export default function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(circle at 10% 12%, rgba(255,255,255,0.12), transparent 28%), radial-gradient(circle at 88% 18%, rgba(190,190,190,0.09), transparent 30%), radial-gradient(circle at 15% 88%, rgba(160,160,160,0.08), transparent 30%), #0d0d0d",
      }}
    />
  );
}
