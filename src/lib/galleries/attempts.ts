import { and, count, eq, gt, lt } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { unlockFailures } from "@/lib/db/schema";

export const UNLOCK_LIMIT = 5;
export const UNLOCK_WINDOW_SECONDS = 60;
const KEEP_SECONDS = 86_400;

/**
 * Bremse nur für Fehlversuche (Plan 6, Spec §7.4): Ein ganzes Team im selben Hallen-WLAN kann dieselbe Galerie
 * gleichzeitig öffnen; wer rät, ist nach 5 Fehlversuchen pro Minute und Schlüssel gebremst.
 * Schlüssel: `gallery:<IP>:<slug>` (Passwort) bzw. `code:<IP>` (Galerie-Code auf /kunden).
 */
export async function isLockedOut(db: Db, key: string, now: number): Promise<boolean> {
  const [row] = await db
    .select({ failures: count() })
    .from(unlockFailures)
    .where(and(eq(unlockFailures.key, key), gt(unlockFailures.at, now - UNLOCK_WINDOW_SECONDS)));
  return (row?.failures ?? 0) >= UNLOCK_LIMIT;
}

/** Merkt einen Fehlversuch und räumt nebenbei alles älter als einen Tag weg (kein Cron nötig). */
export async function recordFailure(db: Db, key: string, now: number): Promise<void> {
  await db.batch([
    db.insert(unlockFailures).values({ key, at: now }),
    db.delete(unlockFailures).where(lt(unlockFailures.at, now - KEEP_SECONDS)),
  ]);
}
