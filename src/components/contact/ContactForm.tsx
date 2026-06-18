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

      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="cf-name" className="text-xs text-fog">{t("name")} *</label>
        <input id="cf-name" name="name" type="text" required className={field} />
      </div>
      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="cf-email" className="text-xs text-fog">{t("email")} *</label>
        <input id="cf-email" name="email" type="email" required className={field} />
      </div>
      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="cf-subject" className="text-xs text-fog">{t("subject")} *</label>
        <input id="cf-subject" name="subject" type="text" required className={field} />
      </div>
      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="cf-message" className="text-xs text-fog">{t("message")} *</label>
        <textarea id="cf-message" name="message" required rows={4} className={`${field} resize-none`} />
      </div>

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
