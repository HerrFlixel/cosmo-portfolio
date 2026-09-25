export type RequiredBinding = "DB" | "MEDIA" | "GALLERIES";

/** Wirft eine verständliche Meldung, wenn ein Binding in dieser Umgebung fehlt. */
export function assertBindings(
  env: Partial<CloudflareEnv>,
  names: readonly RequiredBinding[],
): asserts env is CloudflareEnv {
  const missing = names.filter((name) => env[name] == null);
  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudflare binding(s): ${missing.join(", ")} – check wrangler.jsonc for this environment.`,
    );
  }
}
