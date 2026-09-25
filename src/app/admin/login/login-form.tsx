"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const input = "mt-1 block w-full border-b border-ink/30 bg-transparent py-2 outline-none focus:border-ink";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block text-sm">
        Benutzername
        <input name="username" autoComplete="username" required className={input} />
      </label>
      <label className="block text-sm">
        Passwort
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-signal">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full bg-ink py-3 text-paper disabled:opacity-60">
        {pending ? "Prüfe …" : "Anmelden"}
      </button>
    </form>
  );
}
