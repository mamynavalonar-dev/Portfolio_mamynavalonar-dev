import { describe, expect, it, vi } from "vitest";
import { readBoundedFormData, readRequestBody } from "@/lib/requestBody";

describe("bounded request bodies", () => {
  it("stops reading a streamed request when its actual bytes exceed the limit", async () => {
    const cancel = vi.fn();
    const request = new Request("https://portfolio.test/api/comments", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(4));
          controller.enqueue(new Uint8Array(4));
        },
        cancel,
      }),
      duplex: "half",
    } as RequestInit);

    await expect(readRequestBody(request, 6)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("does not trust a smaller declared Content-Length", async () => {
    const request = new Request("https://portfolio.test/api/contact", {
      method: "POST",
      headers: { "Content-Length": "1" },
      body: "ééé",
    });

    await expect(readRequestBody(request, 5)).rejects.toMatchObject({ status: 413 });
  });

  it("accepts exactly the limit and preserves multipart fields and files", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const request = new Request("https://portfolio.test", { method: "POST", body: bytes });
    expect(await readRequestBody(request, bytes.length)).toEqual(bytes);

    const form = new FormData();
    form.set("name", "Mamy");
    form.set("image", new File([bytes], "image.png", { type: "image/png" }));
    const parsed = await readBoundedFormData(
      new Request("https://portfolio.test", { method: "POST", body: form }),
      10_000,
    );
    expect(parsed.get("name")).toBe("Mamy");
    expect(parsed.get("image")).toBeInstanceOf(File);
    expect(await (parsed.get("image") as File).arrayBuffer()).toEqual(bytes.buffer);
  });

  it("returns a client error for malformed multipart data", async () => {
    const request = new Request("https://portfolio.test", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=missing" },
      body: "invalid multipart",
    });
    await expect(readBoundedFormData(request, 100)).rejects.toMatchObject({ status: 400 });
  });
});
