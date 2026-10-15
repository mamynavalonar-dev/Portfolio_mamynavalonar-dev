import { describe, expect, it, vi } from "vitest";
import { createAdminMemoryCache } from "@/lib/adminMemoryCache";

describe("cache temporaire de la session admin", () => {
  it("isole les données entre deux montages de l'admin", () => {
    const first = createAdminMemoryCache();
    const second = createAdminMemoryCache();
    first.set("messages:all", [{ id: 1, message: "privé" }]);
    expect(second.has("messages:all")).toBe(false);
  });
  it("conserve un résultat confirmé pendant l'attente de sa nouvelle lecture", () => {
    const cache = createAdminMemoryCache();
    const rows = [{ id: "confirmed-project" }];
    cache.set("projects", rows);
    expect(cache.get("projects")).toBe(rows);
    expect(cache.has("never-loaded")).toBe(false);
    cache.set("empty-list", []);
    expect(cache.has("empty-list")).toBe(true);
  });
  it("efface toutes les rubriques et change de génération à la déconnexion", () => {
    const cache = createAdminMemoryCache();
    cache.set("messages:all", [{ id: 1 }]);
    cache.set("social:settings", { heading: "Réseaux" });
    const generation = cache.generation;
    const listener = vi.fn();
    const unsubscribe = cache.subscribe(listener);
    cache.clear();
    expect(cache.generation).toBeGreaterThan(generation);
    expect(cache.has("messages:all")).toBe(false);
    expect(cache.has("social:settings")).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    cache.set("projects", []);
    expect(listener).toHaveBeenCalledOnce();
  });
  it("actualise tous les filtres concernés sans toucher aux autres rubriques", () => {
    const cache = createAdminMemoryCache();
    cache.set("messages:all", [{ id: 1, status: "new" }]);
    cache.set("messages:new", [{ id: 1, status: "new" }]);
    const projects = [{ id: "project" }];
    cache.set("projects", projects);
    cache.updateMatching("messages:", (value, key) => key === "messages:new" ? [] : (value as Array<{ id: number; status: string }>).map((row) => ({ ...row, status: "read" })));
    expect(cache.get("messages:new")).toEqual([]);
    expect(cache.get("messages:all")).toEqual([{ id: 1, status: "read" }]);
    expect(cache.get("projects")).toBe(projects);
  });
});
