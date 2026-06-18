"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageToggle from "./LanguageToggle";

type NavKey = "projects" | "about" | "contact" | "downloads";
type NavHref = "/" | "/about" | "/contact" | "/downloads";

const NAV: { href: NavHref; key: NavKey }[] = [
  { href: "/", key: "projects" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
  { href: "/downloads", key: "downloads" },
];

function NavIcon({ k }: { k: NavKey }) {
  switch (k) {
    case "projects":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <circle cx="12" cy="12.5" r="3.4" />
          <path d="M8 6l1.5-2h5L16 6" />
        </svg>
      );
    case "about":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "contact":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "downloads":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
  }
}

const InstagramIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedInIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none" />
    <rect x="7" y="11" width="2" height="6" fill="currentColor" stroke="none" />
    <path d="M12 17v-3a2 2 0 0 1 4 0v3" />
  </svg>
);

export default function CameraBar({
  activePath,
  statusText,
  instagramUrl,
  linkedinUrl,
  decorative = false,
}: {
  activePath: string;
  statusText?: string;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  decorative?: boolean;
}) {
  const t = useTranslations("nav");
  const [flash, setFlash] = useState(false);

  function shutter() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 320);
  }

  return (
    <>
      {decorative ? (
        <span className="cam-dial">
          co<span style={{ fontSize: "8px" }}>.</span>
        </span>
      ) : (
        <Link href="/" aria-label="Startseite" className="cam-dial">
          co<span style={{ fontSize: "8px" }}>.</span>
        </Link>
      )}

      {statusText && <span className="cam-readout hidden lg:block">{statusText}</span>}

      <nav className="cam-nav">
        {NAV.map((item) => {
          const active = activePath === item.href;
          const inner = (
            <>
              <NavIcon k={item.key} />
              {t(item.key)}
              {active && <span className="cam-rec" />}
            </>
          );
          return decorative ? (
            <span key={item.key} className={`cam-item ${active ? "active" : ""}`}>
              {inner}
            </span>
          ) : (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`cam-item ${active ? "active" : ""}`}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="cam-ctrl">
        <span className="cam-knob" />
        <span className="cam-social">
          {decorative ? (
            <span className="cam-social-deco">{InstagramIcon}</span>
          ) : (
            <>
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  {InstagramIcon}
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  {LinkedInIcon}
                </a>
              )}
            </>
          )}
        </span>
        <span className="cam-knob" />
        {decorative ? (
          <span className="cam-shutter" />
        ) : (
          <button type="button" className="cam-shutter" aria-label="Nach oben scrollen" onClick={shutter} />
        )}
        {decorative ? (
          <span className="cam-lang font-mono text-[11px]">DE</span>
        ) : (
          <span className="cam-lang">
            <LanguageToggle />
          </span>
        )}
      </div>

      {!decorative && <span className={`cam-flash ${flash ? "on" : ""}`} aria-hidden="true" />}
    </>
  );
}
