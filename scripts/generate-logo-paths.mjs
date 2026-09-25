// Erzeugt src/components/site/logo-paths.ts aus brand/logo-wordmark.svg und brand/logo-lockup.svg.
// Mit --check (Teil von npm run lint) wird nur geprüft, ob die Datei zu den SVGs passt.
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/components/site/logo-paths.ts";

function read(file) {
  const svg = readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
  if (!viewBox || paths.length === 0) throw new Error(`${file}: viewBox oder Pfade fehlen`);
  return { viewBox, paths };
}

const content =
  "// Generiert von scripts/generate-logo-paths.mjs aus brand/*.svg – nicht von Hand ändern (npm run logo:generate).\n" +
  `export const WORDMARK = ${JSON.stringify(read("brand/logo-wordmark.svg"), null, 2)} as const;\n\n` +
  `export const LOCKUP = ${JSON.stringify(read("brand/logo-lockup.svg"), null, 2)} as const;\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    // fehlt → veraltet
  }
  if (current !== content) {
    console.error(`${OUT} passt nicht zu brand/*.svg – npm run logo:generate ausführen.`);
    process.exit(1);
  }
  console.log("Logo-Pfade aktuell.");
} else {
  writeFileSync(OUT, content);
  console.log(`geschrieben: ${OUT}`);
}
