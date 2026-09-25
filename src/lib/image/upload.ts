import { HttpError, httpErrorFrom } from "@/lib/http-error";
import type { MediaKind } from "@/lib/media/keys";
import type { ProcessedImage } from "./process";

/** 1 Versuch + 2 automatische Wiederholungen (Spec §3.3). */
const ATTEMPTS = 3;

/** Lädt alle Varianten unter einer neuen UUID hoch und gibt die UUID zurück. */
export async function uploadVariants(kind: MediaKind, image: ProcessedImage): Promise<string> {
  const id = crypto.randomUUID();
  for (const variant of image.variants) {
    await putWithRetry(`/admin/api/media/${kind}/${id}/${variant.size}`, variant.blob);
  }
  return id;
}

/** PUT mit Wiederholung bei Netz- und 5xx-Fehlern; 4xx wird sofort als HttpError geworfen. */
export async function putWithRetry(url: string, body: Blob, headers: Record<string, string> = {}): Promise<Response> {
  let lastError = new Error("Upload fehlgeschlagen.");
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { method: "PUT", body, headers: { "content-type": body.type, ...headers } });
      if (response.ok) return response;
      const error = await httpErrorFrom(response, "Upload fehlgeschlagen");
      if (response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof HttpError && error.status < 500) throw error;
      lastError = error instanceof Error ? error : lastError;
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  throw lastError;
}
