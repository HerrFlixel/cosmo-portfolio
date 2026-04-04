"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface HeroSectionProps {
  heroImageId?: string | null;
}

export default function HeroSection({ heroImageId }: HeroSectionProps) {
  const t = useTranslations("hero");

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-primary">
      {/* Background image from Google Drive if set */}
      {heroImageId && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: `url('/api/drive/image/${heroImageId}')` }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.h1
          className="font-heading text-7xl md:text-9xl tracking-wider text-white"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          COSMO
        </motion.h1>

        <motion.div
          className="h-1 w-24 bg-white mx-auto my-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />

        <motion.p
          className="font-body text-sm md:text-base tracking-label uppercase text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {t("tagline")}
        </motion.p>

        <motion.a
          href="#portfolio"
          className="inline-block mt-10 px-8 py-3 border-2 border-white text-white font-body text-sm tracking-nav uppercase hover:bg-white hover:text-primary transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {t("cta")}
        </motion.a>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="w-px h-12 bg-white/50" />
      </motion.div>
    </section>
  );
}
