"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
    >
      {pending ? "..." : "Anmelden"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAction, { error: "" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form action={formAction} className="w-full max-w-sm space-y-4 p-8 bg-bg border border-border">
        <h1 className="font-heading text-3xl tracking-wide text-center">ADMIN</h1>
        <div className="h-1 w-12 bg-primary mx-auto" />

        {state.error && (
          <p className="text-red-600 text-sm text-center">{state.error}</p>
        )}

        <input
          name="username"
          type="text"
          placeholder="Benutzername"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm tracking-nav uppercase focus:outline-none focus:border-primary"
        />
        <input
          name="password"
          type="password"
          placeholder="Passwort"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary"
        />
        <SubmitButton />
      </form>
    </div>
  );
}
