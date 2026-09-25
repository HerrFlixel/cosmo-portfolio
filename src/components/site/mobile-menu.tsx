"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Category } from "@/lib/categories";
import { LocaleSwitch } from "./locale-switch";
import { useInertBackground } from "./use-inert-background";
import { Wordmark } from "./logo";

const label = "font-label text-xs uppercase tracking-[0.12em]";

/** Vollbild-Menü unter lg (Spec §6.5). Plan 5 ergänzt den gestaffelten Reveal. */
export function MobileMenu({ shopUrl }: { shopUrl: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const dialog = useRef<HTMLDivElement>(null);
  useInertBackground(dialog, open);

  useEffect(() => {
    if (!open) return;
    const button = opener.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)} className={`${label} lg:hidden`}>
        {t("nav.menu")}
      </button>
      {/* Portal: Der Kopf ist ein Stapelkontext (z-20); das Menü muss auch über der Kategorie-Pille liegen. */}
      {open &&
        createPortal(
          <div ref={dialog} id="mobile-menu" role="dialog" aria-modal="true" aria-label={t("nav.menu")} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper px-4 pb-10">
            <div className="flex h-[72px] shrink-0 items-center justify-between">
              <Link href="/" onClick={close} aria-label={t("nav.home")} className="block w-[104px]">
                <Wordmark decorative className="block h-auto w-full" />
              </Link>
              <button ref={closeButton} type="button" onClick={close} className={label}>
                {t("nav.close")}
              </button>
            </div>
            <nav aria-label={t("nav.main")} className="mt-6 flex flex-1 flex-col gap-12">
              <ol className="space-y-1">
                {CATEGORIES.map((category, index) => (
                  <li key={category}>
                    <Link href={`/${category}` as `/${Category}`} onClick={close} className="flex items-baseline gap-3">
                      <span className="font-label text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
                      <span className="font-sport text-[clamp(3rem,14vw,4.5rem)]">{t(`categories.${category}`)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
              <ul className="space-y-3 font-display text-3xl">
                <li>
                  <Link href="/ueber-mich" onClick={close}>{t("nav.about")}</Link>
                </li>
                <li>
                  <Link href="/kontakt" onClick={close}>{t("nav.contact")}</Link>
                </li>
                <li>
                  <Link href="/kunden" onClick={close}>{t("nav.clients")}</Link>
                </li>
                {shopUrl && (
                  <li>
                    <a href={shopUrl} target="_blank" rel="noopener">
                      {t("nav.shop")} <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                )}
              </ul>
              <LocaleSwitch onNavigate={close} className={`${label} mt-auto text-muted`} />
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
