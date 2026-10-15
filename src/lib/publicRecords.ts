// Les réponses publiques sont des données JSON. Conserver les références
// évite une animation de layout et un rendu React si rien n'a changé.
export function samePublicValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => samePublicValue(value, right[index]));
  }
  const first = left as Record<string, unknown>;
  const second = right as Record<string, unknown>;
  const keys = Object.keys(first);
  return keys.length === Object.keys(second).length && keys.every((key) => Object.hasOwn(second, key) && samePublicValue(first[key], second[key]));
}

export function retainPublicRecords<T>(previous: T[], incoming: T[]): T[] {
  return samePublicValue(previous, incoming) ? previous : incoming;
}
