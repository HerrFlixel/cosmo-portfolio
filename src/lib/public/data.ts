import { cache } from "react";
import { connection } from "next/server";
import type { Category } from "@/lib/categories";
import { getDb } from "@/lib/env";
import { getSettings } from "@/lib/settings/repo";
import { getCategoryContent, getHomeContent } from "./content";

/** Öffentliche Seiten lesen bei jeder Anfrage aus D1: Änderungen im Admin sind sofort sichtbar. */
async function publicDb() {
  await connection();
  return getDb();
}

// cache(): Layout und Seite teilen sich eine Abfrage pro Anfrage.
export const loadSettings = cache(async () => getSettings(await publicDb()));
export const loadHome = cache(async () => getHomeContent(await publicDb()));
export const loadCategory = cache(async (category: Category) => getCategoryContent(await publicDb(), category));
