import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
export function readPublicEnvironment(root, environment = process.env) {
  const values = Object.fromEntries(names.map((name) => [name, environment[name] || ""]));
  for (const filename of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const file = path.join(root, filename);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const name of names) {
      if (values[name]) continue;
      const match = text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`, "m"));
      if (!match) continue;
      const raw = match[1].trim();
      values[name] = /^["']/.test(raw) ? raw.slice(1, raw.lastIndexOf(raw[0])) : raw.split("#")[0].trim();
    }
  }
  return values;
}
function safeMessage(text, key) {
  return String(text ?? "").split(key).join("[clé masquée]").replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[clé masquée]").replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[clé masquée]").replace(/https?:\/\/[^\s"'<>]+/g, "[URL]").replace(/\s+/g, " ").slice(0, 280);
}
const safeCode = (value) => typeof value === "string" && /^[A-Z0-9_]{1,60}$/.test(value) ? value : "UNKNOWN";
const probes = [
  { table: "projects", columns: "id,title,description,technologies,key_features,image_url,image_urls,live_url,github_url,created_at,updated_at" },
  { table: "certificates", columns: "id,title,image_url,created_at" },
  { table: "tech_stack", columns: "id,name,logo_url,created_at,hero_visible,hero_order", legacy: "id,name,logo_url,created_at" },
  { table: "portfolio_services", columns: "id,title,summary,description,bullet_points,icon,accent,display_order,published,created_at,updated_at", published: true },
  { table: "portfolio_journey", columns: "id,kind,title,organization,description,start_date,end_date,current,tags,logo_url,project_id,external_url,display_order,published,created_at,updated_at", published: true },
  { table: "portfolio_social_settings", columns: "heading,introduction" },
  { table: "portfolio_social_links", columns: "id,platform,title,display_name,url,featured,published,display_order,created_at,updated_at", published: true },
];
export async function runDiagnostic(root = process.cwd(), environment = process.env) {
  const values = readPublicEnvironment(root, environment);
  const key = values.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!values.NEXT_PUBLIC_SUPABASE_URL || !key) throw new Error("Les deux variables publiques Supabase doivent être renseignées dans votre environnement de production local.");
  if (names.some((name) => /\$\{/.test(values[name]))) throw new Error("Le diagnostic attend des valeurs publiques explicites, sans interpolation de variables.");
  const base = new URL(values.NEXT_PUBLIC_SUPABASE_URL);
  if (base.username || base.password || (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) throw new Error("L’URL publique doit utiliser HTTPS, ou un serveur de test local.");
  if (key.startsWith("sb_secret_")) throw new Error("Cette variable contient une clé serveur. Le diagnostic accepte uniquement une clé publique.");
  if (key.startsWith("eyJ") && key.split(".").length === 3) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role; } catch { /* L'API indiquera une clé publique mal formée. */ }
    if (role && role !== "anon") throw new Error("Le rôle de cette clé n’est pas anon. Le diagnostic accepte uniquement la clé publique.");
  }
  const results = [];
  async function probe(item, columns = item.columns) {
    const url = new URL("/rest/v1/" + item.table, base);
    url.searchParams.set("select", columns); url.searchParams.set("limit", "1");
    if (item.published) url.searchParams.set("published", "eq.true");
    const start = performance.now();
    try {
      const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(12_000), redirect: "error" });
      const body = await response.json().catch(() => null);
      const milliseconds = Math.round(performance.now() - start);
      return { table: item.table, status: response.status, milliseconds, ok: response.ok, ...(response.ok ? { visibleRowsInSample: Array.isArray(body) ? body.length : 0, slowerThanApplicationLimit: milliseconds > 6000 } : { code: safeCode(body?.code ?? String(response.status)), message: safeMessage(body?.message || response.statusText, key) }) };
    } catch (error) {
      return { table: item.table, status: 0, milliseconds: Math.round(performance.now() - start), ok: false, code: error.name === "TimeoutError" ? "TIMEOUT" : safeCode(error.cause?.code ?? error.code), message: error.name === "TimeoutError" ? "La lecture n’a pas répondu en douze secondes." : "La requête réseau a échoué avant la réponse HTTP." };
    }
  }
  console.log("Diagnostic en lecture seule des sept tables publiques. Les clés et les lignes reçues ne sont pas affichées.");
  // Deux lectures simultanées suffisent à diagnostiquer sans surcharger le service.
  for (let index = 0; index < probes.length; index += 2) {
    const group = await Promise.all(probes.slice(index, index + 2).map(async (item) => {
      const result = await probe(item);
      if (item.legacy && result.code === "42703") result.legacy = await probe(item, item.legacy);
      return result;
    }));
    for (const result of group) { results.push(result); console.log(JSON.stringify(result)); }
  }
  const report = { date: new Date().toISOString(), provider: base.origin, timeoutMilliseconds: 12000, applicationTimeoutMilliseconds: 6000, writes: false, keysIncluded: false, rowDataIncluded: false, results };
  const folder = path.join(root, "artifacts"); fs.mkdirSync(folder, { recursive: true });
  const filename = "diagnostic-supabase-" + report.date.replace(/[:.]/g, "-") + ".json";
  fs.writeFileSync(path.join(folder, filename), JSON.stringify(report, null, 2));
  console.log("Rapport : artifacts/" + filename);
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const report = await runDiagnostic(); if (report.results.some((result) => !result.ok && !result.legacy?.ok)) process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
