"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface Logo {
  id: string;
  name: string;
  imageUrl: string;
}

export default function ClientLogos({ logos }: { logos: Logo[] }) {
  const t = useTranslations("about");

  if (logos.length === 0) return null;

  return (
    <section className="mt-24">
      <div className="flex items-center gap-6 mb-12">
        <h3 className="font-heading text-3xl tracking-wide">{t("clients").toUpperCase()}</h3>
        <div className="flex-1 h-0.5 bg-border" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-12">
        {logos.map((logo, index) => (
          <motion.div
            key={logo.id}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
          >
            <img
              src={logo.imageUrl}
              alt={logo.name}
              className="h-12 w-auto object-contain"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
