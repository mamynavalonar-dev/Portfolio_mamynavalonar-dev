import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  admin: null as { user_id: string } | null,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: {
    cookies: { setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void };
  }) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          { name: "sb-session", value: "refreshed", options: { path: "/", secure: true, sameSite: "lax" } },
          { name: "sb-old-chunk", value: "", options: { path: "/", maxAge: 0 } },
        ]);
        return { data: { user: state.user } };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.admin }) }) }) }),
  }),
}));

import { proxy } from "../src/proxy";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  state.user = null;
  state.admin = null;
});

describe("Supabase proxy cookie propagation", () => {
  it("preserves refreshed and deleted cookies on the login redirect", async () => {
    const request = new NextRequest("https://portfolio.test/admin/dashboard");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBe("https://portfolio.test/admin/login");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.cookies.get("sb-old-chunk")?.maxAge).toBe(0);
    expect(request.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("preserves cookies when an authenticated administrator leaves the login page", async () => {
    state.user = { id: "admin" };
    state.admin = { user_id: "admin" };
    const response = await proxy(new NextRequest("https://portfolio.test/admin/login"));
    expect(response.headers.get("location")).toBe("https://portfolio.test/admin/dashboard");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("passes the refreshed session to server components on an allowed page", async () => {
    state.user = { id: "admin" };
    state.admin = { user_id: "admin" };
    const response = await proxy(new NextRequest("https://portfolio.test/admin/dashboard"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-session=refreshed");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });
});
