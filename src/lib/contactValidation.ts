export function normalizeContactString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
