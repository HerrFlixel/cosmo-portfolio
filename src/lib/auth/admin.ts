import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readAdminConfig, type AdminConfig } from "./admin-config";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "./session";

export const ADMIN_COOKIE = "cosmo_admin";
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax", path: "/admin" } as const;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export function adminConfig(): AdminConfig {
  return readAdminConfig(getCloudflareContext().env);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token, adminConfig().sessionSecret, nowSeconds());
}

/** Für Seiten und Server Actions: ohne gültige Session zum Login. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startAdminSession(): Promise<void> {
  const token = await createSessionToken(adminConfig().sessionSecret, nowSeconds());
  (await cookies()).set(ADMIN_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_SECONDS });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

/** Für Admin-API-Routen: gibt eine Fehlerantwort zurück oder null, wenn alles passt. */
export async function adminApiGuard(request: Request): Promise<Response | null> {
  const origin = request.headers.get("origin");
  if (origin !== null && !sameHost(origin, request.url)) {
    return Response.json({ error: "Anfrage von fremder Herkunft." }, { status: 403 });
  }
  if (!(await isAdmin())) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  return null;
}

function sameHost(origin: string, url: string): boolean {
  try {
    return new URL(origin).host === new URL(url).host;
  } catch {
    return false;
  }
}
