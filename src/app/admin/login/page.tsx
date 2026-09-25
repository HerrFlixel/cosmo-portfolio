import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-label text-xs text-stone">Cosmo Photos</p>
        <h1 className="font-display mt-3 text-5xl">Anmelden</h1>
        <LoginForm />
      </div>
    </main>
  );
}
