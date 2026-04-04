"use client";

import { useState, useEffect, useRef } from "react";

const fields = [
  { key: "bio_de", label: "Bio (Deutsch)", type: "textarea" },
  { key: "bio_en", label: "Bio (English)", type: "textarea" },
  { key: "contact_email", label: "Kontakt E-Mail", type: "input" },
  { key: "instagram_url", label: "Instagram URL", type: "input" },
  { key: "linkedin_url", label: "LinkedIn URL", type: "input" },
  { key: "facebook_url", label: "Facebook URL", type: "input" },
];

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroStatus, setHeroStatus] = useState("");
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setValues(data);
        if (data.hero_image_id) {
          setHeroPreview(`/api/drive/image/${data.hero_image_id}`);
        }
        setLoading(false);
      });
  }, []);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeroUploading(true);
    setHeroStatus("");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/settings/hero-image", { method: "POST", body: form });

    if (res.ok) {
      const { fileId } = await res.json();
      setHeroPreview(`/api/drive/image/${fileId}`);
      setHeroStatus("Bild gespeichert ✓");
    } else {
      const data = await res.json().catch(() => ({}));
      setHeroStatus(`Fehler: ${data.error || res.status}`);
    }

    setHeroUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Hero image upload */}
      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          Hero-Hintergrundbild
        </label>
        {heroPreview && (
          <img
            src={heroPreview}
            alt="Hero preview"
            className="w-full h-40 object-cover mb-3 border border-border"
          />
        )}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={heroUploading}
            className="px-6 py-2 border border-border text-sm tracking-nav uppercase hover:border-primary transition-colors disabled:opacity-50"
          >
            {heroUploading ? "Wird hochgeladen..." : "Bild auswählen"}
          </button>
          {heroStatus && (
            <span className="text-sm text-muted">{heroStatus}</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleHeroUpload}
        />
      </div>

      <hr className="border-border" />

      {/* Other settings */}
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-xs tracking-label uppercase text-muted mb-2">
            {field.label}
          </label>
          {field.type === "textarea" ? (
            <textarea
              value={values[field.key] || ""}
              onChange={(e) => update(field.key, e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-border text-sm focus:outline-none focus:border-primary resize-none"
            />
          ) : (
            <input
              value={values[field.key] || ""}
              onChange={(e) => update(field.key, e.target.value)}
              className="w-full px-4 py-3 border border-border text-sm focus:outline-none focus:border-primary"
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-3 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {saved ? "Gespeichert ✓" : saving ? "Speichert..." : "Speichern"}
      </button>
    </div>
  );
}
