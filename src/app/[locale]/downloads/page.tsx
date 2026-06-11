"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import CodeInput from "@/components/downloads/CodeInput";
import DownloadGallery from "@/components/downloads/DownloadGallery";

interface DownloadImage {
  id: string;
  name: string;
  thumbnailLink?: string;
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
    <div className="pt-[100px] px-6 md:px-10 pb-20">
      {!verified ? (
        <div className="min-h-[55vh] flex flex-col items-center justify-center text-center">
          <p className="text-xs tracking-label uppercase text-fog mb-4">{t("label")}</p>
          <h1 className="text-3xl md:text-[34px] font-semibold tracking-tight mb-9">
            {t("headline")}
          </h1>
          <CodeInput
            onVerified={(data, c) => {
              setVerified(data);
              setCode(c);
            }}
          />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <DownloadGallery label={verified.label} images={verified.images} code={code} />
        </div>
      )}
    </div>
  );
}
