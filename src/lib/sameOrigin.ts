export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const host = request.headers.get("host") || new URL(request.url).host;
    return ["http:", "https:"].includes(source.protocol) &&
      source.host === new URL(`${source.protocol}//${host}`).host;
  } catch { return false; }
}
