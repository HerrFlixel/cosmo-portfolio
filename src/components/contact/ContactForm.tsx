"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus("error");
        setErrorMsg(data.error || t("error"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("error"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("name")} *
        </label>
        <input
          name="name"
          type="text"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("email")} *
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("subject")} *
        </label>
        <input
          name="subject"
          type="text"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("message")} *
        </label>
        <textarea
          name="message"
          required
          rows={6}
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("file")}
        </label>
        <input
          name="file"
          type="file"
          className="w-full font-body text-sm text-muted file:mr-4 file:py-2 file:px-4 file:border file:border-border file:bg-surface file:text-primary file:text-xs file:tracking-label file:uppercase file:cursor-pointer"
        />
      </div>

      {status === "success" && (
        <p className="text-green-700 text-sm font-body">{t("success")}</p>
      )}
      {status === "error" && (
        <p className="text-red-600 text-sm font-body">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="px-8 py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {status === "sending" ? "..." : t("send")}
      </button>
    </form>
  );
}
