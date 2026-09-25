import { fromBase64Url, toBase64Url } from "./encoding.ts";

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type Payload = { sub: "admin"; exp: number };
const encoder = new TextEncoder();

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Token: base64url(JSON-Payload).base64url(HMAC-SHA256). */
export async function createSessionToken(secret: string, nowSeconds: number, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  const payload: Payload = { sub: "admin", exp: nowSeconds + ttlSeconds };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowSeconds: number): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [body, signature] = parts;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as Partial<Payload>;
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}
