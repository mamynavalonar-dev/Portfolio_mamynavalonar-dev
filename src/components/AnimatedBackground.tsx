"use client";

import React, { useEffect, useRef } from "react";

const AnimatedBackground = () => {
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let requestId: number | null = null;

    const updateBlobs = () => {
      requestId = null;
      const scroll = window.pageYOffset;

      blobRefs.current.forEach((blob, index) => {
        if (!blob) return;

        const xOffset = Math.sin(scroll / 120 + index * 0.6) * 100;

        const yOffset = Math.cos(scroll / 120 + index * 0.6) * 35;

        blob.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      });
    };

    const handleScroll = () => {
      if (requestId !== null) return;
      requestId = requestAnimationFrame(updateBlobs);
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    updateBlobs();
    if (!reducedMotion) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (requestId !== null) cancelAnimationFrame(requestId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0">
        {/* kiri atas */}
        <div
          ref={(ref) => {
            blobRefs.current[0] = ref;
          }}
          className="absolute top-10 left-10 w-40 h-40 md:w-56 md:h-56 rounded-full bg-white blur-[90px] opacity-30 transition-transform duration-[1200ms] ease-out"
        />

        {/* kanan atas */}
        <div
          ref={(ref) => {
            blobRefs.current[1] = ref;
          }}
          className="absolute top-10 right-10 w-40 h-40 md:w-56 md:h-56 rounded-full bg-zinc-300 blur-[100px] opacity-25 transition-transform duration-[1200ms] ease-out"
        />

        {/* kiri bawah */}
        <div
          ref={(ref) => {
            blobRefs.current[2] = ref;
          }}
          className="absolute bottom-10 left-10 w-44 h-44 md:w-60 md:h-60 rounded-full bg-zinc-400 blur-[110px] opacity-30 transition-transform duration-[1200ms] ease-out"
        />

        {/* kanan bawah */}
        <div
          ref={(ref) => {
            blobRefs.current[3] = ref;
          }}
          className="absolute bottom-10 right-10 w-40 h-40 md:w-56 md:h-56 rounded-full bg-white blur-[100px] opacity-20 transition-transform duration-[1200ms] ease-out"
        />
      </div>
    </div>
  );
};

export default AnimatedBackground;
