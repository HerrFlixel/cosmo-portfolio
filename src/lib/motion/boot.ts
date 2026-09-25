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
