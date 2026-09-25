"use client";

import Script from "next/script";
import { useActionState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_TOPICS } from "@/lib/contact/schema";
import type { ContactField, ContactState } from "@/lib/contact/submit";
import { sendContactAction } from "./actions";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const control =
  "mt-2 block w-full border-b border-ink/40 bg-transparent py-3 text-lg outline-none transition-colors focus:border-ink aria-[invalid=true]:border-alert";

export function ContactForm({ siteKey, fallbackEmail }: { siteKey: string; fallbackEmail: string }) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, { status: "idle" });
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<HTMLInputElement>(null);

  // Turnstile explizit rendern; das Token landet direkt im versteckten Feld (kein React-State nötig).
  const renderWidget = useCallback(() => {
    if (!window.turnstile || !widget.current || widgetId.current) return;
    const setToken = (value: string) => {
      if (token.current) token.current.value = value;
    };
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: siteKey,
      language: locale,
      theme: "light",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, [siteKey, locale]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [renderWidget]);

  // Jeder Versuch verbraucht das Token: Feld leeren, Widget zurücksetzen, es holt ein neues.
  useEffect(() => {
    if (state.status === "idle" || !widgetId.current) return;
    if (token.current) token.current.value = "";
    window.turnstile?.reset(widgetId.current);
  }, [state]);

  if (state.status === "sent") {
    return (
      <p role="status" className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.1]">
        {t("sent")}
      </p>
    );
  }

  const invalid = (name: ContactField) => state.errors?.[name] === true;
  const described = (name: ContactField) => (invalid(name) ? `contact-${name}-error` : undefined);
  const general =
    state.status === "tooMany"
      ? t("errors.tooMany")
      : state.status === "bot"
        ? t("errors.bot")
        : state.status === "failed"
          ? fallbackEmail
            ? t("errors.failed", { email: fallbackEmail })
            : t("errors.failedNoMail")
          : null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />
      <form action={action} className="grid gap-8">
        <div>
          <label htmlFor="contact-name" className="text-sm">
            {t("name")}
          </label>
          <input id="contact-name" name="name" required maxLength={100} autoComplete="name" defaultValue={state.values?.name ?? ""} aria-invalid={invalid("name") || undefined} aria-describedby={described("name")} className={control} />
          {invalid("name") && (
            <p id="contact-name-error" className="mt-2 text-sm text-alert">
              {t("errors.name")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm">
            {t("email")}
          </label>
          <input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={state.values?.email ?? ""} aria-invalid={invalid("email") || undefined} aria-describedby={described("email")} className={control} />
          {invalid("email") && (
            <p id="contact-email-error" className="mt-2 text-sm text-alert">
              {t("errors.email")}
            </p>
          )}
        </div>
        <fieldset>
          <legend className="text-sm">{t("topic")}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {CONTACT_TOPICS.map((topic) => (
              <label key={topic} className="cursor-pointer">
                <input type="radio" name="topic" value={topic} defaultChecked={state.values?.topic === topic} className="peer sr-only" />
                <span className="block rounded-full border border-ink/30 px-4 py-2 text-sm transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {t(`topics.${topic}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="contact-message" className="text-sm">
            {t("message")}
          </label>
          <textarea id="contact-message" name="message" required maxLength={5000} rows={6} defaultValue={state.values?.message ?? ""} aria-invalid={invalid("message") || undefined} aria-describedby={described("message")} className={`${control} resize-y`} />
          {invalid("message") && (
            <p id="contact-message-error" className="mt-2 text-sm text-alert">
              {t("errors.message")}
            </p>
          )}
        </div>
        {/* Honeypot: für Menschen unsichtbar und nicht erreichbar */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <div ref={widget} className="min-h-[65px]" />
        <input ref={token} type="hidden" name="turnstile" defaultValue="" />
        {general && (
          <p role="alert" className="text-sm text-alert">
            {general}
          </p>
        )}
        <button type="submit" disabled={pending} className="justify-self-start rounded-full bg-ink px-8 py-3.5 text-paper transition active:scale-[0.98] disabled:opacity-60">
          {pending ? t("sending") : t("send")}
        </button>
      </form>
    </>
  );
}
