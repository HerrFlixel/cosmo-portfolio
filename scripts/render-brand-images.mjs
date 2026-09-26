// Rendert die Marken-Bilder aus den SVGs (nach Logo-Änderungen erneut; das Ergebnis liegt im Repo):
// src/app/apple-icon.png (180 px), src/app/favicon.ico (32 px, PNG im ICO), public/og-default.png (1200 × 630).
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const PAPER = "#f1efea";
const icon = readFileSync("src/app/icon.svg", "utf8");
const lockup = readFileSync("brand/logo-lockup.svg", "utf8");
const sized = (svg, width) => svg.replace("<svg ", `<svg width="${width}" `);

const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme: "light" });

// rounded: Papierquadrat mit transparenten Ecken. So entsteht ein RGBA-PNG, das der ICO-Decoder beim Build verlangt
// (bei durchgehend deckenden Pixeln speichert Chrome nur RGB).
async function render(svg, width, height, rounded = false) {
  await page.setViewportSize({ width, height });
  const tile = `width:${width}px;height:${height}px;display:grid;place-items:center;background:${PAPER}${rounded ? ";border-radius:22%" : ""}`;
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent"><div style="${tile}">${svg}</div></body>`);
  return page.screenshot({ type: "png", omitBackground: rounded });
}

/** ICO-Datei mit einem einzelnen PNG (von allen aktuellen Browsern unterstützt). */
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // Typ: Icon
  header.writeUInt16LE(1, 4); // ein Bild
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4); // Farbebenen
  entry.writeUInt16LE(32, 6); // Bit pro Pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

writeFileSync("src/app/apple-icon.png", await render(sized(icon, 124), 180, 180));
writeFileSync("src/app/favicon.ico", icoFromPng(await render(sized(icon, 28), 32, 32, true), 32));
writeFileSync("public/og-default.png", await render(sized(lockup, 640), 1200, 630));
await browser.close();
console.log("geschrieben: src/app/apple-icon.png, src/app/favicon.ico, public/og-default.png");
