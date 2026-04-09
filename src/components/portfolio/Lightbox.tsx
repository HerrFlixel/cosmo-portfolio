"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";

interface LightboxProps {
  images: {
    id: string;
    titleDe: string | null;
    titleEn: string | null;
  }[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ images, currentIndex, onClose, onNavigate }: LightboxProps) {
  const locale = useLocale();
  const current = images[currentIndex];
  const title = locale === "de" ? current?.titleDe : current?.titleEn;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
    },
    [currentIndex, images.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <button
          className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light z-10"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="absolute top-6 left-6 text-white/60 font-body text-sm tracking-nav">
          {currentIndex + 1} / {images.length}
        </div>

        {currentIndex > 0 && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl font-light z-10 p-4"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          >
            &#8249;
          </button>
        )}

        <motion.img
          key={current.id}
          src={`/api/drive/image/${current.id}?w=1920`}
          alt={title || "Sports photo"}
          className="max-h-[85vh] max-w-[90vw] object-contain"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        />

        {currentIndex < images.length - 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl font-light z-10 p-4"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          >
            &#8250;
          </button>
        )}

        {title && (
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-body text-sm tracking-nav uppercase">
            {title}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
