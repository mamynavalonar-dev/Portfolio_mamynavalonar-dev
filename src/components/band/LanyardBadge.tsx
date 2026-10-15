"use client";

import dynamic from "next/dynamic";
import { Component, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import useMediaQuery from "@/hooks/useMediaQuery";
import { loadBadgeScene } from "@/lib/badgeScene";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { markStartup } from "@/lib/startupMetrics";

const BandApp = dynamic(loadBadgeScene, { ssr: false, loading: () => null });
const badgeMedia = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

type BadgeProps = {
  startEntrance: boolean;
  onReady?: () => void;
  onUnavailable?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onMotionChange?: (moving: boolean) => void;
};

class BadgeErrorBoundary extends Component<
  { onFailure: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Badge 3D indisponible", error, info.componentStack);
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function PreparedBadge({ startEntrance, onReady, onUnavailable, onDragChange, onMotionChange }: BadgeProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const firstFrame = useRef(0);
  const notified = useRef(false);
  const warmFrames = useRef(0);
  const warmComplete = useRef(false);
  const failureRef = useRef(false);

  const drawWarmFrame = useCallback(function warmFrame() {
    if (failureRef.current || warmComplete.current) return;
    warmFrames.current += 1;
    if (warmFrames.current < 6) firstFrame.current = window.requestAnimationFrame(warmFrame);
    else {
      warmComplete.current = true;
      markStartup("badge-ready");
      setReady(true);
      onReady?.();
    }
  }, [onReady]);

  const handleReady = useCallback(() => {
    if (notified.current) return;
    notified.current = true;
    markStartup("scene-first-frame");

    // Les programmes sont compilés et le premier dessin a été soumis.
    // Le petit délai laisse le navigateur présenter le badge avant la chute.
    firstFrame.current = window.requestAnimationFrame(drawWarmFrame);
  }, [drawWarmFrame]);

  const handleFailure = useCallback((error?: unknown) => {
    window.cancelAnimationFrame(firstFrame.current);
    failureRef.current = true;
    setFailed(true);
    setReady(false);
    if (error) console.error("Badge 3D indisponible", error);
    onDragChange?.(false);
    onMotionChange?.(false);
    onUnavailable?.();
  }, [onDragChange, onMotionChange, onUnavailable]);

  useEffect(() => {
    // StrictMode réexécute les effets en développement. Une préparation déjà
    // signalée doit reprendre après son nettoyage, au lieu de rester cachée.
    if (notified.current && !warmComplete.current && !failureRef.current) {
      window.cancelAnimationFrame(firstFrame.current);
      firstFrame.current = window.requestAnimationFrame(drawWarmFrame);
    }
    return () => {
      window.cancelAnimationFrame(firstFrame.current);
    };
  }, [drawWarmFrame]);

  const showCanvas = ready && startEntrance && !failed;
  useEffect(() => { if (showCanvas) markStartup("badge-visible"); }, [showCanvas]);

  return (
    <>
      {!failed && (
        <div
          data-badge-canvas=""
          data-badge-ready={showCanvas}
          className="absolute inset-0"
          style={{ opacity: showCanvas ? 1 : 0, pointerEvents: showCanvas ? "auto" : "none" }}
        >
          <BadgeErrorBoundary onFailure={handleFailure}>
            <Suspense fallback={null}>
              <BandApp
                onReady={handleReady}
                onError={handleFailure}
                onDragChange={onDragChange}
                onMotionChange={onMotionChange}
                startEntrance={showCanvas}
              />
            </Suspense>
          </BadgeErrorBoundary>
        </div>
      )}
      {failed && startEntrance && (
        <div data-badge-fallback="" className="absolute right-[10%] top-[18%] w-[220px] overflow-hidden rounded-3xl border border-white/15 bg-black/50">
          <ResponsiveImage
            src="/assets/PP.webp"
            alt="Photo de Mamy Navalona Antonio"
            sizes="220px"
            width={440}
            height={550}
            className="h-[275px] w-full object-cover"
          />
        </div>
      )}
    </>
  );
}

export default function LanyardBadge(props: BadgeProps) {
  const canAnimate = useMediaQuery(badgeMedia);

  // Monte le véritable composant d'origine pendant l'introduction. Le seul
  // signal transmis à sa physique reste startEntrance, après la sortie.
  return canAnimate ? <PreparedBadge {...props} /> : null;
}
