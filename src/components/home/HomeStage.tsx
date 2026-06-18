"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export interface PanelProject {
  id: string;
  slug: string;
  titleDe: string;
  titleEn: string | null;
  category: string;
  year: number;
  coverId: string;
}

export default function HomeStage({
  projects,
  delayed,
}: {
  projects: PanelProject[];
  delayed: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("home");
  const tc = useTranslations("categories");
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);

  const title = (p: PanelProject) =>
    locale === "en" && p.titleEn ? p.titleEn : p.titleDe;

  const baseDelay = delayed ? 1.9 : 0.05;

  if (projects.length === 0) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <p className="text-fog text-sm tracking-label uppercase">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Desktop: Panel-Galerie ---------- */}
      <div className="hidden md:flex h-dvh flex-col pt-[112px] overflow-hidden">
        <div
          className={`flex-1 min-h-0 flex gap-3.5 px-10 pt-1 reveal ${hovering ? "panels-hovering" : ""}`}
          style={{ animationDelay: `${baseDelay}s` }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {projects.map((p, i) => {
            const isActive = hovering && active === i;
            const dimmed = hovering && active !== i;
            return (
              <Link
                key={p.id}
                href={{ pathname: "/projects/[slug]", params: { slug: p.slug } }}
                className="panel group relative overflow-hidden"
                style={{ flexGrow: isActive ? 1.75 : 1, flexBasis: 0 }}
                onMouseEnter={() => setActive(i)}
                onFocus={() => { setActive(i); setHovering(true); }}
                onBlur={() => setHovering(false)}
              >
                <div className="panel-drift">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/drive/image/${p.coverId}?w=1200`}
                    alt={title(p)}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      transform: isActive ? "scale(1.06)" : "scale(1.001)",
                      filter: isActive
                        ? "saturate(1)"
                        : dimmed
                          ? "saturate(.55) brightness(.94)"
                          : "saturate(.82)",
                    }}
                  />
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent transition-opacity duration-500"
                  style={{ opacity: isActive ? 1 : 0 }}
                />
                <div
                  className="absolute inset-x-3.5 bottom-3 flex justify-between items-baseline text-white transition-all duration-500"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  <span className="text-[15px] font-medium [text-shadow:0_1px_14px_rgba(0,0,0,.45)]">
                    {title(p)}
                  </span>
                  <span className="font-mono text-[11px] [text-shadow:0_1px_14px_rgba(0,0,0,.45)]">
                    {String(i + 1).padStart(2, "0")} / {tc(p.category as "sport" | "hochzeit" | "event")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom-Bar */}
        <div
          className="relative flex items-end justify-between px-10 py-5 reveal"
          style={{ animationDelay: `${baseDelay + 0.2}s` }}
        >
          <div className="text-sm leading-snug">
            <span className="block font-semibold">{t("identity")}</span>
            <span className="italic text-fog">{t("role")}</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-7 flex gap-2.5">
            {projects.map((_, i) => (
              <span
                key={i}
                className="w-[52px] h-0.5 transition-colors duration-300"
                style={{ background: active === i ? "#111" : "#d4d4d0" }}
              />
            ))}
          </div>
          <span
            key={active}
            className="fade-swap text-[34px] font-semibold tracking-tight text-right min-w-[300px]"
          >
            {title(projects[active])}
          </span>
        </div>
      </div>

      {/* ---------- Mobile: gestapelte Cover ---------- */}
      <div className="md:hidden pt-20 px-4 pb-10 space-y-4">
        {projects.map((p, i) => (
          <Link
            key={p.id}
            href={{ pathname: "/projects/[slug]", params: { slug: p.slug } }}
            className="relative block aspect-[4/5] overflow-hidden reveal"
            style={{ animationDelay: `${baseDelay + i * 0.08}s` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/drive/image/${p.coverId}?w=800`}
              alt={title(p)}
              className="absolute inset-0 w-full h-full object-cover"
              loading={i < 2 ? "eager" : "lazy"}
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 flex justify-between items-baseline text-white">
              <span className="text-[15px] font-medium">{title(p)}</span>
              <span className="font-mono text-[11px]">
                {String(i + 1).padStart(2, "0")} / {p.year}
              </span>
            </div>
          </Link>
        ))}
        <div className="pt-6 text-sm leading-snug">
          <span className="block font-semibold">{t("identity")}</span>
          <span className="italic text-fog">{t("role")}</span>
        </div>
      </div>
    </>
  );
}
