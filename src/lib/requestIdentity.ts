import "server-only";

import { createHmac, randomBytes } from "node:crypto";

function serverSecret(name: string) {
  const secret =
    process.env[name] ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) throw new Error(`Secret serveur manquant : ${name}`);
  return secret;
}

function hash(value: string, secretName: string) {
  return createHmac("sha256", serverSecret(secretName))
    .update(value)
    .digest("hex");
}

export function requestIpHash(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return hash(ip, "COMMENT_RATE_LIMIT_SECRET");
}

export function visitorIdentity(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existing = cookieHeader
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === "portfolio_visitor")?.[1];
  const validExisting =
    typeof existing === "string" && /^[a-f0-9]{64}$/.test(existing)
      ? existing
      : null;
  const token = validExisting ?? randomBytes(32).toString("hex");

  return {
    clientHash: hash(token, "COMMENT_VISITOR_SECRET"),
    cookie:
      validExisting === null
        ? `portfolio_visitor=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${
            process.env.NODE_ENV === "production" ? "; Secure" : ""
          }`
        : null,
  };
}
