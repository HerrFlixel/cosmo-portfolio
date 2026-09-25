import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { SETTINGS_DEFAULTS } from "@/lib/settings/schema";
import { getSettings, saveSettings } from "@/lib/settings/repo";

const db = () => createDb(env.DB);
const valid = {
  ...SETTINGS_DEFAULTS,
  hero_headline_de: "  Hallen, Rauch, Gänsehaut.  ",
  contact_email: "hallo@cosmo-photos.de",
  instagram_url: "https://www.instagram.com/cosmo.photos_/",
  about_portrait_id: "3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d",
};

beforeEach(async () => {
  await db().delete(settings);
});

describe("settings", () => {
  it("returns empty defaults when nothing is stored", async () => {
    expect(await getSettings(db())).toEqual(SETTINGS_DEFAULTS);
    expect(Object.values(SETTINGS_DEFAULTS).every((v) => v === "")).toBe(true);
  });

  it("saves trimmed values and reads them back", async () => {
    expect(await saveSettings(db(), valid)).toEqual({ ok: true });
    const stored = await getSettings(db());
    expect(stored.hero_headline_de).toBe("Hallen, Rauch, Gänsehaut.");
    expect(stored.contact_email).toBe("hallo@cosmo-photos.de");
  });

  it("overwrites on second save and clears with empty strings", async () => {
    await saveSettings(db(), valid);
    await saveSettings(db(), { ...valid, instagram_url: "" });
    expect((await getSettings(db())).instagram_url).toBe("");
  });

  it("reports field errors in German and stores nothing", async () => {
    const result = await saveSettings(db(), {
      ...valid,
      contact_email: "keine-mail",
      pictrs_url: "http://unsicher.example",
      about_portrait_id: "../../etc",
      hero_headline_de: "x".repeat(121),
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        contact_email: "Keine gültige E-Mail-Adresse.",
        pictrs_url: "Bitte eine vollständige https-Adresse angeben.",
        about_portrait_id: "Ungültige Bild-ID.",
        hero_headline_de: "Höchstens 120 Zeichen.",
      },
    });
    expect(await getSettings(db())).toEqual(SETTINGS_DEFAULTS);
  });

  it("ignores unknown keys and treats missing keys as empty", async () => {
    expect(await saveSettings(db(), { hero_headline_de: "Nur das", fremd: "x" })).toEqual({ ok: true });
    const stored = await getSettings(db());
    expect(stored.hero_headline_de).toBe("Nur das");
    expect("fremd" in stored).toBe(false);
  });
});
