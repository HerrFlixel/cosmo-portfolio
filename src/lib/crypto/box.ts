import { fromBase64Url, toBase64Url } from "@/lib/auth/encoding";

const encoder = new TextEncoder();

async function aesKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Verschlüsselt kurze Texte (Galerie-Passwörter) für die Anzeige im Admin. Format: v1.<iv>.<ciphertext>. */
export async function encryptText(plain: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), encoder.encode(plain));
  return `v1.${toBase64Url(iv)}.${toBase64Url(cipher)}`;
}

export async function decryptText(box: string, secret: string): Promise<string> {
  const [version, iv, cipher] = box.split(".");
  if (version !== "v1" || !iv || !cipher) throw new Error("Ungültiges Format.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, await aesKey(secret), fromBase64Url(cipher));
  return new TextDecoder().decode(plain);
}
