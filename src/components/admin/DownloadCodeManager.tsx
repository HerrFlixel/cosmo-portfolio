"use client";

import { useState, useEffect } from "react";

interface DownloadCode {
  id: string;
  code: string;
  label: string;
  expiresAt: string | null;
  active: boolean;
  downloadCount: number;
  imageIds: string[];
}

interface AvailableImage {
  id: string;
  titleDe: string | null;
}

export default function DownloadCodeManager() {
  const [codes, setCodes] = useState<DownloadCode[]>([]);
  const [allImages, setAllImages] = useState<AvailableImage[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [codesRes, imagesRes] = await Promise.all([
      fetch("/api/downloads/codes"),
      fetch("/api/images"),
    ]);
    setCodes(await codesRes.json());
    setAllImages(await imagesRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function createCode() {
    if (!newLabel) return;
    const res = await fetch("/api/downloads/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel, expiresAt: newExpiry || null, imageIds: selectedImages }),
    });
    const data = await res.json();
    alert(`Code erstellt: ${data.code}`);
    setShowCreate(false);
    setNewLabel("");
    setNewExpiry("");
    setSelectedImages([]);
    fetchData();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/downloads/codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active: !active } : c)));
  }

  async function deleteCode(id: string) {
    if (!confirm("Code wirklich löschen?")) return;
    await fetch("/api/downloads/codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCodes((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div>
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors mb-8"
      >
        Neuer Download-Code
      </button>

      {showCreate && (
        <div className="bg-white border border-border p-6 mb-8 space-y-4">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (z.B. DFB Pokal 2025)"
            className="w-full px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary"
          />
          <div>
            <label className="block text-xs tracking-label uppercase text-muted mb-1">Ablaufdatum (optional)</label>
            <input
              type="date"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <p className="text-xs tracking-label uppercase text-muted mb-2">Bilder zuweisen:</p>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {allImages.map((img) => (
                <label
                  key={img.id}
                  className={`cursor-pointer border-2 p-1 ${
                    selectedImages.includes(img.id) ? "border-primary" : "border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedImages.includes(img.id)}
                    onChange={() =>
                      setSelectedImages((prev) =>
                        prev.includes(img.id) ? prev.filter((id) => id !== img.id) : [...prev, img.id]
                      )
                    }
                  />
                  <img src={`/api/drive/image/${img.id}`} alt="" className="w-full h-16 object-cover" />
                </label>
              ))}
            </div>
            {allImages.length === 0 && (
              <p className="text-muted text-sm">Noch keine Bilder. Zuerst Google Drive synchronisieren.</p>
            )}
          </div>
          <button
            onClick={createCode}
            className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase"
          >
            Erstellen
          </button>
        </div>
      )}

      <div className="space-y-3">
        {codes.map((code) => (
          <div key={code.id} className="flex items-center gap-4 p-4 bg-white border border-border">
            <div className="flex-1">
              <p className="font-body font-semibold">{code.label}</p>
              <p className="font-mono text-sm text-secondary tracking-widest">{code.code}</p>
              <p className="text-xs text-muted mt-1">
                {code.imageIds.length} Bilder &middot; {code.downloadCount} Downloads
                {code.expiresAt && ` · Läuft ab: ${code.expiresAt}`}
              </p>
            </div>
            <button
              onClick={() => toggleActive(code.id, code.active)}
              className={`px-3 py-1.5 text-xs tracking-nav uppercase border ${
                code.active ? "border-green-600 text-green-600" : "border-muted text-muted"
              }`}
            >
              {code.active ? "Aktiv" : "Inaktiv"}
            </button>
            <button
              onClick={() => deleteCode(code.id)}
              className="px-3 py-1.5 text-xs tracking-nav uppercase text-red-600 border border-red-200 hover:border-red-600"
            >
              Löschen
            </button>
          </div>
        ))}
        {codes.length === 0 && (
          <p className="text-muted text-sm py-8 text-center">Keine Download-Codes vorhanden</p>
        )}
      </div>
    </div>
  );
}
