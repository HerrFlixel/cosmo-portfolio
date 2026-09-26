import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { unlockFailures } from "@/lib/db/schema";
import { isLockedOut, recordFailure, UNLOCK_LIMIT, UNLOCK_WINDOW_SECONDS } from "@/lib/galleries/attempts";

const db = () => createDb(env.DB);
const NOW = 1_800_000_000;

beforeEach(async () => {
  await db().delete(unlockFailures);
});

describe("Galerie-Bremse (nur Fehlversuche)", () => {
  it("sperrt erst nach 5 Fehlversuchen innerhalb einer Minute", async () => {
    for (let i = 0; i < UNLOCK_LIMIT - 1; i++) await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:team", NOW)).toBe(false);
    await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:team", NOW)).toBe(true);
  });

  it("zählt pro Schlüssel und nur im Zeitfenster", async () => {
    for (let i = 0; i < UNLOCK_LIMIT; i++) await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:andere", NOW)).toBe(false);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:team", NOW + UNLOCK_WINDOW_SECONDS)).toBe(false);
  });

  it("räumt Einträge älter als einen Tag auf", async () => {
    await recordFailure(db(), "code:9.9.9.9", NOW - 90_000);
    await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await db().select().from(unlockFailures)).toEqual([{ key: "gallery:1.2.3.4:team", at: NOW }]);
  });
});
