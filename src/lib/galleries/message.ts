import { formatDate, type Locale } from "@/lib/format";

type Input = { locale: Locale; url: string; password: string; expiresAt: string | null };

/** Fertiger Text zum Einfügen in Mail oder WhatsApp (Spec §7.1). */
export function galleryMessage({ locale, url, password, expiresAt }: Input): string {
  if (locale === "de") {
    const availability = expiresAt ? `Die Galerie ist bis ${formatDate(expiresAt, "de")} online.` : "Die Galerie bleibt dauerhaft online.";
    return `Hallo!\n\nDeine Fotos sind online:\n${url}\n\nPasswort: ${password}\n${availability}\n\nViele Grüße\nFelix · Cosmo Photos`;
  }
  const availability = expiresAt ? `The gallery is online until ${formatDate(expiresAt, "en")}.` : "The gallery stays online.";
  return `Hi!\n\nYour photos are online:\n${url}\n\nPassword: ${password}\n${availability}\n\nBest regards\nFelix · Cosmo Photos`;
}
