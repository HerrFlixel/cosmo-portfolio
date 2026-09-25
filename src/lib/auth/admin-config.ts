export type AdminConfig = { username: string; passwordHash: string; sessionSecret: string };

const KEYS = ["ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"] as const;

/** Liest die Admin-Konfiguration aus der Worker-Umgebung, mit verständlichen Fehlern. */
export function readAdminConfig(env: Partial<Record<(typeof KEYS)[number], unknown>>): AdminConfig {
  const missing = KEYS.filter((key) => typeof env[key] !== "string" || env[key] === "");
  if (missing.length > 0) {
    throw new Error(
      `Admin-Konfiguration fehlt: ${missing.join(", ")} – als Variable in wrangler.jsonc bzw. per "wrangler secret put" setzen.`,
    );
  }
  const sessionSecret = env.SESSION_SECRET as string;
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET muss mindestens 32 Zeichen lang sein.");
  return { username: env.ADMIN_USERNAME as string, passwordHash: env.ADMIN_PASSWORD_HASH as string, sessionSecret };
}
