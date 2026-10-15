import { describe, expect, it, vi } from "vitest";
import { getProjectImageUrls, replaceProjectImageUrls, uploadPreparedProjectImages, type UploadedProjectImage } from "../src/lib/projectImages";

describe("Optimisation des images déjà enregistrées", () => {
  it("garde la couverture visible lorsque la galerie est vide", () => {
    expect(getProjectImageUrls({ image_url: "cover", image_urls: [] })).toEqual(["cover"]);
  });

  it("remplace la couverture et la galerie sans changer leur ordre ni l'original", () => {
    const original = { image_url: "second", image_urls: ["first", "second", "third"] };
    const uploaded = new Map<string, UploadedProjectImage>([["second", { sourceUrl: "second", publicUrl: "second.webp", path: "new-file" }]]);
    expect(replaceProjectImageUrls(original, uploaded)).toEqual({ image_url: "second.webp", image_urls: ["first", "second.webp", "third"] });
    expect(original.image_url).toBe("second");
  });

  it("réutilise l'envoi confirmé quand le suivant échoue", async () => {
    const file = new File(["prepared"], "prepared.webp", { type: "image/webp" });
    const images = ["first", "second"].map((sourceUrl) => ({ sourceUrl, file, originalBytes: 1000 }));
    const staged = new Map<string, UploadedProjectImage>();
    const storage = {
      upload: vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error("network") }).mockResolvedValueOnce({ error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.invalid/${path}` } }),
      remove: vi.fn(),
    };
    await expect(uploadPreparedProjectImages(images, storage, staged, new AbortController().signal)).rejects.toThrow();
    expect(staged.size).toBe(1);
    await uploadPreparedProjectImages(images, storage, staged, new AbortController().signal);
    expect(staged.size).toBe(2);
    expect(storage.upload).toHaveBeenCalledTimes(3);
    expect(storage.remove).not.toHaveBeenCalled();
    expect(storage.upload.mock.calls[0][2]).toEqual({ cacheControl: "31536000", upsert: false });
  });

  it("un traitement annulé ne démarre aucun envoi", async () => {
    const controller = new AbortController(); controller.abort();
    const storage = { upload: vi.fn(), getPublicUrl: vi.fn() };
    await expect(uploadPreparedProjectImages([{ sourceUrl: "first", file: new File(["prepared"], "a.webp"), originalBytes: 1000 }], storage, new Map(), controller.signal)).rejects.toThrow();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
