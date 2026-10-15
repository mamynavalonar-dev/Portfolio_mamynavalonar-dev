import { afterEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene } from "three";
import { configureBadgeRenderer, createBadgeRendererPreparation } from "../src/lib/badgeRendering";

function setup(options: { ready?: boolean; link?: boolean; parallel?: boolean; lost?: boolean } = {}) {
  vi.useFakeTimers();
  let completed = options.ready ?? false;
  const program = {};
  const context = {
    LINK_STATUS: 1,
    isContextLost: () => options.lost ?? false,
    getProgramParameter: vi.fn((_program, key) => key === 2 ? completed : options.link ?? true),
    getProgramInfoLog: () => "Programme invalide",
  };
  const renderer = {
    compile: vi.fn(), render: vi.fn(), getContext: () => context,
    extensions: { get: () => options.parallel === false ? null : { COMPLETION_STATUS_KHR: 2 } },
    info: { programs: [{ program }] }, debug: { checkShaderErrors: false },
  };
  const callbacks = { invalidate: vi.fn(), resetClock: vi.fn(), onReady: vi.fn(), onError: vi.fn() };
  const preparation = createBadgeRendererPreparation(renderer as unknown as Parameters<typeof createBadgeRendererPreparation>[0], new Scene(), new PerspectiveCamera(), callbacks);
  return { renderer, callbacks, context, preparation, complete: () => { completed = true; } };
}
afterEach(() => vi.useRealTimers());

describe("préparation graphique du badge", () => {
  it("garde les diagnostics de développement et reporte ceux de production", () => {
    const renderer = { debug: { checkShaderErrors: true, onShaderError: null } };
    configureBadgeRenderer(renderer, true); expect(renderer.debug.checkShaderErrors).toBe(false);
    configureBadgeRenderer(renderer, false); expect(renderer.debug.checkShaderErrors).toBe(true);
  });
  it("attend le programme, remet l'horloge à jour et annonce après le vrai dessin", async () => {
    const x = setup();
    expect(x.preparation.draw()).toBe(false);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(20);
    expect(x.renderer.compile).toHaveBeenCalledTimes(1);
    expect(x.renderer.render).not.toHaveBeenCalled();
    expect(x.callbacks.onReady).not.toHaveBeenCalled();
    x.complete(); await vi.advanceTimersByTimeAsync(10);
    expect(x.callbacks.resetClock).toHaveBeenCalledTimes(1);
    expect(x.callbacks.invalidate).toHaveBeenCalledTimes(1);
    expect(x.preparation.draw()).toBe(true);
    expect(x.renderer.render).toHaveBeenCalledTimes(1);
    expect(x.callbacks.onReady).toHaveBeenCalledTimes(1);
    x.preparation.draw(); expect(x.callbacks.onReady).toHaveBeenCalledTimes(1);
  });
  it("annule l'attente lors du démontage, sans dessin ni notification tardive", async () => {
    const x = setup(); x.preparation.draw(); await Promise.resolve();
    x.preparation.cancel(); x.complete(); await vi.advanceTimersByTimeAsync(100);
    expect(vi.getTimerCount()).toBe(0);
    expect(x.preparation.draw()).toBe(false);
    expect(x.callbacks.onReady).not.toHaveBeenCalled();
    expect(x.callbacks.invalidate).not.toHaveBeenCalled();
  });
  it("conserve le signal d'échec d'un shader et arrête les dessins", async () => {
    const x = setup({ ready: true, link: false }); x.preparation.draw();
    await vi.advanceTimersByTimeAsync(10);
    expect(x.callbacks.onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Programme invalide" }));
    expect(x.preparation.draw()).toBe(false);
    expect(x.renderer.render).not.toHaveBeenCalled();
  });
  it("reste utilisable sans extension parallèle", async () => {
    const x = setup({ parallel: false }); x.preparation.draw();
    await vi.advanceTimersByTimeAsync(10);
    expect(x.preparation.draw()).toBe(true);
    expect(x.callbacks.onError).not.toHaveBeenCalled();
  });
  it("signale un contexte graphique interrompu sans boucle persistante", async () => {
    const x = setup({ lost: true }); x.preparation.draw();
    await vi.advanceTimersByTimeAsync(100);
    expect(x.callbacks.onError).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(x.preparation.draw()).toBe(false);
  });
});
