"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import CameraBar from "./CameraBar";
import MobileMenu from "./MobileMenu";
import CosmoLogo from "./CosmoLogo";

export default function CameraNav({
  instagramUrl,
  linkedinUrl,
}: {
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: volle Kamera, mittig schwebend */}
      <div className="camera-nav hidden md:flex fixed top-0 inset-x-0 z-40 justify-center pt-5 pointer-events-none">
        <div className="cam pointer-events-auto">
          <span className="cam-shadow" />
          <CameraBar
            activePath={pathname}
            instagramUrl={instagramUrl}
            linkedinUrl={linkedinUrl}
          />
        </div>
      </div>

      {/* Mobil: kompakte Leiste + Auslöser öffnet Fullscreen-Menü */}
      <div className="camera-nav md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-[#141416]">
        <Link href="/" aria-label="Startseite" className="cam-logo text-[#f0ede8]">
          <CosmoLogo className="h-4 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
          aria-expanded={open}
          className="cam-shutter"
        />
      </div>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
