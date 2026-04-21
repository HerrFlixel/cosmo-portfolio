"use client";

import { useState, useEffect } from "react";

interface Album {
  id: string;
  name: string;
  code: string;
  driveFolderId: string;
  expiresAt: string | null;
  active: boolean;
  downloadCount: number;
  createdAt: string;
}

export default function DownloadCodeManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [driveFolder, setDriveFolder] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function fetchData() {
    const res = await fetch("/api/albums");
    setAlbums(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function createAlbum() {
    if (!name || !driveFolder) return;
    setCreating(true);
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, driveFolder, expiresAt: expiresAt || null }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Fehler: ${data.error || res.status}`);
      return;
    }
    const data = await res.json();
    alert(`Album erstellt! Code: ${data.code}`);
    setShowCreate(false);
    setName("");
    setDriveFolder("");
    setExpiresAt("");
    fetchData();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, active: !active } : a)));
  }

  async function deleteAlbum(id: string) {
    if (!confirm("Album wirklich löschen? (Drive-Ordner bleibt bestehen)")) return;
    await fetch("/api/albums", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div>
      <div className="bg-surface border border-border p-4 mb-6 text-sm text-muted">
        <p className="mb-2">
          <strong className="text-primary">So funktioniert&apos;s:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>In Google Drive einen neuen Ordner für das Album anlegen</li>
          <li>Ordner mit Service Account teilen (gleiche Berechtigungen wie Haupt-Ordner)</li>
          <li>Fotos in den Ordner hochladen</li>
          <li>Hier Album erstellen — Ordner-URL oder -ID einfügen</li>
          <li>Generierten Code dem Kunden schicken</li>
        </ol>
      </div>

      <button
        onClick={() => setShowCreate(!showCreate)}
        className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors mb-8"
      >
        {showCreate ? "Abbrechen" : "Neues Album"}
      </button>

      {showCreate && (
        <div className="bg-white border border-border p-6 mb-8 space-y-4">
          <div>
            <label className="block text-xs tracking-label uppercase text-muted mb-1">
              Album-Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. DFB Pokal 2025"
              className="w-full px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs tracking-label uppercase text-muted mb-1">
              Google Drive Ordner-URL oder -ID
            </label>
            <input
              value={driveFolder}
              onChange={(e) => setDriveFolder(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
          <div>
            <label className="block text-xs tracking-label uppercase text-muted mb-1">
              Ablaufdatum (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={createAlbum}
            disabled={creating || !name || !driveFolder}
            className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase disabled:opacity-50"
          >
            {creating ? "Wird erstellt..." : "Album + Code erstellen"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {albums.map((album) => (
          <div key={album.id} className="flex items-center gap-4 p-4 bg-white border border-border">
            <div className="flex-1">
              <p className="font-body font-semibold">{album.name}</p>
              <button
                onClick={() => copyCode(album.code)}
                className="font-mono text-sm text-secondary tracking-widest hover:text-primary transition-colors"
                title="Klicken zum Kopieren"
              >
                {album.code} {copiedCode === album.code && <span className="text-green-600 ml-2">✓ Kopiert</span>}
              </button>
              <p className="text-xs text-muted mt-1">
                {album.downloadCount} Downloads
                {album.expiresAt && ` · Läuft ab: ${album.expiresAt}`}
              </p>
            </div>
            <button
              onClick={() => toggleActive(album.id, album.active)}
              className={`px-3 py-1.5 text-xs tracking-nav uppercase border ${
                album.active ? "border-green-600 text-green-600" : "border-muted text-muted"
              }`}
            >
              {album.active ? "Aktiv" : "Inaktiv"}
            </button>
            <button
              onClick={() => deleteAlbum(album.id)}
              className="px-3 py-1.5 text-xs tracking-nav uppercase text-red-600 border border-red-200 hover:border-red-600"
            >
              Löschen
            </button>
          </div>
        ))}
        {albums.length === 0 && (
          <p className="text-muted text-sm py-8 text-center">Keine Alben vorhanden</p>
        )}
      </div>
    </div>
  );
}
