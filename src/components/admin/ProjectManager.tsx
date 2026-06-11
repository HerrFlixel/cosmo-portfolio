"use client";

import { useState, useEffect, useCallback } from "react";

interface Project {
  id: string;
  slug: string;
  titleDe: string;
  titleEn: string | null;
  category: string;
  year: number;
  location: string | null;
  driveFolderId: string;
  coverImageId: string | null;
  sortOrder: number;
  visible: boolean;
  imageCount: number;
}

interface ProjectImage {
  id: string;
  projectId: string | null;
}

const emptyForm = { titleDe: "", titleEn: "", category: "sport", year: new Date().getFullYear(), location: "", driveFolderId: "" };

export default function ProjectManager() {
  const [list, setList] = useState<Project[]>([]);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [coverPickerFor, setCoverPickerFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [projectsRes, imagesRes] = await Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]);
    setList(Array.isArray(projectsRes) ? projectsRes : []);
    setImages(Array.isArray(imagesRes) ? imagesRes : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ ...emptyForm });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Fehler beim Anlegen");
    }
    setBusy(null);
  }

  async function patch(id: string, updates: Record<string, unknown>) {
    setBusy(id);
    await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    await load();
    setBusy(null);
  }

  async function sync(id: string) {
    setBusy(id);
    setError("");
    const res = await fetch("/api/projects/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Sync fehlgeschlagen");
    }
    await load();
    setBusy(null);
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Projekt „${title}" und zugehörige Bild-Einträge löschen? (Drive-Dateien bleiben erhalten)`)) return;
    setBusy(id);
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setBusy(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    setBusy(a.id);
    await Promise.all([
      fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }) }),
      fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }) }),
    ]);
    await load();
    setBusy(null);
  }

  const input = "w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary";

  return (
    <div className="space-y-10 max-w-5xl">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Neues Projekt */}
      <form onSubmit={create} className="bg-white border border-border p-6 grid grid-cols-2 gap-4">
        <h2 className="col-span-2 font-heading text-xl tracking-wide">NEUES PROJEKT</h2>
        <input className={input} placeholder="Titel (DE) *" value={form.titleDe} onChange={(e) => setForm({ ...form, titleDe: e.target.value })} required />
        <input className={input} placeholder="Titel (EN)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="sport">Sport</option>
          <option value="hochzeit">Hochzeit</option>
          <option value="event">Event</option>
        </select>
        <input className={input} type="number" placeholder="Jahr *" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
        <input className={input} placeholder="Ort (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className={input} placeholder="Google-Drive-Ordner-ID *" value={form.driveFolderId} onChange={(e) => setForm({ ...form, driveFolderId: e.target.value })} required />
        <button type="submit" disabled={busy === "create"} className="col-span-2 justify-self-start px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase disabled:opacity-50">
          {busy === "create" ? "Legt an..." : "Anlegen"}
        </button>
      </form>

      {/* Liste */}
      <div className="space-y-4">
        {list.map((p, i) => {
          const projectImages = images.filter((img) => img.projectId === p.id);
          return (
            <div key={p.id} className="bg-white border border-border p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {p.coverImageId && (
                  <img src={`/api/drive/image/${p.coverImageId}?w=400`} alt="" className="w-16 h-16 object-cover" />
                )}
                <div className="flex-1 min-w-48">
                  <p className="font-medium">{p.titleDe}</p>
                  <p className="text-xs text-muted">
                    {p.category} · {p.year} · {p.imageCount} Bilder · /{p.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={() => move(i, -1)} className="px-2 py-1 border border-border" title="Nach oben">↑</button>
                  <button onClick={() => move(i, 1)} className="px-2 py-1 border border-border" title="Nach unten">↓</button>
                  <button onClick={() => sync(p.id)} disabled={busy === p.id} className="px-3 py-1 border border-border disabled:opacity-50">
                    {busy === p.id ? "..." : "Sync"}
                  </button>
                  <button onClick={() => setCoverPickerFor(coverPickerFor === p.id ? null : p.id)} className="px-3 py-1 border border-border">
                    Cover
                  </button>
                  <button onClick={() => patch(p.id, { visible: !p.visible })} className={`px-3 py-1 border ${p.visible ? "border-primary" : "border-border text-muted"}`}>
                    {p.visible ? "Sichtbar" : "Versteckt"}
                  </button>
                  <button onClick={() => remove(p.id, p.titleDe)} className="px-3 py-1 border border-border text-red-600">
                    Löschen
                  </button>
                </div>
              </div>

              {coverPickerFor === p.id && (
                <div className="mt-4 border-t border-border pt-4">
                  {projectImages.length === 0 ? (
                    <p className="text-sm text-muted">Erst &bdquo;Sync&ldquo; ausführen, dann Cover wählen.</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {projectImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => { patch(p.id, { coverImageId: img.id }); setCoverPickerFor(null); }}
                          className={`aspect-square overflow-hidden border-2 ${img.id === p.coverImageId ? "border-primary" : "border-transparent hover:border-border"}`}
                        >
                          <img src={`/api/drive/image/${img.id}?w=400`} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="text-muted text-sm">Noch keine Projekte angelegt.</p>}
      </div>
    </div>
  );
}
