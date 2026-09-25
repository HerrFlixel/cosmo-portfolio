"use client";

import { useActionState } from "react";
import { createGalleryAction, type NewGalleryState } from "./actions";

const control = "mt-1 block w-full border border-ink/20 bg-paper px-3 py-2";

export function NewGalleryForm() {
  const [state, action, pending] = useActionState<NewGalleryState, FormData>(createGalleryAction, {});
  return (
    <form action={action} className="grid max-w-2xl gap-4 bg-mat p-6 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
      <label className="block text-sm">
        Titel
        <input name="title" required maxLength={120} className={control} placeholder="z. B. Final4 Zwickau 2026" />
      </label>
      <label className="block text-sm">
        Datum (optional)
        <input name="shootDate" type="date" className={control} />
      </label>
      <button type="submit" disabled={pending} className="bg-ink px-6 py-2 text-paper disabled:opacity-60">
        Galerie anlegen
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-signal sm:col-span-3">
          {state.error}
        </p>
      )}
    </form>
  );
}
