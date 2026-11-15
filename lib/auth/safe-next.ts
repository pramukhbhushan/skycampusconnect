// Validates the `next` redirect target used after sign-in. Owner: Engineer A (Aryan).
// Only same-site paths are allowed, so a crafted link can't send a user to another site.

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  // Must be a single-slash path: reject "//evil.com", "/\evil.com" and absolute URLs.
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  // Reject control characters (header injection, odd parsing).
  if (/[\u0000-\u001f]/.test(next)) return null;
  return next;
}
