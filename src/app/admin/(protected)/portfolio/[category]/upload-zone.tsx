"use client";

import { useState } from "react";

type Status = "waiting" | "running" | "done" | "error";
type Item = { key: string; file: File; status: Status; error?: string };

const PARALLEL = 3;
const STATUS_TEXT: Record<Status, string> = { waiting: "Wartet", running: "Wird verarbeitet …", done: "Fertig", error: "Fehler" };

export function UploadZone({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const setStatus = (key: string, status: Status, error?: string) =>
    setItems((all) => all.map((item) => (item.key === key ? { ...item, status, error } : item)));

  async function run(item: Item) {
    setStatus(item.key, "running");
    try {
      await onUpload(item.file);
      setStatus(item.key, "done");
    } catch (error) {
      setStatus(item.key, "error", error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function addFiles(files: FileList | File[]) {
    const added: Item[] = [...files]
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({ key: crypto.randomUUID(), file, status: "waiting" }));
    setItems((all) => [...all, ...added]);
    let next = 0;
    const lane = async () => {
      while (next < added.length) await run(added[next++]);
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, added.length) }, lane));
  }

  return (
    <section aria-label="Upload">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void addFiles(event.dataTransfer.files);
        }}
        className={`grid place-items-center border border-dashed p-10 text-center text-sm ${dragOver ? "border-ink bg-mat" : "border-ink/30"}`}
      >
        <p>Bilder hierher ziehen oder</p>
        <label className="mt-2 cursor-pointer underline">
          Bilder hinzufügen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {items.length > 0 && (
        <ul aria-label="Upload-Warteschlange" className="mt-4 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.key} data-testid="upload-item" data-status={item.status} className="flex flex-wrap gap-3">
              <span className="font-label">{item.file.name}</span>
              <span className={item.status === "error" ? "text-signal" : "text-stone"}>
                {STATUS_TEXT[item.status]}
                {item.error ? `: ${item.error}` : ""}
              </span>
              {item.status === "error" && (
                <button type="button" className="underline" onClick={() => void run(item)}>
                  Erneut versuchen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
