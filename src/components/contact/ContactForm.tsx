"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const field =
  "w-full bg-transparent border-0 border-b border-hairline focus:border-ink py-3.5 px-0.5 text-sm outline-none transition-colors placeholder:text-fog";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/contact", { method: "POST", body: formData });

      if (res.ok) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(data.error || t("error"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("error"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <input name="name" type="text" required aria-label={t("name")} placeholder={`${t("name")} *`} className={field} />
      <input name="email" type="email" required aria-label={t("email")} placeholder={`${t("email")} *`} className={field} />
      <input name="subject" type="text" required aria-label={t("subject")} placeholder={`${t("subject")} *`} className={field} />
      <textarea name="message" required rows={4} aria-label={t("message")} placeholder={`${t("message")} *`} className={`${field} resize-none`} />

      <label className="mt-6 text-xs text-fog cursor-pointer">
        {t("file")}
        <input name="file" type="file" className="block mt-2 text-xs text-fog file:mr-3 file:py-1.5 file:px-3 file:border file:border-hairline file:bg-transparent file:text-ink file:text-xs file:cursor-pointer" />
      </label>

      {status === "success" && <p className="mt-5 text-sm text-ink">{t("success")}</p>}
      {status === "error" && <p className="mt-5 text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-8 self-start bg-ink text-paper text-xs tracking-[.1em] uppercase px-7 py-3.5 hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {status === "sending" ? "..." : `${t("send")} →`}
      </button>
    </form>
  );
}
