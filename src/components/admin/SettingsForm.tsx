"use client";

import { useState, useEffect } from "react";

const fields = [
  { key: "bio_de", label: "Bio (Deutsch)", type: "textarea" },
  { key: "bio_en", label: "Bio (English)", type: "textarea" },
  { key: "contact_email", label: "Kontakt E-Mail", type: "input" },
  { key: "instagram_url", label: "Instagram URL", type: "input" },
  { key: "linkedin_url", label: "LinkedIn URL", type: "input" },
  { key: "facebook_url", label: "Facebook URL", type: "input" },
];

type Image = { id: string; titleDe: string | null };

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [heroImageId, setHeroImageId] = useState<string | null>(null);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroStatus, setHeroStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]).then(([settingsData, imagesData]) => {
      setValues(settingsData);
      setHeroImageId(settingsData.hero_image_id ?? null);
      setImages(Array.isArray(imagesData) ? imagesData : []);
      setLoading(false);
    });
  }, []);

  async function selectHero(id: string) {
    setHeroSaving(true);
    setHeroStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero_image_id: id }),
      });
      if (res.ok) {
        setHeroImageId(id);
        setHeroStatus("✓ Gespeichert – Seite neu laden zum Anzeigen");
      } else {
        const data = await res.json().catch(() => ({}));
        setHeroStatus(`Fehler ${res.status}: ${data.error ?? "unbekannt"}`);
      }
    } catch {
      setHeroStatus("Netzwerkfehler");
    }
    setHeroSaving(false);
    setTimeout(() => setHeroStatus(""), 5000);
  }

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
    <div className="space-y-8 max-w-4xl">
      {/* Hero image picker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs tracking-label uppercase text-muted">
            Hero-Hintergrundbild
          </label>
          {heroSaving && <span className="text-xs text-muted">Speichert...</span>}
          {heroStatus && <span className="text-xs text-muted">{heroStatus}</span>}
        </div>

        {heroImageId && (
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">Aktuell aktiv:</p>
            <img
              src={`/api/drive/image/${heroImageId}`}
              alt="Aktuelles Hero-Bild"
              className="h-32 w-auto object-cover border border-primary"
            />
          </div>
        )}

        {images.length === 0 ? (
          <p className="text-sm text-muted">
            Keine Bilder gefunden. Bitte zuerst Bilder synchronisieren.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {images.map((img) => {
              const isSelected = img.id === heroImageId;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => img.id && selectHero(img.id)}
                  className={`relative aspect-square overflow-hidden border-2 transition-all hover:opacity-90 ${
                    isSelected
                      ? "border-primary"
                      : "border-transparent hover:border-border"
                  }`}
                  title={img.titleDe ?? img.id ?? ""}
                >
                  <img
                    src={`/api/drive/image/${img.id}?w=400`}
                    alt={img.titleDe ?? ""}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white drop-shadow"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
