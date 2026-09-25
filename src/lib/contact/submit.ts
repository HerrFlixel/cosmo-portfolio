import { sendMail } from "./mail";
import { TOPIC_LABELS, contactSchema } from "./schema";
import { verifyTurnstile } from "./turnstile";

export type ContactConfig = { resendApiKey: string; turnstileSecret: string; to: string; from: string };
export type ContactField = "name" | "email" | "message";
export type ContactValues = { name: string; email: string; topic: string; message: string };
export type ContactState = {
  status: "idle" | "sent" | "invalid" | "tooMany" | "bot" | "failed";
  errors?: Partial<Record<ContactField, true>>;
  values?: ContactValues;
};
export type ContactDeps = { config: ContactConfig; ip: string | null; limit: () => Promise<boolean>; fetcher?: typeof fetch };

const DEFAULT_FROM = "Cosmo Photos <onboarding@resend.dev>";

/** Aktiv nur mit Resend-Schlüssel, Turnstile-Secret und Empfänger; sonst zeigt die Seite die Mail-Adresse. */
export function contactConfig(env: Record<string, unknown>): ContactConfig | null {
  const value = (key: string) => (typeof env[key] === "string" && env[key] !== "" ? (env[key] as string) : null);
  const resendApiKey = value("RESEND_API_KEY");
  const turnstileSecret = value("TURNSTILE_SECRET_KEY");
  const to = value("CONTACT_EMAIL");
  if (!resendApiKey || !turnstileSecret || !to) return null;
  return { resendApiKey, turnstileSecret, to, from: value("CONTACT_FROM") ?? DEFAULT_FROM };
}

const field = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** Reihenfolge: Honeypot → Prüfung → Rate-Limit → Turnstile → Resend. Eingaben kommen bei Fehlern zurück. */
export async function submitContact(form: FormData, deps: ContactDeps): Promise<ContactState> {
  // Honeypot: Bots bekommen ein „Danke“, gesendet wird nichts.
  if (field(form, "website") !== "") return { status: "sent" };

  const values: ContactValues = { name: field(form, "name"), email: field(form, "email"), topic: field(form, "topic"), message: field(form, "message") };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Partial<Record<ContactField, true>> = {};
    for (const issue of parsed.error.issues) errors[issue.path[0] as ContactField] = true;
    return { status: "invalid", errors, values };
  }

  if (!(await deps.limit())) return { status: "tooMany", values };
  if (!(await verifyTurnstile(field(form, "turnstile"), deps.config.turnstileSecret, deps.ip, deps.fetcher))) return { status: "bot", values };

  const { name, email, topic, message } = parsed.data;
  const sender = name.replace(/\s+/g, " ");
  const label = TOPIC_LABELS[topic];
  const sent = await sendMail(
    {
      from: deps.config.from,
      to: deps.config.to,
      replyTo: email,
      subject: `Anfrage (${label}) von ${sender}`,
      text: `${message}\n\n--\n${sender} <${email}>\nThema: ${label}\nGesendet über das Kontaktformular auf cosmo-photos.de.`,
    },
    deps.config.resendApiKey,
    deps.fetcher,
  );
  return sent ? { status: "sent" } : { status: "failed", values };
}
