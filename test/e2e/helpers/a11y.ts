import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// WCAG 2.2 AA (Spec §10). Das Turnstile-Iframe ist Fremdinhalt von Cloudflare und bleibt außen vor.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).exclude("iframe[src*='challenges.cloudflare.com']").analyze();
  const found = results.violations.map(
    (violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
  expect(found, label).toEqual([]);
}
