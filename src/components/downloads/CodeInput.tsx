"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface DownloadImage {
  id: string;
  name: string;
  thumbnailLink?: string;
}

interface VerifiedData {
  label: string;
  images: DownloadImage[];
}

interface CodeInputProps {
  onVerified: (data: VerifiedData, code: string) => void;
}

export default function CodeInput({ onVerified }: CodeInputProps) {
  const t = useTranslations("downloads");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/downloads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        setError(t("invalid"));
        setLoading(false);
        return;
      }

      const data = await res.json();
      onVerified(data, code.trim());
    } catch {
      setError(t("invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
      <div className="flex items-center border-b border-ink">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("placeholder")}
          className="w-60 bg-transparent font-mono text-base tracking-[.35em] uppercase py-3 px-1 outline-none placeholder:text-fog placeholder:tracking-[.2em]"
          aria-label={t("placeholder")}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-2 py-3 text-lg hover:text-fog transition-colors disabled:opacity-50"
          aria-label={t("submit")}
        >
          {loading ? "…" : "→"}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <p className="text-xs text-fog">{t("hint")}</p>
    </form>
  );
}
