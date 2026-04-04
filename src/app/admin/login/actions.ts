"use server";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });
    return { error: "", success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Ungültige Anmeldedaten", success: false };
    }
    return { error: "Ungültige Anmeldedaten", success: false };
  }
}
