# Plan 5 · Bewegung: Implementierungsplan

> **Für agentische Worker:** PFLICHT-SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Die öffentliche Seite bekommt ihre Bewegung (Spec §14, Phase 5):
- **Grundlage:** Lenis-Smooth-Scroll und GSAP.
- **Intro „Orbit“:** Der Ring zieht seine Bahn, COSMO wächst aus ihm, dann fliegt das Logo in den Kopf.
- **Überschriften:** erscheinen Zeile für Zeile.
- **Kapitel „Licht aus“:** fixiert; das Bild wird bildfüllend, das Licht geht aus und wieder an.
- **Parallaxe:** in Collage, Vorschaubildern und Kategoriespalten.
- **Lightbox:** fliegt aus dem Passepartout auf (FLIP).
- **Handy-Menü:** baut sich gestaffelt auf.
- **Fußzeile:** Der Ring im Logo kreist beim Scrollen.
- **Cursor:** Punkt, über Bildern ein Orbit-Ring.
- **Scroll-Fortschrittsring.**
- **Menüpunkte:** rollen beim Hover in die Bodoni-Kursive.
- **Seitenwechsel:** als Papier-Vorhang; das Kapitelbild fliegt dabei auf seinen Platz in der Kategorieseite.
- **Reduced Motion:** Alles ist abschaltbar, ohne Bewegung bleibt die statische Seite aus Plan 4.

**Architektur:**
- **Inline-Skript `bootMotion`:** läuft vor dem ersten Zeichnen, setzt `html.has-motion` (nur ohne „weniger Bewegung“) und merkt das Intro vor (`html[data-intro="pending"]`, erste Startseite pro Sitzung). Nur daran hängen die Bewegungs-Stile. Ohne JavaScript oder mit Reduced Motion ändert sich nichts.
- **`MotionRoot` (Client):**
  - stellt Kontext bereit (`enabled`, Lenis-Ref)
  - startet Lenis und koppelt es an GSAPs Ticker und ScrollTrigger
  - rendert `MotionEffects` (Zeilen-Reveal, Parallaxe, Ring), `Cursor` und `ScrollProgress`
- **Szenen:** Intro und Kapitel sind eigene Client-Komponenten mit `useGSAP` (automatisches Aufräumen).
- **Server-Markup:** trägt nur `data-*`-Anker (`data-reveal`, `data-speed`, `data-chapter-*`, `data-intro*`).
- **Seitenwechsel:** Reacts `ViewTransition`, im Vorab-Experiment mit Next 16 bestätigt: Navigationen starten eine View Transition. Die Animationen stehen in CSS.

**Tech-Stack:** Neu sind `gsap` 3.15.0 (inkl. ScrollTrigger und SplitText), `@gsap/react` 2.1.2 und `lenis` 1.3.26, alle exakt gepinnt. Sonst wie Plan 1–4.

**Spec:** `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`
- Betroffen: §4.4 (Bewegung), §5 (Logo, Intro „Orbit“, Timeline), §6.1 (Hero, Kapitel, Fußzeile), §6.2 (Parallaxe, Lightbox-FLIP, Übergänge), §6.4 (Mikro-Interaktionen), §6.5 (Handy), §10 (60 fps, nur `transform`/`opacity`).
- Referenz-Implementierung des Intros: `.superpowers/brainstorm/56500-1790266637/content/logo-intro.html` (`MAKERS.orbit`). Die Teile-Zuordnung und die Masken sind übernommen.

## Planreihe

| Plan | Phase | Status |
|---|---|---|
| 1 · Fundament | Setup, Datenbank, Routing, Tokens, Deploy | ✅ erledigt |
| 2 · Admin-Kern | Login, Upload-Pipeline, Portfolio, Texte | ✅ erledigt |
| 3 · Kundengalerien | Galerien, Passwort, Favoriten, Statistik, ZIP | ✅ erledigt |
| 4 · Öffentliche Seiten | Start, Kategorien, Lightbox, Über mich, Kontakt, Kunden, Pflichtseiten | ✅ erledigt |
| **5 · Bewegung** | Intro, Lenis, „Licht aus“, Parallaxe, Übergänge, Mikro-Interaktionen, Reduced Motion | **dieser Plan** |
| 6 · Launch | SEO, Performance, Barrierefreiheit, Domain-Umzug | folgt |

## Globale Vorgaben

- **Regeln aus Plan 1–4 bleiben gültig:**
  - Repo `/Volumes/CosmoDev/cosmo-website`, Branch `main`
  - `npm install --save-exact` + `npm run deps:lock` + `npm run check:lock`
  - Unit-Tests in workerd, E2E gegen `preview:e2e`
  - Kein Em-Dash in sichtbaren Texten
  - WCAG AA
- **Bewegung nur mit `html.has-motion`.** Das setzt ausschließlich `bootMotion`, und nur ohne `prefers-reduced-motion: reduce`. Ohne die Klasse gilt:
  - kein Lenis, kein Intro, kein Pin, keine Parallaxe, kein Cursor, kein Fortschrittsring, keine Menü-Rolle
  - View Transitions ohne Animation
  - Spec §4.4: „Parallaxe und ‚Licht aus‘ werden durch kurze Überblendungen ersetzt“; hier bleibt die statische Form aus Plan 4 (dunkles Band).
- **Easing und Dauer (Spec §4.4):** `expo.out` für Reveals (0,9–1,2 s), `expo.inOut` für Übergänge, `power1.inOut` für den Ring; Mikro-Interaktionen 0,3–0,6 s.
- **Performance (Spec §10):** Animiert werden `transform` und `opacity`. Ausnahmen sind klein und benannt: Hintergrundfarbe des Passepartout-Rands und Titelfarbe im Kapitel, Leuchten des Signal-Punkts.
  - Keine `scroll`-Listener: Scroll-Logik läuft über ScrollTrigger.
  - Alle GSAP-Animationen entstehen in `useGSAP` (räumt beim Seitenwechsel auf).
- **GSAP-Plugins** werden genau einmal in `src/components/motion/gsap.ts` registriert und nur von dort importiert.
- **Schichten (z-index):** Kopf 20, Fortschrittsring 25, Kategorie-Pille 30, Menü/Lightbox 50, Sprunglink 60, Cursor 70.
- **E2E-Tests:** laufen standardmäßig mit `reducedMotion: "reduce"` (stabil, Plan-1–4-Tests unverändert). Bewegungs-Tests schalten mit `test.use({ reducedMotion: "no-preference" })` zu; ihre Titel beginnen mit „Bewegung:“.
- **Sitzungs-Flag des Intros:** `sessionStorage["cosmo-intro"] = "seen"`. Tests, die das Intro nicht brauchen, setzen es per `page.addInitScript`.
- Commit-Messages im Conventional-Commits-Stil mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 👤 = Felix.

## Bewusste Abweichungen von der Spec

| Spec | Plan | Grund |
|---|---|---|
| §5.2: Intro „beim ersten Besuch pro Sitzung“ | beim ersten Aufruf der **Startseite** pro Sitzung (DE oder EN) | Die Übergabe baut die Startseite auf (Headline, Collage, Index); auf anderen Seiten gäbe es nichts aufzubauen |
| §5.2: „Klick oder Taste überspringt“ | Klick/Tipp (`pointerdown`) oder beliebige Taste | wie Spec, Tipp auf dem Handy eingeschlossen |
| §6.1: Fußzeilen-Ring „kreist langsam“ | pendelt beim Scrollen um ±10° | Eine volle Drehung der flachen Ellipse würde quer durch die Buchstaben laufen |
| §6.2: Kapitelbild fliegt „als Titelbild der Kategorieseite“ | fliegt auf seinen Platz im Bildraster der Kategorieseite (Shared Element) | Die Kategorieseite hat kein eigenes Titelbild; das Kapitelbild ist immer eines ihrer Bilder |
| §6.2: „Papier-Vorhang“ | View Transition: Die neue Seite wischt von unten über die alte | ohne eigene Ausblend-Phase; Browser ohne View Transitions wechseln sofort |
| §6.4: Cursor „ein kleiner Punkt“ | eigener Punkt ersetzt den System-Cursor nur auf Desktop (feiner Zeiger), in Textfeldern bleibt der Text-Cursor | Auf Touch-Geräten und in Formularen wäre ein Ersatz-Cursor hinderlich |
| §6.5: „Kapitel kürzer fixiert, weniger Parallaxe“ | Handy: Kapitel +110 % statt +180 % Scrollweg, Parallaxe halbiert | konkrete Werte |

## Review-Fokus

1. **Reduced Motion, kein JavaScript, Fehler im Skript:**
   - Erwartung: Alles ist sichtbar.
   - Keine hängenden unsichtbaren Überschriften (CSS-Sicherheitsnetz nach 3 s).
   - Kein festhängendes Intro (Sicherheitsnetz nach 4 s).
   - Keine Scroll-Sperre bleibt zurück.
   - *Tests: Task 1 (`bootMotion`), Task 2 (Reduced-Motion-E2E), Task 3 (Reveal-Sicherheitsnetz).*
2. **Navigation mitten in einer Animation:**
   - Startseite während des Intros verlassen; Zurück/Vor; `#arbeiten` mit Lenis; Menü oder Lightbox öffnen, während Lenis läuft.
   - Größe oder Ausrichtung während eines fixierten Kapitels ändern (`invalidateOnRefresh`).
   - Erwartung: keine doppelten ScrollTrigger, kein Scroll-Stillstand, keine verrutschten Pins.
   - *Tests: Task 1 (Lenis nach Seitenwechsel), Task 2 (Intro-Wiederholung), Task 3 (Kapitel), Task 4 (Menü/Lightbox mit Bewegung).*
3. **Leistung:**
   - Erwartung: 60 fps; nur `transform`/`opacity` (benannte Ausnahmen); kein Layout-Thrash; ScrollTrigger werden beim Seitenwechsel entfernt; genau eine Lenis-Instanz.
   - *Tests: Task 1 (eine Instanz, `html.lenis`), Task 3 (keine Pins in Reduced Motion).*
4. **Tastatur und Screenreader:**
   - Intro per Taste überspringbar.
   - Zerlegte Überschriften bleiben lesbar (SplitText setzt `aria-label`).
   - Cursor-Ersatz beeinträchtigt die Tastatur nicht; Fokusrahmen bleiben sichtbar.
   - Rolle im Menü als `aria-hidden`-Doppel.
   - *Tests: Task 2 (Taste), Task 3 (Reveal), Task 5 (Rolle, Cursor).*
5. **Touch und Handy:**
   - Kein eigener Cursor; natives Wischen/Scrollen (Lenis ohne Touch-Glättung).
   - Kürzere Pins, halbe Parallaxe; Intro-Logo passt in die Breite.
   - *Tests: Task 1 (`introStart`), Task 2 (Intro EN), Task 5 (Cursor nur mit feinem Zeiger).*

---

## Dateistruktur (neu bzw. geändert)

```
package.json / package-lock.json            # + gsap, @gsap/react, lenis (exakt); test:e2e:prod + motion.spec.ts
playwright.config.ts                         # use.reducedMotion = "reduce" (Standard)
src/app/globals.css                          # Intro-, Reveal-, Cursor-, Fortschritts-, Rollen- und View-Transition-Stile
src/app/[locale]/layout.tsx                  # bootMotion-Inline-Skript, suppressHydrationWarning, MotionRoot, ViewTransition
src/app/[locale]/page.tsx                    # HomeIntro, data-intro-Anker
src/app/[locale]/[category]/page.tsx         # svh statt dvh, Kapitelbild-ID an das Raster
src/app/[locale]/ueber-mich|kontakt|kunden|impressum|datenschutz, not-found.tsx, legal-page.tsx  # data-reveal an H1/Statement
src/lib/motion/{boot.ts,geometry.ts,logo-pieces.ts}
src/components/motion/{gsap.ts,motion-root.tsx,use-scroll-lock.ts,motion-effects.tsx,home-intro.tsx,chapter-scene.tsx,cursor.tsx,scroll-progress.tsx}
src/components/site/logo.tsx                 # Wortmarke in Teilen (Clip-Gruppen, Ring-Maske, PHOTOS), Lockup-Ring
src/components/site/{header.tsx,mobile-menu.tsx,footer.tsx,roll-text.tsx}
src/components/site/home/{hero.tsx,chapter.tsx,about-teaser.tsx}
src/components/site/category/{category-grid.tsx,lightbox.tsx}
test/unit/motion.test.ts
test/e2e/{motion.spec.ts,motion-portfolio.spec.ts}
test/e2e/public-portfolio.spec.ts            # Kapitel-Hintergrund über [data-chapter-bg]
```

---

### Task 1: Grundlage: Pakete, `bootMotion`, MotionRoot mit Lenis, Scroll-Sperre

**Dateien:**
- Erstellen:
  - `src/lib/motion/boot.ts`, `geometry.ts`, `logo-pieces.ts`, `test/unit/motion.test.ts`
  - `src/components/motion/gsap.ts`, `motion-root.tsx`, `use-scroll-lock.ts`
  - `test/e2e/motion.spec.ts`
- Ändern:
  - `package.json`, `package-lock.json`, `playwright.config.ts`
  - `src/app/[locale]/layout.tsx`
  - `src/components/site/category/lightbox.tsx`, `src/components/site/mobile-menu.tsx` (Scroll-Sperre über den Hook)

**Schnittstellen:**
- Nutzt: `WORDMARK`, `LOCKUP` (Plan 4), `useInertBackground` (Plan 4).
- Stellt bereit:
  - `bootMotion(win: BootWindow): void`, `INTRO_SEEN_KEY = "cosmo-intro"`, `type BootWindow`
  - `coverTransform(box, viewport): { x; y; scale }`, `introStart(box, viewport): { x; y; scale }`, `ringOffset(progress, circumference): number`, `parallaxDistance(speed, viewportHeight, mobile): number`, `type Box = { left; top; width; height }`
  - `LOGO_PIECES: readonly (readonly ["u" | "d", number])[]`, `LOGO_RING_INDEX = 14`, `LOGO_UPPER_CLIP`, `LOGO_LOWER_CLIP`, `LOGO_RING_MASK`, `LOGO_LETTER_DELAYS`
  - `gsap`, `ScrollTrigger`, `SplitText`, `useGSAP` (registriert)
  - `MotionRoot({ children })`, `useMotion(): { enabled: boolean; lenis: RefObject<Lenis | null> }`
  - `useScrollLock(active: boolean)`

- [ ] **Schritt 1: Pakete installieren**

```bash
npm install --save-exact gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.26
npm run deps:lock
npm run check:lock
grep -E '"(gsap|@gsap/react|lenis)"' package.json
```
Erwartet: drei exakte Versionen in `dependencies`, `check:lock` grün.

- [ ] **Schritt 2: Fehlschlagenden Unit-Test schreiben**

`test/unit/motion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LOCKUP, WORDMARK } from "@/components/site/logo-paths";
import { INTRO_SEEN_KEY, bootMotion, type BootWindow } from "@/lib/motion/boot";
import { coverTransform, introStart, parallaxDistance, ringOffset } from "@/lib/motion/geometry";
import { LOGO_PIECES, LOGO_RING_INDEX } from "@/lib/motion/logo-pieces";

function fakeWindow({ reduce = false, path = "/", seen = false, storageThrows = false } = {}) {
  const classes = new Set<string>();
  const dataset: Record<string, string | undefined> = {};
  const timers: (() => void)[] = [];
  const win: BootWindow = {
    document: { documentElement: { classList: { add: (name: string) => void classes.add(name) }, dataset } },
    matchMedia: () => ({ matches: reduce }),
    location: { pathname: path },
    sessionStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("blocked");
        return seen && key === INTRO_SEEN_KEY ? "seen" : null;
      },
    },
    setTimeout: (callback: () => void) => {
      timers.push(callback);
      return 0;
    },
  };
  return { win, classes, dataset, timers };
}

describe("bootMotion", () => {
  it("switches motion on and marks the intro on the first visit to the home page (with a safety net)", () => {
    const { win, classes, dataset, timers } = fakeWindow();
    bootMotion(win);
    expect([...classes]).toEqual(["has-motion"]);
    expect(dataset.intro).toBe("pending");
    timers[0]();
    expect(dataset.intro).toBeUndefined();
    const english = fakeWindow({ path: "/en" });
    bootMotion(english.win);
    expect(english.dataset.intro).toBe("pending");
  });

  it("does not mark the intro when it was seen or on other pages", () => {
    for (const setup of [{ seen: true }, { path: "/floorball" }, { path: "/en/about" }]) {
      const { win, classes, dataset } = fakeWindow(setup);
      bootMotion(win);
      expect(classes.has("has-motion")).toBe(true);
      expect(dataset.intro).toBeUndefined();
    }
  });

  it("does nothing with reduced motion and survives blocked storage", () => {
    const reduced = fakeWindow({ reduce: true });
    bootMotion(reduced.win);
    expect(reduced.classes.size).toBe(0);
    expect(reduced.dataset.intro).toBeUndefined();
    const blocked = fakeWindow({ storageThrows: true });
    expect(() => bootMotion(blocked.win)).not.toThrow();
    expect(blocked.classes.has("has-motion")).toBe(true);
    expect(blocked.dataset.intro).toBeUndefined();
  });
});

describe("geometry", () => {
  it("coverTransform scales a box to cover the viewport around its centre", () => {
    expect(coverTransform({ left: 100, top: 200, width: 400, height: 300 }, { width: 1200, height: 800 })).toEqual({ x: 300, y: 50, scale: 3 });
  });

  it("introStart places the header logo at half the width (max 760 px), centred at 36 % height", () => {
    const desktop = introStart({ left: 32, top: 18, width: 150, height: 37 }, { width: 1440, height: 900 });
    expect(desktop.scale).toBeCloseTo(4.8);
    expect(desktop.x).toBeCloseTo(328);
    expect(desktop.y).toBeCloseTo(217.2);
    const phone = introStart({ left: 16, top: 20, width: 104, height: 26 }, { width: 390, height: 844 });
    expect(phone.scale * 104).toBeCloseTo(195);
    expect(phone.x + 16 + phone.scale * 104).toBeLessThanOrEqual(390);
  });

  it("ringOffset closes the progress ring and clamps the progress", () => {
    expect(ringOffset(0, 100)).toBe(100);
    expect(ringOffset(0.25, 100)).toBe(75);
    expect(ringOffset(1.2, 100)).toBe(0);
    expect(ringOffset(-1, 100)).toBe(100);
  });

  it("parallaxDistance halves the distance on phones", () => {
    expect(parallaxDistance(0.2, 900, false)).toBe(180);
    expect(parallaxDistance(0.2, 900, true)).toBe(90);
  });
});

describe("logo pieces", () => {
  it("map every letter path of the wordmark to an upper or lower piece; the lockup adds PHOTOS", () => {
    expect(LOGO_PIECES).toHaveLength(WORDMARK.paths.length - 1);
    expect(LOGO_RING_INDEX).toBe(WORDMARK.paths.length - 1);
    expect(LOCKUP.paths.slice(0, WORDMARK.paths.length)).toEqual([...WORDMARK.paths]);
    expect(LOCKUP.paths.length - WORDMARK.paths.length).toBe(6);
    for (const letter of [0, 1, 2, 3, 4]) {
      expect(LOGO_PIECES.some(([kind, l]) => kind === "u" && l === letter)).toBe(true);
      expect(LOGO_PIECES.some(([kind, l]) => kind === "d" && l === letter)).toBe(true);
    }
  });
});
```

```bash
npm test
```
Erwartet: FAIL, `@/lib/motion/boot` wird nicht gefunden; die übrigen 141 Tests bleiben grün.

- [ ] **Schritt 3: Reine Helfer implementieren**

`src/lib/motion/boot.ts`:

```ts
export const INTRO_SEEN_KEY = "cosmo-intro";

export type BootWindow = {
  document: { documentElement: { classList: { add(name: string): void }; dataset: Record<string, string | undefined> } };
  matchMedia(query: string): { matches: boolean };
  location: { pathname: string };
  sessionStorage: { getItem(key: string): string | null };
  setTimeout(callback: () => void, ms: number): unknown;
};

/**
 * Läuft als Inline-Skript vor dem ersten Zeichnen (per toString eingebettet, deshalb ohne Importe und mit Literalen):
 * Bewegung an (`html.has-motion`), nur ohne „weniger Bewegung“; auf der Startseite beim ersten Besuch der Sitzung
 * das Intro vormerken. Sicherheitsnetz: Startet das Intro nicht binnen 4 s, wird die Seite wieder sichtbar.
 */
export function bootMotion(win: BootWindow): void {
  try {
    if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = win.document.documentElement;
    root.classList.add("has-motion");
    const path = win.location.pathname;
    if ((path === "/" || path === "/en") && !win.sessionStorage.getItem("cosmo-intro")) {
      root.dataset.intro = "pending";
      win.setTimeout(() => {
        if (root.dataset.intro === "pending") delete root.dataset.intro;
      }, 4000);
    }
  } catch {
    // z. B. gesperrter sessionStorage: dann ohne Intro
  }
}
```

`src/lib/motion/geometry.ts`:

```ts
export type Box = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };

/** Transform (Ursprung = Mitte der Box), mit dem eine Box den Bildschirm füllt (Kapitel „Licht aus“). */
export function coverTransform(box: Box, viewport: Size): { x: number; y: number; scale: number } {
  return {
    x: viewport.width / 2 - (box.left + box.width / 2),
    y: viewport.height / 2 - (box.top + box.height / 2),
    scale: Math.max(viewport.width / box.width, viewport.height / box.height),
  };
}

/** Startlage des Kopf-Logos im Intro (Ursprung oben links): halbe Breite (max. 760 px), mittig auf 36 % Höhe. */
export function introStart(logo: Box, viewport: Size): { x: number; y: number; scale: number } {
  const width = Math.min(viewport.width * 0.5, 760);
  const scale = width / logo.width;
  return { x: (viewport.width - width) / 2 - logo.left, y: viewport.height * 0.36 - (logo.height * scale) / 2 - logo.top, scale };
}

/** Strichversatz eines Fortschrittsrings: 0 = leer, 1 = geschlossen. */
export function ringOffset(progress: number, circumference: number): number {
  return circumference * (1 - Math.min(1, Math.max(0, progress)));
}

/** Parallaxe-Weg in px: Tempo × Bildschirmhöhe, auf dem Handy halbiert (Spec §6.5). */
export function parallaxDistance(speed: number, viewportHeight: number, mobile: boolean): number {
  return speed * viewportHeight * (mobile ? 0.5 : 1);
}
```

`src/lib/motion/logo-pieces.ts`:

```ts
/**
 * Zuordnung der Wortmarken-Pfade (brand/logo-wordmark.svg, gleiche Reihenfolge wie WORDMARK.paths) für das Intro
 * „Orbit“ (Spec §5.1/5.2): "u" = oberhalb, "d" = unterhalb der Ring-Mittellinie; Zahl = Buchstabe C O S M O (0–4).
 * Übernommen aus der Referenz .superpowers/brainstorm/…/logo-intro.html. Pfad 14 ist der Ring.
 */
export const LOGO_PIECES = [
  ["u", 0], ["d", 0], ["u", 0],
  ["u", 1], ["d", 1],
  ["u", 2], ["d", 2],
  ["u", 3], ["d", 3], ["d", 3], ["d", 3], ["u", 3],
  ["u", 4], ["d", 4],
] as const satisfies readonly (readonly ["u" | "d", number])[];

export const LOGO_RING_INDEX = 14;

// Ring-Mittellinie: Grenze, aus der die Buchstaben wachsen.
const LINE = "20,50 50,49.7 80,49.2 110,47.9 140,44.9 170,41 200,35.3 220,31";
export const LOGO_UPPER_CLIP = `-6,0 226,0 226,30 ${LINE.split(" ").reverse().join(" ")} -6,50.3`;
export const LOGO_LOWER_CLIP = `-6,50.3 ${LINE} 226,30 226,90 -6,90`;

/** Strich entlang des Rings (Maske): Über stroke-dashoffset „zieht der Ring seine Bahn“. */
export const LOGO_RING_MASK = "M15,40 C4,43 1,47 10,49 C40,51.5 90,49.5 140,45 C175,41.5 205,36 211,32 C214,29 208,26 201,25";

/** Start der Buchstaben C, O, S, M, O in Sekunden (Spec §5.2). */
export const LOGO_LETTER_DELAYS = [0.5, 0.63, 0.73, 0.83, 0.97] as const;
```

```bash
npm test
```
Erwartet: 32 Testdateien, 149 Tests PASS.

- [ ] **Schritt 4: Fehlschlagenden E2E-Test schreiben**

In `playwright.config.ts` die Zeile `use: { baseURL, locale: "de-DE" },` ersetzen durch:

```ts
  // Standard ohne Bewegung (stabil); Bewegungs-Tests schalten mit test.use({ reducedMotion: "no-preference" }) zu.
  use: { baseURL, locale: "de-DE", reducedMotion: "reduce" },
```

`test/e2e/motion.spec.ts` (ohne Anmeldung, läuft auch gegen die Produktion):

```ts
import { expect, test } from "@playwright/test";

const skipIntro = () => sessionStorage.setItem("cosmo-intro", "seen");

test.describe("mit Bewegung", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Lenis und has-motion sind aktiv, auch nach einem Seitenwechsel", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const html = page.locator("html");
    await expect(html).toHaveClass(/has-motion/);
    await expect(html).toHaveClass(/lenis/);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).click();
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect(html).toHaveClass(/lenis/);
    expect(await page.evaluate(() => document.querySelectorAll("html.lenis").length)).toBe(1);
  });
});

test("Bewegung: mit „weniger Bewegung“ weder has-motion noch Lenis", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("html")).not.toHaveClass(/has-motion|lenis/);
});
```

```bash
npm run test:e2e -- motion.spec.ts
```
Erwartet: Der Test „mit Bewegung“ schlägt fehl (keine Klasse `has-motion`); der Reduced-Motion-Test besteht.

- [ ] **Schritt 5: GSAP, MotionRoot, Scroll-Sperre, Layout**

`src/components/motion/gsap.ts`:

```ts
"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Einmal registrieren; alle Bewegungs-Komponenten importieren von hier.
gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export { gsap, ScrollTrigger, SplitText, useGSAP };
```

`src/components/motion/motion-root.tsx`:

```tsx
"use client";

import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { gsap, ScrollTrigger } from "./gsap";

type Motion = { enabled: boolean; lenis: RefObject<Lenis | null> };

const MotionContext = createContext<Motion>({ enabled: false, lenis: { current: null } });

export const useMotion = () => useContext(MotionContext);

const subscribe = () => () => {};
// bootMotion setzt die Klasse vor dem ersten Zeichnen; der Server kennt sie nicht (Snapshot false).
const readMotion = () => document.documentElement.classList.contains("has-motion");

/** Bewegung für die öffentliche Seite (Spec §4.4): Lenis nur mit Bewegung, gekoppelt an GSAP und ScrollTrigger. */
export function MotionRoot({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readMotion, () => false);
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (!enabled) return;
    const instance = new Lenis({ autoRaf: false, anchors: true });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // Läuft das Intro schon (es startet vor diesem Effekt), bleibt das Scrollen gesperrt.
    if (document.documentElement.dataset.intro === "running") instance.stop();
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis.current = null;
    };
  }, [enabled]);

  // Neue Seite: oben beginnen (außer bei Sprungzielen wie #arbeiten) und ScrollTrigger neu vermessen.
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (!window.location.hash) lenis.current?.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  }, [pathname]);

  return <MotionContext value={{ enabled, lenis }}>{children}</MotionContext>;
}
```

`src/components/motion/use-scroll-lock.ts`:

```ts
"use client";

import { useEffect } from "react";
import { useMotion } from "./motion-root";

/** Sperrt das Scrollen, solange `active` gilt: mit Lenis über stop/start, sonst über overflow. */
export function useScrollLock(active: boolean) {
  const { lenis } = useMotion();
  useEffect(() => {
    if (!active) return;
    const instance = lenis.current;
    instance?.stop();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      instance?.start();
    };
  }, [active, lenis]);
}
```

In `src/components/site/category/lightbox.tsx`:
- Import ergänzen: `import { useScrollLock } from "@/components/motion/use-scroll-lock";`
- direkt nach `useInertBackground(dialog, true);` ergänzen: `useScrollLock(true);`
- im ersten `useEffect` die Zeilen `const overflow = document.body.style.overflow;`, `document.body.style.overflow = "hidden";` und `document.body.style.overflow = overflow;` entfernen und den Kommentar auf „Auslöser merken, bevor der Fokus in die Lightbox springt, und beim Schließen zurückgeben.“ kürzen.

In `src/components/site/mobile-menu.tsx`:
- Import ergänzen: `import { useScrollLock } from "@/components/motion/use-scroll-lock";`
- direkt nach `useInertBackground(dialog, open);` ergänzen: `useScrollLock(open);`
- im `useEffect` die Zeilen `const overflow = document.body.style.overflow;`, `document.body.style.overflow = "hidden";` und `document.body.style.overflow = overflow;` entfernen.

In `src/app/[locale]/layout.tsx`:
- Importe ergänzen:

```tsx
import { MotionRoot } from "@/components/motion/motion-root";
import { bootMotion } from "@/lib/motion/boot";
```

- oberhalb von `export default async function LocaleLayout` ergänzen:

```tsx
// Vor dem ersten Zeichnen: Bewegung an/aus und Intro vormerken (Funktion ohne Importe, als Inline-Skript).
const BOOT_SCRIPT = `(${bootMotion.toString()})(window);`;
```

- `<html lang={locale} className={fontVariables}>` ersetzen durch `<html lang={locale} className={fontVariables} suppressHydrationWarning>` (das Skript ändert Klasse und `data-intro` vor der Hydration).
- direkt nach `<body className="flex min-h-dvh flex-col">` einfügen:

```tsx
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
```

- `<NextIntlClientProvider>` … `</NextIntlClientProvider>`: den Inhalt (Sprunglink, Kopf, Inhalt, Fußzeile) in `<MotionRoot>` … `</MotionRoot>` einschließen.

- [ ] **Schritt 6: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 149 PASS, E2E alle grün, darunter die 2 neuen Bewegungs-Tests. Alle Plan-1–4-Tests laufen unverändert mit Reduced Motion.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "feat(motion): gsap, lenis and boot script with reduced-motion guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Logo in Teilen und Intro „Orbit“

**Dateien:**
- Erstellen: `src/components/motion/home-intro.tsx`
- Ändern:
  - `src/components/site/logo.tsx`, `header.tsx`, `mobile-menu.tsx`, `footer.tsx`
  - `src/components/site/home/hero.tsx`, `src/app/[locale]/page.tsx`
  - `src/app/globals.css`, `test/e2e/motion.spec.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`LOGO_*`, `introStart`, `INTRO_SEEN_KEY`, `gsap`, `SplitText`, `useGSAP`, `useMotion`), `WORDMARK`/`LOCKUP`.
- Stellt bereit:
  - `Wordmark({ id, className?, decorative?, withPhotos? })` mit `data-piece`, `data-letter`, `data-ring-mask`, `data-logo-ring`, `data-logo-photos`
  - `Lockup({ className?, decorative?, spinRing? })` mit `data-logo-ring-spin`
  - Anker `data-site-logo`, `data-intro="nav|headline|collage|index|rest"`, `data-intro-hide`
  - `HomeIntro()`
  - Zustand `html[data-intro="pending|running|done"]`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests anhängen**

An `test/e2e/motion.spec.ts` anhängen:

```ts
test.describe("Intro", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Intro „Orbit“ läuft beim ersten Besuch und nur einmal pro Sitzung", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "running");
    await expect(page.locator("[data-site-logo] [data-logo-photos]")).toBeAttached();
    await expect(html).toHaveAttribute("data-intro", "done", { timeout: 6000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => page.locator("[data-site-logo]").evaluate((element) => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await page.reload();
    await expect(html).not.toHaveAttribute("data-intro", /pending|running/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Bewegung: eine Taste überspringt das Intro (auch auf Englisch)", async ({ page }) => {
    await page.goto("/en");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "running");
    await page.keyboard.press("Space");
    await expect(html).toHaveAttribute("data-intro", "done", { timeout: 1000 });
  });
});

test("Bewegung: mit „weniger Bewegung“ kein Intro, Logo und Headline sofort sichtbar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-site-logo]")).toBeVisible();
});
```

```bash
npm run test:e2e -- motion.spec.ts
```
Erwartet: Die zwei Intro-Tests schlagen fehl, denn `data-intro` bleibt „pending“ bzw. es gibt kein `[data-site-logo]`. Der Reduced-Motion-Test besteht.

- [ ] **Schritt 2: Wortmarke in Teilen**

`src/components/site/logo.tsx` komplett ersetzen:

```tsx
import { LOGO_LOWER_CLIP, LOGO_PIECES, LOGO_RING_INDEX, LOGO_RING_MASK, LOGO_UPPER_CLIP } from "@/lib/motion/logo-pieces";
import { LOCKUP, WORDMARK } from "./logo-paths";

type Props = { className?: string; decorative?: boolean };

const label = (decorative: boolean) => (decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": "Cosmo Photos" });

/**
 * COSMO mit Ring (Kopf, Menü), aufgebaut wie im Intro „Orbit“ (Spec §5.1/5.2): obere und untere Buchstabenteile in je
 * einer Clip-Gruppe (Grenze = Ring-Mittellinie), der Ring hinter einer Strich-Maske. In Ruhe sieht es aus wie das SVG.
 * `id` muss pro Seite eindeutig sein; `withPhotos` legt PHOTOS unsichtbar darunter (nur fürs Intro).
 */
export function Wordmark({ id, className, decorative = false, withPhotos = false }: Props & { id: string; withPhotos?: boolean }) {
  const pieces = (kind: "u" | "d") =>
    LOGO_PIECES.map(([pieceKind, letter], index) =>
      pieceKind === kind ? <path key={index} d={WORDMARK.paths[index]} data-piece={pieceKind} data-letter={letter} /> : null,
    );
  return (
    <svg viewBox={WORDMARK.viewBox} className={className} fill="currentColor" overflow="visible" {...label(decorative)}>
      <defs>
        <clipPath id={`${id}-u`} clipPathUnits="userSpaceOnUse">
          <polygon points={LOGO_UPPER_CLIP} />
        </clipPath>
        <clipPath id={`${id}-d`} clipPathUnits="userSpaceOnUse">
          <polygon points={LOGO_LOWER_CLIP} />
        </clipPath>
        <mask id={`${id}-ring`} maskUnits="userSpaceOnUse" x="-10" y="10" width="240" height="60">
          <path data-ring-mask d={LOGO_RING_MASK} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
        </mask>
      </defs>
      <g clipPath={`url(#${id}-u)`}>{pieces("u")}</g>
      <g clipPath={`url(#${id}-d)`}>{pieces("d")}</g>
      <path d={WORDMARK.paths[LOGO_RING_INDEX]} mask={`url(#${id}-ring)`} data-logo-ring />
      {withPhotos && (
        <g data-logo-photos opacity="0">
          {LOCKUP.paths.slice(WORDMARK.paths.length).map((d, index) => (
            <path key={index} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Voller Lockup mit PHOTOS (Fußzeile). `spinRing`: der Ring pendelt beim Scrollen (Spec §6.1). */
export function Lockup({ className, decorative = false, spinRing = false }: Props & { spinRing?: boolean }) {
  return (
    <svg viewBox={LOCKUP.viewBox} className={className} fill="currentColor" {...label(decorative)}>
      {LOCKUP.paths.map((d, index) => (
        <path key={index} d={d} {...(spinRing && index === LOGO_RING_INDEX ? { "data-logo-ring-spin": "" } : {})} />
      ))}
    </svg>
  );
}
```

Aufrufe anpassen:
- `src/components/site/header.tsx`: Den Logo-Link `<Link href="/" aria-label={t("home")} className="block w-[clamp(104px,10vw,150px)]">` ersetzen durch `<Link href="/" aria-label={t("home")} data-site-logo data-intro-hide className="block w-[clamp(104px,10vw,150px)]">`. Darin `<Wordmark decorative className="block h-auto w-full" />` ersetzen durch `<Wordmark id="logo-header" withPhotos decorative className="block h-auto w-full" />`. Das `<nav aria-label={t("main")} …>` bekommt zusätzlich `data-intro="nav" data-intro-hide`.
- `src/components/site/mobile-menu.tsx`: `<Wordmark decorative className="block h-auto w-full" />` ersetzen durch `<Wordmark id="logo-menu" decorative className="block h-auto w-full" />`. Der Menü-Knopf (`<button ref={opener} …>`) bekommt zusätzlich `data-intro="nav" data-intro-hide`.
- `src/components/site/footer.tsx`: `<Lockup className="block h-auto w-[min(640px,84vw)]" />` ersetzen durch `<Lockup spinRing className="block h-auto w-[min(640px,84vw)]" />`.

- [ ] **Schritt 3: Anker der Startseite und Intro-Stil**

In `src/components/site/home/hero.tsx`:
- `<h1 id="hero-title" className=` → `<h1 id="hero-title" data-intro="headline" data-intro-hide className=`
- `<div className="grid grid-cols-2 gap-4 lg:relative lg:col-span-6 lg:block lg:h-[min(68vh,700px)]">` → `<div data-intro="collage" data-intro-hide className="grid grid-cols-2 gap-4 lg:relative lg:col-span-6 lg:block lg:h-[min(68vh,700px)]">`
- `<nav id="arbeiten" aria-label={t("home.index")} className=` → `<nav id="arbeiten" aria-label={t("home.index")} data-intro="index" data-intro-hide className=`

`src/app/[locale]/page.tsx`:
- Import ergänzen: `import { HomeIntro } from "@/components/motion/home-intro";`
- den Rumpf von `<main>` ersetzen durch:

```tsx
    <main>
      <HomeIntro />
      <HomeHero headline={headline} heroes={home.heroes} counts={home.counts} locale={lang} />
      {/* Alles unter dem Hero erscheint im Intro zuletzt. */}
      <div data-intro="rest" data-intro-hide>
        {home.chapters
          .filter((chapter) => chapter.image)
          .map((chapter, index) => (
            <ChapterSection key={chapter.category} chapter={chapter} index={index} locale={lang} />
          ))}
        <AboutTeaser settings={settings} locale={lang} />
        <Closing settings={settings} />
      </div>
    </main>
```

In `src/app/globals.css` am Ende anfügen:

```css
/* Intro „Orbit“ (Spec §5.2): Bis das Intro startet, sind Logo und Startseite unsichtbar (bootMotion, Sicherheitsnetz 4 s). */
html[data-intro="pending"] [data-intro-hide] {
  visibility: hidden;
}
```

- [ ] **Schritt 4: Intro**

`src/components/motion/home-intro.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { INTRO_SEEN_KEY } from "@/lib/motion/boot";
import { introStart } from "@/lib/motion/geometry";
import { LOGO_LETTER_DELAYS } from "@/lib/motion/logo-pieces";
import { gsap, SplitText, useGSAP } from "./gsap";
import { useMotion } from "./motion-root";

// Übergabe (Spec §5.2): PHOTOS geht, das Logo fliegt in den Kopf, die Startseite baut sich auf; ≈ 3,2 s steht sie.
const HANDOVER = 2.15;

/**
 * Intro „Orbit“ beim ersten Besuch der Startseite pro Sitzung: Der Ring zieht seine Bahn, C-O-S-M-O wachsen aus ihm,
 * PHOTOS setzt sich, dann fliegt das Kopf-Logo – dasselbe Element, per FLIP – an seinen Platz. Klick, Tipp oder Taste
 * springen ans Ende. Ohne Vormerkung (bootMotion) passiert nichts.
 */
export function HomeIntro() {
  const { lenis } = useMotion();
  const released = useRef(false);

  useGSAP(() => {
    const root = document.documentElement;
    const logo = document.querySelector<HTMLElement>("[data-site-logo]");
    const svg = logo?.querySelector("svg");
    const mask = svg?.querySelector<SVGPathElement>("[data-ring-mask]");
    if (root.dataset.intro !== "pending" || !logo || !svg || !mask) return;

    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "seen");
    } catch {
      // ohne Speicher läuft das Intro eben bei jedem Besuch
    }
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    lenis.current?.stop();

    const photos = svg.querySelector<SVGGElement>("[data-logo-photos]");
    const headline = document.querySelector<HTMLElement>("[data-intro='headline']");
    const split = headline ? SplitText.create(headline, { type: "lines", mask: "lines" }) : null;
    const collage = gsap.utils.toArray<HTMLElement>("[data-intro='collage'] > *");
    const nav = gsap.utils.toArray<HTMLElement>("nav[data-intro='nav'] > *, button[data-intro='nav']");
    const late = gsap.utils.toArray<HTMLElement>("[data-intro='index'], [data-intro='rest']");
    const from = introStart(logo.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
    const length = mask.getTotalLength();

    // Startzustände sofort (vor dem nächsten Zeichnen), erst dann sichtbar schalten.
    gsap.set(logo, { x: from.x, y: from.y, scale: from.scale, transformOrigin: "0 0" });
    gsap.set(mask, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length });
    gsap.set(svg.querySelectorAll("[data-piece='u']"), { y: 44 });
    gsap.set(svg.querySelectorAll("[data-piece='d']"), { y: -34 });
    if (photos) {
      gsap.set(photos, { opacity: 1 });
      gsap.set(photos.children, { opacity: 0, y: 4 });
    }
    gsap.set(split?.lines ?? [], { yPercent: 115 });
    gsap.set(collage, { opacity: 0, yPercent: 10 });
    gsap.set(nav, { opacity: 0, y: -8 });
    gsap.set(late, { opacity: 0 });
    root.dataset.intro = "running";

    // Ab hier steht die Startseite: Scrollen frei, Zustand „done“ (auch beim Überspringen).
    const release = () => {
      if (released.current) return;
      released.current = true;
      root.dataset.intro = "done";
      root.style.overflow = overflow;
      lenis.current?.start();
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    const finish = () => {
      release();
      split?.revert();
      gsap.set(logo, { clearProps: "transform" });
      if (photos) gsap.set(photos, { opacity: 0 });
    };

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(mask, { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" }, 0.1);
    LOGO_LETTER_DELAYS.forEach((at, letter) => {
      tl.to(svg.querySelectorAll(`[data-letter='${letter}']`), { y: 0, duration: 0.95, ease: "expo.out" }, at);
    });
    if (photos) {
      tl.to(photos.children, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.055 }, 1.25);
      tl.to(photos.children, { opacity: 0, duration: 0.25, stagger: 0.02 }, HANDOVER);
    }
    tl.to(logo, { x: 0, y: 0, scale: 1, duration: 1.05, ease: "expo.inOut" }, HANDOVER)
      .to(split?.lines ?? [], { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 }, HANDOVER + 0.5)
      .to(collage, { opacity: 1, yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.12 }, HANDOVER + 0.55)
      .to(nav, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.04 }, HANDOVER + 0.7)
      .to(late, { opacity: 1, duration: 0.6 }, HANDOVER + 0.9)
      .call(release, undefined, HANDOVER + 1.05);

    const skip = () => tl.progress(1);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      tl.kill();
      finish();
    };
  }, []);

  return null;
}
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 149 PASS, E2E alle grün, darunter die 3 neuen Intro-Tests. Die Rahmen-, Routing- und Design-Tests finden Logo und Links unverändert (die Wortmarke sieht in Ruhe aus wie vorher).

- [ ] **Schritt 6: Sichtprüfung**

Mit laufender Vorschau (`npm run preview:e2e` im Hintergrund) Screenshots per Playwright mit `reducedMotion: "no-preference"` auf `/` bei 1440×900 nach 0,6 s, 1,4 s, 2,4 s und 4 s (neuer Kontext, also frische Sitzung). Erwartet:
- Der Ring zieht sich von links auf.
- Die Buchstaben wachsen aus dem Ring, PHOTOS erscheint darunter.
- Das Logo fliegt nach oben links.
- Die Headline baut sich Zeile für Zeile auf.
- Danach sieht der Kopf pixelgleich aus wie ohne Intro.

Befunde, die davon abweichen, vor dem Commit beheben.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "feat(motion): logo in pieces and the Orbit intro with FLIP handover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Zeilen-Reveal, Parallaxe, Kapitel „Licht aus“, Fußzeilen-Ring

**Dateien:**
- Erstellen: `src/components/motion/motion-effects.tsx`, `src/components/motion/chapter-scene.tsx`, `test/e2e/motion-portfolio.spec.ts`
- Ändern:
  - `src/components/motion/motion-root.tsx` (rendert `MotionEffects`), `src/app/globals.css`
  - `src/components/site/home/hero.tsx`, `chapter.tsx`, `about-teaser.tsx`
  - `src/app/[locale]/ueber-mich/page.tsx`, `kontakt/page.tsx`, `kunden/page.tsx`, `[category]/page.tsx`, `not-found.tsx`, `src/components/site/legal-page.tsx`
  - `test/e2e/motion.spec.ts`, `test/e2e/public-portfolio.spec.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`gsap`, `ScrollTrigger`, `SplitText`, `useGSAP`, `useMotion`, `coverTransform`, `parallaxDistance`), Task 2 (`data-intro*`, `data-logo-ring-spin`), Plan 4 (`seedCategory`, `newContext`, `Passepartout`).
- Stellt bereit:
  - `MotionEffects()` (Reveal, Parallaxe, Ring; pro Pfad neu)
  - `ChapterScene({ children })` mit Ankern `data-chapter-stage`, `data-chapter-bg`, `data-chapter-frame`, `data-chapter-dim`, `data-chapter-title`, `data-chapter-dot`
  - Anker `data-reveal="lines"` (Zeilen: Klasse `reveal-line`), `data-speed="<Tempo>"`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests schreiben**

An `test/e2e/motion.spec.ts` anhängen:

```ts
test.describe("Überschriften und Fußzeile", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Überschriften erscheinen Zeile für Zeile hinter einer Maske", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const lines = page.locator("[data-reveal] .reveal-line");
    await expect(lines.first()).toBeAttached();
    await expect
      .poll(() => lines.first().evaluate((element) => getComputedStyle(element).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Bewegung: der Ring im Fußzeilen-Logo pendelt beim Scrollen", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const ring = page.locator("footer [data-logo-ring-spin]");
    const angle = () => ring.evaluate((element) => element.getAttribute("transform") ?? getComputedStyle(element).transform);
    const before = await angle();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(angle).not.toBe(before);
  });
});

test("Bewegung: mit „weniger Bewegung“ werden Überschriften nicht zerlegt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator(".reveal-line")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
```

`test/e2e/motion-portfolio.spec.ts` (braucht Testdaten, daher nicht in der Produktion):

```ts
import { expect, test } from "@playwright/test";
import { newContext } from "./helpers/galleries";
import { seedCategory } from "./helpers/portfolio";

test.describe.configure({ mode: "serial" });
test.use({ reducedMotion: "no-preference" });

// Eigene Kategorie für Bewegungs-Tests (Floorball ist Kapitel 1, unabhängig von anderen Testdaten).
test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await seedCategory(page, "floorball", [{ role: "chapter" }, { role: "chapter_preview" }, { role: "chapter_preview", portrait: true }, {}, { portrait: true }, {}]);
  await admin.close();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("cosmo-intro", "seen"));
});

const opacity = (locator: import("@playwright/test").Locator) => async () => Number(await locator.evaluate((element) => getComputedStyle(element).opacity));

test("Bewegung: Kapitel „Licht aus“ dunkelt beim Scrollen ab und wird wieder hell", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator('[data-chapter="floorball"] [data-chapter-stage]');
  const bg = stage.locator("[data-chapter-bg]");
  await expect.poll(opacity(bg)).toBeLessThan(0.1);
  const top = await stage.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const height = await page.evaluate(() => window.innerHeight);
  await page.evaluate((y) => window.scrollTo(0, y), top + height * 0.8);
  await expect.poll(opacity(bg), { timeout: 5000 }).toBeGreaterThan(0.9);
  await expect(page.locator(".pin-spacer")).not.toHaveCount(0);
  await page.evaluate((y) => window.scrollTo(0, y), top + height * 2.2);
  await expect.poll(opacity(bg), { timeout: 5000 }).toBeLessThan(0.1);
});

test("Bewegung: mit „weniger Bewegung“ bleibt das Kapitel ein statisches dunkles Band", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: "de-DE", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const bg = page.locator('[data-chapter="floorball"] [data-chapter-bg]');
  expect(await opacity(bg)()).toBe(1);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await context.close();
});
```

```bash
npm run test:e2e -- motion.spec.ts motion-portfolio.spec.ts
```
Erwartet:
- Rot: Reveal, Ring und „Licht aus“ (keine `reveal-line`, kein Pin, kein `[data-chapter-stage]`).
- Grün: die beiden Reduced-Motion-Tests. Der Kapitel-Test mit Reduced Motion schlägt bis Schritt 4 fehl, weil es `[data-chapter-bg]` noch nicht gibt.

- [ ] **Schritt 2: MotionEffects und Stile**

`src/components/motion/motion-effects.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { parallaxDistance } from "@/lib/motion/geometry";
import { gsap, SplitText, useGSAP } from "./gsap";

/**
 * Bewegung an Ankern im Server-Markup, pro Seite neu aufgebaut (useGSAP räumt beim Pfadwechsel auf):
 * - [data-reveal="lines"]: Zeilen erscheinen hinter einer Maske, wenn sie sichtbar werden (Spec §6.4).
 * - [data-speed]: Parallaxe, Weg = Tempo × Bildschirmhöhe, auf dem Handy halbiert (Spec §6.1/6.2/6.5).
 * - [data-logo-ring-spin]: Ring im Fußzeilen-Logo pendelt beim Scrollen um ±10° (Spec §6.1).
 */
export function MotionEffects() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const intro = document.documentElement.dataset.intro;

      for (const element of gsap.utils.toArray<HTMLElement>("[data-reveal='lines']")) {
        element.style.animation = "none";
        // Die Startseiten-Headline gehört während des Intros dem Intro.
        if ((intro === "pending" || intro === "running") && element.closest("[data-intro-hide]")) {
          gsap.set(element, { visibility: "visible" });
          continue;
        }
        SplitText.create(element, {
          type: "lines",
          mask: "lines",
          linesClass: "reveal-line",
          autoSplit: true,
          onSplit(self) {
            gsap.set(element, { visibility: "visible" });
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: "expo.out",
              stagger: 0.08,
              scrollTrigger: { trigger: element, start: "top 88%", once: true },
            });
          },
        });
      }

      for (const element of gsap.utils.toArray<HTMLElement>("[data-speed]")) {
        const distance = () => parallaxDistance(Number(element.dataset.speed), window.innerHeight, mobile);
        gsap.fromTo(
          element,
          { y: () => distance() / 2 },
          { y: () => -distance() / 2, ease: "none", scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } },
        );
      }

      for (const ring of gsap.utils.toArray<SVGPathElement>("[data-logo-ring-spin]")) {
        gsap.fromTo(
          ring,
          { rotation: -10, transformOrigin: "50% 50%" },
          { rotation: 10, ease: "none", scrollTrigger: { trigger: ring.closest("footer") ?? ring, start: "top bottom", end: "bottom bottom", scrub: 1 } },
        );
      }
    },
    { dependencies: [pathname] },
  );

  return null;
}
```

In `src/components/motion/motion-root.tsx`:
- Import ergänzen: `import { MotionEffects } from "./motion-effects";`
- `return <MotionContext value={{ enabled, lenis }}>{children}</MotionContext>;` ersetzen durch:

```tsx
  return (
    <MotionContext value={{ enabled, lenis }}>
      {children}
      {enabled && <MotionEffects />}
    </MotionContext>
  );
```

In `src/app/globals.css` am Ende anfügen:

```css
/* Zeilen-Reveal (Spec §6.4): bis zum Zerlegen unsichtbar; das Sicherheitsnetz zeigt nach 3 s alles (z. B. Skriptfehler). */
.has-motion [data-reveal] {
  visibility: hidden;
  animation: reveal-fallback 0s 3s forwards;
}
@keyframes reveal-fallback {
  to {
    visibility: visible;
  }
}
```

- [ ] **Schritt 3: Anker für Reveal und Parallaxe**

`data-reveal="lines"` ergänzen an:
- `src/components/site/home/hero.tsx`: `<h1 id="hero-title" data-intro="headline" data-intro-hide` → zusätzlich `data-reveal="lines"`
- `src/components/site/home/about-teaser.tsx`: am `<p className="font-display pb-[0.08em] …">` (Statement)
- `src/app/[locale]/ueber-mich/page.tsx`: am Statement `<p className="font-display mt-6 …">`
- `src/app/[locale]/kontakt/page.tsx`, `src/app/[locale]/kunden/page.tsx`, `src/components/site/legal-page.tsx`, `src/app/[locale]/not-found.tsx`: jeweils an der `<h1>`
- `src/app/[locale]/[category]/page.tsx`: an der `<h1 className="font-sport …">`

Parallaxe in der Hero-Collage: In `src/components/site/home/hero.tsx` die Konstante `COLLAGE` um Tempi ergänzen und jedes Passepartout in einen Wrapper legen (der Wrapper trägt Lage und Tempo; Intro und Parallaxe animieren ihn):

```tsx
const COLLAGE_SPEED = ["0.08", "0.18", "0.12"];
```

```tsx
            {heroes.map((image, index) => (
              <div key={image.id} className={COLLAGE[index]} data-speed={COLLAGE_SPEED[index]}>
                <Passepartout
                  image={image}
                  alt={altText(image, locale, t("home.photoAlt", { category: t(`categories.${image.category}`), number: index + 1 }))}
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  priority={index === 0}
                />
              </div>
            ))}
```

- [ ] **Schritt 4: Kapitel-Szene**

`src/components/motion/chapter-scene.tsx`:

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { coverTransform, type Box } from "@/lib/motion/geometry";
import { gsap, useGSAP } from "./gsap";
import { useMotion } from "./motion-root";

/** Lage relativ zur Bühne über offset* (unabhängig von laufenden Transforms). */
function boxWithin(element: HTMLElement, container: HTMLElement): Box {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== container) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight };
}

/**
 * Kapitel „Einlauf“ (Spec §6.1). Mit Bewegung wird die Bühne fixiert:
 * 0–40 % Licht aus, das Kapitelbild wächst aus dem Passepartout bildfüllend;
 * 40–70 % Titel und Zähler erscheinen, der Signal-Punkt glimmt;
 * 70–100 % Licht wieder an, das Bild kehrt in sein Passepartout zurück.
 * Ohne Bewegung bleibt das statische dunkle Band aus dem Server-Markup.
 */
export function ChapterScene({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const { enabled } = useMotion();

  useGSAP(
    () => {
      const root = stage.current;
      if (!enabled || !root) return;
      const find = (selector: string) => root.querySelector<HTMLElement>(selector)!;
      const bg = find("[data-chapter-bg]");
      const frame = find("[data-chapter-frame]");
      const photoWindow = find(".passepartout-window");
      const mat = find(".passepartout-mat");
      const dim = find("[data-chapter-dim]");
      const title = find("[data-chapter-title]");
      const dot = find("[data-chapter-dot]");
      const mobile = window.matchMedia("(max-width: 767px)").matches;

      // Das Bildfenster (nicht der Rand) soll den Bildschirm füllen: Ursprung = Mitte des Fensters im Rahmen.
      const cover = () => coverTransform(boxWithin(photoWindow, root), { width: root.clientWidth, height: window.innerHeight });
      const origin = () => {
        const inner = boxWithin(photoWindow, root);
        const outer = boxWithin(frame, root);
        return `${inner.left - outer.left + inner.width / 2}px ${inner.top - outer.top + inner.height / 2}px`;
      };

      gsap.set(title.querySelector("h2"), { mixBlendMode: "normal" });
      gsap.set(frame, { transformOrigin: origin() });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: mobile ? "+=110%" : "+=180%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: () => gsap.set(frame, { transformOrigin: origin() }),
        },
      });
      tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0)
        .fromTo(frame, { x: 0, y: 0, scale: 1 }, { x: () => cover().x, y: () => cover().y, scale: () => cover().scale, duration: 0.4, ease: "power2.inOut" }, 0)
        .fromTo(mat, { backgroundColor: "rgba(255, 255, 255, 1)" }, { backgroundColor: "rgba(255, 255, 255, 0)", duration: 0.2 }, 0.2)
        .set(mat, { boxShadow: "none" }, 0.3)
        .fromTo(dim, { opacity: 0 }, { opacity: 0.45, duration: 0.15 }, 0.4)
        .fromTo(title, { opacity: 0, yPercent: 30, color: "#eceae4" }, { opacity: 1, yPercent: 0, duration: 0.2, ease: "expo.out" }, 0.42)
        .fromTo(dot, { boxShadow: "0 0 0 0 rgba(255, 61, 46, 0)" }, { boxShadow: "0 0 16px 5px rgba(255, 61, 46, 0.75)", duration: 0.12 }, 0.5)
        .to(dim, { opacity: 0, duration: 0.15 }, 0.7)
        .to(bg, { opacity: 0, duration: 0.3 }, 0.7)
        .to(frame, { x: 0, y: 0, scale: 1, duration: 0.3, ease: "power2.inOut" }, 0.7)
        .to(title, { color: "#141414", duration: 0.3 }, 0.7)
        .to(dot, { boxShadow: "0 0 0 0 rgba(255, 61, 46, 0)", duration: 0.15 }, 0.85)
        .to(mat, { backgroundColor: "rgba(255, 255, 255, 1)", duration: 0.2 }, 0.8)
        .set(mat, { clearProps: "boxShadow" }, 0.95);
    },
    { dependencies: [enabled], scope: stage },
  );

  return (
    <div ref={stage} data-chapter-stage className="relative flex min-h-[100svh] items-center overflow-hidden text-hall-ink">
      {children}
    </div>
  );
}
```

`src/components/site/home/chapter.tsx`:
- Import ergänzen: `import { ChapterScene } from "@/components/motion/chapter-scene";`
- `const PREVIEW_OFFSETS = …` ergänzen um `const PREVIEW_SPEEDS = ["0.06", "0.16", "0.04", "0.2", "0.1"];`
- den Block `<div className="bg-hall text-hall-ink">` … bis zu dessen schließendem `</div>` (vor `{chapter.previews.length > 0 && (`) ersetzen durch:

```tsx
      <ChapterScene>
        {/* Licht aus: statisch immer dunkel, mit Bewegung blendet die Szene dieses Band ein und aus. */}
        <span data-chapter-bg aria-hidden="true" className="absolute inset-0 bg-hall" />
        <div className="relative mx-auto grid w-full max-w-[1400px] items-end gap-10 px-4 py-20 md:grid-cols-12 md:gap-8 md:px-8 md:py-32">
          <div data-chapter-frame className={`relative ${flip ? "md:col-span-7 md:col-start-6 md:row-start-1" : "md:col-span-7"}`}>
            <Passepartout image={chapter.image} alt={alt(chapter.image, 1)} sizes="(min-width: 768px) 56vw, 100vw" />
            <span data-chapter-dim aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hall opacity-0" />
          </div>
          {/* Lange Titel ragen über das Kapitelbild statt aus der Seite; die Differenz-Mischung hält sie auf Schwarz und Weiß lesbar. */}
          <div data-chapter-title className={flip ? "md:col-span-5 md:col-start-1 md:row-start-1" : "md:col-span-5 md:flex md:flex-col md:items-end"}>
            <h2 id={`chapter-${chapter.category}`} className="relative z-10 whitespace-nowrap font-sport text-[clamp(3.5rem,11vw,10.5rem)] mix-blend-difference">
              {name}
            </h2>
            <p className="mt-5 flex items-center gap-3 font-label text-sm">
              <span data-chapter-dot aria-hidden="true" className="size-2 rounded-full bg-signal" />
              <span className="opacity-70">
                ({chapter.count}
                <span className="sr-only"> {t("home.photos")}</span>)
              </span>
            </p>
          </div>
        </div>
      </ChapterScene>
```

- In der Vorschau-Liste `<li key={image.id} className={PREVIEW_OFFSETS[i]}>` ersetzen durch `<li key={image.id} className={PREVIEW_OFFSETS[i]} data-speed={PREVIEW_SPEEDS[i]}>`.

In `test/e2e/public-portfolio.spec.ts` (Startseiten-Test) `chapter.locator(".bg-hall")` ersetzen durch `chapter.locator("[data-chapter-bg]")`: Im Rahmen gibt es jetzt zwei `bg-hall`-Flächen (Band und Abdunklung).

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 149 PASS, E2E alle grün, darunter die neuen Tests (Reveal, Ring, beide Kapitel-Tests). Plan-4-Tests (Reduced Motion) unverändert grün.

- [ ] **Schritt 6: Sichtprüfung**

Screenshots mit `reducedMotion: "no-preference"`, Intro übersprungen, bei 1440×900 und 390×844:
- Startseite mit Kapitel Floorball: vor, in der Mitte (dunkel, Bild bildfüllend, Titel lesbar) und nach der fixierten Strecke.
- `/ueber-mich` beim Laden.
- Das Kapitel darf nie seitlich überlaufen oder springen.

Abweichungen vor dem Commit beheben.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "feat(motion): line reveals, parallax, lights-out chapters and swinging footer ring

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Kategorieseite in Bewegung, Lightbox-FLIP, Handy-Menü gestaffelt

**Dateien:**
- Ändern:
  - `src/components/site/category/category-grid.tsx`, `lightbox.tsx`
  - `src/app/[locale]/[category]/page.tsx` (`svh`), `src/components/site/mobile-menu.tsx`
  - `test/e2e/motion-portfolio.spec.ts`, `test/e2e/motion.spec.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`gsap`, `useGSAP`, `useMotion`), Task 3 (`data-speed` über `MotionEffects`).
- Stellt bereit:
  - `PublicLightbox` erhält `origin?: Box | null` (Rahmen des angeklickten Bildfensters)
  - Menü-Einträge tragen `data-menu-item`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests anhängen**

An `test/e2e/motion-portfolio.spec.ts` anhängen:

```ts
test("Bewegung: Spalten der Kategorieseite laufen unterschiedlich schnell", async ({ page }) => {
  await page.goto("/floorball");
  const columns = page.locator("main [data-speed]");
  await expect(columns).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect
    .poll(() => columns.evaluateAll((elements) => elements.map((element) => new DOMMatrix(getComputedStyle(element).transform).m42)))
    .not.toEqual([0, 0]);
});

test("Bewegung: Lightbox fliegt aus dem Passepartout auf und schließt normal", async ({ page }) => {
  await page.goto("/floorball");
  await page.getByRole("button", { name: "Floorball, Foto 1" }).click();
  const image = page.getByTestId("lightbox").locator("img");
  const scaleNow = () => image.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  expect(await scaleNow()).not.toBeCloseTo(1, 2);
  await expect.poll(scaleNow).toBeCloseTo(1, 2);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("lightbox")).toBeHidden();
});
```

An `test/e2e/motion.spec.ts` anhängen:

```ts
test.describe("Handy-Menü", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 390, height: 844 } });

  test("Bewegung: Handy-Menü baut sich gestaffelt auf und sperrt das Scrollen", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.getByRole("button", { name: "Menü" }).click();
    const items = page.locator("#mobile-menu [data-menu-item]");
    await expect(items.first()).toBeVisible();
    expect(Number(await items.last().evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(1);
    await expect.poll(async () => Number(await items.last().evaluate((element) => getComputedStyle(element).opacity))).toBe(1);
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
  });
});
```

```bash
npm run test:e2e -- motion.spec.ts motion-portfolio.spec.ts
```
Erwartet: Die drei neuen Tests schlagen fehl (keine Spalten-Parallaxe, keine FLIP-Skalierung, keine `data-menu-item`).

- [ ] **Schritt 2: Spalten-Tempo, FLIP-Ursprung, `svh`**

In `src/components/site/category/category-grid.tsx`:
- `const COLUMN_OFFSETS = ["", "lg:mt-[24vh]", "lg:mt-[10vh]"];` ergänzen um:

```tsx
// Unterschiedliches Scrolltempo pro Spalte (Spec §6.2); unter lg lösen sich die Spalten auf, dann wirkt es nicht.
const COLUMN_SPEEDS: (string | undefined)[] = [undefined, "0.18", "0.08"];
```

- Import ergänzen: `import type { Box } from "@/lib/motion/geometry";`
- `const [open, setOpen] = useState<number | null>(null);` ersetzen durch:

```tsx
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<Box | null>(null);
```

- das Spalten-`<div key={c} className={`contents lg:flex …`}>` bekommt zusätzlich `data-speed={COLUMN_SPEEDS[c]}`.
- den Button-`onClick` ersetzen durch:

```tsx
                onClick={(event) => {
                  const frame = event.currentTarget.querySelector(".passepartout-window")?.getBoundingClientRect();
                  setOrigin(frame ? { left: frame.left, top: frame.top, width: frame.width, height: frame.height } : null);
                  setOpen(index);
                }}
```

- `<PublicLightbox images={images} index={open} onIndex={setOpen} onClose={close} />` ersetzen durch `<PublicLightbox images={images} index={open} origin={origin} onIndex={setOpen} onClose={close} />`.

In `src/app/[locale]/[category]/page.tsx`: `h-[100dvh]` → `h-[100svh]` und `-mt-[45dvh]` → `-mt-[45svh]` (kein Springen, wenn die Handy-Leiste einklappt).

- [ ] **Schritt 3: Lightbox-FLIP**

In `src/components/site/category/lightbox.tsx`:
- Importe ergänzen:

```tsx
import { gsap, useGSAP } from "@/components/motion/gsap";
import { useMotion } from "@/components/motion/motion-root";
import type { Box } from "@/lib/motion/geometry";
```

- `type Props` um `origin?: Box | null;` ergänzen und die Signatur zu `export function PublicLightbox({ images, index, origin = null, onIndex, onClose }: Props) {` ändern.
- nach `const dialog = useRef<HTMLDivElement>(null);` ergänzen:

```tsx
  const photo = useRef<HTMLImageElement>(null);
  const { enabled } = useMotion();

  // Öffnen (Spec §6.2): Das Bild fliegt aus seinem Passepartout (FLIP), das Hallenschwarz blendet auf.
  useGSAP(() => {
    const element = photo.current;
    if (!enabled || !element || !dialog.current) return;
    gsap.from(dialog.current, { backgroundColor: "rgba(11, 11, 12, 0)", duration: 0.5, ease: "power1.out" });
    const target = element.getBoundingClientRect();
    if (!origin || target.width === 0) return;
    gsap.from(element, {
      x: origin.left + origin.width / 2 - (target.left + target.width / 2),
      y: origin.top + origin.height / 2 - (target.top + target.height / 2),
      scale: origin.width / target.width,
      duration: 0.7,
      ease: "expo.inOut",
    });
  }, []);
```

- am `<img key={image.id} …>` ergänzen: `ref={photo}`, `width={image.width}`, `height={image.height}` (Seitenverhältnis steht vor dem Laden fest, damit das Ziel des FLIP stimmt).

- [ ] **Schritt 4: Handy-Menü gestaffelt**

In `src/components/site/mobile-menu.tsx`:
- Importe ergänzen:

```tsx
import { gsap, useGSAP } from "@/components/motion/gsap";
import { useMotion } from "@/components/motion/motion-root";
```

- nach `useScrollLock(open);` ergänzen:

```tsx
  const { enabled } = useMotion();

  // Vollbild-Menü mit gestaffeltem Reveal (Spec §6.5).
  useGSAP(() => {
    if (!open || !enabled || !dialog.current) return;
    gsap.from(dialog.current.querySelectorAll("[data-menu-item]"), { yPercent: 60, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 });
  }, { dependencies: [open, enabled] });
```

- `data-menu-item` ergänzen an: jedem `<li>` der Kategorienliste, jedem `<li>` der Seitenliste und am `LocaleSwitch` im Menü (per `className`-Nachbar-Prop geht nicht, deshalb: den `LocaleSwitch` in `<div data-menu-item className="mt-auto">` einschließen und `mt-auto` von seiner `className` entfernen).

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 149 PASS, E2E alle grün. Die Plan-4-Tests für Lightbox (Tastatur, Wischen, Fokus) und Menü laufen mit Reduced Motion unverändert.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(motion): column parallax, lightbox FLIP, staggered mobile menu, svh on category pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cursor, Scroll-Fortschritt, Menü-Rolle

**Dateien:**
- Erstellen: `src/components/motion/cursor.tsx`, `src/components/motion/scroll-progress.tsx`, `src/components/site/roll-text.tsx`
- Ändern:
  - `src/components/motion/motion-root.tsx`, `src/components/site/header.tsx`, `src/app/globals.css`
  - `test/e2e/motion.spec.ts`, `test/e2e/motion-portfolio.spec.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`gsap`, `ScrollTrigger`, `useGSAP`, `ringOffset`).
- Stellt bereit:
  - `Cursor()` mit `data-cursor`, `data-state="default|link|image|text"`, `data-visible`; setzt `html.has-cursor`
  - `ScrollProgress()` mit `data-scroll-progress`
  - `RollText({ children })` mit Klassen `roll`, `roll-a`, `roll-b`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests anhängen**

An `test/e2e/motion.spec.ts` anhängen:

```ts
test.describe("Mikro-Interaktionen", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Cursor-Punkt folgt der Maus, wird über Links größer und ersetzt den System-Cursor", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.mouse.move(400, 300);
    const cursor = page.locator("[data-cursor]");
    await expect(cursor).toHaveAttribute("data-visible", "");
    await expect
      .poll(() => cursor.evaluate((element) => { const matrix = new DOMMatrix(getComputedStyle(element).transform); return [Math.round(matrix.e), Math.round(matrix.f)]; }))
      .toEqual([400, 300]);
    await expect(page.locator("html")).toHaveClass(/has-cursor/);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).hover();
    await expect(cursor).toHaveAttribute("data-state", "link");
  });

  test("Bewegung: Scroll-Fortschritt schließt sich bis zum Seitenende", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const ring = page.locator("[data-scroll-progress] circle").last();
    const offset = async () => Number.parseFloat(await ring.evaluate((element) => getComputedStyle(element).strokeDashoffset));
    expect(await offset()).toBeGreaterThan(90);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(offset).toBeLessThan(2);
  });

  test("Bewegung: Menüpunkte rollen beim Hover in die Bodoni-Kursive", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const link = page.getByRole("banner").getByRole("link", { name: "Kontakt" });
    const italic = link.locator(".roll-b");
    await link.hover();
    await expect.poll(() => italic.evaluate((element) => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(await italic.evaluate((element) => getComputedStyle(element).fontStyle)).toBe("italic");
  });
});

test("Bewegung: mit „weniger Bewegung“ kein eigener Cursor, kein Fortschrittsring, keine Rolle", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("[data-cursor]")).toHaveCount(0);
  await expect(page.locator("[data-scroll-progress]")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Kontakt" }).locator(".roll-b")).toBeHidden();
});
```

An `test/e2e/motion-portfolio.spec.ts` anhängen:

```ts
test("Bewegung: Cursor wird über Bildern zum Orbit-Ring", async ({ page }) => {
  await page.goto("/floorball");
  await page.mouse.move(10, 10);
  await page.getByRole("button", { name: "Floorball, Foto 1" }).hover();
  await expect(page.locator("[data-cursor]")).toHaveAttribute("data-state", "image");
});
```

```bash
npm run test:e2e -- motion.spec.ts motion-portfolio.spec.ts
```
Erwartet: Die vier Tests mit Bewegung schlagen fehl (kein `[data-cursor]`, kein `[data-scroll-progress]`, keine `.roll-b`). Der Reduced-Motion-Test besteht schon jetzt; nach der Umsetzung sichert er ab, dass ohne Bewegung weder Cursor noch Ring noch Rolle erscheinen.

- [ ] **Schritt 2: Cursor und Fortschrittsring**

`src/components/motion/cursor.tsx`:

```tsx
"use client";

import { useRef, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "./gsap";

const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Cursor (Spec §6.4, nur Desktop mit Bewegung): Punkt, über Links etwas größer, über Bildern ein Orbit-Ring wie im Logo. */
export function Cursor() {
  const fine = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = dot.current;
      if (!fine || !element) return;
      const root = document.documentElement;
      root.classList.add("has-cursor");
      const toX = gsap.quickTo(element, "x", { duration: 0.35, ease: "power3" });
      const toY = gsap.quickTo(element, "y", { duration: 0.35, ease: "power3" });
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        toX(event.clientX);
        toY(event.clientY);
        element.dataset.visible = "";
      };
      const over = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        element.dataset.state = !target
          ? "default"
          : target.closest("input, textarea, select")
            ? "text"
            : target.closest(".passepartout")
              ? "image"
              : target.closest("a, button, label, [role='button']")
                ? "link"
                : "default";
      };
      const leave = () => {
        delete element.dataset.visible;
      };
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerover", over);
      root.addEventListener("pointerleave", leave);
      return () => {
        window.removeEventListener("pointermove", move);
        document.removeEventListener("pointerover", over);
        root.removeEventListener("pointerleave", leave);
        root.classList.remove("has-cursor");
      };
    },
    { dependencies: [fine] },
  );

  if (!fine) return null;
  return <div ref={dot} aria-hidden="true" data-cursor="" data-state="default" className="cursor" />;
}
```

`src/components/motion/scroll-progress.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ringOffset } from "@/lib/motion/geometry";
import { ScrollTrigger, useGSAP } from "./gsap";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Scroll-Fortschritt (Spec §6.4): winziger Ring unten rechts, der sich schließt; Differenz-Mischung für Hell und Dunkel. */
export function ScrollProgress() {
  const circle = useRef<SVGCircleElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const element = circle.current;
      if (!element) return;
      const update = (progress: number) => {
        element.style.strokeDashoffset = String(ringOffset(progress, CIRCUMFERENCE));
      };
      const trigger = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => update(self.progress) });
      update(trigger.progress);
    },
    { dependencies: [pathname] },
  );

  return (
    <svg aria-hidden="true" data-scroll-progress viewBox="0 0 40 40" className="pointer-events-none fixed bottom-5 right-5 z-[25] size-9 -rotate-90 text-white mix-blend-difference">
      <circle cx="20" cy="20" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle ref={circle} cx="20" cy="20" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE} />
    </svg>
  );
}
```

In `src/components/motion/motion-root.tsx`:
- Importe ergänzen: `import { Cursor } from "./cursor";` und `import { ScrollProgress } from "./scroll-progress";`
- `{enabled && <MotionEffects />}` ersetzen durch:

```tsx
      {enabled && (
        <>
          <MotionEffects />
          <ScrollProgress />
          <Cursor />
        </>
      )}
```

- [ ] **Schritt 3: Menü-Rolle**

`src/components/site/roll-text.tsx`:

```tsx
import type { ReactNode } from "react";

/** Menüpunkt, der beim Hover in die kursive Bodoni rollt (Spec §6.4); das Doppel ist für Screenreader verborgen. */
export function RollText({ children }: { children: ReactNode }) {
  return (
    <span className="roll">
      <span className="roll-a">{children}</span>
      <span aria-hidden="true" className="roll-b">
        {children}
      </span>
    </span>
  );
}
```

In `src/components/site/header.tsx`:
- Import ergänzen: `import { RollText } from "./roll-text";`
- Die Texte der Navigation einwickeln: `{t("work")}` → `<RollText>{t("work")}</RollText>`, ebenso `{t("about")}`, `{t("contact")}`, `{t("clients")}` und beim Shop-Link `{t("shop")}` → `<RollText>{t("shop")}</RollText>` (der Pfeil bleibt außerhalb).

In `src/app/globals.css` am Ende anfügen:

```css
/* Cursor (Spec §6.4): nur Desktop mit Bewegung; Schicht 70. Differenz-Mischung: dunkel auf Papier, hell auf Hallenschwarz. */
html.has-cursor,
html.has-cursor * {
  cursor: none;
}
html.has-cursor :is(input, textarea, select) {
  cursor: text;
}
.cursor {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 70;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 999px;
  background: #fff;
  mix-blend-mode: difference;
  pointer-events: none;
  opacity: 0;
  transition:
    width 0.45s var(--ease-expo-out),
    height 0.45s var(--ease-expo-out),
    margin 0.45s var(--ease-expo-out),
    rotate 0.45s var(--ease-expo-out),
    background-color 0.3s,
    opacity 0.3s;
}
.cursor[data-visible] {
  opacity: 1;
}
.cursor[data-state="link"] {
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
}
/* Über Bildern: flacher, geneigter Ring wie der Orbit im Logo */
.cursor[data-state="image"] {
  width: 76px;
  height: 30px;
  margin: -15px 0 0 -38px;
  background: transparent;
  border: 1.5px solid #fff;
  rotate: -12deg;
}
.cursor[data-state="text"] {
  opacity: 0;
}

/* Menü-Rolle (Spec §6.4): nur mit Bewegung; ohne bleibt es beim Unterstrich. */
.roll {
  display: inline-grid;
}
.roll > span {
  grid-area: 1 / 1;
}
.roll-b {
  display: none;
}
.has-motion .roll {
  overflow: hidden;
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
}
.has-motion .roll > span {
  transition: transform 0.5s var(--ease-expo-out);
}
.has-motion .roll-b {
  display: block;
  font-family: var(--font-bodoni), ui-serif, Georgia, serif;
  font-style: italic;
  font-variation-settings: "opsz" 96;
  transform: translateY(110%);
}
.has-motion :is(a, button):is(:hover, :focus-visible) .roll-a {
  transform: translateY(-110%);
}
.has-motion :is(a, button):is(:hover, :focus-visible) .roll-b {
  transform: none;
}
.has-motion a:has(> .roll) {
  background-image: none;
}
```

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 149 PASS, E2E alle grün, darunter die neuen Tests; die Rahmen-Tests finden die Kopf-Links unverändert per Namen (das kursive Doppel ist `aria-hidden`).

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(motion): orbit cursor, scroll progress ring and rolling menu items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Seitenwechsel als View Transition

**Dateien:**
- Ändern:
  - `src/app/[locale]/layout.tsx`, `src/components/site/home/chapter.tsx`, `src/components/site/category/category-grid.tsx`, `src/app/[locale]/[category]/page.tsx`, `src/app/globals.css`
  - `test/e2e/motion.spec.ts`, `test/e2e/motion-portfolio.spec.ts`

**Schnittstellen:**
- Nutzt: Reacts `ViewTransition` (im mitgelieferten React von Next 16 exportiert; im Vorab-Experiment löst eine Navigation `document.startViewTransition` aus). Ferner Task 3 (Kapitel-Rahmen) und Task 4 (`CategoryGrid`).
- Stellt bereit:
  - View-Transition-Klassen `page` (Papier-Vorhang) und `chapter-flight` (Kapitelbild)
  - Namen `chapter-<kategorie>`
  - `CategoryGrid({ images, category, chapterImageId })`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests anhängen**

An `test/e2e/motion.spec.ts` anhängen:

```ts
const countTransitions = () => {
  const counter = window as unknown as { transitions: number };
  counter.transitions = 0;
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((...args: Parameters<typeof start>) => {
    counter.transitions++;
    return start(...args);
  }) as typeof document.startViewTransition;
};
const transitions = () => (window as unknown as { transitions: number }).transitions;

test.describe("Seitenwechsel", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Seitenwechsel läuft als View Transition (Papier-Vorhang)", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.evaluate(countTransitions);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).click();
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect.poll(() => page.evaluate(transitions)).toBeGreaterThan(0);
  });
});
```

An `test/e2e/motion-portfolio.spec.ts` anhängen:

```ts
test("Bewegung: das Kapitelbild fliegt beim Wechsel auf die Kategorieseite (ohne Fehler)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => {
    const counter = window as unknown as { transitions: number };
    counter.transitions = 0;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      counter.transitions++;
      return start(...args);
    }) as typeof document.startViewTransition;
  });
  await page.locator('[data-chapter="floorball"]').getByRole("link", { name: "Alle Floorball-Bilder" }).click();
  await expect(page).toHaveURL(/\/floorball$/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { transitions: number }).transitions)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
```

```bash
npm run test:e2e -- motion.spec.ts motion-portfolio.spec.ts
```
Erwartet: Beide neuen Tests schlagen fehl (0 View Transitions).

- [ ] **Schritt 2: View Transitions einbauen**

In `src/app/[locale]/layout.tsx`:
- `import type { ReactNode } from "react";` ersetzen durch `import { ViewTransition, type ReactNode } from "react";`
- `{children}` (im Inhaltsbereich) ersetzen durch `<ViewTransition default="page">{children}</ViewTransition>`

In `src/components/site/home/chapter.tsx`:
- Import ergänzen: `import { ViewTransition } from "react";`
- `<Passepartout image={chapter.image} … />` im Kapitel-Rahmen einschließen:

```tsx
            <ViewTransition name={`chapter-${chapter.category}`} share="chapter-flight">
              <Passepartout image={chapter.image} alt={alt(chapter.image, 1)} sizes="(min-width: 768px) 56vw, 100vw" />
            </ViewTransition>
```

In `src/components/site/category/category-grid.tsx`:
- Import ergänzen: `import { ViewTransition } from "react";` (zusammen mit den vorhandenen React-Importen)
- Signatur ändern zu `export function CategoryGrid({ images, category, chapterImageId }: { images: LightboxImage[]; category: string; chapterImageId: string | null }) {`
- im Button das `<Passepartout … />` ersetzen durch:

```tsx
                {image.id === chapterImageId ? (
                  // Ziel des Kapitelbild-Flugs von der Startseite (Spec §6.2).
                  <ViewTransition name={`chapter-${category}`} share="chapter-flight">
                    <Passepartout image={image} alt={image.alt} sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 86vw" />
                  </ViewTransition>
                ) : (
                  <Passepartout image={image} alt={image.alt} sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 86vw" />
                )}
```

In `src/app/[locale]/[category]/page.tsx`: `<CategoryGrid images={images} />` ersetzen durch

```tsx
<CategoryGrid images={images} category={category} chapterImageId={content.nav.find((item) => item.category === category)?.cover?.id ?? null} />
```

In `src/app/globals.css` am Ende anfügen:

```css
/* Seitenwechsel (Spec §6.2): Papier-Vorhang – die neue Seite wischt von unten über die alte. */
::view-transition-old(.page) {
  animation: none;
}
::view-transition-new(.page) {
  animation: page-curtain 0.7s var(--ease-expo-in-out) both;
}
@keyframes page-curtain {
  from {
    clip-path: inset(100% 0 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
/* Das Kapitelbild fliegt von der Startseite auf seinen Platz in der Kategorieseite. */
::view-transition-group(.chapter-flight) {
  animation-duration: 0.8s;
  animation-timing-function: var(--ease-expo-in-out);
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

- [ ] **Schritt 3: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint und Typen grün (`ViewTransition` ist in `@types/react` deklariert), Unit 149 PASS, E2E alle grün, darunter die 2 neuen Tests.

- [ ] **Schritt 4: Sichtprüfung**

Mit Bewegung und übersprungenem Intro: auf `/` zum Floorball-Kapitel, dann „Alle Floorball-Bilder“ anklicken. Screenshots bei 150 ms, 400 ms und 900 ms zeigen:
- Das Kapitelbild fliegt auf seinen Platz im Raster.
- Die neue Seite wischt von unten herein.

Ein Wechsel über den Kopf (Über mich → Kontakt) zeigt nur den Vorhang.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(motion): paper-curtain page transitions and the chapter image flight

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Vorschau, Produktion, Sichtprüfung durch Felix

**Dateien:**
- Ändern: `README.md`, `package.json` (`test:e2e:prod`)

**Schnittstellen:**
- Nutzt: alles aus Task 1–6.
- Stellt bereit: Vorschau und Produktion mit Bewegung live.

Die Reihenfolge ist fest: **Vorschau → abschließendes Review → Push**. Laut Plan-Freigabe ist das erlaubt; der Push auf `main` ist das Produktions-Deployment.

- [ ] **Schritt 1: README und Produktions-Tests**

In `README.md` am Ende anfügen:

```markdown
### Bewegung

- Aktiv nur ohne „Bewegung reduzieren“ (Systemeinstellung). Ein Inline-Skript (`src/lib/motion/boot.ts`) setzt dann `html.has-motion`; alle Bewegungs-Stile hängen daran.
- Das Intro „Orbit“ läuft beim ersten Aufruf der Startseite pro Browser-Sitzung (`sessionStorage["cosmo-intro"]`). Zum erneuten Ansehen: neues privates Fenster, oder in den Entwicklertools `sessionStorage.removeItem("cosmo-intro")`.
- E2E-Tests laufen standardmäßig mit reduzierter Bewegung; Bewegungs-Tests stehen in `motion.spec.ts` und `motion-portfolio.spec.ts`.
```

In `package.json` das Skript `test:e2e:prod` ersetzen durch (neu: `motion.spec.ts`, `|Bewegung`):

```json
"test:e2e:prod": "bash scripts/e2e-deployed.sh prod --no-deps routing.spec.ts design-system.spec.ts admin-auth.spec.ts gallery-public.spec.ts site-frame.spec.ts motion.spec.ts -g \"ohne Anmeldung|gefälscht|Clickjacking|Robust|Deutsch|Englisch|Spracherkennung|Nicht lokalisierte|Tokens|Schriften|unbekannte Galerie|Rahmen|Bewegung\""
```

```bash
npm run lint && npm test
git add README.md package.json
git commit -m "docs: motion notes and production motion smoke tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Schritt 2: Vorschau deployen und komplett testen**

```bash
npm run check:lock
npm run deploy:preview
npm run test:e2e:preview
```
Erwartet: `check:lock` grün (neue Pakete mit npm 10.9.2 im Lockfile), Deployment ok, alle E2E-Tests grün.

- [ ] **Schritt 3: Abschließendes Review, dann Push (= Produktion)**

Zuerst das abschließende Branch-Review laut executing-plans bzw. subagent-driven-development samt Fix-Runde, dann:

```bash
git push origin main
U="https://cosmo-web.felix-vatterodt.workers.dev/"
for i in $(seq 1 60); do
  if curl -s "$U" | grep -q "cosmo-intro"; then echo "LIVE nach ~$((i*10))s"; break; fi
  sleep 10
done
npm run test:e2e:prod
```
Erwartet: `LIVE` (das Boot-Skript mit dem Intro-Schlüssel ist ausgeliefert), `test:e2e:prod` grün (inkl. „Bewegung“).

- [ ] **Schritt 4: 👤 Felix schaut es sich an**

1. Neues privates Fenster → https://cosmo-web.felix-vatterodt.workers.dev: Intro, Scrollen durch die Kapitel, eine Kategorie öffnen, Lightbox, Menüpunkte überfahren.
2. Auf dem Handy dasselbe (Menü, Wischen in der Lightbox).
3. In den Systemeinstellungen „Bewegung reduzieren“ einschalten und neu laden: Die Seite ist ruhig und vollständig.

Rückmeldungen (Tempo, Kapitel, Titel-Mischung über Fotos) als Feinschliff im Anschluss.
