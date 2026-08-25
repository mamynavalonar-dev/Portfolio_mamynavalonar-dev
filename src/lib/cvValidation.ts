export const CV_BUCKET = "cv";
export const CV_MAX_BYTES = 3 * 1024 * 1024;
export const CV_MIME_TYPE = "application/pdf";

export function hasPdfSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function sanitizeCvFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return "CV.pdf";

  return normalized.toLowerCase().endsWith(".pdf")
    ? normalized
    : `${normalized}.pdf`;
}
