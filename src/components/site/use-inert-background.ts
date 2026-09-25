import { useEffect, type RefObject } from "react";

/**
 * Solange ein Vollbild-Dialog offen ist, wird alles andere im <body> inert: Tab und Umschalt+Tab bleiben im Dialog,
 * Screenreader lesen den Hintergrund nicht (WCAG 2.4.3). Der Dialog muss als Portal direkt im <body> hängen.
 * Vor dem Effekt einbinden, der den Fokus zurückgibt – sonst träfe die Rückgabe noch ein inertes Element.
 */
export function useInertBackground(dialog: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const own = dialog.current;
    const others = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== own && !element.inert,
    );
    for (const element of others) element.inert = true;
    return () => {
      for (const element of others) element.inert = false;
    };
  }, [dialog, active]);
}
