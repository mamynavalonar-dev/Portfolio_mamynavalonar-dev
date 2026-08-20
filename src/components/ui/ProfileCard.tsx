"use client";

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

const DEFAULT_INNER_GRADIENT =
  "linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)";

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180,
} as const;

const clamp = (v: number, min = 0, max = 100): number =>
  Math.min(Math.max(v, min), max);
const round = (v: number, precision = 3): number =>
  parseFloat(v.toFixed(precision));
const adjust = (
  v: number,
  fMin: number,
  fMax: number,
  tMin: number,
  tMax: number,
): number => round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

// Injecte les keyframes une seule fois
const KEYFRAMES_ID = "pc-keyframes";
if (typeof document !== "undefined" && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes pc-holo-bg {
      0% { background-position: 0 var(--background-y), 0 0, center; }
      100% { background-position: 0 var(--background-y), 90% 90%, center; }
    }
  `;
  document.head.appendChild(style);
}

interface ProfileCardProps {
  avatarUrl?: string;
  miniAvatarUrl?: string;
  innerGradient?: string;
  behindGlowEnabled?: boolean;
  behindGlowColor?: string;
  behindGlowSize?: string;
  className?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;
  name?: string;
  title?: string;
  handle?: string;
  status?: string;
  contactText?: string;
  showUserInfo?: boolean;
  onContactClick?: () => void;
}

interface TiltEngine {
  setImmediate: (x: number, y: number) => void;
  setTarget: (x: number, y: number) => void;
  toCenter: () => void;
  beginInitial: (durationMs: number) => void;
  getCurrent: () => { x: number; y: number; tx: number; ty: number };
  cancel: () => void;
}

const ProfileCardComponent: React.FC<ProfileCardProps> = ({
  avatarUrl = "/assets/PP.webp",
  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,
  behindGlowSize,
  className = "",
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  miniAvatarUrl,
  name = "RAKOTONIAINA Mamy Navalona Antonio",
  title = "Développeur Full Stack",
  handle = "mamynavalonar-dev",
  status = "Disponible",
  contactText = "Me contacter",
  showUserInfo = true,
  onContactClick,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const enterTimerRef = useRef<number | null>(null);
  const leaveRafRef = useRef<number | null>(null);

  const tiltEngine = useMemo<TiltEngine | null>(() => {
    if (!enableTilt) return null;
    if (typeof window === "undefined") return null;

    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x: number, y: number): void => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties: Record<string, string> = {
        "--pointer-x": `${percentX}%`,
        "--pointer-y": `${percentY}%`,
        "--background-x": `${adjust(percentX, 0, 100, 35, 65)}%`,
        "--background-y": `${adjust(percentY, 0, 100, 35, 65)}%`,
        "--pointer-from-center": `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        "--pointer-from-top": `${percentY / 100}`,
        "--pointer-from-left": `${percentX / 100}`,
        "--rotate-x": `${round(-(centerX / 5))}deg`,
        "--rotate-y": `${round(centerY / 4)}deg`,
      };

      for (const [k, v] of Object.entries(properties))
        wrap.style.setProperty(k, v);
    };

    const step = (ts: number): void => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar =
        Math.abs(targetX - currentX) > 0.05 ||
        Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = (): void => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x: number, y: number): void {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x: number, y: number): void {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter(): void {
        const shell = shellRef.current;
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs: number): void {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent(): { x: number; y: number; tx: number; ty: number } {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel(): void {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      },
    };
  }, [enableTilt]);

  const getOffsets = (
    evt: PointerEvent,
    el: HTMLElement,
  ): { x: number; y: number } => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    (event: PointerEvent): void => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine],
  );

  const handlePointerEnter = useCallback(
    (event: PointerEvent): void => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      shell.classList.add("active");
      shell.classList.add("entering");
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove("entering");
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine],
  );

  const handlePointerLeave = useCallback((): void => {
    const shell = shellRef.current;
    if (!shell || !tiltEngine) return;

    tiltEngine.toCenter();

    const checkSettle = (): void => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      const settled = Math.hypot(tx - x, ty - y) < 0.6;
      if (settled) {
        shell.classList.remove("active");
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent): void => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(
        centerX + gamma * mobileTiltSensitivity,
        0,
        shell.clientWidth,
      );
      const y = clamp(
        centerY +
          (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * mobileTiltSensitivity,
        0,
        shell.clientHeight,
      );

      tiltEngine.setTarget(x, y);
    },
    [tiltEngine, mobileTiltSensitivity],
  );

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;

    const shell = shellRef.current;
    if (!shell) return;

    const pointerMoveHandler = handlePointerMove as EventListener;
    const pointerEnterHandler = handlePointerEnter as EventListener;
    const pointerLeaveHandler = handlePointerLeave as EventListener;
    const deviceOrientationHandler = handleDeviceOrientation as EventListener;

    shell.addEventListener("pointerenter", pointerEnterHandler);
    shell.addEventListener("pointermove", pointerMoveHandler);
    shell.addEventListener("pointerleave", pointerLeaveHandler);

    const handleClick = (): void => {
      if (!enableMobileTilt || location.protocol !== "https:") return;
      const anyMotion = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<string>;
      };
      if (anyMotion && typeof anyMotion.requestPermission === "function") {
        anyMotion
          .requestPermission()
          .then((state: string) => {
            if (state === "granted") {
              window.addEventListener(
                "deviceorientation",
                deviceOrientationHandler,
              );
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener("deviceorientation", deviceOrientationHandler);
      }
    };
    shell.addEventListener("click", handleClick);

    const initialX =
      (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);

    return () => {
      shell.removeEventListener("pointerenter", pointerEnterHandler);
      shell.removeEventListener("pointermove", pointerMoveHandler);
      shell.removeEventListener("pointerleave", pointerLeaveHandler);
      shell.removeEventListener("click", handleClick);
      window.removeEventListener("deviceorientation", deviceOrientationHandler);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove("entering");
    };
  }, [
    enableTilt,
    enableMobileTilt,
    tiltEngine,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
    handleDeviceOrientation,
  ]);

  const cardRadius = "30px";

  const cardStyle = useMemo(
    () =>
      ({
        "--inner-gradient": innerGradient ?? DEFAULT_INNER_GRADIENT,
        "--behind-glow-color": behindGlowColor ?? "rgba(255, 255, 255, 0.35)",
        "--behind-glow-size": behindGlowSize ?? "55%",
        "--pointer-x": "50%",
        "--pointer-y": "50%",
        "--pointer-from-center": "0",
        "--pointer-from-top": "0.5",
        "--pointer-from-left": "0.5",
        "--card-opacity": "0",
        "--rotate-x": "0deg",
        "--rotate-y": "0deg",
        "--background-x": "50%",
        "--background-y": "50%",
        "--card-radius": cardRadius,
        // Palette "premium" sobre : blancs/gris, pas d'arc-en-ciel saturé
        "--sunpillar-1": "hsl(0, 0%, 92%)",
        "--sunpillar-2": "hsl(0, 0%, 78%)",
        "--sunpillar-3": "hsl(0, 0%, 88%)",
        "--sunpillar-4": "hsl(0, 0%, 70%)",
        "--sunpillar-5": "hsl(0, 0%, 85%)",
        "--sunpillar-6": "hsl(0, 0%, 75%)",
      }) as React.CSSProperties,
    [innerGradient, behindGlowColor, behindGlowSize],
  );

  const handleContactClick = useCallback((): void => {
    onContactClick?.();
  }, [onContactClick]);

  // Taille de police du nom adaptée à sa longueur, pour éviter tout débordement
  const nameFontSize = useMemo(() => {
    const len = (name || "").length;
    if (len <= 15) return "min(4.2svh, 1.9em)";
    if (len <= 25) return "min(3.4svh, 1.5em)";
    if (len <= 35) return "min(2.7svh, 1.15em)";
    return "min(2.2svh, 0.95em)";
  }, [name]);

  const nameTopOffset = useMemo(() => {
    const len = (name || "").length;
    if (len <= 15) return "1.6em";
    if (len <= 25) return "1.3em";
    return "1.1em";
  }, [name]);

  const shineStyle: React.CSSProperties = {
    maskImage: "none",
    filter: "brightness(0.85) contrast(1.1) saturate(0.15) opacity(0.18)",
    animation: "pc-holo-bg 18s linear infinite",
    animationPlayState: "running",
    mixBlendMode: "color-dodge",
    transform: "translate3d(0, 0, 1px)",
    overflow: "hidden",
    zIndex: 3,
    background: "transparent",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        var(--sunpillar-1) 5%,
        var(--sunpillar-2) 10%,
        var(--sunpillar-3) 15%,
        var(--sunpillar-4) 20%,
        var(--sunpillar-5) 25%,
        var(--sunpillar-6) 30%,
        var(--sunpillar-1) 35%
      ),
      radial-gradient(
        farthest-corner circle at var(--pointer-x) var(--pointer-y),
        hsla(0, 0%, 0%, 0.1) 12%,
        hsla(0, 0%, 0%, 0.15) 20%,
        hsla(0, 0%, 0%, 0.25) 120%
      )
    `.replace(/\s+/g, " "),
    gridArea: "1 / -1",
    borderRadius: cardRadius,
    pointerEvents: "none",
  };

  const glareStyle: React.CSSProperties = {
    transform: "translate3d(0, 0, 1.1px)",
    overflow: "hidden",
    backgroundImage: `radial-gradient(
      farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsla(0, 0%, 100%, 0.5) 0%,
      hsla(0, 0%, 100%, 0) 60%
    )`,
    mixBlendMode: "overlay",
    filter: "brightness(1) contrast(1.05)",
    zIndex: 4,
    gridArea: "1 / -1",
    borderRadius: cardRadius,
    pointerEvents: "none",
  };

  return (
    <div
      ref={wrapRef}
      className={`relative touch-none w-full max-w-[320px] ${className}`.trim()}
      style={{
        perspective: "500px",
        transform: "translate3d(0, 0, 0.1px)",
        ...cardStyle,
      }}
    >
      {behindGlowEnabled && (
        <div
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-200 ease-out"
          style={{
            background:
              "radial-gradient(circle at var(--pointer-x) var(--pointer-y), var(--behind-glow-color) 0%, transparent var(--behind-glow-size))",
            filter: "blur(50px) saturate(1.1)",
            opacity: "calc(0.7 * var(--card-opacity))",
          }}
        />
      )}
      <div ref={shellRef} className="relative z-[1] group w-full">
        <section
          className="grid relative overflow-hidden"
          style={{
            width: "100%",
            maxWidth: "320px",
            aspectRatio: "0.718",
            borderRadius: cardRadius,
            backgroundBlendMode: "color-dodge, normal, normal, normal",
            boxShadow:
              "rgba(0, 0, 0, 0.6) calc((var(--pointer-from-left) * 10px) - 3px) calc((var(--pointer-from-top) * 20px) - 6px) 30px -8px",
            transition: "transform 1s ease",
            transform: "translateZ(0) rotateX(0deg) rotateY(0deg)",
            background: "rgba(13, 14, 17, 0.9)",
            backfaceVisibility: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transition = "none";
            e.currentTarget.style.transform =
              "translateZ(0) rotateX(var(--rotate-y)) rotateY(var(--rotate-x))";
          }}
          onMouseLeave={(e) => {
            const shell = shellRef.current;
            if (shell?.classList.contains("entering")) {
              e.currentTarget.style.transition = "transform 180ms ease-out";
            } else {
              e.currentTarget.style.transition = "transform 1s ease";
            }
            e.currentTarget.style.transform =
              "translateZ(0) rotateX(0deg) rotateY(0deg)";
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "var(--inner-gradient)",
              backgroundColor: "rgba(13, 14, 17, 0.9)",
              borderRadius: cardRadius,
              display: "grid",
              gridArea: "1 / -1",
            }}
          >
            {/* Shine layer */}
            <div style={shineStyle} />

            {/* Glare layer */}
            <div style={glareStyle} />

            {/* Avatar content */}
            <div
              className="overflow-visible"
              style={{
                transform: "translateZ(2px)",
                gridArea: "1 / -1",
                borderRadius: cardRadius,
                pointerEvents: "none",
                backfaceVisibility: "hidden",
              }}
            >
              <ResponsiveImage
                className="w-full absolute left-1/2 bottom-[-1px] will-change-transform transition-transform duration-[120ms] ease-out object-cover"
                src={avatarUrl}
                alt={`Photo de ${name}`}
                loading="lazy"
                style={{
                  height: "100%",
                  transformOrigin: "50% 100%",
                  transform:
                    "translateX(calc(-50% + (var(--pointer-from-left) - 0.5) * 6px)) translateZ(0) scaleY(calc(1 + (var(--pointer-from-top) - 0.5) * 0.02)) scaleX(calc(1 + (var(--pointer-from-left) - 0.5) * 0.01))",
                  borderRadius: cardRadius,
                  backfaceVisibility: "hidden",
                }}
              />
              {showUserInfo && (
                <div
                  className="absolute z-[2] flex items-center justify-between backdrop-blur-[30px] border border-white/10 pointer-events-auto"
                  style={
                    {
                      bottom: "16px",
                      left: "16px",
                      right: "16px",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: "calc(30px - 16px + 6px)",
                      padding: "10px 12px",
                    } as React.CSSProperties
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="rounded-full overflow-hidden border border-white/15 flex-shrink-0"
                      style={{ width: "38px", height: "38px" }}
                    >
                      <ResponsiveImage
                        width={76}
                        height={76}
                        className="w-full h-full object-cover rounded-full"
                        src={miniAvatarUrl || avatarUrl}
                        alt={`Mini photo de ${name}`}
                        loading="lazy"
                        style={{
                          display: "block",
                          borderRadius: "50%",
                          pointerEvents: "auto",
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <div className="text-[12px] font-medium text-white/90 leading-none">
                        @{handle}
                      </div>
                      <div className="text-[11px] text-white/60 leading-none flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {status}
                      </div>
                    </div>
                  </div>
                  <button
                    className="border border-white/15 rounded-lg px-3 py-2 text-[11px] font-semibold text-white/90 cursor-pointer backdrop-blur-[10px] transition-all duration-200 ease-out hover:border-white/40 hover:bg-white/10 hover:-translate-y-px"
                    onClick={handleContactClick}
                    style={{ pointerEvents: "auto" }}
                    type="button"
                    aria-label={`Contacter ${name}`}
                  >
                    {contactText}
                  </button>
                </div>
              )}
            </div>

            {/* Scrim pour lisibilité du texte */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: name.length > 25 ? "52%" : "45%",
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                gridArea: "1 / -1",
                borderTopLeftRadius: cardRadius,
                borderTopRightRadius: cardRadius,
                pointerEvents: "none",
                zIndex: 4,
              }}
            />

            {/* Details content */}
            <div
              className="max-h-full overflow-hidden text-center relative z-[5]"
              style={{
                transform:
                  "translate3d(calc(var(--pointer-from-left) * -6px + 3px), calc(var(--pointer-from-top) * -6px + 3px), 0.1px)",
                gridArea: "1 / -1",
                borderRadius: cardRadius,
                pointerEvents: "none",
              }}
            >
              <div
                className="w-full absolute flex flex-col"
                style={{ top: nameTopOffset, display: "flex" }}
              >
                <h3
                  className="font-semibold m-0 text-white"
                  style={{
                    fontSize: nameFontSize,
                    lineHeight: 1.15,
                    fontFamily: "'Syne', sans-serif",
                    textShadow:
                      "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)",
                    padding: "0 14px",
                  }}
                >
                  {name}
                </h3>
                <p
                  className="font-medium mx-auto w-min text-white/85"
                  style={{
                    position: "relative",
                    top: "6px",
                    fontSize: "12px",
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.04em",
                    margin: "0 auto",
                    whiteSpace: "nowrap",
                    textShadow:
                      "0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  {title}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ProfileCard = React.memo(ProfileCardComponent);
export default ProfileCard;
