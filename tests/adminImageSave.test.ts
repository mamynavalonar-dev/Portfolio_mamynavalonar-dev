import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ upload: vi.fn(), getPublicUrl: vi.fn(), remove: vi.fn(), insert: vi.fn(), update: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {
  from: () => ({ insert: m.insert, update: m.update }),
  storage: { from: () => ({ upload: m.upload, getPublicUrl: m.getPublicUrl, remove: m.remove }) },
} }));
import { saveAdminImageRecord } from "@/lib/adminImageSave";
const file = () => new File(["image"], "logo.png", { type: "image/png" });
const input = () => ({ table: "certificates" as const, bucket: "certificates" as const, imageField: "image_url" as const, labelField: "title" as const, label: " Certificat ", id: null, file: file(), storedUrl: "blob:temporary-preview" });
beforeEach(() => {
  vi.resetAllMocks();
  const select = () => ({ single: m.single });
  m.insert.mockReturnValue({ select });
  m.update.mockReturnValue({ eq: () => ({ select }) });
  m.upload.mockResolvedValue({ error: null });
  m.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://storage.test/image.png" } });
  m.single.mockResolvedValue({ data: { id: 1 }, error: null });
  m.remove.mockResolvedValue({ error: null });
});
afterEach(() => vi.restoreAllMocks());
describe("administrative image persistence", () => {
  it("publishes the confirmed record without requiring a second list request", async () => {
    const row = { id: 1, title: "Certificat", image_url: "https://storage.test/image.png", created_at: "2026-10-15T10:00:00Z" };
    m.single.mockResolvedValue({ data: row, error: null });
    const onConfirmed = vi.fn();
    await saveAdminImageRecord({ ...input(), onConfirmed });
    expect(onConfirmed).toHaveBeenCalledExactlyOnceWith(row);
  });
  it("never publishes a successful UI update before database confirmation", async () => {
    m.single.mockResolvedValue({ data: null, error: { message: "response lost" } });
    const onConfirmed = vi.fn();
    await expect(saveAdminImageRecord({ ...input(), onConfirmed })).rejects.toThrow("confirmé");
    expect(onConfirmed).not.toHaveBeenCalled();
  });
  it("persists technology marquee visibility and order with the existing logo", async () => {
    await saveAdminImageRecord({ ...input(), table: "tech_stack", bucket: "tech-stack", imageField: "logo_url", labelField: "name", label: "React", file: null, storedUrl: "https://storage.test/react.svg", heroVisible: false, heroOrder: 7 });
    expect(m.insert).toHaveBeenCalledWith([{ name: "React", logo_url: "https://storage.test/react.svg", hero_visible: false, hero_order: 7 }]);
  });
  it("validates marquee order before uploading a logo", async () => {
    await expect(saveAdminImageRecord({ ...input(), table: "tech_stack", bucket: "tech-stack", imageField: "logo_url", labelField: "name", heroVisible: true, heroOrder: -1 })).rejects.toThrow("ordre");
    expect(m.upload).not.toHaveBeenCalled(); expect(m.insert).not.toHaveBeenCalled();
  });
  it("stops a failed upload before any SQL write", async () => {
    m.upload.mockResolvedValue({ error: { message: "storage unavailable" } });
    await expect(saveAdminImageRecord(input())).rejects.toThrow("import");
    expect(m.insert).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
  });
  it("persists a durable URL instead of the browser preview", async () => {
    expect(await saveAdminImageRecord(input())).toBe("https://storage.test/image.png");
    expect(m.insert).toHaveBeenCalledWith([{ title: "Certificat", image_url: "https://storage.test/image.png" }]);
  });
  it("keeps the uploaded object when Supabase returns a transport error instead of throwing", async () => {
    m.single.mockResolvedValue({ data: null, error: { message: "TypeError: fetch failed", code: "" } });
    await expect(saveAdminImageRecord(input())).rejects.toThrow("enregistrement");
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("never deletes storage after a database response without a confirmed record", async () => {
    m.single.mockResolvedValue({ data: null, error: null });
    await expect(saveAdminImageRecord(input())).rejects.toThrow("enregistrement");
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("does not remove a possibly referenced object after an ambiguous transport exception", async () => {
    m.single.mockRejectedValue(new Error("response lost"));
    await expect(saveAdminImageRecord(input())).rejects.toThrow("response lost");
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("rejects an unpersisted blob URL when no file is supplied", async () => {
    await expect(saveAdminImageRecord({ ...input(), file: null })).rejects.toThrow("image");
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("keeps an existing image on a text-only edit", async () => {
    await saveAdminImageRecord({ ...input(), id: 7, file: null, storedUrl: "https://storage.test/old.png" });
    expect(m.upload).not.toHaveBeenCalled();
    expect(m.update).toHaveBeenCalledWith({ title: "Certificat", image_url: "https://storage.test/old.png" });
  });
  it("does not treat an update matching no record as success", async () => {
    m.single.mockResolvedValue({ data: null, error: null });
    await expect(saveAdminImageRecord({ ...input(), id: 7, file: null, storedUrl: "/old.png" })).rejects.toThrow("enregistrement");
  });
  it("rejects invalid MIME types before upload", async () => {
    await expect(saveAdminImageRecord({ ...input(), file: new File(["PDF"], "x.pdf", { type: "application/pdf" }) })).rejects.toThrow("autorisée");
    expect(m.upload).not.toHaveBeenCalled();
  });
  it("enforces the smaller logo limit", async () => {
    await expect(saveAdminImageRecord({ ...input(), table: "tech_stack", bucket: "tech-stack", imageField: "logo_url", labelField: "name", file: new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }) })).rejects.toThrow("volumineuse");
    expect(m.upload).not.toHaveBeenCalled();
  });
});
