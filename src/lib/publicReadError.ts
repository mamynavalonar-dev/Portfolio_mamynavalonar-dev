export type PublicReadIssue = { code: string; category: "timeout" | "network" | "access" | "schema" | "service" | "unknown"; message: string; missingMigration: boolean };
export function describePublicReadError(error: unknown, redactions: readonly string[] = []): PublicReadIssue {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const rawCode = typeof value.code === "string" && /^[A-Z0-9_]{1,40}$/.test(value.code) ? value.code : "";
  const rawMessage = [value.message, value.details, typeof error === "string" ? error : undefined].filter((item) => typeof item === "string").join(" ");
  const source = `${rawCode} ${String(value.name ?? "")} ${rawMessage}`;
  const timeout = /TimeoutError|timeout|timed out|statement timeout|57014/i.test(source);
  const network = /fetch failed|Failed to fetch|FetchError|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|network/i.test(source);
  const missingMigration = ["42P01", "PGRST205"].includes(rawCode);
  const category = timeout ? "timeout" : network ? "network" : ["42501", "PGRST301", "PGRST302", "PGRST303", "401", "403"].includes(rawCode) ? "access" : missingMigration || ["42703", "PGRST204"].includes(rawCode) ? "schema" : /^(?:5\d\d|08\w+|XX\w+)$/.test(rawCode) ? "service" : "unknown";
  let message = rawMessage;
  for (const secret of redactions) if (secret) message = message.split(secret).join("[masqué]");
  message = message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[clé masquée]")
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[clé masquée]")
    .replace(/https?:\/\/[^\s"'<>]+/g, "[URL]")
    .replace(/\s+/g, " ").trim().slice(0, 280);
  return { code: timeout ? "TIMEOUT" : network ? rawCode || "NETWORK" : rawCode || "UNKNOWN", category, message: message || "Le fournisseur n’a pas donné de détail.", missingMigration };
}
