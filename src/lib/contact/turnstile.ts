const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Prüft das Turnstile-Token serverseitig; jeder Fehler (Netz, Antwort) zählt als „nicht bestanden“. */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetcher(SITEVERIFY, { method: "POST", body });
    if (!response.ok) return false;
    return ((await response.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}
