"use client";

import dynamic from "next/dynamic";
import useMediaQuery from "@/hooks/useMediaQuery";
const GradientWaves = dynamic(() => import("@/components/background/GradientWaves"), { ssr: false });

export default function AnimatedBackground() {
  const animated = useMediaQuery("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#09090d]"
    >
      {animated ? <GradientWaves /> : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#251847_0%,#09090d_65%)]" />}

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
