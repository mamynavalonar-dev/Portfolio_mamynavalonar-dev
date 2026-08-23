"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const fragmentShader = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uSteps;
uniform float uOpacity;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;

const float MAX_DIST = 1800.0;

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += 31.0 * sin((r.y + mx) / 20.0 + tc.y);

  float my = r.y - tc.z;
  my += 17.0 * cos(r.x / 23.0 + tc.w);

  return r.z - (
    sin(mx * freq.x) * 2.35 +
    sin(my * freq.y) * 2.35 +
    6.25
  );
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;

  for (int i = 0; i < 36; i++) {
    if (float(i) >= uSteps) break;

    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.13) break;

    dist += 0.91 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }

  return dist;
}

void main() {
  float T = iTime * 0.27;
  vec2 freq = vec2(0.58 / 7.0, (0.58 * 1.05) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);

  float vfov = 3.14159 / 2.38;
  vec3 cam = vec3(0.0, 0.0, 30.0);

  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;

  float c = cos(xrot);
  float s = sin(xrot);
  dir = mat3(
    1.0, 0.0, 0.0,
    0.0, c, -s,
    0.0, s, c
  ) * dir;

  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x;
  s = nuv.y;
  dir = mat3(
    c, -s, 0.0,
    s, c, 0.0,
    0.0, 0.0, 1.0
  ) * dir;

  float tilt = 1.11;
  c = cos(tilt);
  s = sin(tilt);
  dir = mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  ) * dir;

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float fog = clamp(15.0 / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(
    uWaveColor,
    uCrestColor,
    clamp(pos.z * 0.08 + 0.5, 0.0, 1.0)
  );

  vec3 color = mix(uHorizonColor, body, fog);
  color *= 0.94;
  color = clamp(color, 0.0, 1.0);

  float alpha = clamp(fog, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const toColor = (hex: string) => new THREE.Color(hex);

export default function GradientWaves({
  className = "",
}: {
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(mobile ? 0.68 : 0.86);

    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    canvas.style.contain = "strict";
    host.appendChild(canvas);

    const uniforms = {
      iResolution: { value: new THREE.Vector2(1, 1) },
      iTime: { value: 0.85 },
      uSteps: { value: mobile ? 17 : 26 },
      uOpacity: { value: mobile ? 0.58 : 0.72 },
      uHorizonColor: { value: toColor("#5227FF") },
      uWaveColor: { value: toColor("#FF9FFC") },
      uCrestColor: { value: toColor("#FFFFFF") },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    scene.add(mesh);

    const renderFrame = () => renderer.render(scene, camera);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      renderer.setSize(width, height, false);
      uniforms.iResolution.value.set(
        renderer.domElement.width,
        renderer.domElement.height,
      );
      renderFrame();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let raf = 0;
    let lastFrame = 0;
    let resumeTimer = 0;
    let pageVisible = !document.hidden;
    let scrolling = false;

    const startedAt = performance.now();
    const frameDuration = 1000 / (mobile ? 14 : 22);

    const loop = (time: number) => {
      if (!pageVisible || scrolling) {
        raf = 0;
        return;
      }

      if (time - lastFrame >= frameDuration) {
        lastFrame = time;
        uniforms.iTime.value = 0.85 + (time - startedAt) * 0.001;
        renderFrame();
      }

      raf = window.requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (reducedMotion || raf !== 0 || !pageVisible || scrolling) return;
      raf = window.requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (raf === 0) return;
      window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const onScroll = () => {
      if (reducedMotion) return;

      scrolling = true;
      stopLoop();

      if (resumeTimer !== 0) {
        window.clearTimeout(resumeTimer);
      }

      resumeTimer = window.setTimeout(() => {
        scrolling = false;
        resumeTimer = 0;
        startLoop();
      }, 150);
    };

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;

      if (pageVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    renderFrame();

    if (!reducedMotion) {
      startLoop();
    }

    return () => {
      stopLoop();

      if (resumeTimer !== 0) {
        window.clearTimeout(resumeTimer);
      }

      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (canvas.parentElement === host) {
        host.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`.trim()}
    />
  );
}
