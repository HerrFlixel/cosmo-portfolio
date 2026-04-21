"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import CodeInput from "@/components/downloads/CodeInput";
import DownloadGallery from "@/components/downloads/DownloadGallery";

interface DownloadImage {
  id: string;
  name: string;
}

interface VerifiedData {
  label: string;
  images: DownloadImage[];
}

export default function DownloadsPage() {
  const t = useTranslations("downloads");
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [code, setCode] = useState("");

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      {!verified ? (
        <div className="py-24">
          <CodeInput
            onVerified={(data, c) => {
              setVerified(data);
              setCode(c);
            }}
          />
        </div>
      ) : (
        <DownloadGallery label={verified.label} images={verified.images} code={code} />
      )}
    </div>
  );
}
