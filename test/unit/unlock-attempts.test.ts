import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { unlockFailures } from "@/lib/db/schema";
import { beginAttempt, forgetAttempt, UNLOCK_LIMIT, UNLOCK_WINDOW_SECONDS } from "@/lib/galleries/attempts";

const db = () => createDb(env.DB);
const NOW = 1_800_000_000;
const KEY = "gallery:1.2.3.4:team";

beforeEach(async () => {
  await db().delete(unlockFailures);
});

describe("Galerie-Bremse (Versuch zählt sofort, richtiges Passwort wird wieder vergessen)", () => {
  it("sperrt den sechsten Versuch nach fünf Fehlversuchen innerhalb einer Minute", async () => {
    for (let i = 0; i < UNLOCK_LIMIT; i++) expect((await beginAttempt(db(), KEY, NOW)).attempts).toBeLessThanOrEqual(UNLOCK_LIMIT);
    expect((await beginAttempt(db(), KEY, NOW)).attempts).toBeGreaterThan(UNLOCK_LIMIT);
  });

  it("parallele Anfragen umgehen die Sperre nicht: Zählen und Eintragen sind eins", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => beginAttempt(db(), KEY, NOW)));
    expect(results.filter((result) => result.attempts > UNLOCK_LIMIT)).toHaveLength(8 - UNLOCK_LIMIT);
  });

  it("richtige Anmeldungen zählen nicht: ein ganzes Team kommt nacheinander hinein", async () => {
    for (let person = 0; person < 10; person++) {
      const attempt = await beginAttempt(db(), KEY, NOW);
      expect(attempt.attempts).toBe(1);
      await forgetAttempt(db(), attempt.id);
    }
  });

  it("zählt pro Schlüssel und nur im Zeitfenster; räumt Einträge älter als einen Tag auf", async () => {
    for (let i = 0; i < UNLOCK_LIMIT; i++) await beginAttempt(db(), KEY, NOW);
    expect((await beginAttempt(db(), "gallery:1.2.3.4:andere", NOW)).attempts).toBe(1);
    expect((await beginAttempt(db(), KEY, NOW + UNLOCK_WINDOW_SECONDS)).attempts).toBe(1);
    await beginAttempt(db(), "code:9.9.9.9", NOW + 90_000);
    expect(await db().select().from(unlockFailures)).toEqual([{ key: "code:9.9.9.9", at: NOW + 90_000 }]);
  });
});
