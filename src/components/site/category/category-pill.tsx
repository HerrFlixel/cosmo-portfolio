"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/categories";

export type PillItem = { category: Category; name: string; count: number; thumb: string | null };

/** Schwebende Kategorie-Pille (Spec §6.2): Mini-Vorschau und Name, klappt die fünf Kategorien auf. */
export function CategoryPill({ current, items }: { current: Category; items: PillItem[] }) {
  const t = useTranslations("category");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = items.find((item) => item.category === current) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
      <div ref={root} className="pointer-events-auto relative">
        {open && (
          <ul id="category-menu" className="absolute bottom-full left-1/2 mb-3 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 bg-paper p-2 shadow-[0_18px_50px_rgb(20_20_18/0.18)]">
            {items.map((item) => (
              <li key={item.category}>
                <Link
                  href={`/${item.category}` as `/${Category}`}
                  aria-current={item.category === current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-3 px-3 py-2 transition-colors hover:bg-mat"
                >
                  <span className="font-sport text-2xl">{item.name}</span>
                  <span className="ml-auto font-label text-xs text-muted">({item.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="category-menu"
          aria-label={t("switch", { category: active.name })}
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-3 rounded-full bg-ink py-1.5 pl-1.5 pr-5 text-paper shadow-[0_10px_30px_rgb(20_20_18/0.25)] transition active:scale-[0.98]"
        >
          {active.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- Mini-Vorschau (800er-Größe)
            <img src={active.thumb} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="size-9 rounded-full bg-stone/40" />
          )}
          <span className="font-sport text-xl">{active.name}</span>
          <span aria-hidden="true" className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>
            ▲
          </span>
        </button>
      </div>
    </div>
  );
}
