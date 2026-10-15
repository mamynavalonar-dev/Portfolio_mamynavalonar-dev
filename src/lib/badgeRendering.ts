import type { Camera, Object3D, WebGLRenderer } from "three";

type Renderer = Pick<WebGLRenderer, "compile" | "render" | "getContext" | "info" | "debug" | "extensions">;
type Callbacks = {
  invalidate: () => void;
  resetClock: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
};

export function configureBadgeRenderer(renderer: Pick<WebGLRenderer, "debug">, production = process.env.NODE_ENV === "production") {
  // Les requêtes de diagnostic synchrones du pilote sont coûteuses au premier
  // dessin. En production, les liens sont vérifiés après la préparation ci-dessous.
  renderer.debug.checkShaderErrors = !production;
}

function assertCompiledPrograms(renderer: Renderer) {
  if (renderer.debug.checkShaderErrors) return;
  const context = renderer.getContext();
  for (const item of renderer.info.programs ?? []) {
    const program = item.program as WebGLProgram;
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      throw new Error(context.getProgramInfoLog(program) || "Le programme graphique du badge n'a pas pu être préparé.");
    }
  }
}

export function createBadgeRendererPreparation(renderer: Renderer, scene: Object3D, camera: Camera, callbacks: Callbacks) {
  let started = false;
  let prepared = false;
  let announced = false;
  let cancelled = false;
  let failed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fail = (error: unknown) => {
    if (cancelled || failed) return;
    failed = true;
    callbacks.onError(error);
  };

  const prepare = () => {
    try {
      // Même compilation que compileAsync, avec une attente annulable lorsque
      // le canvas est démonté (navigation ou changement de largeur).
      renderer.compile(scene, camera);
      const context = renderer.getContext();
      const extension = renderer.extensions.get("KHR_parallel_shader_compile") as KHR_parallel_shader_compile | null;
      const programs = (renderer.info.programs ?? []).map((item) => item.program as WebGLProgram);
      const check = () => {
        timer = undefined;
        if (cancelled || failed) return;
        try {
          if (context.isContextLost()) throw new Error("Le contexte graphique du badge a été interrompu.");
          if (extension && programs.some((program) => !context.getProgramParameter(program, extension.COMPLETION_STATUS_KHR))) {
            timer = setTimeout(check, 10);
            return;
          }
          assertCompiledPrograms(renderer);
          prepared = true;
          callbacks.resetClock();
          callbacks.invalidate();
        } catch (error) { fail(error); }
      };
      timer = setTimeout(check, 10);
    } catch (error) { fail(error); }
  };

  return {
    // Appelé après la mise en place de la corde et des matériaux, avec les
    // mêmes lumières et le même environnement que le dessin définitif.
    draw(): boolean {
      if (cancelled || failed) return false;
      if (!prepared) {
        if (!started) {
          started = true;
          Promise.resolve().then(() => { if (!cancelled) prepare(); }).catch(fail);
        }
        return false;
      }
      try {
        renderer.render(scene, camera);
        if (!announced) {
          announced = true;
          callbacks.onReady();
        }
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    cancel() { cancelled = true; if (timer !== undefined) clearTimeout(timer); },
  };
}
