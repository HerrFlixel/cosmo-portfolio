import type { MediaKind } from "@/lib/media/keys";
import type { ProcessedImage } from "./process";

/** 1 Versuch + 2 automatische Wiederholungen (Spec §3.3). */
const ATTEMPTS = 3;

class ClientError extends Error {}

/** Lädt alle Varianten unter einer neuen UUID hoch und gibt die UUID zurück. */
export async function uploadVariants(kind: MediaKind, image: ProcessedImage): Promise<string> {
  const id = crypto.randomUUID();
  for (const variant of image.variants) {
    await putWithRetry(`/admin/api/media/${kind}/${id}/${variant.size}`, variant.blob);
  }
  return id;
}

async function putWithRetry(url: string, blob: Blob): Promise<void> {
  let lastError = new Error("Upload fehlgeschlagen.");
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { method: "PUT", body: blob, headers: { "content-type": blob.type } });
      if (response.ok) return;
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = body?.error ?? `Upload fehlgeschlagen (${response.status}).`;
      // 4xx: Wiederholen bringt nichts (falsches Format, abgemeldet …)
      if (response.status < 500) throw new ClientError(message);
      lastError = new Error(message);
    } catch (error) {
      if (error instanceof ClientError) throw error;
      lastError = error instanceof Error ? error : lastError;
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  throw lastError;
}
