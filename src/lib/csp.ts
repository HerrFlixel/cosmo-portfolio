/**
 * CSP der öffentlichen Seiten (Plan 6): Skripte nur mit der Nonce dieser Anfrage; strict-dynamic lässt Skripte zu,
 * die ein vertrauenswürdiges Skript nachlädt (Turnstile). Styles bleiben inline erlaubt (React-style-Attribute, GSAP).
 */
export function contentSecurityPolicy(nonce: string, dev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** 128 Bit aus dem Kryptografie-Zufall, Base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
