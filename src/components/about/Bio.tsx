"use client";

import { motion } from "framer-motion";

interface BioProps {
  text: string;
}

export default function Bio({ text }: BioProps) {
  return (
    <motion.section
      className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative">
        <div className="aspect-[3/4] bg-surface border border-border flex items-center justify-center">
          <span className="text-muted text-xs tracking-label uppercase">Foto</span>
        </div>
        <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-primary -z-10" />
      </div>

      <div>
        <div className="h-1 w-16 bg-primary mb-8" />
        <div className="font-body text-secondary leading-relaxed whitespace-pre-line">
          {text}
        </div>
      </div>
    </motion.section>
  );
}
