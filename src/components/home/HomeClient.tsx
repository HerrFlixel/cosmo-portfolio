"use client";

import { useEffect, useState } from "react";
import LogoIntro from "./LogoIntro";
import HomeStage, { PanelProject } from "./HomeStage";

const KEY = "cosmo-intro-seen";

export default function HomeClient({
  projects,
}: {
  projects: PanelProject[];
}) {
  // introRan bleibt stabil (steuert HomeStage-Reveal-Delays); overlay steuert nur das Mounten.
  const [introRan, setIntroRan] = useState<boolean | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const seen = sessionStorage.getItem(KEY);
    const run = !seen && !reduced && !narrow;
    if (!seen) sessionStorage.setItem(KEY, "1");
    setIntroRan(run);
    setOverlay(run);
    if (run) document.documentElement.classList.add("intro-active");
    return () => document.documentElement.classList.remove("intro-active");
  }, []);

  function revealNav() {
    document.documentElement.classList.remove("intro-active");
  }

  function finishIntro() {
    document.documentElement.classList.remove("intro-active");
    setOverlay(false);
  }

  if (introRan === null) return <div className="h-dvh" aria-hidden="true" />;

  return (
    <>
      {overlay && <LogoIntro onReveal={revealNav} onDone={finishIntro} />}
      <HomeStage projects={projects} delayed={introRan} />
    </>
  );
}
