// Erzeugt src/components/site/logo-paths.ts und src/app/icon.svg aus brand/logo-wordmark.svg und brand/logo-lockup.svg.
// Mit --check (Teil von npm run lint) wird nur geprüft, ob beide Dateien zu den SVGs passen.
import { readFileSync, writeFileSync } from "node:fs";

const PATHS_OUT = "src/components/site/logo-paths.ts";
const ICON_OUT = "src/app/icon.svg";
// Index des Rings in der Wortmarke (wie LOGO_RING_INDEX in src/lib/motion/logo-pieces.ts); 0–2 sind die Teile des C.
const RING = 14;

function read(file) {
  const svg = readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
  if (!viewBox || paths.length === 0) throw new Error(`${file}: viewBox oder Pfade fehlen`);
  return { viewBox, paths };
}

const wordmark = read("brand/logo-wordmark.svg");
const lockup = read("brand/logo-lockup.svg");

const paths =
  "// Generiert von scripts/generate-logo-paths.mjs aus brand/*.svg – nicht von Hand ändern (npm run logo:generate).\n" +
  `export const WORDMARK = ${JSON.stringify(wordmark, null, 2)} as const;\n\n` +
  `export const LOCKUP = ${JSON.stringify(lockup, null, 2)} as const;\n`;

// Favicon (Spec §5.1): „C“ mit Ringausschnitt – die drei Teile des C und der Ring, auf das C zugeschnitten
// (C: x 17,7–50,7, y 16,1–65,4; der Ring beginnt bei x 3,6). Im dunklen Browser-Tab hell.
const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 14 53 53">' +
  "<style>path{fill:#141414}@media (prefers-color-scheme:dark){path{fill:#eceae4}}</style>" +
  [0, 1, 2, RING].map((index) => `<path d="${wordmark.paths[index]}"/>`).join("") +
  "</svg>\n";

const outputs = [
  [PATHS_OUT, paths],
  [ICON_OUT, icon],
];

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([file, content]) => {
    try {
      return readFileSync(file, "utf8") !== content;
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`${stale.map(([file]) => file).join(", ")} passt nicht zu brand/*.svg – npm run logo:generate ausführen.`);
    process.exit(1);
  }
  console.log("Logo-Pfade und Favicon aktuell.");
} else {
  for (const [file, content] of outputs) {
    writeFileSync(file, content);
    console.log(`geschrieben: ${file}`);
  }
}
