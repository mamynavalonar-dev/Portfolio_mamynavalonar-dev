export const MAX_PROJECT_IMAGE_DIMENSION = 1920;
export const PROJECT_IMAGE_QUALITY = 0.85;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PreparedProjectImage = {
  sourceUrl: string;
  file: File;
  originalBytes: number;
};

export type UploadedProjectImage = { sourceUrl: string; publicUrl: string; path: string };

export type ProjectImageStorage = {
  upload: (path: string, file: File, options: { cacheControl: string; upsert: boolean }) => Promise<{ error: unknown }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
};

export function getProjectImageUrls(project: { image_url?: string | null; image_urls?: string[] | null }): string[] {
  const urls = [...(project.image_urls ?? [])];
  if (project.image_url && !urls.includes(project.image_url)) urls.unshift(project.image_url);
  return [...new Set(urls.filter((url) => typeof url === "string" && url.length > 0))];
}

export function createProjectImagePath(file: File, index: number): string {
  const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image.webp";
  return `${Date.now()}-${index}-${crypto.randomUUID()}-${safeName}`;
}

export async function optimizeProjectImage(file: File, { strict = false }: { strict?: boolean } = {}): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    if (strict) throw new Error("Utilisez une image JPEG, PNG ou WebP.");
    return file;
  }
  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PROJECT_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("La préparation des images n'est pas disponible dans ce navigateur.");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/webp", PROJECT_IMAGE_QUALITY));
    if (!blob || blob.type !== "image/webp") throw new Error("La conversion WebP n'est pas disponible dans ce navigateur.");
    if (blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: file.lastModified });
  } catch (error) {
    if (strict) throw error;
    return file;
  } finally {
    bitmap?.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

function checkPublicProjectImage(source: string, supabaseUrl: string): URL {
  const url = new URL(source);
  const storage = new URL(supabaseUrl);
  if (url.protocol !== "https:" || url.origin !== storage.origin || !url.pathname.startsWith("/storage/v1/object/public/projects/") || url.username || url.password || url.search || url.hash) {
    throw new Error("Cette image doit provenir du bucket public projects de votre Supabase.");
  }
  return url;
}

async function downloadProjectImage(url: URL, signal: AbortSignal): Promise<File> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url.href, { credentials: "omit", redirect: "error", signal: controller.signal });
    if (!response.ok) throw new Error(`Le téléchargement de l'image a échoué (HTTP ${response.status}).`);
    const type = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("Le fichier distant n'est pas une image JPEG, PNG ou WebP.");
    const declaredSize = Number(response.headers.get("content-length"));
    if (declaredSize > MAX_IMAGE_BYTES) { await response.body?.cancel(); throw new Error("L'image dépasse 10 Mio. Préparez-la avant de la réimporter."); }
    if (!response.body) throw new Error("L'image téléchargée est vide.");
    const reader = response.body.getReader();
    const parts: ArrayBuffer[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error("L'image dépasse 10 Mio. Préparez-la avant de la réimporter."); }
        parts.push(value.slice().buffer as ArrayBuffer);
      }
    } finally { reader.releaseLock(); }
    if (!bytes) throw new Error("L'image téléchargée est vide.");
    const name = decodeURIComponent(url.pathname.split("/").pop() ?? "image.png");
    return new File(parts, name, { type });
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted) throw new Error("Le téléchargement de l'image a dépassé 30 secondes. Réessayez.");
    throw error;
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export async function prepareExistingProjectImages(sources: string[], supabaseUrl: string, signal: AbortSignal): Promise<PreparedProjectImage[]> {
  if (!supabaseUrl) throw new Error("La configuration Supabase est indisponible.");
  const urls = [...new Set(sources)].map((sourceUrl) => ({ sourceUrl, url: checkPublicProjectImage(sourceUrl, supabaseUrl) }));
  const prepared: PreparedProjectImage[] = [];
  // Traitement séquentiel pour ne pas décoder toutes les images simultanément.
  for (const { sourceUrl, url } of urls) {
    signal.throwIfAborted();
    const original = await downloadProjectImage(url, signal);
    signal.throwIfAborted();
    const optimized = await optimizeProjectImage(original, { strict: true });
    signal.throwIfAborted();
    if (optimized.size < original.size) prepared.push({ sourceUrl, file: optimized, originalBytes: original.size });
  }
  return prepared;
}

export async function uploadPreparedProjectImages(prepared: PreparedProjectImage[], storage: ProjectImageStorage, staged: Map<string, UploadedProjectImage>, signal: AbortSignal): Promise<Map<string, UploadedProjectImage>> {
  for (const [index, image] of prepared.entries()) {
    signal.throwIfAborted();
    if (staged.has(image.sourceUrl)) continue;
    const imagePath = createProjectImagePath(image.file, index);
    const { error } = await storage.upload(imagePath, image.file, { cacheControl: "31536000", upsert: false });
    if (error) throw new Error("L'envoi d'une image a échoué. Réessayez Enregistrer ; les originaux sont conservés.");
    const publicUrl = storage.getPublicUrl(imagePath).data.publicUrl;
    if (!publicUrl) throw new Error("L'URL de l'image envoyée n'a pas pu être obtenue.");
    staged.set(image.sourceUrl, { sourceUrl: image.sourceUrl, publicUrl, path: imagePath });
    signal.throwIfAborted();
  }
  return staged;
}

export function replaceProjectImageUrls<T extends { image_url?: string | null; image_urls?: string[] | null }>(project: T, uploaded: Map<string, UploadedProjectImage>): T {
  const replacement = (url: string) => uploaded.get(url)?.publicUrl ?? url;
  return {
    ...project,
    image_url: project.image_url ? replacement(project.image_url) : project.image_url,
    image_urls: project.image_urls?.map(replacement) ?? project.image_urls,
  };
}
