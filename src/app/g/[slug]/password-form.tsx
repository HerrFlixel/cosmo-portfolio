"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { unlockGalleryAction, type UnlockState } from "./actions";

export function PasswordForm({ slug }: { slug: string }) {
  const t = useTranslations("gallery");
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockGalleryAction.bind(null, slug), {});
  return (
    <form action={action} className="mt-10 w-full max-w-sm space-y-5">
      <label className="block text-left text-sm">
        {t("password")}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full border-b border-ink/30 bg-transparent py-2 font-label tracking-widest outline-none focus:border-ink"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-signal">
          {t(state.error)}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full bg-ink py-3 text-paper disabled:opacity-60">
        {t("open")}
      </button>
    </form>
  );
}
