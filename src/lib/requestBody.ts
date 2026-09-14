export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413,
  ) {
    super(message);
  }
}

/** Bound the bytes actually read, including requests without Content-Length. */
export async function readRequestBody(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");

  if (contentLength !== null && Number(contentLength) > maxBytes) {
    throw new RequestBodyError("Requête trop volumineuse.", 413);
  }

  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);

  const chunks: Uint8Array[] = [];
  let length = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;

      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyError("Requête trop volumineuse.", 413);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

export async function readBoundedFormData(request: Request, maxBytes: number) {
  const bytes = await readRequestBody(request, maxBytes);

  try {
    return await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new RequestBodyError("Requête invalide.", 400);
  }
}
