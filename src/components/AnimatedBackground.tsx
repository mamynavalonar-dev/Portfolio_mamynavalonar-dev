"use client";

import GradientWaves from "@/components/background/GradientWaves";

export default function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#09090d]"
    >
      <GradientWaves />

      <div className="absolute inset-0 bg-black/18" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(255,255,255,0.025), transparent 36%), linear-gradient(to bottom, rgba(5,5,8,0.04), rgba(5,5,8,0.2))",
        }}
      />
    </div>
  );
}
