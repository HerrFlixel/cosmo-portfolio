"use client";

import { motion } from "framer-motion";
import { useLocale } from "next-intl";

interface ImageCardProps {
  image: {
    id: string;
    titleDe: string | null;
    titleEn: string | null;
    width: number | null;
    height: number | null;
  };
  index: number;
  onClick: () => void;
}

export default function ImageCard({ image, index, onClick }: ImageCardProps) {
  const locale = useLocale();
  const title = locale === "de" ? image.titleDe : image.titleEn;

  return (
    <motion.div
      className="relative cursor-pointer overflow-hidden group"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      onClick={onClick}
    >
      <img
        src={`/api/drive/image/${image.id}?w=800`}
        alt={title || "Sports photo"}
        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-colors duration-300 flex items-end">
        {title && (
          <p className="p-4 text-white font-body text-sm tracking-nav uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {title}
          </p>
        )}
      </div>
    </motion.div>
  );
}
