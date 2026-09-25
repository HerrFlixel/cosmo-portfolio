import type { z } from "zod";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Liest und prüft einen JSON-Body. Bei Fehlern kommt eine fertige 400-Antwort zurück. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<{ data: z.infer<T> } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError("Ungültiges JSON.", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: jsonError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.", 400) };
  return { data: parsed.data };
}
