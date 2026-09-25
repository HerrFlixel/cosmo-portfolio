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
