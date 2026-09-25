"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): Kontaktformular mit Honeypot, Rate-Limit und Turnstile.
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { contactConfig, submitContact, type ContactState } from "@/lib/contact/submit";

export async function sendContactAction(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const { env } = getCloudflareContext();
  const config = contactConfig(env as unknown as Record<string, unknown>);
  if (!config) return { status: "failed" };
  const ip = (await headers()).get("cf-connecting-ip");
  return submitContact(formData, {
    config,
    ip,
    limit: async () => (await env.CONTACT_LIMITER.limit({ key: `contact:${ip ?? "lokal"}` })).success,
  });
}
