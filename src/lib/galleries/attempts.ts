import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { unlockFailures } from "@/lib/db/schema";

export const UNLOCK_LIMIT = 5;
export const UNLOCK_WINDOW_SECONDS = 60;
const KEEP_SECONDS = 86_400;

export type Attempt = { id: number; attempts: number };

/**
 * Bremse für Galerie-Passwort und Galerie-Code (Plan 6, Spec §7.4): Jeder Versuch zählt sofort, in einem Batch mit der
 * Zählung (D1-Batches laufen nacheinander), damit parallele Anfragen die Sperre nicht umgehen. Ein richtiges Passwort
 * nimmt seinen Versuch wieder heraus (forgetAttempt): Ein ganzes Team im Hallen-WLAN kommt nacheinander hinein, wer rät,
 * ist ab dem sechsten Versuch pro Minute und Schlüssel gebremst. Schlüssel: `gallery:<IP>:<slug>` bzw. `code:<IP>`.
 * Nebenbei verschwinden Einträge älter als einen Tag (Index auf at, kein Cron nötig).
 */
export async function beginAttempt(db: Db, key: string, now: number): Promise<Attempt> {
  const [inserted, counted] = await db.batch([
    db.insert(unlockFailures).values({ key, at: now }).returning({ id: sql<number>`rowid` }),
    db
      .select({ attempts: count() })
      .from(unlockFailures)
      .where(and(eq(unlockFailures.key, key), gt(unlockFailures.at, now - UNLOCK_WINDOW_SECONDS))),
    db.delete(unlockFailures).where(lt(unlockFailures.at, now - KEEP_SECONDS)),
  ]);
  return { id: inserted[0].id, attempts: counted[0]?.attempts ?? 0 };
}

/** Richtiges Passwort bzw. gefundener Code: Der Versuch zählt nicht. */
export async function forgetAttempt(db: Db, id: number): Promise<void> {
  await db.delete(unlockFailures).where(sql`rowid = ${id}`);
}
