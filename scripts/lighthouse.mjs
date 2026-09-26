// Lighthouse (mobil, simuliertes 4G) mit dem Chromium von Playwright; keine zusätzliche Abhängigkeit.
// Aufruf: npm run lighthouse -- <URL> [<URL> …]  → je URL ein Aufwärm-Aufruf, dann 3 Läufe, Median.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Aufruf: npm run lighthouse -- <URL> …");
  process.exit(1);
}
mkdirSync(".lighthouse", { recursive: true });
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

for (const url of urls) {
  await fetch(url); // Worker aufwärmen: Kaltstarts werden getrennt beobachtet
  const runs = [];
  for (let run = 0; run < 3; run++) {
    const out = `.lighthouse/${new URL(url).host}${new URL(url).pathname.replaceAll("/", "_")}-${run}.json`;
    execFileSync(
      "npx",
      ["-y", "lighthouse@12", url, "--quiet", "--chrome-flags=--headless=new", "--only-categories=performance,accessibility,best-practices,seo", "--output=json", `--output-path=${out}`],
      { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: "inherit" },
    );
    runs.push(JSON.parse(readFileSync(out, "utf8")));
  }
  const score = (id) => Math.round(median(runs.map((report) => report.categories[id].score * 100)));
  const value = (id) => median(runs.map((report) => report.audits[id].numericValue));
  const phases = runs[0].audits["largest-contentful-paint-element"]?.details?.items?.[1]?.items ?? [];
  console.log(
    `${url}\n` +
      `  Performance ${score("performance")} · Barrierefreiheit ${score("accessibility")} · Best Practices ${score("best-practices")} · SEO ${score("seo")}\n` +
      `  LCP ${(value("largest-contentful-paint") / 1000).toFixed(2)} s · FCP ${(value("first-contentful-paint") / 1000).toFixed(2)} s · ` +
      `TBT ${Math.round(value("total-blocking-time"))} ms · CLS ${value("cumulative-layout-shift").toFixed(3)} · TTFB ${Math.round(value("server-response-time"))} ms\n` +
      `  LCP-Phasen (Lauf 1): ${phases.map((phase) => `${phase.phase} ${Math.round(phase.timing)} ms`).join(" · ")}`,
  );
}
