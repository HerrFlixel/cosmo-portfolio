// Gibt einen Admin-Passwort-Hash aus. Das Passwort kommt aus ADMIN_PASSWORD (nicht als Argument,
// damit es nicht in der Shell-History landet).
import { hashPassword } from "../src/lib/auth/password.ts";

const password = process.env.ADMIN_PASSWORD ?? "";
if (password.length < 12) {
  console.error("Das Passwort muss mindestens 12 Zeichen haben.");
  process.exit(1);
}
process.stdout.write(await hashPassword(password));
