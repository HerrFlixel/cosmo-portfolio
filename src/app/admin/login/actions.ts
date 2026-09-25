"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { adminConfig, endAdminSession, startAdminSession } from "@/lib/auth/admin";
import { verifyPassword } from "@/lib/auth/password";

export type LoginState = { error?: string };

// Einzige Server Action ohne requireAdmin(): Sie erzeugt die Anmeldung (siehe scripts/check-server-actions.mjs).
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const { success } = await getCloudflareContext().env.LOGIN_LIMITER.limit({ key: `admin-login:${ip}:${username.toLowerCase()}` });
  if (!success) return { error: "Zu viele Versuche. Bitte eine Minute warten." };

  const config = adminConfig();
  // Passwort immer prüfen, damit die Antwortzeit nicht verrät, ob der Benutzername stimmt.
  const passwordOk = await verifyPassword(password, config.passwordHash);
  if (!passwordOk || username !== config.username) return { error: "Benutzername oder Passwort falsch." };

  await startAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}
