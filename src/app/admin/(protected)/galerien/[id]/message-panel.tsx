"use client";

import { useState } from "react";
import type { Locale } from "@/lib/format";
import { galleryMessage } from "@/lib/galleries/message";

type Props = { url: string; password: string; expiresAt: string | null };

export function MessagePanel({ url, password, expiresAt }: Props) {
  const [locale, setLocale] = useState<Locale>("de");
  const [copied, setCopied] = useState(false);
  const text = galleryMessage({ locale, url, password, expiresAt });
  return (
    <div className="max-w-2xl space-y-3">
      <label className="block text-sm">
        Sprache
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="ml-3 border border-ink/20 bg-paper px-2 py-1">
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="block text-sm">
        Nachricht
        <textarea readOnly value={text} rows={9} className="mt-1 block w-full border border-ink/20 bg-paper px-3 py-2 font-label text-xs" />
      </label>
      <button
        type="button"
        className="bg-ink px-6 py-2 text-sm text-paper"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
      >
        Nachricht kopieren
      </button>
      {copied && <span role="status" className="ml-3 text-sm">Kopiert.</span>}
    </div>
  );
}
