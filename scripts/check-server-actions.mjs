// Jede Datei mit "use server" muss die Anmeldung selbst prüfen (requireAdmin). Das Layout schützt nur Seiten,
// Server Actions sind direkt aufrufbar. Ausnahme: die Login-Aktion, die die Anmeldung erst erzeugt.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOW = new Set(["src/app/admin/login/actions.ts"]);
const unguarded = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("._")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(entry)) {
      const source = readFileSync(path, "utf8");
      if (/^\s*["']use server["']/m.test(source) && !ALLOW.has(path) && !source.includes("requireAdmin(")) unguarded.push(path);
    }
  }
}

walk("src");
if (unguarded.length > 0) {
  console.error(`Server Actions ohne requireAdmin():\n  ${unguarded.join("\n  ")}`);
  process.exit(1);
}
console.log("Server Actions geprüft: alle geschützt.");
