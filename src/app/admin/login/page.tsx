"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Ungültige Anmeldedaten");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8 bg-bg border border-border">
        <h1 className="font-heading text-3xl tracking-wide text-center">ADMIN</h1>
        <div className="h-1 w-12 bg-primary mx-auto" />

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
