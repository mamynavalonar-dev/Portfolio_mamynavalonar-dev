import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  createCommentService: vi.fn(), fetchCommentsService: vi.fn(), likeCommentService: vi.fn(),
}));
vi.mock("@/lib/commentService", () => service);
import useComments from "@/hooks/useComments";

// Capture les actions d'un rendu React pour vérifier leurs appels réseau.
// Les changements visuels d'état ne sont pas évalués par ce rendu serveur.
function actions() {
  let captured!: ReturnType<typeof useComments>;
  function Harness() {
    captured = useComments();
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  service.likeCommentService.mockReset();
  vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("comment like submission concurrency", () => {
  it("sends one vote when the same button is clicked twice before the response", async () => {
    let finish!: (value: number) => void;
    service.likeCommentService.mockReturnValue(new Promise<number>((resolve) => { finish = resolve; }));
    const api = actions();
    const first = api.likeComment(2);
    const second = api.likeComment(2);
    expect(service.likeCommentService).toHaveBeenCalledTimes(1);
    expect(service.likeCommentService).toHaveBeenCalledWith(2);
    finish(1);
    await Promise.all([first, second]);
    expect(localStorage.setItem).toHaveBeenCalledWith("liked-2", "true");
  });

  it("prevents duplicate requests even if browser storage is blocked", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("Storage blocked"); },
      setItem: () => { throw new Error("Storage blocked"); },
    });
    let finish!: (value: number) => void;
    service.likeCommentService.mockReturnValue(new Promise<number>((resolve) => { finish = resolve; }));
    const api = actions();
    const first = api.likeComment(2);
    const second = api.likeComment(2);
    finish(1);
    await Promise.all([first, second]);
    expect(service.likeCommentService).toHaveBeenCalledTimes(1);
  });

  it("allows another attempt after a failed request", async () => {
    service.likeCommentService.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce(1);
    const api = actions();
    await api.likeComment(2);
    await api.likeComment(2);
    expect(service.likeCommentService).toHaveBeenCalledTimes(2);
  });

  it("keeps the existing already-voted browser marker", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "true"), setItem: vi.fn() });
    await actions().likeComment(2);
    expect(service.likeCommentService).not.toHaveBeenCalled();
  });
});
