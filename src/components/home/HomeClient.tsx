"use client";

import { useEffect, useState } from "react";
import IntroOverlay from "./IntroOverlay";
import HomeStage, { PanelProject } from "./HomeStage";

const KEY = "cosmo-intro-seen";

export default function HomeClient({ projects }: { projects: PanelProject[] }) {
  // introRan bleibt nach der Entscheidung stabil (steuert die Reveal-Delays),
  // overlay steuert nur das Mounten des Intro-Overlays.
  const [introRan, setIntroRan] = useState<boolean | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(KEY);
    const run = !seen && !reduced;
    if (run) sessionStorage.setItem(KEY, "1");
    setIntroRan(run);
    setOverlay(run);
  }, []);

  if (introRan === null) return <div className="h-dvh" aria-hidden="true" />;

  return (
    <>
      {overlay && <IntroOverlay onDone={() => setOverlay(false)} />}
      <HomeStage projects={projects} delayed={introRan} />
    </>
  );
}
