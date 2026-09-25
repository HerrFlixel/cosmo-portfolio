import { fromBase64Url, toBase64Url } from "./encoding.ts";

const encoder = new TextEncoder();

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Token: base64url(JSON).base64url(HMAC-SHA256). */
export async function signPayload(payload: object, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifyPayload<T>(token: string | undefined, secret: string): Promise<T | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(parts[1]), encoder.encode(parts[0]));
    return valid ? (JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as T) : null;
  } catch {
    return null;
  }
}
