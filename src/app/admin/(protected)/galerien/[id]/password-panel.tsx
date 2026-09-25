"use client";

import { useActionState, useTransition } from "react";
import { regeneratePasswordAction, setPasswordAction, type ActionState } from "./actions";

export function PasswordPanel({ galleryId, password }: { galleryId: string; password: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setPasswordAction.bind(null, galleryId), {});
  const [regenerating, startRegenerate] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Passwort:{" "}
        <span data-testid="gallery-password" className="font-label">
          {password ?? "unbekannt – bitte neu setzen"}
        </span>
      </p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          Neues Passwort
          <input name="password" minLength={8} maxLength={64} className="mt-1 block border border-ink/20 bg-paper px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="border border-ink px-4 py-2 text-sm">
          Passwort setzen
        </button>
        <button
          type="button"
          disabled={regenerating}
          className="text-sm underline"
          onClick={() => startRegenerate(async () => void (await regeneratePasswordAction(galleryId)))}
        >
          Neues Passwort erzeugen
        </button>
      </form>
      {state.error && <p role="alert" className="text-sm text-signal">{state.error}</p>}
      <p className="text-xs text-stone">Nach einer Änderung müssen Kunden das neue Passwort eingeben.</p>
    </div>
  );
}
