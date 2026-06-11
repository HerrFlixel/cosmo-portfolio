"use client";

import { useState, useEffect } from "react";

const fields = [
  { key: "status_text_de", label: "Status-Zeile Header (Deutsch)", type: "input" },
  { key: "status_text_en", label: "Status-Zeile Header (English)", type: "input" },
  { key: "about_headline_de", label: "About-Headline (Deutsch)", type: "input" },
  { key: "about_headline_en", label: "About-Headline (English)", type: "input" },
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
  const [aboutImageId, setAboutImageId] = useState<string | null>(null);
  const [aboutStatus, setAboutStatus] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]).then(([settingsData, imagesData]) => {
      setValues(settingsData);
      setAboutImageId(settingsData.about_image_id ?? null);
      setImages(Array.isArray(imagesData) ? imagesData : []);
      setLoading(false);
    });
  }, []);

  async function selectAboutImage(id: string) {
    setAboutStatus("");
    setSavingAbout(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about_image_id: id }),
      });
      if (res.ok) {
        setAboutImageId(id);
        setAboutStatus("✓ Gespeichert");
        setTimeout(() => setAboutStatus(""), 4000);
      } else {
        setAboutStatus(`Fehler ${res.status}`);
      }
    } catch {
      setAboutStatus("Netzwerkfehler");
    } finally {
      setSavingAbout(false);
    }
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
      {/* About-Bild */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs tracking-label uppercase text-muted">
            Über-mich-Foto
          </label>
          {aboutStatus && <span className="text-xs text-muted">{aboutStatus}</span>}
        </div>

        {aboutImageId && (
          <img
            src={`/api/drive/image/${aboutImageId}?w=400`}
            alt="Aktuelles About-Bild"
            className="h-32 w-auto object-cover border border-primary mb-4"
          />
        )}

        {images.length === 0 ? (
          <p className="text-sm text-muted">Keine Bilder gefunden. Bitte zuerst ein Projekt syncen.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => selectAboutImage(img.id)}
                disabled={savingAbout}
                className={`aspect-square overflow-hidden border-2 transition-all hover:opacity-90 disabled:opacity-50 ${
                  img.id === aboutImageId ? "border-primary" : "border-transparent hover:border-border"
                }`}
                title={img.titleDe ?? ""}
              >
                <img src={`/api/drive/image/${img.id}?w=400`} alt={img.titleDe ?? ""} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <hr className="border-border" />

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
