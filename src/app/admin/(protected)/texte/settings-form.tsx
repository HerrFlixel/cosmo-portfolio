"use client";

import { useActionState } from "react";
import type { Settings } from "@/lib/settings/schema";
import { saveSettingsAction, type SettingsState } from "./actions";
import { PortraitField } from "./portrait-field";

type Field = { key: keyof Settings; label: string; multiline?: boolean; type?: "email" | "url" };

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Startseite", fields: [
    { key: "hero_headline_de", label: "Hero-Headline (DE)" },
    { key: "hero_headline_en", label: "Hero-Headline (EN)" },
  ] },
  { title: "Über mich", fields: [
    { key: "about_statement_de", label: "Statement (DE)" },
    { key: "about_statement_en", label: "Statement (EN)" },
    { key: "about_text_de", label: "Text (DE)", multiline: true },
    { key: "about_text_en", label: "Text (EN)", multiline: true },
    { key: "references", label: "Referenzen", multiline: true },
  ] },
  { title: "Kontakt & Links", fields: [
    { key: "contact_email", label: "Kontakt-E-Mail", type: "email" },
    { key: "instagram_url", label: "Instagram", type: "url" },
    { key: "pictrs_url", label: "pictrs-Shop", type: "url" },
  ] },
  { title: "Rechtliches", fields: [
    { key: "imprint_de", label: "Impressum (DE)", multiline: true },
    { key: "imprint_en", label: "Impressum (EN)", multiline: true },
    { key: "privacy_de", label: "Datenschutz (DE)", multiline: true },
    { key: "privacy_en", label: "Datenschutz (EN)", multiline: true },
  ] },
];

const control = "mt-1 block w-full border border-ink/20 bg-paper px-3 py-2";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  return (
    <form action={action} className="max-w-3xl space-y-12" noValidate>
      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-5">
          <h2 className="font-label text-xs text-stone">{group.title}</h2>
          {group.title === "Über mich" && <PortraitField initialId={settings.about_portrait_id} />}
          {group.fields.map((field) => {
            const error = state.errors?.[field.key];
            const describedBy = error ? `${field.key}-error` : undefined;
            return (
              <label key={field.key} className="block text-sm">
                {field.label}
                {field.multiline ? (
                  <textarea name={field.key} defaultValue={settings[field.key]} rows={field.key.startsWith("about_text") ? 8 : 6} className={control} aria-describedby={describedBy} aria-invalid={!!error} />
                ) : (
                  <input name={field.key} type={field.type ?? "text"} defaultValue={settings[field.key]} className={control} aria-describedby={describedBy} aria-invalid={!!error} />
                )}
                {error && (
                  <span id={describedBy} className="mt-1 block text-signal">
                    {error}
                  </span>
                )}
              </label>
            );
          })}
        </section>
      ))}
      <div className="flex items-center gap-6">
        <button type="submit" disabled={pending} className="bg-ink px-8 py-3 text-paper disabled:opacity-60">
          {pending ? "Speichere …" : "Speichern"}
        </button>
        {state.ok && (
          <p role="status" className="text-sm">
            Gespeichert.
          </p>
        )}
        {state.errors && (
          <p role="alert" className="text-sm text-signal">
            Bitte die markierten Felder prüfen.
          </p>
        )}
      </div>
    </form>
  );
}
