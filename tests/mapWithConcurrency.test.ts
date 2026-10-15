import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/lib/mapWithConcurrency";
describe("bounded image processing", () => {
  it("limits active work and retains input order", async () => {
    let active = 0; let max = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active++; max = Math.max(active, max);
      await new Promise((resolve) => setTimeout(resolve, value % 2));
      active--; return value * 2;
    });
    expect(max).toBe(2); expect(results).toEqual([2, 4, 6, 8, 10]);
  });
  it("waits for already active work before rejecting, without starting more tasks", async () => {
    let finish!: () => void;
    const calls: number[] = []; let settled = false;
    const result = mapWithConcurrency([1, 2, 3], 2, async (value) => {
      calls.push(value);
      if (value === 1) throw new Error("upload failed");
      await new Promise<void>((resolve) => { finish = resolve; });
      settled = true; return value;
    });
    const rejection = expect(result).rejects.toThrow("upload failed");
    await Promise.resolve(); expect(settled).toBe(false); finish(); await rejection;
    expect(settled).toBe(true); expect(calls).toEqual([1, 2]);
  });
  it("handles an empty batch", async () => { expect(await mapWithConcurrency([], 2, async (value) => value)).toEqual([]); });
  it.each([0, -1, 1.5])("rejects invalid concurrency %s", async (limit) => { await expect(mapWithConcurrency([1], limit, async (value) => value)).rejects.toThrow("invalide"); });
});
