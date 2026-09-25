import { cookies, headers } from "next/headers";
import { createTranslator } from "next-intl";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import { resolveGalleryLocale, type GalleryLocale } from "./locale";

/**
 * Sprache der Galerie (Spec §3.2): /g/… hat kein Sprachpräfix, deshalb Cookie NEXT_LOCALE bzw. Browsersprache.
 * Bewusst unabhängig von src/i18n/request.ts, das die Sprache aus der URL liest.
 */
export async function galleryI18n() {
  const locale: GalleryLocale = resolveGalleryLocale((await cookies()).get("NEXT_LOCALE")?.value, (await headers()).get("accept-language"));
  const messages = { gallery: (locale === "de" ? de : en).gallery };
  return { locale, messages, t: createTranslator({ locale, messages, namespace: "gallery" }) };
}
