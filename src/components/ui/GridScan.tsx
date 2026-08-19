"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type GridScanProps = {
  sensitivity?: number;
  lineThickness?: number;
  linesColor?: string;
  gridScale?: number;
  lineJitter?: number;
  scanColor?: string;
  scanOpacity?: number;
  scanDirection?: "forward" | "backward" | "pingpong";
  scanSoftness?: number;
  scanGlow?: number;
  scanPhaseTaper?: number;
  scanDuration?: number;
  scanDelay?: number;
  snapBackDelay?: number;
  className?: string;
  style?: React.CSSProperties;
};

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineJitter;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
varying vec2 vUv;

float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// ---- Hexagonal grid helpers ----
// p: position relative to a hex center. Returns distance to nearest hex edge.
float hexDist(vec2 p) {
  p = abs(p);
  float c = dot(p, normalize(vec2(1.0, 1.7320508)));
  c = max(c, p.x);
  return c;
}

// Returns: x = signed distance to edge (0 = on edge, negative = inside),
// y = distance to hex center, zw = hex cell id
vec4 hexInfo(vec2 uv) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  vec2 gv = (length(a) < length(b)) ? a : b;
  float edgeDist = hexDist(gv);
  vec2 id = uv - gv;
  return vec4(gv.x, gv.y, id.x, id.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p, 2.0));

    float cR = cos(uTilt), sR = sin(uTilt);
    rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;

    float cY = cos(uYaw), sY = sin(uYaw);
    rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;

    vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
    rd.xy += skew * rd.z;

    vec3 color = vec3(0.0);
    float minT = 1e20;
    float gridScale = max(1e-5, uGridScale);
    float fadeStrength = 2.0;
    vec2 gridUV = vec2(0.0);

    float hitIsY = 1.0;
    for (int i = 0; i < 4; i++)
    {
        float isY = float(i < 2);
        float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
        float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
        float den = isY * rd.y + (1.0 - isY) * rd.x;
        float t = num / den;
        vec3 h = ro + rd * t;

        float depthBoost = smoothstep(0.0, 3.0, h.z);
        h.xy += skew * 0.15 * depthBoost;

        bool use = t > 0.0 && t < minT;
        gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
        minT = use ? t : minT;
        hitIsY = use ? isY : hitIsY;
    }

    vec3 hit = ro + rd * minT;
    float dist = length(hit - ro);

    float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
    vec2 gJ = gridUV;
    if (jitterAmt > 0.0) {
      vec2 j = vec2(
        sin(gridUV.y * 2.7 + iTime * 1.8),
        cos(gridUV.x * 2.3 - iTime * 1.6)
      ) * (0.15 * jitterAmt);
      gJ += j;
    }

    float wx = fwidth(gJ.x);
    float wy = fwidth(gJ.y);
    float aa = max(wx, wy) * 1.3;
    float halfPx = max(0.0, uLineThickness) * 0.06;

    vec4 hexA = hexInfo(gJ);
    float edgeA = 0.5 - hexDist(hexA.xy);
    float lineMaskPrimary = 1.0 - smoothstep(halfPx, halfPx + aa, edgeA);

    vec2 gridUV2 = (hitIsY > 0.5 ? hit.xz : hit.zy) / gridScale;
    vec2 gJ2 = gridUV2;
    if (jitterAmt > 0.0) {
      vec2 j2 = vec2(
        cos(gridUV2.y * 2.1 - iTime * 1.4),
        sin(gridUV2.x * 2.5 + iTime * 1.7)
      ) * (0.15 * jitterAmt);
      gJ2 += j2;
    }
    vec4 hexB = hexInfo(gJ2);
    float edgeB = 0.5 - hexDist(hexB.xy);
    float wx2 = fwidth(gJ2.x);
    float wy2 = fwidth(gJ2.y);
    float aa2 = max(wx2, wy2) * 1.3;
    float lineMaskAlt = 1.0 - smoothstep(halfPx, halfPx + aa2, edgeB);

    float edgeDistX = min(abs(hit.x - (-0.5)), abs(hit.x - 0.5));
    float edgeDistY = min(abs(hit.y - (-0.2)), abs(hit.y - 0.2));
    float edgeDistWall = mix(edgeDistY, edgeDistX, hitIsY);
    float edgeGate = 1.0 - smoothstep(gridScale * 0.5, gridScale * 2.0, edgeDistWall);
    lineMaskAlt *= edgeGate;

    float lineMask = max(lineMaskPrimary, lineMaskAlt);

    float fade = exp(-dist * fadeStrength);

    float dur = max(0.05, uScanDuration);
    float del = max(0.0, uScanDelay);
    float scanZMax = 2.0;
    float widthScale = max(0.1, uScanGlow);
    float sigma = max(0.001, 0.18 * widthScale * uScanSoftness);
    float sigmaA = sigma * 2.0;

    float cycle = dur + del;
    float tCycle = mod(iTime, cycle);
    float scanPhase = clamp((tCycle - del) / dur, 0.0, 1.0);
    float phase = scanPhase;
    if (uScanDirection > 0.5 && uScanDirection < 1.5) {
      phase = 1.0 - phase;
    } else if (uScanDirection > 1.5) {
      float t2 = mod(max(0.0, iTime - del), 2.0 * dur);
      phase = (t2 < dur) ? (t2 / dur) : (1.0 - (t2 - dur) / dur);
    }
    float scanZ = phase * scanZMax;
    float dz = abs(hit.z - scanZ);
    float lineBand = exp(-0.5 * (dz * dz) / (sigma * sigma));
    float taper = clamp(uPhaseTaper, 0.0, 0.49);
    float headFade = smoother01(0.0, taper, phase);
    float tailFade = 1.0 - smoother01(1.0 - taper, 1.0, phase);
    float phaseWindow = headFade * tailFade;
    float combinedPulse = lineBand * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);
    float auraBand = exp(-0.5 * (dz * dz) / (sigmaA * sigmaA));
    float combinedAura = (auraBand * 0.25) * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);

    float lineVis = lineMask;
    vec3 gridCol = uLinesColor * lineVis * fade;
    vec3 scanCol = uScanColor * combinedPulse;
    vec3 scanAura = uScanColor * combinedAura;

    color = gridCol + scanCol + scanAura;
    color = clamp(color, 0.0, 1.0);

    float alpha = clamp(max(lineVis, combinedPulse), 0.0, 1.0);
    fragColor = vec4(color, alpha);
}

void main(){
  vec4 c;
  mainImage(c, vUv * iResolution.xy);
  gl_FragColor = c;
}
`;

export const GridScan: React.FC<GridScanProps> = ({
  sensitivity = 0.55,
  lineThickness = 1,
  linesColor = "#23262b",
  scanColor = "#ffffff",
  scanOpacity = 0.4,
  gridScale = 0.09,
  lineJitter = 0.15,
  scanDirection = "pingpong",
  scanGlow = 0.5,
  scanSoftness = 2.2,
  scanPhaseTaper = 0.9,
  scanDuration = 3.0,
  scanDelay = 2.0,
  snapBackDelay = 250,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const rafRef = useRef<number | null>(null);

  const lookTarget = useRef(new THREE.Vector2(0, 0));
  const tiltTarget = useRef(0);
  const yawTarget = useRef(0);

  const lookCurrent = useRef(new THREE.Vector2(0, 0));
  const lookVel = useRef(new THREE.Vector2(0, 0));
  const tiltCurrent = useRef(0);
  const tiltVel = useRef(0);
  const yawCurrent = useRef(0);
  const yawVel = useRef(0);

  const s = THREE.MathUtils.clamp(sensitivity, 0, 1);
  const skewScale = THREE.MathUtils.lerp(0.06, 0.2, s);
  const tiltScale = THREE.MathUtils.lerp(0.12, 0.3, s);
  const yawScale = THREE.MathUtils.lerp(0.1, 0.28, s);
  const smoothTime = THREE.MathUtils.lerp(0.45, 0.12, s);
  const yBoost = THREE.MathUtils.lerp(1.2, 1.6, s);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let leaveTimer: number | null = null;

    const onMove = (e: MouseEvent) => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      lookTarget.current.set(nx, ny);
    };

    const onEnter = () => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    };

    const onLeave = () => {
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(
        () => {
          lookTarget.current.set(0, 0);
          tiltTarget.current = 0;
          yawTarget.current = 0;
        },
        Math.max(0, snapBackDelay || 0),
      );
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [snapBackDelay]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const uniforms = {
      iResolution: {
        value: new THREE.Vector3(
          container.clientWidth,
          container.clientHeight,
          renderer.getPixelRatio(),
        ),
      },
      iTime: { value: 0 },
      uSkew: { value: new THREE.Vector2(0, 0) },
      uTilt: { value: 0 },
      uYaw: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: srgbColor(linesColor) },
      uScanColor: { value: srgbColor(scanColor) },
      uGridScale: { value: gridScale },
      uLineJitter: { value: Math.max(0, Math.min(1, lineJitter || 0)) },
      uScanOpacity: { value: scanOpacity },
      uScanGlow: { value: scanGlow },
      uScanSoftness: { value: scanSoftness },
      uPhaseTaper: { value: scanPhaseTaper },
      uScanDuration: { value: scanDuration },
      uScanDelay: { value: scanDelay },
      uScanDirection: {
        value:
          scanDirection === "backward"
            ? 1
            : scanDirection === "pingpong"
              ? 2
              : 0,
      },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    materialRef.current = material;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      material.uniforms.iResolution.value.set(
        container.clientWidth,
        container.clientHeight,
        renderer.getPixelRatio(),
      );
    };
    window.addEventListener("resize", onResize);

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;

      lookCurrent.current.copy(
        smoothDampVec2(
          lookCurrent.current,
          lookTarget.current,
          lookVel.current,
          smoothTime,
          Infinity,
          dt,
        ),
      );

      const tiltSm = smoothDampFloat(
        tiltCurrent.current,
        tiltTarget.current,
        { v: tiltVel.current },
        smoothTime,
        Infinity,
        dt,
      );
      tiltCurrent.current = tiltSm.value;
      tiltVel.current = tiltSm.v;

      const yawSm = smoothDampFloat(
        yawCurrent.current,
        yawTarget.current,
        { v: yawVel.current },
        smoothTime,
        Infinity,
        dt,
      );
      yawCurrent.current = yawSm.value;
      yawVel.current = yawSm.v;

      const skewX = lookCurrent.current.x * skewScale;
      const skewY = -lookCurrent.current.y * yBoost * skewScale;
      material.uniforms.uSkew.value.set(skewX, skewY);
      material.uniforms.uTilt.value = tiltCurrent.current * tiltScale;
      material.uniforms.uYaw.value = THREE.MathUtils.clamp(
        yawCurrent.current * yawScale,
        -0.6,
        0.6,
      );

      material.uniforms.iTime.value = now / 1000;
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      material.dispose();
      (quad.geometry as THREE.BufferGeometry).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // Tableau de deps figé volontairement : on ne veut RECRÉER le renderer WebGL
    // (coûteux) qu'au montage. Les mises à jour de props passent par le useEffect
    // suivant, qui met à jour les uniforms sans recréer le contexte GL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Met à jour les uniforms du shader quand les props changent, sans jamais
  // recréer le renderer. Chaque prop de GridScanProps apparaît ici exactement
  // une fois : la taille du tableau ne peut donc plus varier entre les rendus,
  // quel que soit le sous-ensemble de props que le parent fait varier.
  useEffect(() => {
    const m = materialRef.current;
    if (!m) return;
    const u = m.uniforms;
    u.uLineThickness.value = lineThickness;
    (u.uLinesColor.value as THREE.Color).copy(srgbColor(linesColor));
    (u.uScanColor.value as THREE.Color).copy(srgbColor(scanColor));
    u.uGridScale.value = gridScale;
    u.uLineJitter.value = Math.max(0, Math.min(1, lineJitter || 0));
    u.uScanGlow.value = scanGlow;
    u.uScanOpacity.value = Math.max(0, Math.min(1, scanOpacity));
    u.uScanDirection.value =
      scanDirection === "backward" ? 1 : scanDirection === "pingpong" ? 2 : 0;
    u.uScanSoftness.value = scanSoftness;
    u.uPhaseTaper.value = scanPhaseTaper;
    u.uScanDuration.value = Math.max(0.05, scanDuration);
    u.uScanDelay.value = Math.max(0.0, scanDelay);
  }, [
    lineThickness,
    linesColor,
    scanColor,
    scanOpacity,
    gridScale,
    lineJitter,
    scanDirection,
    scanGlow,
    scanSoftness,
    scanPhaseTaper,
    scanDuration,
    scanDelay,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className ?? ""}`}
      style={style}
    />
  );
};

function srgbColor(hex: string) {
  const c = new THREE.Color(hex);
  return c.convertSRGBToLinear();
}

function smoothDampVec2(
  current: THREE.Vector2,
  target: THREE.Vector2,
  currentVelocity: THREE.Vector2,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): THREE.Vector2 {
  const out = current.clone();
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const change = current.clone().sub(target);
  const originalTo = target.clone();

  const maxChange = maxSpeed * smoothTime;
  if (change.length() > maxChange) change.setLength(maxChange);

  target = current.clone().sub(change);
  const temp = currentVelocity
    .clone()
    .addScaledVector(change, omega)
    .multiplyScalar(deltaTime);
  currentVelocity.sub(temp.clone().multiplyScalar(omega));
  currentVelocity.multiplyScalar(exp);

  out.copy(target.clone().add(change.add(temp).multiplyScalar(exp)));

  const origMinusCurrent = originalTo.clone().sub(current);
  const outMinusOrig = out.clone().sub(originalTo);
  if (origMinusCurrent.dot(outMinusOrig) > 0) {
    out.copy(originalTo);
    currentVelocity.set(0, 0);
  }
  return out;
}

function smoothDampFloat(
  current: number,
  target: number,
  velRef: { v: number },
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): { value: number; v: number } {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const originalTo = target;

  const maxChange = maxSpeed * smoothTime;
  change = Math.sign(change) * Math.min(Math.abs(change), maxChange);

  target = current - change;
  const temp = (velRef.v + omega * change) * deltaTime;
  velRef.v = (velRef.v - omega * temp) * exp;

  let out = target + (change + temp) * exp;

  const origMinusCurrent = originalTo - current;
  const outMinusOrig = out - originalTo;
  if (origMinusCurrent * outMinusOrig > 0) {
    out = originalTo;
    velRef.v = 0;
  }
  return { value: out, v: velRef.v };
}

export default GridScan;
