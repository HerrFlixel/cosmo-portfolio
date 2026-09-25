"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = { onSubmit: (name: string) => void; onCancel: () => void };

export function NameDialog({ onSubmit, onCancel }: Props) {
  const t = useTranslations("gallery");
  const [name, setName] = useState("");
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="name-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-6">
      <form
        className="w-full max-w-sm space-y-4 bg-paper p-6"
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onSubmit(name);
        }}
      >
        <label id="name-title" className="block font-display text-2xl">
          {t("namePrompt")}
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            className="mt-3 block w-full border-b border-ink/30 bg-transparent py-2 font-sans text-base outline-none focus:border-ink"
          />
        </label>
        <p className="text-sm text-stone">{t("nameHint")}</p>
        <div className="flex justify-end gap-4 text-sm">
          <button type="button" onClick={onCancel} className="underline">
            {t("cancel")}
          </button>
          <button type="submit" className="bg-ink px-6 py-2 text-paper">
            {t("nameContinue")}
          </button>
        </div>
      </form>
    </div>
  );
}
