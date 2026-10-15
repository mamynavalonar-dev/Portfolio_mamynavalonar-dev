// Une instance appartient à un seul montage de l'admin. Aucune donnée n'est
// écrite dans localStorage, sessionStorage ou dans un cache serveur partagé.
export function createAdminMemoryCache() {
  const values = new Map<string, unknown>();
  const listeners = new Set<() => void>();
  let generation = 0;
  return {
    get generation() { return generation; },
    has: (key: string) => values.has(key),
    get: <T,>(key: string) => values.get(key) as T | undefined,
    set(key: string, value: unknown) {
      values.set(key, value);
      listeners.forEach((listener) => listener());
    },
    updateMatching(prefix: string, update: (value: unknown, key: string) => unknown) {
      for (const [key, value] of values) {
        if (key.startsWith(prefix)) values.set(key, update(value, key));
      }
      listeners.forEach((listener) => listener());
    },
    clear() {
      generation += 1;
      values.clear();
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type AdminMemoryCache = ReturnType<typeof createAdminMemoryCache>;
