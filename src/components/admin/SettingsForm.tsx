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

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => { setValues(data); setLoading(false); });
  }, []);

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
    <div className="space-y-6 max-w-2xl">
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
