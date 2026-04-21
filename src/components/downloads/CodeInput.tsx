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
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t("placeholder")}
        className="w-full max-w-md px-6 py-4 border-2 border-border font-body text-center text-lg tracking-wider uppercase focus:outline-none focus:border-primary transition-colors"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-8 py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {loading ? "..." : t("submit")}
      </button>
    </form>
  );
}
