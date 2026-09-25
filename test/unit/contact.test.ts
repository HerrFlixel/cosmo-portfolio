import { describe, expect, it } from "vitest";
import { contactConfig, submitContact, type ContactConfig } from "@/lib/contact/submit";

const config: ContactConfig = { resendApiKey: "re_test", turnstileSecret: "secret", to: "felix@example.com", from: "Cosmo Photos <onboarding@resend.dev>" };

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  const values = { name: "Anna Keller", email: "anna@example.org", topic: "wedding", message: "Wir heiraten im Juni in Hamburg.", turnstile: "token", website: "", ...fields };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function fakeFetch(answers: { turnstile?: boolean; resend?: number } = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (String(input).includes("turnstile")) return Response.json({ success: answers.turnstile ?? true });
    return new Response(JSON.stringify({ id: "mail_1" }), { status: answers.resend ?? 200 });
  }) as typeof fetch;
  return { fetcher, calls };
}

const allow = async () => true;

describe("submitContact", () => {
  it("verifies Turnstile and sends one mail via Resend with reply-to, topic and name", async () => {
    const { fetcher, calls } = fakeFetch();
    expect(await submitContact(form(), { config, ip: "203.0.113.7", limit: allow, fetcher })).toEqual({ status: "sent" });
    expect(calls.map((call) => call.url)).toEqual(["https://challenges.cloudflare.com/turnstile/v0/siteverify", "https://api.resend.com/emails"]);
    const verify = calls[0].init?.body as FormData;
    expect([verify.get("secret"), verify.get("response"), verify.get("remoteip")]).toEqual(["secret", "token", "203.0.113.7"]);
    expect((calls[1].init?.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      from: "Cosmo Photos <onboarding@resend.dev>",
      to: ["felix@example.com"],
      reply_to: "anna@example.org",
      subject: "Anfrage (Hochzeit) von Anna Keller",
      text: expect.stringContaining("Wir heiraten im Juni in Hamburg."),
    });
  });

  it("returns field errors and keeps the values without calling anything", async () => {
    const { fetcher, calls } = fakeFetch();
    const state = await submitContact(form({ name: " ", email: "keine-mail", message: "kurz" }), { config, ip: null, limit: allow, fetcher });
    expect(state.status).toBe("invalid");
    expect(state.errors).toEqual({ name: true, email: true, message: true });
    expect(state.values?.message).toBe("kurz");
    expect(calls).toEqual([]);
  });

  it("answers bots in the honeypot with a fake success and sends nothing", async () => {
    const { fetcher, calls } = fakeFetch();
    expect(await submitContact(form({ website: "https://spam.example" }), { config, ip: null, limit: allow, fetcher })).toEqual({ status: "sent" });
    expect(calls).toEqual([]);
  });

  it("stops at the rate limit before verifying", async () => {
    const { fetcher, calls } = fakeFetch();
    const state = await submitContact(form(), { config, ip: null, limit: async () => false, fetcher });
    expect(state.status).toBe("tooMany");
    expect(calls).toEqual([]);
  });

  it("rejects a failed Turnstile check without sending", async () => {
    const { fetcher, calls } = fakeFetch({ turnstile: false });
    expect((await submitContact(form(), { config, ip: null, limit: allow, fetcher })).status).toBe("bot");
    expect(calls).toHaveLength(1);
  });

  it("reports a Resend failure and keeps the values", async () => {
    const { fetcher } = fakeFetch({ resend: 500 });
    const state = await submitContact(form(), { config, ip: null, limit: allow, fetcher });
    expect(state.status).toBe("failed");
    expect(state.values?.name).toBe("Anna Keller");
  });

  it("removes line breaks from the subject", async () => {
    const { fetcher, calls } = fakeFetch();
    await submitContact(form({ name: "Anna\nBcc: x@example.com" }), { config, ip: null, limit: allow, fetcher });
    expect(JSON.parse(String(calls[1].init?.body)).subject).toBe("Anfrage (Hochzeit) von Anna Bcc: x@example.com");
  });

  it("only logs with the key 'log' (local, E2E, preview)", async () => {
    const { fetcher, calls } = fakeFetch();
    expect(await submitContact(form(), { config: { ...config, resendApiKey: "log" }, ip: null, limit: allow, fetcher })).toEqual({ status: "sent" });
    expect(calls.map((call) => call.url)).toEqual(["https://challenges.cloudflare.com/turnstile/v0/siteverify"]);
  });
});

describe("contactConfig", () => {
  it("needs Resend key, Turnstile secret and recipient; the sender is optional", () => {
    expect(contactConfig({ RESEND_API_KEY: "re_x", TURNSTILE_SECRET_KEY: "s", CONTACT_EMAIL: "a@b.de" })).toEqual({
      resendApiKey: "re_x",
      turnstileSecret: "s",
      to: "a@b.de",
      from: "Cosmo Photos <onboarding@resend.dev>",
    });
    expect(contactConfig({ RESEND_API_KEY: "re_x", CONTACT_EMAIL: "a@b.de" })).toBeNull();
    expect(contactConfig({ RESEND_API_KEY: "", TURNSTILE_SECRET_KEY: "s", CONTACT_EMAIL: "a@b.de" })).toBeNull();
    expect(contactConfig({ RESEND_API_KEY: "re_x", TURNSTILE_SECRET_KEY: "s", CONTACT_EMAIL: "a@b.de", CONTACT_FROM: "Cosmo Photos <kontakt@cosmo-photos.de>" })?.from).toBe(
      "Cosmo Photos <kontakt@cosmo-photos.de>",
    );
  });
});
