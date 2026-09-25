import { inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { SETTINGS_DEFAULTS, SETTINGS_KEYS, settingsSchema, type Settings } from "./schema";

export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.select().from(settings).where(inArray(settings.key, SETTINGS_KEYS));
  return { ...SETTINGS_DEFAULTS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
}

export type SaveResult = { ok: true } | { ok: false; errors: Partial<Record<keyof Settings, string>> };

/** Speichert alle bekannten Felder atomar; fehlende gelten als leer, unbekannte werden ignoriert. */
export async function saveSettings(db: Db, input: unknown): Promise<SaveResult> {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const candidate = Object.fromEntries(SETTINGS_KEYS.map((key) => [key, typeof raw[key] === "string" ? raw[key] : ""]));
  const parsed = settingsSchema.safeParse(candidate);
  if (!parsed.success) {
    const errors: Partial<Record<keyof Settings, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Settings;
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const [first, ...rest] = SETTINGS_KEYS.map((key) =>
    db.insert(settings).values({ key, value: parsed.data[key] }).onConflictDoUpdate({ target: settings.key, set: { value: parsed.data[key] } }),
  );
  await db.batch([first, ...rest]);
  return { ok: true };
}
