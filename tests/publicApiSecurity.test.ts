import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  requireAdminUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdmin: () => ({
    rpc: mocks.rpc,
    storage: {
      from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl }),
    },
  }),
}));
vi.mock("@/lib/adminAuth", () => ({
  requireAdminUser: mocks.requireAdminUser,
  adminErrorResponse: () => Response.json({ ok: false }, { status: 401 }),
}));

import { POST as postComment } from "@/app/api/comments/route";
import { POST as postLike } from "@/app/api/comments/[id]/like/route";
import { POST as postContact } from "@/app/api/contact/route";
import { POST as postCv } from "@/app/api/admin/cv/route";

const comment = { id: 7, name: "Visiteur", comment: "Très beau travail", likes: 0 };

function imageCommentRequest() {
  const form = new FormData();
  form.set("name", comment.name);
  form.set("comment", comment.comment);
  form.set("image", new File([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ], "image.png", { type: "image/png" }));
  return new Request("https://portfolio.test/api/comments", {
    method: "POST", body: form, headers: { "x-forwarded-for": "203.0.113.12" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("COMMENT_RATE_LIMIT_SECRET", "test-rate-limit-secret");
  vi.stubEnv("COMMENT_VISITOR_SECRET", "test-visitor-secret");
  mocks.rpc.mockImplementation(async (name: string) => ({
    error: null,
    data: name === "submit_comment" ? [comment] : name === "like_comment_once" ? 1 : null,
  }));
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://storage.test/image.png" } });
  mocks.requireAdminUser.mockResolvedValue({ id: "admin" });
});

afterEach(() => vi.unstubAllEnvs());

describe("public write protections", () => {
  it("rejects a limited comment before sending its image to storage", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "PUBLIC_REQUEST_RATE_LIMIT" } });
    const response = await postComment(imageCommentRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["reserve_public_request"]);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("reserves a comment attempt before upload and keeps the final transactional submission", async () => {
    const response = await postComment(imageCommentRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, comment });
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["reserve_public_request", "submit_comment"]);
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.upload.mock.invocationCallOrder[0]);
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[1]);
  });

  it("fails closed when the quota service is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "database unavailable" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await postComment(imageCommentRequest());
      expect(response.status).toBe(503);
      expect(mocks.upload).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("does not change a like counter when the IP quota is exhausted", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "PUBLIC_REQUEST_RATE_LIMIT" } });
    const response = await postLike(new Request("https://portfolio.test/api/comments/7/like", {
      method: "POST", headers: { "x-forwarded-for": "203.0.113.12" },
    }), { params: Promise.resolve({ id: "7" }) });
    expect(response.status).toBe(429);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["reserve_public_request"]);
  });

  it("uses the same IP quota even when a visitor rotates the like cookie", async () => {
    for (const token of ["a".repeat(64), "b".repeat(64)]) {
      const response = await postLike(new Request("https://portfolio.test/api/comments/7/like", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.12", cookie: `portfolio_visitor=${token}` },
      }), { params: Promise.resolve({ id: "7" }) });
      expect(response.status).toBe(200);
    }
    const reservations = mocks.rpc.mock.calls.filter(([name]) => name === "reserve_public_request");
    const likes = mocks.rpc.mock.calls.filter(([name]) => name === "like_comment_once");
    expect(reservations[0][1]).toEqual(reservations[1][1]);
    expect(reservations[0][1].p_ip_hash).not.toBe("203.0.113.12");
    expect(likes[0][1].p_client_hash).not.toBe(likes[1][1].p_client_hash);
  });

  it("rejects oversized comment multipart bodies even without Content-Length", async () => {
    const form = new FormData();
    form.set("ignored", "x".repeat(3_000_001));
    // Serialize as a real incoming HTTP body. Cancelling Undici's outgoing
    // FormData encoder triggers a Node stream race unrelated to the route.
    const outgoing = new Request("https://portfolio.test/api/comments", {
      method: "POST", body: form,
    });
    const response = await postComment(new Request("https://portfolio.test/api/comments", {
      method: "POST", headers: outgoing.headers, body: await outgoing.arrayBuffer(),
    }));
    expect(response.status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("keeps contact JSON errors and honeypot submissions free of writes", async () => {
    const invalid = await postContact(new Request("https://portfolio.test/api/contact", {
      method: "POST", body: "not-json",
    }));
    expect(invalid.status).toBe(400);
    const oversized = await postContact(new Request("https://portfolio.test/api/contact", {
      method: "POST", body: "x".repeat(20_001),
    }));
    expect(oversized.status).toBe(413);
    const honeypot = await postContact(new Request("https://portfolio.test/api/contact", {
      method: "POST", body: JSON.stringify({ website: "bot.example" }),
    }));
    expect(honeypot.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("checks administrator access before reading a CV and bounds its actual body", async () => {
    const response = await postCv(new Request("https://portfolio.test/api/admin/cv", {
      method: "POST", body: "x".repeat(3 * 1024 * 1024 + 64_001),
    }));
    expect(mocks.requireAdminUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
