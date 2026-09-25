"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/env";
import { saveSettings } from "@/lib/settings/repo";
import type { Settings } from "@/lib/settings/schema";

export type SettingsState = { ok?: boolean; errors?: Partial<Record<keyof Settings, string>> };

export async function saveSettingsAction(_previous: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const input = Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith("$")).map(([key, value]) => [key, typeof value === "string" ? value : ""]),
  );
  const result = await saveSettings(getDb(), input);
  return result.ok ? { ok: true } : { errors: result.errors };
}
