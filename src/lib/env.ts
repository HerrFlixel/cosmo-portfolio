import { getCloudflareContext } from "@opennextjs/cloudflare";
import { assertBindings } from "./bindings";
import { createDb, type Db } from "./db/client";

/** Cloudflare-Bindings der aktuellen Anfrage. Nur in Server-Code aufrufen. */
export function getEnv(): CloudflareEnv {
  const { env } = getCloudflareContext();
  assertBindings(env, ["DB", "MEDIA"]);
  return env;
}

export function getDb(): Db {
  return createDb(getEnv().DB);
}
