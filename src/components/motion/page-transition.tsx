"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Seitenwechsel (Spec §6.2): pro Pfad eine eigene Grenze. Die alte Seite verlässt die Bühne (bleibt stehen, wo man
 * sie sah), die neue betritt sie mit dem Papier-Vorhang. Nur Pfadwechsel animieren (default="none"): Formulare und
 * andere Übergänge innerhalb einer Seite lösen keinen Vorhang aus.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
