"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { openGalleryAction, type CodeState } from "./actions";

export function GalleryCodeForm() {
  const t = useTranslations("clients");
  const [state, action, pending] = useActionState<CodeState, FormData>(openGalleryAction, {});
  return (
    <form action={action}>
      <label htmlFor="gallery-code" className="block text-sm">
        {t("code")}
      </label>
      <input
        id="gallery-code"
        name="code"
        required
        defaultValue={state.code ?? ""}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "gallery-code-hint gallery-code-error" : "gallery-code-hint"}
        className="mt-2 block w-full border-b border-ink/60 bg-transparent py-3 font-label text-lg outline-none transition-colors focus:border-ink focus-visible:shadow-[inset_0_-2px_0_0_var(--color-ink)] aria-[invalid=true]:border-alert"
      />
      <p id="gallery-code-hint" className="mt-3 text-sm text-muted">
        {t("hint")}
      </p>
      {state.error && (
        <p id="gallery-code-error" role="alert" className="mt-3 text-sm text-alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" disabled={pending} className="mt-8 rounded-full bg-ink px-7 py-3 text-paper transition active:scale-[0.98] disabled:opacity-60">
        {t("open")}
      </button>
    </form>
  );
}
