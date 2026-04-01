"use client";

import { useState, useEffect } from "react";

interface ImageData {
  id: string;
  driveFileId: string | null;
  titleDe: string | null;
  titleEn: string | null;
  tags: string | null;
  sortOrder: number;
  visible: boolean;
}

export default function ImageManager() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchImages() {
    const res = await fetch("/api/images");
    const data = await res.json();
    setImages(data);
    setLoading(false);
  }

  useEffect(() => { fetchImages(); }, []);

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/drive/sync", { method: "POST" });
    const data = await res.json();
    alert(`Sync abgeschlossen: ${data.synced} neue Bilder`);
    fetchImages();
    setSyncing(false);
  }

  async function toggleVisibility(id: string, visible: boolean) {
    await fetch("/api/images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visible: !visible }),
    });
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, visible: !visible } : img))
    );
  }

  async function updateTitle(id: string, titleDe: string, titleEn: string) {
    await fetch("/api/images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, titleDe, titleEn }),
    });
  }

  async function deleteImage(id: string) {
    if (!confirm("Bild wirklich aus dem Portfolio entfernen?")) return;
    await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {syncing ? "Synchronisiert..." : "Google Drive Sync"}
        </button>
        <span className="text-muted text-sm">{images.length} Bilder</span>
      </div>

      <div className="space-y-3">
        {images.map((image) => (
          <div
            key={image.id}
            className={`flex items-center gap-4 p-4 bg-white border border-border ${
              !image.visible ? "opacity-50" : ""
            }`}
          >
            <img
              src={`/api/drive/image/${image.id}`}
              alt=""
              className="w-20 h-14 object-cover flex-shrink-0"
            />

            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                defaultValue={image.titleDe || ""}
                placeholder="Titel (DE)"
                onBlur={(e) => updateTitle(image.id, e.target.value, image.titleEn || "")}
                className="px-3 py-1.5 border border-border text-sm focus:outline-none focus:border-primary"
              />
              <input
                defaultValue={image.titleEn || ""}
                placeholder="Title (EN)"
                onBlur={(e) => updateTitle(image.id, image.titleDe || "", e.target.value)}
                className="px-3 py-1.5 border border-border text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={() => toggleVisibility(image.id, image.visible)}
              className={`px-3 py-1.5 text-xs tracking-nav uppercase border ${
                image.visible
                  ? "border-primary text-primary"
                  : "border-muted text-muted"
              }`}
            >
              {image.visible ? "Sichtbar" : "Versteckt"}
            </button>

            <button
              onClick={() => deleteImage(image.id)}
              className="px-3 py-1.5 text-xs tracking-nav uppercase text-red-600 border border-red-200 hover:border-red-600"
            >
              Entfernen
            </button>
          </div>
        ))}
        {images.length === 0 && (
          <p className="text-muted text-sm py-12 text-center">
            Keine Bilder — klicke &ldquo;Google Drive Sync&rdquo; um Bilder zu importieren
          </p>
        )}
      </div>
    </div>
  );
}
