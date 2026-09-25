/** Fehler einer Admin-API-Antwort mit HTTP-Status (z. B. 401 = Anmeldung abgelaufen). */
export class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Liest die deutsche Fehlermeldung aus einer Antwort `{ error }`. */
export async function httpErrorFrom(response: Response, fallback: string): Promise<HttpError> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return new HttpError(body?.error ?? `${fallback} (${response.status}).`, response.status);
}
